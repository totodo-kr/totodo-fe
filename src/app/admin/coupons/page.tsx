"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AdminPageHeader, AdminTable } from "@/components/admin/organisms";
import {
  SearchBar,
  ResultCount,
  Pagination,
  FilterTabs,
  ToggleButton,
} from "@/components/admin/molecules";
import { useAdminCoupons, type CouponFilter } from "@/hooks/useAdminCoupons";
import type { Coupon } from "@/types/coupon";

const PAGE_SIZE = 20;

const COLUMNS = [
  { label: "쿠폰명 / 코드" },
  { label: "할인", className: "text-center" },
  { label: "유효기간", className: "text-center" },
  { label: "발급 / 사용", className: "text-center" },
  { label: "상태", className: "text-center" },
  { label: "관리", className: "text-center" },
];
const GRID = "1fr 120px 150px 90px 80px 60px";

const FILTER_TABS = [
  { label: "전체", value: "all" as CouponFilter },
  { label: "활성", value: "active" as CouponFilter },
  { label: "비활성", value: "inactive" as CouponFilter },
  { label: "만료됨", value: "expired" as CouponFilter },
];

const DISCOUNT_TYPE_LABELS: Record<string, string> = {
  fixed: "정액",
  percentage: "정률",
  free_shipping: "무료배송",
};

function formatDiscount(coupon: Coupon) {
  if (coupon.discount_type === "fixed") return `${coupon.discount_value.toLocaleString()}원`;
  if (coupon.discount_type === "percentage") {
    const base = `${coupon.discount_value}%`;
    return coupon.max_discount_amount
      ? `${base} (최대 ${coupon.max_discount_amount.toLocaleString()}원)`
      : base;
  }
  return "무료배송";
}

function formatDate(s: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function isExpired(coupon: Coupon) {
  return !!coupon.valid_until && new Date(coupon.valid_until) < new Date();
}

export default function AdminCouponsPage() {
  const { coupons, loading, total, fetchCoupons, toggleActive } = useAdminCoupons();

  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [filter, setFilter] = useState<CouponFilter>("all");
  const [pendingId, setPendingId] = useState<number | null>(null);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const load = useCallback(
    (p: number, kw: string, f: CouponFilter) => fetchCoupons(p, f, kw),
    [fetchCoupons]
  );

  useEffect(() => {
    load(1, "", "all");
  }, [load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load(1, keyword, filter);
  };

  const handleFilter = (f: CouponFilter) => {
    setFilter(f);
    setPage(1);
    load(1, keyword, f);
  };

  const handlePage = (p: number) => {
    setPage(p);
    load(p, keyword, filter);
  };

  const handleToggle = async (coupon: Coupon) => {
    setPendingId(coupon.id);
    await toggleActive(coupon.id, !coupon.is_active);
    setPendingId(null);
  };

  return (
    <div className="p-8 max-w-6xl">
      <AdminPageHeader
        title="쿠폰 관리"
        description="쿠폰 템플릿을 생성하고 유저에게 직접 발급합니다."
        action={{ label: "새 쿠폰 추가", href: "/admin/coupons/write" }}
      />

      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <SearchBar
          value={keyword}
          onChange={setKeyword}
          onSubmit={handleSearch}
          placeholder="쿠폰명 또는 코드 검색"
          className="max-w-80"
        />
        <ResultCount total={total} unit="개" />
      </div>

      <FilterTabs tabs={FILTER_TABS} active={filter} onChange={handleFilter} />

      <AdminTable
        columns={COLUMNS}
        gridTemplateColumns={GRID}
        loading={loading}
        isEmpty={coupons.length === 0}
        emptyMessage="쿠폰이 없습니다."
      >
        {coupons.map((coupon) => {
          const expired = isExpired(coupon);
          return (
            <div
              key={coupon.id}
              className="grid items-center px-5 py-3.5 border-b last:border-b-0 hover:bg-[#efe9de]/30 transition-colors"
              style={{ gridTemplateColumns: GRID, borderColor: "#e6dfd8" }}
            >
              {/* 쿠폰명 / 코드 */}
              <Link href={`/admin/coupons/${coupon.id}`} className="min-w-0 pr-3 group">
                <p
                  className="text-sm font-medium truncate group-hover:underline"
                  style={{ color: "#252523" }}
                >
                  {coupon.name}
                </p>
                <p className="text-xs mt-0.5 font-mono" style={{ color: "#8e8b82" }}>
                  {coupon.code}
                </p>
              </Link>

              {/* 할인 */}
              <div className="text-center">
                <span
                  className="text-xs px-2 py-0.5 rounded-full block w-fit mx-auto mb-0.5"
                  style={{ background: "#efe9de", color: "#6c6a64" }}
                >
                  {DISCOUNT_TYPE_LABELS[coupon.discount_type]}
                </span>
                <span className="text-xs font-medium" style={{ color: "#252523" }}>
                  {formatDiscount(coupon)}
                </span>
              </div>

              {/* 유효기간 */}
              <div className="text-center text-xs" style={{ color: "#6c6a64" }}>
                {coupon.valid_from || coupon.valid_until ? (
                  <>
                    <div>{formatDate(coupon.valid_from)}</div>
                    <div>~ {formatDate(coupon.valid_until)}</div>
                  </>
                ) : (
                  <span>기간 없음</span>
                )}
              </div>

              {/* 발급 / 사용 */}
              <div className="text-center text-xs" style={{ color: "#6c6a64" }}>
                <span style={{ color: "#252523" }}>{coupon.issued_count}</span>
                {coupon.max_issue_count !== null && (
                  <span> / {coupon.max_issue_count}</span>
                )}
                <br />
                <span>사용 {coupon.used_count}</span>
              </div>

              {/* 상태 */}
              <div className="flex justify-center">
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={
                    expired
                      ? { background: "#fdecea", color: "#c64545" }
                      : coupon.is_active
                      ? { background: "#e8f5e9", color: "#2e7d32" }
                      : { background: "#efe9de", color: "#6c6a64" }
                  }
                >
                  {expired ? "만료" : coupon.is_active ? "활성" : "비활성"}
                </span>
              </div>

              {/* 관리 */}
              <div className="flex justify-center">
                <ToggleButton
                  active={coupon.is_active}
                  pending={pendingId === coupon.id}
                  activeColor="#5db872"
                  activeLabel="ON"
                  inactiveLabel="OFF"
                  onClick={() => handleToggle(coupon)}
                />
              </div>
            </div>
          );
        })}
      </AdminTable>

      <Pagination page={page} totalPages={totalPages} loading={loading} onChange={handlePage} />
    </div>
  );
}
