import { useCallback, useState } from "react";
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

const PAGE_SIZE = 10;

type RawReview = Omit<LectureReview, "profiles">;

async function attachProfiles(rows: RawReview[]): Promise<LectureReview[]> {
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  if (userIds.length === 0) return rows.map((r) => ({ ...r, profiles: null }));

  const supabase = createClient();
  const { data: profileData } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", userIds);

  const profileMap = Object.fromEntries(
    (profileData ?? []).map((p: { id: string; display_name: string | null; avatar_url: string | null }) => [
      p.id,
      { display_name: p.display_name, avatar_url: p.avatar_url },
    ])
  );

  return rows.map((r) => ({ ...r, profiles: profileMap[r.user_id] ?? null }));
}

export function useLectureReviews(lectureId: number | string) {
  const [pinnedReviews, setPinnedReviews] = useState<LectureReview[]>([]);
  const [reviews, setReviews] = useState<LectureReview[]>([]);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  // 첫 로드: 고정 리뷰 전체 + 일반 리뷰 첫 페이지(10개) + 평점 집계
  const fetchReviews = useCallback(async () => {
    if (!lectureId) return;
    setLoading(true);
    const supabase = createClient();

    const [{ data: pinnedData }, { data: normalData }, { data: ratingRows, count }] = await Promise.all([
      supabase
        .from("lecture_reviews")
        .select("id, lecture_id, user_id, rating, content, is_pinned, created_at")
        .eq("lecture_id", lectureId)
        .eq("is_hidden", false)
        .eq("is_pinned", true)
        .order("created_at", { ascending: false }),
      supabase
        .from("lecture_reviews")
        .select("id, lecture_id, user_id, rating, content, is_pinned, created_at")
        .eq("lecture_id", lectureId)
        .eq("is_hidden", false)
        .eq("is_pinned", false)
        .order("created_at", { ascending: false })
        .range(0, PAGE_SIZE - 1),
      // 평균 평점/총 개수는 content 없이 rating만 가볍게 전체 조회
      supabase
        .from("lecture_reviews")
        .select("rating", { count: "exact" })
        .eq("lecture_id", lectureId)
        .eq("is_hidden", false),
    ]);

    setPinnedReviews(await attachProfiles((pinnedData ?? []) as RawReview[]));
    setReviews(await attachProfiles((normalData ?? []) as RawReview[]));
    setTotalCount(count ?? 0);
    setAverageRating(
      ratingRows && ratingRows.length > 0
        ? Math.round((ratingRows.reduce((s, r) => s + r.rating, 0) / ratingRows.length) * 10) / 10
        : 0
    );
    setPage(0);
    setHasMore((normalData?.length ?? 0) === PAGE_SIZE);
    setLoading(false);
  }, [lectureId]);

  // 스크롤이 하단에 닿았을 때 다음 10개 추가 로드
  const loadMore = useCallback(async () => {
    if (!lectureId || loadingMore || !hasMore) return;
    setLoadingMore(true);
    const supabase = createClient();
    const nextPage = page + 1;
    const from = nextPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data } = await supabase
      .from("lecture_reviews")
      .select("id, lecture_id, user_id, rating, content, is_pinned, created_at")
      .eq("lecture_id", lectureId)
      .eq("is_hidden", false)
      .eq("is_pinned", false)
      .order("created_at", { ascending: false })
      .range(from, to);

    const rows = await attachProfiles((data ?? []) as RawReview[]);
    setReviews((prev) => [...prev, ...rows]);
    setPage(nextPage);
    setHasMore((data?.length ?? 0) === PAGE_SIZE);
    setLoadingMore(false);
  }, [lectureId, page, hasMore, loadingMore]);

  return {
    pinnedReviews,
    reviews,
    averageRating,
    totalCount,
    loading,
    loadingMore,
    hasMore,
    fetchReviews,
    loadMore,
  };
}
