export type MetaFieldType = "text" | "number" | "select" | "textarea" | "richtext" | "date";

export interface MetaField {
  key: string;
  label: string;
  type: MetaFieldType;
  placeholder?: string;
  options?: string[];
  span?: "full" | "half"; // grid span
}

const SHIPPING_FEE: MetaField = {
  key: "shipping_fee",
  label: "배송비 (원)",
  type: "number",
  placeholder: "3000",
  span: "half",
};

export const CATEGORY_META_SCHEMAS: Record<string, MetaField[]> = {
  // ───── 도서 ─────
  books: [
    SHIPPING_FEE,
    { key: "isbn", label: "ISBN", type: "text", placeholder: "979-1-1234-5678-9", span: "half" },
    { key: "author", label: "저자", type: "text", placeholder: "홍길동", span: "half" },
    { key: "publisher", label: "출판사", type: "text", placeholder: "출판사명", span: "half" },
    { key: "publish_date", label: "출판일", type: "text", placeholder: "2024.06.26", span: "half" },
    {
      key: "book_type",
      label: "도서 형태",
      type: "select",
      options: ["종이책", "전자책", "오디오북"],
      span: "half",
    },
    {
      key: "print_color",
      label: "인쇄 컬러",
      type: "select",
      options: ["흑백", "컬러", "2도"],
      span: "half",
    },
    {
      key: "age_limit",
      label: "연령 제한",
      type: "select",
      options: ["전연령", "12세 이상", "15세 이상", "18세 이상"],
      span: "half",
    },
    { key: "page_count", label: "페이지 수", type: "number", placeholder: "156", span: "half" },
    { key: "author_introduction", label: "저자 소개", type: "richtext", span: "full" },
    { key: "table_of_contents", label: "목차", type: "richtext", span: "full" },
  ],

  // ───── 잡화/굿즈 ─────
  goods: [
    SHIPPING_FEE,
    { key: "size", label: "사이즈 / 규격", type: "text", placeholder: "A4, 210×297mm 등", span: "half" },
    { key: "material", label: "소재", type: "text", placeholder: "면, 폴리에스터 등", span: "half" },
    { key: "published_by", label: "제조사", type: "text", span: "half" },
    { key: "distributor", label: "판매사 / 유통사", type: "text", span: "half" },
  ],
};

// delivery_type 기반 폴백 스키마 (카테고리 스키마가 없을 때)
export const DELIVERY_META_SCHEMAS: Record<string, MetaField[]> = {
  digital_download: [
    { key: "file_url", label: "파일 URL", type: "text", placeholder: "https://...", span: "full" },
    { key: "file_format", label: "파일 형식", type: "text", placeholder: "PDF, EPUB, MP3 등", span: "half" },
    { key: "file_size", label: "파일 크기", type: "text", placeholder: "10MB", span: "half" },
  ],
  gifticon: [
    { key: "brand", label: "브랜드", type: "text", placeholder: "스타벅스", span: "half" },
    { key: "coupon_value", label: "쿠폰 금액 (원)", type: "number", span: "half" },
    { key: "expiry_days", label: "유효기간 (일)", type: "number", placeholder: "90", span: "half" },
  ],
  coupon: [
    { key: "coupon_code", label: "쿠폰 코드", type: "text", span: "half" },
    {
      key: "discount_type",
      label: "할인 유형",
      type: "select",
      options: ["정액", "정률"],
      span: "half",
    },
    { key: "discount_value", label: "할인 값", type: "number", placeholder: "3000 또는 10(%)", span: "half" },
    { key: "min_order_amount", label: "최소 주문금액 (원)", type: "number", span: "half" },
  ],
};

export function getMetaSchema(categorySlug: string, deliveryType: string): MetaField[] {
  return (
    CATEGORY_META_SCHEMAS[categorySlug] ??
    DELIVERY_META_SCHEMAS[deliveryType] ??
    []
  );
}
