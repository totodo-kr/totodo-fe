"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useLectureSession } from "@/hooks/useLectureSession";
import { useWatchProgress } from "@/hooks/useWatchProgress";
import { formatDuration } from "@/hooks/useLecture";

type TabType = "curriculum" | "overview" | "comments";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function WatchPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const sessionId = params.sessionId as string;

  const { session, videoSrc, videoType, chapters, loading, locked, isEnrolled } = useLectureSession(courseId, sessionId);
  const { initialSeconds, saveProgress } = useWatchProgress(
    session?.id ?? null,
    session?.duration_seconds ?? 0
  );

  const [activeTab, setActiveTab] = useState<TabType>("curriculum");
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 영상이 바뀔 때 재생 위치 복원
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;
    const onCanPlay = () => {
      if (initialSeconds > 0) video.currentTime = initialSeconds;
    };
    video.addEventListener("canplay", onCanPlay, { once: true });
    return () => video.removeEventListener("canplay", onCanPlay);
  }, [videoSrc, initialSeconds]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    saveProgress(video.currentTime);
  }, [saveProgress]);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    // 완료 강제 저장
    const video = videoRef.current;
    if (video) saveProgress(video.duration);
  }, [saveProgress]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;
    if (video.paused) video.play();
    else video.pause();
  }, [videoSrc]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const t = Number(e.target.value);
    video.currentTime = t;
    setCurrentTime(t);
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  const changeSpeed = useCallback((rate: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSpeedMenu(false);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = playerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen();
    else document.exitFullscreen();
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const tabs: { id: TabType; label: string }[] = [
    { id: "curriculum", label: "커리큘럼" },
    { id: "overview", label: "개요" },
    { id: "comments", label: "댓글" },
  ];

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* ─── 비디오 영역 ─── */}
        {videoType === "youtube" ? (
          /* YouTube: 헤더 바를 iframe 위에 고정 배치해서 겹침 없앰 */
          <div className="flex-1 bg-black flex flex-col">
            <div className="flex-shrink-0 bg-black px-4 py-3 flex items-center gap-2">
              <button
                onClick={() => router.push(`/academy/${courseId}/chapters`)}
                className="flex items-center gap-2 text-white hover:text-brand-500 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="font-bold text-lg">{session?.title ?? ""}</span>
              </button>
            </div>
            <div className="flex-1 relative">
              {videoSrc ? (
                <iframe
                  src={videoSrc}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                  {loading && <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Native: 기존 오버레이 방식 */
          <div
            ref={playerRef}
            className="flex-1 bg-black relative"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => { setShowControls(false); setShowSpeedMenu(false); }}
            onClick={togglePlay}
          >
          {/* 상단 헤더 오버레이 */}
          <div
            className={`absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}
          >
            <div className="pl-4 py-4" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => router.push(`/academy/${courseId}/chapters`)}
                className="flex items-center gap-2 text-white hover:text-brand-500 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="font-bold text-lg">{session?.title ?? ""}</span>
              </button>
            </div>
          </div>

          {/* 비디오 엘리먼트 */}
          {videoSrc && videoType === "native" ? (
            <video
              ref={videoRef}
              src={videoSrc}
              className="absolute inset-0 w-full h-full object-contain"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={handleEnded}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
              {loading ? (
                <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : locked ? (
                <div className="text-center px-6">
                  <svg className="w-14 h-14 mx-auto mb-4 text-white/30" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z" />
                  </svg>
                  <p className="text-white/60 mb-4">수강 신청 후 시청할 수 있는 강의입니다.</p>
                  <Link
                    href={`/academy/${courseId}/information`}
                    className="inline-block px-5 py-2.5 rounded-full text-sm font-bold text-white transition-colors"
                    style={{ background: "#a200cb" }}
                  >
                    강의 소개로 이동
                  </Link>
                </div>
              ) : (
                <div className="text-center">
                  <div className="mb-8 text-5xl text-white/20">{session?.title ?? ""}</div>
                  <div className="text-xl text-white/30">TOTODO HOLDINGS</div>
                </div>
              )}
            </div>
          )}

          {/* 하단 컨트롤 오버레이 — YouTube는 자체 컨트롤 사용 */}
          <div
            className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-6 py-4 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 프로그레스 바 */}
            <div className="mb-3">
              <input
                type="range"
                min={0}
                max={duration || 0}
                value={currentTime}
                step={0.1}
                onChange={handleSeek}
                className="video-progress-range w-full h-1 appearance-none rounded-full cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #9ca3af ${progressPct}%, rgba(255,255,255,0.25) ${progressPct}%)`,
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* 재생/일시정지 */}
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                >
                  {isPlaying ? (
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                {/* 음소거 토글 */}
                <button
                  onClick={toggleMute}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                >
                  {isMuted ? (
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  )}
                </button>

                {/* 재생 시간 */}
                <span className="text-white text-sm tabular-nums">
                  {formatDuration(Math.floor(currentTime))} /{" "}
                  {formatDuration(session?.duration_seconds ?? 0)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* 배속 메뉴 */}
                <div className="relative">
                  <button
                    onClick={() => setShowSpeedMenu((v) => !v)}
                    className="px-3 py-1 text-white text-sm hover:bg-white/10 rounded transition-colors"
                  >
                    {playbackRate}x
                  </button>
                  {showSpeedMenu && (
                    <div className="absolute bottom-full right-0 mb-1 flex flex-col bg-zinc-900 border border-white/10 rounded overflow-hidden z-20">
                      {SPEEDS.map((s) => (
                        <button
                          key={s}
                          onClick={() => changeSpeed(s)}
                          className={`px-4 py-1.5 text-sm text-left hover:bg-white/10 transition-colors ${
                            playbackRate === s ? "text-brand-500" : "text-white"
                          }`}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 전체화면 */}
                <button
                  onClick={toggleFullscreen}
                  className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded transition-colors"
                >
                  {isFullscreen ? (
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
          </div>
        )}

        {/* ─── 오른쪽 사이드바 ─── */}
        <div className="w-[400px] border-l border-white/10 bg-zinc-950 flex flex-col flex-shrink-0">
          <div className="border-b border-white/10">
            <div className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-4 py-3 text-sm font-bold transition-colors ${
                    activeTab === tab.id
                      ? "text-brand-500 border-b-2 border-brand-500"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeTab === "curriculum" && (
              <div className="p-4 space-y-4">
                {loading ? (
                  <div className="flex justify-center py-10">
                    <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  </div>
                ) : (
                  chapters.map((chapter) => (
                    <div key={chapter.id}>
                      <h3 className="text-sm font-bold text-white mb-2 px-2">{chapter.title}</h3>
                      <div className="space-y-1">
                        {chapter.sessions.map((s) => {
                          const isLocked = !s.is_preview && !isEnrolled;
                          const rowClassName = `block p-3 rounded-lg transition-colors ${
                            isLocked
                              ? "opacity-50 cursor-not-allowed"
                              : Number(sessionId) === s.id
                                ? "bg-zinc-800 border border-brand-500"
                                : "hover:bg-zinc-800/50"
                          }`;
                          const rowContent = (
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 mt-1">
                                {isLocked ? (
                                  <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z" />
                                  </svg>
                                ) : (
                                  <svg
                                    className={`w-5 h-5 ${
                                      Number(sessionId) === s.id ? "text-brand-500" : "text-gray-400"
                                    }`}
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p
                                    className={`text-sm font-medium truncate ${
                                      isLocked
                                        ? "text-gray-500"
                                        : Number(sessionId) === s.id
                                          ? "text-white"
                                          : "text-gray-300"
                                    }`}
                                  >
                                    {s.title}
                                  </p>
                                  {s.is_preview && (
                                    <span className="flex-shrink-0 px-2 py-0.5 bg-brand-500 text-white text-xs font-bold rounded">
                                      미리보기
                                    </span>
                                  )}
                                  {s.has_attachment && (
                                    <svg
                                      className="w-4 h-4 text-gray-400 flex-shrink-0"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                                      />
                                    </svg>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500">
                                  {formatDuration(s.duration_seconds)}
                                </p>
                              </div>
                            </div>
                          );

                          if (isLocked) {
                            return (
                              <div
                                key={s.id}
                                aria-disabled="true"
                                className={rowClassName}
                                onClick={() => alert("수강 신청 후 이용할 수 있습니다.")}
                              >
                                {rowContent}
                              </div>
                            );
                          }

                          return (
                            <Link key={s.id} href={`/academy/${courseId}/session/${s.id}`} className={rowClassName}>
                              {rowContent}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "overview" && (
              <div className="p-4">
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {session?.description ?? "강의 개요가 없습니다."}
                </p>
              </div>
            )}

            {activeTab === "comments" && (
              <div className="p-4">
                <div className="text-center py-10">
                  <p className="text-gray-500 text-sm">아직 댓글이 없습니다.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
