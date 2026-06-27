// =============================================
// 쿠폰 템플릿
// =============================================

export type DiscountType = 'fixed' | 'percentage' | 'free_shipping';
export type IssueMethod = 'code' | 'admin_direct' | 'purchase';
export type IssueEpochType = 'once' | 'monthly' | 'manual';
export type UserCouponStatus = 'active' | 'used' | 'expired' | 'cancelled';

export interface Coupon {
  id: number;
  code: string;
  name: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  max_discount_amount: number | null;
  min_order_amount: number;
  issue_method: IssueMethod;
  issue_epoch_type: IssueEpochType;
  max_issue_count: number | null;
  issued_count: number;
  used_count: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================
// 유저별 쿠폰 인스턴스
// =============================================

export interface UserCoupon {
  id: number;
  user_id: string;
  coupon_id: number;
  issue_epoch: string;
  status: UserCouponStatus;
  issue_method: IssueMethod;
  issued_at: string;
  issued_admin_id: string | null;
  used_at: string | null;
  used_order_id: number | null;
  restored_at: string | null;
  coupon?: Coupon;
}

// =============================================
// API 요청/응답
// =============================================

export interface RegisterCouponRequest {
  code: string;
}

export interface RegisterCouponResponse {
  user_coupon: UserCoupon;
}

export interface ValidateCouponRequest {
  user_coupon_id: number;
  product_amount: number;
  shipping_fee: number;
}

export interface ValidateCouponResponse {
  coupon_discount: number;
  shipping_discount: number;
  final_price: number;
}

export interface CreateCouponRequest {
  code: string;
  name: string;
  description?: string;
  discount_type: DiscountType;
  discount_value: number;
  max_discount_amount?: number;
  min_order_amount?: number;
  issue_method: IssueMethod;
  issue_epoch_type: IssueEpochType;
  max_issue_count?: number;
  valid_from?: string;
  valid_until?: string;
}

export interface UpdateCouponRequest {
  name?: string;
  description?: string;
  discount_value?: number;
  max_discount_amount?: number;
  min_order_amount?: number;
  max_issue_count?: number;
  valid_from?: string;
  valid_until?: string;
  is_active?: boolean;
}

export interface IssueCouponRequest {
  email: string;
  issue_epoch?: string;
}

export interface IssueCouponResponse {
  user_coupon: UserCoupon;
}
