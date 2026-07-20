"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Lock } from "lucide-react";
import { useLectureBoard, BOARD_CATEGORY_LABELS } from "@/hooks/useLectureBoard";
import { useLectureContext } from "@/contexts/LectureContext";
import LoadingSpinner from "@/components/LoadingSpinner";

const CATEGORY_TABS = [
  { value: "", label: "전체" },
  { value: "notice", label: "공지" },
  { value: "question", label: "질문" },
  { value: "general", label: "일반" },
  { value: "column", label: "칼럼" },
];

const CATEGORY_STYLES: Record<string, { bg: string; color: string }> = {
  notice:   { bg: "rgba(204,120,92,0.15)", color: "#cc785c" },
  question: { bg: "rgba(59,130,246,0.15)", color: "#93c5fd" },
  general:  { bg: "rgba(255,255,255,0.08)", color: "#9ca3af" },
  column:   { bg: "rgba(16,185,129,0.15)", color: "#6ee7b7" },
};

export default function BoardPage() {
  const params = useParams();
  const { isEnrolled } = useLectureContext();
  const [activeCategory, setActiveCategory] = useState("");
  const [openIds, setOpenIds] = useState<number[]>([]);

  const { posts, loading } = useLectureBoard(params.id, activeCategory);

  const toggle = (id: number) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-2">
      {/* 카테고리 필터 탭 */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setActiveCategory(tab.value);
              setOpenIds([]);
            }}
            className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all border"
            style={
              activeCategory === tab.value
                ? { background: "#a200cb", color: "#fff", borderColor: "#a200cb" }
                : { background: "transparent", color: "#9ca3af", borderColor: "rgba(255,255,255,0.15)" }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {posts.length === 0 && (
        <p className="text-center py-12 text-gray-500">게시글이 없습니다.</p>
      )}

      {posts.map((post) => {
        const isOpen = openIds.includes(post.id);
        const catStyle = CATEGORY_STYLES[post.category] ?? CATEGORY_STYLES.general;
        const catLabel = BOARD_CATEGORY_LABELS[post.category] ?? post.category;

        return (
          <div
            key={post.id}
            className="bg-zinc-900/50 rounded-lg overflow-hidden hover:bg-zinc-900 transition-colors"
          >
            <button
              className="w-full flex items-center gap-3 px-6 cursor-pointer"
              style={{ height: "60px" }}
              onClick={() => toggle(post.id)}
            >
              {/* 카테고리 배지 */}
              <span
                className="shrink-0 px-2 py-0.5 rounded text-[11px] font-bold"
                style={{ background: catStyle.bg, color: catStyle.color }}
              >
                {catLabel}
              </span>

              <h3 className="flex-1 text-left text-base font-semibold text-white truncate">
                {post.title}
              </h3>

              {/* 잠금 아이콘 (비수강자) 또는 토글 화살표 (수강자) */}
              {isEnrolled ? (
                <svg
                  className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              ) : (
                <Lock className="w-4 h-4 text-gray-500 shrink-0" />
              )}
            </button>

            {/* 본문: 수강자만 펼침 */}
            {isEnrolled ? (
              <div
                className={`transition-all duration-300 overflow-hidden ${isOpen ? "max-h-[3000px] opacity-100" : "max-h-0 opacity-0"}`}
              >
                <div className="px-6 pb-6">
                  <div className="flex items-center gap-3 text-gray-400 text-sm mb-4">
                    {post.author_name && <span>{post.author_name}</span>}
                    {post.published_at && <span>{post.published_at.slice(0, 10)}</span>}
                  </div>
                  <div
                    className="pt-4 border-t border-white/10 prose prose-invert prose-sm max-w-none text-gray-300 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: post.content ?? "" }}
                  />
                </div>
              </div>
            ) : (
              /* 비수강자: 제목 클릭 시 안내 메시지 */
              <div
                className={`transition-all duration-300 overflow-hidden ${openIds.includes(post.id) ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}
              >
                <div className="px-6 pb-5">
                  <div className="flex items-center gap-2 py-3 px-4 rounded-lg text-sm" style={{ background: "rgba(255,255,255,0.05)", color: "#9ca3af" }}>
                    <Lock className="w-4 h-4 shrink-0" />
                    수강 신청 후 내용을 확인할 수 있습니다.
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
