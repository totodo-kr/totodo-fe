import { useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

export interface MyLectureReview {
  id: string;
  rating: number;
  content: string | null;
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
      .select("id, rating, content")
      .eq("lecture_id", lectureId)
      .eq("user_id", userId)
      .maybeSingle();

    setMyReview(data as MyLectureReview | null);
    setLoading(false);
  }, [lectureId, userId]);

  const submitReview = async (rating: number, content: string): Promise<boolean> => {
    if (!lectureId || !userId) return false;
    const supabase = createClient();

    const { error } = await supabase.from("lecture_reviews").insert({
      lecture_id: Number(lectureId),
      user_id: userId,
      rating,
      content: content.trim() || null,
    });

    if (!error) {
      await fetchMyReview();
      return true;
    }
    return false;
  };

  const updateReview = async (rating: number, content: string): Promise<boolean> => {
    if (!myReview) return false;
    const supabase = createClient();

    const { error } = await supabase
      .from("lecture_reviews")
      .update({ rating, content: content.trim() || null })
      .eq("id", myReview.id);

    if (!error) {
      await fetchMyReview();
      return true;
    }
    return false;
  };

  return { myReview, loading, fetchMyReview, submitReview, updateReview };
}
