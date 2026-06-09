"use client";

import { useEffect, useState, useMemo } from "react";
import { Bookmark } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";

interface Props {
  lectureId: number;
  /** 비로그인 상태로 누를 때 호출 — 상위에서 로그인 모달 처리 */
  onNeedLogin?: () => void;
  /** 북마크 해제 직후 호출 */
  onUnbookmark?: () => void;
  size?: number;
}

export default function BookmarkButton({ lectureId, onNeedLogin, onUnbookmark, size = 22 }: Props) {
  const { user } = useAuthStore();
  const supabase = useMemo(() => createClient(), []);

  const [bookmarked, setBookmarked] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!user) { setBookmarked(false); return; }
    supabase
      .from("lecture_bookmarks")
      .select("id")
      .eq("user_id", user.id)
      .eq("lecture_id", lectureId)
      .maybeSingle()
      .then(({ data }) => setBookmarked(!!data));
  }, [user, lectureId, supabase]);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) { onNeedLogin?.(); return; }
    if (pending) return;

    setPending(true);
    const next = !bookmarked;
    setBookmarked(next); // optimistic

    if (next) {
      const { error } = await supabase
        .from("lecture_bookmarks")
        .insert({ user_id: user.id, lecture_id: lectureId });
      if (error) setBookmarked(false);
    } else {
      const { error } = await supabase
        .from("lecture_bookmarks")
        .delete()
        .eq("user_id", user.id)
        .eq("lecture_id", lectureId);
      if (error) setBookmarked(true);
      else onUnbookmark?.();
    }
    setPending(false);
  };

  return (
    <button
      onClick={handleClick}
      aria-label={bookmarked ? "북마크 해제" : "북마크 추가"}
      className="flex items-center justify-center rounded-full transition-all duration-200"
      style={{
        width: size + 18,
        height: size + 18,
        background: bookmarked ? "rgba(162,0,203,0.85)" : "rgba(0,0,0,0.55)",
        backdropFilter: "blur(6px)",
        border: bookmarked ? "1px solid rgba(162,0,203,0.5)" : "1px solid rgba(255,255,255,0.15)",
        boxShadow: bookmarked ? "0 0 14px rgba(162,0,203,0.45)" : "none",
        opacity: pending ? 0.6 : 1,
      }}
    >
      <Bookmark
        size={size}
        fill={bookmarked ? "white" : "none"}
        stroke="white"
        strokeWidth={2}
      />
    </button>
  );
}
