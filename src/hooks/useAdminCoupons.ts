import { useState, useCallback } from "react";
import type { Coupon, CreateCouponRequest, UpdateCouponRequest } from "@/types/coupon";

export type CouponFilter = "all" | "active" | "inactive" | "expired";

export function useAdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchCoupons = useCallback(
    async (page = 1, filter: CouponFilter = "all", keyword = "") => {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        filter,
        ...(keyword.trim() ? { keyword: keyword.trim() } : {}),
      });

      const res = await fetch(`/api/admin/coupons?${params}`);
      const json = await res.json();

      setCoupons(json.coupons ?? []);
      setTotal(json.total ?? 0);
      setLoading(false);
    },
    []
  );

  const createCoupon = useCallback(async (data: CreateCouponRequest): Promise<{ success: boolean; error?: string }> => {
    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error };
    return { success: true };
  }, []);

  const updateCoupon = useCallback(
    async (id: number, data: UpdateCouponRequest): Promise<{ success: boolean; error?: string }> => {
      const res = await fetch(`/api/admin/coupons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) return { success: false, error: json.error };

      setCoupons((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...json.coupon } : c))
      );
      return { success: true };
    },
    []
  );

  const toggleActive = useCallback(
    async (id: number, is_active: boolean): Promise<boolean> => {
      const res = await fetch(`/api/admin/coupons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active }),
      });
      if (!res.ok) return false;

      setCoupons((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_active } : c))
      );
      return true;
    },
    []
  );

  const issueToCoupon = useCallback(
    async (
      id: number,
      email: string,
      issue_epoch?: string
    ): Promise<{ success: boolean; error?: string }> => {
      const res = await fetch(`/api/admin/coupons/${id}/issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, issue_epoch }),
      });
      const json = await res.json();
      if (!res.ok) return { success: false, error: json.error };
      return { success: true };
    },
    []
  );

  return {
    coupons,
    loading,
    total,
    fetchCoupons,
    createCoupon,
    updateCoupon,
    toggleActive,
    issueToCoupon,
  };
}
