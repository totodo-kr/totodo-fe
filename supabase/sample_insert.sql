-- =============================================
-- 샘플 데이터 삽입
-- =============================================

-- 카테고리
INSERT INTO product_categories (name, slug, description) VALUES
  ('도서', 'books', '교재 및 서적'),
  ('잡화', 'goods', '학습용품 및 기타 상품');

INSERT INTO products (
  category_id, title, subtitle, description, price, thumbnail_url, is_best
) VALUES
  (
    1,
    '俺の日本語。전자책 (9,900원)',
    '오레노 니홍고',
    '「오레노 니홍고。」 강의전용 전자책입니다.',
    9900,
    'https://cdn.publishingkit.net/1e89e781-2600-49f1-82d0-24a7be9a85f3.png',
    true
  );

INSERT INTO product_details (
  product_id, detailed_description, shipping_fee, author, publisher, publish_date, images
) VALUES
  (
    1,
    '「오레노 니홍고。」 강의전용 전자책입니다.',
    3000,
    'ドドト',
    '토토도홀딩스',
    '2024.06.26',
    '[
      {"url": "https://publ-upload-prod.s3.ap-northeast-2.amazonaws.com/7a6bfacc-4b94-4e5e-9293-86a18a11f32d.jpg", "order": 0, "alt": "전자책 표지"},
      {"url": "https://publ-upload-prod.s3.ap-northeast-2.amazonaws.com/ed0c945b-67e6-4847-b005-5627038dadd6.JPG", "order": 1, "alt": "도도토와 전자책"}
    ]'::jsonb
  );