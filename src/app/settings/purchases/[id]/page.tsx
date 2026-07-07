"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Package, MapPin, CreditCard, Truck, AlertCircle, Copy, Check } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import PageLoading from "@/components/PageLoading";
import SettingsLayout from "@/components/SettingsLayout";
import { useMyOrders, type MyOrderDetail, type MyOrderItemDetail } from "@/hooks/useMyOrders";
import { computeOrderEligibility } from "@/hooks/useCancelRefund";
import { createClient } from "@/utils/supabase/client";
import ProductReviewModal from "@/components/ProductReviewModal";

const REVIEWABLE_STATUSES = ["paid", "shipped", "delivered"];

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

const DELIVERY_TYPE_LABEL: Record<string, string> = {
  digital_download: "다운로드",
  gifticon: "기프티콘",
  coupon: "쿠폰",
};

interface RevealedGifticon {
  code: string;
  revealed_at: string;
}

type ConfirmAction =
  | { type: "download"; item: MyOrderItemDetail; token: string }
  | { type: "gifticon"; item: MyOrderItemDetail; codeId: number };

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

/* ─── confirm modal ────────────────────────────────────────── */

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  loading,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-sm bg-[#1a1a1a] rounded-2xl border border-white/10 shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-yellow-500/15 flex items-center justify-center flex-shrink-0">
            <AlertCircle size={20} className="text-yellow-400" />
          </div>
          <h2 className="text-white font-semibold text-base">{title}</h2>
        </div>
        <p className="text-gray-300 text-sm leading-relaxed mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-11 rounded-xl bg-[#2a2a2a] text-gray-300 text-sm font-medium hover:bg-[#333] transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 h-11 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            {loading ? "처리 중..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── digital item panel (per order_item) ─────────────────── */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "복사됨" : "복사"}
    </button>
  );
}

function DigitalItemPanel({
  item,
  revealedCodes,
  onRequestDownload,
  onRequestReveal,
}: {
  item: MyOrderItemDetail;
  revealedCodes: Record<number, RevealedGifticon>;
  onRequestDownload: (item: MyOrderItemDetail) => void;
  onRequestReveal: (item: MyOrderItemDetail, codeId: number) => void;
}) {
  const df = item.digital_fulfillment;

  if (item.delivery_type === "digital_download") {
    const ebook = df?.ebook_download;
    if (!ebook) return null;
    const exhausted = ebook.download_count >= ebook.download_limit;
    const expired = ebook.expires_at ? new Date(ebook.expires_at) < new Date() : false;
    const disabled = exhausted || expired || df?.status !== "success";

    return (
      <div className="mt-2 flex items-center justify-between gap-3 bg-white/[0.03] rounded-lg px-3 py-2.5">
        <div className="text-xs text-gray-500">
          <span className={exhausted ? "text-red-400 font-medium" : "text-gray-400"}>
            {ebook.download_count}/{ebook.download_limit}회 사용
          </span>
          {ebook.expires_at && (
            <span className={`ml-2 ${expired ? "text-red-400" : ""}`}>
              만료: {formatDate(ebook.expires_at)}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onRequestDownload(item)}
          disabled={disabled}
          className="text-xs px-3 py-1.5 rounded-full bg-brand-500 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brand-600 transition-colors shrink-0"
        >
          파일 다운로드
        </button>
      </div>
    );
  }

  if (item.delivery_type === "gifticon") {
    const codes = df?.gifticon_codes ?? [];
    if (codes.length === 0) return null;

    return (
      <div className="mt-2 space-y-2">
        {codes.map((c, i) => {
          const revealed = revealedCodes[c.id];
          const isRevealed = !!c.revealed_at;

          return (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 bg-white/[0.03] rounded-lg px-3 py-2.5"
            >
              {codes.length > 1 && (
                <span className="text-xs text-gray-600 shrink-0">#{i + 1}</span>
              )}
              {isRevealed ? (
                revealed?.code ? (
                  <>
                    <span className="font-mono text-sm text-brand-400 tracking-wide">
                      {revealed.code}
                    </span>
                    <CopyButton text={revealed.code} />
                  </>
                ) : (
                  <span className="text-xs text-gray-500">코드 불러오는 중...</span>
                )
              ) : (
                <>
                  <span className="text-xs text-gray-500">코드가 아직 확인되지 않았습니다.</span>
                  <button
                    type="button"
                    onClick={() => onRequestReveal(item, c.id)}
                    className="text-xs px-3 py-1.5 rounded-full bg-brand-500 text-white hover:bg-brand-600 transition-colors shrink-0"
                  >
                    코드 확인
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (item.delivery_type === "coupon") {
    const coupons = df?.user_coupons ?? [];
    if (coupons.length === 0) return null;

    return (
      <div className="mt-2 space-y-2">
        {coupons.map((uc) => (
          <div
            key={uc.id}
            className="flex items-center justify-between gap-3 bg-white/[0.03] rounded-lg px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="text-xs text-gray-300 truncate">{uc.coupon_name ?? "쿠폰"}</p>
              {uc.coupon_code && (
                <p className="font-mono text-xs text-gray-500">{uc.coupon_code}</p>
              )}
            </div>
            <span
              className={`text-xs px-2.5 py-1 rounded-full shrink-0 ${
                uc.status === "used"
                  ? "bg-white/5 text-gray-500"
                  : uc.status === "active"
                  ? "bg-brand-500/20 text-brand-400"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              {uc.status === "used"
                ? `사용완료${uc.used_at ? " · " + formatDate(uc.used_at, true) : ""}`
                : uc.status === "active"
                ? "사용 가능"
                : "취소됨"}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return null;
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

  const [revealedCodes, setRevealedCodes] = useState<Record<number, RevealedGifticon>>({});
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const [reviewTarget, setReviewTarget] = useState<{
    orderItemId: number;
    productId: number;
    productName: string;
  } | null>(null);
  const [reviewedItemIds, setReviewedItemIds] = useState<Set<number>>(new Set());

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

  // 이미 열람된 기프티콘 코드는 초기 조회에 코드 원문이 포함되지 않으므로
  // (§6 — 반드시 reveal API를 거쳐야 노출) 재방문 시 모달 없이 자동으로 다시 불러온다.
  useEffect(() => {
    if (!order) return;

    const alreadyRevealedIds: number[] = [];
    for (const item of order.order_items) {
      if (item.delivery_type !== "gifticon") continue;
      for (const c of item.digital_fulfillment?.gifticon_codes ?? []) {
        if (c.revealed_at && !revealedCodes[c.id]) alreadyRevealedIds.push(c.id);
      }
    }
    if (alreadyRevealedIds.length === 0) return;

    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        alreadyRevealedIds.map((codeId) =>
          fetch("/api/gifticon/reveal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ gifticon_code_id: codeId }),
          })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
        )
      );
      if (cancelled) return;
      setRevealedCodes((prev) => {
        const next = { ...prev };
        alreadyRevealedIds.forEach((codeId, i) => {
          const res = results[i];
          if (res?.code) next[codeId] = { code: res.code, revealed_at: res.revealed_at };
        });
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  // 이미 리뷰를 작성한 주문 항목을 파악해 버튼 라벨을 "리뷰 작성"/"리뷰 수정"으로 구분
  useEffect(() => {
    if (!order || order.order_items.length === 0) return;
    const supabase = createClient();
    const itemIds = order.order_items.map((item) => item.id);

    supabase
      .from("product_reviews")
      .select("order_item_id")
      .in("order_item_id", itemIds)
      .then(({ data }) => {
        const ids = (data ?? []).map((row) => row.order_item_id as number);
        setReviewedItemIds(new Set(ids));
      });
  }, [order]);

  const handleRequestDownload = (item: MyOrderItemDetail) => {
    const token = item.digital_fulfillment?.ebook_download?.download_token;
    if (!token) return;
    setActionError("");
    setConfirmAction({ type: "download", item, token });
  };

  const handleRequestReveal = (item: MyOrderItemDetail, codeId: number) => {
    setActionError("");
    setConfirmAction({ type: "gifticon", item, codeId });
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    setActionError("");
    try {
      if (confirmAction.type === "download") {
        window.open(`/api/download/${confirmAction.token}`, "_blank");
        setConfirmAction(null);
        // 다운로드 횟수 반영을 위해 잠시 후 최신 상태 재조회
        setTimeout(() => load(), 1500);
        return;
      }

      const res = await fetch("/api/gifticon/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gifticon_code_id: confirmAction.codeId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error ?? "코드 확인에 실패했습니다.");
        return;
      }
      setRevealedCodes((prev) => ({
        ...prev,
        [confirmAction.codeId]: { code: data.code, revealed_at: data.revealed_at },
      }));
      setConfirmAction(null);
    } finally {
      setActionLoading(false);
    }
  };

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

  const eligibility = computeOrderEligibility(
    {
      status: order.status,
      paid_at: order.paid_at,
      delivered_at: order.shipping_tracking?.delivered_at ?? null,
      order_type: order.order_type,
      refund_status: order.refund_status,
    },
    order.order_items
  );

  const hasTracking = !!order.shipping_tracking?.tracking_number;
  const eligibleForReview = REVIEWABLE_STATUSES.includes(order.status);

  const badgeClass = STATUS_CLASS[order.status] ?? "bg-gray-600 text-gray-200";
  const statusLabel =
    order.order_type === "digital" && order.status === "paid"
      ? "다운로드 가능"
      : STATUS_LABEL[order.status] ?? order.status;

  // 물리 배송이 포함된 주문은 배송완료 전까지 "환불 불가" 안내가 상시 노출되면 노이즈만 커지므로 숨긴다.
  // 디지털 단독 주문 또는 배송완료 후 기간이 지난 경우에만 사유를 보여준다.
  const showRefundReason =
    !eligibility.orderRefundAllowed &&
    !!eligibility.orderRefundReason &&
    !(order.order_type !== "digital" && order.status !== "delivered");

  const showCancelReason =
    !eligibility.orderCancelAllowed && !!eligibility.orderCancelReason;

  const showActionArea =
    !order.refund_status &&
    order.status !== "cancelled" &&
    (eligibility.orderCancelAllowed ||
      eligibility.orderRefundAllowed ||
      showCancelReason ||
      showRefundReason ||
      (hasTracking && order.status === "shipped"));

  return (
    <SettingsLayout title="주문 상세">
      {/* back + header */}
      <div className="mb-6">
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
              className="py-2 border-b border-white/5 last:border-0"
            >
              <div className="flex justify-between items-start gap-4">
                <div>
                  <p className="text-white text-sm font-medium">
                    {item.product_name}
                    {item.delivery_type !== "physical" && (
                      <span className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/5 text-gray-400 align-middle">
                        {DELIVERY_TYPE_LABEL[item.delivery_type] ?? item.delivery_type}
                      </span>
                    )}
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {formatPrice(item.product_price)} × {item.quantity}개
                  </p>
                </div>
                <p className="text-white text-sm font-semibold shrink-0">
                  {formatPrice(item.subtotal)}
                </p>
              </div>

              {item.delivery_type === "digital_download" && (
                <p className="mt-2 text-[11px] text-yellow-500/80">
                  다운로드하면 취소/환불이 불가능합니다.
                </p>
              )}
              {item.delivery_type === "gifticon" && (
                <p className="mt-2 text-[11px] text-yellow-500/80">
                  코드를 확인하면 이후 취소/환불 시 이 상품 금액은 환불되지 않습니다.
                </p>
              )}

              <DigitalItemPanel
                item={item}
                revealedCodes={revealedCodes}
                onRequestDownload={handleRequestDownload}
                onRequestReveal={handleRequestReveal}
              />

              {eligibleForReview && (
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setReviewTarget({
                        orderItemId: item.id,
                        productId: item.product_id,
                        productName: item.product_name,
                      })
                    }
                    className="text-xs px-3 py-1.5 rounded-lg bg-[#2a2a2a] text-gray-300 hover:bg-[#333] hover:text-white transition-colors"
                  >
                    {reviewedItemIds.has(item.id) ? "리뷰 수정" : "리뷰 작성"}
                  </button>
                </div>
              )}
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
      {showActionArea && (
        <div className="mt-6">
          <div className="flex flex-wrap gap-3">
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
            {eligibility.orderCancelAllowed && (
              <Link
                href={`/settings/purchases/${id}/cancel`}
                className="flex-1 text-center py-3 rounded-xl bg-[#2a2a2a] text-gray-300 hover:bg-[#333] hover:text-white transition-colors text-sm font-medium"
              >
                취소 신청
              </Link>
            )}
            {eligibility.orderRefundAllowed && (
              <Link
                href={`/settings/purchases/${id}/refund`}
                className="flex-1 text-center py-3 rounded-xl bg-brand-500 text-white hover:bg-brand-600 transition-colors text-sm font-medium"
              >
                환불 신청
              </Link>
            )}
          </div>
          {showCancelReason && (
            <p className="mt-2 text-xs text-gray-500">
              취소 불가 사유: {eligibility.orderCancelReason}
            </p>
          )}
          {showRefundReason && (
            <p className="mt-2 text-xs text-gray-500">
              환불 불가 사유: {eligibility.orderRefundReason}
            </p>
          )}
        </div>
      )}

      {confirmAction && (
        <ConfirmDialog
          title={confirmAction.type === "download" ? "다운로드 확인" : "기프티콘 코드 확인"}
          message={
            confirmAction.type === "download"
              ? "다운로드하면 취소/환불이 불가능합니다. 계속하시겠습니까?"
              : "코드를 확인하면 이후 취소/환불 시 이 상품 금액은 환불되지 않습니다. 계속하시겠습니까?"
          }
          confirmLabel="확인"
          loading={actionLoading}
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {actionError && (
        <p className="mt-3 text-xs text-red-400 text-center">{actionError}</p>
      )}

      {reviewTarget && (
        <ProductReviewModal
          orderItemId={reviewTarget.orderItemId}
          productId={reviewTarget.productId}
          productName={reviewTarget.productName}
          onClose={() => setReviewTarget(null)}
          onSubmitted={() => {
            setReviewedItemIds((prev) => new Set(prev).add(reviewTarget.orderItemId));
          }}
        />
      )}
    </SettingsLayout>
  );
}
