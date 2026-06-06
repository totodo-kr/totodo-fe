"use client";

import { useState } from "react";
import { X, Eye, EyeOff, Lock } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface VerifyPasswordModalProps {
  email: string;
  onSuccess: () => void;
  onClose: () => void;
}

export default function VerifyPasswordModal({ email, onSuccess, onClose }: VerifyPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      onSuccess();
    } catch {
      setError("비밀번호가 올바르지 않습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-sm bg-[#1a1a1a] rounded-2xl border border-white/10 shadow-2xl p-6">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-500/15 flex items-center justify-center flex-shrink-0">
              <Lock size={18} className="text-brand-400" />
            </div>
            <h2 className="text-white font-semibold text-lg">현재 비밀번호 확인</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <X size={20} />
          </button>
        </div>

        <p className="text-gray-400 text-sm mb-5">
          비밀번호 변경을 위해 현재 비밀번호를 입력해주세요.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="현재 비밀번호"
              autoFocus
              required
              className="w-full h-12 bg-[#111] border border-white/10 rounded-xl px-4 pr-11 text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl bg-[#2a2a2a] text-gray-300 text-sm font-medium hover:bg-[#333] transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!password || loading}
              className="flex-1 h-11 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "확인 중..." : "확인"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
