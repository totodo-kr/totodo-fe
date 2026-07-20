"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLectureChapters, formatDuration } from "@/hooks/useLecture";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useLectureContext } from "@/contexts/LectureContext";

export default function ChaptersPage() {
  const params = useParams();
  const { chapters, totalSessions, loading } = useLectureChapters(params.id);
  const [openChapters, setOpenChapters] = useState<number[]>([0]);
  const { isEnrolled } = useLectureContext();

  const toggleChapter = (index: number) => {
    setOpenChapters((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">목차</h2>
        {!isEnrolled && (
          <p className="text-gray-400 text-sm">클래스 구매 후 수강이 가능합니다.</p>
        )}
      </div>

      <div className="bg-zinc-900/50 rounded-lg p-4 mb-4">
        <p className="text-gray-300">총 {totalSessions} 세션</p>
      </div>

      {chapters.map((chapter, chapterIndex) => (
        <div key={chapter.id} className="space-y-4">
          <button
            onClick={() => toggleChapter(chapterIndex)}
            className="w-full flex items-center justify-between p-4 bg-zinc-900/50 rounded-lg hover:bg-zinc-900 transition-colors"
          >
            <h3 className="text-xl font-bold text-white text-left">{chapter.title}</h3>
            <svg
              className={`w-6 h-6 text-gray-400 transition-transform duration-200 ${
                openChapters.includes(chapterIndex) ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {openChapters.includes(chapterIndex) && (
            <div className="space-y-2 pl-4">
              {chapter.sessions.map((session) => {
                const isLocked = !session.is_preview && !isEnrolled;
                const rowContent = (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={`font-medium ${isLocked ? "text-gray-500" : "text-white"}`}>
                            {session.title}
                          </p>
                          {session.is_preview && (
                            <span className="px-2 py-0.5 bg-brand-500 text-white text-xs font-bold rounded">
                              미리보기
                            </span>
                          )}
                          {session.has_attachment && (
                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm">{formatDuration(session.duration_seconds)}</p>
                      </div>
                    </div>
                    {isLocked && (
                      <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z" />
                      </svg>
                    )}
                  </>
                );

                if (isLocked) {
                  return (
                    <div
                      key={session.id}
                      aria-disabled="true"
                      className="flex items-center justify-between p-4 bg-zinc-900/30 rounded-lg opacity-50 cursor-not-allowed"
                      onClick={() => alert("수강 신청 후 이용할 수 있습니다.")}
                    >
                      {rowContent}
                    </div>
                  );
                }

                return (
                  <Link
                    key={session.id}
                    href={`/academy/${params.id}/session/${session.id}`}
                    className="flex items-center justify-between p-4 bg-zinc-900/30 rounded-lg hover:bg-zinc-900/50 transition-colors cursor-pointer"
                  >
                    {rowContent}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
