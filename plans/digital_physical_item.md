# 실물 vs 디지털 상품 주문 생애주기 분리 설계

## Context

현재 시스템은 모든 주문을 단일 `orders.status` 상태 머신(`pending → paid → shipped → delivered → cancelled`)으로 처리한다. `delivery_type`이 `physical | digital_download | gifticon | coupon` 네 종류로 이미 DB에 정의되어 있지만, 취소/환불 정책·이행(fulfillment)·배송 추적이 모두 실물 배송 기준으로만 구현되어 있다. 디지털 상품 판매 전 반드시 이 분리 작업이 선행되어야 한다.

---

## Phase 1 — 필수 (디지털 상품 출시 전 완료)

### 1. order_items에 delivery_type 스냅샷

**문제:** 구매 이후 product의 delivery_type이 변경되면 정책 판단이 잘못된 타입으로 평가된다.

**변경 내용:**
- `supabase/order.sql` migration 섹션에 추가:
  ```sql
  ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS delivery_type VARCHAR(50) NOT NULL DEFAULT 'physical',
    ADD COLUMN IF NOT EXISTS fulfillment_status VARCHAR(50) DEFAULT NULL;
  -- fulfillment_status 값:
  --   digital_download: pending | available | downloaded | expired
  --   gifticon | coupon: pending | issued | used | expired
  --   physical: NULL (orders.status로 관리)
  ```
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
  -- 'physical' | 'digital' | 'mixed'
  ```
- `src/hooks/useOrders.ts` `createOrder` — 아이템 목록 기반으로 `order_type` 계산 후 insert

---

### 3. digital_fulfillments 테이블 신설

**문제:** 다운로드 토큰, 횟수 제한, 기프티콘 코드를 저장할 테이블이 없다.

**새 테이블 (supabase/order.sql migration 섹션):**
```sql
CREATE TABLE IF NOT EXISTS digital_fulfillments (
  id                    SERIAL PRIMARY KEY,
  order_id              INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id         INTEGER NOT NULL UNIQUE REFERENCES order_items(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delivery_type         VARCHAR(50) NOT NULL,

  -- digital_download 전용
  download_token        VARCHAR(255) UNIQUE,
  download_count        INTEGER NOT NULL DEFAULT 0,
  download_limit        INTEGER NOT NULL DEFAULT 3,
  expires_at            TIMESTAMP WITH TIME ZONE,
  first_downloaded_at   TIMESTAMP WITH TIME ZONE,

  -- gifticon/coupon 전용
  issued_code           TEXT,
  code_issued_at        TIMESTAMP WITH TIME ZONE,
  code_used_at          TIMESTAMP WITH TIME ZONE,

  status                VARCHAR(50) NOT NULL DEFAULT 'pending',
  source_ref            TEXT,   -- Supabase Storage path (downloads)
  meta                  JSONB DEFAULT '{}',
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- RLS: 본인 조회만 허용, admin 전체 허용, INSERT는 service role
```

---

### 4. 취소/환불 정책 — 타입별 매트릭스

| delivery_type | 취소 가능 조건 | 환불 가능 조건 |
|---|---|---|
| `physical` | `status IN (pending, paid)` | `status = delivered` AND `delivered_at` 7일 이내 |
| `digital_download` | `paid_at` 24h 이내 AND `download_count = 0` | 사실상 취소와 동일 경로, 다운로드 후 불가 |
| `gifticon` | **불가** (결제 즉시 발급) | **불가** |
| `coupon` | **불가** (결제 즉시 활성화) | **불가** |

**공유 정책 유틸 신설:** `src/lib/fulfillment/cancelPolicy.ts`
```typescript
export function canCancelItem(item: OrderItemWithFulfillment, order: Order): { allowed: boolean; reason?: string }
export function canRefundItem(item: OrderItemWithFulfillment, order: Order): { allowed: boolean; reason?: string }
export const DIGITAL_CANCEL_WINDOW_HOURS = 24;
export const PHYSICAL_REFUND_WINDOW_DAYS = 7;
```
- 순수 함수 (DB 호출 없음) — 서버/클라이언트 양쪽에서 재사용

**서버 강제 실행:** `src/app/api/payment/cancel/route.ts`
- `order_items` + `digital_fulfillments` join 후 item별 정책 체크
- 혼합 주문 부분 취소: 취소 금액 = 취소 대상 items의 `subtotal` 합산 (≠ `final_price`)
- Toss 취소 성공 후 해당 item의 `fulfillment_status = 'expired'`로 업데이트
- 전 아이템 취소된 경우에만 `orders.status = 'cancelled'`

**클라이언트 UI 게이트:** `src/hooks/useCancelRefund.ts`
- `cancelEligibility`, `refundEligibility` map (keyed by `order_item_id`) 노출

---

### 5. 결제 확인 후 디지털 이행 자동 생성

**문제:** `/api/payment/confirm`이 `status = 'paid'`만 업데이트하고 디지털 이행을 생성하지 않는다.

**변경 내용 (`src/app/api/payment/confirm/route.ts`):**
```
Toss confirm API 성공
  → order.status = 'paid'
  → order_items 목록 조회
  → digital 아이템 각각:
      digital_download: token 생성, source_ref = type_meta.file_url, expires_at = now + 365일
      gifticon: gifticon_codes 테이블에서 원자적 코드 예약 (SELECT FOR UPDATE SKIP LOCKED)
      coupon: type_meta.coupon_code 복사
  → digital_fulfillments INSERT (status = 'available' or 'issued')
  → order_items.fulfillment_status 업데이트
```
- 멱등성: fulfillment가 이미 존재하면 skip

---

### 6. 보안 다운로드 API 신설

**새 파일:** `src/app/api/download/[token]/route.ts`

**동작:**
1. 세션에서 `user_id` 확인
2. `digital_fulfillments` 조회: `download_token = token AND user_id = auth.uid()`
3. 조건 검증: `status ∈ {available, downloaded}`, `download_count < download_limit`, `expires_at > now`
4. `download_count++`, `first_downloaded_at` (최초 시 설정), limit 도달 시 `status = 'expired'`
5. Supabase Storage에서 5분짜리 signed URL 생성 후 302 redirect
6. 동시 요청 경쟁 방지: Postgres 함수 `increment_download_count(token)` RPC로 원자적 처리

---

### 7. gifticon_codes 풀 테이블

**문제:** 기프티콘 코드는 1회성이므로 동시 구매 시 중복 발급 방지가 필요하다.

**새 테이블 (supabase/order.sql migration 섹션):**
```sql
CREATE TABLE IF NOT EXISTS gifticon_codes (
  id            SERIAL PRIMARY KEY,
  product_id    INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  code          TEXT NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'available', -- available | issued
  issued_to_fulfillment_id INTEGER REFERENCES digital_fulfillments(id),
  issued_at     TIMESTAMP WITH TIME ZONE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (product_id, code)
);
-- admin만 쓰기; 코드 발급은 service role RPC
```

**Postgres RPC:** `claim_gifticon_code(p_product_id INTEGER)` — `SELECT FOR UPDATE SKIP LOCKED LIMIT 1`로 원자적 코드 예약

---

## Phase 2 — 중요 (Phase 1 안정화 후)

### 8. 사용자 주문 상세 페이지 개선 (`src/app/settings/purchases/[id]/page.tsx`)

- `useMyOrders.ts`: `order_items`에 `delivery_type`, `fulfillment_status`, `digital_fulfillments` nested join 추가
- 아이템별 UI 분기:
  - `digital_download`: "파일 다운로드" 버튼 (`/api/download/[token]`), `N/3회 사용`, 만료일
  - `gifticon`/`coupon`: 코드 복사 UI (monospace box + 클립보드 복사), 사용일시
  - `physical`: 기존 배송 추적 섹션 유지
- 취소/환불 버튼: 주문 레벨 → 아이템 레벨 eligibility 기반으로 교체
- 디지털 아이템 불가 이유 안내 메시지 표시

### 9. 어드민 주문 관리 개선 (`src/app/admin/orders/page.tsx`)

- `useAdminOrders.ts`: `AdminOrder.order_type` 추가, `fetchFulfillments(orderId)` 추가
- 확장 행 패널에 "디지털 이행 현황" 섹션 추가:
  - 다운로드: 횟수/한도, 최초 다운로드일, 만료일, "다운로드 횟수 초기화" 버튼
  - 기프티콘: 발급된 코드, 사용 여부, "재발급" 버튼
- `order_type = 'digital'` 주문에서는 상태 변경 드롭다운에서 `shipped`/`delivered` 숨김
- 필터 탭에 "디지털" 탭 추가

### 10. 기프티콘 코드 풀 관리 UI

- 상품 수정 페이지 (`src/app/admin/shop/products/[id]/edit`) 또는 `ProductForm.tsx`에 "코드 관리" 패널 추가
- CSV 텍스트 붙여넣기로 일괄 업로드, 잔여 코드 수 표시

---

## 혼합 주문(Mixed Cart) 설계 원칙

- **단일 주문 유지** (Toss는 paymentKey 1개 = 거래 1건): 체크아웃 분리 없음
- `orders.status`는 physical 배송 생애주기만 관리
- 완전 디지털 주문: `paid`가 terminal 성공 상태 (shipped/delivered 없음)
- 프론트 `displayStatus` 파생: `order_type = 'digital'` AND `status = 'paid'` → "다운로드 가능"으로 표시
- 부분 취소: 취소 가능 아이템만 선택적으로 취소, 금액은 item subtotal 합산

---

## 핵심 변경 파일 목록

| 파일 | 변경 내용 |
|---|---|
| `supabase/order.sql` | 전체 DB 마이그레이션 (4개 ALTER + 2개 CREATE TABLE) |
| `src/app/api/payment/confirm/route.ts` | 결제 후 digital_fulfillments 생성 |
| `src/app/api/payment/cancel/route.ts` | 타입별 정책 강제, 부분 취소 금액 계산 |
| `src/app/api/download/[token]/route.ts` | 신규: 보안 다운로드 엔드포인트 |
| `src/lib/fulfillment/cancelPolicy.ts` | 신규: 공유 정책 순수 함수 |
| `src/hooks/useOrders.ts` | delivery_type 스냅샷 |
| `src/hooks/useCancelRefund.ts` | 아이템별 eligibility 노출 |
| `src/hooks/useMyOrders.ts` | fulfillments nested join |
| `src/hooks/useAdminOrders.ts` | order_type, fetchFulfillments |
| `src/app/shop/checkout/page.tsx` | delivery_type orderItems에 포함 |
| `src/app/settings/purchases/[id]/page.tsx` | 다운로드 버튼, 코드 표시, 아이템별 취소/환불 |
| `src/app/settings/purchases/[id]/cancel/page.tsx` | 아이템별 불가 사유 표시 |
| `src/app/settings/purchases/[id]/refund/page.tsx` | 아이템별 불가 사유 표시 |
| `src/app/admin/orders/page.tsx` | 디지털 이행 현황 패널 |

---

## 구현 우선순위

**Phase 1 순서 (의존성 순):**
1. DB 마이그레이션 (order_items.delivery_type → orders.order_type → digital_fulfillments → gifticon_codes)
2. `useOrders.ts` + `checkout/page.tsx` — 스냅샷
3. `confirm/route.ts` — 결제 후 이행 생성
4. `src/lib/fulfillment/cancelPolicy.ts` — 정책 함수
5. `cancel/route.ts` — 서버 정책 강제
6. `/api/download/[token]/route.ts` — 다운로드 엔드포인트
7. `useCancelRefund.ts` + cancel/refund pages — UI 게이트

**검증 방법:**
- 디지털 상품 구매 → `digital_fulfillments` row 생성 확인
- `/api/download/[token]` 호출 → 3회 후 `status = 'expired'` 전환 확인
- 다운로드 완료 후 취소 API 호출 → 400 반환 확인
- 기프티콘 동시 구매 시뮬레이션 → 코드 중복 발급 없음 확인
- 혼합 주문에서 디지털 아이템만 부분 취소 → 올바른 금액으로 Toss 취소 확인
