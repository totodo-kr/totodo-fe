"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { Ticket } from "lucide-react";
import { Spinner } from "@/components/ui/atoms";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import SettingsLayout from "@/components/SettingsLayout";
import PageLoading from "@/components/PageLoading";
import { useMyCoupons } from "@/hooks/useMyCoupons";
import type { UserCoupon } from "@/types/coupon";

function formatDiscount(uc: UserCoupon) {
  const c = uc.coupon;
  if (!c) return "";
  if (c.discount_type === "fixed") return `${c.discount_value.toLocaleString()}원 할인`;
  if (c.discount_type === "percentage") {
    const base = `${c.discount_value}% 할인`;
    return c.max_discount_amount ? `${base} (최대 ${c.max_discount_amount.toLocaleString()}원)` : base;
  }
  return "무료배송";
}

function formatExpiry(until: string | null | undefined) {
  if (!until) return "기간 없음";
  const d = new Date(until);
  const now = new Date();
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  if (diffDays < 0) return `${dateStr} 만료됨`;
  if (diffDays <= 7) return `D-${diffDays} (${dateStr})`;
  return `~${dateStr}`;
}

function CouponCard({ uc }: { uc: UserCoupon }) {
  const isActive = uc.status === "active";
  const isUsed = uc.status === "used";

  return (
    <div
      className={`rounded-2xl border p-5 transition-opacity ${!isActive ? "opacity-60" : ""}`}
      style={{ background: "#1a1a1a", borderColor: "rgba(255,255,255,0.05)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-base truncate">
            {uc.coupon?.name ?? "—"}
          </p>
          <p className="text-brand-400 font-bold text-xl mt-1">{formatDiscount(uc)}</p>
          {uc.coupon?.min_order_amount ? (
            <p className="text-gray-500 text-xs mt-1">
              {uc.coupon.min_order_amount.toLocaleString()}원 이상 주문 시 사용 가능
            </p>
          ) : null}
        </div>
        <span
          className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${
            isActive
              ? "bg-brand-500/20 text-brand-400"
              : isUsed
              ? "bg-white/5 text-gray-500"
              : "bg-red-500/10 text-red-400"
          }`}
        >
          {isActive ? "사용 가능" : isUsed ? "사용 완료" : "만료/취소"}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {isUsed ? "사용됨" : formatExpiry(uc.coupon?.valid_until)}
        </span>
        <span className="text-xs text-gray-600 font-mono">{uc.coupon?.code}</span>
      </div>
    </div>
  );
}

export default function MyCouponsPage() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();
  const { coupons, loading, registering, fetchCoupons, registerByCode } = useMyCoupons();

  const [activeTab, setActiveTab] = useState<"available" | "used">("available");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const fetched = useRef(false);

  useEffect(() => {
    if (!isLoading && !user) router.push("/");
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user && !fetched.current) {
      fetched.current = true;
      fetchCoupons("all");
    }
  }, [user, fetchCoupons]);

  if (isLoading) return <PageLoading variant="top" />;
  if (!user) return null;

  const activeCoupons = coupons.filter((c) => c.status === "active");
  const doneCoupons = coupons.filter((c) => c.status !== "active");

  const displayed = activeTab === "available" ? activeCoupons : doneCoupons;

  const handleRegister = async () => {
    if (!code.trim()) return;
    setError("");
    const { success, error: err } = await registerByCode(code.trim());
    if (success) {
      setCode("");
      fetchCoupons("all");
    } else {
      setError(err ?? "등록에 실패했습니다.");
    }
  };

  return (
    <SettingsLayout title="내 쿠폰함">
      {/* 코드 등록 */}
      <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-white/5 shadow-lg mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleRegister()}
            placeholder="쿠폰 코드를 입력해 주세요."
            className="flex-1 h-12 px-4 bg-black/30 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-brand-500/50 font-mono"
          />
          <button
            onClick={handleRegister}
            disabled={registering || !code.trim()}
            className="h-12 px-6 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {registering && <Spinner size="sm" color="#fff" />}
            등록
          </button>
        </div>
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      </div>

      {/* 탭 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab("available")}
          className={`flex-1 h-12 rounded-lg font-medium transition-colors ${
            activeTab === "available"
              ? "bg-brand-500 text-white"
              : "bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a]"
          }`}
        >
          사용 가능 {activeCoupons.length}
        </button>
        <button
          onClick={() => setActiveTab("used")}
          className={`flex-1 h-12 rounded-lg font-medium transition-colors ${
            activeTab === "used"
              ? "bg-brand-500 text-white"
              : "bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a]"
          }`}
        >
          사용 완료/만료 {doneCoupons.length}
        </button>
      </div>

      {/* 쿠폰 목록 */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Spinner size="lg" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="bg-[#1a1a1a] rounded-2xl border border-white/5 shadow-lg min-h-[200px] flex items-center justify-center">
          <div className="text-center">
            <Ticket size={40} className="text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">
              {activeTab === "available" ? "사용 가능한 쿠폰이 없습니다." : "사용한 쿠폰이 없습니다."}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {displayed.map((uc) => (
            <CouponCard key={uc.id} uc={uc} />
          ))}
        </div>
      )}

      {/* 이용 안내 */}
      <div className="mt-6 bg-[#1a1a1a] rounded-2xl p-6 border border-white/5 shadow-lg">
        <h2 className="text-white font-semibold mb-4">쿠폰 이용 안내</h2>
        <ul className="text-sm text-gray-400 space-y-2">
          <li>• 쿠폰은 타인에게 양도될 수 없습니다.</li>
          <li>• 쿠폰의 적용 조건(대상, 혜택, 사용 조건 등)은 쿠폰별로 다를 수 있습니다.</li>
          <li>• 주문당 쿠폰 1개만 적용 가능합니다.</li>
          <li>• 부정한 방법으로 발급·사용한 쿠폰은 사전 고지 없이 회수될 수 있습니다.</li>
          <li>• 회원 탈퇴 시 보유 중인 모든 쿠폰은 복구될 수 없이 삭제됩니다.</li>
        </ul>
      </div>
    </SettingsLayout>
  );
}
