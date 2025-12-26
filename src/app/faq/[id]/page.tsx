"use client";

import { ChevronLeft, MoreHorizontal } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { useProfile } from "@/hooks/useProfile";

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
  const { user } = useAuthStore();
  const { profile } = useProfile(user);

  const [faq, setFaq] = useState<FaqDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const isAdmin = profile?.role === "admin";

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const handleDelete = async () => {
    if (!user || !isAdmin) {
      alert("삭제 권한이 없습니다.");
      return;
    }
    const confirmed = confirm("정말로 삭제하시겠습니까? 되돌릴 수 없습니다.");
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase.from("faq").delete().eq("id", id);
      if (error) throw error;

      alert("삭제되었습니다.");
      router.push("/faq");
      router.refresh();
    } catch (error) {
      console.error("Error deleting FAQ:", error);
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen p-8 text-center text-gray-500">로딩 중...</div>;
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
          {isAdmin && (
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                aria-label="게시글 메뉴"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-32 rounded-lg border border-white/10 bg-zinc-900 shadow-lg overflow-hidden">
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      router.push(`/faq/${faq.id}/edit`);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-white/5 transition-colors"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      if (!isDeleting) handleDelete();
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    disabled={isDeleting}
                  >
                    {isDeleting ? "삭제 중..." : "삭제"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 text-gray-500">
          <span>{getAuthorName(faq.profiles)}</span>
          <span className="w-1 h-1 rounded-full bg-gray-700" />
          <span>{formatDate(faq.created_at)}</span>
        </div>
      </header>

      {/* Content */}
      <div className="text-gray-300 leading-relaxed whitespace-pre-line text-lg min-h-[200px]">
        {faq.content}
      </div>
    </main>
  );
}
