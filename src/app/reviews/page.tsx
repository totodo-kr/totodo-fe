"use client";

import { MessageSquare, Search, Pin } from "lucide-react";
import Link from "next/link";

interface Review {
  id: number;
  title: string;
  author: string;
  date: string;
  commentCount: number;
  isPinned?: boolean;
}

export default function ReviewsPage() {
  // 고정된 후기글 (4개)
  const pinnedReviews: Review[] = Array.from({ length: 4 }).map((_, i) => ({
    id: i,
    title: `[공지] 강의 후기 게시판 이용 수칙 안내 ${i + 1}`,
    author: "관리자",
    date: "2024-01-01",
    commentCount: 10 + i,
    isPinned: true,
  }));

  // 일반 후기글 (10개)
  const normalReviews: Review[] = Array.from({ length: 10 }).map((_, i) => ({
    id: 100 + i,
    title: `${i + 1}강 수강 후기입니다! 정말 도움이 많이 되었어요.`,
    author: `수강생${i + 1}`,
    date: "2024-03-15",
    commentCount: i * 2,
    isPinned: false,
  }));

  const allReviews = [...pinnedReviews, ...normalReviews];

  return (
    <main className="min-h-screen p-8 max-w-[1600px] mx-auto">
      {/* Search Bar */}
      <div className="mb-8 flex justify-center">
        <div className="relative w-full max-w-xl">
          <input
            type="text"
            placeholder="검색어를 입력하세요..."
            className="w-full h-12 pl-12 pr-4 bg-zinc-900 border border-white/10 rounded-full text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
        </div>
      </div>

      {/* Review List */}
      <div className="flex flex-col">
        {allReviews.map((review) => (
          <Link
            key={review.id}
            href={`/reviews/${review.id}`}
            className={`
              relative flex items-center justify-between
              w-full h-[100px] mb-[10px] px-8
              rounded-xl border transition-all cursor-pointer
              ${
                review.isPinned
                  ? "bg-zinc-900/80 border-purple-500/30 hover:border-purple-500/50"
                  : "bg-zinc-900/40 border-white/5 hover:bg-zinc-800/60 hover:border-white/10"
              }
            `}
          >
            {/* Left Content */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                {review.isPinned && (
                  <Pin className="w-4 h-4 text-purple-500 rotate-45" fill="currentColor" />
                )}
                <h3 className={`font-medium text-lg truncate ${review.isPinned ? "text-purple-100" : "text-gray-200"}`}>
                  {review.title}
                </h3>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span>{review.author}</span>
                <span className="w-1 h-1 rounded-full bg-gray-700" />
                <span>{review.date}</span>
              </div>
            </div>

            {/* Right Content (Comments) */}
            <div className="flex items-center gap-1.5 text-gray-400 min-w-fit">
              <MessageSquare className="w-5 h-5" />
              <span className="text-sm font-medium">{review.commentCount}</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
