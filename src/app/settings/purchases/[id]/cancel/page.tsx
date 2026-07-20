"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SettingsLayout from "@/components/SettingsLayout";
import { useAuthStore } from "@/store/useAuthStore";
import { useMyOrders, type MyOrderDetail } from "@/hooks/useMyOrders";
import { useCancelRefund, computeOrderEligibility } from "@/hooks/useCancelRefund";
import { createClient } from "@/utils/supabase/client";
import { fetchLectureProgress } from "@/lib/lecture/progress";

const QUICK_REASONS = ["단순 변심", "다른 상품 구매", "배송 지연", "기타"];

export default function CancelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const orderId = Number(id);

  const { user } = useAuthStore();
  const router = useRouter();
  const { fetchOrderDetail } = useMyOrders();
  const { processing, requestCancel } = useCancelRefund();
  const supabase = useMemo(() => createClient(), []);

  const [order, setOrder] = useState<MyOrderDetail | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [blockReason, setBlockReason] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [submitError, setSubmitError] = useState("");

  const isLectureOrder = order?.order_items.some((item) => item.lecture_id != null) ?? false;
  const pageTitle = isLectureOrder ? "수강 취소" : "주문 취소 신청";
  const submitLabel = isLectureOrder ? "수강 취소" : "취소 신청";

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    setLoadingOrder(true);
    (async () => {
      const data = await fetchOrderDetail(orderId);
      if (!data) {
        if (!cancelled) {
          setBlockReason("주문 정보를 찾을 수 없습니다.");
          setLoadingOrder(false);
        }
        return;
      }

      const lectureItems = data.order_items.filter((item) => item.lecture_id != null);
      const progressByItemId = new Map<number, number>();
      for (const item of lectureItems) {
        const progress = await fetchLectureProgress(supabase, user.id, item.lecture_id!);
        progressByItemId.set(item.id, progress);
      }

      if (cancelled) return;

      const itemsWithProgress = data.order_items.map((item) => ({
        ...item,
        lecture_progress: progressByItemId.get(item.id),
      }));

      setOrder(data);

      const eligibility = computeOrderEligibility(
        {
          status: data.status,
          paid_at: data.paid_at,
          delivered_at: data.shipping_tracking?.delivered_at ?? null,
          order_type: data.order_type,
          refund_status: data.refund_status,
        },
        itemsWithProgress
      );

      if (!eligibility.orderCancelAllowed) {
        setBlockReason(eligibility.orderCancelReason ?? "이 주문은 취소가 불가능한 상태입니다.");
      }

      setLoadingOrder(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, orderId, fetchOrderDetail, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setSubmitError("취소 사유를 입력해 주세요.");
      return;
    }
    setSubmitError("");
    const ok = await requestCancel(orderId, reason.trim());
    if (ok) {
      router.push(`/settings/purchases/${id}?cancelled=1`);
    } else {
      setSubmitError("취소 신청 중 오류가 발생했습니다. 다시 시도해 주세요.");
    }
  };

  return (
    <SettingsLayout title={pageTitle}>
      {loadingOrder ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      ) : blockReason ? (
        <div className="bg-[#1a1a1a] rounded-2xl border border-white/5 p-8 text-center">
          <p className="text-gray-400 mb-2">{blockReason}</p>
          {order && (
            <p className="text-xs text-gray-600 mb-6">
              현재 상태: <span className="text-gray-400">{order.status}</span>
            </p>
          )}
          <button
            onClick={() => router.back()}
            className="px-6 py-2 rounded-full text-sm bg-[#2a2a2a] text-gray-300 hover:bg-[#333] transition-colors"
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

          {/* 빠른 선택 */}
          <div className="bg-[#1a1a1a] rounded-2xl border border-white/5 p-5">
            <p className="text-sm font-medium text-white mb-3">취소 사유 선택</p>
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

            {/* 직접 입력 */}
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="취소 사유를 직접 입력하거나 위에서 선택해 주세요."
              rows={4}
              className="w-full bg-[#252525] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 resize-none outline-none focus:border-brand-500/50 transition-colors"
            />

            {submitError && (
              <p className="mt-2 text-xs text-red-400">{submitError}</p>
            )}
          </div>

          {/* 안내 */}
          <div className="bg-[#1a1a1a] rounded-2xl border border-white/5 p-5">
            <p className="text-xs font-semibold text-gray-400 mb-2">취소 안내</p>
            <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
              {isLectureOrder ? (
                <>
                  <li>강의 진척률이 10%를 초과하면 취소할 수 없습니다.</li>
                  <li>취소 완료 시 수강 등록도 함께 취소됩니다.</li>
                </>
              ) : (
                <>
                  <li>결제 완료 후 배송 전 주문에 한해 취소가 가능합니다.</li>
                  <li>다운로드 상품은 다운로드 이후, 결제 후 24시간이 지나면 취소할 수 없습니다.</li>
                </>
              )}
              <li>취소 처리 완료 후 결제 수단에 따라 환급이 진행됩니다.</li>
              <li>결제 취소는 영업일 기준 3~5일 소요될 수 있습니다.</li>
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
              className="flex-1 h-12 rounded-xl bg-red-700 text-white text-sm font-semibold hover:bg-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  처리 중...
                </>
              ) : (
                submitLabel
              )}
            </button>
          </div>
        </form>
      )}
    </SettingsLayout>
  );
}
