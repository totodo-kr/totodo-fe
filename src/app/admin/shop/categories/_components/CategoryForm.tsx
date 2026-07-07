"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, ChevronUp, ChevronDown, Truck } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/organisms";
import { Spinner } from "@/components/admin/atoms";
import { MetaField, MetaFieldType, SHIPPING_FEE } from "@/config/productMetaSchemas";
import {
  useAdminProductCategories,
  AdminProductCategory,
} from "@/hooks/useAdminProductCategories";

interface CategoryFormProps {
  mode: "create" | "edit";
  categoryId?: number;
  initialData?: AdminProductCategory;
}

interface FieldRowState {
  uid: number;
  key: string;
  label: string;
  type: MetaFieldType;
  placeholder: string;
  optionsText: string;
  span: "half" | "full";
}

const TYPE_OPTIONS: { value: MetaFieldType; label: string }[] = [
  { value: "text", label: "텍스트" },
  { value: "number", label: "숫자" },
  { value: "select", label: "선택(드롭다운)" },
  { value: "textarea", label: "여러 줄 텍스트" },
  { value: "richtext", label: "리치 텍스트" },
  { value: "date", label: "날짜" },
];

let uidSeq = 0;
const nextUid = () => uidSeq++;

function toRowState(field: MetaField): FieldRowState {
  return {
    uid: nextUid(),
    key: field.key,
    label: field.label,
    type: field.type,
    placeholder: field.placeholder ?? "",
    optionsText: field.options?.join(", ") ?? "",
    span: field.span ?? "half",
  };
}

function toMetaField(row: FieldRowState): MetaField {
  const field: MetaField = {
    key: row.key.trim(),
    label: row.label.trim(),
    type: row.type,
    span: row.span,
  };
  if (row.placeholder.trim()) field.placeholder = row.placeholder.trim();
  if (row.type === "select") {
    field.options = row.optionsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return field;
}

const inputClass = "w-full px-3 py-2 text-sm rounded-lg border outline-none transition-colors";
const inputStyle = { background: "#fff", borderColor: "#e6dfd8", color: "#141413" };

export default function CategoryForm({ mode, categoryId, initialData }: CategoryFormProps) {
  const router = useRouter();
  const { createCategory, updateCategory } = useAdminProductCategories();

  const [name, setName] = useState(initialData?.name ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [rows, setRows] = useState<FieldRowState[]>(
    (initialData?.field_schema ?? []).map(toRowState)
  );
  const [saving, setSaving] = useState(false);

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      { uid: nextUid(), key: "", label: "", type: "text", placeholder: "", optionsText: "", span: "half" },
    ]);

  const addShippingFeeRow = () => setRows((prev) => [...prev, toRowState(SHIPPING_FEE)]);

  const removeRow = (uid: number) => setRows((prev) => prev.filter((r) => r.uid !== uid));

  const moveRow = (uid: number, dir: -1 | 1) =>
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.uid === uid);
      const target = idx + dir;
      if (idx === -1 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });

  const updateRow = (uid: number, updates: Partial<FieldRowState>) =>
    setRows((prev) => prev.map((r) => (r.uid === uid ? { ...r, ...updates } : r)));

  const validate = (): string | null => {
    if (!name.trim()) return "카테고리 이름을 입력하세요.";
    if (!slug.trim()) return "slug를 입력하세요.";
    if (!/^[a-z][a-z0-9_]*$/.test(slug.trim())) return "slug는 영문 소문자로 시작하는 snake_case여야 합니다.";

    const keys = new Set<string>();
    for (const row of rows) {
      if (!row.key.trim() || !row.label.trim()) return "모든 상세 항목의 키와 레이블을 입력하세요.";
      if (!/^[a-z][a-z0-9_]*$/.test(row.key.trim()))
        return `"${row.key}" 키는 영문 소문자로 시작하는 snake_case여야 합니다.`;
      if (keys.has(row.key.trim())) return `상세 항목 키 "${row.key}"가 중복되었습니다.`;
      keys.add(row.key.trim());
      if (row.type === "select" && !row.optionsText.trim())
        return `"${row.label}" 항목은 선택지를 하나 이상 입력해야 합니다.`;
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errorMessage = validate();
    if (errorMessage) {
      toast.error(errorMessage);
      return;
    }

    setSaving(true);
    const field_schema = rows.map(toMetaField);
    const res =
      mode === "create"
        ? await createCategory({ name: name.trim(), slug: slug.trim(), description, field_schema })
        : await updateCategory(categoryId!, { name: name.trim(), description, field_schema });
    setSaving(false);

    if (!res.ok) {
      toast.error(
        res.message?.includes("unique") ? "이미 존재하는 이름 또는 slug입니다." : (res.message ?? "저장 실패")
      );
      return;
    }
    router.push("/admin/shop/categories");
  };

  return (
    <div className="p-8 max-w-4xl pb-16">
      <AdminPageHeader
        title={mode === "create" ? "카테고리 등록" : "카테고리 수정"}
        description="카테고리 정보와 상품 등록 시 표시할 상세 항목을 관리합니다."
      />

      <form id="category-form" onSubmit={handleSubmit}>
        <section className="mb-8 p-6 rounded-xl" style={{ background: "#fff", border: "1px solid #e6dfd8" }}>
          <h2
            className="text-base font-semibold mb-4 pb-2 border-b"
            style={{ color: "#252523", borderColor: "#e6dfd8" }}
          >
            기본 정보
          </h2>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#252523" }}>
              이름 <span style={{ color: "#c64545" }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 도서"
              className={inputClass}
              style={inputStyle}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#252523" }}>
              slug <span style={{ color: "#c64545" }}>*</span>
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="예: books"
              disabled={mode === "edit"}
              className={inputClass}
              style={{ ...inputStyle, opacity: mode === "edit" ? 0.6 : 1 }}
            />
            <p className="text-xs mt-1.5" style={{ color: "#8e8b82" }}>
              URL/코드에서 사용되는 값으로, 등록 후에는 변경할 수 없습니다.
            </p>
          </div>

          <div className="mb-1">
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#252523" }}>
              설명
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="카테고리 설명 (선택)"
              rows={2}
              className={inputClass}
              style={inputStyle}
            />
          </div>
        </section>

        <section className="mb-8 p-6 rounded-xl" style={{ background: "#fff", border: "1px solid #e6dfd8" }}>
          <div className="flex items-center justify-between mb-4 pb-2 border-b" style={{ borderColor: "#e6dfd8" }}>
            <h2 className="text-base font-semibold" style={{ color: "#252523" }}>
              상세 항목
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={addShippingFeeRow}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors"
                style={{ background: "#efe9de", color: "#6c6a64" }}
              >
                <Truck className="w-3.5 h-3.5" />
                배송비 필드 추가
              </button>
              <button
                type="button"
                onClick={addRow}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                style={{ background: "#cc785c", color: "#fff" }}
              >
                <Plus className="w-3.5 h-3.5" />
                항목 추가
              </button>
            </div>
          </div>

          {rows.length === 0 && (
            <p className="text-sm py-6 text-center" style={{ color: "#8e8b82" }}>
              상세 항목이 없습니다. 이 카테고리의 상품은 공통 항목(상세 설명, 비고)만 사용합니다.
            </p>
          )}

          <div className="flex flex-col gap-3">
            {rows.map((row, i) => (
              <div key={row.uid} className="p-4 rounded-lg" style={{ background: "#faf9f5", border: "1px solid #e6dfd8" }}>
                <div className="grid grid-cols-12 gap-2 mb-2">
                  <div className="col-span-3">
                    <label className="block text-xs font-medium mb-1" style={{ color: "#8e8b82" }}>
                      키 (key)
                    </label>
                    <input
                      type="text"
                      value={row.key}
                      onChange={(e) => updateRow(row.uid, { key: e.target.value })}
                      placeholder="author"
                      className={`${inputClass} font-mono text-xs`}
                      style={inputStyle}
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-medium mb-1" style={{ color: "#8e8b82" }}>
                      레이블
                    </label>
                    <input
                      type="text"
                      value={row.label}
                      onChange={(e) => updateRow(row.uid, { label: e.target.value })}
                      placeholder="저자"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium mb-1" style={{ color: "#8e8b82" }}>
                      타입
                    </label>
                    <select
                      value={row.type}
                      onChange={(e) => updateRow(row.uid, { type: e.target.value as MetaFieldType })}
                      className={inputClass}
                      style={inputStyle}
                    >
                      {TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium mb-1" style={{ color: "#8e8b82" }}>
                      너비
                    </label>
                    <select
                      value={row.span}
                      onChange={(e) => updateRow(row.uid, { span: e.target.value as "half" | "full" })}
                      className={inputClass}
                      style={inputStyle}
                    >
                      <option value="half">절반</option>
                      <option value="full">전체</option>
                    </select>
                  </div>
                  <div className="col-span-2 flex items-end justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => moveRow(row.uid, -1)}
                      disabled={i === 0}
                      className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
                      style={{ color: "#8e8b82" }}
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveRow(row.uid, 1)}
                      disabled={i === rows.length - 1}
                      className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
                      style={{ color: "#8e8b82" }}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRow(row.uid)}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: "#c64545" }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-2">
                  <div className={row.type === "select" ? "col-span-6" : "col-span-12"}>
                    <label className="block text-xs font-medium mb-1" style={{ color: "#8e8b82" }}>
                      placeholder
                    </label>
                    <input
                      type="text"
                      value={row.placeholder}
                      onChange={(e) => updateRow(row.uid, { placeholder: e.target.value })}
                      placeholder="입력 예시"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                  {row.type === "select" && (
                    <div className="col-span-6">
                      <label className="block text-xs font-medium mb-1" style={{ color: "#8e8b82" }}>
                        선택지 (콤마로 구분)
                      </label>
                      <input
                        type="text"
                        value={row.optionsText}
                        onChange={(e) => updateRow(row.uid, { optionsText: e.target.value })}
                        placeholder="종이책, 전자책, 오디오북"
                        className={inputClass}
                        style={inputStyle}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </form>

      <div
        className="fixed bottom-0 right-0 flex items-center justify-end gap-3 px-8 py-4 border-t"
        style={{ left: "var(--admin-sidebar-w, 15rem)", background: "#faf9f5", borderColor: "#e6dfd8" }}
      >
        <button
          type="button"
          onClick={() => router.push("/admin/shop/categories")}
          className="px-5 py-2.5 text-sm rounded-lg transition-colors"
          style={{ background: "#efe9de", color: "#6c6a64" }}
        >
          취소 (목록으로)
        </button>
        <button
          type="submit"
          form="category-form"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg transition-colors"
          style={{ background: "#cc785c", color: "#fff" }}
        >
          {saving && <Spinner size="xs" color="#fff" />}
          저장
        </button>
      </div>
    </div>
  );
}
