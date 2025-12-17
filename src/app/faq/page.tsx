"use client";

import { Search } from "lucide-react";
import Link from "next/link";

export default function FAQPage() {
  const faqs = Array.from({ length: 10 }).map((_, i) => ({
    id: i,
    question: `이 서비스는 무료인가요? 질문 예시 ${i + 1}`,
    author: "관리자",
    date: "2024-03-20",
  }));

  return (
    <main className="min-h-screen p-8 max-w-[1600px] mx-auto">
      {/* Search Bar */}
      <div className="mb-8 flex justify-center">
        <div className="relative w-full max-w-xl">
          <input
            type="text"
            placeholder="궁금한 내용을 검색해보세요..."
            className="w-full h-12 pl-12 pr-4 bg-zinc-900 border border-white/10 rounded-full text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
        </div>
      </div>

      {/* FAQ List */}
      <div className="flex flex-col gap-3">
        {faqs.map((faq) => (
          <Link
            key={faq.id}
            href={`/faq/${faq.id}`}
            className="flex flex-col justify-center w-full p-6 bg-zinc-900/40 border border-white/5 rounded-xl hover:bg-zinc-800/60 hover:border-white/10 transition-all cursor-pointer group gap-2"
          >
            <h3 className="text-lg font-medium text-gray-200 group-hover:text-white transition-colors">
              <span className="text-purple-500 mr-2 font-bold">Q:</span>
              {faq.question}
            </h3>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span>{faq.author}</span>
              <span className="w-1 h-1 rounded-full bg-gray-700" />
              <span>{faq.date}</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
