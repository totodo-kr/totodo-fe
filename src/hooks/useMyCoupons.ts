import { useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import type { UserCoupon, UserCouponStatus } from "@/types/coupon";

export function useMyCoupons() {
  const { user } = useAuthStore();
  const [coupons, setCoupons] = useState<UserCoupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);

  const fetchCoupons = useCallback(
    async (filter: UserCouponStatus | "all" = "all") => {
      if (!user) return;
      setLoading(true);

      const supabase = createClient();
      let query = supabase
        .from("user_coupons")
        .select(`
          *,
          coupon:coupons (
            id, code, name, description,
            discount_type, discount_value, max_discount_amount,
            min_order_amount, valid_from, valid_until
          )
        `)
        .eq("user_id", user.id)
        .order("issued_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data } = await query;
      setCoupons((data as UserCoupon[]) ?? []);
      setLoading(false);
    },
    [user]
  );

  const registerByCode = useCallback(async (code: string): Promise<{ success: boolean; error?: string }> => {
    setRegistering(true);
    try {
      const res = await fetch("/api/coupons/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = await res.json();

      if (!res.ok) {
        return { success: false, error: json.error };
      }

      // 목록에 즉시 반영
      setCoupons((prev) => [json.user_coupon as UserCoupon, ...prev]);
      return { success: true };
    } catch {
      return { success: false, error: "처리 중 오류가 발생했습니다." };
    } finally {
      setRegistering(false);
    }
  }, []);

  return { coupons, loading, registering, fetchCoupons, registerByCode };
}
