import { useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

export type OrderStatus = "pending" | "paid" | "shipped" | "delivered" | "cancelled";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "결제대기",
  paid: "결제완료",
  shipped: "배송중",
  delivered: "배송완료",
  cancelled: "취소",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, { bg: string; text: string }> = {
  pending: { bg: "#efe9de", text: "#6c6a64" },
  paid: { bg: "#e8f4e8", text: "#2d7d32" },
  shipped: { bg: "#e3f2fd", text: "#1565c0" },
  delivered: { bg: "#f3e5f5", text: "#6a1b9a" },
  cancelled: { bg: "#fdecea", text: "#c62828" },
};

export interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  product_price: number;
  quantity: number;
  subtotal: number;
}

export interface AdminOrder {
  id: number;
  order_number: string;
  user_id: string;
  total_product_price: number;
  total_shipping_fee: number;
  total_discount: number;
  final_price: number;
  recipient_name: string;
  recipient_phone: string;
  shipping_address: string;
  shipping_memo: string | null;
  status: OrderStatus;
  payment_method: string | null;
  paid_at: string | null;
  created_at: string;
  order_items?: OrderItem[];
  // Cancel/refund fields
  cancel_reason?: string | null;
  cancel_requested_at?: string | null;
  refund_reason?: string | null;
  refund_amount?: number | null;
  refund_status?: string | null;
  refund_requested_at?: string | null;
  refund_completed_at?: string | null;
}

const PAGE_SIZE = 15;

export function useAdminOrders() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchOrders = useCallback(
    async (page = 1, status?: OrderStatus | "" | "refund_requested") => {
      const supabase = createClient();
      setLoading(true);

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("orders")
        .select(
          `id, order_number, user_id, total_product_price, total_shipping_fee,
           total_discount, final_price, recipient_name, recipient_phone,
           shipping_address, shipping_memo, status, payment_method, paid_at, created_at,
           cancel_reason, cancel_requested_at,
           refund_reason, refund_amount, refund_status, refund_requested_at, refund_completed_at`,
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(from, to);

      if (status === "refund_requested") {
        query = query.not("refund_status", "is", null);
      } else if (status) {
        query = query.eq("status", status);
      } else {
        query = query.neq("status", "pending");
      }

      const { data, count } = await query;
      setOrders((data as AdminOrder[]) ?? []);
      setTotal(count ?? 0);
      setLoading(false);
    },
    []
  );

  const fetchOrderItems = async (orderId: number): Promise<OrderItem[]> => {
    const supabase = createClient();
    const { data } = await supabase
      .from("order_items")
      .select("id, product_id, product_name, product_price, quantity, subtotal")
      .eq("order_id", orderId);
    return (data as OrderItem[]) ?? [];
  };

  const updateStatus = async (orderId: number, status: OrderStatus) => {
    const supabase = createClient();
    setUpdatingId(orderId);
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId);
    if (!error) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status } : o))
      );
    }
    setUpdatingId(null);
    return !error;
  };

  const processRefund = async (
    orderId: number,
    status: "completed" | "rejected"
  ): Promise<boolean> => {
    setUpdatingId(orderId);

    if (status === "rejected") {
      const supabase = createClient();
      const { error } = await supabase
        .from("orders")
        .update({ refund_status: "rejected" })
        .eq("id", orderId);
      if (!error) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, refund_status: "rejected" } : o))
        );
      }
      setUpdatingId(null);
      return !error;
    }

    const order = orders.find((o) => o.id === orderId);
    const res = await fetch("/api/payment/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        reason: order?.refund_reason ?? "환불 승인",
        amount: order?.refund_amount ?? undefined,
        mode: "refund",
      }),
    });

    if (res.ok) {
      const now = new Date().toISOString();
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, refund_status: "completed", refund_completed_at: now } : o
        )
      );
    }

    setUpdatingId(null);
    return res.ok;
  };

  return {
    orders,
    total,
    loading,
    updatingId,
    fetchOrders,
    fetchOrderItems,
    updateStatus,
    processRefund,
  };
}
