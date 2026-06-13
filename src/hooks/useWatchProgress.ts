import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";

export function useWatchProgress(sessionId: number | null, durationSeconds: number) {
  const [initialSeconds, setInitialSeconds] = useState(0);
  const lastSavedRef = useRef(-1);
  const supabase = useMemo(() => createClient(), []);
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user || !sessionId) return;
    lastSavedRef.current = -1;
    setInitialSeconds(0);
    supabase
      .from("lecture_watch_progress")
      .select("watched_seconds")
      .eq("user_id", user.id)
      .eq("session_id", sessionId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setInitialSeconds(data.watched_seconds);
      });
  }, [user, sessionId, supabase]);

  const saveProgress = useCallback(
    async (seconds: number) => {
      if (!user || !sessionId) return;
      // 5초 간격으로만 저장
      if (Math.abs(seconds - lastSavedRef.current) < 5) return;
      lastSavedRef.current = seconds;

      const isCompleted = durationSeconds > 0 && seconds / durationSeconds >= 0.9;
      await supabase.from("lecture_watch_progress").upsert(
        {
          user_id: user.id,
          session_id: sessionId,
          watched_seconds: Math.floor(seconds),
          is_completed: isCompleted,
          last_watched_at: new Date().toISOString(),
        },
        { onConflict: "user_id,session_id" }
      );
    },
    [user, sessionId, durationSeconds, supabase]
  );

  return { initialSeconds, saveProgress };
}
