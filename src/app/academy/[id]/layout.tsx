"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useMemo } from "react";
import { useLecture } from "@/hooks/useLecture";
import { useAuthStore } from "@/store/useAuthStore";
import { createClient } from "@/utils/supabase/client";
import LoginModal from "@/components/LoginModal";

export default function LectureLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const lectureId = params.id;
  const lectureIdStr = Array.isArray(lectureId) ? lectureId[0] : (lectureId ?? "");

  const isWatchPage = pathname?.includes("/session/");
  const { lecture } = useLecture(lectureId);
  const { user } = useAuthStore();
  const supabase = useMemo(() => createClient(), []);

  const [isEnrolled, setIsEnrolled] = useState(false);
  const [firstPreviewSessionId, setFirstPreviewSessionId] = useState<number | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // 수강 여부 확인
  useEffect(() => {
    if (!lectureIdStr || !user) { setIsEnrolled(false); return; }
    supabase
      .from("lecture_enrollments")
      .select("id")
      .eq("user_id", user.id)
      .eq("lecture_id", lectureIdStr)
      .eq("status", "active")
      .maybeSingle()
      .then(({ data }) => setIsEnrolled(!!data));
  }, [lectureIdStr, user, supabase]);

  // 첫 번째 미리보기 세션 조회
  useEffect(() => {
    if (!lectureIdStr) return;
    supabase
      .from("lecture_chapters")
      .select("order_index, lecture_sessions(id, is_preview, order_index)")
      .eq("lecture_id", lectureIdStr)
      .order("order_index")
      .then(({ data }) => {
        const sessions = (data ?? [])
          .flatMap((c: any) =>
            (c.lecture_sessions ?? []).map((s: any) => ({ ...s, chapterOrder: c.order_index }))
          )
          .filter((s: any) => s.is_preview)
          .sort((a: any, b: any) => a.chapterOrder - b.chapterOrder || a.order_index - b.order_index);
        setFirstPreviewSessionId(sessions[0]?.id ?? null);
      });
  }, [lectureIdStr, supabase]);

  const handleEnroll = async () => {
    if (!user) { setShowLoginModal(true); return; }
    if (!lecture) return;
    if (lecture.price > 0) {
      alert("유료 강의입니다. 결제 페이지로 이동합니다.");
      return;
    }
    setEnrolling(true);
    try {
      const { error } = await supabase
        .from("lecture_enrollments")
        .insert({ user_id: user.id, lecture_id: Number(lectureIdStr), status: "active" });
      if (error) throw error;
      setIsEnrolled(true);
      router.push(`/academy/${lectureIdStr}/chapters`);
    } catch {
      alert("수강 신청 중 오류가 발생했습니다.");
    } finally {
      setEnrolling(false);
    }
  };

  if (isWatchPage) {
    return <>{children}</>;
  }

  const tabs = [
    { path: `/academy/${lectureId}/information`, label: "강의 소개" },
    { path: `/academy/${lectureId}/chapters`, label: "목차" },
    { path: `/academy/${lectureId}/notices`, label: "강의 공지" },
    { path: `/academy/${lectureId}/board`, label: "마호 칼럼" },
  ];

  const isActive = (path: string) => pathname === path;

  return (
    <div className="min-h-screen">
      <div className="w-full mb-8" style={{ background: "linear-gradient(135deg, #111 0%, #1a0f0f 100%)" }}>
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center gap-10 px-8 py-10">
          {/* Left: text info */}
          <div className="flex-1 flex flex-col justify-center">
            <h1 className="text-4xl font-bold text-white mb-2">{lecture?.title}</h1>
            {lecture?.subtitle && (
              <p className="text-gray-400 text-base mb-2">{lecture.subtitle}</p>
            )}
            <p className="text-gray-400 text-sm mb-6">{lecture?.instructor_name}</p>

            {!isEnrolled && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="px-6 py-2.5 rounded-full text-sm font-bold transition-colors disabled:opacity-50"
                  style={{ background: "#cc785c", color: "#fff" }}
                  onMouseEnter={(e) => { if (!enrolling) (e.currentTarget as HTMLButtonElement).style.background = "#a9583e"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#cc785c"; }}
                >
                  {enrolling ? "처리 중…" : "수강하기"}
                </button>
                {firstPreviewSessionId && (
                  <Link
                    href={`/academy/${lectureIdStr}/session/${firstPreviewSessionId}`}
                    className="px-6 py-2.5 rounded-full text-sm font-bold border border-white/30 text-white transition-colors hover:bg-white/10"
                  >
                    미리보기
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Right: image — no cropping */}
          {lecture?.thumbnail_url && (
            <div
              className="shrink-0 w-full md:w-[420px] rounded-2xl overflow-hidden shadow-2xl"
              style={{ background: "#000" }}
            >
              <Image
                src={lecture.thumbnail_url}
                alt={lecture.title}
                width={420}
                height={560}
                className="w-full h-auto"
                priority
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-8 px-8 pb-16">
        <aside className="w-[200px] shrink-0">
          <nav className="sticky top-8 flex flex-col gap-2">
            {tabs.map((tab) => (
              <Link
                key={tab.path}
                href={tab.path}
                className={`px-4 py-3 text-left text-lg font-bold rounded-lg transition-all ${
                  isActive(tab.path)
                    ? "bg-white text-black"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="flex-1 max-w-[900px]">{children}</div>
      </div>

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </div>
  );
}
