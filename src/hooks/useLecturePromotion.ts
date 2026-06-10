import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";

export interface ActivePromotion {
  id: string;
  name: string;
  price: number;
  end_at: string;
}

export function useLecturePromotion(lectureId: string | string[] | undefined) {
  const [promotion, setPromotion] = useState<ActivePromotion | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);
  const id = Array.isArray(lectureId) ? lectureId[0] : lectureId;

  const fetchPromotion = useCallback(async () => {
    if (!id) { setLoading(false); return; }
    setLoading(true);
    const now = new Date().toISOString();
    const { data } = await supabase
      .from("lecture_promotions")
      .select("id, name, price, end_at")
      .eq("lecture_id", id)
      .eq("is_active", true)
      .lte("start_at", now)
      .gte("end_at", now)
      .order("price", { ascending: false })
      .limit(1)
      .maybeSingle();
    setPromotion(data as ActivePromotion | null);
    setLoading(false);
  }, [id, supabase]);

  useEffect(() => { fetchPromotion(); }, [fetchPromotion]);

  return { promotion, loading };
}
