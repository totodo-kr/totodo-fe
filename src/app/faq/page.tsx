"use client";

import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFaqs } from "@/hooks/useFaqs";
import { useAuthStore } from "@/store/useAuthStore";
import { useProfile } from "@/hooks/useProfile";

function FAQContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialPage = Number(searchParams.get("page")) || 1;

  const { user } = useAuthStore();
  const { profile } = useProfile(user);
  const isAdmin = profile?.role === "admin";

  const { faqs, totalCount, loading, page, setPage, keyword, setKeyword, fetchFaqs, totalPages } =
    useFaqs(initialPage);

  useEffect(() => {
    const pageParam = Number(searchParams.get("page")) || 1;
    if (pageParam !== page) {
      setPage(pageParam);
    }
  }, [searchParams, page, setPage]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/faq?page=1`);
    setPage(1);
    fetchFaqs();
  };

  const movePage = (newPage: number) => {
    if (totalPages === 0 || newPage < 1 || newPage > totalPages) return;
    router.push(`/faq?page=${newPage}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "-";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const getAuthorName = (author: { display_name: string | null; name: string | null } | null) => {
    return author?.display_name || author?.name || "알 수 없음";
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
            placeholder="궁금한 내용을 검색해보세요..."
            className="w-full h-12 pl-12 pr-4 bg-zinc-900 border border-white/10 rounded-full text-white placeholder:text-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
        </div>
      </form>

      {/* FAQ List */}
      <div className="flex flex-col min-h-[500px] gap-3">
        {loading ? (
          <div className="flex-1 flex justify-center items-center text-gray-500">로딩 중...</div>
        ) : faqs.length === 0 ? (
          <div className="text-center py-20 text-gray-500">게시글이 없습니다.</div>
        ) : (
          faqs.map((faq) => (
            <Link
              key={faq.id}
              href={`/faq/${faq.id}`}
              className="flex flex-col justify-center w-full p-6 bg-zinc-900/40 border border-white/5 rounded-xl hover:bg-zinc-800/60 hover:border-white/10 transition-all cursor-pointer group gap-2"
            >
              <h3 className="text-lg font-medium text-gray-200 group-hover:text-white transition-colors">
                <span className="text-brand-500 mr-2 font-bold">Q:</span>
                {faq.title}
              </h3>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span>{getAuthorName(faq.profiles)}</span>
                <span className="w-1 h-1 rounded-full bg-gray-700" />
                <span>{formatDate(faq.created_at)}</span>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Pagination */}
      {!loading && totalCount > 0 && totalPages > 0 && (
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
              className={`w-8 h-8 rounded-lg font-medium text-sm transition-colors ${
                page === pageNum
                  ? "bg-brand-500 text-white"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
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

      {/* Write Button (Admin only) */}
      {isAdmin && (
        <div className="flex justify-end mt-8">
          <Link
            href="/faq/write"
            className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold transition-colors flex items-center gap-2"
          >
            <span>글쓰기</span>
          </Link>
        </div>
      )}
    </>
  );
}

export default function FAQPage() {
  return (
    <main className="min-h-screen p-8 mx-auto">
      <Suspense fallback={<div className="text-center py-20 text-gray-500">로딩 중...</div>}>
        <FAQContent />
      </Suspense>
    </main>
  );
}
