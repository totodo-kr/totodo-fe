import { useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

export type MyOrderStatus =
  | "all"
  | "pending"
  | "paid"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface MyOrder {
  id: number;
  order_number: string;
  final_price: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  total_product_price: number;
  total_shipping_fee: number;
  total_discount: number;
  payment_method: string | null;
  recipient_name: string;
  shipping_address: string;
  cancel_reason: string | null;
  refund_status: string | null;
  refund_amount: number | null;
  first_item_name: string;
  item_count: number;
}

export interface TrackingDetail {
  time: string;
  location: string;
  description: string;
}

export interface MyOrderDetail extends Omit<MyOrder, "first_item_name" | "item_count"> {
  recipient_phone: string;
  shipping_zipcode: string | null;
  shipping_memo: string | null;
  refund_reason: string | null;
  refund_requested_at: string | null;
  refund_completed_at: string | null;
  cancel_requested_at: string | null;
  order_items: Array<{
    id: number;
    product_id: number;
    product_name: string;
    product_price: number;
    quantity: number;
    subtotal: number;
  }>;
  shipping_tracking: {
    courier_name: string | null;
    tracking_number: string | null;
    status: string;
    tracking_details: TrackingDetail[];
    shipped_at: string | null;
    delivered_at: string | null;
  } | null;
}

const PAGE_SIZE = 10;

export function useMyOrders() {
  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchOrders = useCallback(
    async (page = 1, status: MyOrderStatus = "all") => {
      const supabase = createClient();
      setLoading(true);

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("orders")
        .select(
          `id, order_number, final_price, status, created_at, paid_at,
           total_product_price, total_shipping_fee, total_discount,
           payment_method, recipient_name, shipping_address,
           cancel_reason, refund_status, refund_amount,
           order_items(product_name)`,
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(from, to);

      if (status !== "all") {
        query = query.eq("status", status);
      }

      const { data, count, error } = await query;
      if (!error && data) {
        const mapped: MyOrder[] = data.map((o) => {
          const items = Array.isArray(o.order_items) ? o.order_items : [];
          return {
            id: o.id,
            order_number: o.order_number,
            final_price: o.final_price,
            status: o.status,
            created_at: o.created_at,
            paid_at: o.paid_at,
            total_product_price: o.total_product_price,
            total_shipping_fee: o.total_shipping_fee,
            total_discount: o.total_discount,
            payment_method: o.payment_method,
            recipient_name: o.recipient_name,
            shipping_address: o.shipping_address,
            cancel_reason: o.cancel_reason,
            refund_status: o.refund_status,
            refund_amount: o.refund_amount,
            first_item_name: items[0]?.product_name ?? "상품 없음",
            item_count: items.length,
          };
        });
        setOrders(mapped);
        setTotal(count ?? 0);
      }
      setLoading(false);
    },
    []
  );

  const fetchOrderDetail = useCallback(
    async (orderId: number): Promise<MyOrderDetail | null> => {
      const supabase = createClient();
      setDetailLoading(true);

      const { data, error } = await supabase
        .from("orders")
        .select(
          `id, order_number, final_price, status, created_at, paid_at,
           total_product_price, total_shipping_fee, total_discount,
           payment_method, recipient_name, recipient_phone,
           shipping_address, shipping_zipcode, shipping_memo,
           cancel_reason, cancel_requested_at,
           refund_status, refund_amount, refund_reason,
           refund_requested_at, refund_completed_at,
           order_items(id, product_id, product_name, product_price, quantity, subtotal),
           shipping_tracking(courier_name, tracking_number, status, tracking_details, shipped_at, delivered_at)`
        )
        .eq("id", orderId)
        .single();

      setDetailLoading(false);

      if (error || !data) return null;

      const trackingRaw = Array.isArray(data.shipping_tracking)
        ? data.shipping_tracking[0]
        : data.shipping_tracking;

      return {
        id: data.id,
        order_number: data.order_number,
        final_price: data.final_price,
        status: data.status,
        created_at: data.created_at,
        paid_at: data.paid_at,
        total_product_price: data.total_product_price,
        total_shipping_fee: data.total_shipping_fee,
        total_discount: data.total_discount,
        payment_method: data.payment_method,
        recipient_name: data.recipient_name,
        recipient_phone: data.recipient_phone,
        shipping_address: data.shipping_address,
        shipping_zipcode: data.shipping_zipcode,
        shipping_memo: data.shipping_memo,
        cancel_reason: data.cancel_reason,
        cancel_requested_at: data.cancel_requested_at,
        refund_status: data.refund_status,
        refund_amount: data.refund_amount,
        refund_reason: data.refund_reason,
        refund_requested_at: data.refund_requested_at,
        refund_completed_at: data.refund_completed_at,
        order_items: Array.isArray(data.order_items) ? data.order_items : [],
        shipping_tracking: trackingRaw
          ? {
              courier_name: trackingRaw.courier_name ?? null,
              tracking_number: trackingRaw.tracking_number ?? null,
              status: trackingRaw.status ?? "preparing",
              tracking_details: (trackingRaw.tracking_details as TrackingDetail[]) ?? [],
              shipped_at: trackingRaw.shipped_at ?? null,
              delivered_at: trackingRaw.delivered_at ?? null,
            }
          : null,
      };
    },
    []
  );

  return {
    orders,
    total,
    loading,
    detailLoading,
    fetchOrders,
    fetchOrderDetail,
  };
}
