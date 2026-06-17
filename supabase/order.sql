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
