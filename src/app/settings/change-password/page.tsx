"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { createClient } from "@/utils/supabase/client";
import PageLoading from "@/components/PageLoading";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/");
  }, [isLoading, user, router]);

  if (isLoading) return <PageLoading variant="top" />;
  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    if (password !== confirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      alert("비밀번호가 변경되었습니다.");
      router.replace("/settings/profile");
    } catch (err: any) {
      const msg: string = err.message || "";
      if (msg.includes("different from the old password")) {
        setError("이전 비밀번호와 동일한 비밀번호는 사용할 수 없습니다.");
      } else {
        setError(msg || "비밀번호 변경 중 오류가 발생했습니다.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen p-4">
      <div className="relative flex items-center justify-center h-14 mb-6">
        <button onClick={() => router.back()} className="absolute left-0 p-2 text-white">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold">비밀번호 변경</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md mx-auto">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-bold text-gray-300">새 비밀번호</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6자 이상 입력"
              required
              autoFocus
              className="w-full h-12 bg-zinc-900 rounded-xl px-4 pr-11 border border-white/10 text-white focus:outline-none focus:border-brand-500 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-bold text-gray-300">새 비밀번호 확인</label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="비밀번호를 한 번 더 입력"
              required
              className="w-full h-12 bg-zinc-900 rounded-xl px-4 pr-11 border border-white/10 text-white focus:outline-none focus:border-brand-500 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full h-12 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold transition-colors disabled:opacity-50 mt-2"
        >
          {submitting ? "변경 중..." : "비밀번호 변경"}
        </button>
      </form>
    </main>
  );
}
