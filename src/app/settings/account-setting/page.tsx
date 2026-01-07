"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { Mail, Globe, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import SettingsLayout from "@/components/SettingsLayout";

export default function AccountSettingPage() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();

  // 로그인하지 않은 경우 리다이렉트
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  const handleDeleteAccount = () => {
    if (confirm("정말로 서비스를 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      // 회원 탈퇴 로직 구현
      alert("서비스 탈퇴 기능이 곧 추가될 예정입니다.");
    }
  };

  if (isLoading) {
    return <div className="min-h-screen text-center">Loading...</div>;
  }

  if (!user) return null;

  // 로그인 제공자 확인
  const provider = user.app_metadata?.provider || "email";
  const providerName =
    provider === "google"
      ? "구글 간편 로그인"
      : provider === "kakao"
      ? "카카오 간편 로그인"
      : "이메일 로그인";

  return (
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

          {/* 구분선 */}
          <div className="border-t border-white/5"></div>

          {/* 이메일 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Mail size={18} className="text-gray-400" />
              <h2 className="text-white font-semibold">이메일</h2>
            </div>
            <p className="text-gray-300 ml-6">{user.email}</p>
          </div>

          {/* 구분선 */}
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

      {/* 서비스 탈퇴 버튼 */}
      <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-white/5 shadow-lg">
        <button
          onClick={handleDeleteAccount}
          className="text-red-500 font-medium hover:text-red-400 transition-colors"
        >
          서비스 탈퇴
        </button>
      </div>
    </SettingsLayout>
  );
}
