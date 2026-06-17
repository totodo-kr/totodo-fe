"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Package, MapPin, CreditCard, Truck, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import PageLoading from "@/components/PageLoading";
import SettingsLayout from "@/components/SettingsLayout";
import { useMyOrders, type MyOrderDetail } from "@/hooks/useMyOrders";

/* ─── helpers ─────────────────────────────────────────────── */

function formatPrice(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

function formatDate(iso: string | null | undefined, withTime = false) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

const STATUS_LABEL: Record<string, string> = {
  pending: "결제대기",
  paid: "결제완료",
  shipped: "배송중",
  delivered: "배송완료",
  cancelled: "취소",
};

const STATUS_CLASS: Record<string, string> = {
  pending: "bg-gray-600 text-gray-200",
  paid: "bg-blue-600 text-blue-100",
  shipped: "bg-purple-600 text-purple-100",
  delivered: "bg-green-600 text-green-100",
  cancelled: "bg-red-600 text-red-100",
};

const TRACKING_STATUS_LABEL: Record<string, string> = {
  preparing: "배송 준비중",
  shipped: "발송 완료",
  in_transit: "배송중",
  delivered: "배송 완료",
};

const TRACKING_STATUS_CLASS: Record<string, string> = {
  preparing: "bg-gray-600 text-gray-200",
  shipped: "bg-blue-600 text-blue-100",
  in_transit: "bg-purple-600 text-purple-100",
  delivered: "bg-green-600 text-green-100",
};

const REFUND_STATUS_LABEL: Record<string, string> = {
  requested: "환불 신청됨",
  processing: "환불 처리중",
  completed: "환불 완료",
  rejected: "환불 거절",
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  card: "신용카드",
  virtual_account: "가상계좌",
  transfer: "계좌이체",
  phone: "휴대폰 소액결제",
};

/* ─── section wrapper ──────────────────────────────────────── */

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#1a1a1a] rounded-xl border border-white/5 p-5 mb-4">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/5">
        <span className="text-brand-400">{icon}</span>
        <h2 className="text-white font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-4 py-1.5">
      <span className="text-gray-500 text-sm shrink-0">{label}</span>
      <span className="text-gray-200 text-sm text-right">{value}</span>
    </div>
  );
}

/* ─── tracking timeline ────────────────────────────────────── */

function TrackingTimeline({
  details,
}: {
  details: Array<{ time: string; location: string; description: string }>;
}) {
  if (!details || details.length === 0) {
    return <p className="text-gray-500 text-sm">배송 추적 정보가 없습니다.</p>;
  }

  return (
    <div className="relative pl-5">
      {details.map((d, i) => (
        <div key={i} className="relative pb-5 last:pb-0">
          {i < details.length - 1 && (
            <span className="absolute left-[-13px] top-4 bottom-0 w-px bg-white/10" />
          )}
          <span
            className={`absolute left-[-16px] top-1 w-2 h-2 rounded-full ${
              i === 0 ? "bg-brand-500" : "bg-white/20"
            }`}
          />
          <p className="text-white text-sm font-medium">{d.description}</p>
          <p className="text-gray-500 text-xs mt-0.5">
            {d.location && <span className="mr-2">{d.location}</span>}
            {formatDate(d.time, true)}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ─── page ─────────────────────────────────────────────────── */

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, isLoading } = useAuthStore();
  const router = useRouter();
  const { fetchOrderDetail } = useMyOrders();

  const [order, setOrder] = useState<MyOrderDetail | null>(null);
  const [fetching, setFetching] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  const load = useCallback(async () => {
    const orderId = parseInt(id, 10);
    if (isNaN(orderId)) {
      setNotFound(true);
      setFetching(false);
      return;
    }
    setFetching(true);
    try {
      const data = await fetchOrderDetail(orderId);
      if (!data) {
        setNotFound(true);
      } else {
        setOrder(data);
      }
    } finally {
      setFetching(false);
    }
  }, [id, fetchOrderDetail]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  if (isLoading || (fetching && !notFound)) return <PageLoading variant="top" />;
  if (!user) return null;

  if (notFound || !order) {
    return (
      <SettingsLayout title="주문 상세">
        <div className="bg-[#1a1a1a] rounded-2xl border border-white/5 min-h-[300px] flex flex-col items-center justify-center gap-3">
          <AlertCircle size={40} className="text-gray-600" />
          <p className="text-gray-400">주문을 찾을 수 없습니다.</p>
          <Link
            href="/settings/purchases"
            className="text-sm text-brand-400 hover:underline"
          >
            주문 목록으로 돌아가기
          </Link>
        </div>
      </SettingsLayout>
    );
  }

  const canCancel = order.status === "pending" || order.status === "paid";
  const canRefund = order.status === "delivered" && !order.refund_status;
  const hasTracking = !!order.shipping_tracking?.tracking_number;

  const badgeClass = STATUS_CLASS[order.status] ?? "bg-gray-600 text-gray-200";
  const statusLabel = STATUS_LABEL[order.status] ?? order.status;

  return (
    <SettingsLayout title="주문 상세">
      {/* back + header */}
      <div className="mb-6">
        <Link
          href="/settings/purchases"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ChevronLeft size={16} />
          주문 목록
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-sm text-gray-500">{order.order_number}</p>
            <p className="text-gray-400 text-sm">{formatDate(order.created_at)}</p>
          </div>
          <span className={`text-sm font-semibold px-3 py-1.5 rounded-full ${badgeClass}`}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* 주문 상품 */}
      <Section icon={<Package size={18} />} title="주문 상품">
        <div className="space-y-3">
          {order.order_items.map((item) => (
            <div
              key={item.id}
              className="flex justify-between items-start gap-4 py-2 border-b border-white/5 last:border-0"
            >
              <div>
                <p className="text-white text-sm font-medium">{item.product_name}</p>
                <p className="text-gray-500 text-xs mt-0.5">
                  {formatPrice(item.product_price)} × {item.quantity}개
                </p>
              </div>
              <p className="text-white text-sm font-semibold shrink-0">
                {formatPrice(item.subtotal)}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* 배송 정보 */}
      <Section icon={<MapPin size={18} />} title="배송 정보">
        <InfoRow label="수령인" value={order.recipient_name} />
        <InfoRow label="연락처" value={order.recipient_phone} />
        <InfoRow
          label="주소"
          value={
            <span>
              {order.shipping_zipcode && (
                <span className="block text-gray-500 text-xs">({order.shipping_zipcode})</span>
              )}
              {order.shipping_address}
            </span>
          }
        />
        {order.shipping_memo && (
          <InfoRow label="배송 메모" value={order.shipping_memo} />
        )}
      </Section>

      {/* 결제 정보 */}
      <Section icon={<CreditCard size={18} />} title="결제 정보">
        <InfoRow label="상품 금액" value={formatPrice(order.total_product_price)} />
        <InfoRow label="배송비" value={formatPrice(order.total_shipping_fee)} />
        {order.total_discount > 0 && (
          <InfoRow
            label="할인 금액"
            value={<span className="text-green-400">-{formatPrice(order.total_discount)}</span>}
          />
        )}
        <div className="border-t border-white/5 pt-2 mt-2">
          <InfoRow
            label="최종 결제 금액"
            value={
              <span className="text-white font-bold text-base">
                {formatPrice(order.final_price)}
              </span>
            }
          />
        </div>
        <InfoRow
          label="결제 수단"
          value={
            order.payment_method
              ? PAYMENT_METHOD_LABEL[order.payment_method] ?? order.payment_method
              : "-"
          }
        />
        <InfoRow label="결제 일시" value={formatDate(order.paid_at, true)} />
      </Section>

      {/* 배송 추적 */}
      {order.shipping_tracking && (
        <Section icon={<Truck size={18} />} title="배송 추적">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            {order.shipping_tracking.courier_name && (
              <span className="text-gray-300 text-sm">
                {order.shipping_tracking.courier_name}
              </span>
            )}
            {order.shipping_tracking.tracking_number && (
              <span className="font-mono text-sm text-brand-400 bg-white/5 px-2 py-0.5 rounded">
                {order.shipping_tracking.tracking_number}
              </span>
            )}
            {order.shipping_tracking.status && (
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  TRACKING_STATUS_CLASS[order.shipping_tracking.status] ??
                  "bg-gray-600 text-gray-200"
                }`}
              >
                {TRACKING_STATUS_LABEL[order.shipping_tracking.status] ??
                  order.shipping_tracking.status}
              </span>
            )}
          </div>
          {order.shipping_tracking.shipped_at && (
            <div className="mb-3 text-sm text-gray-500">
              발송일: {formatDate(order.shipping_tracking.shipped_at, true)}
            </div>
          )}
          {order.shipping_tracking.delivered_at && (
            <div className="mb-3 text-sm text-gray-500">
              배송완료: {formatDate(order.shipping_tracking.delivered_at, true)}
            </div>
          )}
          <TrackingTimeline details={order.shipping_tracking.tracking_details} />
        </Section>
      )}

      {/* 취소/환불 정보 */}
      {(order.cancel_reason || order.refund_status) && (
        <Section icon={<AlertCircle size={18} />} title="취소 / 환불 정보">
          {order.cancel_reason && (
            <>
              <InfoRow label="취소 사유" value={order.cancel_reason} />
              {order.cancel_requested_at && (
                <InfoRow label="취소 일시" value={formatDate(order.cancel_requested_at, true)} />
              )}
            </>
          )}
          {order.refund_status && (
            <>
              <InfoRow
                label="환불 상태"
                value={
                  <span
                    className={
                      order.refund_status === "completed"
                        ? "text-green-400"
                        : order.refund_status === "rejected"
                        ? "text-red-400"
                        : "text-yellow-400"
                    }
                  >
                    {REFUND_STATUS_LABEL[order.refund_status] ?? order.refund_status}
                  </span>
                }
              />
              {order.refund_reason && (
                <InfoRow label="환불 사유" value={order.refund_reason} />
              )}
              {order.refund_amount != null && (
                <InfoRow label="환불 금액" value={formatPrice(order.refund_amount)} />
              )}
              {order.refund_requested_at && (
                <InfoRow label="신청 일시" value={formatDate(order.refund_requested_at, true)} />
              )}
              {order.refund_completed_at && (
                <InfoRow label="완료 일시" value={formatDate(order.refund_completed_at, true)} />
              )}
            </>
          )}
        </Section>
      )}

      {/* 액션 버튼 */}
      {(canCancel || canRefund || (hasTracking && order.status === "shipped")) && (
        <div className="flex flex-wrap gap-3 mt-6">
          {hasTracking && order.status === "shipped" && (
            <a
              href={`https://www.track.delivery/track/${order.shipping_tracking?.tracking_number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center py-3 rounded-xl bg-[#2a2a2a] text-gray-300 hover:bg-[#333] hover:text-white transition-colors text-sm font-medium"
            >
              배송 추적 사이트 열기
            </a>
          )}
          {canCancel && (
            <Link
              href={`/settings/purchases/${id}/cancel`}
              className="flex-1 text-center py-3 rounded-xl bg-[#2a2a2a] text-gray-300 hover:bg-[#333] hover:text-white transition-colors text-sm font-medium"
            >
              취소 신청
            </Link>
          )}
          {canRefund && (
            <Link
              href={`/settings/purchases/${id}/refund`}
              className="flex-1 text-center py-3 rounded-xl bg-brand-500 text-white hover:bg-brand-600 transition-colors text-sm font-medium"
            >
              환불 신청
            </Link>
          )}
        </div>
      )}
    </SettingsLayout>
  );
}
