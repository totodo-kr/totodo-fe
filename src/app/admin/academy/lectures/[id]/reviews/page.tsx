"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Pin, PinOff, EyeOff, Eye, Trash2, Star } from "lucide-react";
import { useAdminLectureReviews } from "@/hooks/useAdminLectureReviews";
import { AdminTable } from "@/components/admin/organisms";
import { SearchBar, ResultCount, Pagination, IconActionButton } from "@/components/admin/molecules";

const PAGE_SIZE = 15;

function formatDate(s: string) {
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function getAuthorName(profiles: { display_name: string | null; name: string | null } | null) {
  return profiles?.display_name || profiles?.name || "탈퇴한 유저";
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5 justify-center">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`w-3 h-3 ${n <= rating ? "text-yellow-400" : "text-gray-600"}`}
          fill={n <= rating ? "currentColor" : "none"}
        />
      ))}
    </div>
  );
}

const COLUMNS = [
  { label: "작성자", className: "text-center" },
  { label: "별점", className: "text-center" },
  { label: "내용" },
  { label: "등록일", className: "text-center" },
  { label: "상태", className: "text-center" },
  { label: "관리", className: "text-center" },
];

const GRID = "100px 80px 1fr 90px 80px 110px";

export default function AdminLectureReviewsPage() {
  const params = useParams();
  const lectureId = params.id as string;

  const { reviews, total, loading, pendingId, fetchReviews, togglePin, toggleHide, deleteReview } =
    useAdminLectureReviews(lectureId);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const handleTogglePin = async (id: string, current: boolean) => {
    const { ok, limitReached } = await togglePin(id, current);
    if (!ok && limitReached) {
      alert(`강의당 최대 ${2}개의 리뷰만 고정할 수 있습니다.`);
    }
  };

  const handleToggleHide = async (id: string, current: boolean) => {
    await toggleHide(id, current);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("리뷰를 삭제하시겠습니까?")) return;
    setDeletingId(id);
    const ok = await deleteReview(id);
    if (!ok) alert("삭제 중 오류가 발생했습니다.");
    setDeletingId(null);
  };

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold" style={{ color: "#141413" }}>리뷰 관리</h2>
          <p className="text-sm mt-0.5" style={{ color: "#8e8b82" }}>
            고정 리뷰(최대 2개)는 강의 상세 페이지 상단에 노출됩니다.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <SearchBar
          value={keyword}
          onChange={setKeyword}
          onSubmit={handleSearch}
          placeholder="내용으로 검색..."
        />
        <ResultCount total={total} unit="개" />
      </div>

      <AdminTable
        columns={COLUMNS}
        gridTemplateColumns={GRID}
        loading={loading}
        isEmpty={reviews.length === 0}
        emptyMessage="리뷰가 없습니다."
      >
        {reviews.map((review) => (
          <div
            key={review.id}
            className="grid items-center px-5 py-3.5 border-b last:border-b-0 hover:bg-[#efe9de]/30 transition-colors"
            style={{ gridTemplateColumns: GRID, borderColor: "#e6dfd8" }}
          >
            {/* 작성자 */}
            <div className="text-center text-sm truncate" style={{ color: "#252523" }}>
              {getAuthorName(review.profiles)}
            </div>

            {/* 별점 */}
            <div className="flex justify-center">
              <StarDisplay rating={review.rating} />
            </div>

            {/* 내용 */}
            <div
              className={`text-sm truncate pr-4 ${review.is_hidden ? "opacity-40 line-through" : ""}`}
              style={{ color: "#252523" }}
              title={review.content ?? ""}
            >
              {review.content || <span style={{ color: "#8e8b82" }}>내용 없음</span>}
              {review.is_pinned && (
                <span
                  className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold"
                  style={{ background: "#cc785c", color: "#fff" }}
                >
                  고정
                </span>
              )}
            </div>

            {/* 날짜 */}
            <div className="text-center text-xs" style={{ color: "#8e8b82" }}>
              {formatDate(review.created_at)}
            </div>

            {/* 상태 */}
            <div className="text-center text-xs font-medium">
              {review.is_hidden ? (
                <span style={{ color: "#c64545" }}>숨김</span>
              ) : review.is_pinned ? (
                <span style={{ color: "#cc785c" }}>고정</span>
              ) : (
                <span style={{ color: "#5db872" }}>공개</span>
              )}
            </div>

            {/* 관리 버튼 */}
            <div className="flex items-center justify-center gap-1">
              {/* 핀 토글 */}
              <button
                onClick={() => handleTogglePin(review.id, review.is_pinned)}
                disabled={pendingId === review.id}
                title={review.is_pinned ? "고정 해제" : "상단 고정"}
                className="p-1.5 rounded transition-colors hover:bg-[#efe9de] disabled:opacity-40"
              >
                {pendingId === review.id ? (
                  <span className="w-4 h-4 block rounded-full border-2 border-t-transparent border-gray-400 animate-spin" />
                ) : review.is_pinned ? (
                  <PinOff className="w-4 h-4" style={{ color: "#cc785c" }} />
                ) : (
                  <Pin className="w-4 h-4" style={{ color: "#8e8b82" }} />
                )}
              </button>

              {/* 숨김 토글 */}
              <button
                onClick={() => handleToggleHide(review.id, review.is_hidden)}
                disabled={pendingId === review.id}
                title={review.is_hidden ? "공개" : "숨기기"}
                className="p-1.5 rounded transition-colors hover:bg-[#efe9de] disabled:opacity-40"
              >
                {review.is_hidden ? (
                  <Eye className="w-4 h-4" style={{ color: "#5db872" }} />
                ) : (
                  <EyeOff className="w-4 h-4" style={{ color: "#8e8b82" }} />
                )}
              </button>

              {/* 삭제 */}
              <IconActionButton
                icon={<Trash2 className="w-4 h-4" />}
                loading={deletingId === review.id}
                variant="danger"
                onClick={() => handleDelete(review.id)}
              />
            </div>
          </div>
        ))}
      </AdminTable>

      <Pagination page={page} totalPages={totalPages} loading={loading} onChange={handlePage} />
    </div>
  );
}
