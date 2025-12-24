import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

export interface Review {
  id: number;
  title: string;
  created_at: string;
  view_count: number;
  is_pinned: boolean;
  user_id: string;
  profiles: {
    display_name: string | null;
    name: string | null;
  } | null;
  review_comments: { count: number }[];
}

const ITEMS_PER_PAGE = 10;

export function useReviews(initialPage: number = 1) {
  const [pinnedReviews, setPinnedReviews] = useState<Review[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(initialPage);
  const [keyword, setKeyword] = useState("");

  const supabase = createClient();

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      // 1. 고정 게시글 가져오기
      const { data: pinnedData } = await supabase
        .from("reviews")
        .select(
          `
          *,
          profiles:user_id (display_name, name),
          review_comments (count)
        `
        )
        .eq("is_pinned", true)
        .order("created_at", { ascending: false });

      if (pinnedData) {
        setPinnedReviews(pinnedData as any);
      }

      // 2. 일반 게시글 가져오기
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from("reviews")
        .select(
          `
          *,
          profiles:user_id (display_name, name),
          review_comments (count)
        `,
          { count: "exact" }
        )
        .eq("is_pinned", false)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (keyword) {
        query = query.ilike("title", `%${keyword}%`);
      }

      const { data, count, error } = await query;

      if (error) throw error;

      if (data) {
        setReviews(data as any);
      }
      if (count !== null) {
        setTotalCount(count);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  }, [page, keyword]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  return {
    pinnedReviews,
    reviews,
    totalCount,
    loading,
    page,
    setPage,
    keyword,
    setKeyword,
    fetchReviews,
    totalPages: Math.ceil(totalCount / ITEMS_PER_PAGE),
  };
}
