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

    // 1단계: 리뷰 목록 (profiles 조인 없이)
    const { data, count } = await supabase
      .from("lecture_reviews")
      .select("id, lecture_id, user_id, rating, content, is_pinned, created_at", { count: "exact" })
      .eq("lecture_id", lectureId)
      .eq("is_hidden", false)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    const rows = (data ?? []) as Omit<LectureReview, "profiles">[];

    // 2단계: 작성자 profiles 별도 조회 (user_id → profiles.id)
    const userIds = [...new Set(rows.map((r) => r.user_id))];
    let profileMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
    if (userIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);
      profileMap = Object.fromEntries(
        (profileData ?? []).map((p: { id: string; display_name: string | null; avatar_url: string | null }) => [
          p.id,
          { display_name: p.display_name, avatar_url: p.avatar_url },
        ])
      );
    }

    const all: LectureReview[] = rows.map((r) => ({
      ...r,
      profiles: profileMap[r.user_id] ?? null,
    }));

    setPinnedReviews(all.filter((r) => r.is_pinned));
    setReviews(all.filter((r) => !r.is_pinned));
    setTotalCount(count ?? 0);
    setAverageRating(
      all.length > 0
        ? Math.round((all.reduce((s, r) => s + r.rating, 0) / all.length) * 10) / 10
        : 0
    );

    setLoading(false);
  }, [lectureId]);

  return { pinnedReviews, reviews, averageRating, totalCount, loading, fetchReviews };
}
