"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

export interface AdminSession {
  id: number;
  title: string;
  description: string | null;
  video_url: string | null;
  duration_seconds: number;
  order_index: number;
  is_preview: boolean;
}

export interface AdminChapter {
  id: number;
  title: string;
  order_index: number;
  sessions: AdminSession[];
}

export interface AdminLectureInfo {
  id: number;
  title: string;
  subtitle: string | null;
  is_published: boolean;
}

export function useAdminLectureDetail(lectureId: string | undefined) {
  const [info, setInfo] = useState<AdminLectureInfo | null>(null);
  const [chapters, setChapters] = useState<AdminChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const fetchAll = useCallback(async () => {
    if (!lectureId) return;
    setLoading(true);
    try {
      const [lectureRes, chaptersRes] = await Promise.all([
        supabase
          .from("lectures")
          .select("id, title, subtitle, is_published")
          .eq("id", lectureId)
          .single(),
        supabase
          .from("lecture_chapters")
          .select(`
            id, title, order_index,
            lecture_sessions(id, title, description, video_url, duration_seconds, order_index, is_preview)
          `)
          .eq("lecture_id", lectureId)
          .order("order_index"),
      ]);

      if (lectureRes.error) throw lectureRes.error;
      if (chaptersRes.error) throw chaptersRes.error;

      setInfo(lectureRes.data as AdminLectureInfo);
      setChapters(
        (chaptersRes.data ?? []).map((c: any) => ({
          id: c.id,
          title: c.title,
          order_index: c.order_index,
          sessions: (c.lecture_sessions ?? [])
            .sort((a: any, b: any) => a.order_index - b.order_index)
            .map((s: any) => ({
              id: s.id,
              title: s.title,
              description: s.description ?? null,
              video_url: s.video_url ?? null,
              duration_seconds: s.duration_seconds,
              order_index: s.order_index,
              is_preview: s.is_preview,
            })),
        }))
      );
    } catch (e) {
      console.error("useAdminLectureDetail:", e);
    } finally {
      setLoading(false);
    }
  }, [lectureId, supabase]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addChapter = useCallback(async (title: string) => {
    if (!lectureId) return;
    const nextOrder = chapters.length > 0
      ? Math.max(...chapters.map((c) => c.order_index)) + 1
      : 1;
    const { error } = await supabase
      .from("lecture_chapters")
      .insert({ lecture_id: Number(lectureId), title, order_index: nextOrder });
    if (error) throw error;
    await fetchAll();
  }, [chapters, lectureId, supabase, fetchAll]);

  const updateChapter = useCallback(async (chapterId: number, title: string) => {
    const { error } = await supabase
      .from("lecture_chapters")
      .update({ title })
      .eq("id", chapterId);
    if (error) throw error;
    setChapters((prev) =>
      prev.map((c) => (c.id === chapterId ? { ...c, title } : c))
    );
  }, [supabase]);

  const deleteChapter = useCallback(async (chapterId: number) => {
    const { error } = await supabase
      .from("lecture_chapters")
      .delete()
      .eq("id", chapterId);
    if (error) throw error;
    setChapters((prev) => prev.filter((c) => c.id !== chapterId));
  }, [supabase]);

  const addSession = useCallback(async (chapterId: number, title: string) => {
    const chapter = chapters.find((c) => c.id === chapterId);
    const nextOrder =
      chapter && chapter.sessions.length > 0
        ? Math.max(...chapter.sessions.map((s) => s.order_index)) + 1
        : 1;
    const { error } = await supabase
      .from("lecture_sessions")
      .insert({ chapter_id: chapterId, title, order_index: nextOrder, duration_seconds: 0 });
    if (error) throw error;
    await fetchAll();
  }, [chapters, supabase, fetchAll]);

  const updateSession = useCallback(
    async (
      sessionId: number,
      updates: Partial<Pick<AdminSession, "title" | "is_preview" | "video_url" | "duration_seconds">>
    ) => {
      const { error } = await supabase
        .from("lecture_sessions")
        .update(updates)
        .eq("id", sessionId);
      if (error) throw error;
      setChapters((prev) =>
        prev.map((c) => ({
          ...c,
          sessions: c.sessions.map((s) =>
            s.id === sessionId ? { ...s, ...updates } : s
          ),
        }))
      );
    },
    [supabase]
  );

  const deleteSession = useCallback(async (sessionId: number) => {
    const { error } = await supabase
      .from("lecture_sessions")
      .delete()
      .eq("id", sessionId);
    if (error) throw error;
    setChapters((prev) =>
      prev.map((c) => ({
        ...c,
        sessions: c.sessions.filter((s) => s.id !== sessionId),
      }))
    );
  }, [supabase]);

  return {
    info,
    chapters,
    loading,
    fetchAll,
    addChapter,
    updateChapter,
    deleteChapter,
    addSession,
    updateSession,
    deleteSession,
  };
}
