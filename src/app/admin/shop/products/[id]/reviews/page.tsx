"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Trash2, Star, ChevronLeft } from "lucide-react";
import { useAdminProductReviews } from "@/hooks/useAdminProductReviews";
import { AdminTable } from "@/components/admin/organisms";
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
  { label: "제목·내용" },
  { label: "구매확인", className: "text-center" },
  { label: "등록일", className: "text-center" },
  { label: "상태", className: "text-center" },
  { label: "관리", className: "text-center" },
];

const GRID = "90px 80px 1fr 70px 90px 70px 90px";

export default function AdminProductReviewsPage() {
  const params = useParams();
  const productId = params.id as string;

  const { reviews, total, loading, pendingId, fetchReviews, toggleVisible, deleteReview } =
    useAdminProductReviews(productId);
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

  const handleDelete = async (id: number) => {
    if (!confirm("리뷰를 삭제하시겠습니까?")) return;
    setDeletingId(id);
    const ok = await deleteReview(id);
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
            리뷰 관리
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "#8e8b82" }}>
            숨김 처리한 리뷰는 상품 상세 페이지에 노출되지 않습니다.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <SearchBar value={keyword} onChange={setKeyword} onSubmit={handleSearch} placeholder="내용으로 검색..." />
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
            <div className="text-center text-sm truncate" style={{ color: "#252523" }}>
              {getAuthorName(review.profiles)}
            </div>

            <div className="flex justify-center">
              <StarDisplay rating={review.rating} />
            </div>

            <div
              className={`text-sm pr-4 ${review.is_visible ? "" : "opacity-40 line-through"}`}
              style={{ color: "#252523" }}
            >
              {review.title && <p className="font-medium truncate">{review.title}</p>}
              <p className="truncate" style={{ color: "#6c6a64" }} title={review.content}>
                {review.content}
              </p>
            </div>

            <div className="text-center">
              {review.is_verified_purchase && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                  style={{ background: "#e8f5ea", color: "#5db872" }}
                >
                  구매확인
                </span>
              )}
            </div>

            <div className="text-center text-xs" style={{ color: "#8e8b82" }}>
              {formatDate(review.created_at)}
            </div>

            <div className="text-center text-xs font-medium">
              {review.is_visible ? (
                <span style={{ color: "#5db872" }}>공개</span>
              ) : (
                <span style={{ color: "#c64545" }}>숨김</span>
              )}
            </div>

            <div className="flex items-center justify-center gap-1">
              <button
                onClick={() => toggleVisible(review.id, review.is_visible)}
                disabled={pendingId === review.id}
                title={review.is_visible ? "숨기기" : "공개"}
                className="p-1.5 rounded transition-colors hover:bg-[#efe9de] disabled:opacity-40"
              >
                {pendingId === review.id ? (
                  <Spinner size="sm" color="#9ca3af" />
                ) : review.is_visible ? (
                  <Eye className="w-4 h-4" style={{ color: "#5db872" }} />
                ) : (
                  <EyeOff className="w-4 h-4" style={{ color: "#8e8b82" }} />
                )}
              </button>

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
