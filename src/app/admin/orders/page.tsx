"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronDown, ChevronUp, Package } from "lucide-react";
import {
  useAdminOrders,
  OrderStatus,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  OrderItem,
} from "@/hooks/useAdminOrders";
import { AdminPageHeader, AdminTable } from "@/components/admin/organisms";
import { Pagination, FilterTabs } from "@/components/admin/molecules";
import { Badge, Spinner } from "@/components/admin/atoms";

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
                ) : (STATUS_NEXT[order.status]?.length ?? 0) > 0 ? (
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
