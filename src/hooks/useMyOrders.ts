"use client";

import { createClient } from "@/utils/supabase/client";
import { useCallback } from "react";

export type MyOrderStatus =
  | "all"
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
  cancel_reason?: string | null;
  refund_status?: string | null;
  refund_amount?: number | null;
  // first item name for list display
  first_item_name?: string;
  item_count?: number;
}

export interface MyOrderDetail extends MyOrder {
  recipient_phone: string;
  shipping_zipcode?: string | null;
  shipping_memo?: string | null;
  order_items: Array<{
    id: number;
    product_id: number;
    product_name: string;
    product_price: number;
    quantity: number;
    subtotal: number;
  }>;
  shipping_tracking?: {
    courier_name?: string;
    tracking_number?: string;
    status: string;
    tracking_details: Array<{
      time: string;
      location: string;
      description: string;
    }>;
    shipped_at?: string;
    delivered_at?: string;
  } | null;
}

const PAGE_SIZE = 10;

export function useMyOrders() {
  const supabase = createClient();

  const fetchOrders = useCallback(
    async (
      page: number,
      status?: string
    ): Promise<{ orders: MyOrder[]; total: number }> => {
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

      if (status && status !== "all") {
        query = query.eq("status", status);
      } else {
        query = query.neq("status", "pending").neq("status", "cancelled");
      }

      const { data, error, count } = await query;

      if (error) {
        console.error("fetchOrders error:", error);
        return { orders: [], total: 0 };
      }

      const orders: MyOrder[] = (data ?? []).map((row: Record<string, unknown>) => {
        const items = (row.order_items as Array<{ product_name: string }>) ?? [];
        return {
          id: row.id as number,
          order_number: row.order_number as string,
          final_price: row.final_price as number,
          status: row.status as string,
          created_at: row.created_at as string,
          paid_at: row.paid_at as string | null,
          total_product_price: row.total_product_price as number,
          total_shipping_fee: row.total_shipping_fee as number,
          total_discount: row.total_discount as number,
          payment_method: row.payment_method as string | null,
          recipient_name: row.recipient_name as string,
          shipping_address: row.shipping_address as string,
          cancel_reason: row.cancel_reason as string | null,
          refund_status: row.refund_status as string | null,
          refund_amount: row.refund_amount as number | null,
          first_item_name: items[0]?.product_name ?? "상품 없음",
          item_count: items.length,
        };
      });

      return { orders, total: count ?? 0 };
    },
    [supabase]
  );

  const fetchCancelRefundOrders = useCallback(
    async (page: number): Promise<{ orders: MyOrder[]; total: number }> => {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from("orders")
        .select(
          `id, order_number, final_price, status, created_at, paid_at,
           total_product_price, total_shipping_fee, total_discount,
           payment_method, recipient_name, shipping_address,
           cancel_reason, refund_status, refund_amount,
           order_items(product_name)`,
          { count: "exact" }
        )
        .or("status.eq.cancelled,refund_status.not.is.null")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        console.error("fetchCancelRefundOrders error:", error);
        return { orders: [], total: 0 };
      }

      const orders: MyOrder[] = (data ?? []).map((row: Record<string, unknown>) => {
        const items = (row.order_items as Array<{ product_name: string }>) ?? [];
        return {
          id: row.id as number,
          order_number: row.order_number as string,
          final_price: row.final_price as number,
          status: row.status as string,
          created_at: row.created_at as string,
          paid_at: row.paid_at as string | null,
          total_product_price: row.total_product_price as number,
          total_shipping_fee: row.total_shipping_fee as number,
          total_discount: row.total_discount as number,
          payment_method: row.payment_method as string | null,
          recipient_name: row.recipient_name as string,
          shipping_address: row.shipping_address as string,
          cancel_reason: row.cancel_reason as string | null,
          refund_status: row.refund_status as string | null,
          refund_amount: row.refund_amount as number | null,
          first_item_name: items[0]?.product_name ?? "상품 없음",
          item_count: items.length,
        };
      });

      return { orders, total: count ?? 0 };
    },
    [supabase]
  );

  const fetchOrderDetail = useCallback(
    async (orderId: number): Promise<MyOrderDetail | null> => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `*,
           order_items(id, product_id, product_name, product_price, quantity, subtotal),
           shipping_tracking(courier_name, tracking_number, status, tracking_details, shipped_at, delivered_at)`
        )
        .eq("id", orderId)
        .single();

      if (error || !data) {
        console.error("fetchOrderDetail error:", error);
        return null;
      }

      const raw = data as Record<string, unknown>;

      const trackingRows = raw.shipping_tracking as Array<Record<string, unknown>> | null;
      const trackingRow = Array.isArray(trackingRows) && trackingRows.length > 0
        ? trackingRows[0]
        : trackingRows && !Array.isArray(trackingRows)
        ? (trackingRows as unknown as Record<string, unknown>)
        : null;

      const shipping_tracking = trackingRow
        ? {
            courier_name: trackingRow.courier_name as string | undefined,
            tracking_number: trackingRow.tracking_number as string | undefined,
            status: trackingRow.status as string,
            tracking_details: (trackingRow.tracking_details as Array<{
              time: string;
              location: string;
              description: string;
            }>) ?? [],
            shipped_at: trackingRow.shipped_at as string | undefined,
            delivered_at: trackingRow.delivered_at as string | undefined,
          }
        : null;

      return {
        id: raw.id as number,
        order_number: raw.order_number as string,
        final_price: raw.final_price as number,
        status: raw.status as string,
        created_at: raw.created_at as string,
        paid_at: raw.paid_at as string | null,
        total_product_price: raw.total_product_price as number,
        total_shipping_fee: raw.total_shipping_fee as number,
        total_discount: raw.total_discount as number,
        payment_method: raw.payment_method as string | null,
        recipient_name: raw.recipient_name as string,
        shipping_address: raw.shipping_address as string,
        recipient_phone: raw.recipient_phone as string,
        shipping_zipcode: raw.shipping_zipcode as string | null,
        shipping_memo: raw.shipping_memo as string | null,
        cancel_reason: raw.cancel_reason as string | null,
        refund_status: raw.refund_status as string | null,
        refund_amount: raw.refund_amount as number | null,
        order_items: (raw.order_items as Array<{
          id: number;
          product_id: number;
          product_name: string;
          product_price: number;
          quantity: number;
          subtotal: number;
        }>) ?? [],
        shipping_tracking,
      };
    },
    [supabase]
  );

  return { fetchOrders, fetchCancelRefundOrders, fetchOrderDetail };
}
