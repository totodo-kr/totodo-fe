"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Loader2, AlertCircle, ShoppingBag, ReceiptText } from "lucide-react";

type ConfirmStatus = "pending" | "success" | "error";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();

  const paymentKey = searchParams.get("paymentKey") ?? "";
  const orderId = searchParams.get("orderId") ?? "";
  const amount = searchParams.get("amount") ?? "";

  const [status, setStatus] = useState<ConfirmStatus>("pending");
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // order info from sessionStorage (set on checkout page)
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [orderId_db, setOrderIdDb] = useState<string | null>(null);

  const confirmedRef = useRef(false);

  useEffect(() => {
    // Retrieve order info stored before Toss redirect
    const storedOrderNumber = sessionStorage.getItem("pending_order_number");
    const storedOrderId = sessionStorage.getItem("pending_order_id");
    setOrderNumber(storedOrderNumber);
    setOrderIdDb(storedOrderId);

    if (!paymentKey || !orderId || !amount) {
      setStatus("error");
      setErrorMessage("결제 정보가 올바르지 않습니다.");
      return;
    }

    if (confirmedRef.current) return;
    confirmedRef.current = true;

    async function confirmPayment() {
      try {
        const res = await fetch("/api/payment/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount: Number(amount),
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error ?? "결제 확인에 실패했습니다.");
        }

        setPaymentMethod(data.method ?? null);
        setStatus("success");

        // Clear session storage
        sessionStorage.removeItem("pending_order_number");
        sessionStorage.removeItem("pending_order_id");
      } catch (err) {
        console.error("Payment confirm error:", err);
        setErrorMessage(
          err instanceof Error ? err.message : "결제 처리 중 오류가 발생했습니다."
        );
        setStatus("error");
      }
    }

    confirmPayment();
  }, [paymentKey, orderId, amount]);

  // ─── Pending ────────────────────────────────────────────────────────────────
  if (status === "pending") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6">
        <div className="bg-zinc-900 rounded-2xl border border-white/10 p-12 flex flex-col items-center gap-5 max-w-md w-full mx-4">
          <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
          <h1 className="text-xl font-bold text-white">결제 확인 중...</h1>
          <p className="text-gray-400 text-sm text-center">
            결제가 완료되었는지 확인하고 있습니다. 잠시만 기다려주세요.
          </p>
        </div>
      </main>
    );
  }

  // ─── Error ───────────────────────────────────────────────────────────────────
  if (status === "error") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
        <div className="bg-zinc-900 rounded-2xl border border-white/10 p-12 flex flex-col items-center gap-5 max-w-md w-full">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">결제 확인 실패</h1>
          <p className="text-gray-400 text-sm text-center">
            {errorMessage ?? "결제 처리 중 오류가 발생했습니다."}
          </p>
          <div className="flex flex-col gap-3 w-full mt-2">
            <Link
              href="/shop/checkout"
              className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-bold text-center transition-colors"
            >
              다시 시도하기
            </Link>
            <Link
              href="/shop/cart"
              className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium text-center transition-colors"
            >
              장바구니로 돌아가기
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ─── Success ─────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 py-16">
      <div className="bg-zinc-900 rounded-2xl border border-white/10 p-10 flex flex-col items-center gap-6 max-w-md w-full">
        {/* Success icon */}
        <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-green-400" />
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">결제가 완료되었습니다!</h1>
          <p className="text-gray-400 text-sm">
            주문이 성공적으로 접수되었습니다.
          </p>
        </div>

        {/* Order info */}
        <div className="w-full bg-black/30 rounded-xl p-5 space-y-3">
          {orderNumber && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">주문번호</span>
              <span className="text-white font-medium">{orderNumber}</span>
            </div>
          )}
          {paymentMethod && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">결제 수단</span>
              <span className="text-white font-medium">{paymentMethod}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">결제 금액</span>
            <span className="text-brand-500 font-bold">
              {Number(amount).toLocaleString()}원
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 w-full">
          {orderId_db && (
            <Link
              href={`/settings/purchases`}
              className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-bold text-center transition-colors flex items-center justify-center gap-2"
            >
              <ReceiptText size={18} />
              주문 내역 확인하기
            </Link>
          )}
          <Link
            href="/shop"
            className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium text-center transition-colors flex items-center justify-center gap-2"
          >
            <ShoppingBag size={18} />
            쇼핑 계속하기
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        </main>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
