import { useState, useCallback, useMemo, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

export interface LectureBoardPost {
  id: number;
  title: string;
  content: string | null;
  category: string;
  published_at: string | null;
  author_name: string | null;
}

export const BOARD_CATEGORY_LABELS: Record<string, string> = {
  notice: "공지",
  question: "질문",
  general: "일반",
  column: "칼럼",
};

function resolveId(id: string | string[] | undefined): number | null {
  const raw = Array.isArray(id) ? id[0] : id;
  const n = Number(raw);
  return isNaN(n) ? null : n;
}

export function useLectureBoard(
  lectureId: string | string[] | undefined,
  category = ""
) {
  const supabase = useMemo(() => createClient(), []);
  const id = resolveId(lectureId);
  const [posts, setPosts] = useState<LectureBoardPost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      let query = supabase
        .from("lecture_board_posts")
        .select("id, title, content, category, published_at, author_id")
        .eq("lecture_id", id)
        .eq("is_published", true)
        .order("published_at", { ascending: false });

      if (category) query = query.eq("category", category);

      const { data, error } = await query;
      if (error) throw error;

      const authorIds = [...new Set((data ?? []).map((p: any) => p.author_id))];
      let profileMap: Record<string, string> = {};

      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("user_profiles")
          .select("user_id, display_name, name")
          .in("user_id", authorIds);
        (profiles ?? []).forEach((p: any) => {
          profileMap[p.user_id] = p.display_name || p.name || "탈퇴한 유저";
        });
      }

      setPosts(
        (data ?? []).map((p: any) => ({
          id: p.id,
          title: p.title,
          content: p.content,
          category: p.category ?? "general",
          published_at: p.published_at,
          author_name: profileMap[p.author_id] ?? null,
        }))
      );
    } catch (e) {
      console.error("useLectureBoard:", e);
    } finally {
      setLoading(false);
    }
  }, [id, category, supabase]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return { posts, loading };
}
