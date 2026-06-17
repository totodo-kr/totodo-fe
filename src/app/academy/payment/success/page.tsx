"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Loader2, AlertCircle, PlayCircle, ReceiptText } from "lucide-react";

type ConfirmStatus = "pending" | "success" | "error";

function AcademyPaymentSuccessContent() {
  const searchParams = useSearchParams();

  const paymentKey = searchParams.get("paymentKey") ?? "";
  const orderId = searchParams.get("orderId") ?? "";
  const amount = searchParams.get("amount") ?? "";

  const [status, setStatus] = useState<ConfirmStatus>("pending");
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lectureId, setLectureId] = useState<string | null>(null);
  const [lectureTitle, setLectureTitle] = useState<string | null>(null);

  const confirmedRef = useRef(false);

  useEffect(() => {
    const storedLectureId = sessionStorage.getItem("pending_lecture_id");
    const storedLectureTitle = sessionStorage.getItem("pending_lecture_title");
    setLectureId(storedLectureId);
    setLectureTitle(storedLectureTitle);

    if (!paymentKey || !orderId || !amount) {
      setStatus("error");
      setErrorMessage("결제 정보가 올바르지 않습니다.");
      return;
    }

    if (confirmedRef.current) return;
    confirmedRef.current = true;

    async function confirmAndEnroll() {
      try {
        // 1. 결제 승인
        const confirmRes = await fetch("/api/payment/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
        });

        const confirmData = await confirmRes.json();
        if (!confirmRes.ok) throw new Error(confirmData.error ?? "결제 확인에 실패했습니다.");

        setPaymentMethod(confirmData.method ?? null);

        // 2. 수강 등록
        const lId = sessionStorage.getItem("pending_lecture_id");
        if (lId) {
          const enrollRes = await fetch("/api/enroll", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lectureId: Number(lId) }),
          });

          if (!enrollRes.ok) {
            const enrollData = await enrollRes.json();
            // 이미 수강 중이면 성공으로 처리
            if (enrollRes.status !== 409) {
              console.error("Enroll error:", enrollData.error);
            }
          }
        }

        sessionStorage.removeItem("pending_order_number");
        sessionStorage.removeItem("pending_order_id");
        sessionStorage.removeItem("pending_lecture_id");
        sessionStorage.removeItem("pending_lecture_title");

        setStatus("success");
      } catch (err) {
        console.error("Payment confirm error:", err);
        setErrorMessage(err instanceof Error ? err.message : "결제 처리 중 오류가 발생했습니다.");
        setStatus("error");
      }
    }

    confirmAndEnroll();
  }, [paymentKey, orderId, amount]);

  if (status === "pending") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6">
        <div className="bg-zinc-900 rounded-2xl border border-white/10 p-12 flex flex-col items-center gap-5 max-w-md w-full mx-4">
          <Loader2 className="w-12 h-12 animate-spin" style={{ color: "#a200cb" }} />
          <h1 className="text-xl font-bold text-white">결제 확인 중...</h1>
          <p className="text-sm text-center text-gray-400">
            결제 완료 및 수강 등록을 처리하고 있습니다. 잠시만 기다려주세요.
          </p>
        </div>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
        <div className="bg-zinc-900 rounded-2xl border border-white/10 p-12 flex flex-col items-center gap-5 max-w-md w-full">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">결제 확인 실패</h1>
          <p className="text-sm text-center text-gray-400">
            {errorMessage ?? "결제 처리 중 오류가 발생했습니다."}
          </p>
          <div className="flex flex-col gap-3 w-full mt-2">
            {lectureId && (
              <Link
                href={`/academy/checkout/${lectureId}`}
                className="w-full py-3 rounded-lg font-bold text-center text-white transition-colors"
                style={{ background: "#a200cb" }}
              >
                다시 시도하기
              </Link>
            )}
            <Link
              href="/academy"
              className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium text-center transition-colors"
            >
              강의 목록으로
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 py-16">
      <div className="bg-zinc-900 rounded-2xl border border-white/10 p-10 flex flex-col items-center gap-6 max-w-md w-full">
        <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-green-400" />
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">수강 등록 완료!</h1>
          <p className="text-sm text-gray-400">결제가 완료되어 수강이 등록되었습니다.</p>
        </div>

        <div className="w-full bg-black/30 rounded-xl p-5 space-y-3">
          {lectureTitle && (
            <div className="flex justify-between text-sm gap-3">
              <span className="text-gray-400 shrink-0">강의명</span>
              <span className="font-medium text-white text-right">{lectureTitle}</span>
            </div>
          )}
          {paymentMethod && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">결제 수단</span>
              <span className="font-medium text-white">{paymentMethod}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">결제 금액</span>
            <span className="font-bold text-lg" style={{ color: "#a200cb" }}>
              {Number(amount).toLocaleString()}원
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 w-full">
          {lectureId && (
            <Link
              href={`/academy/${lectureId}/chapters`}
              className="w-full py-3 rounded-lg font-bold text-center text-white transition-colors flex items-center justify-center gap-2"
              style={{ background: "#a200cb" }}
            >
              <PlayCircle size={18} />
              강의 바로 시작하기
            </Link>
          )}
          <Link
            href="/settings/purchases"
            className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium text-center transition-colors flex items-center justify-center gap-2"
          >
            <ReceiptText size={18} />
            수강 내역 확인하기
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function AcademyPaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#a200cb" }} />
        </main>
      }
    >
      <AcademyPaymentSuccessContent />
    </Suspense>
  );
}
