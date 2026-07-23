"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, Package, AlertTriangle } from "lucide-react";
import {
  useAdminOrders,
  OrderStatus,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  OrderItem,
  AdminOrder,
  AdminFulfillmentItem,
  ShippingTracking,
} from "@/hooks/useAdminOrders";
import { AdminPageHeader, AdminTable } from "@/components/admin/organisms";
import { Pagination, FilterTabs } from "@/components/admin/molecules";
import { Badge, Spinner } from "@/components/admin/atoms";

const PAGE_SIZE = 15;

type StatusFilterValue = OrderStatus | "" | "refund_requested" | "digital";

const STATUS_TABS: { label: string; value: StatusFilterValue }[] = [
  { label: "전체", value: "" },
  { label: "결제완료", value: "paid" },
  { label: "배송중", value: "shipped" },
  { label: "배송완료", value: "delivered" },
  { label: "취소", value: "cancelled" },
  { label: "환불요청", value: "refund_requested" },
  { label: "디지털", value: "digital" },
];

const STATUS_NEXT: Partial<Record<OrderStatus, OrderStatus[]>> = {
  paid: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

// order_type='digital' 주문은 배송 개념이 없으므로 shipped/delivered로의 전환을 숨긴다.
function getNextStatusOptions(order: AdminOrder): OrderStatus[] {
  const next = STATUS_NEXT[order.status] ?? [];
  if (order.order_type === "digital") {
    return next.filter((s) => s !== "shipped" && s !== "delivered");
  }
  return next;
}

const FULFILLMENT_STATUS_LABEL: Record<string, string> = {
  success: "정상",
  failed: "이행 실패",
  cancelled: "취소됨",
};

const FULFILLMENT_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  success: { bg: "#e8f4e8", text: "#2d7d32" },
  failed: { bg: "#fdecea", text: "#c62828" },
  cancelled: { bg: "#efe9de", text: "#6c6a64" },
};

const DELIVERY_TYPE_LABEL: Record<string, string> = {
  digital_download: "다운로드",
  gifticon: "기프티콘",
  coupon: "쿠폰",
};

const GIFTICON_CODE_STATUS_LABEL: Record<string, string> = {
  issued: "발급됨(미열람)",
  revealed: "열람됨",
  void: "폐기됨",
};

const REFUND_STATUS_LABELS: Record<string, string> = {
  requested: "환불신청",
  processing: "처리중",
  completed: "환불완료",
  rejected: "거절",
};

const REFUND_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  requested: { bg: "#fff3e0", text: "#e65100" },
  processing: { bg: "#e3f2fd", text: "#1565c0" },
  completed: { bg: "#e8f4e8", text: "#2d7d32" },
  rejected: { bg: "#fdecea", text: "#c62828" },
};

function formatDate(s: string) {
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatPrice(p: number) {
  return `${p.toLocaleString()}원`;
}

const COLUMNS = [
  { label: "주문번호" },
  { label: "수령인" },
  { label: "결제금액", className: "text-right" },
  { label: "상태", className: "text-center" },
  { label: "주문일", className: "text-center" },
  { label: "상태 변경", className: "text-center" },
  { label: "" },
];

const GRID = "160px 1fr 110px 100px 160px 140px 36px";

function OrderItemsRow({
  orderId,
  fetchItems,
}: {
  orderId: number;
  fetchItems: (id: number) => Promise<OrderItem[]>;
}) {
  const [items, setItems] = useState<OrderItem[] | null>(null);
  const [itemsLoading, setItemsLoading] = useState(false);

  useEffect(() => {
    setItemsLoading(true);
    fetchItems(orderId).then((data) => {
      setItems(data);
      setItemsLoading(false);
    });
  }, [orderId, fetchItems]);

  if (itemsLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Spinner size="md" />
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <p className="text-xs text-center py-4" style={{ color: "#8e8b82" }}>
        주문 상품 없음
      </p>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr style={{ borderBottom: "1px solid #e6dfd8" }}>
          {["상품명", "단가", "수량", "소계"].map((h, i) => (
            <th
              key={h}
              className={`py-2 px-3 text-xs font-semibold ${i === 0 ? "text-left" : "text-right"}`}
              style={{ color: "#6c6a64" }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} style={{ borderBottom: "1px solid #f0ebe4" }}>
            <td className="py-2 px-3" style={{ color: "#252523" }}>
              {item.product_name}
            </td>
            <td className="py-2 px-3 text-right" style={{ color: "#6c6a64" }}>
              {formatPrice(item.product_price)}
            </td>
            <td className="py-2 px-3 text-right" style={{ color: "#6c6a64" }}>
              {item.quantity}
            </td>
            <td className="py-2 px-3 text-right font-medium" style={{ color: "#141413" }}>
              {formatPrice(item.subtotal)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ShippingTrackingPanel({
  orderId,
  fetchShippingTracking,
  updateShippingTracking,
}: {
  orderId: number;
  fetchShippingTracking: (id: number) => Promise<ShippingTracking | null>;
  updateShippingTracking: (
    id: number,
    data: { courier_name: string; tracking_number: string }
  ) => Promise<boolean>;
}) {
  const [tracking, setTracking] = useState<ShippingTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [courierName, setCourierName] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchShippingTracking(orderId);
    setTracking(data);
    setCourierName(data?.courier_name ?? "");
    setTrackingNumber(data?.tracking_number ?? "");
    setLoading(false);
  }, [orderId, fetchShippingTracking]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    const ok = await updateShippingTracking(orderId, {
      courier_name: courierName,
      tracking_number: trackingNumber,
    });
    if (ok) {
      setSaved(true);
      await load();
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="px-6 pt-1 pb-4">
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <div className="px-6 pt-1 pb-4">
      <p
        className="text-xs font-semibold uppercase tracking-wide mb-2"
        style={{ color: "#6c6a64" }}
      >
        운송장 정보
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <input
          value={courierName}
          onChange={(e) => {
            setCourierName(e.target.value);
            setSaved(false);
          }}
          placeholder="택배사"
          className="text-sm rounded-lg px-3 py-1.5 border outline-none w-28"
          style={{ borderColor: "#e6dfd8", color: "#252523" }}
        />
        <input
          value={trackingNumber}
          onChange={(e) => {
            setTrackingNumber(e.target.value);
            setSaved(false);
          }}
          placeholder="운송장번호"
          className="text-sm rounded-lg px-3 py-1.5 border outline-none w-40"
          style={{ borderColor: "#e6dfd8", color: "#252523" }}
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
          style={{ background: "#cc785c", color: "#fff" }}
        >
          {saving ? <Spinner size="xs" /> : saved ? "저장됨" : "저장"}
        </button>
        {(tracking?.shipped_at || tracking?.delivered_at) && (
          <span className="text-xs" style={{ color: "#8e8b82" }}>
            {tracking?.shipped_at && `발송: ${formatDate(tracking.shipped_at)}`}
            {tracking?.shipped_at && tracking?.delivered_at && " · "}
            {tracking?.delivered_at && `배송완료: ${formatDate(tracking.delivered_at)}`}
          </span>
        )}
      </div>
    </div>
  );
}

function FulfillmentPanel({
  orderId,
  fetchFulfillments,
  resetDownloadCount,
  reissueGifticonCode,
}: {
  orderId: number;
  fetchFulfillments: (id: number) => Promise<AdminFulfillmentItem[]>;
  resetDownloadCount: (id: number) => Promise<boolean>;
  reissueGifticonCode: (id: number) => Promise<boolean>;
}) {
  const [items, setItems] = useState<AdminFulfillmentItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchFulfillments(orderId);
    setItems(data);
    setLoading(false);
  }, [orderId, fetchFulfillments]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Spinner size="md" />
      </div>
    );
  }

  // 물리 아이템만 있는 주문은 이행 현황이 없으므로 패널 자체를 숨긴다.
  if (!items || items.length === 0) return null;

  const handleReset = async (ebookId: number) => {
    setActionId(ebookId);
    setActionError(null);
    await resetDownloadCount(ebookId);
    await load();
    setActionId(null);
  };

  const handleReissue = async (codeId: number) => {
    setActionId(codeId);
    setActionError(null);
    const ok = await reissueGifticonCode(codeId);
    if (!ok) setActionError("재고가 없어 재발급할 수 없습니다.");
    await load();
    setActionId(null);
  };

  return (
    <div className="px-6 pb-5">
      <p
        className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5"
        style={{ color: "#6c6a64" }}
      >
        디지털 이행 현황
      </p>

      {actionError && (
        <p className="text-xs mb-2" style={{ color: "#c64545" }}>
          {actionError}
        </p>
      )}

      <div className="space-y-2">
        {items.map((item) => {
          const f = item.fulfillment;
          const isFailed = f?.status === "failed";
          const statusColors = FULFILLMENT_STATUS_COLORS[f?.status ?? "cancelled"];

          return (
            <div
              key={item.order_item_id}
              className="rounded-lg border p-3"
              style={{
                borderColor: isFailed ? "#c64545" : "#e6dfd8",
                background: isFailed ? "#fff5f4" : "#fff",
              }}
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  {isFailed && <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: "#c64545" }} />}
                  <span className="text-sm font-medium truncate" style={{ color: "#252523" }}>
                    {item.product_name}
                  </span>
                  <Badge bg="#efe9de" color="#6c6a64">
                    {DELIVERY_TYPE_LABEL[item.delivery_type] ?? item.delivery_type}
                  </Badge>
                </div>
                {f && (
                  <Badge bg={statusColors.bg} color={statusColors.text} className="shrink-0">
                    {isFailed ? "⚠ 이행 실패 (수동 처리 필요)" : FULFILLMENT_STATUS_LABEL[f.status]}
                  </Badge>
                )}
              </div>

              {!f && (
                <p className="text-xs" style={{ color: "#8e8b82" }}>
                  이행 레코드 없음
                </p>
              )}

              {/* digital_download */}
              {f?.ebook_download && (
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div style={{ color: "#6c6a64" }}>
                    <span>
                      {f.ebook_download.download_count}/{f.ebook_download.download_limit}회 사용
                    </span>
                    <span className="ml-3">
                      최초 다운로드: {formatDate(f.ebook_download.first_downloaded_at ?? "") || "-"}
                    </span>
                    <span className="ml-3">
                      만료: {f.ebook_download.expires_at ? formatDate(f.ebook_download.expires_at) : "-"}
                    </span>
                  </div>
                  <button
                    onClick={() => handleReset(f.ebook_download!.id)}
                    disabled={actionId === f.ebook_download.id}
                    className="px-3 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 shrink-0"
                    style={{ background: "#efe9de", color: "#6c6a64" }}
                  >
                    {actionId === f.ebook_download.id ? <Spinner size="xs" /> : "다운로드 횟수 초기화"}
                  </button>
                </div>
              )}

              {/* gifticon */}
              {f && f.gifticon_codes.length > 0 && (
                <div className="space-y-1.5">
                  {f.gifticon_codes.map((code) => (
                    <div key={code.id} className="flex items-center justify-between gap-3 text-xs">
                      <span style={{ color: "#6c6a64" }}>
                        코드 #{code.id} · {GIFTICON_CODE_STATUS_LABEL[code.status] ?? code.status}
                        {code.revealed_at && ` · 열람일: ${formatDate(code.revealed_at)}`}
                      </span>
                      {(code.status === "issued" || code.status === "revealed") && (
                        <button
                          onClick={() => handleReissue(code.id)}
                          disabled={actionId === code.id}
                          className="px-3 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 shrink-0"
                          style={{ background: "#efe9de", color: "#6c6a64" }}
                        >
                          {actionId === code.id ? <Spinner size="xs" /> : "재발급"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* coupon */}
              {f && f.user_coupons.length > 0 && (
                <div className="space-y-1">
                  {f.user_coupons.map((uc) => (
                    <div key={uc.id} className="text-xs" style={{ color: "#6c6a64" }}>
                      쿠폰 #{uc.id} · {uc.status === "used" ? "사용완료" : uc.status === "active" ? "사용가능" : "취소됨"}
                      {uc.used_at && ` · 사용일: ${formatDate(uc.used_at)}`}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminOrdersPage() {
  const searchParams = useSearchParams();
  const {
    orders,
    total,
    loading,
    updatingId,
    fetchOrders,
    fetchOrderItems,
    fetchFulfillments,
    fetchShippingTracking,
    resetDownloadCount,
    reissueGifticonCode,
    updateStatus,
    updateShippingTracking,
    processRefund,
  } = useAdminOrders();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>(
    () => (searchParams.get("status") as StatusFilterValue) ?? ""
  );
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const load = useCallback(
    (p: number, s: StatusFilterValue) => fetchOrders(p, s),
    [fetchOrders]
  );

  useEffect(() => {
    load(1, statusFilter);
  }, [load]);

  const handleStatusTab = (s: StatusFilterValue) => {
    setStatusFilter(s);
    setPage(1);
    setExpandedId(null);
    load(1, s);
  };

  const handlePage = (p: number) => {
    setPage(p);
    setExpandedId(null);
    load(p, statusFilter);
  };

  return (
    <div className="p-8 max-w-6xl">
      <AdminPageHeader
        title="주문 관리"
        description="주문 목록을 조회하고 배송 상태를 변경합니다."
      />

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <FilterTabs tabs={STATUS_TABS} active={statusFilter} onChange={handleStatusTab} />
        <span className="ml-auto text-sm" style={{ color: "#6c6a64" }}>
          총{" "}
          <span className="font-semibold" style={{ color: "#141413" }}>
            {total}
          </span>
          건
        </span>
      </div>

      <AdminTable
        columns={COLUMNS}
        gridTemplateColumns={GRID}
        loading={loading}
        isEmpty={orders.length === 0}
        emptyMessage="주문이 없습니다."
      >
        {orders.map((order) => (
          <div key={order.id}>
            <div
              className="grid items-center px-5 py-3.5 border-b transition-colors hover:bg-[#efe9de]/20"
              style={{
                gridTemplateColumns: GRID,
                borderColor: "#e6dfd8",
                background: expandedId === order.id ? "#efe9de30" : undefined,
              }}
            >
              <div className="min-w-0">
                <p className="text-xs font-mono font-medium truncate" style={{ color: "#252523" }}>
                  {order.order_number}
                </p>
                {order.refund_status && (
                  <Badge
                    bg={REFUND_STATUS_COLORS[order.refund_status]?.bg ?? "#efe9de"}
                    color={REFUND_STATUS_COLORS[order.refund_status]?.text ?? "#6c6a64"}
                  >
                    {REFUND_STATUS_LABELS[order.refund_status] ?? order.refund_status}
                  </Badge>
                )}
              </div>

              <div className="min-w-0 px-3">
                <p className="text-sm font-medium truncate" style={{ color: "#252523" }}>
                  {order.recipient_name}
                </p>
                <p className="text-xs truncate" style={{ color: "#8e8b82" }}>
                  {order.recipient_phone}
                </p>
              </div>

              <div className="text-right">
                <span className="text-sm font-semibold" style={{ color: "#141413" }}>
                  {formatPrice(order.final_price)}
                </span>
              </div>

              <div className="flex justify-center">
                <Badge
                  bg={ORDER_STATUS_COLORS[order.status].bg}
                  color={ORDER_STATUS_COLORS[order.status].text}
                >
                  {ORDER_STATUS_LABELS[order.status]}
                </Badge>
              </div>

              <div className="text-center">
                <span className="text-xs" style={{ color: "#6c6a64" }}>
                  {formatDate(order.created_at)}
                </span>
              </div>

              <div className="flex justify-center">
                {updatingId === order.id ? (
                  <Spinner size="sm" />
                ) : getNextStatusOptions(order).length > 0 ? (
                  <select
                    value=""
                    onChange={(e) =>
                      updateStatus(order.id, e.target.value as OrderStatus)
                    }
                    className="text-xs rounded-lg px-2 py-1 border outline-none cursor-pointer"
                    style={{ background: "#efe9de", borderColor: "#e6dfd8", color: "#3d3d3a" }}
                  >
                    <option value="" disabled>
                      변경
                    </option>
                    {getNextStatusOptions(order).map((s) => (
                      <option key={s} value={s}>
                        → {ORDER_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs" style={{ color: "#8e8b82" }}>
                    —
                  </span>
                )}
              </div>

              <div className="flex justify-center">
                <button
                  onClick={() => setExpandedId((prev) => (prev === order.id ? null : order.id))}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                  style={{ color: "#8e8b82" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "#efe9de";
                    (e.currentTarget as HTMLButtonElement).style.color = "#cc785c";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    (e.currentTarget as HTMLButtonElement).style.color = "#8e8b82";
                  }}
                >
                  {expandedId === order.id ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {expandedId === order.id && (
              <div
                className="border-b"
                style={{ background: "#faf9f5", borderColor: "#e6dfd8" }}
              >
                <div className="grid grid-cols-2 gap-6 px-6 pt-5 pb-4">
                  <div>
                    <p
                      className="text-xs font-semibold uppercase tracking-wide mb-3"
                      style={{ color: "#6c6a64" }}
                    >
                      배송 정보
                    </p>
                    <div className="space-y-1.5">
                      {[
                        { label: "수령인", value: order.recipient_name },
                        { label: "연락처", value: order.recipient_phone },
                        { label: "주소", value: order.shipping_address },
                        ...(order.shipping_memo
                          ? [{ label: "메모", value: order.shipping_memo }]
                          : []),
                      ].map(({ label, value }) => (
                        <div key={label} className="flex gap-3 text-sm">
                          <span className="w-16 flex-shrink-0" style={{ color: "#8e8b82" }}>
                            {label}
                          </span>
                          <span style={{ color: "#252523" }}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p
                      className="text-xs font-semibold uppercase tracking-wide mb-3"
                      style={{ color: "#6c6a64" }}
                    >
                      결제 정보
                    </p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span style={{ color: "#8e8b82" }}>상품금액</span>
                        <span style={{ color: "#252523" }}>
                          {formatPrice(order.total_product_price)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: "#8e8b82" }}>배송비</span>
                        <span style={{ color: "#252523" }}>
                          {formatPrice(order.total_shipping_fee)}
                        </span>
                      </div>
                      {order.total_discount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span style={{ color: "#8e8b82" }}>할인</span>
                          <span style={{ color: "#c64545" }}>
                            -{formatPrice(order.total_discount)}
                          </span>
                        </div>
                      )}
                      <div
                        className="flex justify-between text-sm font-semibold pt-1.5 border-t"
                        style={{ borderColor: "#e6dfd8" }}
                      >
                        <span style={{ color: "#141413" }}>최종 결제</span>
                        <span style={{ color: "#cc785c" }}>{formatPrice(order.final_price)}</span>
                      </div>
                      {order.payment_method && (
                        <div className="flex justify-between text-sm">
                          <span style={{ color: "#8e8b82" }}>결제수단</span>
                          <span style={{ color: "#252523" }}>{order.payment_method}</span>
                        </div>
                      )}
                      {order.paid_at && (
                        <div className="flex justify-between text-sm">
                          <span style={{ color: "#8e8b82" }}>결제일시</span>
                          <span style={{ color: "#252523" }}>{formatDate(order.paid_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {order.order_type !== "digital" && (
                  <ShippingTrackingPanel
                    orderId={order.id}
                    fetchShippingTracking={fetchShippingTracking}
                    updateShippingTracking={updateShippingTracking}
                  />
                )}

                {/* 취소/환불 정보 섹션 */}
                {(order.cancel_reason || order.refund_status) && (
                  <div className="px-6 pb-4">
                    <div
                      className="rounded-xl border p-4"
                      style={{ borderColor: "#e6dfd8", background: "#fff8f5" }}
                    >
                      <p
                        className="text-xs font-semibold uppercase tracking-wide mb-3"
                        style={{ color: "#cc785c" }}
                      >
                        취소 / 환불 정보
                      </p>

                      {/* 취소 정보 */}
                      {order.cancel_reason && (
                        <div className="mb-3">
                          <p className="text-xs font-medium mb-1.5" style={{ color: "#6c6a64" }}>
                            취소 사유
                          </p>
                          <p className="text-sm" style={{ color: "#252523" }}>
                            {order.cancel_reason}
                          </p>
                          {order.cancel_requested_at && (
                            <p className="text-xs mt-1" style={{ color: "#8e8b82" }}>
                              신청일시: {formatDate(order.cancel_requested_at)}
                            </p>
                          )}
                        </div>
                      )}

                      {/* 환불 정보 */}
                      {order.refund_status && (
                        <div>
                          {order.cancel_reason && (
                            <div
                              className="border-t my-3"
                              style={{ borderColor: "#e6dfd8" }}
                            />
                          )}
                          <div className="flex items-center gap-2 mb-2">
                            <p className="text-xs font-medium" style={{ color: "#6c6a64" }}>
                              환불 상태
                            </p>
                            <Badge
                              bg={REFUND_STATUS_COLORS[order.refund_status]?.bg ?? "#efe9de"}
                              color={REFUND_STATUS_COLORS[order.refund_status]?.text ?? "#6c6a64"}
                            >
                              {REFUND_STATUS_LABELS[order.refund_status] ?? order.refund_status}
                            </Badge>
                          </div>

                          <div className="space-y-1 mb-3">
                            {order.refund_reason && (
                              <div className="flex gap-3 text-sm">
                                <span className="w-20 flex-shrink-0" style={{ color: "#8e8b82" }}>
                                  환불 사유
                                </span>
                                <span style={{ color: "#252523" }}>{order.refund_reason}</span>
                              </div>
                            )}
                            {order.refund_amount != null && (
                              <div className="flex gap-3 text-sm">
                                <span className="w-20 flex-shrink-0" style={{ color: "#8e8b82" }}>
                                  환불 금액
                                </span>
                                <span className="font-semibold" style={{ color: "#cc785c" }}>
                                  {formatPrice(order.refund_amount)}
                                </span>
                              </div>
                            )}
                            {order.refund_requested_at && (
                              <div className="flex gap-3 text-sm">
                                <span className="w-20 flex-shrink-0" style={{ color: "#8e8b82" }}>
                                  신청일시
                                </span>
                                <span style={{ color: "#6c6a64" }}>
                                  {formatDate(order.refund_requested_at)}
                                </span>
                              </div>
                            )}
                            {order.refund_completed_at && (
                              <div className="flex gap-3 text-sm">
                                <span className="w-20 flex-shrink-0" style={{ color: "#8e8b82" }}>
                                  처리일시
                                </span>
                                <span style={{ color: "#6c6a64" }}>
                                  {formatDate(order.refund_completed_at)}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* 환불 처리 버튼 (요청 상태일 때만) */}
                          {order.refund_status === "requested" && (
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => processRefund(order.id, "completed")}
                                disabled={updatingId === order.id}
                                className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                                style={{
                                  background: "#5db872",
                                  color: "#fff",
                                }}
                                onMouseEnter={(e) => {
                                  if (updatingId !== order.id)
                                    (e.currentTarget as HTMLButtonElement).style.background =
                                      "#4aa85e";
                                }}
                                onMouseLeave={(e) => {
                                  (e.currentTarget as HTMLButtonElement).style.background =
                                    "#5db872";
                                }}
                              >
                                {updatingId === order.id ? (
                                  <Spinner size="xs" />
                                ) : (
                                  "환불 승인"
                                )}
                              </button>
                              <button
                                onClick={() => processRefund(order.id, "rejected")}
                                disabled={updatingId === order.id}
                                className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                                style={{
                                  background: "#fdecea",
                                  color: "#c64545",
                                }}
                                onMouseEnter={(e) => {
                                  if (updatingId !== order.id)
                                    (e.currentTarget as HTMLButtonElement).style.background =
                                      "#f9d4d1";
                                }}
                                onMouseLeave={(e) => {
                                  (e.currentTarget as HTMLButtonElement).style.background =
                                    "#fdecea";
                                }}
                              >
                                환불 거절
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {order.order_type !== "physical" && (
                  <FulfillmentPanel
                    orderId={order.id}
                    fetchFulfillments={fetchFulfillments}
                    resetDownloadCount={resetDownloadCount}
                    reissueGifticonCode={reissueGifticonCode}
                  />
                )}

                <div className="px-6 pb-5">
                  <p
                    className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5"
                    style={{ color: "#6c6a64" }}
                  >
                    <Package className="w-3.5 h-3.5" />
                    주문 상품
                  </p>
                  <div className="rounded-lg border overflow-hidden" style={{ borderColor: "#e6dfd8" }}>
                    <OrderItemsRow orderId={order.id} fetchItems={fetchOrderItems} />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </AdminTable>

      <Pagination page={page} totalPages={totalPages} loading={loading} onChange={handlePage} />
    </div>
  );
}
