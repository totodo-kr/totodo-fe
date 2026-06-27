# 쿠폰 시스템 설계 및 구현 계획

## Context

현재 코드베이스에는 쿠폰의 흔적이 일부 존재한다:
- `delivery_type: coupon` 코드가 products에 있지만, 이는 "쿠폰을 상품으로 판매"하는 용도의 다른 개념 -> 이번 작업으로 쿠폰이 설계되면, 쿠폰을 여기서 살 수도 있게 함. (할인 쿠폰 판매 등)
- `src/app/settings/my-coupons/page.tsx` — 완성된 UI지만 백엔드가 전혀 없음 (본인이 소유한 쿠폰은 여기서 조회되게 함)
- `src/app/settings/page.tsx:44` — 내 쿠폰함 메뉴가 주석 처리됨 (이번 작업 이후 주석 해제)
- `orders.total_discount` 컬럼은 존재하지만 항상 0 (하드코딩) -> 이번 작업으로 쿠폰이 설계되면, 쿠폰 적용으로 할인할 수 있어야 함.
- 쿠폰 테이블 없음, 발급/사용 로직 없음

이 작업은 **어드민 쿠폰 발급 → 유저 쿠폰 등록/보유 → 결제 시 적용 → 취소/환불 시 복원** 전체 플로우를 설계·구현한다.

---

## 1. 아키텍처 핵심 결정사항

### 쿠폰 모델 (2-table approach)
- `coupons` — 쿠폰 템플릿 (어드민이 정의): 할인 규칙, 조건, 발급 한도
- `user_coupons` — 유저별 쿠폰 인스턴스: 발급 기록, 사용 여부, 연결된 주문

> `delivery_type: coupon` 상품을 구매하면 연결된 쿠폰 템플릿이 자동으로 `user_coupons`에 발급된다. 즉, 두 시스템은 **연결**되어 있다. 상품과 쿠폰 템플릿의 연결은 `product_details.type_meta->>'coupon_id'`로 관리한다.

### 할인 유형
| type | 설명 | 주의사항 |
|---|---|---|
| `fixed` | 정액 할인 (예: 3,000원) | final_price가 0 이하가 되지 않도록 cap |
| `percentage` | 정률 할인 (예: 10%) | `max_discount_amount` 상한 필수 |
| `free_shipping` | 배송비 무료 | shipping_fee = 0으로 처리 |

### 발급 방식
- `code` — 유저가 코드 직접 입력 등록
- `admin_direct` — 어드민이 특정 유저에게 직접 발급 (코드 입력 불필요)
- `purchase` — `delivery_type: coupon` 상품 결제 완료 시 자동 발급. `order_item`의 `product_details.type_meta->>'coupon_id'`로 연결

### 적용 규칙
- **주문당 쿠폰 1개만** 적용 (스택 불가)
- 최소 주문금액(`min_order_amount`) — 할인 전 상품 금액 기준
- 정률 할인은 상품 금액에만 적용 (배송비 제외)
- `free_shipping` 쿠폰이 별도 존재하므로 `fixed/percentage`와 배송비는 독립

---

## 2. 주요 이슈 및 대응 방안

### 이슈 1: 레이스 컨디션 (동시 사용 시도)
한 쿠폰을 두 세션이 동시에 사용 시도할 수 있다.

**대응**: `user_coupons.status`를 DB 트랜잭션 + `WHERE status = 'active'` 조건부 UPDATE로 원자적 처리. Supabase에서는 RPC(Stored Procedure)로 묶는다.

### 이슈 2: 결제 실패 시 쿠폰 잠금 문제
현재 플로우: `createOrder()` → Toss 결제 모달 → `/api/payment/confirm`

주문 생성 시 쿠폰을 `used`로 바꾸면, 결제 모달에서 취소하거나 결제 실패 시 쿠폰이 영구 잠김.

**대응**:
1. `createOrder()` 시 `user_coupon_id`만 orders에 저장 (상태 변경 없음)
2. `/api/payment/confirm` 서버에서 최종 쿠폰 유효성 재검증 후 `status = 'used'`로 변경
3. `/api/payment/fail` 또는 payment 실패 경로에서 orders의 pending 상태 정리 시 쿠폰 변경 없음

### 이슈 3: 결제 확인 시 쿠폰 만료
쿠폰 유효성 검사(checkout) → 실제 결제 확인 사이에 쿠폰이 만료될 수 있다.

**대응**: `/api/payment/confirm`에서 금액 검증 시 쿠폰 `valid_until` 재체크. 만료 시 **결제 reject** — `{ error: "선택한 쿠폰이 만료되었어요!", code: "COUPON_EXPIRED" }` (HTTP 400) 반환. 프론트엔드는 이 에러를 받아 체크아웃 화면에 "선택한 쿠폰이 만료되었어요!" 문구를 표시하고 쿠폰 입력란을 초기화.
→ Checkout에서도 `/api/coupons/validate` 호출 시 만료 쿠폰이면 동일하게 "만료된 쿠폰입니다." 표시.

### 이슈 4: 취소/환불 시 쿠폰 복원 정책
- **취소 (paid → cancelled)**: 쿠폰 복원 O
- **환불 (delivered → refund)**: 쿠폰 복원 O — 취소/환불 동일하게 항상 복원 (정책 확정)

### 이슈 5: 쿠폰 남용 방지 및 중복 발급 차단

**epoch 기반 UNIQUE 제약**: `UNIQUE(user_id, coupon_id, issue_epoch)`으로 DB 레벨에서 원자적 중복 차단.

**issue_method별 epoch 결정 규칙**:
| issue_method | issue_epoch | 의미 |
|---|---|---|
| `code` | `'once'` 고정 | 유저당 평생 1회 등록 |
| `purchase` | `'{order_id}_{seq}'` | 주문마다 고유 — N개 구매 시 N개 발급 가능 (예: `'101_1'`, `'101_2'`) |
| `admin_direct` | `issue_epoch_type` 따름 | `once`=`'once'` / `monthly`=`'YYYYMM'` / `manual`=어드민 직접 입력 |

- `max_issue_count` — 총 발급 한도 (NULL=무제한)
- `issue_epoch_type`은 추후 확장성을 위해 템플릿에 보존 (`code`/`purchase`에는 영향 없음)
- 복원(취소/환불) 후에는 기존 row의 status를 다시 `active`로 되돌려 재사용 가능

### 이슈 6: 쿠폰 상품 취소 시 이미 사용된 쿠폰 처리
`delivery_type: coupon` 상품을 구매 → 발급된 쿠폰을 다른 주문에 사용 → 원래 쿠폰 상품 주문을 취소하는 경우.

**대응**:
- `/api/payment/cancel`에서 해당 주문의 `order_items`에 `delivery_type: coupon`이 있으면, 자동 발급된 `user_coupon`의 상태를 확인
- `user_coupon.status = 'used'`인 경우(이미 사용됨) → **주문 취소는 허용하되 해당 쿠폰 상품 금액은 환불 제외**
  - Toss 부분 환불 금액 = `orders.final_price` - 이미 사용된 쿠폰 상품들의 `order_items.price` 합산
  - 해당 `user_coupon`은 그대로 `used` 상태 유지 (회수 없음)
- `user_coupon.status = 'active'`인 경우 → 쿠폰을 `cancelled`로 변경, `coupons.issued_count -= 1`, 전액 환불 진행

### 이슈 7: 부분 환불과 쿠폰
쿠폰이 적용된 주문의 부분 환불 시 실제 환불 금액 계산이 복잡.

**대응**: `orders.coupon_discount` 컬럼을 별도 저장 → 환불 금액 = `refund_amount - coupon_discount_ratio`. 운영 정책으로 "쿠폰 적용 주문은 전체 환불만 가능"도 옵션.

> 이슈 6과 이슈 7의 "쿠폰 상품" vs "쿠폰 적용 주문"을 혼동하지 말 것. 이슈 6은 쿠폰 자체를 상품으로 구매한 케이스, 이슈 7은 기존 쿠폰을 결제에 적용한 케이스.

---

## 3. DB 스키마

### 신규 파일: `supabase/coupons.sql`

```sql
-- 쿠폰 템플릿
CREATE TABLE coupons (
  id                       SERIAL PRIMARY KEY,
  code                     VARCHAR(50) UNIQUE NOT NULL,         -- 유저 입력 코드 (SUMMER2024 등)
  name                     VARCHAR(255) NOT NULL,               -- 어드민 표시명
  description              TEXT,
  discount_type            VARCHAR(20) NOT NULL CHECK (discount_type IN ('fixed', 'percentage', 'free_shipping')),
  discount_value           INTEGER NOT NULL CHECK (discount_value > 0),  -- 원 or %
  max_discount_amount      INTEGER,                             -- 정률 할인 상한액 (NULL=무제한)
  min_order_amount         INTEGER DEFAULT 0,                   -- 최소 주문금액 (할인 전 상품가 기준)
  issue_method             VARCHAR(20) DEFAULT 'code' CHECK (issue_method IN ('code', 'admin_direct', 'purchase')),
  issue_epoch_type         VARCHAR(20) NOT NULL DEFAULT 'once'
                             CHECK (issue_epoch_type IN ('once', 'monthly', 'manual')),
                             -- once  : 유저당 평생 1회 (일반 할인 코드)
                             -- monthly: 월 1회, purchase/admin_direct 시 시스템이 'YYYYMM' 자동 생성
                             -- manual : 어드민이 발급 시 epoch 직접 입력 (월 N회 등 커스텀)
  max_issue_count          INTEGER,                             -- NULL=무제한
  issued_count             INTEGER DEFAULT 0,
  used_count               INTEGER DEFAULT 0,
  valid_from               TIMESTAMP WITH TIME ZONE,
  valid_until              TIMESTAMP WITH TIME ZONE,
  is_active                BOOLEAN DEFAULT TRUE,
  created_by               UUID REFERENCES auth.users(id),
  created_at               TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at               TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 유저별 쿠폰 인스턴스
CREATE TABLE user_coupons (
  id              SERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coupon_id       INTEGER NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  issue_epoch     TEXT NOT NULL DEFAULT 'once',
                  -- once        : code 방식 고정값 (유저당 1회)
                  -- {orderId}_N : purchase 방식 (예: '101_1', '101_2') — N개 구매 시 N개 발급
                  -- YYYYMM      : admin_direct monthly (예: '202606')
                  -- YYYYMM-N    : admin_direct manual 월 N회차 (예: '202606-1')
  status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
  issue_method    VARCHAR(20) NOT NULL CHECK (issue_method IN ('code', 'admin_direct', 'purchase')),
  issued_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  issued_admin_id UUID REFERENCES auth.users(id),               -- NULL=시스템 발급(code/purchase), UUID=직접 발급한 어드민
  used_at         TIMESTAMP WITH TIME ZONE,
  used_order_id   INTEGER REFERENCES orders(id),
  restored_at     TIMESTAMP WITH TIME ZONE,                     -- 복원 일시
  CONSTRAINT user_coupons_unique UNIQUE (user_id, coupon_id, issue_epoch)
);

-- RLS
ALTER TABLE coupons       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_coupons  ENABLE ROW LEVEL SECURITY;

-- coupons: 유저는 활성 쿠폰 조회만, 어드민은 전체
CREATE POLICY "coupons_select_active" ON coupons FOR SELECT USING (is_active = TRUE);
CREATE POLICY "coupons_admin_all"     ON coupons FOR ALL   USING (public.is_admin());

-- user_coupons: 본인 것만
CREATE POLICY "user_coupons_own"        ON user_coupons FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "user_coupons_admin_all"  ON user_coupons FOR ALL    USING (public.is_admin());
```

### `delivery_type: coupon` 상품과 쿠폰 템플릿 연결

`product_details.type_meta` JSONB에 `coupon_id`를 저장한다 (기존 패턴 활용, 별도 컬럼 추가 불필요):

```json
{ "coupon_id": 7 }
```

어드민이 쿠폰 상품을 등록할 때 이 값을 설정. `/api/payment/confirm`에서 `delivery_type: coupon` order_item 감지 시 이 값으로 `user_coupons` INSERT.

### orders 테이블 마이그레이션 (`supabase/order.sql` 하단에 추가)

```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_coupon_id INTEGER REFERENCES user_coupons(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_discount INTEGER DEFAULT 0;
```

> 기존 `total_discount` 컬럼을 그대로 유지하되, `coupon_discount`를 별도로 추적 (부분 환불 계산용).

---

## 4. API Routes

| Route | Method | 역할 |
|---|---|---|
| `/api/coupons/register` | POST | 유저가 코드 입력 → user_coupons에 등록 (`/settings/my-coupons`에서만 사용) |
| `/api/coupons/validate` | POST | checkout에서 선택한 `user_coupon_id`로 유효성 재확인 + 할인액 반환 |
| `/api/admin/coupons` | GET/POST | 쿠폰 목록 조회 / 신규 생성 |
| `/api/admin/coupons/[id]` | PATCH/DELETE | 쿠폰 수정 / 비활성화 |
| `/api/admin/coupons/[id]/issue` | POST | 특정 유저에게 직접 발급 + notifications INSERT (`title`: "쿠폰이 도착했어요!", `body`: "{쿠폰명} 쿠폰이 발급되었습니다.") |

**수정 필요 파일:**
- `src/app/api/payment/confirm/route.ts` — 쿠폰 최종 검증 + `status = 'used'` 처리
- `src/app/api/payment/cancel/route.ts` — 취소 시 쿠폰 복원 (mode='cancel'), 환불 시 `is_restorable_on_refund` 체크

---

## 5. Hooks

- `src/hooks/useMyCoupons.ts` — 유저 쿠폰 목록 fetch, 코드 등록 API 호출
- `src/hooks/useAdminCoupons.ts` — 어드민 CRUD (목록, 생성, 수정, 발급)
- `src/hooks/useCouponValidate.ts` — checkout에서 보유 쿠폰 목록 fetch + 선택된 `user_coupon_id` → `/api/coupons/validate` 호출 → 할인액 반환

---

## 6. 프론트엔드 수정 범위

### 신규 파일
```
src/app/admin/coupons/
  page.tsx              # 쿠폰 목록 (AdminTable 패턴 사용)
  write/page.tsx        # 쿠폰 생성 폼
  [id]/page.tsx         # 쿠폰 상세 + 발급 이력 + 유저 발급

src/types/coupon.ts     # Coupon, UserCoupon TypeScript 타입
```

### 수정 파일
```
src/app/settings/page.tsx:44
  → 내 쿠폰함 주석 해제

src/app/settings/my-coupons/page.tsx
  → useMyCoupons 훅 연결, 탭별 필터, 쿠폰 코드 등록 기능 활성화

src/app/shop/checkout/page.tsx
  → 보유 쿠폰 셀렉터 추가 (활성 쿠폰 목록 드롭다운/리스트 + 선택 시 할인 미리보기)
  → finalPrice 계산에 coupon discount 반영
  → createOrder() 호출 시 user_coupon_id 전달
```

### 어드민 사이드바 (어드민 내비게이션 파일 확인 후 수정)
- "쿠폰 관리" 메뉴 추가 (`/admin/coupons`)

---

## 7. 결제 플로우 변경 상세

### 현재 플로우
```
createOrder() → Toss 모달 → /api/payment/confirm → 완료
```

### 쿠폰 적용 후 플로우
```
① checkout 진입 시 보유 쿠폰 목록 로드 (user_coupons WHERE status='active')
② 유저가 목록에서 쿠폰 선택
③ /api/coupons/validate POST {user_coupon_id} — 서버에서 유효성 재확인 + 할인액 반환
④ UI에서 finalPrice = productTotal + shippingFee - couponDiscount 표시
⑤ createOrder() — orders에 user_coupon_id + coupon_discount + total_discount 저장
   (user_coupons.status는 여기서 변경 안 함)
⑥ Toss 모달 열림
⑦ /api/payment/confirm 서버:
   - [Toss 호출 전] 쿠폰 재검증 (만료 여부, status='active' 확인)
     → 실패 시 즉시 400 반환 — Toss confirm 미호출, 고객 결제 취소 불필요
   - Toss confirm API 호출
   - 금액 검증 (orders.final_price == Toss amount)
   - user_coupons.status = 'used', used_at, used_order_id 업데이트 (조건부 UPDATE로 원자적 처리)
   - coupons.used_count += 1
   - 기존 로직 (status='paid', 장바구니 삭제) 유지
   - order_items 중 delivery_type='coupon'인 항목이 있으면:
     → product_details.type_meta->>'coupon_id'로 쿠폰 템플릿 조회
     → 항목을 순회하며 seq(1부터) 증가, issue_epoch = '{order_id}_{seq}'
     → quantity > 1인 경우 unit별로 seq 증가하여 각각 INSERT
     → user_coupons INSERT (issue_method='purchase', issue_epoch='{order_id}_{seq}')
     → confirm 재실행(멱등성) 시 동일 epoch으로 ON CONFLICT DO NOTHING
```

### 취소 시 (/api/payment/cancel, mode='cancel')
```
기존 로직 + orders.user_coupon_id 존재 시 (할인 쿠폰이 적용된 주문):
  → user_coupons.status = 'active', restored_at = NOW(), used_at = NULL, used_order_id = NULL
    (주문이 없던 일이 되므로 사용 이력도 초기화)
  → coupons.used_count -= 1

order_items 중 delivery_type='coupon'인 항목이 있으면 (쿠폰 상품 구매 취소):
  → 해당 user_coupon.status 확인
  → 'used'인 경우: 주문 취소는 진행, 단 해당 항목 금액은 환불 제외
    - 환불액 = final_price - 이미 사용된 쿠폰 상품 price 합산
    - user_coupon은 'used' 상태 유지
  → 'active'인 경우: status = 'cancelled'로 변경, coupons.issued_count -= 1, 전액 환불
```

### 환불 승인 시 (/api/payment/cancel, mode='refund')
```
기존 로직 + orders.user_coupon_id 존재 시 (할인 쿠폰이 적용된 주문):
  → user_coupons.status = 'active', restored_at = NOW()
    used_at, used_order_id는 NULL로 변경하지 않음 (주문·사용 이력은 실재했으므로 보존)
  → coupons.used_count -= 1

order_items 중 delivery_type='coupon'인 항목이 있으면 (쿠폰 상품 환불):
  → 취소(mode='cancel')와 동일한 로직 적용
  → 'used'인 경우: 환불 진행, 해당 쿠폰 상품 금액 환불 제외
  → 'active'인 경우: status = 'cancelled'로 변경, coupons.issued_count -= 1, 전액 환불
```

---

## 8. 어드민 쿠폰 관리 페이지 상세

`/admin/coupons/page.tsx` (기존 AdminTable 패턴 사용):
- 컬럼: 쿠폰명 / 코드 / 할인유형 / 할인값 / 유효기간 / 발급/사용수 / 상태 / 관리
- FilterTabs: 전체 / 활성 / 비활성 / 만료됨
- ToggleButton으로 is_active 토글
- "새 쿠폰 추가" 버튼 → `/admin/coupons/write`

`/admin/coupons/write/page.tsx`:
- 필드: 쿠폰명, 코드(자동생성 or 직접입력), 할인유형(select), 할인값, 정률할인 상한, 최소주문금액, 발급방식, issue_epoch_type(select: once/monthly/manual), 최대발급수, 유효기간(시작~종료)
- `issue_epoch_type`은 `admin_direct` 발급 시에만 실질적 영향 — UI에서 발급방식이 `code`/`purchase`면 비활성화 또는 `once` 고정 표시
- 유저당 사용 횟수는 `issue_epoch_type` + UNIQUE 제약으로 DB가 보장 → 별도 컬럼/UI 불필요
- 환불복원 정책은 항상 복원으로 확정되어 UI 노출 없음

`/admin/coupons/[id]/page.tsx`:
- 쿠폰 기본 정보 + 수정
- 하단: 발급 이력 테이블 (user_coupons JOIN profiles)
- "유저에게 발급" 버튼 → 이메일 입력 → admin_direct 발급 → 발급 후 알림 전송

---

## 9. 검증 방법 (End-to-End)

1. **DB**: Supabase SQL Editor에서 `supabase/coupons.sql` 실행, `supabase/order.sql` 마이그레이션 실행
2. **쿠폰 생성**: `/admin/coupons/write`에서 fixed 3,000원 쿠폰 생성
3. **코드 등록**: `/settings/my-coupons`에서 코드 입력 → 내 쿠폰 목록에 표시 확인
4. **결제 적용**: 장바구니 → checkout → 쿠폰 선택 → 할인 미리보기 확인 → 결제 완료 → user_coupons.status='used' 확인
5. **취소 복원**: 주문 취소 → user_coupons.status='active' 복원 확인
6. **어드민 직접 발급**: `/admin/coupons/[id]`에서 특정 유저 이메일로 발급 → 유저 my-coupons에서 확인
7. **엣지 케이스**: 만료 쿠폰 적용 시도, 이미 사용한 쿠폰 재사용, 최소금액 미달 시 오류 메시지 확인

---

## 10. 구현 순서 (Phase 1 MVP)

1. `supabase/coupons.sql` 작성 + `supabase/order.sql` 마이그레이션 추가
2. `src/types/coupon.ts` 타입 정의
3. API Routes: `/api/coupons/register`, `/api/coupons/validate`, `/api/admin/coupons/*`
4. `/api/payment/confirm` + `/api/payment/cancel` 수정
5. `useMyCoupons`, `useAdminCoupons`, `useCouponValidate` 훅
6. 어드민 쿠폰 관리 페이지 (list → write → detail)
7. `checkout/page.tsx` 쿠폰 UI 추가
8. `settings/my-coupons/page.tsx` 백엔드 연결
9. `settings/page.tsx` 메뉴 주석 해제
10. 어드민 사이드바 쿠폰 메뉴 추가

---

## 확정된 비즈니스 정책

### 적용 조건
| 항목 | 결정 |
|---|---|
| 쿠폰 스택 | 주문당 1개만 적용 (중복 적용 불가) |
| 최소 주문금액 조건 | `min_order_amount` — 할인 전 상품 금액 기준 (0이면 조건 없음) |
| 정률 할인 적용 대상 | 상품 금액만 (배송비 제외) |
| 쿠폰 적용 대상 범위 | 전체 상품 통합 — 카테고리/상품 제한 없음 (MVP) |

### 결제 흐름
| 항목 | 결정 |
|---|---|
| checkout 쿠폰 선택 방식 | 보유 쿠폰 목록에서 선택 — 코드 직접 입력 없음 (코드 등록은 my-coupons에서) |
| 결제 confirm 시 쿠폰 검증 시점 | **Toss 호출 전** 검증 — 실패 시 즉시 400, Toss confirm 미호출 |
| 결제 confirm 시 쿠폰 만료 감지 | 결제 reject — "선택한 쿠폰이 만료되었어요!" 반환, 유저는 쿠폰 재선택 후 재시도 |

### 취소/환불
| 항목 | 결정 |
|---|---|
| 취소 시 쿠폰 복원 | 복원 O — `status = 'active'`, `used_at = NULL`, `used_order_id = NULL` (이력 초기화) |
| 환불 시 쿠폰 복원 | 복원 O — `status = 'active'`, `used_at`/`used_order_id` 유지, `restored_at` 기록 |
| 쿠폰 상품 취소 (쿠폰 이미 사용) | 취소 허용, 해당 쿠폰 상품 금액만 환불 제외 (Toss 부분환불) |
| 쿠폰 상품 취소 (쿠폰 미사용) | 전액 환불 + 쿠폰 `cancelled` 처리 |
| 부분 환불 + 쿠폰 | 쿠폰 항상 복원, 환불액은 `refund_amount` 기준 |

### 발급
| 항목 | 결정 |
|---|---|
| 유저당 발급 횟수 제한 | `UNIQUE(user_id, coupon_id, issue_epoch)` DB 레벨 보장 |
| 중복 발급 동시성 | epoch UNIQUE 제약으로 DB 레벨에서 원자적 차단 |
| admin_direct 발급 시 알림 | `notifications` 테이블 자동 INSERT ("쿠폰이 도착했어요!") |
