"use client";

import { useState } from "react";
import {
  canCancelItem,
  canRefundItem,
  canRefundOrderByDeliveryState,
  type CancelEligibility,
  type RefundEligibility,
  type OrderItemWithFulfillment,
  type OrderForPolicy,
} from "@/lib/fulfillment/cancelPolicy";

export interface OrderEligibility {
  orderCancelAllowed: boolean;
  orderCancelReason?: string;
  orderRefundAllowed: boolean;
  orderRefundReason?: string;
  cancelEligibility: Map<number, CancelEligibility>;
  refundEligibility: Map<number, RefundEligibility>;
}

interface OrderForEligibility extends OrderForPolicy {
  order_type: string;
  refund_status?: string | null;
}

/**
 * 주문 레벨 취소/환불 가능 여부 + 아이템별 eligibility map.
 * 취소/환불 자체는 여전히 주문 단위 액션(단일 Toss 거래)이므로, 아이템 중 하나라도
 * 취소를 막는 조건(예: 다운로드 완료한 digital_download)이 있으면 주문 전체 취소를 막는다.
 * 쿠폰/기프티콘은 사용/열람 여부와 무관하게 취소 자체는 막지 않고 환불 금액만 줄어든다.
 */
export function computeOrderEligibility(
  order: OrderForEligibility,
  items: OrderItemWithFulfillment[]
): OrderEligibility {
  const cancelEligibility = new Map<number, CancelEligibility>();
  const refundEligibility = new Map<number, RefundEligibility>();

  for (const item of items) {
    cancelEligibility.set(item.id, canCancelItem(item, order));
    refundEligibility.set(item.id, canRefundItem(item, order));
  }

  const orderStatusCancellable = order.status === "pending" || order.status === "paid";
  const blockingCancelItem = items.find((item) => !cancelEligibility.get(item.id)?.allowed);

  const orderCancelAllowed = orderStatusCancellable && !blockingCancelItem;
  const orderCancelReason = !orderStatusCancellable
    ? "이미 처리된 주문은 취소할 수 없습니다."
    : blockingCancelItem
    ? cancelEligibility.get(blockingCancelItem.id)?.reason
    : undefined;

  let orderRefundAllowed = false;
  let orderRefundReason: string | undefined;

  if (order.refund_status) {
    orderRefundReason = "이미 환불 신청이 접수되었거나 처리 완료된 주문입니다.";
  } else {
    const deliveryEligibility = canRefundOrderByDeliveryState(order);
    orderRefundAllowed = deliveryEligibility.allowed;
    orderRefundReason = deliveryEligibility.reason;
  }

  return {
    orderCancelAllowed,
    orderCancelReason,
    orderRefundAllowed,
    orderRefundReason,
    cancelEligibility,
    refundEligibility,
  };
}

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

    setProcessing(true);
    try {
      const res = await fetch("/api/orders/refund-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, reason, amount }),
      });
      return res.ok;
    } finally {
      setProcessing(false);
    }
  };

  return { processing, requestCancel, requestRefund };
}
