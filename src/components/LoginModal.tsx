"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import GoogleIcon from "./icons/GoogleIcon";
import KakaoIcon from "./icons/KakaoIcon";

type Mode = "login" | "signup" | "reset";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function translateError(message: string): string {
  if (message.includes("Invalid login credentials")) return "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (message.includes("Email not confirmed")) return "이메일 인증이 필요합니다. 메일함을 확인해주세요.";
  if (message.includes("User already registered")) return "이미 가입된 이메일입니다.";
  if (message.includes("Password should be at least")) return "비밀번호는 최소 6자 이상이어야 합니다.";
  if (message.includes("Unable to validate email address")) return "유효하지 않은 이메일 주소입니다.";
  if (message.includes("For security purposes")) return "잠시 후 다시 시도해주세요.";
  return message;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setMode("login");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setError(null);
      setSuccessMessage(null);
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setSuccessMessage(null);
    setPassword("");
    setConfirmPassword("");
  };

  const handleGoogleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
    });
  };

  const handleKakaoLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const supabase = createClient();
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      onClose();
    } catch (err: any) {
      setError(translateError(err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    setIsLoading(true);
    setError(null);
    const supabase = createClient();
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
        },
      });
      if (error) throw error;
      setSuccessMessage("가입 확인 이메일을 발송했습니다. 메일함을 확인해주세요.");
    } catch (err: any) {
      setError(translateError(err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const supabase = createClient();
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
      });
      if (error) throw error;
      setSuccessMessage("비밀번호 재설정 링크를 이메일로 발송했습니다.");
    } catch (err: any) {
      setError(translateError(err.message));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const titles: Record<Mode, string> = {
    login: "로그인",
    signup: "회원가입",
    reset: "비밀번호 찾기",
  };

  const subtitles: Record<Mode, string> = {
    login: "로그인하여 지금 바로 시작하세요.",
    signup: "이메일로 새 계정을 만들어보세요.",
    reset: "가입한 이메일을 입력하면 재설정 링크를 보내드립니다.",
  };

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
          {/* Logo */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-brand-500 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-brand-500/20">
              도
            </div>
            <h2 className="text-3xl font-bold text-white tracking-wider">TOTODO</h2>
          </div>

          <div className="text-center space-y-1">
            <p className="text-white text-xl font-semibold">{titles[mode]}</p>
            <p className="text-gray-400 text-sm">{subtitles[mode]}</p>
          </div>

          {/* Login Form */}
          {mode === "login" && (
            <form onSubmit={handleLogin} className="w-full space-y-4">
              <div className="space-y-3">
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
                  className="w-full h-12 bg-[#2a2a2a] border border-white/10 rounded-lg px-4 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => switchMode("reset")}
                  className="text-sm text-gray-400 hover:text-brand-400 transition-colors"
                >
                  비밀번호를 잊으셨나요?
                </button>
              </div>

              {error && <p className="text-red-400 text-sm text-center">{error}</p>}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "처리중..." : "로그인"}
              </button>

              <p className="text-center text-sm text-gray-400">
                계정이 없으신가요?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className="text-brand-400 hover:text-brand-300 font-medium transition-colors"
                >
                  회원가입
                </button>
              </p>
            </form>
          )}

          {/* Signup Form */}
          {mode === "signup" && (
            <form onSubmit={handleSignup} className="w-full space-y-4">
              <div className="space-y-3">
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
                  placeholder="비밀번호 (6자 이상)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full h-12 bg-[#2a2a2a] border border-white/10 rounded-lg px-4 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
                />
                <input
                  type="password"
                  placeholder="비밀번호 확인"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full h-12 bg-[#2a2a2a] border border-white/10 rounded-lg px-4 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>

              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
              {successMessage && <p className="text-green-400 text-sm text-center">{successMessage}</p>}

              {!successMessage && (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "처리중..." : "회원가입"}
                </button>
              )}

              <p className="text-center text-sm text-gray-400">
                이미 계정이 있으신가요?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="text-brand-400 hover:text-brand-300 font-medium transition-colors"
                >
                  로그인
                </button>
              </p>
            </form>
          )}

          {/* Password Reset Form */}
          {mode === "reset" && (
            <form onSubmit={handleReset} className="w-full space-y-4">
              <input
                type="email"
                placeholder="가입한 이메일"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-12 bg-[#2a2a2a] border border-white/10 rounded-lg px-4 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
              />

              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
              {successMessage && <p className="text-green-400 text-sm text-center">{successMessage}</p>}

              {!successMessage && (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "처리중..." : "재설정 링크 발송"}
                </button>
              )}

              <p className="text-center text-sm text-gray-400">
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="text-brand-400 hover:text-brand-300 font-medium transition-colors"
                >
                  ← 로그인으로 돌아가기
                </button>
              </p>
            </form>
          )}

          {/* Social Login — 로그인 모드에서만 표시 */}
          {mode === "login" && (
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
              <button
                onClick={handleKakaoLogin}
                className="w-full h-12 bg-[#FEE500] text-[#191919] rounded-lg font-medium flex items-center justify-center gap-3 hover:bg-[#FDD835] transition-colors"
              >
                <KakaoIcon />
                카카오로 시작하기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
