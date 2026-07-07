"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Trash2, Lock, ChevronLeft, MessageSquare } from "lucide-react";
import { useAdminProductQna, type AdminProductQnaFilter } from "@/hooks/useAdminProductQna";
import { AdminTable } from "@/components/admin/organisms";
import { SearchBar, ResultCount, Pagination, IconActionButton, FilterTabs } from "@/components/admin/molecules";

const PAGE_SIZE = 15;

function formatDate(s: string) {
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function getAuthorName(profiles: { display_name: string | null; name: string | null } | null) {
  return profiles?.display_name || profiles?.name || "탈퇴한 유저";
}

const FILTER_TABS: { label: string; value: AdminProductQnaFilter }[] = [
  { label: "전체", value: "all" },
  { label: "답변대기", value: "pending" },
  { label: "답변완료", value: "answered" },
];

const COLUMNS = [
  { label: "작성자", className: "text-center" },
  { label: "제목" },
  { label: "비밀글", className: "text-center" },
  { label: "등록일", className: "text-center" },
  { label: "상태", className: "text-center" },
  { label: "관리", className: "text-center" },
];

const GRID = "90px 1fr 60px 90px 80px 90px";

export default function AdminProductQnaPage() {
  const params = useParams();
  const productId = params.id as string;

  const { qna, total, loading, pendingId, fetchQna, answerQna, deleteQna } = useAdminProductQna(productId);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [filter, setFilter] = useState<AdminProductQnaFilter>("all");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [answerDraft, setAnswerDraft] = useState("");
  const [answerSubmitting, setAnswerSubmitting] = useState(false);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const load = useCallback(
    (p: number, kw: string, f: AdminProductQnaFilter) => fetchQna(p, kw, f),
    [fetchQna]
  );

  useEffect(() => {
    load(1, "", "all");
  }, [load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load(1, keyword, filter);
  };

  const handleFilterChange = (f: AdminProductQnaFilter) => {
    setFilter(f);
    setPage(1);
    setExpandedId(null);
    load(1, keyword, f);
  };

  const handlePage = (p: number) => {
    setPage(p);
    setExpandedId(null);
    load(p, keyword, filter);
  };

  const handleToggleExpand = (id: number, currentAnswer: string | null) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    setAnswerDraft(currentAnswer ?? "");
  };

  const handleSubmitAnswer = async (id: number) => {
    if (!answerDraft.trim()) {
      alert("답변 내용을 입력해주세요.");
      return;
    }
    setAnswerSubmitting(true);
    const ok = await answerQna(id, answerDraft);
    setAnswerSubmitting(false);
    if (ok) {
      setExpandedId(null);
    } else {
      alert("답변 등록 중 오류가 발생했습니다.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("문의를 삭제하시겠습니까?")) return;
    setDeletingId(id);
    const ok = await deleteQna(id);
    if (!ok) alert("삭제 중 오류가 발생했습니다.");
    setDeletingId(null);
  };

  return (
    <div className="p-8 max-w-6xl">
      <Link
        href={`/admin/shop/products/${productId}/edit`}
        className="inline-flex items-center gap-1 text-sm font-medium mb-4 transition-colors"
        style={{ color: "#8e8b82" }}
      >
        <ChevronLeft className="w-4 h-4" />
        상품 수정으로
      </Link>

      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold" style={{ color: "#141413" }}>
            Q&A 관리
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "#8e8b82" }}>
            비밀글도 관리자는 모두 조회할 수 있습니다.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1">
          <FilterTabs tabs={FILTER_TABS} active={filter} onChange={handleFilterChange} />
          <SearchBar value={keyword} onChange={setKeyword} onSubmit={handleSearch} placeholder="제목으로 검색..." />
        </div>
        <ResultCount total={total} unit="개" />
      </div>

      <AdminTable
        columns={COLUMNS}
        gridTemplateColumns={GRID}
        loading={loading}
        isEmpty={qna.length === 0}
        emptyMessage="문의가 없습니다."
      >
        {qna.map((item) => (
          <div key={item.id} className="border-b last:border-b-0" style={{ borderColor: "#e6dfd8" }}>
            <div
              className="grid items-center px-5 py-3.5 hover:bg-[#efe9de]/30 transition-colors"
              style={{ gridTemplateColumns: GRID }}
            >
              <div className="text-center text-sm truncate" style={{ color: "#252523" }}>
                {getAuthorName(item.profiles)}
              </div>

              <div className="text-sm truncate pr-4" style={{ color: "#252523" }} title={item.title}>
                {item.title}
              </div>

              <div className="flex justify-center">
                {item.is_private && <Lock className="w-3.5 h-3.5" style={{ color: "#8e8b82" }} />}
              </div>

              <div className="text-center text-xs" style={{ color: "#8e8b82" }}>
                {formatDate(item.created_at)}
              </div>

              <div className="text-center text-xs font-medium">
                {item.answer ? (
                  <span style={{ color: "#5db872" }}>답변완료</span>
                ) : (
                  <span style={{ color: "#e8a55a" }}>답변대기</span>
                )}
              </div>

              <div className="flex items-center justify-center gap-1">
                <button
                  onClick={() => handleToggleExpand(item.id, item.answer)}
                  title={item.answer ? "답변 수정" : "답변하기"}
                  className="p-1.5 rounded transition-colors hover:bg-[#efe9de]"
                >
                  <MessageSquare className="w-4 h-4" style={{ color: item.answer ? "#5db872" : "#cc785c" }} />
                </button>
                <IconActionButton
                  icon={<Trash2 className="w-4 h-4" />}
                  loading={deletingId === item.id}
                  variant="danger"
                  onClick={() => handleDelete(item.id)}
                />
              </div>
            </div>

            {expandedId === item.id && (
              <div className="px-5 pb-4" style={{ background: "#faf9f5" }}>
                <p className="text-sm whitespace-pre-wrap mb-3 p-3 rounded-lg" style={{ background: "#fff", color: "#252523" }}>
                  {item.content}
                </p>
                <textarea
                  value={answerDraft}
                  onChange={(e) => setAnswerDraft(e.target.value)}
                  placeholder="답변을 입력해주세요."
                  rows={3}
                  className="w-full rounded-lg p-3 text-sm focus:outline-none"
                  style={{ background: "#fff", border: "1px solid #e6dfd8", color: "#141413" }}
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => setExpandedId(null)}
                    className="px-4 py-1.5 text-sm"
                    style={{ color: "#8e8b82" }}
                  >
                    취소
                  </button>
                  <button
                    onClick={() => handleSubmitAnswer(item.id)}
                    disabled={answerSubmitting || pendingId === item.id}
                    className="px-4 py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                    style={{ background: "#cc785c" }}
                  >
                    {answerSubmitting ? "등록 중..." : "답변 등록"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </AdminTable>

      <Pagination page={page} totalPages={totalPages} loading={loading} onChange={handlePage} />
    </div>
  );
}
