"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { Mail, Globe, LogIn, MapPin, Plus, Pencil, Trash2, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SettingsLayout from "@/components/SettingsLayout";
import PageLoading from "@/components/PageLoading";
import DeleteAccountModal from "@/components/DeleteAccountModal";
import AddressFormModal from "@/components/AddressFormModal";
import { createClient } from "@/utils/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useAddresses } from "@/hooks/useAddresses";
import type { UserAddress, AddressInput } from "@/types/address";

export default function AccountSettingPage() {
  const { user, isLoading, setUser } = useAuthStore();
  const { profile } = useProfile(user);
  const {
    addresses,
    loading: addressesLoading,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
  } = useAddresses(user);
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  const handleAddressSubmit = async (input: AddressInput) => {
    if (editingAddress) {
      await updateAddress(editingAddress.id, input);
    } else {
      await createAddress(input);
    }
    setShowAddressForm(false);
    setEditingAddress(null);
  };

  const handleDeleteAddress = async (addr: UserAddress) => {
    if (!confirm("이 배송지를 삭제하시겠습니까?")) return;
    try {
      await deleteAddress(addr.id);
    } catch (err) {
      console.error("Error deleting address:", err);
      alert("배송지 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleSetDefault = async (addr: UserAddress) => {
    try {
      await setDefaultAddress(addr.id);
    } catch (err) {
      console.error("Error setting default address:", err);
      alert("기본 배송지 설정 중 오류가 발생했습니다.");
    }
  };

  const handleDeleteAccount = async () => {
    const res = await fetch("/api/auth/delete-account", { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "탈퇴 처리에 실패했습니다.");
    }
    // 세션 정리 후 홈으로
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    router.push("/");
  };

  if (isLoading) {
    return <PageLoading variant="top" />;
  }

  if (!user) return null;

  const provider = user.app_metadata?.provider || "email";
  const providerName =
    provider === "google"
      ? "구글 간편 로그인"
      : provider === "kakao"
      ? "카카오 간편 로그인"
      : "이메일 로그인";

  return (
    <>
      <SettingsLayout title="계정 설정">
        {/* 계정 정보 카드 */}
        <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-white/5 shadow-lg mb-4">
          <div className="space-y-6">
            {/* 로그인 수단 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <LogIn size={18} className="text-gray-400" />
                <h2 className="text-white font-semibold">로그인 수단</h2>
              </div>
              <p className="text-gray-300 ml-6">{providerName}</p>
            </div>

            <div className="border-t border-white/5"></div>

            {/* 이메일 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Mail size={18} className="text-gray-400" />
                <h2 className="text-white font-semibold">이메일</h2>
              </div>
              <p className="text-gray-300 ml-6">{user.email}</p>
            </div>

            <div className="border-t border-white/5"></div>

            {/* 국가 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Globe size={18} className="text-gray-400" />
                <h2 className="text-white font-semibold">국가</h2>
              </div>
              <p className="text-gray-300 ml-6">대한민국</p>
            </div>
          </div>
        </div>

        {/* 배송지 관리 */}
        <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-white/5 shadow-lg mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-gray-400" />
              <h2 className="text-white font-semibold">배송지 관리</h2>
            </div>
            <button
              onClick={() => {
                setEditingAddress(null);
                setShowAddressForm(true);
              }}
              className="flex items-center gap-1 text-sm text-brand-400 hover:text-brand-300 transition-colors"
            >
              <Plus size={16} />
              배송지 추가
            </button>
          </div>

          {addressesLoading ? (
            <p className="text-gray-500 text-sm">불러오는 중...</p>
          ) : addresses.length === 0 ? (
            <p className="text-gray-500 text-sm">
              등록된 배송지가 없습니다. 배송지를 추가하면 주문 시 기본 배송지로 사용할 수 있습니다.
            </p>
          ) : (
            <div className="space-y-3">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="rounded-xl border border-white/5 bg-[#111] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-medium">{addr.recipient_name}</span>
                        {addr.is_default && (
                          <span className="flex items-center gap-1 text-xs text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-full">
                            <Star size={10} className="fill-current" />
                            기본 배송지
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm">{addr.recipient_phone}</p>
                      <p className="text-gray-300 text-sm mt-1">
                        ({addr.zipcode}) {addr.address}
                        {addr.address_detail ? ` ${addr.address_detail}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          setEditingAddress(addr);
                          setShowAddressForm(true);
                        }}
                        title="수정"
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDeleteAddress(addr)}
                        title="삭제"
                        className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  {!addr.is_default && (
                    <button
                      onClick={() => handleSetDefault(addr)}
                      className="mt-3 text-xs text-gray-400 hover:text-brand-400 transition-colors"
                    >
                      기본 배송지로 설정
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 서비스 탈퇴 */}
        <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-white/5 shadow-lg">
          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={profile?.role === "admin"}
            title={profile?.role === "admin" ? "관리자 계정은 탈퇴할 수 없습니다." : undefined}
            className="text-red-500 font-medium hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-red-500"
          >
            서비스 탈퇴
          </button>
        </div>
      </SettingsLayout>

      {showDeleteModal && (
        <DeleteAccountModal
          onConfirm={handleDeleteAccount}
          onClose={() => setShowDeleteModal(false)}
        />
      )}

      {showAddressForm && (
        <AddressFormModal
          initial={editingAddress}
          onSubmit={handleAddressSubmit}
          onClose={() => {
            setShowAddressForm(false);
            setEditingAddress(null);
          }}
        />
      )}
    </>
  );
}
