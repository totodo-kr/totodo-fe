"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, RefreshCw } from "lucide-react";
import { useAdminCoupons } from "@/hooks/useAdminCoupons";
import type { DiscountType, IssueMethod, IssueEpochType } from "@/types/coupon";

function randomCode() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

function inputClass(focused: boolean) {
  return `w-full h-10 px-3 rounded-lg text-sm border outline-none transition-colors ${
    focused ? "border-[#cc785c]" : "border-[#e6dfd8]"
  }`;
}

const labelClass = "text-sm font-medium mb-1.5 block";
const fieldStyle = { background: "#efe9de", color: "#141413", borderColor: "#e6dfd8" };

export default function AdminCouponWritePage() {
  const router = useRouter();
  const { createCoupon } = useAdminCoupons();

  const [code, setCode] = useState(randomCode());
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("fixed");
  const [discountValue, setDiscountValue] = useState("");
  const [maxDiscountAmount, setMaxDiscountAmount] = useState("");
  const [minOrderAmount, setMinOrderAmount] = useState("");
  const [issueMethod, setIssueMethod] = useState<IssueMethod>("code");
  const [issueEpochType, setIssueEpochType] = useState<IssueEpochType>("once");
  const [maxIssueCount, setMaxIssueCount] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [focused, setFocused] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim() || !discountValue) {
      alert("쿠폰명, 코드, 할인값은 필수입니다.");
      return;
    }

    setSubmitting(true);
    const { success, error } = await createCoupon({
      code,
      name,
      description: description || undefined,
      discount_type: discountType,
      discount_value: Number(discountValue),
      max_discount_amount: maxDiscountAmount ? Number(maxDiscountAmount) : undefined,
      min_order_amount: minOrderAmount ? Number(minOrderAmount) : undefined,
      issue_method: issueMethod,
      issue_epoch_type: issueMethod === "admin_direct" ? issueEpochType : "once",
      max_issue_count: maxIssueCount ? Number(maxIssueCount) : undefined,
      valid_from: validFrom || undefined,
      valid_until: validUntil || undefined,
    });
    setSubmitting(false);

    if (!success) {
      alert(error ?? "쿠폰 생성에 실패했습니다.");
      return;
    }
    router.push("/admin/coupons");
  };

  const inputProps = (id: string) => ({
    style: { ...fieldStyle, borderColor: focused === id ? "#cc785c" : "#e6dfd8" },
    onFocus: () => setFocused(id),
    onBlur: () => setFocused(""),
  });

  const selectStyle = { ...fieldStyle, borderColor: "#e6dfd8", height: "2.5rem", paddingLeft: "0.75rem", paddingRight: "0.75rem" };

  return (
    <div className="p-8 max-w-2xl">
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

      <h1 className="text-2xl font-semibold mb-1" style={{ color: "#141413" }}>
        새 쿠폰 추가
      </h1>
      <p className="text-sm mb-8" style={{ color: "#6c6a64" }}>
        쿠폰 템플릿을 생성합니다. 생성 후 유저에게 직접 발급하거나 코드로 등록할 수 있습니다.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* 코드 */}
        <div>
          <label className={labelClass} style={{ color: "#141413" }}>쿠폰 코드 *</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="SUMMER2024"
              className={`${inputClass(focused === "code")} flex-1 font-mono`}
              {...inputProps("code")}
            />
            <button
              type="button"
              onClick={() => setCode(randomCode())}
              className="px-3 h-10 rounded-lg border text-sm transition-colors flex items-center gap-1.5"
              style={{ borderColor: "#e6dfd8", color: "#6c6a64", background: "#efe9de" }}
              title="코드 자동 생성"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 쿠폰명 */}
        <div>
          <label className={labelClass} style={{ color: "#141413" }}>쿠폰명 *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="여름 할인 쿠폰"
            className={inputClass(focused === "name")}
            {...inputProps("name")}
          />
        </div>

        {/* 설명 */}
        <div>
          <label className={labelClass} style={{ color: "#141413" }}>설명 <span style={{ color: "#8e8b82" }}>(선택)</span></label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="쿠폰 설명을 입력하세요."
            rows={2}
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none transition-colors resize-none"
            style={{ ...fieldStyle, borderColor: focused === "desc" ? "#cc785c" : "#e6dfd8" }}
            onFocus={() => setFocused("desc")}
            onBlur={() => setFocused("")}
          />
        </div>

        {/* 할인 유형 + 값 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass} style={{ color: "#141413" }}>할인 유형 *</label>
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as DiscountType)}
              className="w-full rounded-lg text-sm border outline-none"
              style={selectStyle}
            >
              <option value="fixed">정액 (원)</option>
              <option value="percentage">정률 (%)</option>
              <option value="free_shipping">무료배송</option>
            </select>
          </div>
          <div>
            <label className={labelClass} style={{ color: "#141413" }}>
              할인값 * {discountType === "fixed" ? "(원)" : discountType === "percentage" ? "(%)" : "(자동)"}
            </label>
            <input
              type="number"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder={discountType === "percentage" ? "10" : "3000"}
              disabled={discountType === "free_shipping"}
              min={1}
              className={inputClass(focused === "val")}
              style={{ ...fieldStyle, borderColor: focused === "val" ? "#cc785c" : "#e6dfd8", opacity: discountType === "free_shipping" ? 0.5 : 1 }}
              onFocus={() => setFocused("val")}
              onBlur={() => setFocused("")}
            />
          </div>
        </div>

        {/* 정률 할인 상한 */}
        {discountType === "percentage" && (
          <div>
            <label className={labelClass} style={{ color: "#141413" }}>
              최대 할인금액 <span style={{ color: "#8e8b82" }}>(원, 비워두면 무제한)</span>
            </label>
            <input
              type="number"
              value={maxDiscountAmount}
              onChange={(e) => setMaxDiscountAmount(e.target.value)}
              placeholder="5000"
              min={1}
              className={inputClass(focused === "maxDisc")}
              {...inputProps("maxDisc")}
            />
          </div>
        )}

        {/* 최소 주문금액 */}
        <div>
          <label className={labelClass} style={{ color: "#141413" }}>
            최소 주문금액 <span style={{ color: "#8e8b82" }}>(원, 비워두면 조건 없음)</span>
          </label>
          <input
            type="number"
            value={minOrderAmount}
            onChange={(e) => setMinOrderAmount(e.target.value)}
            placeholder="10000"
            min={0}
            className={inputClass(focused === "minOrd")}
            {...inputProps("minOrd")}
          />
        </div>

        {/* 발급 방식 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass} style={{ color: "#141413" }}>발급 방식 *</label>
            <select
              value={issueMethod}
              onChange={(e) => setIssueMethod(e.target.value as IssueMethod)}
              className="w-full rounded-lg text-sm border outline-none"
              style={selectStyle}
            >
              <option value="code">코드 입력</option>
              <option value="admin_direct">어드민 직접 발급</option>
              <option value="purchase">쿠폰 상품 구매</option>
            </select>
          </div>
          <div>
            <label className={labelClass} style={{ color: "#141413" }}>
              유저당 발급 횟수
              <span style={{ color: "#8e8b82", fontSize: "0.75rem", marginLeft: "4px" }}>
                {issueMethod !== "admin_direct" ? "(자동 관리)" : ""}
              </span>
            </label>
            <select
              value={issueEpochType}
              onChange={(e) => setIssueEpochType(e.target.value as IssueEpochType)}
              disabled={issueMethod !== "admin_direct"}
              className="w-full rounded-lg text-sm border outline-none"
              style={{ ...selectStyle, opacity: issueMethod !== "admin_direct" ? 0.5 : 1 }}
            >
              <option value="once">평생 1회</option>
              <option value="monthly">월 1회</option>
              <option value="manual">직접 입력</option>
            </select>
          </div>
        </div>

        {/* 최대 발급 수 */}
        <div>
          <label className={labelClass} style={{ color: "#141413" }}>
            총 발급 한도 <span style={{ color: "#8e8b82" }}>(비워두면 무제한)</span>
          </label>
          <input
            type="number"
            value={maxIssueCount}
            onChange={(e) => setMaxIssueCount(e.target.value)}
            placeholder="1000"
            min={1}
            className={inputClass(focused === "maxIssue")}
            {...inputProps("maxIssue")}
          />
        </div>

        {/* 유효기간 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass} style={{ color: "#141413" }}>유효기간 시작 <span style={{ color: "#8e8b82" }}>(선택)</span></label>
            <input
              type="datetime-local"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              className={inputClass(focused === "vFrom")}
              {...inputProps("vFrom")}
            />
          </div>
          <div>
            <label className={labelClass} style={{ color: "#141413" }}>유효기간 종료 <span style={{ color: "#8e8b82" }}>(선택)</span></label>
            <input
              type="datetime-local"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className={inputClass(focused === "vUntil")}
              {...inputProps("vUntil")}
            />
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-3 pt-2 pb-8">
          <button
            type="button"
            onClick={() => router.push("/admin/coupons")}
            className="px-5 py-2 rounded-lg text-sm font-medium border transition-colors"
            style={{ borderColor: "#e6dfd8", color: "#6c6a64" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#efe9de")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
          >
            취소
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
            style={{ background: "#cc785c" }}
            onMouseEnter={(e) => { if (!submitting) (e.currentTarget as HTMLButtonElement).style.background = "#a9583e"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#cc785c"; }}
          >
            {submitting ? "생성 중..." : "쿠폰 생성"}
          </button>
        </div>
      </form>
    </div>
  );
}
