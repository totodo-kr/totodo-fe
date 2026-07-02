"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export function useCancelRefund() {
  const [processing, setProcessing] = useState(false);

  const requestCancel = async (orderId: number, reason: string): Promise<boolean> => {
    if (!reason.trim() || reason.length > 1000) return false;

    setProcessing(true);
    try {
      const res = await fetch("/api/payment/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, reason, mode: "cancel" }),
      });
      return res.ok;
    } finally {
      setProcessing(false);
    }
  };

  const requestRefund = async (
    orderId: number,
    reason: string,
    amount?: number
  ): Promise<boolean> => {
    if (!reason.trim() || reason.length > 1000) return false;

    const supabase = createClient();
    setProcessing(true);

    try {
      const { data: order } = await supabase
        .from("orders")
        .select("final_price")
        .eq("id", orderId)
        .single();

      if (!order) return false;

      const refundAmount = amount ?? order.final_price;
      if (refundAmount < 0 || refundAmount > order.final_price) return false;

      const { error } = await supabase
        .from("orders")
        .update({
          refund_reason: reason.trim(),
          refund_amount: refundAmount,
          refund_status: "requested",
          refund_requested_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .eq("status", "delivered")
        .is("refund_status", null);

      return !error;
    } finally {
      setProcessing(false);
    }
  };

  return { processing, requestCancel, requestRefund };
}
