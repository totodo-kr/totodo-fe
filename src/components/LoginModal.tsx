"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-[450px] h-[600px] bg-[#1a1a1a] rounded-2xl p-8 flex flex-col items-center border border-white/10 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        <div className="flex-1 flex flex-col items-center justify-center w-full gap-8">
          {/* Logo Section */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-purple-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-purple-900/20">
              도
            </div>
            <h2 className="text-3xl font-bold text-white tracking-wider">TOTODO</h2>
          </div>

          <div className="text-center space-y-2">
            <p className="text-gray-400 text-lg">소셜 계정으로 지금 바로 시작하세요.</p>
          </div>

          {/* Social Login Buttons */}
          <div className="w-full space-y-3 mt-4">
            <button className="w-full h-12 bg-white text-gray-900 rounded-lg font-medium flex items-center justify-center gap-3 hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              구글로 시작하기
            </button>
            <button className="w-full h-12 bg-[#FEE500] text-[#191919] rounded-lg font-medium flex items-center justify-center gap-3 hover:bg-[#FDD835] transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3C5.925 3 1 6.925 1 11.775c0 3.05 1.95 5.75 4.975 7.3.25.125.3.3.2.55l-.55 2.175c-.075.35.125.65.45.45l4.825-3.2c.35-.025.7-.05 1.1-.05 6.075 0 11-3.925 11-8.775C23 6.925 18.075 3 12 3z" />
              </svg>
              카카오로 시작하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
