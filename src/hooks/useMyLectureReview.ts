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

    const { data } = await supabase
      .from("lecture_reviews")
      .select("id, rating, content, is_hidden")
      .eq("lecture_id", lectureId)
      .eq("user_id", userId)
      .maybeSingle();

    setMyReview(data as MyLectureReview | null);
    setLoading(false);
  }, [lectureId, userId]);

  const submitReview = async (rating: number, content: string): Promise<{ ok: boolean; error?: string }> => {
    if (!lectureId || !userId) return { ok: false, error: "로그인이 필요합니다." };
    const supabase = createClient();

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
