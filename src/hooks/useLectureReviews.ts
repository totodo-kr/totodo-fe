import { useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

export interface LectureReview {
  id: string;
  lecture_id: number;
  user_id: string;
  rating: number;
  content: string | null;
  is_pinned: boolean;
  created_at: string;
  profiles: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function useLectureReviews(lectureId: number | string) {
  const [pinnedReviews, setPinnedReviews] = useState<LectureReview[]>([]);
  const [reviews, setReviews] = useState<LectureReview[]>([]);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchReviews = useCallback(async () => {
    if (!lectureId) return;
    setLoading(true);
    const supabase = createClient();

    const { data, count } = await supabase
      .from("lecture_reviews")
      .select(
        `id, lecture_id, user_id, rating, content, is_pinned, created_at,
         profiles:user_id (display_name, avatar_url)`,
        { count: "exact" }
      )
      .eq("lecture_id", lectureId)
      .eq("is_hidden", false)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    const all = (data as unknown as LectureReview[]) ?? [];
    setPinnedReviews(all.filter((r) => r.is_pinned));
    setReviews(all.filter((r) => !r.is_pinned));
    setTotalCount(count ?? 0);

    if (all.length > 0) {
      const avg = all.reduce((sum, r) => sum + r.rating, 0) / all.length;
      setAverageRating(Math.round(avg * 10) / 10);
    } else {
      setAverageRating(0);
    }

    setLoading(false);
  }, [lectureId]);

  return { pinnedReviews, reviews, averageRating, totalCount, loading, fetchReviews };
}
