"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export function useCancelRefund() {
  const [processing, setProcessing] = useState(false);

  const requestCancel = async (orderId: number, reason: string): Promise<boolean> => {
    if (!reason.trim() || reason.length > 1000) return false;

    const supabase = createClient();
    setProcessing(true);

    try {
      // Use conditional UPDATE to prevent TOCTOU race conditions.
      // Only succeeds if status is still pending/paid — no separate fetch needed.
      const { error } = await supabase
        .from("orders")
        .update({
          cancel_reason: reason.trim(),
          cancel_requested_at: new Date().toISOString(),
          status: "cancelled",
        })
        .eq("id", orderId)
        .in("status", ["pending", "paid"]);

      return !error;
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
      // Fetch only to get final_price for amount fallback and amount validation.
      const { data: order } = await supabase
        .from("orders")
        .select("final_price")
        .eq("id", orderId)
        .single();

      if (!order) return false;

      const refundAmount = amount ?? order.final_price;
      if (refundAmount <= 0 || refundAmount > order.final_price) return false;

      // Conditional UPDATE — only applies if status=delivered AND refund_status IS NULL,
      // preventing duplicate refund requests and TOCTOU race conditions.
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
