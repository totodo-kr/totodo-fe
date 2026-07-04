# 실물 vs 디지털 상품 주문 생애주기 분리 설계

## Context

현재 시스템은 모든 주문을 단일 `orders.status` 상태 머신(`pending → paid → shipped → delivered → cancelled`)으로 처리한다. `delivery_type`이 `physical | digital_download | gifticon | coupon` 네 종류로 이미 DB에 정의되어 있지만, 취소/환불 정책·이행(fulfillment)·배송 추적이 모두 실물 배송 기준으로만 구현되어 있다. 디지털 상품 판매 전 반드시 이 분리 작업이 선행되어야 한다.

**이 플랜을 작성한 이후 쿠폰 시스템(`coupons`/`user_coupons`)이 이미 구현·배포되었다.** `delivery_type='coupon'` 상품의 결제 후 자동 발급과 취소/환불 시 부분 반영 로직이 `confirm/route.ts`, `cancel/route.ts`에 이미 동작 중이다. 이 플랜은 그 기존 구현을 갈아엎지 않고, **공통 이행 이벤트 레이어(`digital_fulfillments`) 아래로 편입**시키는 방향으로 설계되었다.

---

## 용어 정리 — 헷갈리기 쉬운 두 가지 "쿠폰" 개념

| 개념 | 트리거 | 연결 | 상태 |
|---|---|---|---|
| **할인쿠폰 적용** | 체크아웃에서 보유 쿠폰함 중 골라서 결제 금액 할인 | `orders.user_coupon_id` (주문 1건당 최대 1개) | 기존 구현, 변경 없음 |
| **쿠폰형 상품 구매 발급** | `delivery_type='coupon'`인 "상품"을 구매하면 쿠폰이 발급됨 | `order_items → digital_fulfillments → user_coupons` (신규 연결) | 기존 임시 로직 → 이번에 재설계 |

두 흐름 모두 최종적으로 `user_coupons` 테이블에 인스턴스가 쌓이지만 발급 경로가 다르다. 코드 작업 시 절대 혼동하지 말 것.

---

## 전체 데이터 모델 개요

```
coupons ──< user_coupons >── digital_fulfillments >── order_items ──< orders
              (기존 상태머신:                (신규 공통 이행       (1:N)      (1:N)
         active/used/expired/cancelled)     이벤트, 1 order_item : 1)
                    ▲                              │
                    │ digital_fulfillment_id (신규)  ├──< ebook_downloads   (digital_download 전용)
                    │ (purchase 발급만 값 있음,       │
                    │  code/admin_direct는 NULL)     └──< gifticon_codes    (gifticon 전용, 재고 풀 겸용)
                    │
        orders.user_coupon_id (기존, 할인쿠폰 적용 — 위 흐름과 별개)
```

- `digital_fulfillments`는 "이 order_item에 대한 이행 이벤트가 성공/실패/취소됐는가"만 담당하는 **얇은 부모 레코드**다. 실제 산출물(다운로드 토큰, 기프티콘 코드, 쿠폰 인스턴스)은 타입별 자식 테이블에 있다.
- `physical` 상품은 이 체계에 전혀 들어오지 않는다 — 기존대로 `orders.status` + `shipping_tracking`으로만 관리한다 (아래 §Phase1-1 참고).

---

## Phase 1 — 필수 (디지털 상품 출시 전 완료)

### 1. order_items에 delivery_type 스냅샷

**문제:** 구매 이후 product의 delivery_type이 변경되면 정책 판단이 잘못된 타입으로 평가된다.

**변경 내용:**
- `supabase/order.sql` migration 섹션에 추가:
  ```sql
  ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS delivery_type VARCHAR(50) NOT NULL DEFAULT 'physical';

  -- digital_download은 항상 수량 1 — §9 참고
  ALTER TABLE order_items
    ADD CONSTRAINT order_items_digital_download_qty_one
    CHECK (delivery_type != 'digital_download' OR quantity = 1);
  ```
- `order_items.fulfillment_status` 같은 별도 상태 컬럼은 **만들지 않는다.** 이행 상태는 `digital_fulfillments`/자식 테이블 조인으로 조회한다 (중복 상태 관리로 인한 불일치 버그 방지가 컬럼 하나 아끼는 것보다 중요).
- `src/hooks/useOrders.ts` — `OrderItem` 인터페이스에 `delivery_type` 추가, insert row에 포함
- `src/app/shop/checkout/page.tsx` — `orderItems` 배열 구성 시 `delivery_type` 전달 (cart item에 이미 있음)

---

### 2. orders.order_type 컬럼 추가

**문제:** 완전 디지털 주문에 `shipped`/`delivered` 상태가 의미 없으나 구분 방법이 없다.

**변경 내용:**
- `supabase/order.sql` migration:
  ```sql
  ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS order_type VARCHAR(20) NOT NULL DEFAULT 'physical';
  -- 'physical' | 'digital' | 'mixed' — order_items.delivery_type 조합으로 파생
  ```
- `src/hooks/useOrders.ts` `createOrder` — 아이템 목록 기반으로 `order_type` 계산 후 insert
- 기존 `orders.user_coupon_id`/`coupon_discount` 컬럼(할인쿠폰 적용, 위 용어 정리 참고)과는 무관 — 혼동 주의

---

### 3. digital_fulfillments — 공통 이행 이벤트 레이어 + 타입별 자식 테이블

**설계 원칙:** 부모(`digital_fulfillments`)는 "발생 여부/성공 여부"만 책임지고, 산출물의 상세 상태는 자식 테이블이 각자의 어휘로 관리한다. 취소 처리는 항상 부모를 진입점으로 삼는다.

**새 테이블 (`supabase/order.sql` migration 섹션):**
```sql
-- 부모: 이행 이벤트
CREATE TABLE IF NOT EXISTS digital_fulfillments (
  id            SERIAL PRIMARY KEY,
  order_id      INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id INTEGER NOT NULL UNIQUE REFERENCES order_items(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delivery_type VARCHAR(50) NOT NULL, -- order_items.delivery_type과 동일 어휘 (digital_download | gifticon | coupon)
  status        VARCHAR(20) NOT NULL DEFAULT 'success'
                  CHECK (status IN ('success', 'failed', 'cancelled')),
  fulfilled_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- order_item_id UNIQUE = 멱등성 보장 장치. confirm 재시도 시 INSERT가 conflict 나면 "이미 이행됨"으로 skip.

-- 자식: digital_download 전용
CREATE TABLE IF NOT EXISTS ebook_downloads (
  id                    SERIAL PRIMARY KEY,
  digital_fulfillment_id INTEGER NOT NULL UNIQUE REFERENCES digital_fulfillments(id) ON DELETE CASCADE,
  download_token        VARCHAR(255) UNIQUE NOT NULL,
  download_count        INTEGER NOT NULL DEFAULT 0,
  download_limit        INTEGER NOT NULL DEFAULT 3,
  expires_at            TIMESTAMP WITH TIME ZONE,
  first_downloaded_at   TIMESTAMP WITH TIME ZONE,
  source_ref            TEXT, -- Supabase Storage path
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- digital_download은 §9에 의해 order_items.quantity=1로 강제되므로 fulfillment당 1개 row로 충분.

-- 자식: gifticon 전용 (재고 풀 + 발급 기록 겸용 — §7 참고)
CREATE TABLE IF NOT EXISTS gifticon_codes (
  id                       SERIAL PRIMARY KEY,
  product_id               INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  code                     TEXT NOT NULL
                             CHECK (code ~ '^\d{4}-\d{4}-\d{4}$'), -- 숫자 12자리, 4-4-4 대시 구분 (예: 1111-1111-1111)
  status                   VARCHAR(20) NOT NULL DEFAULT 'available'
                             CHECK (status IN ('available', 'issued', 'revealed', 'void')),
  issued_to_fulfillment_id INTEGER REFERENCES digital_fulfillments(id),
  issued_at                TIMESTAMP WITH TIME ZONE,
  revealed_at              TIMESTAMP WITH TIME ZONE, -- 유저가 코드를 화면에서 확인한 시점 (환불 정책 §4 판단 근거)
  created_at               TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (product_id, code)
);
```

**기존 `user_coupons`에 컬럼만 추가 (`supabase/coupons.sql` migration 섹션 — user_coupons를 정의하는 파일):**
```sql
ALTER TABLE user_coupons
  ADD COLUMN IF NOT EXISTS digital_fulfillment_id INTEGER REFERENCES digital_fulfillments(id);
-- purchase 발급(쿠폰형 상품 구매)만 값이 들어감. code/admin_direct 발급은 NULL 유지.
-- 로드 순서: order.sql이 먼저 실행되어 digital_fulfillments가 생긴 뒤 coupons.sql이 실행되므로 FK 참조 가능 (coupons.sql 상단 주석에 이미 명시된 의존관계와 동일 패턴).
```

**재고 확인은 결제(Toss 캡처) 전에 한다.** 기존 코드의 쿠폰 검증(§5의 "Toss 호출 전 쿠폰 재검증")과 동일한 원칙 — 재고가 없으면 Toss confirm을 아예 호출하지 않고 400을 반환해 결제 자체가 일어나지 않게 막는다. 유저가 이미 돈을 낸 뒤 상품을 못 받는 상황(신뢰 문제 + 어드민 수동 환불 부담)을 애초에 없애는 게 목적이다.

**그럼에도 남는 좁은 경쟁 구간:** 사전 체크(`SELECT COUNT`)와 실제 확보(`SELECT FOR UPDATE SKIP LOCKED`) 사이에는 시간차가 있어, 재고 1개를 두고 두 요청이 동시에 사전 체크를 통과하는 극히 드문 경쟁 상황은 이론상 남는다 (쿠폰의 "3단계 낙관적 체크 + 6단계 원자적 재확인" 2중 구조와 동일한 한계). **이 경우 자동으로 롤백한다** — 어드민 개입 없이:
1. `digital_fulfillments.status = 'cancelled'`
2. 해당 order_item의 `subtotal`만큼 Toss **부분 취소** API 호출 (§4에서 이미 설계한 부분 취소 로직 재사용 — 새 로직 아님)
3. 이 아이템이 주문의 유일한 아이템이면 `orders.status = 'cancelled'`, 아니면 그대로 `paid` 유지하고 이 아이템만 환불 처리된 상태로 남김
4. confirm API 응답에 `partialFailures: [{ order_item_id, reason: "재고 소진으로 자동 환불" }]` 포함 → 프론트가 "결제 완료" 대신 "이 상품은 품절되어 자동 환불되었습니다"를 명확히 표시 (§10)

**`digital_fulfillments.status='failed'`는 이 자동 롤백 자체가 실패했을 때만 쓴다** (Toss 부분 취소 API 호출이 네트워크 오류 등으로 이중 실패하는 경우) — 이때만 진짜로 사람이 봐야 하므로 어드민 화면(§11)에 눈에 띄게 노출해 수동 처리(재시도 또는 임의 환불)한다. 재고 소진 자체는 더 이상 수동 처리 대상이 아니다.

---

### 4. 취소/환불 정책 매트릭스

| delivery_type | 취소 가능 조건 | 환불 가능 조건 |
|---|---|---|
| `physical` | `status IN (pending, paid)` | `status = delivered` AND `delivered_at` 7일 이내 |
| `digital_download` | `paid_at` 24h 이내 AND `download_count = 0` | 다운로드 후 불가 (취소와 동일 경로) |
| `gifticon` | **항상 가능** — 단, 배정된 코드는 열람 여부와 무관하게 `void` 처리(재고 반납 안 함, §7) | `revealed_at IS NULL` → 전액 환불 / `revealed_at IS NOT NULL` → 해당 아이템 금액 환불 제외 (coupon과 동일 원칙) |
| `coupon` | 발급된 `user_coupons.status = 'active'`면 가능 (쿠폰 cancelled 처리 + 전액 환불) | 발급된 쿠폰이 `used`면 그 아이템 금액 환불 제외, `active`면 전액 환불 — **기존 구현된 정책 그대로 유지** |

**공유 정책 유틸 신설:** `src/lib/fulfillment/cancelPolicy.ts`
```typescript
export interface OrderItemWithFulfillment {
  id: number;
  delivery_type: string;
  product_price: number;
  quantity: number;
  digital_fulfillment?: {
    status: "success" | "failed" | "cancelled";
    ebook_download?: { download_count: number };
    gifticon_code?: { revealed_at: string | null };
  } | null;
}

export function canCancelItem(item: OrderItemWithFulfillment, order: Order): { allowed: boolean; reason?: string }
export function canRefundItem(item: OrderItemWithFulfillment, order: Order): { allowed: boolean; excludeAmount: boolean }
export const DIGITAL_CANCEL_WINDOW_HOURS = 24;
export const PHYSICAL_REFUND_WINDOW_DAYS = 7;
```
- 순수 함수 (DB 호출 없음) — 서버/클라이언트 양쪽에서 재사용
- `coupon` 타입은 `user_coupons`를 `digital_fulfillment_id`로 조인해서 상태를 본다 (기존 `issue_epoch LIKE '{order_id}_%'` 패턴 매칭은 걷어내고 FK 조인으로 교체)

**서버 강제 실행:** `src/app/api/payment/cancel/route.ts` (기존 파일 — 쿠폰 부분환불 로직 이미 존재, 리팩터링 대상)
- 기존의 `issue_epoch LIKE` 기반 쿠폰 금액 계산 로직을 `order_items JOIN digital_fulfillments JOIN user_coupons (ON digital_fulfillment_id)`로 교체
- gifticon도 동일한 조인 패턴으로 `revealed_at` 확인 후 환불 제외 금액 계산에 합류
- 혼합 주문 부분 취소: 취소 금액 = 취소 대상 items의 `subtotal` 합산 (≠ `final_price`)
- Toss 취소 성공 후 취소 대상 item들의 `digital_fulfillments.status = 'cancelled'`로 업데이트, gifticon은 배정된 코드 `status = 'void'`로 전환
- 전 아이템 취소된 경우에만 `orders.status = 'cancelled'`

**클라이언트 UI 게이트:** `src/hooks/useCancelRefund.ts` (기존 파일 — 현재 주문 레벨 전용, 개편 필요)
- 현재 `requestRefund`가 `.eq("status", "delivered")`를 하드코딩하고 있어 **digital 주문은 애초에 환불 요청 자체가 불가능**하다 — 아이템별 eligibility 도입 시 이 조건을 order_type에 따라 분기하도록 수정
- `cancelEligibility`, `refundEligibility` map (keyed by `order_item_id`) 노출

---

### 5. 결제 확인 후 이행 자동 생성

**문제:** `/api/payment/confirm`이 `status = 'paid'`만 업데이트하고, 쿠폰형 상품에 대해서만 임시방편으로 발급 로직(7번 블록)을 갖고 있다.

**⚠️ 중요:** 아래 흐름은 기존 `confirm/route.ts`의 "7. [쿠폰 상품] delivery_type='coupon'인 order_items → user_coupons 자동 발급" 블록을 **완전히 대체**한다. 기존 블록을 남겨둔 채 새 로직을 옆에 추가하면 쿠폰이 두 번 발급되는 실제 버그가 발생한다.

**변경 내용 (`src/app/api/payment/confirm/route.ts`):**
```
(기존 1~3단계 유지: 주문/금액 검증, 할인쿠폰 재검증 — Toss 호출 전)
  → [신규 3.5단계] gifticon 아이템 재고 사전 체크 (Toss 호출 전)
      order_items 중 delivery_type='gifticon' 아이템별로
      SELECT COUNT(*) FROM gifticon_codes WHERE product_id=X AND status='available'
      필요 수량보다 적으면 → 400 반환, Toss confirm 호출하지 않음 (결제 자체가 안 일어남)
  → Toss confirm API 호출 및 성공 (기존 4~6단계 유지: 주문 상태 업데이트)
  → order_items 목록 조회 (delivery_type IN digital_download, gifticon, coupon)
  → 아이템별로:
      INSERT INTO digital_fulfillments (order_item_id, order_id, user_id, delivery_type)
      IF unique violation (order_item_id 중복) → 이미 이행됨, skip (멱등성)
      ELSE (quantity만큼 반복):
        digital_download: download_token 생성 → ebook_downloads INSERT (limit=3, expires_at=now+365일)
        gifticon:          claim_gifticon_code(product_id) RPC로 원자적 코드 예약 → issued_to_fulfillment_id 세팅
                           재고 없으면(사전 체크를 통과했음에도 경쟁으로 소진) → 자동 부분 취소 실행 (§3 참고):
                             digital_fulfillments.status='cancelled' → Toss 부분 취소(해당 item subtotal) → partialFailures에 기록
                             Toss 부분 취소 API 호출 자체가 실패하면 → digital_fulfillments.status='failed'로 남기고 어드민 알림
        coupon:            user_coupons INSERT (digital_fulfillment_id=방금 만든 id, issue_method='purchase')
  → 카트 비우기 (기존 8단계 유지)
  → partialFailures가 있으면 응답에 포함 (§3, §10)
```

---

### 6. 보안 이행 API 신설

**다운로드:** `src/app/api/download/[token]/route.ts`
1. 세션에서 `user_id` 확인
2. `ebook_downloads` JOIN `digital_fulfillments` 조회: `download_token = token AND digital_fulfillments.user_id = auth.uid() AND digital_fulfillments.status = 'success'`
3. 조건 검증: `download_count < download_limit`, `expires_at > now`
4. `download_count++`, `first_downloaded_at` (최초 시 설정)
5. Supabase Storage에서 5분짜리 signed URL 생성 후 302 redirect
6. 동시 요청 경쟁 방지: Postgres 함수 `increment_ebook_download_count(token)` RPC로 원자적 처리

**기프티콘 코드 열람:** `src/app/api/gifticon/reveal/route.ts` (신규)
- 클라이언트가 코드를 화면에 표시하기 직전 호출 — `revealed_at`이 NULL일 때만 세팅 (최초 1회만 기록, 이 값이 §4 환불 정책의 판단 근거이므로 반드시 서버에서만 기록)
- `gifticon_codes.status`를 `issued → revealed`로 전환

---

### 7. gifticon 코드 풀 운영 정책

**결정:** 재고 풀과 발급 기록을 별도 테이블로 분리하지 않는다. `gifticon_codes` 한 테이블을 `issued_to_fulfillment_id` (nullable FK) 유무로 재고/발급 상태를 구분한다. 물리적 테이블 분리는 지금 트래픽 규모에서 과최적화.

**성능:** 물리 분리 대신 부분 인덱스로 해결
```sql
CREATE INDEX IF NOT EXISTS idx_gifticon_codes_available
  ON gifticon_codes(product_id) WHERE status = 'available';
CREATE INDEX IF NOT EXISTS idx_gifticon_codes_issued_fulfillment
  ON gifticon_codes(issued_to_fulfillment_id) WHERE issued_to_fulfillment_id IS NOT NULL;
```

**Postgres RPC:** `claim_gifticon_code(p_product_id INTEGER, p_fulfillment_id INTEGER)` — `SELECT FOR UPDATE SKIP LOCKED LIMIT 1 WHERE status='available'`로 원자적 코드 예약 후 `status='issued', issued_to_fulfillment_id, issued_at` 세팅. 재고 없으면 NULL 반환 (§5의 자동 부분 취소 흐름으로 이어짐 — 어드민 개입 없이 즉시 환불).

**취소 시 코드 처리:** 노출 여부와 무관하게 `status='void'`로 전환하고 **재고 풀로 되돌리지 않는다** (한 번 유저에게 할당된 실제 코드는 재사용 안 함 — 안전한 기본값). 폐기된 만큼의 재입고는 자동화 대상이 아니라, Phase 2 §10의 어드민 CSV 업로드 패널을 통한 수동 운영 프로세스다 (실제 브랜드사 코드라 시스템이 대체 코드를 만들어낼 수 없음).

---

### 8. RLS 정책

```sql
-- digital_fulfillments: user_id를 직접 보유 → own 체크 단순
ALTER TABLE digital_fulfillments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "digital_fulfillments_select_own"   ON digital_fulfillments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "digital_fulfillments_select_admin" ON digital_fulfillments FOR ALL    USING (public.is_admin());
-- INSERT/UPDATE 정책 없음 — API route의 admin(service role) client만 기록 (order_items 쓰기 패턴과 동일)

-- ebook_downloads: user_id가 없어 부모 조인으로 체크
ALTER TABLE ebook_downloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ebook_downloads_select_own" ON ebook_downloads FOR SELECT USING (
  EXISTS (SELECT 1 FROM digital_fulfillments df WHERE df.id = ebook_downloads.digital_fulfillment_id AND df.user_id = auth.uid())
);
CREATE POLICY "ebook_downloads_admin_all" ON ebook_downloads FOR ALL USING (public.is_admin());

-- gifticon_codes: 재고(available) 행은 절대 일반 유저에게 노출 금지
ALTER TABLE gifticon_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gifticon_codes_select_own_issued" ON gifticon_codes FOR SELECT USING (
  issued_to_fulfillment_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM digital_fulfillments df WHERE df.id = gifticon_codes.issued_to_fulfillment_id AND df.user_id = auth.uid())
);
CREATE POLICY "gifticon_codes_admin_all" ON gifticon_codes FOR ALL USING (public.is_admin());
-- available 상태(issued_to_fulfillment_id IS NULL) 행은 위 정책에 안 걸려 일반 유저는 절대 조회 불가.
-- claim_gifticon_code() RPC는 SECURITY DEFINER로 정의해 RLS를 우회해서 재고를 읽어야 함.
```
`user_coupons`는 기존 RLS("본인 것만 + admin 전체")로 이미 충분 — `digital_fulfillment_id` 컬럼만 추가되는 것이라 정책 변경 불필요.

---

### 9. digital_download 상품 수량 1개 강제

**문제:** 다운로드 권한을 수량만큼 어떻게 나눠줄지 모델이 없다 (라이선스 1개당 별도 토큰? 아니면 download_limit 상향?) — 애매함을 없애기 위해 MVP는 수량을 1로 강제한다.

**변경 지점:**
- **DB (최종 방어선):** §1의 `order_items_digital_download_qty_one` CHECK 제약
- **PDP** `src/app/shop/[category]/[id]/page.tsx` — `product.delivery_type === 'digital_download'`면 수량 "+" 버튼 비활성화(또는 수량 선택 UI 자체 숨김)
- **장바구니 담기** `src/hooks/useCart.ts` `addToCart` — 이미 담긴 상품에 추가 시 `newQty = existing.quantity + quantity`로 증가하는 부분에서 digital_download면 1로 클램프
- **장바구니 페이지** `src/app/shop/cart/page.tsx` `handleQuantityChange` "+" 버튼 — `item.delivery_type === 'digital_download'`면 비활성화

---

## Phase 2 — 중요 (Phase 1 안정화 후)

### 10. 사용자 주문 상세 페이지 개선 (`src/app/settings/purchases/[id]/page.tsx`)

- `useMyOrders.ts`: `order_items`에 `delivery_type` + `digital_fulfillments`(자식까지 2단 조인: `digital_fulfillments(status, ebook_downloads(*), gifticon_codes(*))`, `user_coupons`는 `digital_fulfillment_id`로 별도 조회) 추가
- 아이템별 UI 분기:
  - `digital_download`: "파일 다운로드" 버튼 (`/api/download/[token]`), `N/3회 사용`, 만료일
    - **다운로드 시작 전 확인 모달 필수**: "다운로드하면 취소/환불이 불가능합니다. 계속하시겠습니까?" — 확인해야 `/api/download/[token]` 호출 (§4 정책상 다운로드 후 취소/환불 절대 불가이므로 절대적 경고 문구)
  - `gifticon`: 코드 최초 열람 시 확인 모달 → 확인해야 `/api/gifticon/reveal` 호출 후 노출 (monospace box + 클립보드 복사)
    - 모달 문구는 "취소 불가능"이 아니라 **"코드를 확인하면 이후 취소/환불 시 이 상품 금액은 환불되지 않습니다"** — §4 정책상 취소 자체는 열람 여부와 무관하게 항상 가능하고, 열람 시 환불 금액만 제외되기 때문에 정확한 표현이 중요함
    - 이미 `revealed_at`이 있는 경우(재방문)는 모달 없이 바로 코드 표시
  - `coupon`: 발급된 쿠폰 코드/사용일시 표시 — "사용(used)" 여부로만 정책이 갈리고 열람 자체엔 제약이 없으므로 확인 모달 불필요
  - `physical`: 기존 배송 추적 섹션 유지
- 취소/환불 버튼: 주문 레벨 → 아이템 레벨 eligibility 기반으로 교체
- 디지털 아이템 불가 이유 안내 메시지 표시

### 11. 어드민 주문 관리 개선 (`src/app/admin/orders/page.tsx`)

- `useAdminOrders.ts`: `AdminOrder.order_type` 추가, `fetchFulfillments(orderId)` 추가 (`digital_fulfillments` + 자식 테이블 join)
- 확장 행 패널에 "디지털 이행 현황" 섹션 추가:
  - `status='failed'`인 이행 건은 눈에 띄게 강조 (자동 환불 자체가 실패한 극히 드문 이중 실패 케이스 — 재시도/수동 환불 필요, §3 참고). 단순 재고 소진은 자동 환불되어 `status='cancelled'`로 끝나므로 여기 노출 안 됨
  - 다운로드: 횟수/한도, 최초 다운로드일, 만료일, "다운로드 횟수 초기화" 버튼
  - 기프티콘: 발급된 코드, `revealed_at`, "재발급"(새 코드로 교체) 버튼
- `order_type = 'digital'` 주문에서는 상태 변경 드롭다운에서 `shipped`/`delivered` 숨김
- 필터 탭에 "디지털" 탭 추가

### 12. 기프티콘 코드 풀 관리 UI

- 상품 수정 페이지 (`src/app/admin/shop/products/[id]/edit`) 또는 `ProductForm.tsx`에 "코드 관리" 패널 추가
- CSV 텍스트 붙여넣기로 일괄 업로드, `status='available'` 잔여 코드 수 표시
- 업로드 시 `1111-1111-1111` 형식(숫자 12자리, 4-4-4 대시) 검증 후 DB CHECK 제약과 동일 기준으로 프론트에서도 형식 안 맞는 행은 미리 걸러서 에러 표시
- `void` 처리된 코드 수(=취소로 인한 재고 손실) 별도 표시 — 재입고 판단 근거

---

## 혼합 주문(Mixed Cart) 설계 원칙

- **단일 주문 유지** (Toss는 paymentKey 1개 = 거래 1건): 체크아웃 분리 없음
- `orders.status`는 physical 배송 생애주기만 관리 — digital/coupon 아이템은 `digital_fulfillments`가 별도로 관리
- 완전 디지털 주문: `paid`가 terminal 성공 상태 (shipped/delivered 없음)
- 프론트 `displayStatus` 파생: `order_type = 'digital'` AND `status = 'paid'` → "다운로드 가능"으로 표시
- 부분 취소: 취소 가능 아이템만 선택적으로 취소, 금액은 item subtotal 합산

---

## 핵심 변경 파일 목록

| 파일 | 변경 내용 |
|---|---|
| `supabase/order.sql` | order_items/orders ALTER 2건 + `digital_fulfillments`/`ebook_downloads`/`gifticon_codes` CREATE 3건 + 부분 인덱스 |
| `supabase/coupons.sql` | `user_coupons.digital_fulfillment_id` 컬럼 추가 (마이그레이션 섹션) |
| `src/app/api/payment/confirm/route.ts` | 기존 7번 블록(쿠폰 임시 발급) 완전 대체 → 공통 이행 생성 로직, gifticon 재고 소진 시 자동 부분 취소 |
| `src/app/shop/payment/success/page.tsx` | confirm 응답의 `partialFailures` 표시 ("이 상품은 품절되어 자동 환불되었습니다") |
| `src/app/api/payment/cancel/route.ts` | 기존 `issue_epoch LIKE` 쿠폰 조인 로직을 `digital_fulfillment_id` FK 조인으로 교체, gifticon 정책 추가 |
| `src/app/api/download/[token]/route.ts` | 신규: 보안 다운로드 엔드포인트 (ebook_downloads 기준) |
| `src/app/api/gifticon/reveal/route.ts` | 신규: 기프티콘 코드 노출 기록 엔드포인트 |
| `src/lib/fulfillment/cancelPolicy.ts` | 신규: 공유 정책 순수 함수 |
| `src/hooks/useOrders.ts` | delivery_type 스냅샷, order_type 계산 |
| `src/hooks/useCancelRefund.ts` | 기존 order-level 전용 로직 → 아이템별 eligibility로 개편, `status='delivered'` 하드코딩 제거 |
| `src/hooks/useMyOrders.ts` | fulfillments 2단 nested join |
| `src/hooks/useAdminOrders.ts` | order_type, fetchFulfillments |
| `src/hooks/useCart.ts` | digital_download 수량 1개 클램프 |
| `src/app/shop/cart/page.tsx` | digital_download 수량 "+" 비활성화 |
| `src/app/shop/[category]/[id]/page.tsx` | digital_download 수량 선택 UI 비활성화 |
| `src/app/shop/checkout/page.tsx` | delivery_type orderItems에 포함 |
| `src/app/settings/purchases/[id]/page.tsx` | 다운로드 버튼, 코드 열람/표시, 아이템별 취소/환불 |
| `src/app/settings/purchases/[id]/cancel/page.tsx` | 아이템별 불가 사유 표시 |
| `src/app/settings/purchases/[id]/refund/page.tsx` | 아이템별 불가 사유 표시 |
| `src/app/admin/orders/page.tsx` | 디지털 이행 현황 패널, failed 이행 강조 |
| `src/app/admin/shop/products/_components/ProductForm.tsx` | 기프티콘 코드 풀 관리 패널 |

---

## 개발 단계 (Phase 0~4)

의존성과 위험도 기준으로 나눴다. **낮은 위험(순수 추가) → 높은 위험(기존 결제 코드 수정) → 그 위에 얹는 신규 엔드포인트 → 화면**의 순서다. 문서 앞부분의 "Phase 1(필수)/Phase 2(중요)"는 *중요도* 구분이고, 아래는 *배포 단위* 구분이다 — 서로 다른 축이니 혼동하지 말 것.

### Phase 0 — 스키마 기반 작업 (위험도 낮음, 가장 먼저)
**포함:** §1(`order_items.delivery_type` + qty CHECK), §2(`orders.order_type`), §3(`digital_fulfillments`/`ebook_downloads`/`gifticon_codes`/`user_coupons.digital_fulfillment_id`), §8(RLS), §9(digital_download 수량 1개 강제 — DB CHECK + PDP/`useCart.ts`/장바구니 페이지 3곳)

**특징:** 전부 순수 추가(ALTER ADD COLUMN, CREATE TABLE IF NOT EXISTS)이거나 아직 안 쓰이는 상품 타입(`digital_download`/`gifticon`)에 대한 프론트 가드다. 기존 `physical`/`coupon` 주문 흐름을 전혀 건드리지 않는다 — 다른 Phase와 독립적으로, 언제든 먼저 배포해도 안전하다.

**완료 기준:** 새 테이블/컬럼이 운영 DB에 존재하고, digital_download 상품을 만들어도 수량 2개 이상으로는 절대 주문이 안 만들어짐 (PDP/장바구니/DB CHECK 3중 확인).

**테스트 체크리스트:**
- [ ] 마이그레이션 실행 후 `order_items.delivery_type` 컬럼 존재, 기존 row는 `physical` 기본값으로 채워짐
- [ ] `orders.order_type` 기본값 `physical`로 채워짐, 기존 주문 조회/필터링 화면이 안 깨짐
- [ ] `digital_fulfillments`/`ebook_downloads`/`gifticon_codes` 테이블 및 제약조건 생성 확인
- [ ] `user_coupons.digital_fulfillment_id` 컬럼 추가 확인, 기존 row는 NULL 유지되고 기존 쿠폰 조회 화면이 안 깨짐
- [ ] 일반 유저 계정으로 `gifticon_codes` 직접 조회 시 `status='available'` 재고 행이 하나도 안 보임
- [ ] 일반 유저 계정으로 다른 유저의 `digital_fulfillments`/`ebook_downloads`/발급된 `gifticon_codes` 조회 시 안 보임
- [ ] PDP에서 digital_download 상품 수량 "+" 버튼 비활성화 확인
- [ ] 이미 담긴 digital_download 상품을 PDP에서 다시 "담기" 해도 장바구니 수량이 1로 유지됨
- [ ] 장바구니 페이지에서 digital_download 상품 수량 "+" 버튼 비활성화 확인
- [ ] API를 직접 호출해 digital_download 상품 quantity=2로 주문 생성 시도 → DB CHECK 제약으로 거부됨

---

### Phase 1 — 결제 코어 재작성 (위험도 최고, 반드시 한 배포로 묶기)
**포함:** §5(`confirm/route.ts` — 기존 7번 블록 완전 대체, 재고 사전 체크, 자동 부분 취소), §7(`claim_gifticon_code` RPC), §4의 서버 강제 부분(`cancel/route.ts`의 `issue_epoch` 조인 → `digital_fulfillment_id` 조인 리팩터링 + gifticon 정책 추가)

**왜 하나로 묶어야 하는가:** `confirm`이 새 스키마(`digital_fulfillments`)로 이행을 생성하는데 `cancel`이 옛날 `issue_epoch LIKE` 방식만 안다면, 결제 확인 직후 취소 요청이 들어왔을 때 쿠폰 상태를 못 찾는 불일치가 생긴다. 두 파일은 같은 배포에 포함되어야 한다.

**리스크:** 지금 실제로 운영 중인 쿠폰 결제 흐름을 고치는 구간이라 이 플랜 전체에서 가장 위험하다. 특히 "confirm 7번 블록 완전 대체" 누락 시 쿠폰 이중 발급이라는 실제 금전 버그가 남는다 (§5 경고 문구 참고).

**완료 기준:** 쿠폰형 상품 구매 시 기존과 동일하게 1장만 발급되고(이중 발급 없음), confirm을 재시도해도 중복 생성이 안 되며, gifticon 재고 소진 시 결제 전 차단 또는 결제 후 자동 부분환불 중 하나로 항상 깔끔히 종료됨 (사람 개입 없이).

**테스트 체크리스트:**
- [ ] 디지털/기프티콘/쿠폰 상품 구매 → `digital_fulfillments` + 타입별 자식 row가 정확히 생성됨
- [ ] 쿠폰형 상품 구매 → `user_coupons`에 구매 수량만큼만 발급됨 (이중 발급 없음). 코드 리뷰로 기존 confirm 7번 블록이 완전히 삭제됐는지도 재확인
- [ ] 같은 주문에 confirm을 의도적으로 두 번 호출(재시도 흉내) → 두 번째 호출은 `digital_fulfillments` unique 제약으로 조용히 skip, 쿠폰/코드 중복 생성 없음
- [ ] gifticon 재고를 0으로 만든 상태로 결제 시도 → Toss confirm 호출 전 400으로 차단, 실제 캡처가 안 일어남
- [ ] 재고 1개 남은 상태에서 동시 구매 시도(동시성 테스트) → 코드 중복 발급 없이 하나만 성공, 실패한 쪽은 자동 부분 취소되고 응답에 `partialFailures` 포함
- [ ] Toss 부분 취소 API를 강제로 실패시킨 상태에서 위 시나리오 재현 → `digital_fulfillments.status='failed'`로 남고 자동 종료되지 않음 (안전망 동작 확인)
- [ ] 기존 쿠폰 취소(active 상태) 회귀 테스트 → 쿠폰 `cancelled` 처리 + 전액 환불
- [ ] 기존 쿠폰 환불(used 상태) 회귀 테스트 → 해당 금액만 제외하고 환불 (`digital_fulfillment_id` 조인 경유로 바뀐 뒤에도 결과 동일)
- [ ] 기프티콘 미열람 상태 취소 → 전액 환불 + 코드 `void` 처리(재고로 안 돌아감) 확인
- [ ] 기프티콘 열람 상태(`revealed_at` 있음) 환불 요청 → 해당 아이템 금액만 제외, 나머지 정상 환불
- [ ] digital_download 다운로드 완료 후 취소 API 호출 → 400 반환 확인
- [ ] 혼합 주문(물리+디지털)에서 디지털 아이템만 부분 취소 → Toss 부분 취소 금액 정확, 물리 아이템 배송에 영향 없음

---

### Phase 2 — 보안 이행 API + 공유 정책 함수 (위험도 중간)
**포함:** §6(`download/[token]/route.ts`, `gifticon/reveal/route.ts` 신규 엔드포인트), §4의 `src/lib/fulfillment/cancelPolicy.ts`, §1/§2의 `useOrders.ts`+`checkout/page.tsx`(스냅샷 전달)

**특징:** Phase 1이 만든 데이터 위에서 동작하는 신규 엔드포인트라 기존 결제 흐름 자체는 안 건드린다 — Phase 1보다 안전하지만, Phase 1 없이는 테스트가 불가능하므로 반드시 뒤에 온다.

**완료 기준:** 다운로드 3회 후 4번째 요청 거부, 기프티콘 코드는 `/api/gifticon/reveal`을 거쳐야만 `revealed_at`이 찍히는 것을 확인.

**테스트 체크리스트:**
- [ ] `/api/download/[token]` 1~3회 정상 다운로드, signed URL이 5분 후 만료됨
- [ ] 4번째 다운로드 요청 거부 확인 (`download_count >= download_limit`)
- [ ] `expires_at` 지난 토큰으로 요청 시 거부 확인
- [ ] 다른 유저의 `download_token`으로 요청 시 거부 확인 (본인 것만 접근 가능)
- [ ] `/api/gifticon/reveal` 최초 호출 시 `revealed_at` 세팅, 재호출해도 값이 안 바뀜(최초 1회만 기록)
- [ ] 체크아웃에서 생성된 주문의 `order_items.delivery_type`이 실제 상품과 일치함 (스냅샷 확인)
- [ ] `cancelPolicy.ts`의 `canCancelItem`/`canRefundItem`을 delivery_type × 상태 조합별로 단위 테스트 (physical/digital_download/gifticon/coupon 각각 취소 가능/불가능 케이스)

---

### Phase 3 — 유저 화면 (위험도 낮음, 순수 프론트)
**포함:** §10(설정 > 구매내역 — 다운로드 버튼 확인 모달, 기프티콘 열람 확인 모달, 아이템별 취소/환불 UI), `useCancelRefund.ts`(주문 레벨 → 아이템 레벨 eligibility 개편, `status='delivered'` 하드코딩 제거), `useMyOrders.ts`(2단 nested join)

**완료 기준:** 유저가 실제로 다운로드/기프티콘 코드 확인/아이템별 취소를 마이페이지에서 끝까지 수행할 수 있음. 이 Phase 전까지는 데이터는 정확히 쌓이지만 유저가 확인할 화면이 없는 상태.

**테스트 체크리스트:**
- [ ] digital_download 아이템 "다운로드" 버튼 클릭 → 경고 모달("다운로드하면 취소/환불 불가") 표시, 확인해야 실제 다운로드 시작
- [ ] gifticon 아이템 최초 열람 → 경고 모달("코드 확인하면 환불 제외") 표시, 확인 후 코드 노출
- [ ] 이미 열람한 gifticon 아이템 재방문 시 모달 없이 바로 코드 표시
- [ ] coupon 아이템은 모달 없이 바로 코드/사용일시 표시
- [ ] 아이템별 취소/환불 버튼이 각 delivery_type의 실제 정책과 일치하게 활성화/비활성화됨 (예: 다운로드 완료한 아이템은 취소 버튼 비활성 + 불가 사유 문구)
- [ ] 물리 아이템은 기존 배송 추적 UI가 그대로 보임 (회귀 테스트)
- [ ] digital 단독 주문(배송 없음)에서도 환불 요청이 정상적으로 됨 — 기존 `status='delivered'` 하드코딩 버그가 실제로 고쳐졌는지 확인하는 핵심 테스트

---

### Phase 4 — 어드민 도구 (위험도 낮음, 순수 프론트 · 상품 오픈 전 필수)
**포함:** §11(어드민 주문 관리 — 이행 현황 패널, `failed` 강조), §12(기프티콘 코드 풀 관리 UI — CSV 업로드)

**주의:** 배포 순서상 마지막이지만, **기프티콘 상품을 실제로 판매 시작하려면 §12(코드 업로드 UI)가 반드시 먼저 준비되어 있어야 한다** — 코드 재고가 하나도 없으면 Phase 0~3이 다 끝나도 결제 전 재고 체크(§5의 3.5단계)에서 항상 막힌다. "개발 순서"와 "기프티콘 오픈 전제조건"은 다른 이야기이니 릴리즈 계획 세울 때 구분할 것.

**테스트 체크리스트:**
- [ ] 어드민 주문 목록에서 "디지털" 필터 탭으로 정상 필터링됨
- [ ] `order_type='digital'` 주문 상세에서 상태 변경 드롭다운에 shipped/delivered가 안 보임
- [ ] 이행 현황 패널에서 다운로드 횟수/한도/최초 다운로드일/만료일이 정확히 표시됨
- [ ] "다운로드 횟수 초기화" 버튼이 실제로 `download_count`를 0으로 리셋함
- [ ] 기프티콘 "재발급" 버튼 클릭 시 기존 코드가 `void` 처리되고 새 코드가 발급됨
- [ ] `status='failed'`인 이행 건을 인위로 만들어서 목록에서 시각적으로 눈에 띄게 강조되는지 확인
- [ ] CSV 붙여넣기 업로드 시 `1111-1111-1111` 형식이 아닌 행은 에러로 걸러짐
- [ ] 업로드 후 잔여 재고 수(`available`)와 손실 재고 수(`void`)가 정확히 집계되어 표시됨
