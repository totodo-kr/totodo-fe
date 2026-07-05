"use client";

import { createClient } from "@/utils/supabase/client";
import { useCallback } from "react";

export type MyOrderStatus =
  | "all"
  | "paid"
  | "shipped"
  | "delivered";

export interface MyOrder {
  id: number;
  order_number: string;
  final_price: number;
  status: string;
  order_type: string;
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
  first_item_name?: string;
  item_count?: number;
}

export interface EbookDownloadInfo {
  download_token: string;
  download_count: number;
  download_limit: number;
  expires_at: string | null;
}

export interface GifticonCodeInfo {
  id: number;
  status: string;
  revealed_at: string | null;
  // 코드 원문은 이 훅에서 절대 조회하지 않는다 — 반드시 /api/gifticon/reveal을 거쳐야
  // 화면에 노출되도록 하기 위함 (§6). 열람 후 프론트 state에서 채워짐.
  code?: string;
}

export interface PurchasedCouponInfo {
  id: number;
  status: string;
  used_at: string | null;
  coupon_code?: string | null;
  coupon_name?: string | null;
}

export interface OrderItemFulfillment {
  id: number;
  status: "success" | "failed" | "cancelled";
  ebook_download: EbookDownloadInfo | null;
  gifticon_codes: GifticonCodeInfo[];
  user_coupons: PurchasedCouponInfo[];
}

export interface MyOrderItemDetail {
  id: number;
  product_id: number;
  product_name: string;
  product_price: number;
  quantity: number;
  subtotal: number;
  delivery_type: string;
  digital_fulfillment: OrderItemFulfillment | null;
}

export interface MyOrderDetail extends MyOrder {
  recipient_phone: string;
  shipping_zipcode?: string | null;
  shipping_memo?: string | null;
  refund_reason?: string | null;
  refund_requested_at?: string | null;
  refund_completed_at?: string | null;
  cancel_requested_at?: string | null;
  order_items: MyOrderItemDetail[];
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

const ORDER_LIST_COLUMNS = `id, order_number, final_price, status, order_type, created_at, paid_at,
           total_product_price, total_shipping_fee, total_discount,
           payment_method, recipient_name, shipping_address,
           cancel_reason, refund_status, refund_amount,
           order_items(product_name)`;

function mapListRow(row: Record<string, unknown>): MyOrder {
  const items = (row.order_items as Array<{ product_name: string }>) ?? [];
  return {
    id: row.id as number,
    order_number: row.order_number as string,
    final_price: row.final_price as number,
    status: row.status as string,
    order_type: row.order_type as string,
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
}

// 1:1 관계(digital_fulfillment_id/order_item_id UNIQUE)도 PostgREST가 배열로 반환할 수 있어
// 배열/단일 객체 양쪽 모두 처리한다 (shipping_tracking과 동일 패턴).
function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value.length > 0 ? value[0] : null;
  return value ?? null;
}

export function useMyOrders() {
  const supabase = createClient();

  const fetchOrders = useCallback(
    async (
      page: number,
      status?: string
    ): Promise<{ orders: MyOrder[]; total: number }> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { orders: [], total: 0 };

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("orders")
        .select(ORDER_LIST_COLUMNS, { count: "exact" })
        .eq("user_id", user.id)
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

      const orders: MyOrder[] = (data ?? []).map((row) =>
        mapListRow(row as Record<string, unknown>)
      );

      return { orders, total: count ?? 0 };
    },
    [supabase]
  );

  const fetchCancelRefundOrders = useCallback(
    async (page: number): Promise<{ orders: MyOrder[]; total: number }> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { orders: [], total: 0 };

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from("orders")
        .select(ORDER_LIST_COLUMNS, { count: "exact" })
        .eq("user_id", user.id)
        .or("status.eq.cancelled,refund_status.not.is.null")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        console.error("fetchCancelRefundOrders error:", error);
        return { orders: [], total: 0 };
      }

      const orders: MyOrder[] = (data ?? []).map((row) =>
        mapListRow(row as Record<string, unknown>)
      );

      return { orders, total: count ?? 0 };
    },
    [supabase]
  );

  const fetchOrderDetail = useCallback(
    async (orderId: number): Promise<MyOrderDetail | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("orders")
        .select(
          `*,
           order_items(
             id, product_id, product_name, product_price, quantity, subtotal, delivery_type,
             digital_fulfillments(
               id, status,
               ebook_downloads(download_token, download_count, download_limit, expires_at),
               gifticon_codes!issued_to_fulfillment_id(id, status, revealed_at)
             )
           ),
           shipping_tracking(courier_name, tracking_number, status, tracking_details, shipped_at, delivered_at)`
        )
        .eq("id", orderId)
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        console.error("fetchOrderDetail error:", error);
        return null;
      }

      const raw = data as Record<string, unknown>;

      const trackingRow = firstOrNull(
        raw.shipping_tracking as Record<string, unknown> | Record<string, unknown>[] | null
      );

      const shipping_tracking = trackingRow
        ? {
            courier_name: trackingRow.courier_name as string | undefined,
            tracking_number: trackingRow.tracking_number as string | undefined,
            status: trackingRow.status as string,
            tracking_details:
              (trackingRow.tracking_details as Array<{
                time: string;
                location: string;
                description: string;
              }>) ?? [],
            shipped_at: trackingRow.shipped_at as string | undefined,
            delivered_at: trackingRow.delivered_at as string | undefined,
          }
        : null;

      const rawItems =
        (raw.order_items as Array<Record<string, unknown>>) ?? [];

      // digital_fulfillments.id 목록 확보 → user_coupons를 별도 조회해 붙인다
      // (user_coupons는 digital_fulfillments의 자식이 아니라 digital_fulfillment_id로만
      //  연결되어 있어 위 nested select에 포함되지 않음)
      const fulfillmentByItemId = new Map<number, Record<string, unknown>>();
      for (const item of rawItems) {
        const fulfillment = firstOrNull(
          item.digital_fulfillments as Record<string, unknown> | Record<string, unknown>[] | null
        );
        if (fulfillment) {
          fulfillmentByItemId.set(item.id as number, fulfillment);
        }
      }

      const fulfillmentIds = Array.from(fulfillmentByItemId.values()).map(
        (f) => f.id as number
      );

      const userCouponsByFulfillmentId = new Map<number, PurchasedCouponInfo[]>();
      if (fulfillmentIds.length > 0) {
        const { data: userCoupons } = await supabase
          .from("user_coupons")
          .select("id, status, used_at, digital_fulfillment_id, coupons(code, name)")
          .in("digital_fulfillment_id", fulfillmentIds);

        for (const uc of (userCoupons ?? []) as Array<Record<string, unknown>>) {
          const fulfillmentId = uc.digital_fulfillment_id as number;
          const coupon = firstOrNull(
            uc.coupons as Record<string, unknown> | Record<string, unknown>[] | null
          );
          const list = userCouponsByFulfillmentId.get(fulfillmentId) ?? [];
          list.push({
            id: uc.id as number,
            status: uc.status as string,
            used_at: uc.used_at as string | null,
            coupon_code: coupon?.code as string | undefined,
            coupon_name: coupon?.name as string | undefined,
          });
          userCouponsByFulfillmentId.set(fulfillmentId, list);
        }
      }

      const order_items: MyOrderItemDetail[] = rawItems.map((item) => {
        const fulfillmentRow = fulfillmentByItemId.get(item.id as number) ?? null;

        let digital_fulfillment: OrderItemFulfillment | null = null;
        if (fulfillmentRow) {
          const fulfillmentId = fulfillmentRow.id as number;
          const ebookRow = firstOrNull(
            fulfillmentRow.ebook_downloads as Record<string, unknown> | Record<string, unknown>[] | null
          );

          digital_fulfillment = {
            id: fulfillmentId,
            status: fulfillmentRow.status as "success" | "failed" | "cancelled",
            ebook_download: ebookRow
              ? {
                  download_token: ebookRow.download_token as string,
                  download_count: ebookRow.download_count as number,
                  download_limit: ebookRow.download_limit as number,
                  expires_at: ebookRow.expires_at as string | null,
                }
              : null,
            gifticon_codes:
              (fulfillmentRow.gifticon_codes as Array<{
                id: number;
                status: string;
                revealed_at: string | null;
              }>) ?? [],
            user_coupons: userCouponsByFulfillmentId.get(fulfillmentId) ?? [],
          };
        }

        return {
          id: item.id as number,
          product_id: item.product_id as number,
          product_name: item.product_name as string,
          product_price: item.product_price as number,
          quantity: item.quantity as number,
          subtotal: item.subtotal as number,
          delivery_type: item.delivery_type as string,
          digital_fulfillment,
        };
      });

      return {
        id: raw.id as number,
        order_number: raw.order_number as string,
        final_price: raw.final_price as number,
        status: raw.status as string,
        order_type: raw.order_type as string,
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
        cancel_requested_at: raw.cancel_requested_at as string | null,
        refund_status: raw.refund_status as string | null,
        refund_amount: raw.refund_amount as number | null,
        refund_reason: raw.refund_reason as string | null,
        refund_requested_at: raw.refund_requested_at as string | null,
        refund_completed_at: raw.refund_completed_at as string | null,
        order_items,
        shipping_tracking,
      };
    },
    [supabase]
  );

  return { fetchOrders, fetchCancelRefundOrders, fetchOrderDetail };
}
