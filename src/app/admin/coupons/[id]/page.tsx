"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Send } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { AdminTable } from "@/components/admin/organisms";
import { Badge } from "@/components/admin/atoms";
import { useAdminCoupons } from "@/hooks/useAdminCoupons";
import type { Coupon, UserCoupon, IssueEpochType } from "@/types/coupon";

const fieldStyle = { background: "#efe9de", color: "#141413", borderColor: "#e6dfd8" };
const labelClass = "text-sm font-medium mb-1 block";

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  active:    { bg: "#e8f5e9", color: "#2e7d32" },
  used:      { bg: "#efe9de", color: "#6c6a64" },
  expired:   { bg: "#fdecea", color: "#c64545" },
  cancelled: { bg: "#f5f5f5", color: "#9e9e9e" },
};

const STATUS_LABELS: Record<string, string> = {
  active: "사용 가능", used: "사용됨", expired: "만료됨", cancelled: "취소됨",
};

const METHOD_LABELS: Record<string, string> = {
  code: "코드", admin_direct: "어드민", purchase: "구매",
};

function formatDate(s: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

interface IssuedRow extends UserCoupon {
  profile?: { name: string | null; email: string | null };
}

const HISTORY_COLUMNS = [
  { label: "유저" },
  { label: "발급 방식", className: "text-center" },
  { label: "상태", className: "text-center" },
  { label: "발급일", className: "text-center" },
  { label: "사용일", className: "text-center" },
];
const HISTORY_GRID = "1fr 90px 90px 150px 150px";

export default function AdminCouponDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { updateCoupon, issueToCoupon } = useAdminCoupons();

  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [issued, setIssued] = useState<IssuedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [issueEmail, setIssueEmail] = useState("");
  const [issueEpoch, setIssueEpoch] = useState("");
  const [issuing, setIssuing] = useState(false);

  const [saving, setSaving] = useState(false);
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [maxIssueCount, setMaxIssueCount] = useState("");

  const fetchCoupon = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("coupons")
      .select("*")
      .eq("id", id)
      .single();
    if (data) {
      setCoupon(data as Coupon);
      setValidFrom(data.valid_from ? data.valid_from.slice(0, 16) : "");
      setValidUntil(data.valid_until ? data.valid_until.slice(0, 16) : "");
      setMaxIssueCount(data.max_issue_count !== null ? String(data.max_issue_count) : "");
    }
    setLoading(false);
  }, [id]);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    const supabase = createClient();

    const { data: userCoupons } = await supabase
      .from("user_coupons")
      .select("*")
      .eq("coupon_id", id)
      .order("issued_at", { ascending: false })
      .limit(50);

    if (userCoupons && userCoupons.length > 0) {
      const userIds = [...new Set(userCoupons.map((uc) => uc.user_id as string))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", userIds);

      const profileMap = Object.fromEntries(
        (profiles ?? []).map((p) => [p.id, p])
      );
      setIssued(
        userCoupons.map((uc) => ({
          ...(uc as UserCoupon),
          profile: profileMap[uc.user_id as string] ?? undefined,
        }))
      );
    } else {
      setIssued([]);
    }
    setHistoryLoading(false);
  }, [id]);

  useEffect(() => {
    fetchCoupon();
    fetchHistory();
  }, [fetchCoupon, fetchHistory]);

  const handleSave = async () => {
    if (!coupon) return;
    setSaving(true);
    const { success, error } = await updateCoupon(coupon.id, {
      valid_from: validFrom || undefined,
      valid_until: validUntil || undefined,
      max_issue_count: maxIssueCount ? Number(maxIssueCount) : undefined,
    });
    setSaving(false);
    if (!success) alert(error ?? "저장에 실패했습니다.");
    else {
      alert("저장되었습니다.");
      fetchCoupon();
    }
  };

  const handleIssue = async () => {
    if (!coupon || !issueEmail.trim()) return;

    const needsEpoch =
      coupon.issue_method === "admin_direct" && coupon.issue_epoch_type === "manual";
    if (needsEpoch && !issueEpoch.trim()) {
      alert("manual 방식은 epoch 값을 직접 입력해주세요.");
      return;
    }

    setIssuing(true);
    const { success, error } = await issueToCoupon(
      coupon.id,
      issueEmail.trim(),
      needsEpoch ? issueEpoch.trim() : undefined
    );
    setIssuing(false);

    if (!success) {
      alert(error ?? "발급에 실패했습니다.");
    } else {
      alert(`${issueEmail} 에게 쿠폰이 발급되었습니다.`);
      setIssueEmail("");
      setIssueEpoch("");
      fetchHistory();
      fetchCoupon();
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="h-8 w-48 rounded animate-pulse" style={{ background: "#efe9de" }} />
      </div>
    );
  }

  if (!coupon) {
    return (
      <div className="p-8 text-sm" style={{ color: "#6c6a64" }}>
        쿠폰을 찾을 수 없습니다.
      </div>
    );
  }

  const epochTypeLabels: Record<IssueEpochType, string> = {
    once: "평생 1회",
    monthly: "월 1회",
    manual: "직접 입력",
  };

  return (
    <div className="p-8 max-w-4xl">
      <button
        type="button"
        onClick={() => router.push("/admin/coupons")}
        className="flex items-center gap-1 text-sm mb-6 transition-colors"
        style={{ color: "#6c6a64" }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#141413")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#6c6a64")}
      >
        <ChevronLeft className="w-4 h-4" />
        쿠폰 목록
      </button>

      {/* 쿠폰 기본 정보 */}
      <div
        className="rounded-xl border p-6 mb-6"
        style={{ background: "#faf9f5", borderColor: "#e6dfd8" }}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-semibold" style={{ color: "#141413" }}>{coupon.name}</h1>
            <p className="text-sm font-mono mt-1" style={{ color: "#8e8b82" }}>{coupon.code}</p>
          </div>
          <span
            className="text-xs px-2.5 py-1 rounded-full font-medium shrink-0"
            style={coupon.is_active
              ? { background: "#e8f5e9", color: "#2e7d32" }
              : { background: "#efe9de", color: "#6c6a64" }
            }
          >
            {coupon.is_active ? "활성" : "비활성"}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="mb-0.5" style={{ color: "#8e8b82" }}>할인 유형</p>
            <p className="font-medium" style={{ color: "#252523" }}>
              {coupon.discount_type === "fixed" && `${coupon.discount_value.toLocaleString()}원 할인`}
              {coupon.discount_type === "percentage" && `${coupon.discount_value}% 할인`}
              {coupon.discount_type === "free_shipping" && "무료배송"}
            </p>
          </div>
          <div>
            <p className="mb-0.5" style={{ color: "#8e8b82" }}>최소 주문금액</p>
            <p className="font-medium" style={{ color: "#252523" }}>
              {coupon.min_order_amount ? `${coupon.min_order_amount.toLocaleString()}원` : "없음"}
            </p>
          </div>
          <div>
            <p className="mb-0.5" style={{ color: "#8e8b82" }}>발급방식</p>
            <p className="font-medium" style={{ color: "#252523" }}>
              {coupon.issue_method === "code" && "코드 입력"}
              {coupon.issue_method === "admin_direct" && "어드민 직접"}
              {coupon.issue_method === "purchase" && "쿠폰 상품 구매"}
            </p>
          </div>
          <div>
            <p className="mb-0.5" style={{ color: "#8e8b82" }}>유저당 발급</p>
            <p className="font-medium" style={{ color: "#252523" }}>
              {epochTypeLabels[coupon.issue_epoch_type]}
            </p>
          </div>
          <div>
            <p className="mb-0.5" style={{ color: "#8e8b82" }}>발급 수</p>
            <p className="font-medium" style={{ color: "#252523" }}>
              {coupon.issued_count}
              {coupon.max_issue_count !== null ? ` / ${coupon.max_issue_count}` : " (무제한)"}
            </p>
          </div>
          <div>
            <p className="mb-0.5" style={{ color: "#8e8b82" }}>사용 수</p>
            <p className="font-medium" style={{ color: "#252523" }}>{coupon.used_count}</p>
          </div>
        </div>
      </div>

      {/* 수정 섹션 */}
      <div
        className="rounded-xl border p-6 mb-6"
        style={{ background: "#faf9f5", borderColor: "#e6dfd8" }}
      >
        <h2 className="text-base font-semibold mb-4" style={{ color: "#141413" }}>설정 수정</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClass} style={{ color: "#141413" }}>유효기간 시작</label>
            <input
              type="datetime-local"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              className="w-full h-10 px-3 rounded-lg text-sm border outline-none"
              style={fieldStyle}
            />
          </div>
          <div>
            <label className={labelClass} style={{ color: "#141413" }}>유효기간 종료</label>
            <input
              type="datetime-local"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full h-10 px-3 rounded-lg text-sm border outline-none"
              style={fieldStyle}
            />
          </div>
        </div>
        <div className="mb-4">
          <label className={labelClass} style={{ color: "#141413" }}>
            총 발급 한도 <span style={{ color: "#8e8b82" }}>(비워두면 무제한)</span>
          </label>
          <input
            type="number"
            value={maxIssueCount}
            onChange={(e) => setMaxIssueCount(e.target.value)}
            min={1}
            className="w-full h-10 px-3 rounded-lg text-sm border outline-none max-w-xs"
            style={fieldStyle}
          />
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
            style={{ background: "#cc785c" }}
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>

      {/* 유저 직접 발급 */}
      <div
        className="rounded-xl border p-6 mb-6"
        style={{ background: "#faf9f5", borderColor: "#e6dfd8" }}
      >
        <h2 className="text-base font-semibold mb-4" style={{ color: "#141413" }}>
          유저에게 직접 발급
        </h2>
        <div className="flex gap-3 flex-wrap">
          <input
            type="email"
            value={issueEmail}
            onChange={(e) => setIssueEmail(e.target.value)}
            placeholder="유저 이메일 입력"
            className="h-10 px-3 rounded-lg text-sm border outline-none flex-1 min-w-48"
            style={fieldStyle}
            onKeyDown={(e) => e.key === "Enter" && handleIssue()}
          />
          {coupon.issue_method === "admin_direct" && coupon.issue_epoch_type === "manual" && (
            <input
              type="text"
              value={issueEpoch}
              onChange={(e) => setIssueEpoch(e.target.value)}
              placeholder="Epoch 값 (예: 202606-1)"
              className="h-10 px-3 rounded-lg text-sm border outline-none w-48"
              style={fieldStyle}
            />
          )}
          <button
            onClick={handleIssue}
            disabled={issuing || !issueEmail.trim()}
            className="h-10 px-4 rounded-lg text-sm font-medium text-white flex items-center gap-2 disabled:opacity-50"
            style={{ background: "#cc785c" }}
          >
            <Send className="w-3.5 h-3.5" />
            {issuing ? "발급 중..." : "발급"}
          </button>
        </div>
        <p className="text-xs mt-2" style={{ color: "#8e8b82" }}>
          발급 시 유저에게 알림이 전송됩니다.
        </p>
      </div>

      {/* 발급 이력 */}
      <h2 className="text-base font-semibold mb-3" style={{ color: "#141413" }}>발급 이력</h2>
      <AdminTable
        columns={HISTORY_COLUMNS}
        gridTemplateColumns={HISTORY_GRID}
        loading={historyLoading}
        isEmpty={issued.length === 0}
        emptyMessage="발급 이력이 없습니다."
      >
        {issued.map((row) => (
          <div
            key={row.id}
            className="grid items-center px-5 py-3 border-b last:border-b-0"
            style={{ gridTemplateColumns: HISTORY_GRID, borderColor: "#e6dfd8" }}
          >
            <div className="min-w-0">
              <p className="text-sm truncate" style={{ color: "#252523" }}>
                {row.profile?.email ?? row.user_id}
              </p>
              {row.profile?.name && (
                <p className="text-xs truncate" style={{ color: "#8e8b82" }}>
                  {row.profile.name}
                </p>
              )}
            </div>
            <div className="text-center">
              <span className="text-xs" style={{ color: "#6c6a64" }}>
                {METHOD_LABELS[row.issue_method]}
              </span>
            </div>
            <div className="flex justify-center">
              <Badge
                bg={STATUS_COLORS[row.status]?.bg ?? "#efe9de"}
                color={STATUS_COLORS[row.status]?.color ?? "#6c6a64"}
              >
                {STATUS_LABELS[row.status] ?? row.status}
              </Badge>
            </div>
            <div className="text-center text-xs" style={{ color: "#6c6a64" }}>
              {formatDate(row.issued_at)}
            </div>
            <div className="text-center text-xs" style={{ color: "#6c6a64" }}>
              {formatDate(row.used_at)}
            </div>
          </div>
        ))}
      </AdminTable>
    </div>
  );
}
