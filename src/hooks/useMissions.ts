import { useState, useCallback, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";

export interface MissionWithSubmission {
  id: string;
  chapter_id: number;
  chapter_title: string;
  chapter_order: number;
  title: string;
  description: string | null;
  due_date: string | null;
  submission: {
    id: string;
    content: string | null;
    file_url: string | null;
    status: "submitted" | "reviewed" | "passed";
    feedback: string | null;
    created_at: string;
  } | null;
}

export function useMissions(lectureId: number | string) {
  const supabase = useMemo(() => createClient(), []);
  const [missions, setMissions] = useState<MissionWithSubmission[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMissions = useCallback(async () => {
    if (!lectureId) return;
    setLoading(true);
    try {
      // 챕터 목록
      const { data: chapters } = await supabase
        .from("lecture_chapters")
        .select("id, title, order_index")
        .eq("lecture_id", lectureId)
        .order("order_index");

      const chapterIds = (chapters ?? []).map((c: any) => c.id);
      if (chapterIds.length === 0) { setMissions([]); setLoading(false); return; }

      // 미션 목록
      const { data: missionData } = await supabase
        .from("lecture_missions")
        .select("id, chapter_id, title, description, due_date")
        .in("chapter_id", chapterIds)
        .order("created_at", { ascending: true });

      const missionIds = (missionData ?? []).map((m: any) => m.id);

      // 내 제출 목록
      let subMap: Record<string, MissionWithSubmission["submission"]> = {};
      if (missionIds.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: subs } = await supabase
            .from("lecture_mission_submissions")
            .select("id, mission_id, content, file_url, status, feedback, created_at")
            .eq("user_id", user.id)
            .in("mission_id", missionIds);
          (subs ?? []).forEach((s: any) => {
            subMap[s.mission_id] = {
              id: s.id,
              content: s.content,
              file_url: s.file_url,
              status: s.status,
              feedback: s.feedback,
              created_at: s.created_at,
            };
          });
        }
      }

      const chapterMap = Object.fromEntries(
        (chapters ?? []).map((c: any) => [c.id, { title: c.title, order_index: c.order_index }])
      );

      setMissions(
        (missionData ?? []).map((m: any) => ({
          id: m.id,
          chapter_id: m.chapter_id,
          chapter_title: chapterMap[m.chapter_id]?.title ?? "",
          chapter_order: chapterMap[m.chapter_id]?.order_index ?? 0,
          title: m.title,
          description: m.description,
          due_date: m.due_date,
          submission: subMap[m.id] ?? null,
        }))
      );
    } catch (e) {
      console.error("useMissions fetchMissions:", e);
    } finally {
      setLoading(false);
    }
  }, [lectureId, supabase]);

  const submitMission = useCallback(
    async (missionId: string, content: string, fileUrl: string | null): Promise<{ ok: boolean; error?: string }> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { ok: false, error: "로그인이 필요합니다." };

        const { error } = await supabase
          .from("lecture_mission_submissions")
          .upsert(
            {
              mission_id: missionId,
              user_id: user.id,
              content: content.trim() || null,
              file_url: fileUrl,
              status: "submitted",
            },
            { onConflict: "mission_id,user_id" }
          );
        if (error) throw error;

        await fetchMissions();
        return { ok: true };
      } catch (e: any) {
        return { ok: false, error: e.message };
      }
    },
    [supabase, fetchMissions]
  );

  const uploadFile = useCallback(
    async (file: File): Promise<{ url: string | null; error?: string }> => {
      try {
        const ext = file.name.split(".").pop();
        const path = `mission-files/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("academy").upload(path, file);
        if (error) throw error;
        const { data } = supabase.storage.from("academy").getPublicUrl(path);
        return { url: data.publicUrl };
      } catch (e: any) {
        return { url: null, error: e.message };
      }
    },
    [supabase]
  );

  return { missions, loading, fetchMissions, submitMission, uploadFile };
}
