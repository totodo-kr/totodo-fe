"use client";

import { MessageSquare, Search, Pin, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useReviews, Review } from "@/hooks/useReviews";
import { useEffect, Suspense } from "react";

function ReviewsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // URL 쿼리 파라미터에서 초기 페이지 설정
  const initialPage = Number(searchParams.get("page")) || 1;

  const {
    pinnedReviews,
    reviews,
    totalCount,
    loading,
    page,
    setPage,
    keyword,
    setKeyword,
    fetchReviews,
    totalPages,
  } = useReviews(initialPage);

  // URL 변경 시 페이지 상태 업데이트
  useEffect(() => {
    const pageParam = Number(searchParams.get("page")) || 1;
    if (pageParam !== page) {
      setPage(pageParam);
    }
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/reviews?page=1`);
    setPage(1);
    fetchReviews(); // 키워드가 변경되었으므로 다시 조회
  };

  const movePage = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    router.push(`/reviews?page=${newPage}`);
    // setPage는 useEffect에서 처리됨
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const getAuthorName = (review: Review) => {
    return review.profiles?.display_name || review.profiles?.name || "알 수 없음";
  };

  const getCommentCount = (review: Review) => {
    return review.review_comments?.[0]?.count || 0;
  };

  return (
    <>
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-8 flex justify-center">
        <div className="relative w-full max-w-xl">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="검색어를 입력하세요..."
            className="w-full h-12 pl-12 pr-4 bg-zinc-900 border border-white/10 rounded-full text-white placeholder:text-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
        </div>
      </form>

      {/* Review List */}
      <div className="flex flex-col min-h-[500px]">
        {loading ? (
          <div className="flex-1 flex justify-center items-center text-gray-500">로딩 중...</div>
        ) : (
          <>
            {/* Pinned Reviews */}
            {pinnedReviews.map((review) => (
              <Link
                key={review.id}
                href={`/reviews/${review.id}`}
                className="relative flex items-center justify-between w-full h-[100px] mb-[10px] px-8 rounded-xl border transition-all cursor-pointer bg-zinc-900/80 border-brand-500/30 hover:border-brand-500/50"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Pin className="w-4 h-4 text-brand-500 rotate-45" fill="currentColor" />
                    <h3 className="font-medium text-lg truncate text-[#f5d0fe]">{review.title}</h3>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span>{getAuthorName(review)}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-700" />
                    <span>{formatDate(review.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-gray-400 min-w-fit">
                  <MessageSquare className="w-5 h-5" />
                  <span className="text-sm font-medium">{getCommentCount(review)}</span>
                </div>
              </Link>
            ))}

            {/* Normal Reviews */}
            {reviews.length === 0 && pinnedReviews.length === 0 ? (
              <div className="text-center py-20 text-gray-500">게시글이 없습니다.</div>
            ) : (
              reviews.map((review) => (
                <Link
                  key={review.id}
                  href={`/reviews/${review.id}`}
                  className="relative flex items-center justify-between w-full h-[100px] mb-[10px] px-8 rounded-xl border transition-all cursor-pointer bg-zinc-900/40 border-white/5 hover:bg-zinc-800/60 hover:border-white/10"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-lg truncate text-gray-200">{review.title}</h3>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span>{getAuthorName(review)}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-700" />
                      <span>{formatDate(review.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-400 min-w-fit">
                    <MessageSquare className="w-5 h-5" />
                    <span className="text-sm font-medium">{getCommentCount(review)}</span>
                  </div>
                </Link>
              ))
            )}
          </>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalCount > 0 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <button
            onClick={() => movePage(page - 1)}
            disabled={page === 1}
            className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => movePage(pageNum)}
              className={`
                w-8 h-8 rounded-lg font-medium text-sm transition-colors
                ${
                  page === pageNum
                    ? "bg-brand-500 text-white"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }
              `}
            >
              {pageNum}
            </button>
          ))}

          <button
            onClick={() => movePage(page + 1)}
            disabled={page === totalPages}
            className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      )}

      {/* Write Button */}
      <div className="flex justify-end mt-8">
        <Link
          href="/reviews/write"
          className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold transition-colors flex items-center gap-2"
        >
          <span>글쓰기</span>
        </Link>
      </div>
    </>
  );
}

export default function ReviewsPage() {
  return (
    <main className="min-h-screen p-8 max-w-[1600px] mx-auto">
      <Suspense fallback={<div className="text-center py-20 text-gray-500">로딩 중...</div>}>
        <ReviewsContent />
      </Suspense>
    </main>
  );
}
