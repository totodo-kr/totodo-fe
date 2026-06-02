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
}

const PAGE_SIZE = 15;

export function useAdminOrders() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchOrders = useCallback(async (page = 1, status?: OrderStatus | "") => {
    const supabase = createClient();
    setLoading(true);

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("orders")
      .select(
        `id, order_number, user_id, total_product_price, total_shipping_fee,
         total_discount, final_price, recipient_name, recipient_phone,
         shipping_address, shipping_memo, status, payment_method, paid_at, created_at`,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, count } = await query;
    setOrders((data as AdminOrder[]) ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  }, []);

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

  return {
    orders,
    total,
    loading,
    updatingId,
    fetchOrders,
    fetchOrderItems,
    updateStatus,
  };
}
