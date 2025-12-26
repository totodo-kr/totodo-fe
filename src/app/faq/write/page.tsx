"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { useProfile } from "@/hooks/useProfile";

export default function FAQWritePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { profile, loading: profileLoading } = useProfile(user);
  const supabase = useMemo(() => createClient(), []);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    if (profileLoading) return;
    if (!user) {
      alert("로그인이 필요합니다.");
      router.push("/faq");
      return;
    }
  }, [profileLoading, router, user]);

  useEffect(() => {
    if (profileLoading || !profile || !user) return;
    if (!isAdmin) {
      alert("관리자만 글쓰기가 가능합니다.");
      router.push("/faq");
    }
  }, [isAdmin, profile, profileLoading, router, user]);

  const handleSubmit = async () => {
    if (!user || !isAdmin) {
      alert("권한이 없습니다.");
      return;
    }
    if (!title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }
    if (!content.trim()) {
      alert("내용을 입력해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("faq")
        .insert({
          title,
          content,
          author_id: user.id,
        })
        .select("id")
        .single();

      if (error) throw error;

      alert("게시글이 등록되었습니다.");
      router.push(`/faq/${data?.id}`);
      router.refresh();
    } catch (error) {
      console.error("Error inserting FAQ:", error);
      alert("등록 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (profileLoading || (user && !profile)) {
    return <div className="min-h-screen p-8 text-center text-gray-500">로딩 중...</div>;
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <main className="min-h-screen bg-black text-white p-8 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push("/faq")}
          className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          목록으로
        </button>
        <h1 className="text-3xl font-bold">FAQ 글쓰기</h1>
      </div>

      <div className="flex flex-col gap-8">
        {/* Title Input */}
        <div className="flex flex-col gap-2">
          <label className="font-bold text-lg">제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력해주세요."
            className="w-full h-12 bg-zinc-800/50 border border-white/10 rounded-lg px-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        {/* Content Input */}
        <div className="flex flex-col gap-2">
          <label className="font-bold text-lg">내용</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용을 입력해주세요."
            className="w-full min-h-[300px] bg-zinc-900 border border-white/10 rounded-lg p-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500 transition-colors resize-none"
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end mt-8 pb-12">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-8 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
          >
            {submitting ? "등록 중..." : "등록하기"}
          </button>
        </div>
      </div>
    </main>
  );
}

