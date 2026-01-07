"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type TabType = "curriculum" | "overview" | "comments";

export default function WatchPage() {
  const params = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("curriculum");
  const [showControls, setShowControls] = useState(false);

  const courseId = params.id;
  const sessionId = params.sessionId;

  // 임시 데이터
  const courseData = {
    id: courseId,
    title: "오레노 니홍고",
    instructor: "도도토",
  };

  const currentSession = {
    id: sessionId,
    title: "01. 「오리엔테이션」",
    duration: "09:50",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", // 임시 URL
  };

  const curriculum = [
    {
      chapter: "第一章) 자신의 길은 자신이 정한다.",
      sessions: [
        { id: 1, title: "01. 「오리엔테이션」", duration: "09:50", preview: true },
        { id: 2, title: "02. 「슬픈 좋아하니?」", duration: "26:08", locked: false },
        {
          id: 3,
          title: "03. 「일본어 실력에 늘지 않는 느낌이 든다고?」",
          duration: "05:41",
          locked: false,
        },
        { id: 4, title: "04. 「MBTI는 E? 아니면 I?」", duration: "11:05", locked: false },
        {
          id: 5,
          title: "05. 「그럼, 최고의 인조은 뭐야?」",
          duration: "13:11",
          locked: false,
        },
        {
          id: 6,
          title: "06. 「일본어의 문자가 많은 이유, 알고 있니?」",
          duration: "09:47",
          locked: false,
          hasAttachment: true,
        },
        {
          id: 7,
          title: "07. 「도도토류 최고의 단어장。」",
          duration: "08:46",
          locked: false,
        },
        {
          id: 8,
          title: "08. 「일본어의 '감자' 답당 찾자。」",
          duration: "23:35",
          locked: false,
          hasAttachment: true,
        },
        {
          id: 9,
          title: "09. 「스스로 해결하지 못하는 사람이라면, ...」",
          duration: "05:20",
          locked: false,
        },
        {
          id: 10,
          title: "10. 「모든을 모르면, 평생 못주고。」",
          duration: "09:00",
          locked: false,
        },
        {
          id: 11,
          title: "11. 「도도토가 선생님? 아니, 다크시。」",
          duration: "08:00",
          locked: false,
        },
      ],
    },
  ];

  const tabs = [
    { id: "curriculum" as TabType, label: "커리큘럼" },
    { id: "overview" as TabType, label: "개요" },
    { id: "comments" as TabType, label: "댓글" },
  ];

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video Player - Left Side */}
        <div
          className="flex-1 bg-black relative"
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => setShowControls(false)}
        >
          {/* Header */}
          <div
            className={`absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 ${
              showControls ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="pl-4 py-4">
              <button
                onClick={() => router.push(`/academy/${courseId}/curriculums`)}
                className="flex items-center gap-2 text-white hover:text-brand-500 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                <span className="font-bold text-lg">{currentSession.title}</span>
              </button>
            </div>
          </div>

          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
            {/* Video Player Placeholder */}
            <div className="text-center">
              <div className="mb-8 text-6xl text-white/20">오리엔테이션</div>
              <div className="text-2xl text-white/40 mb-4">TOTODO HOLDINGS</div>
              <button className="w-20 h-20 flex items-center justify-center mx-auto rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Video Controls - Overlay */}
          <div
            className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-6 py-4 transition-opacity duration-300 ${
              showControls ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
                <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                    />
                  </svg>
                </button>
                <span className="text-white text-sm">00:00 / {currentSession.duration}</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 text-white text-sm hover:bg-white/10 rounded transition-colors">
                  1.0x
                </button>
                <button className="px-3 py-1 text-white text-sm hover:bg-white/10 rounded transition-colors">
                  자동
                </button>
                <button className="px-3 py-1 text-white text-sm hover:bg-white/10 rounded transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Playlist */}
        <div className="w-[400px] border-l border-white/10 bg-zinc-950 flex flex-col flex-shrink-0">
          {/* Tabs */}
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

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === "curriculum" && (
              <div className="p-4 space-y-4">
                {curriculum.map((chapter, chapterIndex) => (
                  <div key={chapterIndex}>
                    <h3 className="text-sm font-bold text-white mb-2 px-2">{chapter.chapter}</h3>
                    <div className="space-y-1">
                      {chapter.sessions.map((session) => (
                        <Link
                          key={session.id}
                          href={`/academy/${courseId}/session/${session.id}`}
                          className={`block p-3 rounded-lg transition-colors ${
                            Number(sessionId) === session.id
                              ? "bg-zinc-800 border border-brand-500"
                              : "hover:bg-zinc-800/50"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-1">
                              <svg
                                className={`w-5 h-5 ${
                                  Number(sessionId) === session.id
                                    ? "text-brand-500"
                                    : "text-gray-400"
                                }`}
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p
                                  className={`text-sm font-medium truncate ${
                                    Number(sessionId) === session.id
                                      ? "text-white"
                                      : "text-gray-300"
                                  }`}
                                >
                                  {session.title}
                                </p>
                                {session.preview && (
                                  <span className="flex-shrink-0 px-2 py-0.5 bg-brand-500 text-white text-xs font-bold rounded">
                                    미리보기
                                  </span>
                                )}
                                {session.hasAttachment && (
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
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-gray-500">{session.duration}</p>
                                {session.locked && (
                                  <svg
                                    className="w-4 h-4 text-gray-600"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z" />
                                  </svg>
                                )}
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "overview" && (
              <div className="p-4">
                <div className="text-gray-300 text-sm leading-relaxed">
                  <p>강의 개요 내용이 여기에 표시됩니다.</p>
                </div>
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
