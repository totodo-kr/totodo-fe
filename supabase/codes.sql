-- =============================================
-- 공통 코드 테이블
-- 관리자 페이지에서 코드 그룹/값을 동적으로 관리
-- 사전 조건: common.sql (is_admin 함수)
--
-- group_code 목록:
--   DELIVERY_TYPE  배송 타입 (products.delivery_type)
--   BOOK_TYPE      출판 형태 (type_meta.book_type)
--   PRINT_COLOR    인쇄 컬러 (type_meta.print_color)
--   AGE_LIMIT      연령 제한  (type_meta.age_limit)
--   BOARD_CATEGORY 게시판 카테고리
-- =============================================
CREATE TABLE codes (
  id          SERIAL       PRIMARY KEY,
  group_code  VARCHAR(50)  NOT NULL,
  code        VARCHAR(50)  NOT NULL,
  label       VARCHAR(100) NOT NULL,
  description TEXT,
  sort_order  INTEGER      DEFAULT 0,
  is_active   BOOLEAN      DEFAULT TRUE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (group_code, code)
);

COMMENT ON TABLE codes IS '공통 코드 테이블. 관리자 페이지에서 group_code 단위로 관리';
COMMENT ON COLUMN codes.group_code IS '코드 그룹 식별자: DELIVERY_TYPE, BOOK_TYPE 등';
COMMENT ON COLUMN codes.code IS '저장되는 실제 코드 값 (영문, 스네이크케이스)';
COMMENT ON COLUMN codes.label IS '화면에 표시할 레이블';

-- =============================================
-- RLS
-- =============================================
ALTER TABLE codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "codes_select_public"  ON codes FOR SELECT USING (is_active = TRUE);
CREATE POLICY "codes_select_admin"   ON codes FOR SELECT USING (public.is_admin());
CREATE POLICY "codes_insert_admin"   ON codes FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "codes_update_admin"   ON codes FOR UPDATE USING (public.is_admin());
CREATE POLICY "codes_delete_admin"   ON codes FOR DELETE USING (public.is_admin());

-- =============================================
-- 초기 데이터
-- =============================================
INSERT INTO codes (group_code, code, label, sort_order) VALUES
  ('DELIVERY_TYPE', 'physical',         '배송 상품',    1),
  ('DELIVERY_TYPE', 'digital_download', '다운로드 상품', 2),
  ('DELIVERY_TYPE', 'gifticon',         '기프티콘',     3),
  ('DELIVERY_TYPE', 'coupon',           '쿠폰',        4),

  ('BOOK_TYPE',   'paperback', '종이책',   1),
  ('BOOK_TYPE',   'ebook',     '전자책',   2),
  ('BOOK_TYPE',   'audiobook', '오디오북', 3),

  ('PRINT_COLOR', 'mono',      '흑백', 1),
  ('PRINT_COLOR', 'color',     '컬러', 2),
  ('PRINT_COLOR', 'two_color', '2도',  3),

  ('AGE_LIMIT',   'all', '전연령',    1),
  ('AGE_LIMIT',   '12',  '12세 이상', 2),
  ('AGE_LIMIT',   '15',  '15세 이상', 3),
  ('AGE_LIMIT',   '18',  '18세 이상', 4),

  ('BOARD_CATEGORY', 'notice',   '공지', 1),
  ('BOARD_CATEGORY', 'question', '질문', 2),
  ('BOARD_CATEGORY', 'general',  '일반', 3),
  ('BOARD_CATEGORY', 'column',   '칼럼', 4)
ON CONFLICT (group_code, code) DO NOTHING;

-- =============================================
-- products.delivery_type 유효성 검사 트리거
-- codes PK가 복합키라 단일 컬럼 FK 불가 → 트리거로 대체
-- 사전 조건: products 테이블에 delivery_type 컬럼이 추가된 이후 실행
-- =============================================
CREATE OR REPLACE FUNCTION validate_delivery_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM codes
    WHERE group_code = 'DELIVERY_TYPE'
      AND code = NEW.delivery_type
      AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'delivery_type "%" is not a valid active code', NEW.delivery_type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_products_delivery_type
  BEFORE INSERT OR UPDATE OF delivery_type ON products
  FOR EACH ROW
  EXECUTE FUNCTION validate_delivery_type();
