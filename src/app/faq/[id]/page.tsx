"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter, useParams } from "next/navigation";

export default function FAQDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  // 더미 데이터
  const faq = {
    title: `Q: 이 서비스는 무료인가요? 질문 예시 ${Number(id) + 1}`,
    author: "관리자",
    date: "2024-03-20",
    content: `
      네, 기본적으로 무료로 이용하실 수 있습니다.
      다만 일부 프리미엄 강의나 전자책/실물책 등의 상품은 유료로 제공되고 있습니다.
      
      자세한 내용은 상점 메뉴를 확인해주세요.
      항상 더 좋은 서비스를 제공하기 위해 노력하겠습니다.
      감사합니다.
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
        <h1 className="text-3xl font-bold text-white mb-4">{faq.title}</h1>
        <div className="flex items-center gap-3 text-gray-500">
          <span>{faq.author}</span>
          <span className="w-1 h-1 rounded-full bg-gray-700" />
          <span>{faq.date}</span>
        </div>
      </header>

      {/* Content */}
      <div className="text-gray-300 leading-relaxed whitespace-pre-line text-lg min-h-[200px]">
        {faq.content}
      </div>
    </main>
  );
}

