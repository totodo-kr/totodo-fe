import { useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

export interface AdminLecture {
  id: number;
  title: string;
  subtitle: string | null;
  price: number;
  is_published: boolean;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

const PAGE_SIZE = 15;

export function useAdminLectures() {
  const [lectures, setLectures] = useState<AdminLecture[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pendingId, setPendingId] = useState<number | null>(null);

  const fetchLectures = useCallback(async (page = 1, keyword = "") => {
    const supabase = createClient();
    setLoading(true);

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("lectures")
      .select("id, title, subtitle, price, is_published, thumbnail_url, created_at, updated_at", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (keyword.trim()) {
      query = query.ilike("title", `%${keyword.trim()}%`);
    }

    const { data, count } = await query;
    setLectures(data ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  }, []);

  const togglePublished = async (lectureId: number, current: boolean) => {
    const supabase = createClient();
    setPendingId(lectureId);
    const { error } = await supabase
      .from("lectures")
      .update({ is_published: !current })
      .eq("id", lectureId);

    if (!error) {
      setLectures((prev) =>
        prev.map((l) => (l.id === lectureId ? { ...l, is_published: !current } : l))
      );
    }
    setPendingId(null);
    return !error;
  };

  return { lectures, total, loading, pendingId, fetchLectures, togglePublished };
}
