"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useMyPurchasedLectures } from "@/hooks/useLecture";
import LoadingSpinner from "@/components/LoadingSpinner";
import { LECTURE_CANCEL_PROGRESS_PERCENT } from "@/lib/fulfillment/cancelPolicy";

const PROGRESS_BLOCK_MESSAGE = `강의 진척률이 ${LECTURE_CANCEL_PROGRESS_PERCENT}%를 초과하여 취소할 수 없습니다.`;

const CANCEL_BUTTON_CLASS =
  "self-start px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
const CANCEL_BUTTON_STYLE = {
  background: "rgba(198, 69, 69, 0.12)",
  color: "#c64545",
  border: "1px solid rgba(198, 69, 69, 0.25)",
};

export default function PurchasedPage() {
  const { lectures, loading } = useMyPurchasedLectures();
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [cancelledIds, setCancelledIds] = useState<Set<number>>(new Set());

  const handleFreeCancel = async (e: React.MouseEvent, enrollmentId: number) => {
    e.preventDefault();
    if (!confirm("수강을 취소하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;

    setCancellingId(enrollmentId);
    try {
      const res = await fetch("/api/enroll/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCancelledIds((prev) => new Set(prev).add(enrollmentId));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "수강 취소에 실패했습니다.");
    } finally {
      setCancellingId(null);
    }
  };

  const visibleLectures = lectures.filter((l) => !cancelledIds.has(l.enrollment_id));

  return (
    <>
      <h1 className="text-4xl font-bold text-white mb-12">구매한 클래스</h1>

      {loading ? (
        <LoadingSpinner className="py-24" />
      ) : visibleLectures.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <p className="text-gray-500 text-center">구매한 클래스가 없습니다.</p>
          <p className="text-gray-500 text-center">지금 바로 클래스를 구매해보세요!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          {visibleLectures.map((lecture) => {
            const progressBlocked = lecture.progress > LECTURE_CANCEL_PROGRESS_PERCENT;

            return (
              <div key={lecture.id} className="flex flex-col gap-4">
                <Link href={`/academy/${lecture.id}`} className="group cursor-pointer">
                  <div className="relative overflow-hidden rounded-2xl w-full aspect-[750/450] bg-zinc-800 border border-white/5">
                    {lecture.thumbnail_url && (
                      <Image
                        src={lecture.thumbnail_url}
                        alt={lecture.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  </div>
                  <div className="flex flex-col gap-2 mt-4">
                    <h3 className="text-2xl font-bold text-white group-hover:text-purple-500 transition-colors">
                      {lecture.title}
                    </h3>
                    <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
                      <span>총 {lecture.total_sessions}세션</span>
                      <span className="w-1 h-1 rounded-full bg-gray-500" />
                      <span>{lecture.instructor_name}</span>
                    </div>
                  </div>
                </Link>

                {progressBlocked ? (
                  <button
                    type="button"
                    disabled
                    title={PROGRESS_BLOCK_MESSAGE}
                    className={CANCEL_BUTTON_CLASS}
                    style={CANCEL_BUTTON_STYLE}
                  >
                    수강 취소
                  </button>
                ) : lecture.order_id ? (
                  <Link
                    href={`/settings/purchases/${lecture.order_id}/cancel`}
                    className={CANCEL_BUTTON_CLASS}
                    style={CANCEL_BUTTON_STYLE}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(198,69,69,0.22)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(198,69,69,0.12)"; }}
                  >
                    수강 취소
                  </Link>
                ) : (
                  <button
                    onClick={(e) => handleFreeCancel(e, lecture.enrollment_id)}
                    disabled={cancellingId === lecture.enrollment_id}
                    className={CANCEL_BUTTON_CLASS}
                    style={CANCEL_BUTTON_STYLE}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(198,69,69,0.22)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(198,69,69,0.12)"; }}
                  >
                    {cancellingId === lecture.enrollment_id ? "처리 중…" : "수강 취소"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
