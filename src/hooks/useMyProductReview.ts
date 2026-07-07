import { useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

export interface MyProductReview {
  id: number;
  rating: number;
  title: string | null;
  content: string;
  images: Array<{ url: string }> | null;
}

export function useMyProductReview(orderItemId: number | undefined, userId: string | undefined) {
  const [myReview, setMyReview] = useState<MyProductReview | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchMyReview = useCallback(async () => {
    if (!orderItemId || !userId) return;
    setLoading(true);
    const supabase = createClient();

    const { data } = await supabase
      .from("product_reviews")
      .select("id, rating, title, content, images")
      .eq("order_item_id", orderItemId)
      .eq("user_id", userId)
      .maybeSingle();

    setMyReview(data as MyProductReview | null);
    setLoading(false);
  }, [orderItemId, userId]);

  const submitReview = async (input: {
    productId: number;
    rating: number;
    title: string;
    content: string;
    images: string[];
  }): Promise<{ ok: boolean; error?: string }> => {
    if (!orderItemId || !userId) return { ok: false, error: "로그인이 필요합니다." };
    const supabase = createClient();

    const { error } = await supabase.from("product_reviews").insert({
      product_id: input.productId,
      order_item_id: orderItemId,
      user_id: userId,
      rating: input.rating,
      title: input.title.trim() || null,
      content: input.content.trim(),
      images: input.images.map((url) => ({ url })),
      is_verified_purchase: true,
    });

    if (!error) {
      await fetchMyReview();
      return { ok: true };
    }
    console.error("submitReview error:", error);
    return { ok: false, error: error.message };
  };

  const updateReview = async (input: {
    rating: number;
    title: string;
    content: string;
    images: string[];
  }): Promise<{ ok: boolean; error?: string }> => {
    if (!myReview) return { ok: false, error: "수정할 리뷰가 없습니다." };
    const supabase = createClient();

    const { error } = await supabase
      .from("product_reviews")
      .update({
        rating: input.rating,
        title: input.title.trim() || null,
        content: input.content.trim(),
        images: input.images.map((url) => ({ url })),
      })
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
