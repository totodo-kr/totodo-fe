import { useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

export interface AdminLectureReview {
  id: string;
  lecture_id: number;
  user_id: string;
  rating: number;
  content: string | null;
  is_pinned: boolean;
  is_hidden: boolean;
  created_at: string;
  profiles: {
    display_name: string | null;
    name: string | null;
  } | null;
}

const PAGE_SIZE = 15;
const MAX_PINS = 2;

export function useAdminLectureReviews(lectureId: number | string) {
  const [reviews, setReviews] = useState<AdminLectureReview[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const fetchReviews = useCallback(
    async (page = 1, keyword = "") => {
      if (!lectureId) return;
      setLoading(true);
      const supabase = createClient();
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("lecture_reviews")
        .select("id, lecture_id, user_id, rating, content, is_pinned, is_hidden, created_at", { count: "exact" })
        .eq("lecture_id", lectureId)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (keyword.trim()) {
        query = query.ilike("content", `%${keyword.trim()}%`);
      }

      const { data, count } = await query;
      const rows = (data ?? []) as Omit<AdminLectureReview, "profiles">[];

      // profiles 별도 조회
      const userIds = [...new Set(rows.map((r) => r.user_id))];
      let profileMap: Record<string, { display_name: string | null; name: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, display_name, name")
          .in("id", userIds);
        profileMap = Object.fromEntries(
          (profileData ?? []).map((p: { id: string; display_name: string | null; name: string | null }) => [
            p.id,
            { display_name: p.display_name, name: p.name },
          ])
        );
      }

      setReviews(rows.map((r) => ({ ...r, profiles: profileMap[r.user_id] ?? null })));
      setTotal(count ?? 0);
      setLoading(false);
    },
    [lectureId]
  );

  const togglePin = async (
    reviewId: string,
    current: boolean
  ): Promise<{ ok: boolean; limitReached?: boolean }> => {
    const supabase = createClient();
    setPendingId(reviewId);

    if (!current) {
      const { count } = await supabase
        .from("lecture_reviews")
        .select("id", { count: "exact", head: true })
        .eq("lecture_id", lectureId)
        .eq("is_pinned", true);

      if ((count ?? 0) >= MAX_PINS) {
        setPendingId(null);
        return { ok: false, limitReached: true };
      }
    }

    const { error } = await supabase
      .from("lecture_reviews")
      .update({ is_pinned: !current })
      .eq("id", reviewId);

    if (!error) {
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, is_pinned: !current } : r))
      );
    }
    setPendingId(null);
    return { ok: !error };
  };

  const toggleHide = async (reviewId: string, current: boolean): Promise<boolean> => {
    const supabase = createClient();
    setPendingId(reviewId);

    const { error } = await supabase
      .from("lecture_reviews")
      .update({ is_hidden: !current })
      .eq("id", reviewId);

    if (!error) {
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, is_hidden: !current } : r))
      );
    }
    setPendingId(null);
    return !error;
  };

  const deleteReview = async (reviewId: string): Promise<boolean> => {
    const supabase = createClient();
    const { error } = await supabase.from("lecture_reviews").delete().eq("id", reviewId);
    if (!error) {
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      setTotal((prev) => prev - 1);
    }
    return !error;
  };

  return { reviews, total, loading, pendingId, fetchReviews, togglePin, toggleHide, deleteReview };
}
