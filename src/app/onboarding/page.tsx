"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useProfile } from "@/hooks/useProfile";
import PageLoading from "@/components/PageLoading";
import { Sparkles } from "lucide-react";

export default function OnboardingPage() {
  const { user, isLoading } = useAuthStore();
  const { profile, loading: profileLoading, updateProfile } = useProfile(user);
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);

  // 이미 닉네임이 있으면 온보딩 불필요 → 홈으로
  useEffect(() => {
    if (!isLoading && !profileLoading && profile?.display_name) {
      router.replace("/");
    }
  }, [isLoading, profileLoading, profile, router]);

  // 미로그인 → 홈으로
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/");
    }
  }, [isLoading, user, router]);

  const handleSave = async () => {
    const name = displayName.trim();
    if (!name) return;
    setSaving(true);
    try {
      await updateProfile({ display_name: name });
      router.replace("/");
    } catch {
      alert("저장 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    router.replace("/");
  };

  if (isLoading || profileLoading) {
    return <PageLoading variant="top" />;
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        {/* 환영 아이콘 */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 bg-brand-500 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-brand-500/30">
            도
          </div>
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-brand-400" />
            <span className="text-brand-400 text-sm font-medium">가입을 환영합니다!</span>
            <Sparkles size={16} className="text-brand-400" />
          </div>
        </div>

        {/* 안내 */}
        <div className="text-center space-y-2">
          <h1 className="text-white text-2xl font-bold">닉네임을 설정해주세요</h1>
          <p className="text-gray-400 text-sm">나중에 마이페이지에서 언제든 변경할 수 있어요.</p>
        </div>

        {/* 입력 */}
        <div className="w-full space-y-3">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder="사용할 닉네임 입력"
            maxLength={20}
            autoFocus
            className="w-full h-14 bg-[#1a1a1a] border border-white/10 rounded-xl px-5 text-white text-center text-lg placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors"
          />
          <p className="text-right text-xs text-gray-600">{displayName.length}/20</p>
        </div>

        {/* 버튼 */}
        <div className="w-full space-y-3">
          <button
            onClick={handleSave}
            disabled={!displayName.trim() || saving}
            className="w-full h-14 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold text-base transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "저장 중..." : "시작하기"}
          </button>
          <button
            onClick={handleSkip}
            className="w-full h-10 text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            건너뛰기
          </button>
        </div>
      </div>
    </div>
  );
}
