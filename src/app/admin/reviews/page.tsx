"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Pin,
  PinOff,
  Trash2,
  Eye,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import { useAdminReviews } from "@/hooks/useAdminReviews";

const PAGE_SIZE = 15;

function formatDate(s: string) {
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function getAuthorName(profiles: { display_name: string | null; name: string | null } | null) {
  return profiles?.display_name || profiles?.name || "탈퇴한 유저";
}

export default function AdminReviewsPage() {
  const { reviews, total, loading, pendingId, fetchReviews, togglePin, deleteReview } =
    useAdminReviews();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const load = useCallback(
    (p: number, kw: string) => fetchReviews(p, kw),
    [fetchReviews]
  );

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
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "#141413" }}>
          후기 관리
        </h1>
        <p className="text-sm mt-1" style={{ color: "#6c6a64" }}>
          후기 목록을 조회하고 핀 설정 및 삭제를 관리합니다.
        </p>
      </div>

      {/* Search + count */}
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-xs">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "#8e8b82" }}
          />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="제목 검색"
            className="w-full h-10 pl-9 pr-4 rounded-lg text-sm border outline-none"
            style={{ background: "#efe9de", borderColor: "#e6dfd8", color: "#141413" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#cc785c")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#e6dfd8")}
          />
        </form>
        <span className="text-sm" style={{ color: "#6c6a64" }}>
          총{" "}
          <span className="font-semibold" style={{ color: "#141413" }}>
            {total}
          </span>
          개
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#e6dfd8" }}>
        <div
          className="grid items-center px-5 py-3 text-xs font-semibold uppercase tracking-wide border-b"
          style={{
            gridTemplateColumns: "1fr 100px 60px 60px 80px 90px",
            background: "#efe9de",
            color: "#6c6a64",
            borderColor: "#e6dfd8",
          }}
        >
          <span>제목</span>
          <span className="text-center">작성자</span>
          <span className="text-center">조회</span>
          <span className="text-center">댓글</span>
          <span className="text-center">등록일</span>
          <span className="text-center">관리</span>
        </div>

        <div style={{ background: "#faf9f5" }}>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div
                className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: "#cc785c", borderTopColor: "transparent" }}
              />
            </div>
          ) : reviews.length === 0 ? (
            <p className="text-center py-12 text-sm" style={{ color: "#8e8b82" }}>
              후기가 없습니다.
            </p>
          ) : (
            reviews.map((review) => (
              <div
                key={review.id}
                className="grid items-center px-5 py-3.5 border-b last:border-b-0 hover:bg-[#efe9de]/30 transition-colors"
                style={{
                  gridTemplateColumns: "1fr 100px 60px 60px 80px 90px",
                  borderColor: "#e6dfd8",
                }}
              >
                {/* Title */}
                <div className="flex items-center gap-2 min-w-0 pr-4">
                  {review.is_pinned && (
                    <Pin className="w-3 h-3 flex-shrink-0" style={{ color: "#cc785c" }} />
                  )}
                  <span
                    className="text-sm font-medium truncate"
                    style={{ color: "#252523" }}
                  >
                    {review.title}
                  </span>
                </div>

                {/* Author */}
                <div className="text-center">
                  <span className="text-sm truncate block" style={{ color: "#6c6a64" }}>
                    {getAuthorName(review.profiles)}
                  </span>
                </div>

                {/* View count */}
                <div className="flex items-center justify-center gap-1">
                  <Eye className="w-3 h-3" style={{ color: "#8e8b82" }} />
                  <span className="text-xs" style={{ color: "#6c6a64" }}>
                    {review.view_count}
                  </span>
                </div>

                {/* Comment count */}
                <div className="flex items-center justify-center gap-1">
                  <MessageSquare className="w-3 h-3" style={{ color: "#8e8b82" }} />
                  <span className="text-xs" style={{ color: "#6c6a64" }}>
                    {review.review_comments?.[0]?.count ?? 0}
                  </span>
                </div>

                {/* Date */}
                <div className="text-center">
                  <span className="text-sm" style={{ color: "#6c6a64" }}>
                    {formatDate(review.created_at)}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-center gap-1">
                  {/* View */}
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

                  {/* Pin toggle */}
                  <button
                    onClick={() => togglePin(review.id, review.is_pinned)}
                    disabled={pendingId === review.id}
                    title={review.is_pinned ? "핀 해제" : "핀 설정"}
                    className="p-1.5 rounded-lg transition-colors disabled:opacity-40"
                    style={
                      review.is_pinned
                        ? { color: "#cc785c", background: "transparent" }
                        : { color: "#8e8b82", background: "transparent" }
                    }
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
                      <div
                        className="w-3.5 h-3.5 border border-t-transparent rounded-full animate-spin"
                        style={{ borderColor: "currentColor", borderTopColor: "transparent" }}
                      />
                    ) : review.is_pinned ? (
                      <PinOff className="w-3.5 h-3.5" />
                    ) : (
                      <Pin className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(review.id, review.title)}
                    disabled={deletingId === review.id}
                    className="p-1.5 rounded-lg transition-colors disabled:opacity-40"
                    style={{ color: "#8e8b82" }}
                    onMouseEnter={(e) => {
                      if (deletingId !== review.id) {
                        (e.currentTarget as HTMLButtonElement).style.color = "#c64545";
                        (e.currentTarget as HTMLButtonElement).style.background = "#efe9de";
                      }
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = "#8e8b82";
                      (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    }}
                  >
                    {deletingId === review.id ? (
                      <div
                        className="w-3.5 h-3.5 border border-t-transparent rounded-full animate-spin"
                        style={{ borderColor: "#c64545", borderTopColor: "transparent" }}
                      />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-6">
          <button
            onClick={() => handlePage(page - 1)}
            disabled={page === 1}
            className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30"
            style={{ color: "#6c6a64" }}
            onMouseEnter={(e) => {
              if (page !== 1) (e.currentTarget as HTMLButtonElement).style.background = "#efe9de";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => handlePage(p)}
              className="w-8 h-8 rounded-lg text-sm font-medium transition-all"
              style={
                p === page
                  ? { background: "#cc785c", color: "#fff" }
                  : { color: "#6c6a64", background: "transparent" }
              }
              onMouseEnter={(e) => {
                if (p !== page)
                  (e.currentTarget as HTMLButtonElement).style.background = "#efe9de";
              }}
              onMouseLeave={(e) => {
                if (p !== page)
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => handlePage(page + 1)}
            disabled={page === totalPages}
            className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30"
            style={{ color: "#6c6a64" }}
            onMouseEnter={(e) => {
              if (page !== totalPages)
                (e.currentTarget as HTMLButtonElement).style.background = "#efe9de";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
