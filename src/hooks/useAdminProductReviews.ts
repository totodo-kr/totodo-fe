import { useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

export interface AdminProductReview {
  id: number;
  product_id: number;
  user_id: string;
  rating: number;
  title: string | null;
  content: string;
  images: Array<{ url: string }> | null;
  is_verified_purchase: boolean;
  is_visible: boolean;
  helpful_count: number;
  created_at: string;
  profiles: {
    display_name: string | null;
    name: string | null;
  } | null;
}

const PAGE_SIZE = 15;

export function useAdminProductReviews(productId: number | string) {
  const [reviews, setReviews] = useState<AdminProductReview[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pendingId, setPendingId] = useState<number | null>(null);

  const fetchReviews = useCallback(
    async (page = 1, keyword = "") => {
      if (!productId) return;
      setLoading(true);
      const supabase = createClient();
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("product_reviews")
        .select(
          "id, product_id, user_id, rating, title, content, images, is_verified_purchase, is_visible, helpful_count, created_at",
          { count: "exact" }
        )
        .eq("product_id", productId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (keyword.trim()) {
        query = query.ilike("content", `%${keyword.trim()}%`);
      }

      const { data, count } = await query;
      const rows = (data ?? []) as Omit<AdminProductReview, "profiles">[];

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
    [productId]
  );

  const toggleVisible = async (reviewId: number, current: boolean): Promise<boolean> => {
    const supabase = createClient();
    setPendingId(reviewId);

    const { error } = await supabase
      .from("product_reviews")
      .update({ is_visible: !current })
      .eq("id", reviewId);

    if (!error) {
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, is_visible: !current } : r))
      );
    }
    setPendingId(null);
    return !error;
  };

  const deleteReview = async (reviewId: number): Promise<boolean> => {
    const supabase = createClient();
    const { error } = await supabase.from("product_reviews").delete().eq("id", reviewId);
    if (!error) {
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      setTotal((prev) => prev - 1);
    }
    return !error;
  };

  return { reviews, total, loading, pendingId, fetchReviews, toggleVisible, deleteReview };
}
