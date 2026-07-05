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
    gifticon_code?: { revealed_at: string | null } | null;
    // §4 매트릭스의 coupon 행(발급 쿠폰 active/used)을 판단하기 위해
    // plan 원안 인터페이스에 없던 필드를 추가함 — user_coupons.status를
    // digital_fulfillment_id로 조인해 채운다 (cancel/route.ts와 동일 조인 패턴).
    user_coupon?: { status: string } | null;
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
      const status = item.digital_fulfillment?.user_coupon?.status;
      if (status !== "active") {
        return { allowed: false, reason: "이미 사용되었거나 취소된 쿠폰입니다." };
      }
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
      const revealedAt = item.digital_fulfillment?.gifticon_code?.revealed_at ?? null;
      return { allowed: true, excludeAmount: revealedAt !== null };
    }

    case "coupon": {
      const status = item.digital_fulfillment?.user_coupon?.status;
      if (status === "used") {
        return { allowed: true, excludeAmount: true };
      }
      if (status === "active") {
        return { allowed: true, excludeAmount: false };
      }
      return { allowed: false, excludeAmount: false, reason: "환불 대상이 아닙니다." };
    }

    default:
      return { allowed: false, excludeAmount: false, reason: "알 수 없는 상품 유형입니다." };
  }
}
