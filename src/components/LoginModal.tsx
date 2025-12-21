"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import GoogleIcon from "./icons/GoogleIcon";
import KakaoIcon from "./icons/KakaoIcon";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      // Reset state when opening
      setEmail("");
      setPassword("");
      setError(null);
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleGoogleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const supabase = createClient();

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-[450px] bg-[#1a1a1a] rounded-2xl p-8 flex flex-col items-center border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        <div className="flex flex-col items-center justify-center w-full gap-6">
          {/* Logo Section */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-brand-500 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-brand-500/20">
              도
            </div>
            <h2 className="text-3xl font-bold text-white tracking-wider">TOTODO</h2>
          </div>

          <div className="text-center space-y-2">
            <p className="text-gray-400 text-lg">로그인하여 지금 바로 시작하세요.</p>
          </div>

          {/* Email Login Form */}
          <form onSubmit={handleEmailAuth} className="w-full space-y-4">
            <div className="space-y-4">
              <input
                type="email"
                placeholder="이메일"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-12 bg-[#2a2a2a] border border-white/10 rounded-lg px-4 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
              <input
                type="password"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full h-12 bg-[#2a2a2a] border border-white/10 rounded-lg px-4 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "처리중..." : "로그인"}
            </button>
          </form>

          {/* Social Login Buttons */}
          <div className="w-full space-y-3">
            <div className="relative flex items-center py-2">
              <div className="grow border-t border-white/10"></div>
              <span className="shrink-0 mx-4 text-gray-400 text-sm">또는 소셜 계정으로 로그인</span>
              <div className="grow border-t border-white/10"></div>
            </div>

            <button
              onClick={handleGoogleLogin}
              className="w-full h-12 bg-white text-gray-900 rounded-lg font-medium flex items-center justify-center gap-3 hover:bg-gray-100 transition-colors"
            >
              <GoogleIcon />
              구글로 시작하기
            </button>
            <button className="w-full h-12 bg-[#FEE500] text-[#191919] rounded-lg font-medium flex items-center justify-center gap-3 hover:bg-[#FDD835] transition-colors">
              <KakaoIcon />
              카카오로 시작하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
