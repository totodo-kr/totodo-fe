-- =============================================
-- 쿠폰 시스템
-- 사전 조건: common.sql (is_admin, set_updated_at), order.sql (orders 테이블)
-- =============================================

-- =============================================
-- 쿠폰 템플릿 테이블
-- =============================================
CREATE TABLE coupons (
  id                  SERIAL PRIMARY KEY,
  code                VARCHAR(50) UNIQUE NOT NULL,              -- 유저 입력 코드 (SUMMER2024 등)
  name                VARCHAR(255) NOT NULL,
  description         TEXT,
  discount_type       VARCHAR(20) NOT NULL
                        CHECK (discount_type IN ('fixed', 'percentage', 'free_shipping')),
  discount_value      INTEGER NOT NULL CHECK (discount_value > 0),  -- 원 or %
  max_discount_amount INTEGER,                                  -- 정률 할인 상한액 (NULL=무제한)
  min_order_amount    INTEGER DEFAULT 0,                        -- 최소 주문금액 (할인 전 상품가 기준)
  issue_method        VARCHAR(20) DEFAULT 'code'
                        CHECK (issue_method IN ('code', 'admin_direct', 'purchase')),
  issue_epoch_type    VARCHAR(20) NOT NULL DEFAULT 'once'
                        CHECK (issue_epoch_type IN ('once', 'monthly', 'manual')),
                        -- once   : 유저당 평생 1회 (code 방식 기본값)
                        -- monthly: 월 1회, 시스템이 'YYYYMM' 자동 생성
                        -- manual : 어드민이 발급 시 epoch 직접 입력
  max_issue_count     INTEGER,                                  -- NULL=무제한
  issued_count        INTEGER DEFAULT 0,
  used_count          INTEGER DEFAULT 0,
  valid_from          TIMESTAMP WITH TIME ZONE,
  valid_until         TIMESTAMP WITH TIME ZONE,
  is_active           BOOLEAN DEFAULT TRUE,
  created_by          UUID REFERENCES auth.users(id),
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 유저별 쿠폰 인스턴스 테이블
-- =============================================
CREATE TABLE user_coupons (
  id              SERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coupon_id       INTEGER NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  issue_epoch     TEXT NOT NULL DEFAULT 'once',
                  -- once      : code 방식 고정 (유저당 1회)
                  -- {id}_{seq}: purchase 방식 (예: '101_1', '101_2')
                  -- YYYYMM    : admin_direct monthly
                  -- YYYYMM-N  : admin_direct manual 월 N회차
  status          VARCHAR(20) DEFAULT 'active'
                    CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
  issue_method    VARCHAR(20) NOT NULL
                    CHECK (issue_method IN ('code', 'admin_direct', 'purchase')),
  issued_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  issued_admin_id UUID REFERENCES auth.users(id),              -- NULL=시스템 발급, UUID=직접 발급한 어드민
  used_at         TIMESTAMP WITH TIME ZONE,
  used_order_id   INTEGER REFERENCES orders(id),
  restored_at     TIMESTAMP WITH TIME ZONE,
  CONSTRAINT user_coupons_unique UNIQUE (user_id, coupon_id, issue_epoch)
);

COMMENT ON TABLE coupons      IS '쿠폰 템플릿';
COMMENT ON TABLE user_coupons IS '유저별 쿠폰 인스턴스';

-- =============================================
-- 인덱스
-- =============================================
CREATE INDEX idx_coupons_code            ON coupons(code);
CREATE INDEX idx_coupons_is_active       ON coupons(is_active);
CREATE INDEX idx_user_coupons_user_id    ON user_coupons(user_id);
CREATE INDEX idx_user_coupons_user_status ON user_coupons(user_id, status);
CREATE INDEX idx_user_coupons_coupon_id  ON user_coupons(coupon_id);
CREATE INDEX idx_user_coupons_used_order ON user_coupons(used_order_id);

-- =============================================
-- 트리거
-- =============================================
CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================
-- RLS
-- =============================================
ALTER TABLE coupons      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_coupons ENABLE ROW LEVEL SECURITY;

-- coupons: 유저는 활성 쿠폰만 조회, 어드민은 전체 (OR 조합)
CREATE POLICY "coupons_select_active" ON coupons FOR SELECT USING (is_active = TRUE);
CREATE POLICY "coupons_admin_all"     ON coupons FOR ALL   USING (public.is_admin());

-- user_coupons: 본인 것만, 어드민 전체
CREATE POLICY "user_coupons_own"       ON user_coupons FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_coupons_admin_all" ON user_coupons FOR ALL USING (public.is_admin());

-- =============================================
-- orders 마이그레이션
-- user_coupons 테이블 생성 이후에 참조 가능하므로 이 파일에서 처리
-- =============================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_coupon_id INTEGER REFERENCES user_coupons(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_discount INTEGER DEFAULT 0;
