"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Package,
} from "lucide-react";
import {
  useAdminOrders,
  OrderStatus,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  OrderItem,
} from "@/hooks/useAdminOrders";

const PAGE_SIZE = 15;

const STATUS_TABS: { label: string; value: OrderStatus | "" }[] = [
  { label: "전체", value: "" },
  { label: "결제대기", value: "pending" },
  { label: "결제완료", value: "paid" },
  { label: "배송중", value: "shipped" },
  { label: "배송완료", value: "delivered" },
  { label: "취소", value: "cancelled" },
];

const STATUS_NEXT: Partial<Record<OrderStatus, OrderStatus[]>> = {
  pending: ["paid", "cancelled"],
  paid: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

function formatDate(s: string) {
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatPrice(p: number) {
  return `${p.toLocaleString()}원`;
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const color = ORDER_STATUS_COLORS[status];
  return (
    <span
      className="text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{ background: color.bg, color: color.text }}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

function OrderItemsRow({ orderId, fetchItems }: { orderId: number; fetchItems: (id: number) => Promise<OrderItem[]> }) {
  const [items, setItems] = useState<OrderItem[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchItems(orderId).then((data) => {
      setItems(data);
      setLoading(false);
    });
  }, [orderId, fetchItems]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div
          className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "#cc785c", borderTopColor: "transparent" }}
        />
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
        <tr style={{ borderBottom: `1px solid #e6dfd8` }}>
          <th className="text-left py-2 px-3 text-xs font-semibold" style={{ color: "#6c6a64" }}>
            상품명
          </th>
          <th className="text-right py-2 px-3 text-xs font-semibold" style={{ color: "#6c6a64" }}>
            단가
          </th>
          <th className="text-right py-2 px-3 text-xs font-semibold" style={{ color: "#6c6a64" }}>
            수량
          </th>
          <th className="text-right py-2 px-3 text-xs font-semibold" style={{ color: "#6c6a64" }}>
            소계
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} style={{ borderBottom: `1px solid #f0ebe4` }}>
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

export default function AdminOrdersPage() {
  const { orders, total, loading, updatingId, fetchOrders, fetchOrderItems, updateStatus } =
    useAdminOrders();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const load = useCallback(
    (p: number, s: OrderStatus | "") => fetchOrders(p, s),
    [fetchOrders]
  );

  useEffect(() => {
    load(1, "");
  }, [load]);

  const handleStatusTab = (s: OrderStatus | "") => {
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

  const handleStatusChange = async (orderId: number, newStatus: OrderStatus) => {
    await updateStatus(orderId, newStatus);
  };

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "#141413" }}>
          주문 관리
        </h1>
        <p className="text-sm mt-1" style={{ color: "#6c6a64" }}>
          주문 목록을 조회하고 배송 상태를 변경합니다.
        </p>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {STATUS_TABS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => handleStatusTab(value)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={
              statusFilter === value
                ? { background: "#cc785c", color: "#fff" }
                : { background: "#efe9de", color: "#6c6a64" }
            }
            onMouseEnter={(e) => {
              if (statusFilter !== value)
                (e.currentTarget as HTMLButtonElement).style.background = "#e6dfd8";
            }}
            onMouseLeave={(e) => {
              if (statusFilter !== value)
                (e.currentTarget as HTMLButtonElement).style.background = "#efe9de";
            }}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto text-sm" style={{ color: "#6c6a64" }}>
          총{" "}
          <span className="font-semibold" style={{ color: "#141413" }}>
            {total}
          </span>
          건
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#e6dfd8" }}>
        {/* Header */}
        <div
          className="grid items-center px-5 py-3 text-xs font-semibold uppercase tracking-wide border-b"
          style={{
            gridTemplateColumns: "160px 1fr 110px 100px 160px 140px 36px",
            background: "#efe9de",
            color: "#6c6a64",
            borderColor: "#e6dfd8",
          }}
        >
          <span>주문번호</span>
          <span>수령인</span>
          <span className="text-right">결제금액</span>
          <span className="text-center">상태</span>
          <span className="text-center">주문일</span>
          <span className="text-center">상태 변경</span>
          <span />
        </div>

        <div style={{ background: "#faf9f5" }}>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div
                className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: "#cc785c", borderTopColor: "transparent" }}
              />
            </div>
          ) : orders.length === 0 ? (
            <p className="text-center py-12 text-sm" style={{ color: "#8e8b82" }}>
              주문이 없습니다.
            </p>
          ) : (
            orders.map((order) => (
              <div key={order.id}>
                {/* Order row */}
                <div
                  className="grid items-center px-5 py-3.5 border-b transition-colors hover:bg-[#efe9de]/20"
                  style={{
                    gridTemplateColumns: "160px 1fr 110px 100px 160px 140px 36px",
                    borderColor: "#e6dfd8",
                    background: expandedId === order.id ? "#efe9de30" : undefined,
                  }}
                >
                  {/* Order number */}
                  <div className="min-w-0">
                    <p
                      className="text-xs font-mono font-medium truncate"
                      style={{ color: "#252523" }}
                    >
                      {order.order_number}
                    </p>
                  </div>

                  {/* Recipient */}
                  <div className="min-w-0 px-3">
                    <p className="text-sm font-medium truncate" style={{ color: "#252523" }}>
                      {order.recipient_name}
                    </p>
                    <p className="text-xs truncate" style={{ color: "#8e8b82" }}>
                      {order.recipient_phone}
                    </p>
                  </div>

                  {/* Final price */}
                  <div className="text-right">
                    <span className="text-sm font-semibold" style={{ color: "#141413" }}>
                      {formatPrice(order.final_price)}
                    </span>
                  </div>

                  {/* Status badge */}
                  <div className="flex justify-center">
                    <StatusBadge status={order.status} />
                  </div>

                  {/* Date */}
                  <div className="text-center">
                    <span className="text-xs" style={{ color: "#6c6a64" }}>
                      {formatDate(order.created_at)}
                    </span>
                  </div>

                  {/* Status change select */}
                  <div className="flex justify-center">
                    {updatingId === order.id ? (
                      <div
                        className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                        style={{ borderColor: "#cc785c", borderTopColor: "transparent" }}
                      />
                    ) : (STATUS_NEXT[order.status]?.length ?? 0) > 0 ? (
                      <select
                        value=""
                        onChange={(e) =>
                          handleStatusChange(order.id, e.target.value as OrderStatus)
                        }
                        className="text-xs rounded-lg px-2 py-1 border outline-none cursor-pointer"
                        style={{
                          background: "#efe9de",
                          borderColor: "#e6dfd8",
                          color: "#3d3d3a",
                        }}
                      >
                        <option value="" disabled>
                          변경
                        </option>
                        {STATUS_NEXT[order.status]?.map((s) => (
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

                  {/* Expand toggle */}
                  <div className="flex justify-center">
                    <button
                      onClick={() => toggleExpand(order.id)}
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

                {/* Expanded detail */}
                {expandedId === order.id && (
                  <div
                    className="border-b"
                    style={{ background: "#faf9f5", borderColor: "#e6dfd8" }}
                  >
                    <div className="grid grid-cols-2 gap-6 px-6 pt-5 pb-4">
                      {/* Shipping info */}
                      <div>
                        <p
                          className="text-xs font-semibold uppercase tracking-wide mb-3"
                          style={{ color: "#6c6a64" }}
                        >
                          배송 정보
                        </p>
                        <div className="space-y-1.5">
                          <div className="flex gap-3 text-sm">
                            <span className="w-16 flex-shrink-0" style={{ color: "#8e8b82" }}>수령인</span>
                            <span style={{ color: "#252523" }}>{order.recipient_name}</span>
                          </div>
                          <div className="flex gap-3 text-sm">
                            <span className="w-16 flex-shrink-0" style={{ color: "#8e8b82" }}>연락처</span>
                            <span style={{ color: "#252523" }}>{order.recipient_phone}</span>
                          </div>
                          <div className="flex gap-3 text-sm">
                            <span className="w-16 flex-shrink-0" style={{ color: "#8e8b82" }}>주소</span>
                            <span style={{ color: "#252523" }}>{order.shipping_address}</span>
                          </div>
                          {order.shipping_memo && (
                            <div className="flex gap-3 text-sm">
                              <span className="w-16 flex-shrink-0" style={{ color: "#8e8b82" }}>메모</span>
                              <span style={{ color: "#6c6a64" }}>{order.shipping_memo}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Payment info */}
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
                            <span style={{ color: "#cc785c" }}>
                              {formatPrice(order.final_price)}
                            </span>
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
                              <span style={{ color: "#252523" }}>
                                {formatDate(order.paid_at)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Order items */}
                    <div className="px-6 pb-5">
                      <p
                        className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5"
                        style={{ color: "#6c6a64" }}
                      >
                        <Package className="w-3.5 h-3.5" />
                        주문 상품
                      </p>
                      <div
                        className="rounded-lg border overflow-hidden"
                        style={{ borderColor: "#e6dfd8" }}
                      >
                        <OrderItemsRow
                          orderId={order.id}
                          fetchItems={fetchOrderItems}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-6">
          <button
            onClick={() => handlePage(page - 1)}
            disabled={page === 1}
            className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30"
            style={{ color: "#6c6a64" }}
            onMouseEnter={(e) => {
              if (page !== 1) (e.currentTarget as HTMLButtonElement).style.background = "#efe9de";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => handlePage(p)}
              className="w-8 h-8 rounded-lg text-sm font-medium transition-all"
              style={
                p === page
                  ? { background: "#cc785c", color: "#fff" }
                  : { color: "#6c6a64", background: "transparent" }
              }
              onMouseEnter={(e) => {
                if (p !== page)
                  (e.currentTarget as HTMLButtonElement).style.background = "#efe9de";
              }}
              onMouseLeave={(e) => {
                if (p !== page)
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => handlePage(page + 1)}
            disabled={page === totalPages}
            className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30"
            style={{ color: "#6c6a64" }}
            onMouseEnter={(e) => {
              if (page !== totalPages)
                (e.currentTarget as HTMLButtonElement).style.background = "#efe9de";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
