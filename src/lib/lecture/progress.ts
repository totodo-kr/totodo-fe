import type { SupabaseClient } from "@supabase/supabase-js";

export async function fetchLectureProgress(
  supabase: SupabaseClient,
  userId: string,
  lectureId: number
): Promise<number> {
  const { data: chapters } = await supabase
    .from("lecture_chapters")
    .select("lecture_sessions(id)")
    .eq("lecture_id", lectureId);

  const sessionIds = (chapters ?? []).flatMap(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c: any) => (c.lecture_sessions ?? []).map((s: any) => s.id as number)
  );
  if (sessionIds.length === 0) return 0;

  const { data: progress } = await supabase
    .from("lecture_watch_progress")
    .select("id")
    .eq("user_id", userId)
    .eq("is_completed", true)
    .in("session_id", sessionIds);

  return Math.round(((progress ?? []).length / sessionIds.length) * 100);
}
