export type MetaFieldType = "text" | "number" | "select" | "textarea" | "richtext" | "date";

export interface MetaField {
  key: string;
  label: string;
  type: MetaFieldType;
  placeholder?: string;
  options?: string[];
  span?: "full" | "half"; // grid span
}

export const SHIPPING_FEE: MetaField = {
  key: "shipping_fee",
  label: "배송비 (원)",
  type: "number",
  placeholder: "3000",
  span: "half",
};

// delivery_type 기반 폴백 스키마 (카테고리에 field_schema가 없을 때)
export const DELIVERY_META_SCHEMAS: Record<string, MetaField[]> = {
  // 실제 다운로드 파일(file_path)은 ProductForm의 EbookFilePanel에서 Storage 업로드로만 설정한다 —
  // 관리자가 직접 URL을 입력하게 하면 비공개 버킷 경로와 어긋날 수 있어 이 스키마에서 제외.
  digital_download: [
    { key: "file_format", label: "파일 형식", type: "text", placeholder: "PDF, EPUB, MP3 등", span: "half" },
    { key: "file_size", label: "파일 크기", type: "text", placeholder: "10MB", span: "half" },
  ],
  gifticon: [
    { key: "brand", label: "브랜드", type: "text", placeholder: "스타벅스", span: "half" },
    { key: "coupon_value", label: "쿠폰 금액 (원)", type: "number", span: "half" },
    { key: "expiry_days", label: "유효기간 (일)", type: "number", placeholder: "90", span: "half" },
  ],
};

export function getMetaSchema(
  categoryFieldSchema: MetaField[] | null | undefined,
  deliveryType: string
): MetaField[] {
  if (categoryFieldSchema && categoryFieldSchema.length > 0) return categoryFieldSchema;
  return DELIVERY_META_SCHEMAS[deliveryType] ?? [];
}
