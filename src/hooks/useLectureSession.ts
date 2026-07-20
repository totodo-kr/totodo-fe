import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import type { LectureChapter } from "./useLecture";

const STORAGE_BUCKET = "totodo_pub_storage";

export type VideoType = "native" | "youtube";

function parseYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?.*v=([^&]+)/,
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
  ];
  for (const pattern of patterns) {
    const m = url.match(pattern);
    if (m) return m[1];
  }
  return null;
}

export interface LectureSessionFull {
  id: number;
  title: string;
  description: string | null;
  duration_seconds: number;
  is_preview: boolean;
}

function resolveId(id: string | string[] | undefined): string | undefined {
  return Array.isArray(id) ? id[0] : id;
}

export function useLectureSession(
  lectureId: string | string[] | undefined,
  sessionId: string | string[] | undefined
) {
  const { user } = useAuthStore();
  const [session, setSession] = useState<LectureSessionFull | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoType, setVideoType] = useState<VideoType>("native");
  const [chapters, setChapters] = useState<LectureChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const lid = resolveId(lectureId);
  const sid = resolveId(sessionId);

  // 수강 여부 확인 — 커리큘럼 목록의 잠금 아이콘 표시용
  useEffect(() => {
    if (!lid || !user) { setIsEnrolled(false); return; }
    supabase
      .from("lecture_enrollments")
      .select("id")
      .eq("user_id", user.id)
      .eq("lecture_id", lid)
      .eq("status", "active")
      .maybeSingle()
      .then(({ data }) => setIsEnrolled(!!data));
  }, [lid, user, supabase]);

  const fetchData = useCallback(async () => {
    if (!lid || !sid) return;
    setLoading(true);
    setVideoSrc(null);
    setVideoType("native");
    setLocked(false);
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from("lecture_sessions")
        .select("id, title, description, duration_seconds, is_preview")
        .eq("id", sid)
        .single();

      if (sessionError) throw sessionError;
      setSession(sessionData);

      // 영상 URL은 미리보기이거나 수강 등록된 경우에만 서버(RPC)에서 확인 후 반환된다.
      // 클라이언트에서 테이블을 직접 조회해서는 얻을 수 없다 (컬럼 권한 차단).
      const { data: videoRows, error: videoError } = await supabase.rpc("get_session_video", {
        p_session_id: Number(sid),
      });
      if (videoError) throw videoError;

      const videoRow = videoRows?.[0] as
        | { video_url: string | null; video_storage_path: string | null }
        | undefined;

      if (!videoRow) {
        setLocked(true);
      } else if (videoRow.video_storage_path) {
        // 퍼블릭 버킷이므로 Signed URL 불필요 — 퍼블릭 URL 직접 사용
        const { data } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(videoRow.video_storage_path);
        setVideoSrc(data.publicUrl);
        setVideoType("native");
      } else if (videoRow.video_url) {
        const ytId = parseYouTubeId(videoRow.video_url);
        if (ytId) {
          setVideoSrc(`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`);
          setVideoType("youtube");
        } else {
          setVideoSrc(videoRow.video_url);
          setVideoType("native");
        }
      }

      const { data: chaptersData, error: chaptersError } = await supabase
        .from("lecture_chapters")
        .select(
          `id, title, order_index,
           lecture_sessions(
             id, title, duration_seconds, order_index, is_preview,
             lecture_session_attachments(id)
           )`
        )
        .eq("lecture_id", lid)
        .order("order_index");

      if (chaptersError) throw chaptersError;

      setChapters(
        (chaptersData ?? []).map((c: any) => ({
          id: c.id,
          title: c.title,
          order_index: c.order_index,
          sessions: (c.lecture_sessions ?? [])
            .sort((a: any, b: any) => a.order_index - b.order_index)
            .map((s: any) => ({
              id: s.id,
              title: s.title,
              duration_seconds: s.duration_seconds,
              order_index: s.order_index,
              is_preview: s.is_preview,
              has_attachment: (s.lecture_session_attachments ?? []).length > 0,
            })),
        }))
      );
    } catch (e) {
      console.error("useLectureSession:", e);
    } finally {
      setLoading(false);
    }
  }, [lid, sid, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { session, videoSrc, videoType, chapters, loading, locked, isEnrolled };
}
