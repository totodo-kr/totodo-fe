export interface DeliveryPolicyInfo {
  shippingTitle: string;
  shipping: string[];
  returnTitle: string;
  returns: string[];
}

// TODO: digital_download/gifticon/coupon 문구는 초안입니다 — 실제 운영 정책 확정 후 검수 필요.
export const DELIVERY_POLICY_INFO: Record<string, DeliveryPolicyInfo> = {
  physical: {
    shippingTitle: "배송 안내",
    shipping: [
      "배송비: 3,000원 (50,000원 이상 구매 시 무료배송)",
      "배송 기간: 주문 후 2-3일 소요",
      "제주도 및 도서산간 지역은 추가 배송비가 발생할 수 있습니다.",
    ],
    returnTitle: "교환/반품 안내",
    returns: [
      "교환 및 반품은 상품 수령 후 7일 이내 가능합니다.",
      "단순 변심에 의한 교환/반품 시 왕복 배송비는 고객 부담입니다.",
      "상품 하자 또는 오배송의 경우 무료로 교환/반품 가능합니다.",
      "포장을 개봉하였거나 사용한 흔적이 있는 경우 교환/반품이 불가능합니다.",
    ],
  },
  digital_download: {
    shippingTitle: "이용 안내",
    shipping: [
      "결제 완료 즉시 다운로드 링크가 발급됩니다.",
      "마이페이지 > 구매내역에서 다시 다운로드할 수 있습니다.",
    ],
    returnTitle: "환불 안내",
    returns: [
      "파일을 1회 이상 다운로드한 이후에는 환불이 불가능합니다.",
      "파일 손상 등 상품 하자의 경우 재발급 또는 환불이 가능합니다.",
    ],
  },
  gifticon: {
    shippingTitle: "발급 안내",
    shipping: ["결제 완료 후 문자/알림으로 기프티콘이 즉시 발급됩니다."],
    returnTitle: "환불 안내",
    returns: [
      "기프티콘 사용 전에 한해 구매일로부터 7일 이내 환불이 가능합니다.",
      "유효기간이 지났거나 사용된 기프티콘은 환불이 불가능합니다.",
    ],
  },
  coupon: {
    shippingTitle: "발급 안내",
    shipping: ["결제 완료 후 즉시 쿠폰이 발급되어 마이페이지에서 확인할 수 있습니다."],
    returnTitle: "환불 안내",
    returns: [
      "쿠폰 사용 전에 한해 구매일로부터 7일 이내 환불이 가능합니다.",
      "사용된 쿠폰은 환불이 불가능합니다.",
    ],
  },
};

export function getDeliveryPolicyInfo(deliveryType: string): DeliveryPolicyInfo {
  return DELIVERY_POLICY_INFO[deliveryType] ?? DELIVERY_POLICY_INFO.physical;
}
