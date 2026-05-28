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
  
  -- 상세 설명
  detailed_description TEXT, -- 상세 설명 (HTML 가능)
  
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



-- 카테고리 RLS
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "카테고리는 모두 조회 가능" ON product_categories FOR SELECT TO public USING (true);

-- 상품 RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "활성 상품은 모두 조회 가능" ON products FOR SELECT TO public USING (is_active = true);
CREATE POLICY "관리자는 모든 상품 관리 가능" ON products FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- 상품 상세 RLS
ALTER TABLE product_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "활성 상품 상세는 모두 조회 가능" ON product_details FOR SELECT TO public 
  USING (EXISTS (SELECT 1 FROM products WHERE products.id = product_details.product_id AND products.is_active = true));
CREATE POLICY "관리자는 모든 상품 상세 관리 가능" ON product_details FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- 리뷰 RLS
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "공개 리뷰는 모두 조회 가능" ON product_reviews FOR SELECT TO public USING (is_visible = true);
CREATE POLICY "본인 리뷰는 작성/수정/삭제 가능" ON product_reviews FOR ALL USING (auth.uid() = user_id);

-- Q&A RLS
ALTER TABLE product_qna ENABLE ROW LEVEL SECURITY;
CREATE POLICY "공개 Q&A는 모두 조회 가능" ON product_qna FOR SELECT TO public USING (is_private = false);
CREATE POLICY "본인 Q&A는 조회 가능" ON product_qna FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "본인 Q&A는 작성/수정/삭제 가능" ON product_qna FOR ALL USING (auth.uid() = user_id);



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
  ADD COLUMN IF NOT EXISTS page_count INTEGER CHECK (page_count > 0);
