import { useState, useCallback, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";

export interface Mission {
  id: string;
  chapter_id: number;
  title: string;
  description: string | null;
  due_date: string | null;
  created_at: string;
  chapter_title?: string;
  submission_count?: number;
}

export interface MissionInput {
  chapter_id: number;
  title: string;
  description: string;
  due_date: string;
}

export type SubmissionStatus = "submitted" | "reviewed" | "passed";

export interface MissionSubmission {
  id: string;
  mission_id: string;
  user_id: string;
  content: string | null;
  file_url: string | null;
  status: SubmissionStatus;
  feedback: string | null;
  created_at: string;
  updated_at: string;
  profiles: { display_name: string | null; name: string | null } | null;
}

export function useAdminMissions(lectureId: string) {
  const supabase = useMemo(() => createClient(), []);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const fetchMissions = useCallback(
    async (chapterId?: number) => {
      if (!lectureId) return;
      setLoading(true);
      try {
        let query = supabase
          .from("lecture_missions")
          .select("id, chapter_id, title, description, due_date, created_at, lecture_chapters(title)")
          .order("created_at", { ascending: true });

        if (chapterId) {
          query = query.eq("chapter_id", chapterId);
        } else {
          // 강의 전체 챕터 필터
          const { data: chapters } = await supabase
            .from("lecture_chapters")
            .select("id")
            .eq("lecture_id", lectureId);
          const chapterIds = (chapters ?? []).map((c: any) => c.id);
          if (chapterIds.length === 0) { setMissions([]); setLoading(false); return; }
          query = query.in("chapter_id", chapterIds);
        }

        const { data, error } = await query;
        if (error) throw error;

        const missionIds = (data ?? []).map((m: any) => m.id);
        let countMap: Record<string, number> = {};
        if (missionIds.length > 0) {
          const { data: subs } = await supabase
            .from("lecture_mission_submissions")
            .select("mission_id")
            .in("mission_id", missionIds);
          (subs ?? []).forEach((s: any) => {
            countMap[s.mission_id] = (countMap[s.mission_id] ?? 0) + 1;
          });
        }

        setMissions(
          (data ?? []).map((m: any) => ({
            id: m.id,
            chapter_id: m.chapter_id,
            title: m.title,
            description: m.description,
            due_date: m.due_date,
            created_at: m.created_at,
            chapter_title: (m.lecture_chapters as any)?.title ?? null,
            submission_count: countMap[m.id] ?? 0,
          }))
        );
      } catch (e) {
        console.error("useAdminMissions fetchMissions:", e);
      } finally {
        setLoading(false);
      }
    },
    [lectureId, supabase]
  );

  const createMission = useCallback(
    async (input: MissionInput): Promise<{ ok: boolean; error?: string }> => {
      try {
        const { error } = await supabase.from("lecture_missions").insert({
          chapter_id: input.chapter_id,
          title: input.title.trim(),
          description: input.description.trim() || null,
          due_date: input.due_date || null,
        });
        if (error) throw error;
        await fetchMissions();
        return { ok: true };
      } catch (e: any) {
        return { ok: false, error: e.message };
      }
    },
    [supabase, fetchMissions]
  );

  const updateMission = useCallback(
    async (id: string, input: MissionInput): Promise<{ ok: boolean; error?: string }> => {
      try {
        const { error } = await supabase
          .from("lecture_missions")
          .update({
            chapter_id: input.chapter_id,
            title: input.title.trim(),
            description: input.description.trim() || null,
            due_date: input.due_date || null,
          })
          .eq("id", id);
        if (error) throw error;
        setMissions((prev) =>
          prev.map((m) =>
            m.id === id
              ? { ...m, ...input, title: input.title.trim(), description: input.description.trim() || null, due_date: input.due_date || null }
              : m
          )
        );
        return { ok: true };
      } catch (e: any) {
        return { ok: false, error: e.message };
      }
    },
    [supabase]
  );

  const deleteMission = useCallback(
    async (id: string): Promise<boolean> => {
      setPendingId(id);
      try {
        const { error } = await supabase.from("lecture_missions").delete().eq("id", id);
        if (error) throw error;
        setMissions((prev) => prev.filter((m) => m.id !== id));
        return true;
      } catch (e) {
        console.error("useAdminMissions deleteMission:", e);
        return false;
      } finally {
        setPendingId(null);
      }
    },
    [supabase]
  );

  return { missions, loading, pendingId, fetchMissions, createMission, updateMission, deleteMission };
}

export function useAdminMissionSubmissions(missionId: string | null) {
  const supabase = useMemo(() => createClient(), []);
  const [submissions, setSubmissions] = useState<MissionSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const fetchSubmissions = useCallback(async () => {
    if (!missionId) { setSubmissions([]); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("lecture_mission_submissions")
        .select("id, mission_id, user_id, content, file_url, status, feedback, created_at, updated_at")
        .eq("mission_id", missionId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const userIds = [...new Set((data ?? []).map((s: any) => s.user_id))];
      let profileMap: Record<string, { display_name: string | null; name: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, name")
          .in("id", userIds);
        (profiles ?? []).forEach((p: any) => {
          profileMap[p.id] = { display_name: p.display_name, name: p.name };
        });
      }

      setSubmissions(
        (data ?? []).map((s: any) => ({
          ...s,
          profiles: profileMap[s.user_id] ?? null,
        }))
      );
    } catch (e) {
      console.error("useAdminMissionSubmissions fetchSubmissions:", e);
    } finally {
      setLoading(false);
    }
  }, [missionId, supabase]);

  const updateSubmission = useCallback(
    async (id: string, status: SubmissionStatus, feedback: string): Promise<{ ok: boolean; error?: string }> => {
      setPendingId(id);
      try {
        const { error } = await supabase
          .from("lecture_mission_submissions")
          .update({ status, feedback: feedback.trim() || null })
          .eq("id", id);
        if (error) throw error;
        setSubmissions((prev) =>
          prev.map((s) => (s.id === id ? { ...s, status, feedback: feedback.trim() || null } : s))
        );
        return { ok: true };
      } catch (e: any) {
        return { ok: false, error: e.message };
      } finally {
        setPendingId(null);
      }
    },
    [supabase]
  );

  return { submissions, loading, pendingId, fetchSubmissions, updateSubmission };
}
