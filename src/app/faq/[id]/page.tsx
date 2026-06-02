"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import PageLoading from "@/components/PageLoading";

interface FaqDetail {
  id: string;
  title: string;
  content: string;
  created_at: string;
  author_id: string | null;
  profiles: {
    display_name: string | null;
    name: string | null;
  } | null;
}

export default function FAQDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const supabase = useMemo(() => createClient(), []);

  const [faq, setFaq] = useState<FaqDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFaq = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("faq")
        .select(
          `
          *,
          profiles:author_id (display_name, name)
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      setFaq(data as FaqDetail);
    } catch (error) {
      console.error("Error fetching FAQ:", error);
      alert("게시글을 불러오는데 실패했습니다.");
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, supabase, router]);

  useEffect(() => {
    fetchFaq();
  }, [fetchFaq]);

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

  if (loading) {
    return <PageLoading />;
  }

  if (!faq) {
    return <div className="min-h-screen p-8 text-center text-gray-500">게시글을 찾을 수 없습니다.</div>;
  }

  return (
    <main className="min-h-screen p-8 mx-auto">
      {/* Back Button */}
      <button
        onClick={() => router.push("/faq")}
        className="flex items-center text-gray-400 hover:text-white transition-colors mb-8 group"
      >
        <ChevronLeft className="w-5 h-5 mr-1 group-hover:-translate-x-1 transition-transform" />
        뒤로 가기
      </button>

      {/* Header */}
      <header className="mb-8 border-b border-white/10 pb-8">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold text-white mb-4">{faq.title}</h1>
        </div>
        <div className="flex items-center gap-3 text-gray-500">
          <span>{getAuthorName(faq.profiles)}</span>
          <span className="w-1 h-1 rounded-full bg-gray-700" />
          <span>{formatDate(faq.created_at)}</span>
        </div>
      </header>

      {/* Content */}
      <div
        className="prose prose-invert max-w-none text-gray-300 leading-relaxed min-h-[200px]"
        dangerouslySetInnerHTML={{ __html: faq.content }}
      />
    </main>
  );
}
