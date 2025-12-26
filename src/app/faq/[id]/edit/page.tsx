"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { useProfile } from "@/hooks/useProfile";

interface FaqRow {
  title: string;
  content: string;
}

export default function FAQEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuthStore();
  const { profile, loading: profileLoading } = useProfile(user);
  const supabase = useMemo(() => createClient(), []);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    if (profileLoading) return;
    if (!user) {
      alert("로그인이 필요합니다.");
      router.push("/faq");
    }
  }, [profileLoading, router, user]);

  useEffect(() => {
    if (profileLoading || !profile || !user) return;
    if (!isAdmin) {
      alert("관리자만 접근 가능합니다.");
      router.push("/faq");
      return;
    }

    const fetchFaq = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("faq")
          .select("title, content")
          .eq("id", id)
          .single();

        if (error) throw error;
        if (!data) {
          alert("게시글을 찾을 수 없습니다.");
          router.back();
          return;
        }

        const row = data as FaqRow;
        setTitle(row.title);
        setContent(row.content || "");
      } catch (error) {
        console.error("Error fetching FAQ:", error);
        alert("게시글을 불러오는데 실패했습니다.");
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchFaq();
  }, [id, isAdmin, profile, profileLoading, router, supabase, user]);

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
      const { error } = await supabase
        .from("faq")
        .update({ title, content })
        .eq("id", id);

      if (error) throw error;

      alert("게시글이 수정되었습니다.");
      router.push(`/faq/${id}`);
      router.refresh();
    } catch (error) {
      console.error("Error updating FAQ:", error);
      alert("수정 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (profileLoading || loading) {
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
          onClick={() => router.push(`/faq/${id}`)}
          className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          상세로
        </button>
        <h1 className="text-3xl font-bold">FAQ 수정</h1>
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
            {submitting ? "수정 중..." : "수정하기"}
          </button>
        </div>
      </div>
    </main>
  );
}

