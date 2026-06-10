"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Pencil, Trash2, Plus, X } from "lucide-react";
import { useAdminLecturePromotions, LecturePromotion, PromotionInput } from "@/hooks/useAdminLecturePromotions";
import { AdminTable } from "@/components/admin/organisms";
import { ToggleButton, IconActionButton } from "@/components/admin/molecules";

// datetime-local 입력값 ↔ ISO 변환
function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function fromDatetimeLocal(local: string): string {
  return new Date(local).toISOString();
}

function formatDateRange(start: string, end: string): string {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  return `${fmt(start)} ~ ${fmt(end)}`;
}

const EMPTY_FORM: PromotionInput = {
  name: "",
  price: 0,
  start_at: "",
  end_at: "",
  is_active: true,
};

const COLUMNS = [
  { label: "프로모션명" },
  { label: "기간" },
  { label: "가격", className: "text-right" },
  { label: "활성", className: "text-center" },
  { label: "관리", className: "text-center" },
];
const GRID = "180px 1fr 120px 90px 100px";

export default function AdminLecturePromotionsPage() {
  const params = useParams();
  const lectureId = params.id as string;

  const {
    promotions,
    loading,
    pendingId,
    fetchPromotions,
    createPromotion,
    updatePromotion,
    deletePromotion,
    toggleActive,
  } = useAdminLecturePromotions(lectureId);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PromotionInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => { fetchPromotions(); }, [fetchPromotions]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (p: LecturePromotion) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      price: p.price,
      start_at: toDatetimeLocal(p.start_at),
      end_at: toDatetimeLocal(p.end_at),
      is_active: p.is_active,
    });
    setFormError("");
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError("프로모션 이름을 입력하세요."); return; }
    if (form.price <= 0) { setFormError("가격은 1원 이상이어야 합니다."); return; }
    if (!form.start_at || !form.end_at) { setFormError("기간을 입력하세요."); return; }
    if (new Date(form.start_at) >= new Date(form.end_at)) {
      setFormError("종료 시각이 시작 시각보다 늦어야 합니다.");
      return;
    }

    setSaving(true);
    setFormError("");

    const payload: PromotionInput = {
      ...form,
      start_at: fromDatetimeLocal(form.start_at),
      end_at: fromDatetimeLocal(form.end_at),
    };

    const result = editingId
      ? await updatePromotion(editingId, payload)
      : await createPromotion(payload);

    setSaving(false);

    if (!result.ok) {
      setFormError(result.error ?? "저장 중 오류가 발생했습니다.");
      return;
    }
    closeForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("프로모션을 삭제하시겠습니까?")) return;
    setDeletingId(id);
    const ok = await deletePromotion(id);
    if (!ok) alert("삭제 중 오류가 발생했습니다.");
    setDeletingId(null);
  };

  return (
    <div className="p-8 max-w-5xl">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold" style={{ color: "#141413" }}>프로모션 관리</h2>
          <p className="text-sm mt-0.5" style={{ color: "#8e8b82" }}>
            기간 한정 할인가를 설정합니다. 날짜가 겹치면 가격이 높은 프로모션이 노출됩니다.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          style={{ background: "#cc785c", color: "#fff" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#a9583e")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#cc785c")}
        >
          <Plus className="w-4 h-4" />
          프로모션 추가
        </button>
      </div>

      {/* 인라인 폼 */}
      {formOpen && (
        <div
          className="mb-6 rounded-xl border p-6"
          style={{ background: "#fff", borderColor: "#e6dfd8" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base" style={{ color: "#141413" }}>
              {editingId ? "프로모션 수정" : "새 프로모션"}
            </h3>
            <button onClick={closeForm} className="p-1 rounded hover:bg-[#efe9de] transition-colors">
              <X className="w-4 h-4" style={{ color: "#8e8b82" }} />
            </button>
          </div>

          <form onSubmit={handleSave} className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              {/* 이름 */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold" style={{ color: "#6c6a64" }}>
                  프로모션 이름 <span style={{ color: "#c64545" }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="슈퍼얼리버드, 얼리버드 등"
                  className="px-3 py-2 rounded-lg border text-sm outline-none transition-colors"
                  style={{ borderColor: "#e6dfd8", background: "#faf9f5", color: "#141413" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#cc785c")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#e6dfd8")}
                />
              </div>

              {/* 가격 */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold" style={{ color: "#6c6a64" }}>
                  할인 가격 (원) <span style={{ color: "#c64545" }}>*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.price || ""}
                  onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                  placeholder="0"
                  className="px-3 py-2 rounded-lg border text-sm outline-none transition-colors"
                  style={{ borderColor: "#e6dfd8", background: "#faf9f5", color: "#141413" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#cc785c")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#e6dfd8")}
                />
              </div>

              {/* 시작일 */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold" style={{ color: "#6c6a64" }}>
                  시작 일시 <span style={{ color: "#c64545" }}>*</span>
                </label>
                <input
                  type="datetime-local"
                  value={form.start_at}
                  onChange={(e) => setForm((f) => ({ ...f, start_at: e.target.value }))}
                  className="px-3 py-2 rounded-lg border text-sm outline-none transition-colors"
                  style={{ borderColor: "#e6dfd8", background: "#faf9f5", color: "#141413" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#cc785c")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#e6dfd8")}
                />
              </div>

              {/* 종료일 */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold" style={{ color: "#6c6a64" }}>
                  종료 일시 <span style={{ color: "#c64545" }}>*</span>
                </label>
                <input
                  type="datetime-local"
                  value={form.end_at}
                  onChange={(e) => setForm((f) => ({ ...f, end_at: e.target.value }))}
                  className="px-3 py-2 rounded-lg border text-sm outline-none transition-colors"
                  style={{ borderColor: "#e6dfd8", background: "#faf9f5", color: "#141413" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#cc785c")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#e6dfd8")}
                />
              </div>
            </div>

            {/* 활성 여부 */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold" style={{ color: "#6c6a64" }}>활성 여부</span>
              <ToggleButton
                active={form.is_active}
                pending={false}
                activeLabel="활성"
                inactiveLabel="비활성"
                activeColor="#5db872"
                onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
                pill
              />
            </div>

            {formError && (
              <p className="text-sm" style={{ color: "#c64545" }}>{formError}</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={closeForm}
                className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
                style={{ borderColor: "#e6dfd8", color: "#6c6a64" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#efe9de")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
              >
                취소
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                style={{ background: "#cc785c", color: "#fff" }}
                onMouseEnter={(e) => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = "#a9583e"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#cc785c"; }}
              >
                {saving ? "저장 중…" : editingId ? "수정 완료" : "추가"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 테이블 */}
      <AdminTable
        columns={COLUMNS}
        gridTemplateColumns={GRID}
        loading={loading}
        isEmpty={promotions.length === 0}
        emptyMessage="등록된 프로모션이 없습니다."
      >
        {promotions.map((p) => {
          const now = new Date();
          const isOngoing = p.is_active && new Date(p.start_at) <= now && new Date(p.end_at) >= now;
          return (
            <div
              key={p.id}
              className="grid items-center px-5 py-3.5 border-b last:border-b-0 hover:bg-[#efe9de]/30 transition-colors"
              style={{ gridTemplateColumns: GRID, borderColor: "#e6dfd8" }}
            >
              {/* 이름 */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate" style={{ color: "#141413" }}>
                  {p.name}
                </span>
                {isOngoing && (
                  <span
                    className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold"
                    style={{ background: "#5db872", color: "#fff" }}
                  >
                    진행중
                  </span>
                )}
              </div>

              {/* 기간 */}
              <div className="text-xs truncate" style={{ color: "#6c6a64" }}>
                {formatDateRange(p.start_at, p.end_at)}
              </div>

              {/* 가격 */}
              <div className="text-sm font-semibold text-right pr-4" style={{ color: "#141413" }}>
                {p.price.toLocaleString()}원
              </div>

              {/* 활성 토글 */}
              <div className="flex justify-center">
                <ToggleButton
                  active={p.is_active}
                  pending={pendingId === p.id}
                  activeLabel="활성"
                  inactiveLabel="비활성"
                  activeColor="#5db872"
                  onClick={() => toggleActive(p.id, p.is_active)}
                  pill
                />
              </div>

              {/* 관리 */}
              <div className="flex items-center justify-center gap-1">
                <IconActionButton
                  icon={<Pencil className="w-4 h-4" />}
                  loading={false}
                  variant="default"
                  onClick={() => openEdit(p)}
                />
                <IconActionButton
                  icon={<Trash2 className="w-4 h-4" />}
                  loading={deletingId === p.id}
                  variant="danger"
                  onClick={() => handleDelete(p.id)}
                />
              </div>
            </div>
          );
        })}
      </AdminTable>
    </div>
  );
}
