"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { XCircle, RotateCcw, BookOpen } from "lucide-react";
import { Spinner } from "@/components/ui/atoms";

function AcademyPaymentFailContent() {
  const searchParams = useSearchParams();

  const code = searchParams.get("code") ?? "";
  const message = searchParams.get("message") ?? "알 수 없는 오류가 발생했습니다.";
  const orderId = searchParams.get("orderId") ?? "";

  const lectureId = typeof window !== "undefined"
    ? sessionStorage.getItem("pending_lecture_id")
    : null;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 py-16">
      <div className="bg-zinc-900 rounded-2xl border border-white/10 p-10 flex flex-col items-center gap-6 max-w-md w-full">
        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
          <XCircle className="w-10 h-10 text-red-400" />
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">결제에 실패했습니다</h1>
          <p className="text-sm text-gray-400">결제가 취소되었거나 오류가 발생했습니다.</p>
        </div>

        <div className="w-full bg-black/30 rounded-xl p-5 space-y-3">
          {code && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">오류 코드</span>
              <span className="text-red-400 font-mono text-xs">{code}</span>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <span className="text-gray-400 text-sm">오류 내용</span>
            <p className="text-white text-sm">{decodeURIComponent(message)}</p>
          </div>
          {orderId && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">주문 ID</span>
              <span className="text-gray-500 font-mono text-xs truncate max-w-[200px]">{orderId}</span>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-500 text-center">
          반복적으로 문제가 발생한다면 고객센터로 문의해주세요.
        </p>

        <div className="flex flex-col gap-3 w-full">
          <Link
            href={lectureId ? `/academy/checkout/${lectureId}` : "/academy"}
            className="w-full py-3 rounded-lg font-bold text-center text-white transition-colors flex items-center justify-center gap-2"
            style={{ background: "#a200cb" }}
          >
            <RotateCcw size={18} />
            다시 시도하기
          </Link>
          <Link
            href="/academy"
            className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium text-center transition-colors flex items-center justify-center gap-2"
          >
            <BookOpen size={18} />
            강의 목록으로
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function AcademyPaymentFailPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <Spinner size="xl" />
        </main>
      }
    >
      <AcademyPaymentFailContent />
    </Suspense>
  );
}
