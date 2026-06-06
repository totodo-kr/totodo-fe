"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useProfile } from "@/hooks/useProfile";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();
  const { profile, loading, error } = useProfile(user);
  const router = useRouter();

  useEffect(() => {
    if (isLoading || loading) return;

    // 유저 없음 → 로그인 페이지로
    if (!user) {
      router.replace("/");
      return;
    }

    // 프로필 fetch 실패 → 차단
    if (error) {
      router.replace("/");
      return;
    }

    // 유저는 있지만 프로필 아직 미로드 → 대기
    if (profile === null) return;

    // 프로필 로드 완료 후 admin이 아니면 차단
    if (profile.role !== "admin") {
      router.replace("/");
    }
  }, [user, profile, isLoading, loading, error, router]);

  // 초기 로드 중일 때만 스피너 (profile이 이미 있으면 재검증 중에도 children 유지)
  if (isLoading || (loading && !profile) || (user && profile === null && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#faf9f5" }}>
        <div className="w-8 h-8 border-2 border-[#cc785c] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || profile?.role !== "admin") return null;

  return <>{children}</>;
}
