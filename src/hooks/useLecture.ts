import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";

// =============================================
// Types
// =============================================

export interface LectureCard {
  id: number;
  title: string;
  subtitle: string | null;
  thumbnail_url: string | null;
  price: number;
  total_sessions: number;
  instructor_name: string | null;
  instructor_avatar: string | null;
}

export interface LectureDetail {
  id: number;
  title: string;
  subtitle: string | null;
  description: string | null;
  thumbnail_url: string | null;
  price: number;
  instructor_name: string | null;
  instructor_avatar: string | null;
}

export interface LectureChapter {
  id: number;
  title: string;
  order_index: number;
  sessions: LectureSessionItem[];
}

export interface LectureSessionItem {
  id: number;
  title: string;
  duration_seconds: number;
  order_index: number;
  is_preview: boolean;
  has_attachment: boolean;
}

export interface BoardPost {
  id: number;
  title: string;
  content: string | null;
  published_at: string;
  author_name: string | null;
}

export interface EnrolledLectureCard extends LectureCard {
  enrolled_at: string;
  progress: number;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// =============================================
// Internal: profiles 조회
// =============================================

type ProfileMap = Record<string, { display_name: string | null; name: string | null; avatar_url: string | null }>;

async function fetchProfiles(
  supabase: ReturnType<typeof createClient>,
  userIds: string[]
): Promise<ProfileMap> {
  if (userIds.length === 0) return {};
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, name, avatar_url")
    .in("id", [...new Set(userIds)]);
  return Object.fromEntries((data ?? []).map((p: any) => [p.id, p]));
}

function resolveId(id: string | string[] | undefined): string | undefined {
  return Array.isArray(id) ? id[0] : id;
}

function instructorName(profile: ProfileMap[string] | undefined): string | null {
  return profile?.display_name ?? profile?.name ?? null;
}

// =============================================
// useLectures — 강의 목록
// =============================================

export function useLectures() {
  const [lectures, setLectures] = useState<LectureCard[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("lectures")
        .select(`
          id, title, subtitle, thumbnail_url, price,
          instructors!inner(user_id),
          lecture_chapters(lecture_sessions(id))
        `)
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const profileMap = await fetchProfiles(
        supabase,
        (data ?? []).map((l: any) => l.instructors.user_id)
      );

      setLectures(
        (data ?? []).map((l: any) => ({
          id: l.id,
          title: l.title,
          subtitle: l.subtitle,
          thumbnail_url: l.thumbnail_url,
          price: l.price,
          total_sessions: (l.lecture_chapters ?? []).flatMap((c: any) => c.lecture_sessions ?? []).length,
          instructor_name: instructorName(profileMap[l.instructors.user_id]),
          instructor_avatar: profileMap[l.instructors.user_id]?.avatar_url ?? null,
        }))
      );
    } catch (e) {
      console.error("useLectures:", e);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { lectures, loading };
}

// =============================================
// useLecture — 단일 강의 상세
// =============================================

export function useLecture(lectureId: string | string[] | undefined) {
  const [lecture, setLecture] = useState<LectureDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);
  const id = resolveId(lectureId);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("lectures")
        .select(`id, title, subtitle, description, thumbnail_url, price, instructors!inner(user_id)`)
        .eq("id", id)
        .single();

      if (error) throw error;

      const profileMap = await fetchProfiles(supabase, [(data as any).instructors.user_id]);
      const profile = profileMap[(data as any).instructors.user_id];

      setLecture({
        id: data.id,
        title: data.title,
        subtitle: (data as any).subtitle,
        description: (data as any).description,
        thumbnail_url: (data as any).thumbnail_url,
        price: (data as any).price,
        instructor_name: instructorName(profile),
        instructor_avatar: profile?.avatar_url ?? null,
      });
    } catch (e) {
      console.error("useLecture:", e);
    } finally {
      setLoading(false);
    }
  }, [id, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { lecture, loading };
}

// =============================================
// useLectureChapters — 챕터 + 세션 목록
// =============================================

export function useLectureChapters(lectureId: string | string[] | undefined) {
  const [chapters, setChapters] = useState<LectureChapter[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);
  const id = resolveId(lectureId);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("lecture_chapters")
        .select(`
          id, title, order_index,
          lecture_sessions(
            id, title, duration_seconds, order_index, is_preview,
            lecture_session_attachments(id)
          )
        `)
        .eq("lecture_id", id)
        .order("order_index");

      if (error) throw error;

      const mapped: LectureChapter[] = (data ?? []).map((c: any) => ({
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
      }));

      setChapters(mapped);
      setTotalSessions(mapped.flatMap((c) => c.sessions).length);
    } catch (e) {
      console.error("useLectureChapters:", e);
    } finally {
      setLoading(false);
    }
  }, [id, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { chapters, totalSessions, loading };
}

// =============================================
// useBoardPosts — 마호 칼럼 게시글
// =============================================

export function useBoardPosts(lectureId: string | string[] | undefined) {
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);
  const id = resolveId(lectureId);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("lecture_board_posts")
        .select("id, title, content, published_at, author_id")
        .eq("lecture_id", id)
        .eq("is_published", true)
        .order("published_at", { ascending: false });

      if (error) throw error;

      const profileMap = await fetchProfiles(
        supabase,
        (data ?? []).map((p: any) => p.author_id)
      );

      setPosts(
        (data ?? []).map((p: any) => ({
          id: p.id,
          title: p.title,
          content: p.content,
          published_at: p.published_at,
          author_name: instructorName(profileMap[p.author_id]),
        }))
      );
    } catch (e) {
      console.error("useBoardPosts:", e);
    } finally {
      setLoading(false);
    }
  }, [id, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { posts, loading };
}

// =============================================
// useMyLectures — 수강 중 (진도 포함)
// =============================================

export function useMyLectures() {
  const [lectures, setLectures] = useState<EnrolledLectureCard[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);
  const { user } = useAuthStore();

  const fetchData = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("lecture_enrollments")
        .select(`
          enrolled_at,
          lecture:lectures!inner(
            id, title, subtitle, thumbnail_url, price,
            instructors!inner(user_id),
            lecture_chapters(lecture_sessions(id))
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "active");

      if (error) throw error;

      const { data: progressData } = await supabase
        .from("lecture_watch_progress")
        .select("session_id, is_completed")
        .eq("user_id", user.id);

      const completedIds = new Set(
        (progressData ?? []).filter((p: any) => p.is_completed).map((p: any) => p.session_id)
      );

      const profileMap = await fetchProfiles(
        supabase,
        (data ?? []).map((e: any) => e.lecture.instructors.user_id)
      );

      setLectures(
        (data ?? []).map((e: any) => {
          const l = e.lecture;
          const allSessions = (l.lecture_chapters ?? []).flatMap((c: any) => c.lecture_sessions ?? []);
          const total = allSessions.length;
          const completed = allSessions.filter((s: any) => completedIds.has(s.id)).length;
          const profile = profileMap[l.instructors.user_id];
          return {
            id: l.id,
            title: l.title,
            subtitle: l.subtitle,
            thumbnail_url: l.thumbnail_url,
            price: l.price,
            total_sessions: total,
            instructor_name: instructorName(profile),
            instructor_avatar: profile?.avatar_url ?? null,
            enrolled_at: e.enrolled_at,
            progress: total > 0 ? Math.round((completed / total) * 100) : 0,
          };
        })
      );
    } catch (e) {
      console.error("useMyLectures:", e);
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { lectures, loading };
}

// =============================================
// useMyPurchasedLectures — 구매한 클래스
// =============================================

export function useMyPurchasedLectures() {
  const [lectures, setLectures] = useState<LectureCard[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);
  const { user } = useAuthStore();

  const fetchData = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("lecture_enrollments")
        .select(`
          lecture:lectures!inner(
            id, title, subtitle, thumbnail_url, price,
            instructors!inner(user_id),
            lecture_chapters(lecture_sessions(id))
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "active");

      if (error) throw error;

      const profileMap = await fetchProfiles(
        supabase,
        (data ?? []).map((e: any) => e.lecture.instructors.user_id)
      );

      setLectures(
        (data ?? []).map((e: any) => {
          const l = e.lecture;
          const allSessions = (l.lecture_chapters ?? []).flatMap((c: any) => c.lecture_sessions ?? []);
          const profile = profileMap[l.instructors.user_id];
          return {
            id: l.id,
            title: l.title,
            subtitle: l.subtitle,
            thumbnail_url: l.thumbnail_url,
            price: l.price,
            total_sessions: allSessions.length,
            instructor_name: instructorName(profile),
            instructor_avatar: profile?.avatar_url ?? null,
          };
        })
      );
    } catch (e) {
      console.error("useMyPurchasedLectures:", e);
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { lectures, loading };
}

// =============================================
// useMyBookmarks — 북마크
// =============================================

export function useMyBookmarks() {
  const [lectures, setLectures] = useState<LectureCard[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);
  const { user } = useAuthStore();

  const fetchData = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("lecture_bookmarks")
        .select(`
          lecture:lectures!inner(
            id, title, subtitle, thumbnail_url, price,
            instructors!inner(user_id),
            lecture_chapters(lecture_sessions(id))
          )
        `)
        .eq("user_id", user.id);

      if (error) throw error;

      const profileMap = await fetchProfiles(
        supabase,
        (data ?? []).map((b: any) => b.lecture.instructors.user_id)
      );

      setLectures(
        (data ?? []).map((b: any) => {
          const l = b.lecture;
          const allSessions = (l.lecture_chapters ?? []).flatMap((c: any) => c.lecture_sessions ?? []);
          const profile = profileMap[l.instructors.user_id];
          return {
            id: l.id,
            title: l.title,
            subtitle: l.subtitle,
            thumbnail_url: l.thumbnail_url,
            price: l.price,
            total_sessions: allSessions.length,
            instructor_name: instructorName(profile),
            instructor_avatar: profile?.avatar_url ?? null,
          };
        })
      );
    } catch (e) {
      console.error("useMyBookmarks:", e);
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { lectures, loading };
}
