"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SettingsLayout from "@/components/SettingsLayout";
import { useAuthStore } from "@/store/useAuthStore";
import { createClient } from "@/utils/supabase/client";
import { useCancelRefund } from "@/hooks/useCancelRefund";

const QUICK_REASONS = [
  "상품 불량",
  "오배송",
  "상품 설명과 다름",
  "단순 변심 (반품 배송비 발생)",
  "기타",
];

interface OrderSummary {
  id: number;
  order_number: string;
  final_price: number;
  status: string;
  refund_status: string | null;
}

export default function RefundPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const orderId = Number(id);

  const { user } = useAuthStore();
  const router = useRouter();
  const { processing, requestRefund } = useCancelRefund();

  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [notRefundable, setNotRefundable] = useState(false);
  const [reason, setReason] = useState("");
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!user) return;

    const supabase = createClient();
    setLoadingOrder(true);

    supabase
      .from("orders")
      .select("id, order_number, final_price, status, refund_status")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setNotRefundable(true);
        } else if (data.status !== "delivered" || data.refund_status !== null) {
          setOrder(data as OrderSummary);
          setNotRefundable(true);
        } else {
          setOrder(data as OrderSummary);
        }
        setLoadingOrder(false);
      });
  }, [user, orderId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      setSubmitError("환불 사유를 입력해 주세요.");
      return;
    }

    const refundAmount = order?.final_price ?? 0;

    setSubmitError("");
    const ok = await requestRefund(orderId, reason.trim(), refundAmount);
    if (ok) {
      router.push(`/settings/purchases/${id}?refund=1`);
    } else {
      setSubmitError("환불 신청 중 오류가 발생했습니다. 다시 시도해 주세요.");
    }
  };

  return (
    <SettingsLayout title="환불 신청">
      {loadingOrder ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      ) : notRefundable ? (
        <div className="bg-[#1a1a1a] rounded-2xl border border-white/5 p-8 text-center">
          <p className="text-gray-400 mb-2">
            {order
              ? order.refund_status !== null
                ? "이미 환불 신청이 접수되었거나 처리 완료된 주문입니다."
                : "이 주문은 환불 신청이 불가능한 상태입니다."
              : "주문 정보를 찾을 수 없습니다."}
          </p>
          <button
            onClick={() => router.back()}
            className="mt-6 px-6 py-2 rounded-full text-sm bg-[#2a2a2a] text-gray-300 hover:bg-[#333] transition-colors"
          >
            돌아가기
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 주문 요약 */}
          {order && (
            <div className="bg-[#1a1a1a] rounded-2xl border border-white/5 p-5">
              <p className="text-xs text-gray-500 mb-1">주문번호</p>
              <p className="font-mono text-sm text-white mb-3">{order.order_number}</p>
              <p className="text-xs text-gray-500 mb-1">결제금액</p>
              <p className="text-lg font-semibold text-white">
                {order.final_price.toLocaleString()}원
              </p>
            </div>
          )}

          {/* 환불 사유 */}
          <div className="bg-[#1a1a1a] rounded-2xl border border-white/5 p-5">
            <p className="text-sm font-medium text-white mb-3">환불 사유 선택</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {QUICK_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                    reason === r
                      ? "bg-brand-500 border-brand-500 text-white"
                      : "border-white/10 text-gray-400 hover:border-white/30"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="환불 사유를 직접 입력하거나 위에서 선택해 주세요."
              rows={4}
              className="w-full bg-[#252525] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 resize-none outline-none focus:border-brand-500/50 transition-colors"
            />

            {submitError && (
              <p className="mt-2 text-xs text-red-400">{submitError}</p>
            )}
          </div>

          {/* 안내 */}
          <div className="bg-[#1a1a1a] rounded-2xl border border-white/5 p-5">
            <p className="text-xs font-semibold text-gray-400 mb-2">환불 안내</p>
            <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
              <li>배송 완료 후 7일 이내 환불 신청이 가능합니다.</li>
              <li>단순 변심의 경우 반품 배송비(3,000원)가 차감될 수 있습니다.</li>
              <li>환불 승인 후 영업일 기준 3~5일 내 결제 취소가 진행됩니다.</li>
              <li>부분 환불의 경우 관리자 확인 후 처리됩니다.</li>
            </ul>
          </div>

          {/* 버튼 */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 h-12 rounded-xl border border-white/10 text-gray-400 text-sm hover:bg-white/5 transition-colors"
            >
              돌아가기
            </button>
            <button
              type="submit"
              disabled={processing || !reason.trim()}
              className="flex-1 h-12 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  처리 중...
                </>
              ) : (
                "환불 신청"
              )}
            </button>
          </div>
        </form>
      )}
    </SettingsLayout>
  );
}
