"use client";

import { useState } from "react";
import { X, MapPin } from "lucide-react";
import AddressSearchModal from "./AddressSearchModal";
import type { UserAddress, AddressInput } from "@/types/address";

interface AddressFormModalProps {
  initial?: UserAddress | null;
  onSubmit: (input: AddressInput) => Promise<void>;
  onClose: () => void;
}

export default function AddressFormModal({ initial, onSubmit, onClose }: AddressFormModalProps) {
  const [recipientName, setRecipientName] = useState(initial?.recipient_name ?? "");
  const [recipientPhone, setRecipientPhone] = useState(initial?.recipient_phone ?? "");
  const [zipcode, setZipcode] = useState(initial?.zipcode ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [addressDetail, setAddressDetail] = useState(initial?.address_detail ?? "");
  const [isDefault, setIsDefault] = useState(initial?.is_default ?? false);
  const [showSearch, setShowSearch] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = !!(
    recipientName.trim() &&
    recipientPhone.trim() &&
    zipcode.trim() &&
    address.trim()
  );

  const handleSubmit = async () => {
    if (!isValid) {
      setError("모든 필수 항목을 입력해주세요.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        recipient_name: recipientName.trim(),
        recipient_phone: recipientPhone.trim(),
        zipcode: zipcode.trim(),
        address: address.trim(),
        address_detail: addressDetail.trim() || undefined,
        is_default: isDefault,
      });
    } catch (err) {
      console.error("Error saving address:", err);
      setError("저장 중 오류가 발생했습니다.");
      setSaving(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-sm bg-[#1a1a1a] rounded-2xl border border-white/10 shadow-2xl p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-semibold text-lg">
              {initial ? "배송지 수정" : "새 배송지 추가"}
            </h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">수령인 이름</label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="홍길동"
                className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">연락처</label>
              <input
                type="tel"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="01012345678"
                className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">주소</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={zipcode}
                  readOnly
                  placeholder="우편번호"
                  className="w-28 bg-[#111] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-600 cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowSearch(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#2a2a2a] hover:bg-[#333] text-gray-200 text-sm font-medium rounded-xl transition-colors"
                >
                  <MapPin size={14} />
                  주소 검색
                </button>
              </div>
              <input
                type="text"
                value={address}
                readOnly
                placeholder="주소 검색을 눌러 주소를 선택해주세요"
                className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 cursor-not-allowed mb-2"
              />
              <input
                type="text"
                value={addressDetail}
                onChange={(e) => setAddressDetail(e.target.value)}
                placeholder="상세 주소를 입력해주세요"
                className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 accent-brand-500"
              />
              기본 배송지로 설정
            </label>

            {error && <p className="text-red-400 text-xs">{error}</p>}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 h-11 rounded-xl bg-[#2a2a2a] text-gray-300 text-sm font-medium hover:bg-[#333] transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isValid || saving}
              className="flex-1 h-11 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      </div>

      {showSearch && (
        <AddressSearchModal
          onComplete={({ zipcode: zc, address: addr }) => {
            setZipcode(zc);
            setAddress(addr);
            setShowSearch(false);
          }}
          onClose={() => setShowSearch(false)}
        />
      )}
    </>
  );
}
