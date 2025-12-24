"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LoginModal from "./LoginModal";
import { useAuthStore } from "@/store/useAuthStore";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        setShowConfirm(true);
      } else {
        setShowConfirm(false);
      }
    }
  }, [user, isLoading]);

  const handleCancel = () => {
    router.back();
  };

  const handleSignUp = () => {
    setShowConfirm(false);
    setShowLoginModal(true);
  };

  if (isLoading) return null; // 또는 로딩 스피너

  if (user) {
    return <>{children}</>;
  }

  return (
    <>
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[400px] bg-[#1a1a1a] rounded-xl p-6 border border-white/10 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">가입자만 이용할 수 있습니다.</h3>
            <div className="space-y-1 mb-8">
              <p className="text-gray-400 text-sm">가입자만 이용할 수 있는 기능입니다.</p>
              <p className="text-gray-400 text-sm">지금 가입하여 다양한 기능을 이용해보세요.</p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-400 hover:text-white text-sm font-medium transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSignUp}
                className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-bold transition-colors"
              >
                가입하기
              </button>
            </div>
          </div>
        </div>
      )}

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => {
          setShowLoginModal(false);
          router.back(); // 로그인 모달 닫으면 뒤로가기
        }}
      />
    </>
  );
}
