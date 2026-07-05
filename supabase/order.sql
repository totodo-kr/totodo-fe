-- =============================================
-- 주문 관련 테이블
-- 사전 조건: common.sql (is_admin 함수), products.sql
-- =============================================

-- =============================================
-- 장바구니 테이블
-- =============================================
CREATE TABLE cart_items (
  id         SERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity   INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT cart_items_unique_user_product UNIQUE (user_id, product_id)
);

-- =============================================
-- 위시리스트 테이블
-- =============================================
CREATE TABLE wishlists (
  id         SERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT wishlists_unique_user_product UNIQUE (user_id, product_id)
);

-- =============================================
-- 주문 테이블
-- =============================================
CREATE TABLE orders (
  id                   SERIAL PRIMARY KEY,
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_number         VARCHAR(100) NOT NULL UNIQUE,
  total_product_price  INTEGER NOT NULL CHECK (total_product_price >= 0),
  total_shipping_fee   INTEGER NOT NULL CHECK (total_shipping_fee >= 0),
  total_discount       INTEGER DEFAULT 0 CHECK (total_discount >= 0),
  final_price          INTEGER NOT NULL CHECK (final_price >= 0),
  recipient_name       VARCHAR(100) NOT NULL,
  recipient_phone      VARCHAR(20) NOT NULL,
  shipping_address     TEXT NOT NULL,
  shipping_zipcode     VARCHAR(10),
  shipping_memo        TEXT,
  status               VARCHAR(50) NOT NULL DEFAULT 'pending',
  payment_method       VARCHAR(50),
  payment_info         JSONB,
  paid_at              TIMESTAMP WITH TIME ZONE,
  created_at           TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 주문 상품 테이블
-- =============================================
CREATE TABLE order_items (
  id            SERIAL PRIMARY KEY,
  order_id      INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name  VARCHAR(255) NOT NULL,
  product_price INTEGER NOT NULL CHECK (product_price >= 0),
  quantity      INTEGER NOT NULL CHECK (quantity > 0),
  subtotal      INTEGER NOT NULL CHECK (subtotal >= 0),
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE cart_items  IS '장바구니';
COMMENT ON TABLE wishlists   IS '위시리스트';
COMMENT ON TABLE orders      IS '주문';
COMMENT ON TABLE order_items IS '주문 상품';

-- =============================================
-- 인덱스
-- =============================================
CREATE INDEX idx_cart_items_user_id    ON cart_items(user_id);
CREATE INDEX idx_cart_items_product_id ON cart_items(product_id);
CREATE INDEX idx_wishlists_user_id     ON wishlists(user_id);
CREATE INDEX idx_wishlists_product_id  ON wishlists(product_id);
CREATE INDEX idx_orders_user_id        ON orders(user_id);
CREATE INDEX idx_orders_order_number   ON orders(order_number);
CREATE INDEX idx_orders_status         ON orders(status);
CREATE INDEX idx_orders_created_at     ON orders(created_at DESC);
CREATE INDEX idx_order_items_order_id  ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- =============================================
-- 트리거
-- =============================================
CREATE TRIGGER update_cart_items_updated_at
  BEFORE UPDATE ON cart_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================
-- RLS
-- =============================================
ALTER TABLE cart_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists   ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cart_items_own"    ON cart_items  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "wishlists_own"     ON wishlists   FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "orders_select_own"   ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "orders_insert_own"   ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "orders_select_admin" ON orders FOR SELECT USING (public.is_admin());
CREATE POLICY "orders_update_admin" ON orders FOR UPDATE USING (public.is_admin());

CREATE POLICY "order_items_select_own" ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);
CREATE POLICY "order_items_insert_own" ON order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);
CREATE POLICY "order_items_select_admin" ON order_items FOR SELECT USING (public.is_admin());

-- =============================================
-- 마이그레이션
-- =============================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancel_requested_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_status VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_amount INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_requested_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_completed_at TIMESTAMP WITH TIME ZONE;

-- 배송 추적 테이블 (orders와 1:1 관계)
CREATE TABLE IF NOT EXISTS shipping_tracking (
  id               SERIAL PRIMARY KEY,
  order_id         INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  courier_name     VARCHAR(100),
  tracking_number  VARCHAR(100),
  status           VARCHAR(50),
  tracking_details JSONB,
  shipped_at       TIMESTAMP WITH TIME ZONE,
  delivered_at     TIMESTAMP WITH TIME ZONE,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT shipping_tracking_unique_order UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_shipping_tracking_order_id ON shipping_tracking(order_id);

ALTER TABLE shipping_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shipping_tracking_select_own" ON shipping_tracking FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = shipping_tracking.order_id AND orders.user_id = auth.uid())
);
CREATE POLICY "shipping_tracking_select_admin" ON shipping_tracking FOR SELECT USING (public.is_admin());
CREATE POLICY "shipping_tracking_write_admin"  ON shipping_tracking FOR ALL   USING (public.is_admin());

-- 2026.06.17.
-- 강의 결제 지원: order_items.product_id nullable, lecture_id 추가
ALTER TABLE order_items ALTER COLUMN product_id DROP NOT NULL;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS lecture_id INTEGER REFERENCES lectures(id) ON DELETE RESTRICT;

CREATE POLICY "order_items_insert_admin" ON order_items FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "order_items_update_admin" ON order_items FOR UPDATE USING (public.is_admin());

-- =============================================
-- 2026/06/27
-- orders 마이그레이션
-- user_coupons 테이블 생성 이후에 참조 가능하므로 이 파일에서 처리
-- =============================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_coupon_id INTEGER REFERENCES user_coupons(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_discount INTEGER DEFAULT 0;

-- =============================================
-- 2026/07/04 — Phase 0: 실물 vs 디지털 주문 생애주기 분리
-- =============================================

-- §1: order_items에 delivery_type 스냅샷
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS delivery_type VARCHAR(50) NOT NULL DEFAULT 'physical';

ALTER TABLE order_items
  ADD CONSTRAINT order_items_digital_download_qty_one
  CHECK (delivery_type != 'digital_download' OR quantity = 1);

-- §2: orders에 order_type 컬럼 추가
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS order_type VARCHAR(20) NOT NULL DEFAULT 'physical';
-- 'physical' | 'digital' | 'mixed'

-- §3: 디지털 이행 공통 레이어 + 타입별 자식 테이블
CREATE TABLE IF NOT EXISTS digital_fulfillments (
  id            SERIAL PRIMARY KEY,
  order_id      INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id INTEGER NOT NULL UNIQUE REFERENCES order_items(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delivery_type VARCHAR(50) NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'success'
                  CHECK (status IN ('success', 'failed', 'cancelled')),
  fulfilled_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ebook_downloads (
  id                     SERIAL PRIMARY KEY,
  digital_fulfillment_id INTEGER NOT NULL UNIQUE REFERENCES digital_fulfillments(id) ON DELETE CASCADE,
  download_token         VARCHAR(255) UNIQUE NOT NULL,
  download_count         INTEGER NOT NULL DEFAULT 0,
  download_limit         INTEGER NOT NULL DEFAULT 3,
  expires_at             TIMESTAMP WITH TIME ZONE,
  first_downloaded_at    TIMESTAMP WITH TIME ZONE,
  source_ref             TEXT,
  created_at             TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gifticon_codes (
  id                       SERIAL PRIMARY KEY,
  product_id               INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  code                     TEXT NOT NULL
                             CHECK (code ~ '^\d{4}-\d{4}-\d{4}$'),
  status                   VARCHAR(20) NOT NULL DEFAULT 'available'
                             CHECK (status IN ('available', 'issued', 'revealed', 'void')),
  issued_to_fulfillment_id INTEGER REFERENCES digital_fulfillments(id),
  issued_at                TIMESTAMP WITH TIME ZONE,
  revealed_at              TIMESTAMP WITH TIME ZONE,
  created_at               TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (product_id, code)
);

-- §7: gifticon_codes 부분 인덱스
CREATE INDEX IF NOT EXISTS idx_gifticon_codes_available
  ON gifticon_codes(product_id) WHERE status = 'available';
CREATE INDEX IF NOT EXISTS idx_gifticon_codes_issued_fulfillment
  ON gifticon_codes(issued_to_fulfillment_id) WHERE issued_to_fulfillment_id IS NOT NULL;

-- §8: RLS
ALTER TABLE digital_fulfillments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "digital_fulfillments_select_own"   ON digital_fulfillments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "digital_fulfillments_select_admin" ON digital_fulfillments FOR ALL    USING (public.is_admin());

ALTER TABLE ebook_downloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ebook_downloads_select_own" ON ebook_downloads FOR SELECT USING (
  EXISTS (SELECT 1 FROM digital_fulfillments df WHERE df.id = ebook_downloads.digital_fulfillment_id AND df.user_id = auth.uid())
);
CREATE POLICY "ebook_downloads_admin_all" ON ebook_downloads FOR ALL USING (public.is_admin());

ALTER TABLE gifticon_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gifticon_codes_select_own_issued" ON gifticon_codes FOR SELECT USING (
  issued_to_fulfillment_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM digital_fulfillments df WHERE df.id = gifticon_codes.issued_to_fulfillment_id AND df.user_id = auth.uid())
);
CREATE POLICY "gifticon_codes_admin_all" ON gifticon_codes FOR ALL USING (public.is_admin());

-- =============================================
-- 2026/07/05 — Phase 1: gifticon 원자적 코드 예약 RPC (§7)
-- SECURITY DEFINER로 RLS를 우회해 available 재고를 읽어야 함.
-- 재고 없으면 NULL 반환 → confirm route가 자동 부분 취소 처리.
-- =============================================
CREATE OR REPLACE FUNCTION claim_gifticon_code(p_product_id INTEGER, p_fulfillment_id INTEGER)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_code_id INTEGER;
BEGIN
  SELECT id INTO v_code_id
  FROM gifticon_codes
  WHERE product_id = p_product_id AND status = 'available'
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF v_code_id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE gifticon_codes
  SET status = 'issued',
      issued_to_fulfillment_id = p_fulfillment_id,
      issued_at = CURRENT_TIMESTAMP
  WHERE id = v_code_id;

  RETURN v_code_id;
END;
$$;

-- =============================================
-- 2026/07/05 — Phase 2: 다운로드 횟수 원자적 증가 RPC (§6)
-- 단일 UPDATE ... WHERE ... RETURNING으로 조건 확인과 증가를 한 트랜잭션에서 처리해
-- 동시 요청이 download_limit을 넘겨 증가시키는 경쟁을 방지한다.
-- 조건 불충족(한도 초과/만료)이면 행이 반환되지 않는다.
-- =============================================
CREATE OR REPLACE FUNCTION increment_ebook_download_count(p_token VARCHAR)
RETURNS TABLE (
  id INTEGER,
  digital_fulfillment_id INTEGER,
  source_ref TEXT,
  download_count INTEGER,
  download_limit INTEGER
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  UPDATE ebook_downloads
  SET download_count = ebook_downloads.download_count + 1,
      first_downloaded_at = COALESCE(ebook_downloads.first_downloaded_at, CURRENT_TIMESTAMP)
  WHERE ebook_downloads.download_token = p_token
    AND ebook_downloads.download_count < ebook_downloads.download_limit
    AND (ebook_downloads.expires_at IS NULL OR ebook_downloads.expires_at > CURRENT_TIMESTAMP)
  RETURNING ebook_downloads.id, ebook_downloads.digital_fulfillment_id, ebook_downloads.source_ref,
            ebook_downloads.download_count, ebook_downloads.download_limit;
END;
$$;

-- =============================================
-- 2026/07/05 — 보안 조치: SECURITY DEFINER 함수 실행 권한 제한
-- Postgres는 새 함수에 기본적으로 PUBLIC(anon, authenticated 포함)에게 EXECUTE 권한을 준다.
-- 이 REVOKE가 없으면 로그인한 임의 유저가 브라우저에서 claim_gifticon_code를 직접 호출해
-- (본인이 결제한 것과 무관한 임의의 p_fulfillment_id를 넘겨) 재고 전체를 무료로 가져갈 수 있었다.
-- 실제 호출부는 confirm/route.ts, download/[token]/route.ts 등 service_role 클라이언트뿐이므로
-- service_role에게만 남겨도 정상 동작에는 영향이 없다.
-- =============================================
REVOKE EXECUTE ON FUNCTION claim_gifticon_code(INTEGER, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION increment_ebook_download_count(VARCHAR) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION claim_gifticon_code(INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION increment_ebook_download_count(VARCHAR) TO service_role;
