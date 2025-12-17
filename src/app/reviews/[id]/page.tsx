"use client";

import { ChevronLeft, MessageSquare } from "lucide-react";
import { useRouter, useParams } from "next/navigation";

export default function ReviewDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  // 더미 데이터 (실제로는 API 호출 필요)
  const review = {
    title: `${id}번 강의 수강 후기입니다! 정말 도움이 많이 되었어요.`,
    author: `수강생${id}`,
    date: "2024-03-15",
    content: `
      이 강의를 듣고 나서 일본어 실력이 정말 많이 늘었습니다.
      강사님의 설명이 귀에 쏙쏙 들어오고, 예제도 실생활에 바로 쓸 수 있는 것들이라 좋았어요.
      특히 문법 설명해주실 때 헷갈리기 쉬운 부분들을 콕 집어서 알려주시는 게 인상 깊었습니다.
      다음 단계 강의도 꼭 수강하고 싶네요!
    `,
  };

  return (
    <main className="min-h-screen p-8 max-w-[1600px] mx-auto">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center text-gray-400 hover:text-white transition-colors mb-8 group"
      >
        <ChevronLeft className="w-5 h-5 mr-1 group-hover:-translate-x-1 transition-transform" />
        뒤로 가기
      </button>

      {/* Header */}
      <header className="mb-8 border-b border-white/10 pb-8">
        <h1 className="text-3xl font-bold text-white mb-4">{review.title}</h1>
        <div className="flex items-center gap-3 text-gray-500">
          <span>{review.author}</span>
          <span className="w-1 h-1 rounded-full bg-gray-700" />
          <span>{review.date}</span>
        </div>
      </header>

      {/* Content */}
      <div className="text-gray-300 leading-relaxed whitespace-pre-line text-lg mb-16 min-h-[200px]">
        {review.content}
      </div>

      {/* Comments Section */}
      <div className="border-t border-white/10 pt-8">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          댓글
        </h3>

        {/* Comment Input */}
        <div className="flex gap-4 mb-8">
          <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold shrink-0">
            나
          </div>
          <div className="flex-1">
            <textarea
              placeholder="댓글을 남겨보세요..."
              className="w-full h-24 bg-zinc-900 border border-white/10 rounded-xl p-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500 transition-colors resize-none"
            />
            <div className="flex justify-end mt-2">
              <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-sm transition-colors">
                등록
              </button>
            </div>
          </div>
        </div>

        {/* Comment List (Empty for now) */}
        <div className="text-center py-8 text-gray-500">
          첫 번째 댓글을 남겨보세요!
        </div>
      </div>
    </main>
  );
}

