import { useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

export interface AdminReview {
  id: number;
  title: string;
  view_count: number;
  is_pinned: boolean;
  created_at: string;
  user_id: string | null;
  profiles: {
    display_name: string | null;
    name: string | null;
  } | null;
  review_comments: { count: number }[];
}

const PAGE_SIZE = 15;

export function useAdminReviews() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pendingId, setPendingId] = useState<number | null>(null);

  const fetchReviews = useCallback(async (page = 1, keyword = "") => {
    const supabase = createClient();
    setLoading(true);

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("reviews")
      .select(
        `id, title, view_count, is_pinned, created_at, user_id,
         profiles:user_id (display_name, name),
         review_comments (count)`,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (keyword.trim()) {
      query = query.ilike("title", `%${keyword.trim()}%`);
    }

    const { data, count } = await query;
    setReviews((data as unknown as AdminReview[]) ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  }, []);

  const togglePin = async (reviewId: number, current: boolean): Promise<{ ok: boolean; limitReached?: boolean }> => {
    const supabase = createClient();
    setPendingId(reviewId);

    if (!current) {
      const { count } = await supabase
        .from("reviews")
        .select("id", { count: "exact", head: true })
        .eq("is_pinned", true);

      if ((count ?? 0) >= 5) {
        setPendingId(null);
        return { ok: false, limitReached: true };
      }
    }

    const { error } = await supabase
      .from("reviews")
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

  const deleteReview = async (reviewId: number) => {
    const supabase = createClient();
    const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
    if (!error) {
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      setTotal((prev) => prev - 1);
    }
    return !error;
  };

  return { reviews, total, loading, pendingId, fetchReviews, togglePin, deleteReview };
}
