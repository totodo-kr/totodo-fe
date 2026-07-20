// 실물 vs 디지털 상품 취소/환불 정책 — 순수 함수 (DB 호출 없음, 서버/클라이언트 양쪽 재사용)
// 정책 매트릭스 원본: plans/digital_physical_item.md §4

export type FulfillmentStatus = "success" | "failed" | "cancelled";

export interface OrderItemWithFulfillment {
  id: number;
  delivery_type: string;
  product_price: number;
  quantity: number;
  digital_fulfillment?: {
    status: FulfillmentStatus;
    ebook_download?: { download_count: number } | null;
    // 기프티콘/쿠폰은 quantity > 1이면 하나의 fulfillment에 코드/쿠폰이 여러 개 딸릴 수 있다
    // (issued_to_fulfillment_id, digital_fulfillment_id 모두 1:N) — 배열로 받는다.
    gifticon_codes?: Array<{ revealed_at: string | null }>;
    user_coupons?: Array<{ status: string }>;
  } | null;
}

export interface OrderForPolicy {
  status: string;
  paid_at: string | null;
  delivered_at?: string | null;
}

export const DIGITAL_CANCEL_WINDOW_HOURS = 24;
export const PHYSICAL_REFUND_WINDOW_DAYS = 7;

export interface CancelEligibility {
  allowed: boolean;
  reason?: string;
}

export interface RefundEligibility {
  allowed: boolean;
  excludeAmount: boolean;
  reason?: string;
}

export interface OrderRefundEligibility {
  allowed: boolean;
  reason?: string;
}

export interface OrderDeliveryState {
  status: string;
  order_type: string;
  delivered_at?: string | null;
}

function hoursSince(isoDate: string): number {
  return (Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60);
}

function daysSince(isoDate: string): number {
  return (Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24);
}

export function canCancelItem(
  item: OrderItemWithFulfillment,
  order: OrderForPolicy
): CancelEligibility {
  switch (item.delivery_type) {
    case "physical": {
      if (!["pending", "paid"].includes(order.status)) {
        return { allowed: false, reason: "이미 배송이 시작되어 취소할 수 없습니다." };
      }
      return { allowed: true };
    }

    case "digital_download": {
      const downloadCount = item.digital_fulfillment?.ebook_download?.download_count ?? 0;
      if (downloadCount > 0) {
        return { allowed: false, reason: "다운로드한 상품은 취소할 수 없습니다." };
      }
      if (!order.paid_at) {
        return { allowed: false, reason: "결제 완료 후에만 취소할 수 있습니다." };
      }
      if (hoursSince(order.paid_at) > DIGITAL_CANCEL_WINDOW_HOURS) {
        return {
          allowed: false,
          reason: `결제 후 ${DIGITAL_CANCEL_WINDOW_HOURS}시간이 지나 취소할 수 없습니다.`,
        };
      }
      return { allowed: true };
    }

    case "gifticon": {
      // 열람 여부와 무관하게 항상 취소 가능 (배정된 코드는 void 처리, 재고 반납 안 함)
      return { allowed: true };
    }

    case "coupon": {
      // 쿠폰 사용 여부는 주문 취소 자체를 막지 않는다 — active 쿠폰만 cancelled 처리되고
      // used 쿠폰은 그대로 둔 채 환불 금액에서만 제외된다 (실제 cancel/route.ts 동작과 일치).
      return { allowed: true };
    }

    default:
      return { allowed: false, reason: "알 수 없는 상품 유형입니다." };
  }
}

export function canRefundItem(
  item: OrderItemWithFulfillment,
  order: OrderForPolicy
): RefundEligibility {
  switch (item.delivery_type) {
    case "physical": {
      if (order.status !== "delivered" || !order.delivered_at) {
        return { allowed: false, excludeAmount: false, reason: "배송 완료 후에만 환불 신청할 수 있습니다." };
      }
      if (daysSince(order.delivered_at) > PHYSICAL_REFUND_WINDOW_DAYS) {
        return {
          allowed: false,
          excludeAmount: false,
          reason: `배송 완료 후 ${PHYSICAL_REFUND_WINDOW_DAYS}일이 지나 환불할 수 없습니다.`,
        };
      }
      return { allowed: true, excludeAmount: false };
    }

    case "digital_download": {
      // 별도의 환불 창구 없음 — 취소와 동일 경로/동일 조건
      const cancelResult = canCancelItem(item, order);
      return { allowed: cancelResult.allowed, excludeAmount: false, reason: cancelResult.reason };
    }

    case "gifticon": {
      const codes = item.digital_fulfillment?.gifticon_codes ?? [];
      const anyRevealed = codes.some((c) => c.revealed_at !== null);
      return { allowed: true, excludeAmount: anyRevealed };
    }

    case "coupon": {
      const coupons = item.digital_fulfillment?.user_coupons ?? [];
      if (coupons.length === 0) {
        return { allowed: false, excludeAmount: false, reason: "환불 대상이 아닙니다." };
      }
      const anyUsed = coupons.some((c) => c.status === "used");
      return { allowed: true, excludeAmount: anyUsed };
    }

    default:
      return { allowed: false, excludeAmount: false, reason: "알 수 없는 상품 유형입니다." };
  }
}

// 주문 레벨 환불 가능 여부(배송 상태 + 7일 창) — useCancelRefund.ts(클라이언트 버튼 노출)와
// /api/payment/cancel(서버 승인 처리) 양쪽에서 동일 기준으로 재사용한다.
export function canRefundOrderByDeliveryState(order: OrderDeliveryState): OrderRefundEligibility {
  if (order.order_type === "digital") {
    // 완전 디지털 주문은 배송 개념이 없어 paid가 terminal 성공 상태
    if (order.status !== "paid") {
      return { allowed: false, reason: "환불 신청이 불가능한 상태입니다." };
    }
    return { allowed: true };
  }

  // physical / mixed — 배송 완료 후 7일 이내
  if (order.status !== "delivered" || !order.delivered_at) {
    return { allowed: false, reason: "배송 완료 후에만 환불 신청할 수 있습니다." };
  }
  if (daysSince(order.delivered_at) > PHYSICAL_REFUND_WINDOW_DAYS) {
    return {
      allowed: false,
      reason: `배송 완료 후 ${PHYSICAL_REFUND_WINDOW_DAYS}일이 지나 환불할 수 없습니다.`,
    };
  }
  return { allowed: true };
}
