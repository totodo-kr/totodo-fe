import { useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

export interface LecturePromotion {
  id: string;
  lecture_id: string;
  name: string;
  price: number;
  start_at: string;
  end_at: string;
  is_active: boolean;
  created_at: string;
}

export interface PromotionInput {
  name: string;
  price: number;
  start_at: string;
  end_at: string;
  is_active: boolean;
}

export function useAdminLecturePromotions(lectureId: string) {
  const [promotions, setPromotions] = useState<LecturePromotion[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const fetchPromotions = useCallback(async () => {
    if (!lectureId) return;
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("lecture_promotions")
      .select("*")
      .eq("lecture_id", lectureId)
      .order("start_at", { ascending: false });
    setPromotions((data as LecturePromotion[]) ?? []);
    setLoading(false);
  }, [lectureId]);

  const createPromotion = async (input: PromotionInput): Promise<{ ok: boolean; error?: string }> => {
    const supabase = createClient();
    const { error } = await supabase
      .from("lecture_promotions")
      .insert({ ...input, lecture_id: lectureId });
    if (!error) await fetchPromotions();
    return { ok: !error, error: error?.message };
  };

  const updatePromotion = async (
    id: string,
    input: Partial<PromotionInput>
  ): Promise<{ ok: boolean; error?: string }> => {
    const supabase = createClient();
    const { error } = await supabase
      .from("lecture_promotions")
      .update(input)
      .eq("id", id);
    if (!error) {
      setPromotions((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...input } : p))
      );
    }
    return { ok: !error, error: error?.message };
  };

  const deletePromotion = async (id: string): Promise<boolean> => {
    const supabase = createClient();
    const { error } = await supabase.from("lecture_promotions").delete().eq("id", id);
    if (!error) setPromotions((prev) => prev.filter((p) => p.id !== id));
    return !error;
  };

  const toggleActive = async (id: string, current: boolean): Promise<boolean> => {
    setPendingId(id);
    const { ok } = await updatePromotion(id, { is_active: !current });
    setPendingId(null);
    return ok;
  };

  return {
    promotions,
    loading,
    pendingId,
    fetchPromotions,
    createPromotion,
    updatePromotion,
    deletePromotion,
    toggleActive,
  };
}
