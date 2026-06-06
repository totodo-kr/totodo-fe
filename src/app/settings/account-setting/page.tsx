"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { Mail, Globe, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SettingsLayout from "@/components/SettingsLayout";
import PageLoading from "@/components/PageLoading";
import DeleteAccountModal from "@/components/DeleteAccountModal";
import { createClient } from "@/utils/supabase/client";

export default function AccountSettingPage() {
  const { user, isLoading, setUser } = useAuthStore();
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/");
    }
  }, [user, isLoading, router]);

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

        {/* 서비스 탈퇴 */}
        <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-white/5 shadow-lg">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="text-red-500 font-medium hover:text-red-400 transition-colors"
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
    </>
  );
}
