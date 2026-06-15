"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { AdminPageHeader } from "@/components/admin/organisms";
import { IconActionButton } from "@/components/admin/molecules";
import { Spinner } from "@/components/admin/atoms";
import {
  ProductFormData,
  EMPTY_FORM,
  useAdminProductDetail,
} from "@/hooks/useAdminProductDetail";
import { ProductCategory } from "@/hooks/useAdminProducts";

const DELIVERY_OPTIONS = [
  { value: "physical", label: "배송 (physical)" },
  { value: "digital_download", label: "다운로드 (digital_download)" },
  { value: "gifticon", label: "기프티콘 (gifticon)" },
  { value: "coupon", label: "쿠폰 (coupon)" },
];

const EVENT_LABEL_OPTIONS = [
  { value: "", label: "없음" },
  { value: "HOT", label: "HOT" },
  { value: "SALE", label: "SALE" },
  { value: "NEW", label: "NEW" },
  { value: "LIMITED", label: "LIMITED" },
];

interface ProductFormProps {
  mode: "create" | "edit";
  productId?: number;
  initialData?: ProductFormData;
  categories: ProductCategory[];
}

interface FieldError {
  [key: string]: string;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-base font-semibold mb-4 pb-2 border-b"
      style={{ color: "#252523", borderColor: "#e6dfd8" }}
    >
      {children}
    </h2>
  );
}

function FieldRow({ label, required, children, error }: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-1.5" style={{ color: "#252523" }}>
        {label}
        {required && <span className="ml-0.5" style={{ color: "#c64545" }}>*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs mt-1" style={{ color: "#c64545" }}>{error}</p>
      )}
    </div>
  );
}

const inputClass = "w-full px-3 py-2 text-sm rounded-lg border outline-none transition-colors";
const inputStyle = {
  background: "#fff",
  borderColor: "#e6dfd8",
  color: "#141413",
};

export default function ProductForm({ mode, productId, initialData, categories }: ProductFormProps) {
  const router = useRouter();
  const { createProduct, updateProduct, deleteProduct, saving, error: hookError } = useAdminProductDetail();

  const [form, setForm] = useState<ProductFormData>(initialData ?? EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldError>({});
  const [typeMetaText, setTypeMetaText] = useState(() =>
    initialData && Object.keys(initialData.type_meta).length > 0
      ? JSON.stringify(initialData.type_meta, null, 2)
      : ""
  );

  const set = <K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const validate = (): boolean => {
    const errors: FieldError = {};
    if (!form.title.trim()) errors.title = "상품명을 입력하세요.";
    if (form.category_id === "") errors.category_id = "카테고리를 선택하세요.";
    if (!form.delivery_type) errors.delivery_type = "배송 타입을 선택하세요.";
    if (form.price === "" || Number(form.price) < 0) errors.price = "판매가를 입력하세요.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const parseTypeMeta = (): Record<string, unknown> => {
    if (!typeMetaText.trim()) return {};
    try {
      return JSON.parse(typeMetaText) as Record<string, unknown>;
    } catch {
      return {};
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload: ProductFormData = { ...form, type_meta: parseTypeMeta() };

    if (mode === "create") {
      const result = await createProduct(payload);
      if (result) router.push("/admin/shop/products");
    } else if (productId !== undefined) {
      const ok = await updateProduct(productId, payload);
      if (ok) router.push("/admin/shop/products");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("이 상품을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
    if (productId === undefined) return;
    const ok = await deleteProduct(productId);
    if (ok) router.push("/admin/shop/products");
  };

  const addImage = () =>
    set("images", [...form.images, { url: "", order: form.images.length + 1, alt: "" }]);

  const removeImage = (idx: number) =>
    set(
      "images",
      form.images
        .filter((_, i) => i !== idx)
        .map((img, i) => ({ ...img, order: i + 1 }))
    );

  const updateImage = (idx: number, field: "url" | "alt", value: string) =>
    set(
      "images",
      form.images.map((img, i) => (i === idx ? { ...img, [field]: value } : img))
    );

  return (
    <div className="p-8 max-w-4xl">
      <AdminPageHeader
        title={mode === "create" ? "상품 등록" : "상품 수정"}
        description={
          mode === "create"
            ? "새 상품을 등록합니다."
            : "상품 정보를 수정합니다."
        }
      />

      {hookError && (
        <div
          className="mb-6 px-4 py-3 rounded-lg text-sm"
          style={{ background: "#fdecea", color: "#c64545", border: "1px solid #f5c2c2" }}
        >
          {hookError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* 기본 정보 */}
        <section
          className="mb-8 p-6 rounded-xl"
          style={{ background: "#fff", border: "1px solid #e6dfd8" }}
        >
          <SectionTitle>기본 정보</SectionTitle>

          <FieldRow label="상품명" required error={fieldErrors.title}>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="상품명을 입력하세요"
              className={clsx(inputClass, fieldErrors.title && "border-red-400")}
              style={inputStyle}
            />
          </FieldRow>

          <FieldRow label="부제목">
            <input
              type="text"
              value={form.subtitle}
              onChange={(e) => set("subtitle", e.target.value)}
              placeholder="부제목 (선택)"
              className={inputClass}
              style={inputStyle}
            />
          </FieldRow>

          <FieldRow label="간단 설명">
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="상품을 간단히 설명하세요"
              rows={3}
              className={inputClass}
              style={inputStyle}
            />
          </FieldRow>

          <div className="grid grid-cols-2 gap-4">
            <FieldRow label="카테고리" required error={fieldErrors.category_id}>
              <select
                value={form.category_id}
                onChange={(e) =>
                  set("category_id", e.target.value === "" ? "" : Number(e.target.value))
                }
                className={clsx(inputClass, fieldErrors.category_id && "border-red-400")}
                style={inputStyle}
              >
                <option value="">카테고리 선택</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </FieldRow>

            <FieldRow label="배송 타입" required error={fieldErrors.delivery_type}>
              <select
                value={form.delivery_type}
                onChange={(e) => set("delivery_type", e.target.value)}
                className={inputClass}
                style={inputStyle}
              >
                {DELIVERY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </FieldRow>
          </div>
        </section>

        {/* 가격/재고 */}
        <section
          className="mb-8 p-6 rounded-xl"
          style={{ background: "#fff", border: "1px solid #e6dfd8" }}
        >
          <SectionTitle>가격 / 재고</SectionTitle>

          <div className="grid grid-cols-2 gap-4">
            <FieldRow label="판매가 (원)" required error={fieldErrors.price}>
              <input
                type="number"
                value={form.price}
                onChange={(e) =>
                  set("price", e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="0"
                min={0}
                className={clsx(inputClass, fieldErrors.price && "border-red-400")}
                style={inputStyle}
              />
            </FieldRow>

            <FieldRow label="원가 (원)">
              <input
                type="number"
                value={form.original_price}
                onChange={(e) =>
                  set("original_price", e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="취소선 가격 (선택)"
                min={0}
                className={inputClass}
                style={inputStyle}
              />
            </FieldRow>

            <FieldRow label="이벤트 라벨">
              <select
                value={form.event_label}
                onChange={(e) => set("event_label", e.target.value)}
                className={inputClass}
                style={inputStyle}
              >
                {EVENT_LABEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </FieldRow>

            <FieldRow label="이벤트 종료일">
              <input
                type="date"
                value={form.event_end_date}
                onChange={(e) => set("event_end_date", e.target.value)}
                className={inputClass}
                style={inputStyle}
              />
            </FieldRow>

            <FieldRow label="재고">
              <input
                type="number"
                value={form.stock}
                onChange={(e) =>
                  set("stock", e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="-1 = 무제한"
                className={inputClass}
                style={inputStyle}
              />
              <p className="text-xs mt-1" style={{ color: "#8e8b82" }}>
                -1 입력 시 재고 제한 없음
              </p>
            </FieldRow>
          </div>
        </section>

        {/* 전시 설정 */}
        <section
          className="mb-8 p-6 rounded-xl"
          style={{ background: "#fff", border: "1px solid #e6dfd8" }}
        >
          <SectionTitle>전시 설정</SectionTitle>

          <div className="grid grid-cols-3 gap-4">
            <FieldRow label="공개 여부">
              <div className="flex items-center gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => set("is_active", !form.is_active)}
                  className="relative w-11 h-6 rounded-full transition-colors"
                  style={{ background: form.is_active ? "#5db872" : "#d1cfc8" }}
                >
                  <span
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                    style={{ transform: form.is_active ? "translateX(22px)" : "translateX(2px)" }}
                  />
                </button>
                <span className="text-sm" style={{ color: form.is_active ? "#5db872" : "#8e8b82" }}>
                  {form.is_active ? "공개" : "비공개"}
                </span>
              </div>
            </FieldRow>

            <FieldRow label="BEST 표시">
              <div className="flex items-center gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => set("is_best", !form.is_best)}
                  className="relative w-11 h-6 rounded-full transition-colors"
                  style={{ background: form.is_best ? "#e8a55a" : "#d1cfc8" }}
                >
                  <span
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                    style={{ transform: form.is_best ? "translateX(22px)" : "translateX(2px)" }}
                  />
                </button>
                <span className="text-sm" style={{ color: form.is_best ? "#e8a55a" : "#8e8b82" }}>
                  {form.is_best ? "★ BEST" : "일반"}
                </span>
              </div>
            </FieldRow>

            <FieldRow label="전시 순서">
              <input
                type="number"
                value={form.display_order}
                onChange={(e) =>
                  set("display_order", e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="0"
                min={0}
                className={inputClass}
                style={inputStyle}
              />
            </FieldRow>
          </div>
        </section>

        {/* 이미지 */}
        <section
          className="mb-8 p-6 rounded-xl"
          style={{ background: "#fff", border: "1px solid #e6dfd8" }}
        >
          <SectionTitle>이미지</SectionTitle>

          <FieldRow label="썸네일 URL">
            <input
              type="text"
              value={form.thumbnail_url}
              onChange={(e) => set("thumbnail_url", e.target.value)}
              placeholder="https://..."
              className={inputClass}
              style={inputStyle}
            />
          </FieldRow>

          <div className="mb-2">
            <p className="text-sm font-medium mb-3" style={{ color: "#252523" }}>
              상세 이미지 목록
            </p>
            {form.images.length === 0 && (
              <p className="text-sm mb-3" style={{ color: "#8e8b82" }}>
                등록된 상세 이미지가 없습니다.
              </p>
            )}
            <div className="space-y-3">
              {form.images.map((img, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-lg"
                  style={{ background: "#faf9f5", border: "1px solid #e6dfd8" }}
                >
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={img.url}
                      onChange={(e) => updateImage(idx, "url", e.target.value)}
                      placeholder="이미지 URL"
                      className={inputClass}
                      style={inputStyle}
                    />
                    <input
                      type="text"
                      value={img.alt}
                      onChange={(e) => updateImage(idx, "alt", e.target.value)}
                      placeholder="alt 텍스트 (선택)"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                  <IconActionButton
                    icon={<Trash2 className="w-4 h-4" />}
                    variant="danger"
                    onClick={() => removeImage(idx)}
                    title="이미지 삭제"
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addImage}
              className="mt-3 flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors"
              style={{ color: "#cc785c", border: "1px dashed #cc785c", background: "transparent" }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background = "#fdf5f2")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background = "transparent")
              }
            >
              <Plus className="w-4 h-4" />
              이미지 추가
            </button>
          </div>
        </section>

        {/* 상세 정보 */}
        <section
          className="mb-8 p-6 rounded-xl"
          style={{ background: "#fff", border: "1px solid #e6dfd8" }}
        >
          <SectionTitle>상세 정보</SectionTitle>

          <FieldRow label="상세 설명 (HTML 지원)">
            <textarea
              value={form.detailed_description}
              onChange={(e) => set("detailed_description", e.target.value)}
              placeholder="상세 설명을 입력하세요. HTML 태그 사용 가능."
              rows={8}
              className={inputClass}
              style={{ ...inputStyle, fontFamily: "monospace", fontSize: "13px" }}
            />
          </FieldRow>

          <FieldRow label="타입별 속성 (JSON)">
            <textarea
              value={typeMetaText}
              onChange={(e) => setTypeMetaText(e.target.value)}
              placeholder={'{\n  "key": "value"\n}'}
              rows={5}
              className={inputClass}
              style={{ ...inputStyle, fontFamily: "monospace", fontSize: "13px" }}
            />
            <p className="text-xs mt-1" style={{ color: "#8e8b82" }}>
              유효한 JSON 형식으로 입력하세요.
            </p>
          </FieldRow>

          <FieldRow label="비고 / 주의사항">
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="배송 안내, 환불 정책 등 추가 안내사항"
              rows={4}
              className={inputClass}
              style={inputStyle}
            />
          </FieldRow>
        </section>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/admin/shop/products")}
            className="px-5 py-2.5 text-sm rounded-lg transition-colors"
            style={{ background: "#efe9de", color: "#6c6a64" }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.background = "#e2d9cc")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.background = "#efe9de")
            }
          >
            취소 (목록으로)
          </button>

          <div className="flex items-center gap-3">
            {mode === "edit" && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="px-5 py-2.5 text-sm rounded-lg transition-colors"
                style={{ background: "#c64545", color: "#fff" }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background = "#a83636")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background = "#c64545")
                }
              >
                삭제
              </button>
            )}

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg transition-colors"
              style={{ background: "#cc785c", color: "#fff" }}
              onMouseEnter={(e) => {
                if (!saving)
                  (e.currentTarget as HTMLButtonElement).style.background = "#a9583e";
              }}
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background = "#cc785c")
              }
            >
              {saving && <Spinner size="xs" color="#fff" />}
              저장
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
