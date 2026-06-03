"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Pin, PinOff, Trash2, Eye, MessageSquare, ExternalLink } from "lucide-react";
import { useAdminReviews } from "@/hooks/useAdminReviews";
import { AdminPageHeader, AdminTable } from "@/components/admin/organisms";
import { SearchBar, ResultCount, Pagination, IconActionButton } from "@/components/admin/molecules";
import { Spinner } from "@/components/admin/atoms";

const PAGE_SIZE = 15;

function formatDate(s: string) {
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function getAuthorName(profiles: { display_name: string | null; name: string | null } | null) {
  return profiles?.display_name || profiles?.name || "탈퇴한 유저";
}

const COLUMNS = [
  { label: "제목" },
  { label: "작성자", className: "text-center" },
  { label: "조회", className: "text-center" },
  { label: "댓글", className: "text-center" },
  { label: "등록일", className: "text-center" },
  { label: "관리", className: "text-center" },
];

const GRID = "1fr 100px 60px 60px 80px 90px";

export default function AdminReviewsPage() {
  const { reviews, total, loading, pendingId, fetchReviews, togglePin, deleteReview } =
    useAdminReviews();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const load = useCallback((p: number, kw: string) => fetchReviews(p, kw), [fetchReviews]);

  useEffect(() => {
    load(1, "");
  }, [load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load(1, keyword);
  };

  const handlePage = (p: number) => {
    setPage(p);
    load(p, keyword);
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`"${title}" 후기를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
    setDeletingId(id);
    const ok = await deleteReview(id);
    if (!ok) alert("삭제 중 오류가 발생했습니다.");
    setDeletingId(null);
  };

  return (
    <div className="p-8 max-w-6xl">
      <AdminPageHeader
        title="후기 관리"
        description="후기 목록을 조회하고 핀 설정 및 삭제를 관리합니다."
      />

      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <SearchBar
          value={keyword}
          onChange={setKeyword}
          onSubmit={handleSearch}
          placeholder="제목 검색"
        />
        <ResultCount total={total} />
      </div>

      <AdminTable
        columns={COLUMNS}
        gridTemplateColumns={GRID}
        loading={loading}
        isEmpty={reviews.length === 0}
        emptyMessage="후기가 없습니다."
      >
        {reviews.map((review) => (
          <div
            key={review.id}
            className="grid items-center px-5 py-3.5 border-b last:border-b-0 hover:bg-[#efe9de]/30 transition-colors"
            style={{ gridTemplateColumns: GRID, borderColor: "#e6dfd8" }}
          >
            <div className="flex items-center gap-2 min-w-0 pr-4">
              {review.is_pinned && (
                <Pin className="w-3 h-3 flex-shrink-0" style={{ color: "#cc785c" }} />
              )}
              <span className="text-sm font-medium truncate" style={{ color: "#252523" }}>
                {review.title}
              </span>
            </div>

            <div className="text-center">
              <span className="text-sm truncate block" style={{ color: "#6c6a64" }}>
                {getAuthorName(review.profiles)}
              </span>
            </div>

            <div className="flex items-center justify-center gap-1">
              <Eye className="w-3 h-3" style={{ color: "#8e8b82" }} />
              <span className="text-xs" style={{ color: "#6c6a64" }}>
                {review.view_count}
              </span>
            </div>

            <div className="flex items-center justify-center gap-1">
              <MessageSquare className="w-3 h-3" style={{ color: "#8e8b82" }} />
              <span className="text-xs" style={{ color: "#6c6a64" }}>
                {review.review_comments?.[0]?.count ?? 0}
              </span>
            </div>

            <div className="text-center">
              <span className="text-sm" style={{ color: "#6c6a64" }}>
                {formatDate(review.created_at)}
              </span>
            </div>

            <div className="flex items-center justify-center gap-1">
              <Link
                href={`/reviews/${review.id}`}
                target="_blank"
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: "#8e8b82" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color = "#cc785c";
                  (e.currentTarget as HTMLAnchorElement).style.background = "#efe9de";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color = "#8e8b82";
                  (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                }}
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>

              <button
                onClick={async () => {
                  const result = await togglePin(review.id, review.is_pinned);
                  if (result.limitReached) alert("상단 고정은 최대 5개까지만 설정할 수 있습니다.");
                  else if (!result.ok) alert("핀 설정 중 오류가 발생했습니다.");
                }}
                disabled={pendingId === review.id}
                title={review.is_pinned ? "핀 해제" : "핀 설정"}
                className="p-1.5 rounded-lg transition-colors disabled:opacity-40"
                style={{
                  color: review.is_pinned ? "#cc785c" : "#8e8b82",
                  background: "transparent",
                }}
                onMouseEnter={(e) => {
                  if (pendingId !== review.id) {
                    (e.currentTarget as HTMLButtonElement).style.background = "#efe9de";
                    if (!review.is_pinned)
                      (e.currentTarget as HTMLButtonElement).style.color = "#cc785c";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  if (!review.is_pinned)
                    (e.currentTarget as HTMLButtonElement).style.color = "#8e8b82";
                }}
              >
                {pendingId === review.id ? (
                  <Spinner size="sm" color="currentColor" />
                ) : review.is_pinned ? (
                  <PinOff className="w-3.5 h-3.5" />
                ) : (
                  <Pin className="w-3.5 h-3.5" />
                )}
              </button>

              <IconActionButton
                icon={<Trash2 className="w-3.5 h-3.5" />}
                loading={deletingId === review.id}
                variant="danger"
                iconSize="sm"
                onClick={() => handleDelete(review.id, review.title)}
              />
            </div>
          </div>
        ))}
      </AdminTable>

      <Pagination page={page} totalPages={totalPages} loading={loading} onChange={handlePage} />
    </div>
  );
}
