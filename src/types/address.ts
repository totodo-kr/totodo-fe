// =============================================
// 배송지
// =============================================

export interface UserAddress {
  id: number;
  user_id: string;
  recipient_name: string;
  recipient_phone: string;
  zipcode: string;
  address: string;
  address_detail: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface AddressInput {
  recipient_name: string;
  recipient_phone: string;
  zipcode: string;
  address: string;
  address_detail?: string;
  is_default?: boolean;
}
