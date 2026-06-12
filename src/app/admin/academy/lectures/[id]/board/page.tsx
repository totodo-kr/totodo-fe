"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Pencil, Trash2, Plus, X, Eye, EyeOff } from "lucide-react";
import { useAdminLectureBoard, BoardPostInput } from "@/hooks/useAdminLectureBoard";
import { AdminTable } from "@/components/admin/organisms";
import { SearchBar, ResultCount, Pagination, FilterTabs, IconActionButton, ToggleButton } from "@/components/admin/molecules";
import { Badge } from "@/components/admin/atoms";

const PAGE_SIZE = 15;

const CATEGORY_OPTIONS = [
  { code: "notice",   label: "공지" },
  { code: "question", label: "질문" },
  { code: "general",  label: "일반" },
  { code: "column",   label: "칼럼" },
];

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  notice:   { bg: "#fde8d8", color: "#cc785c" },
  question: { bg: "#dbeafe", color: "#2563eb" },
  general:  { bg: "#e5e7eb", color: "#374151" },
  column:   { bg: "#d1fae5", color: "#065f46" },
};

const FILTER_TABS = [
  { value: "" as string, label: "전체" },
  ...CATEGORY_OPTIONS.map((c) => ({ value: c.code, label: c.label })),
];

const COLUMNS = [
  { label: "카테고리", className: "text-center" },
  { label: "제목" },
  { label: "작성자", className: "text-center" },
  { label: "등록일", className: "text-center" },
  { label: "공개", className: "text-center" },
  { label: "관리", className: "text-center" },
];
const GRID = "90px 1fr 110px 90px 70px 100px";

const EMPTY_FORM: BoardPostInput = {
  title: "",
  content: "",
  category: "general",
  is_published: true,
};

function formatDate(s: string | null) {
  if (!s) return "-";
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function getAuthorName(profiles: { display_name: string | null; name: string | null } | null) {
  return profiles?.display_name || profiles?.name || "탈퇴한 유저";
}

export default function AdminLectureBoardPage() {
  const params = useParams();
  const lectureId = params.id as string;

  const { posts, total, loading, pendingId, fetchPosts, createPost, updatePost, deletePost, togglePublish } =
    useAdminLectureBoard(lectureId);

  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<BoardPostInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const load = useCallback(
    (p: number, kw: string, cat: string) => fetchPosts(p, kw, cat),
    [fetchPosts]
  );

  useEffect(() => {
    load(1, "", "");
  }, [load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load(1, keyword, activeCategory);
  };

  const handleCategoryFilter = (cat: string) => {
    setActiveCategory(cat);
    setPage(1);
    load(1, keyword, cat);
  };

  const handlePage = (p: number) => {
    setPage(p);
    load(p, keyword, activeCategory);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (post: (typeof posts)[0]) => {
    setEditingId(post.id);
    setForm({
      title: post.title,
      content: post.content ?? "",
      category: post.category,
      is_published: post.is_published,
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
    if (!form.title.trim()) { setFormError("제목을 입력하세요."); return; }
    if (!form.content.trim()) { setFormError("내용을 입력하세요."); return; }

    setSaving(true);
    setFormError("");

    const result = editingId
      ? await updatePost(editingId, form)
      : await createPost(form);

    setSaving(false);

    if (!result.ok) {
      setFormError(result.error ?? "저장 중 오류가 발생했습니다.");
      return;
    }
    closeForm();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("게시글을 삭제하시겠습니까?")) return;
    setDeletingId(id);
    const ok = await deletePost(id);
    if (!ok) alert("삭제 중 오류가 발생했습니다.");
    setDeletingId(null);
  };

  return (
    <div className="p-8 max-w-6xl">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold" style={{ color: "#141413" }}>게시판 관리</h2>
          <p className="text-sm mt-0.5" style={{ color: "#8e8b82" }}>
            카테고리별 게시글을 작성하고 관리합니다.
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
          글쓰기
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
              {editingId ? "게시글 수정" : "새 게시글"}
            </h3>
            <button onClick={closeForm} className="p-1 rounded hover:bg-[#efe9de] transition-colors">
              <X className="w-4 h-4" style={{ color: "#8e8b82" }} />
            </button>
          </div>

          <form onSubmit={handleSave} className="flex flex-col gap-4">
            {/* 카테고리 + 공개 여부 */}
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold shrink-0" style={{ color: "#6c6a64" }}>
                  카테고리 <span style={{ color: "#c64545" }}>*</span>
                </label>
                <div className="flex gap-2">
                  {CATEGORY_OPTIONS.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, category: c.code }))}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                      style={
                        form.category === c.code
                          ? { background: "#cc785c", color: "#fff", borderColor: "#cc785c" }
                          : { background: "#faf9f5", color: "#6c6a64", borderColor: "#e6dfd8" }
                      }
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold" style={{ color: "#6c6a64" }}>공개 여부</span>
                <ToggleButton
                  active={form.is_published}
                  pending={false}
                  activeLabel="공개"
                  inactiveLabel="비공개"
                  activeColor="#5db872"
                  onClick={() => setForm((f) => ({ ...f, is_published: !f.is_published }))}
                  pill
                />
              </div>
            </div>

            {/* 제목 */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold" style={{ color: "#6c6a64" }}>
                제목 <span style={{ color: "#c64545" }}>*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="제목을 입력하세요"
                className="px-3 py-2 rounded-lg border text-sm outline-none transition-colors"
                style={{ borderColor: "#e6dfd8", background: "#faf9f5", color: "#141413" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#cc785c")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#e6dfd8")}
              />
            </div>

            {/* 내용 */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold" style={{ color: "#6c6a64" }}>
                내용 <span style={{ color: "#c64545" }}>*</span>
              </label>
              <textarea
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="내용을 입력하세요"
                rows={8}
                className="px-3 py-2 rounded-lg border text-sm outline-none transition-colors resize-y"
                style={{ borderColor: "#e6dfd8", background: "#faf9f5", color: "#141413" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#cc785c")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#e6dfd8")}
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
                {saving ? "저장 중…" : editingId ? "수정 완료" : "등록"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 검색 + 결과 수 */}
      <div className="flex items-center justify-between mb-3 gap-4 flex-wrap">
        <SearchBar
          value={keyword}
          onChange={setKeyword}
          onSubmit={handleSearch}
          placeholder="제목으로 검색..."
        />
        <ResultCount total={total} unit="개" />
      </div>

      {/* 카테고리 필터 탭 */}
      <FilterTabs
        tabs={FILTER_TABS}
        active={activeCategory}
        onChange={handleCategoryFilter}
        className="mb-3"
      />

      {/* 테이블 */}
      <AdminTable
        columns={COLUMNS}
        gridTemplateColumns={GRID}
        loading={loading}
        isEmpty={posts.length === 0}
        emptyMessage="게시글이 없습니다."
      >
        {posts.map((post) => {
          const catColor = CATEGORY_COLORS[post.category] ?? CATEGORY_COLORS.general;
          return (
            <div
              key={post.id}
              className="grid items-center px-5 py-3.5 border-b last:border-b-0 hover:bg-[#efe9de]/30 transition-colors"
              style={{ gridTemplateColumns: GRID, borderColor: "#e6dfd8" }}
            >
              {/* 카테고리 */}
              <div className="flex justify-center">
                <Badge bg={catColor.bg} color={catColor.color}>
                  {CATEGORY_OPTIONS.find((c) => c.code === post.category)?.label ?? post.category}
                </Badge>
              </div>

              {/* 제목 */}
              <div
                className={`text-sm font-medium truncate pr-4 ${!post.is_published ? "opacity-50" : ""}`}
                style={{ color: "#141413" }}
                title={post.title}
              >
                {post.title}
              </div>

              {/* 작성자 */}
              <div className="text-center text-sm truncate" style={{ color: "#252523" }}>
                {getAuthorName(post.profiles)}
              </div>

              {/* 등록일 */}
              <div className="text-center text-xs" style={{ color: "#8e8b82" }}>
                {formatDate(post.created_at)}
              </div>

              {/* 공개 토글 */}
              <div className="flex justify-center">
                <ToggleButton
                  active={post.is_published}
                  pending={pendingId === post.id}
                  activeLabel="공개"
                  inactiveLabel="비공개"
                  activeColor="#5db872"
                  onClick={() => togglePublish(post.id, post.is_published)}
                  pill
                />
              </div>

              {/* 관리 */}
              <div className="flex items-center justify-center gap-1">
                <IconActionButton
                  icon={<Pencil className="w-4 h-4" />}
                  loading={false}
                  variant="default"
                  onClick={() => openEdit(post)}
                />
                <IconActionButton
                  icon={<Trash2 className="w-4 h-4" />}
                  loading={deletingId === post.id}
                  variant="danger"
                  onClick={() => handleDelete(post.id)}
                />
              </div>
            </div>
          );
        })}
      </AdminTable>

      <Pagination page={page} totalPages={totalPages} loading={loading} onChange={handlePage} />
    </div>
  );
}
