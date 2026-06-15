"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Package, MapPin, CreditCard, Truck, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useMyOrders, MyOrderDetail } from "@/hooks/useMyOrders";
import PageLoading from "@/components/PageLoading";

const STATUS_LABELS: Record<string, string> = {
  pending: "결제대기",
  paid: "결제완료",
  shipped: "배송중",
  delivered: "배송완료",
  cancelled: "취소",
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: "#3d3d3a", text: "#c8c5bc" },
  paid: { bg: "#1a3a5c", text: "#7eb8f7" },
  shipped: { bg: "#2d1a5c", text: "#c084fc" },
  delivered: { bg: "#1a3d1a", text: "#6ee7b7" },
  cancelled: { bg: "#3d1a1a", text: "#f87171" },
};

const TRACKING_STATUS_LABELS: Record<string, string> = {
  preparing: "배송 준비중",
  shipped: "배송 시작",
  in_transit: "배송중",
  delivered: "배송 완료",
};

const REFUND_STATUS_LABELS: Record<string, string> = {
  requested: "환불 신청됨",
  processing: "환불 처리중",
  completed: "환불 완료",
  rejected: "환불 거절",
};

function formatDate(s: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1a1a1a] rounded-xl border border-white/5 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-white/5">
        <span className="text-gray-400">{icon}</span>
        <h2 className="font-semibold text-white">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-4 text-sm py-1.5">
      <span className="text-gray-500 shrink-0 w-24">{label}</span>
      <span className="text-white text-right">{value}</span>
    </div>
  );
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, isLoading: authLoading } = useAuthStore();
  const router = useRouter();
  const { fetchOrderDetail, detailLoading } = useMyOrders();
  const [order, setOrder] = useState<MyOrderDetail | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    fetchOrderDetail(Number(id)).then((data) => {
      if (!data) setNotFound(true);
      else setOrder(data);
    });
  }, [id, user, fetchOrderDetail]);

  if (authLoading || detailLoading) return <PageLoading variant="top" />;

  if (notFound) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 h-14 mb-6">
            <button onClick={() => router.back()} className="p-2 text-white">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-bold">주문 상세</h1>
          </div>
          <div className="text-center py-20">
            <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-6">주문을 찾을 수 없습니다.</p>
            <Link href="/settings/purchases" className="px-6 py-2 bg-brand-500 text-white rounded-lg font-medium">
              주문 목록으로
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const statusColor = STATUS_COLORS[order.status] ?? STATUS_COLORS.pending;
  const canCancel = order.status === "pending" || order.status === "paid";
  const canRefund = order.status === "delivered" && !order.refund_status;
  const tracking = order.shipping_tracking;

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="relative flex items-center justify-center h-14 mb-6">
          <Link href="/settings/purchases" className="absolute left-0 p-2 text-white">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-lg font-bold">주문 상세</h1>
        </div>

        {/* Order number + status */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="font-mono text-xs text-gray-500 mb-1">{order.order_number}</p>
            <p className="text-sm text-gray-400">{formatDate(order.created_at)}</p>
          </div>
          <span
            className="text-sm px-3 py-1.5 rounded-full font-medium"
            style={{ background: statusColor.bg, color: statusColor.text }}
          >
            {STATUS_LABELS[order.status] ?? order.status}
          </span>
        </div>

        <div className="space-y-4">
          {/* 주문 상품 */}
          <Section icon={<Package className="w-4 h-4" />} title="주문 상품">
            <div className="space-y-3">
              {order.order_items.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-sm">
                  <span className="text-white flex-1 pr-4">{item.product_name}</span>
                  <span className="text-gray-400 shrink-0">
                    {item.product_price.toLocaleString()}원 × {item.quantity}
                  </span>
                  <span className="text-white font-medium ml-4 shrink-0">
                    {item.subtotal.toLocaleString()}원
                  </span>
                </div>
              ))}
            </div>
          </Section>

          {/* 배송 정보 */}
          <Section icon={<MapPin className="w-4 h-4" />} title="배송 정보">
            <InfoRow label="수령인" value={order.recipient_name} />
            <InfoRow label="연락처" value={order.recipient_phone} />
            <InfoRow label="주소" value={`${order.shipping_address}${order.shipping_zipcode ? ` (${order.shipping_zipcode})` : ""}`} />
            {order.shipping_memo && <InfoRow label="배송 메모" value={order.shipping_memo} />}
          </Section>

          {/* 결제 정보 */}
          <Section icon={<CreditCard className="w-4 h-4" />} title="결제 정보">
            <InfoRow label="상품 금액" value={`${order.total_product_price.toLocaleString()}원`} />
            <InfoRow label="배송비" value={`${order.total_shipping_fee.toLocaleString()}원`} />
            {order.total_discount > 0 && (
              <InfoRow
                label="할인"
                value={<span className="text-red-400">-{order.total_discount.toLocaleString()}원</span>}
              />
            )}
            <div className="border-t border-white/10 mt-2 pt-3">
              <InfoRow
                label="최종 결제"
                value={<span className="text-brand-500 font-bold text-base">{order.final_price.toLocaleString()}원</span>}
              />
            </div>
            {order.payment_method && <InfoRow label="결제 수단" value={order.payment_method} />}
            {order.paid_at && <InfoRow label="결제 일시" value={formatDate(order.paid_at)} />}
          </Section>

          {/* 배송 추적 */}
          {tracking && (
            <Section icon={<Truck className="w-4 h-4" />} title="배송 추적">
              {tracking.courier_name && tracking.tracking_number && (
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm">
                    <span className="text-gray-400">{tracking.courier_name} · </span>
                    <span className="font-mono text-white">{tracking.tracking_number}</span>
                  </div>
                  <span
                    className="text-xs px-2.5 py-1 rounded-full"
                    style={{ background: "#1a3d1a", color: "#6ee7b7" }}
                  >
                    {TRACKING_STATUS_LABELS[tracking.status] ?? tracking.status}
                  </span>
                </div>
              )}

              {tracking.tracking_details.length > 0 ? (
                <div className="space-y-0">
                  {[...tracking.tracking_details].reverse().map((detail, idx) => (
                    <div key={idx} className="flex gap-3 relative">
                      <div className="flex flex-col items-center shrink-0">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
                          style={{ background: idx === 0 ? "#cc785c" : "#3d3d3a" }}
                        />
                        {idx < tracking.tracking_details.length - 1 && (
                          <div className="w-px flex-1 bg-white/10 my-1" />
                        )}
                      </div>
                      <div className="pb-4 text-sm">
                        <p className="text-white font-medium">{detail.description}</p>
                        {detail.location && (
                          <p className="text-gray-500 text-xs mt-0.5">{detail.location}</p>
                        )}
                        <p className="text-gray-600 text-xs mt-0.5">{detail.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">배송 추적 정보가 없습니다.</p>
              )}
            </Section>
          )}

          {/* 취소·환불 정보 */}
          {(order.cancel_reason || order.refund_status) && (
            <Section icon={<AlertCircle className="w-4 h-4" />} title="취소·환불 정보">
              {order.cancel_reason && (
                <>
                  <InfoRow label="취소 사유" value={order.cancel_reason} />
                  {order.cancel_requested_at && (
                    <InfoRow label="취소 일시" value={formatDate(order.cancel_requested_at)} />
                  )}
                </>
              )}
              {order.refund_status && (
                <>
                  <InfoRow
                    label="환불 상태"
                    value={
                      <span style={{ color: order.refund_status === "rejected" ? "#f87171" : "#6ee7b7" }}>
                        {REFUND_STATUS_LABELS[order.refund_status] ?? order.refund_status}
                      </span>
                    }
                  />
                  {order.refund_reason && <InfoRow label="환불 사유" value={order.refund_reason} />}
                  {order.refund_amount && (
                    <InfoRow label="환불 금액" value={`${order.refund_amount.toLocaleString()}원`} />
                  )}
                  {order.refund_requested_at && (
                    <InfoRow label="신청 일시" value={formatDate(order.refund_requested_at)} />
                  )}
                  {order.refund_completed_at && (
                    <InfoRow label="완료 일시" value={formatDate(order.refund_completed_at)} />
                  )}
                </>
              )}
            </Section>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-6 pb-10">
          {canCancel && (
            <Link
              href={`/settings/purchases/${order.id}/cancel`}
              className="flex-1 py-3 rounded-xl text-center font-medium text-sm transition-colors"
              style={{ background: "#3d1a1a", color: "#f87171" }}
            >
              취소 신청
            </Link>
          )}
          {canRefund && (
            <Link
              href={`/settings/purchases/${order.id}/refund`}
              className="flex-1 py-3 rounded-xl text-center font-medium text-sm transition-colors"
              style={{ background: "#1a3a5c", color: "#7eb8f7" }}
            >
              환불 신청
            </Link>
          )}
          {tracking?.tracking_number && order.status === "shipped" && (
            <a
              href={`https://search.naver.com/search.naver?query=${tracking.courier_name}+${tracking.tracking_number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-3 rounded-xl text-center font-medium text-sm bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              배송 추적 사이트
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
