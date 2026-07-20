import { useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

export interface MyLectureReview {
  id: string;
  rating: number;
  content: string | null;
  is_hidden: boolean;
}

export function useMyLectureReview(lectureId: number | string, userId: string | undefined) {
  const [myReview, setMyReview] = useState<MyLectureReview | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchMyReview = useCallback(async () => {
    if (!lectureId || !userId) return;
    setLoading(true);
    const supabase = createClient();

    // 과거 마이그레이션 데이터 등으로 동일 유저의 리뷰가 여러 건 존재할 수 있어
    // 가장 최근 1건만 "내 리뷰"로 취급한다 (limit(1) 없이 maybeSingle만 쓰면 다건 시 에러).
    const { data } = await supabase
      .from("lecture_reviews")
      .select("id, rating, content, is_hidden")
      .eq("lecture_id", lectureId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setMyReview(data as MyLectureReview | null);
    setLoading(false);
  }, [lectureId, userId]);

  const submitReview = async (rating: number, content: string): Promise<{ ok: boolean; error?: string }> => {
    if (!lectureId || !userId) return { ok: false, error: "로그인이 필요합니다." };
    const supabase = createClient();

    // DB에는 유저당 1리뷰 제약이 없으므로(마이그레이션 데이터 허용을 위해 제거됨)
    // 신규 작성 시 중복 등록은 앱 레벨에서 막는다.
    const { data: existing } = await supabase
      .from("lecture_reviews")
      .select("id")
      .eq("lecture_id", lectureId)
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return { ok: false, error: "이미 작성한 리뷰가 있습니다." };
    }

    const { error } = await supabase.from("lecture_reviews").insert({
      lecture_id: Number(lectureId),
      user_id: userId,
      rating,
      content: content.trim() || null,
    });

    if (!error) {
      await fetchMyReview();
      return { ok: true };
    }
    console.error("submitReview error:", error);
    return { ok: false, error: error.message };
  };

  const updateReview = async (rating: number, content: string): Promise<{ ok: boolean; error?: string }> => {
    if (!myReview) return { ok: false, error: "수정할 리뷰가 없습니다." };
    const supabase = createClient();

    const { error } = await supabase
      .from("lecture_reviews")
      .update({ rating, content: content.trim() || null })
      .eq("id", myReview.id);

    if (!error) {
      await fetchMyReview();
      return { ok: true };
    }
    console.error("updateReview error:", error);
    return { ok: false, error: error.message };
  };

  return { myReview, loading, fetchMyReview, submitReview, updateReview };
}
