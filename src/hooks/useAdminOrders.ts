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
  order_type: string;
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

export interface FulfillmentEbookInfo {
  id: number;
  download_token: string;
  download_count: number;
  download_limit: number;
  first_downloaded_at: string | null;
  expires_at: string | null;
}

export interface FulfillmentGifticonCode {
  id: number;
  status: string;
  revealed_at: string | null;
}

export interface FulfillmentUserCoupon {
  id: number;
  status: string;
  used_at: string | null;
}

export interface AdminFulfillmentItem {
  order_item_id: number;
  product_id: number;
  product_name: string;
  delivery_type: string;
  fulfillment: {
    id: number;
    status: "success" | "failed" | "cancelled";
    ebook_download: FulfillmentEbookInfo | null;
    gifticon_codes: FulfillmentGifticonCode[];
    user_coupons: FulfillmentUserCoupon[];
  } | null;
}

// 1:1 관계도 PostgREST가 배열로 반환할 수 있어 배열/단일 객체 양쪽 모두 처리한다.
function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value.length > 0 ? value[0] : null;
  return value ?? null;
}

const PAGE_SIZE = 15;

export function useAdminOrders() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchOrders = useCallback(
    async (page = 1, status?: OrderStatus | "" | "refund_requested" | "digital") => {
      const supabase = createClient();
      setLoading(true);

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("orders")
        .select(
          `id, order_number, user_id, total_product_price, total_shipping_fee,
           total_discount, final_price, recipient_name, recipient_phone,
           shipping_address, shipping_memo, status, order_type, payment_method, paid_at, created_at,
           cancel_reason, cancel_requested_at,
           refund_reason, refund_amount, refund_status, refund_requested_at, refund_completed_at`,
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(from, to);

      if (status === "refund_requested") {
        query = query.not("refund_status", "is", null);
      } else if (status === "digital") {
        query = query.eq("order_type", "digital").neq("status", "pending");
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

  // §11: 주문의 디지털 이행 현황 (order_items + digital_fulfillments + 자식 테이블 join)
  const fetchFulfillments = async (orderId: number): Promise<AdminFulfillmentItem[]> => {
    const supabase = createClient();

    const { data: rawItems } = await supabase
      .from("order_items")
      .select(
        `id, product_id, product_name, delivery_type,
         digital_fulfillments(
           id, status,
           ebook_downloads(id, download_token, download_count, download_limit, first_downloaded_at, expires_at),
           gifticon_codes!issued_to_fulfillment_id(id, status, revealed_at)
         )`
      )
      .eq("order_id", orderId)
      .neq("delivery_type", "physical");

    const items = (rawItems as Array<Record<string, unknown>>) ?? [];

    const fulfillmentByItemId = new Map<number, Record<string, unknown>>();
    for (const item of items) {
      const fulfillment = firstOrNull(
        item.digital_fulfillments as Record<string, unknown> | Record<string, unknown>[] | null
      );
      if (fulfillment) fulfillmentByItemId.set(item.id as number, fulfillment);
    }

    const fulfillmentIds = Array.from(fulfillmentByItemId.values()).map((f) => f.id as number);

    const userCouponsByFulfillmentId = new Map<number, FulfillmentUserCoupon[]>();
    if (fulfillmentIds.length > 0) {
      const { data: userCoupons } = await supabase
        .from("user_coupons")
        .select("id, status, used_at, digital_fulfillment_id")
        .in("digital_fulfillment_id", fulfillmentIds);

      for (const uc of (userCoupons ?? []) as Array<Record<string, unknown>>) {
        const fulfillmentId = uc.digital_fulfillment_id as number;
        const list = userCouponsByFulfillmentId.get(fulfillmentId) ?? [];
        list.push({
          id: uc.id as number,
          status: uc.status as string,
          used_at: uc.used_at as string | null,
        });
        userCouponsByFulfillmentId.set(fulfillmentId, list);
      }
    }

    return items.map((item) => {
      const fulfillmentRow = fulfillmentByItemId.get(item.id as number) ?? null;

      let fulfillment: AdminFulfillmentItem["fulfillment"] = null;
      if (fulfillmentRow) {
        const fulfillmentId = fulfillmentRow.id as number;
        const ebookRow = firstOrNull(
          fulfillmentRow.ebook_downloads as Record<string, unknown> | Record<string, unknown>[] | null
        );

        fulfillment = {
          id: fulfillmentId,
          status: fulfillmentRow.status as "success" | "failed" | "cancelled",
          ebook_download: ebookRow
            ? {
                id: ebookRow.id as number,
                download_token: ebookRow.download_token as string,
                download_count: ebookRow.download_count as number,
                download_limit: ebookRow.download_limit as number,
                first_downloaded_at: ebookRow.first_downloaded_at as string | null,
                expires_at: ebookRow.expires_at as string | null,
              }
            : null,
          gifticon_codes: (fulfillmentRow.gifticon_codes as FulfillmentGifticonCode[]) ?? [],
          user_coupons: userCouponsByFulfillmentId.get(fulfillmentId) ?? [],
        };
      }

      return {
        order_item_id: item.id as number,
        product_id: item.product_id as number,
        product_name: item.product_name as string,
        delivery_type: item.delivery_type as string,
        fulfillment,
      };
    });
  };

  // §11: 다운로드 횟수 초기화
  const resetDownloadCount = async (ebookDownloadId: number): Promise<boolean> => {
    const supabase = createClient();
    const { error } = await supabase
      .from("ebook_downloads")
      .update({ download_count: 0, first_downloaded_at: null })
      .eq("id", ebookDownloadId);
    return !error;
  };

  // §11: 기프티콘 코드 재발급 — claim_gifticon_code RPC는 service_role 전용이라
  // 브라우저에서 직접 호출할 수 없다. 서버 라우트를 거친다.
  const reissueGifticonCode = async (gifticonCodeId: number): Promise<boolean> => {
    const res = await fetch("/api/admin/gifticon/reissue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gifticon_code_id: gifticonCodeId }),
    });
    return res.ok;
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
    fetchFulfillments,
    resetDownloadCount,
    reissueGifticonCode,
    updateStatus,
    processRefund,
  };
}
