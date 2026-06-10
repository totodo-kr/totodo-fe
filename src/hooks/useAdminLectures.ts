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

export interface InstructorOption {
  id: number;
  user_id: string;
  display_name: string | null;
  name: string | null;
}

// 강사 목록 조회
export async function fetchInstructorOptions(): Promise<InstructorOption[]> {
  const supabase = createClient();
  const { data: instructors } = await supabase
    .from("instructors")
    .select("id, user_id")
    .order("id");
  if (!instructors?.length) return [];

  const userIds = instructors.map((i: { user_id: string }) => i.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, name")
    .in("id", userIds);

  const profileMap = Object.fromEntries(
    (profiles ?? []).map((p: { id: string; display_name: string | null; name: string | null }) => [p.id, p])
  );

  return instructors.map((i: { id: number; user_id: string }) => ({
    id: i.id,
    user_id: i.user_id,
    display_name: profileMap[i.user_id]?.display_name ?? null,
    name: profileMap[i.user_id]?.name ?? null,
  }));
}

// 강의 등록
export async function createLecture(fields: {
  title: string;
  subtitle: string | null;
  description: string | null;
  price: number;
  instructor_id: number;
}): Promise<{ id: number } | { error: string }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("lectures")
    .insert({ ...fields, is_published: false })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "강의 등록 중 오류가 발생했습니다." };
  return { id: data.id };
}
