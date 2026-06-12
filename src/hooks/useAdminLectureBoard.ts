import { useState, useCallback, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";

export interface BoardPost {
  id: number;
  lecture_id: number;
  author_id: string;
  title: string;
  content: string | null;
  category: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  profiles: { display_name: string | null; name: string | null } | null;
}

export interface BoardPostInput {
  title: string;
  content: string;
  category: string;
  is_published: boolean;
}

const PAGE_SIZE = 15;

export function useAdminLectureBoard(lectureId: string) {
  const supabase = useMemo(() => createClient(), []);
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pendingId, setPendingId] = useState<number | null>(null);

  const fetchPosts = useCallback(
    async (page = 1, keyword = "", category = "") => {
      if (!lectureId) return;
      setLoading(true);
      try {
        let query = supabase
          .from("lecture_board_posts")
          .select("id, lecture_id, author_id, title, content, category, is_published, published_at, created_at, updated_at", { count: "exact" })
          .eq("lecture_id", lectureId)
          .order("created_at", { ascending: false })
          .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

        if (keyword.trim()) query = query.ilike("title", `%${keyword.trim()}%`);
        if (category) query = query.eq("category", category);

        const { data, error, count } = await query;
        if (error) throw error;

        const authorIds = [...new Set((data ?? []).map((p: any) => p.author_id))];
        let profileMap: Record<string, { display_name: string | null; name: string | null }> = {};

        if (authorIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, display_name, name")
            .in("id", authorIds);
          (profiles ?? []).forEach((p: any) => {
            profileMap[p.id] = { display_name: p.display_name, name: p.name };
          });
        }

        setPosts(
          (data ?? []).map((p: any) => ({
            ...p,
            profiles: profileMap[p.author_id] ?? null,
          }))
        );
        setTotal(count ?? 0);
      } catch (e) {
        console.error("useAdminLectureBoard fetchPosts:", e);
      } finally {
        setLoading(false);
      }
    },
    [lectureId, supabase]
  );

  const createPost = useCallback(
    async (input: BoardPostInput): Promise<{ ok: boolean; error?: string }> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { ok: false, error: "로그인이 필요합니다." };

        const payload = {
          lecture_id: Number(lectureId),
          author_id: user.id,
          title: input.title.trim(),
          content: input.content.trim(),
          category: input.category,
          is_published: input.is_published,
          published_at: input.is_published ? new Date().toISOString() : null,
        };

        const { error } = await supabase.from("lecture_board_posts").insert(payload);
        if (error) throw error;

        await fetchPosts();
        return { ok: true };
      } catch (e: any) {
        return { ok: false, error: e.message };
      }
    },
    [lectureId, supabase, fetchPosts]
  );

  const updatePost = useCallback(
    async (id: number, input: BoardPostInput): Promise<{ ok: boolean; error?: string }> => {
      try {
        const payload = {
          title: input.title.trim(),
          content: input.content.trim(),
          category: input.category,
          is_published: input.is_published,
          published_at: input.is_published ? new Date().toISOString() : null,
        };

        const { error } = await supabase.from("lecture_board_posts").update(payload).eq("id", id);
        if (error) throw error;

        setPosts((prev) =>
          prev.map((p) =>
            p.id === id ? { ...p, ...payload, updated_at: new Date().toISOString() } : p
          )
        );
        return { ok: true };
      } catch (e: any) {
        return { ok: false, error: e.message };
      }
    },
    [supabase]
  );

  const deletePost = useCallback(
    async (id: number): Promise<boolean> => {
      setPendingId(id);
      try {
        const { error } = await supabase.from("lecture_board_posts").delete().eq("id", id);
        if (error) throw error;
        setPosts((prev) => prev.filter((p) => p.id !== id));
        setTotal((prev) => prev - 1);
        return true;
      } catch (e) {
        console.error("useAdminLectureBoard deletePost:", e);
        return false;
      } finally {
        setPendingId(null);
      }
    },
    [supabase]
  );

  const togglePublish = useCallback(
    async (id: number, current: boolean): Promise<boolean> => {
      setPendingId(id);
      try {
        const newVal = !current;
        const { error } = await supabase
          .from("lecture_board_posts")
          .update({
            is_published: newVal,
            published_at: newVal ? new Date().toISOString() : null,
          })
          .eq("id", id);
        if (error) throw error;
        setPosts((prev) =>
          prev.map((p) =>
            p.id === id ? { ...p, is_published: newVal } : p
          )
        );
        return true;
      } catch (e) {
        console.error("useAdminLectureBoard togglePublish:", e);
        return false;
      } finally {
        setPendingId(null);
      }
    },
    [supabase]
  );

  return { posts, total, loading, pendingId, fetchPosts, createPost, updatePost, deletePost, togglePublish };
}
