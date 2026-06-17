"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Loader2, AlertCircle, ChevronLeft, CreditCard, Building2, Smartphone, Landmark, BookOpen } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useLecture } from "@/hooks/useLecture";
import { useLecturePromotion } from "@/hooks/useLecturePromotion";
import { useLectureOrder } from "@/hooks/useLectureOrder";

type PaymentMethod = "CARD" | "TRANSFER" | "VIRTUAL_ACCOUNT" | "MOBILE_PHONE";

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { value: "CARD", label: "신용/체크카드", icon: <CreditCard size={18} /> },
  { value: "TRANSFER", label: "계좌이체", icon: <Building2 size={18} /> },
  { value: "VIRTUAL_ACCOUNT", label: "가상계좌", icon: <Landmark size={18} /> },
  { value: "MOBILE_PHONE", label: "휴대폰", icon: <Smartphone size={18} /> },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TossPayment = any;

export default function LectureCheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const lectureId = Array.isArray(params.id) ? params.id[0] : params.id;

  const { user, isLoading: authLoading } = useAuthStore();
  const { lecture, loading: lectureLoading } = useLecture(lectureId);
  const { promotion, loading: promotionLoading } = useLecturePromotion(lectureId);
  const { creating, createLectureOrder } = useLectureOrder();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("CARD");
  const paymentRef = useRef<TossPayment>(null);
  const [paymentReady, setPaymentReady] = useState(false);
  const [paymentInitError, setPaymentInitError] = useState<string | null>(null);
  const [requestingPayment, setRequestingPayment] = useState(false);

  const finalPrice = promotion?.price ?? lecture?.price ?? 0;

  const initTossPayments = useCallback(async () => {
    if (!user) return;
    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
    if (!clientKey) {
      setPaymentInitError("NEXT_PUBLIC_TOSS_CLIENT_KEY 환경변수가 설정되지 않았습니다.");
      return;
    }
    try {
      const { loadTossPayments } = await import("@tosspayments/tosspayments-sdk");
      const tossPayments = await loadTossPayments(clientKey);
      paymentRef.current = tossPayments.payment({ customerKey: user.id });
      setPaymentReady(true);
    } catch (err) {
      console.error("Toss init error:", err);
      setPaymentInitError("결제 모듈 초기화에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
  }, [user]);

  useEffect(() => {
    if (!lectureLoading && !promotionLoading && lecture) {
      initTossPayments();
    }
  }, [lectureLoading, promotionLoading, lecture, initTossPayments]);

  useEffect(() => {
    if (!authLoading && !user) router.push("/");
  }, [authLoading, user, router]);

  async function handlePayment() {
    if (!paymentRef.current || !paymentReady) {
      alert("결제 모듈이 아직 로딩 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    if (!lecture || !lectureId) return;

    setRequestingPayment(true);
    try {
      const result = await createLectureOrder({
        lecture_id: Number(lectureId),
        lecture_title: lecture.title,
        final_price: finalPrice,
      });

      if (!result) {
        alert("주문 생성에 실패했습니다. 다시 시도해주세요.");
        setRequestingPayment(false);
        return;
      }

      sessionStorage.setItem("pending_order_id", String(result.order_id));
      sessionStorage.setItem("pending_order_number", result.order_number);
      sessionStorage.setItem("pending_lecture_id", lectureId);
      sessionStorage.setItem("pending_lecture_title", lecture.title);

      await paymentRef.current.requestPayment({
        method: selectedMethod,
        amount: { currency: "KRW", value: finalPrice },
        orderId: result.order_number,
        orderName: lecture.title,
        successUrl: `${window.location.origin}/academy/payment/success`,
        failUrl: `${window.location.origin}/academy/payment/fail`,
        customerEmail: user?.email ?? undefined,
        customerName: user?.email?.split("@")[0] ?? "수강생",
      });
    } catch (err) {
      console.error("Payment request error:", err);
      setRequestingPayment(false);
    }
  }

  const isLoading = authLoading || lectureLoading || promotionLoading;

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#a200cb" }} />
      </main>
    );
  }

  if (!user || !lecture) return null;

  return (
    <main className="min-h-screen py-12 px-4 sm:px-6">
      <div className="max-w-[1100px] mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-10">
          <Link
            href={`/academy/${lectureId}`}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">수강 결제</h1>
            <p className="text-sm mt-1 text-gray-400">강의 정보를 확인하고 결제를 완료해주세요</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ─── Left: Payment Method ─────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Lecture Info */}
            <section className="bg-zinc-900 rounded-xl border border-white/10 p-6">
              <h2 className="text-xl font-bold text-white mb-5">강의 정보</h2>
              <div className="flex gap-4 items-start">
                {lecture.thumbnail_url ? (
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0 bg-zinc-800">
                    <Image src={lecture.thumbnail_url} alt={lecture.title} fill className="object-cover" />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-xl shrink-0 flex items-center justify-center bg-zinc-800">
                    <BookOpen size={28} className="text-gray-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-lg text-white leading-snug">{lecture.title}</p>
                  {lecture.subtitle && (
                    <p className="text-sm mt-1 text-gray-400">{lecture.subtitle}</p>
                  )}
                  {lecture.instructor_name && (
                    <p className="text-sm mt-2 text-gray-500">강사: {lecture.instructor_name}</p>
                  )}
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <span className="text-xl font-bold text-white">
                      {finalPrice.toLocaleString()}원
                    </span>
                    {promotion && (
                      <>
                        <span className="text-sm line-through text-gray-500">
                          {lecture.price.toLocaleString()}원
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-bold"
                          style={{ background: "#a200cb", color: "#fff" }}
                        >
                          {promotion.name}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Payment Method */}
            <section className="bg-zinc-900 rounded-xl border border-white/10 p-6">
              <h2 className="text-xl font-bold text-white mb-5">결제 수단</h2>

              {paymentInitError ? (
                <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-400 font-medium text-sm">결제 초기화 오류</p>
                    <p className="text-red-400/80 text-xs mt-1">{paymentInitError}</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {PAYMENT_METHODS.map((method) => (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setSelectedMethod(method.value)}
                      className={`flex flex-col items-center justify-center gap-2 py-4 rounded-lg border text-sm font-medium transition-colors ${
                        selectedMethod === method.value
                          ? "border-purple-500 bg-purple-500/10 text-purple-400"
                          : "border-white/10 text-gray-400 hover:border-white/30 hover:text-white"
                      }`}
                    >
                      {method.icon}
                      {method.label}
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* ─── Right: Summary ───────────────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="bg-zinc-900 rounded-xl border border-white/10 p-6 sticky top-20">
              <h2 className="text-xl font-bold text-white mb-5">결제 요약</h2>

              <div className="space-y-2.5 mb-5">
                <div className="flex justify-between text-sm text-gray-400">
                  <span>강의 금액</span>
                  <span>{lecture.price.toLocaleString()}원</span>
                </div>
                {promotion && (
                  <div className="flex justify-between text-sm text-green-400">
                    <span>프로모션 할인 ({promotion.name})</span>
                    <span>-{(lecture.price - promotion.price).toLocaleString()}원</span>
                  </div>
                )}
                <div className="border-t border-white/10 pt-3 flex justify-between">
                  <span className="text-white font-bold">총 결제금액</span>
                  <span className="text-xl font-bold" style={{ color: "#a200cb" }}>
                    {finalPrice.toLocaleString()}원
                  </span>
                </div>
              </div>

              <button
                onClick={handlePayment}
                disabled={creating || requestingPayment || !paymentReady || !!paymentInitError}
                className="w-full py-4 rounded-lg font-bold text-base text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "#a200cb" }}
                onMouseEnter={(e) => { if (!creating && !requestingPayment) (e.currentTarget as HTMLButtonElement).style.background = "#8e00b2"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#a200cb"; }}
              >
                {creating || requestingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  `${finalPrice.toLocaleString()}원 결제하기`
                )}
              </button>

              <p className="mt-3 text-xs text-gray-500 text-center">
                결제 시 이용약관 및 개인정보처리방침에 동의하게 됩니다
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
