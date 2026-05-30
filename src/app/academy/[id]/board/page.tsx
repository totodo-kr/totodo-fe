"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useBoardPosts } from "@/hooks/useLecture";

export default function BoardPage() {
  const params = useParams();
  const { posts, loading } = useBoardPosts(params.id);
  const [openIds, setOpenIds] = useState<number[]>([]);

  const toggle = (id: number) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  if (loading) {
    return <p className="text-gray-500">로딩 중...</p>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6">마호 칼럼</h2>

      {posts.map((post) => {
        const isOpen = openIds.includes(post.id);
        return (
          <div
            key={post.id}
            className="bg-zinc-900/50 rounded-lg overflow-hidden hover:bg-zinc-900 transition-colors"
          >
            <button
              className="w-full flex items-center justify-between px-6 cursor-pointer"
              style={{ height: "60px" }}
              onClick={() => toggle(post.id)}
            >
              <h3 className="text-xl font-bold text-white truncate pr-4">{post.title}</h3>
              <svg
                className={`w-6 h-6 text-gray-400 shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div
              className={`transition-all duration-300 overflow-hidden ${isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}`}
            >
              <div className="px-6 pb-6">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-4">
                  <span>{post.author_name}</span>
                  <span>{post.published_at?.slice(0, 10)}</span>
                </div>
                <div className="pt-4 border-t border-white/10 space-y-4 text-gray-300 leading-relaxed">
                  {post.content?.split("\n\n").map((block, i) => (
                    <div key={i} className="space-y-2">
                      {block.split("\n").map((line, j) => (
                        <p key={j}>{line}</p>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
