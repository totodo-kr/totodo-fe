import { useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import type { UserCoupon, ValidateCouponResponse } from "@/types/coupon";

export function useCouponValidate() {
  const { user } = useAuthStore();
  const [availableCoupons, setAvailableCoupons] = useState<UserCoupon[]>([]);
  const [selectedCouponId, setSelectedCouponId] = useState<number | null>(null);
  const [discount, setDiscount] = useState<ValidateCouponResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);

  const fetchAvailableCoupons = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const supabase = createClient();
    const { data } = await supabase
      .from("user_coupons")
      .select(`
        *,
        coupon:coupons (
          id, name, discount_type, discount_value, max_discount_amount,
          min_order_amount, valid_from, valid_until
        )
      `)
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("issued_at", { ascending: false });

    setAvailableCoupons((data as UserCoupon[]) ?? []);
    setLoading(false);
  }, [user]);

  const selectCoupon = useCallback(
    async (
      userCouponId: number | null,
      productAmount: number,
      shippingFee: number
    ): Promise<ValidateCouponResponse | null> => {
      if (userCouponId === null) {
        setSelectedCouponId(null);
        setDiscount(null);
        return null;
      }

      setValidating(true);
      try {
        const res = await fetch("/api/coupons/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_coupon_id: userCouponId,
            product_amount: productAmount,
            shipping_fee: shippingFee,
          }),
        });
        const json = await res.json();

        if (!res.ok) {
          return null;
        }

        setSelectedCouponId(userCouponId);
        setDiscount(json as ValidateCouponResponse);
        return json as ValidateCouponResponse;
      } catch {
        return null;
      } finally {
        setValidating(false);
      }
    },
    []
  );

  const clearCoupon = useCallback(() => {
    setSelectedCouponId(null);
    setDiscount(null);
  }, []);

  return {
    availableCoupons,
    selectedCouponId,
    discount,
    loading,
    validating,
    fetchAvailableCoupons,
    selectCoupon,
    clearCoupon,
  };
}
