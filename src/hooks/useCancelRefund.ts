import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export function useCancelRefund() {
  const [processing, setProcessing] = useState(false);

  /**
   * requestCancel — 주문 취소 신청
   * status 가 'pending' 또는 'paid' 인 주문에만 허용
   */
  const requestCancel = async (orderId: number, reason: string): Promise<boolean> => {
    const supabase = createClient();
    setProcessing(true);

    try {
      // 현재 주문 상태 확인
      const { data: order, error: fetchError } = await supabase
        .from("orders")
        .select("id, status")
        .eq("id", orderId)
        .single();

      if (fetchError || !order) {
        return false;
      }

      if (order.status !== "pending" && order.status !== "paid") {
        return false;
      }

      const { error } = await supabase
        .from("orders")
        .update({
          cancel_reason: reason,
          cancel_requested_at: new Date().toISOString(),
          status: "cancelled",
        })
        .eq("id", orderId);

      return !error;
    } finally {
      setProcessing(false);
    }
  };

  /**
   * requestRefund — 환불 신청
   * status 가 'delivered' 이고 refund_status 가 null 인 주문에만 허용
   */
  const requestRefund = async (
    orderId: number,
    reason: string,
    amount?: number
  ): Promise<boolean> => {
    const supabase = createClient();
    setProcessing(true);

    try {
      // 현재 주문 상태 확인
      const { data: order, error: fetchError } = await supabase
        .from("orders")
        .select("id, status, refund_status, final_price")
        .eq("id", orderId)
        .single();

      if (fetchError || !order) {
        return false;
      }

      if (order.status !== "delivered" || order.refund_status !== null) {
        return false;
      }

      const refundAmount = amount ?? order.final_price;

      const { error } = await supabase
        .from("orders")
        .update({
          refund_reason: reason,
          refund_amount: refundAmount,
          refund_status: "requested",
          refund_requested_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      return !error;
    } finally {
      setProcessing(false);
    }
  };

  return { processing, requestCancel, requestRefund };
}
