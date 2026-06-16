-- =============================================
-- 상품 카테고리 테이블
-- =============================================
CREATE TABLE product_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE, -- '도서', '잡화' 등
  slug VARCHAR(50) NOT NULL UNIQUE, -- 'books', 'goods' 등 (URL용)
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 상품 기본 정보 테이블 (목록용)
-- =============================================
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,

  -- 목록에 표시할 기본 정보만
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255),
  description TEXT, -- 간단한 설명
  price INTEGER NOT NULL CHECK (price >= 0),
  original_price INTEGER CHECK (original_price >= 0),               -- 할인 전 정가
  event_label    VARCHAR(50),                                        -- HOT/SALE/NEW/LIMITED 등
  event_end_date TIMESTAMP WITH TIME ZONE,                          -- 이벤트 종료일
  stock          INTEGER CHECK (stock >= 0),                        -- 재고 (NULL=무한, 0=품절)
  thumbnail_url TEXT, -- 대표 이미지 URL

  -- 표시 옵션
  is_best BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,

  -- 통계
  view_count INTEGER DEFAULT 0,
  sales_count INTEGER DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  average_rating DECIMAL(2,1) DEFAULT 0.0,

  -- 타임스탬프
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT products_title_key UNIQUE (title)
);

-- =============================================
-- 상품 상세 정보 테이블 (상세페이지용)
-- =============================================
CREATE TABLE product_details (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  -- 상세 설명 (HTML 가능)
  detailed_description TEXT,   -- 도서 소개
  author_introduction TEXT,    -- 저자 소개
  table_of_contents TEXT,      -- 도서 목차

  -- 가격 정보
  shipping_fee INTEGER NOT NULL DEFAULT 3000 CHECK (shipping_fee >= 0),

  -- 도서 관련 정보
  author VARCHAR(255),
  publisher VARCHAR(255),
  publish_date VARCHAR(100),
  isbn VARCHAR(50),
  book_type VARCHAR(50),       -- 종이책, 전자책, 오디오북 등
  print_color VARCHAR(50),     -- 흑백, 컬러, 2도 등
  age_limit VARCHAR(50),       -- 전연령, 12세 이상, 15세 이상, 18세 이상 등
  page_count INTEGER CHECK (page_count > 0),

  -- 제품 상세 정보
  size VARCHAR(100),
  material VARCHAR(255),
  published_by VARCHAR(255),
  distributor VARCHAR(255),

  -- 이미지들 (JSON 배열)
  images JSONB DEFAULT '[]'::jsonb,
  -- 예시: [
  --   {"url": "https://...", "order": 0, "alt": "메인 이미지"},
  --   {"url": "https://...", "order": 1, "alt": "상세 이미지"}
  -- ]

  -- 추가 정보
  features TEXT[], -- 특징 배열
  specifications JSONB, -- 스펙 (JSON)
  notes TEXT, -- 주의사항

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- product_id는 유니크 (1:1 관계)
  CONSTRAINT product_details_product_id_key UNIQUE (product_id)
);

-- =============================================
-- 상품 리뷰 테이블
-- =============================================
CREATE TABLE product_reviews (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  content TEXT NOT NULL,
  images JSONB DEFAULT '[]'::jsonb, -- 리뷰 이미지들

  is_verified_purchase BOOLEAN DEFAULT FALSE,
  is_visible BOOLEAN DEFAULT TRUE,
  helpful_count INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 상품 Q&A 테이블
-- =============================================
CREATE TABLE product_qna (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_private BOOLEAN DEFAULT FALSE,

  answer TEXT,
  answered_at TIMESTAMP WITH TIME ZONE,
  answered_by UUID REFERENCES auth.users(id),

  view_count INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);



-- =============================================
-- 인덱스 생성
-- =============================================
-- 상품 테이블 인덱스
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_is_best ON products(is_best) WHERE is_best = TRUE;
CREATE INDEX idx_products_is_active ON products(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_products_created_at ON products(created_at DESC);
CREATE INDEX idx_products_average_rating ON products(average_rating DESC);

-- 상품 상세 인덱스
CREATE INDEX idx_product_details_product_id ON product_details(product_id);

-- 리뷰 인덱스
CREATE INDEX idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX idx_product_reviews_user_id ON product_reviews(user_id);
CREATE INDEX idx_product_reviews_created_at ON product_reviews(created_at DESC);
CREATE INDEX idx_product_reviews_rating ON product_reviews(rating);

-- Q&A 인덱스
CREATE INDEX idx_product_qna_product_id ON product_qna(product_id);
CREATE INDEX idx_product_qna_user_id ON product_qna(user_id);
CREATE INDEX idx_product_qna_created_at ON product_qna(created_at DESC);



-- =============================================
-- 트리거: updated_at 자동 업데이트
-- =============================================
CREATE TRIGGER update_product_categories_updated_at
  BEFORE UPDATE ON product_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER update_product_details_updated_at
  BEFORE UPDATE ON product_details
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER update_product_reviews_updated_at
  BEFORE UPDATE ON product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER update_product_qna_updated_at
  BEFORE UPDATE ON product_qna
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();



-- =============================================
-- 트리거: 리뷰 작성 시 products 테이블 통계 업데이트
-- =============================================
CREATE OR REPLACE FUNCTION update_product_review_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- 리뷰 통계 업데이트
  UPDATE products
  SET
    review_count = (
      SELECT COUNT(*)
      FROM product_reviews
      WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
        AND is_visible = true
    ),
    average_rating = (
      SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0)
      FROM product_reviews
      WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
        AND is_visible = true
    )
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_review_stats_on_insert
  AFTER INSERT ON product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_product_review_stats();

CREATE TRIGGER update_review_stats_on_update
  AFTER UPDATE ON product_reviews
  FOR EACH ROW
  WHEN (OLD.rating IS DISTINCT FROM NEW.rating OR OLD.is_visible IS DISTINCT FROM NEW.is_visible)
  EXECUTE FUNCTION update_product_review_stats();

CREATE TRIGGER update_review_stats_on_delete
  AFTER DELETE ON product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_product_review_stats();



-- =============================================
-- RLS
-- =============================================
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products           ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_details    ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews    ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_qna        ENABLE ROW LEVEL SECURITY;

-- 카테고리: 전체 공개
CREATE POLICY "product_categories_select_public" ON product_categories FOR SELECT USING (true);

-- 상품: 활성 상품 공개 + 어드민 전체 CRUD
CREATE POLICY "products_select_public"  ON products FOR SELECT USING (is_active = true);
CREATE POLICY "products_select_admin"   ON products FOR SELECT USING (public.is_admin());
CREATE POLICY "products_insert_admin"   ON products FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "products_update_admin"   ON products FOR UPDATE USING (public.is_admin());
CREATE POLICY "products_delete_admin"   ON products FOR DELETE USING (public.is_admin());

-- 상품 상세: 활성 상품 연계 공개 + 어드민 전체 CRUD
CREATE POLICY "product_details_select_public" ON product_details FOR SELECT
  USING (EXISTS (SELECT 1 FROM products WHERE products.id = product_details.product_id AND products.is_active = true));
CREATE POLICY "product_details_select_admin"  ON product_details FOR SELECT USING (public.is_admin());
CREATE POLICY "product_details_insert_admin"  ON product_details FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "product_details_update_admin"  ON product_details FOR UPDATE USING (public.is_admin());

-- 리뷰: 공개 조회 + 본인 작성/수정/삭제
CREATE POLICY "product_reviews_select_public" ON product_reviews FOR SELECT USING (is_visible = true);
CREATE POLICY "product_reviews_own"           ON product_reviews FOR ALL USING (auth.uid() = user_id);

-- Q&A: 공개 조회 + 본인 전체
CREATE POLICY "product_qna_select_public" ON product_qna FOR SELECT USING (is_private = false);
CREATE POLICY "product_qna_select_own"    ON product_qna FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "product_qna_own"           ON product_qna FOR ALL USING (auth.uid() = user_id);



-- =============================================
-- 커멘트
-- =============================================
COMMENT ON TABLE products IS '상품 기본 정보 (목록 조회용)';
COMMENT ON TABLE product_details IS '상품 상세 정보 (상세 페이지용, 이미지 포함)';
COMMENT ON TABLE product_categories IS '상품 카테고리';
COMMENT ON TABLE product_reviews IS '상품 리뷰';
COMMENT ON TABLE product_qna IS '상품 Q&A';

COMMENT ON COLUMN product_details.images IS 'JSONB 배열: [{"url": "...", "order": 0, "alt": "..."}]';
COMMENT ON COLUMN product_details.isbn IS '국제 표준 도서 번호 (ISBN-13 권장)';
COMMENT ON COLUMN product_details.book_type IS '출판 형태: 종이책, 전자책, 오디오북 등';
COMMENT ON COLUMN product_details.print_color IS '인쇄 컬러: 흑백, 컬러, 2도 등';
COMMENT ON COLUMN product_details.age_limit IS '연령 제한: 전연령, 12세 이상, 15세 이상, 18세 이상 등';
COMMENT ON COLUMN product_details.page_count IS '총 페이지 수';
COMMENT ON COLUMN product_details.author_introduction IS '저자 소개 (HTML 가능)';
COMMENT ON COLUMN product_details.table_of_contents IS '도서 목차 (HTML 가능)';
COMMENT ON COLUMN products.thumbnail_url IS '목록에 표시할 대표 이미지';
COMMENT ON COLUMN products.review_count IS '리뷰 개수 (캐시)';
COMMENT ON COLUMN products.average_rating IS '평균 평점 (캐시)';

-- =============================================
-- 마이그레이션: product_details 도서 추가 필드
-- 이미 생성된 DB에 적용할 때 아래 ALTER TABLE 실행
-- =============================================
ALTER TABLE product_details
  ADD COLUMN IF NOT EXISTS isbn VARCHAR(50),
  ADD COLUMN IF NOT EXISTS book_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS print_color VARCHAR(50),
  ADD COLUMN IF NOT EXISTS age_limit VARCHAR(50),
  ADD COLUMN IF NOT EXISTS page_count INTEGER CHECK (page_count > 0)

ALTER TABLE product_details
  ADD COLUMN IF NOT EXISTS author_introduction TEXT,
  ADD COLUMN IF NOT EXISTS table_of_contents TEXT;

-- =============================================
-- 2026-05-30: delivery_type + type_meta 구조 전환
-- 사전 조건: codes.sql 먼저 실행 (codes 테이블 및 초기 데이터 필요)
-- =============================================

-- products에 delivery_type 컬럼 추가
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS delivery_type VARCHAR(50) NOT NULL DEFAULT 'physical';

COMMENT ON COLUMN products.delivery_type IS 'codes 테이블 DELIVERY_TYPE 그룹의 code 값. codes.sql 참고';

CREATE INDEX IF NOT EXISTS idx_products_delivery_type ON products(delivery_type);

-- product_details에 type_meta 컬럼 추가
ALTER TABLE product_details
  ADD COLUMN IF NOT EXISTS type_meta JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN product_details.type_meta IS 'delivery_type별 속성 저장. physical: shipping_fee/author/isbn 등, digital_download: file_url/file_format 등, gifticon: brand/coupon_value 등';

CREATE INDEX IF NOT EXISTS idx_product_details_type_meta ON product_details USING GIN (type_meta);

-- 기존 컬럼 데이터를 type_meta로 마이그레이션
UPDATE product_details
SET type_meta = jsonb_strip_nulls(jsonb_build_object(
  'shipping_fee',        shipping_fee,
  'author',              author,
  'publisher',           publisher,
  'publish_date',        publish_date,
  'isbn',                isbn,
  'book_type',           book_type,
  'print_color',         print_color,
  'age_limit',           age_limit,
  'page_count',          page_count,
  'author_introduction', author_introduction,
  'table_of_contents',   table_of_contents,
  'size',                size,
  'material',            material,
  'published_by',        published_by,
  'distributor',         distributor,
  'specifications',      specifications
))
WHERE type_meta = '{}'::jsonb;

-- 기존 타입별 컬럼 제거
ALTER TABLE product_details
  DROP COLUMN IF EXISTS shipping_fee,
  DROP COLUMN IF EXISTS author,
  DROP COLUMN IF EXISTS publisher,
  DROP COLUMN IF EXISTS publish_date,
  DROP COLUMN IF EXISTS isbn,
  DROP COLUMN IF EXISTS book_type,
  DROP COLUMN IF EXISTS print_color,
  DROP COLUMN IF EXISTS age_limit,
  DROP COLUMN IF EXISTS page_count,
  DROP COLUMN IF EXISTS author_introduction,
  DROP COLUMN IF EXISTS table_of_contents,
  DROP COLUMN IF EXISTS size,
  DROP COLUMN IF EXISTS material,
  DROP COLUMN IF EXISTS published_by,
  DROP COLUMN IF EXISTS distributor,
  DROP COLUMN IF EXISTS specifications;

-- =============================================
-- 마이그레이션: 할인·이벤트·재고 컬럼 추가
-- 이미 운영 중인 DB에 적용
-- 2026-06-16
-- =============================================
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS original_price INTEGER CHECK (original_price >= 0),
  ADD COLUMN IF NOT EXISTS event_label   VARCHAR(50),
  ADD COLUMN IF NOT EXISTS event_end_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS stock         INTEGER CHECK (stock >= 0);

COMMENT ON COLUMN products.original_price  IS '할인 전 정가 (할인 없으면 NULL)';

-- discount_rate 제거 마이그레이션 (original_price - price로 자동 계산)
ALTER TABLE products DROP COLUMN IF EXISTS discount_rate;
COMMENT ON COLUMN products.event_label     IS '이벤트 배지 텍스트 (HOT/SALE/NEW/LIMITED 등)';
COMMENT ON COLUMN products.event_end_date  IS '이벤트 종료일 (NULL이면 상시)';
COMMENT ON COLUMN products.stock           IS '재고 수량 (NULL이면 무한, 0이면 품절)';

