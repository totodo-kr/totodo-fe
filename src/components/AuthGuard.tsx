"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LoginModal from "./LoginModal";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false); // 실제 로그인 상태 로직으로 교체 필요
  const [showConfirm, setShowConfirm] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    // 여기에 실제 로그인 체크 로직 구현 (예: localStorage 토큰 확인 등)
    const token = localStorage.getItem("totodo-token");
    if (token) {
      setIsLoggedIn(true);
    } else {
      setShowConfirm(true);
    }
  }, []);

  const handleCancel = () => {
    // 취소 시 이전 페이지로 돌아가거나 홈으로 이동
    router.back();
  };

  const handleSignUp = () => {
    setShowConfirm(false);
    setShowLoginModal(true);
  };

  if (isLoggedIn) {
    return <>{children}</>;
  }

  return (
    <>
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[400px] bg-[#1a1a1a] rounded-xl p-6 border border-white/10 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">
              가입자만 이용할 수 있습니다.
            </h3>
            <div className="space-y-1 mb-8">
              <p className="text-gray-400 text-sm">
                가입자만 이용할 수 있는 기능입니다.
              </p>
              <p className="text-gray-400 text-sm">
                지금 가입하여 다양한 기능을 이용해보세요.
              </p>
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
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-bold transition-colors"
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

