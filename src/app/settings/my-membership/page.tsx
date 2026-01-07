"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import SettingsLayout from "@/components/SettingsLayout";

export default function MyMembershipPage() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();

  // 로그인하지 않은 경우 리다이렉트
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <div className="min-h-screen pt-24 text-center">Loading...</div>;
  }

  if (!user) return null;

  return (
    <SettingsLayout title="내 멤버쉽">
      {/* 멤버쉽 정보 카드 */}
        <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-white/5 shadow-lg">
          <div className="flex flex-col items-center gap-6">
            {/* 멤버쉽 상태 */}
            <div className="text-center">
              <p className="text-gray-400 text-sm mb-2">현재 멤버쉽</p>
              <p className="text-2xl font-bold text-white">무료 회원</p>
            </div>

            {/* 안내 메시지 */}
            <div className="w-full p-6 bg-black/30 rounded-xl border border-white/5">
              <p className="text-gray-300 text-center">
                아직 보유중인 멤버쉽이 없습니다.
              </p>
            </div>

            {/* 멤버쉽 혜택 안내 */}
            <div className="w-full mt-4">
              <h2 className="text-lg font-semibold text-white mb-4">멤버쉽 혜택</h2>
              <div className="space-y-3">
                <div className="p-4 bg-gradient-to-r from-brand-500/10 to-transparent rounded-lg border border-brand-500/20">
                  <p className="text-brand-500 font-semibold mb-1">프리미엄 멤버쉽</p>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• 모든 강의 20% 할인</li>
                    <li>• 우선 고객 지원</li>
                    <li>• 독점 콘텐츠 접근</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 멤버쉽 가입 버튼 */}
            <button className="w-full max-w-md h-12 rounded-full bg-brand-500 text-white font-medium text-sm hover:bg-brand-600 transition-all mt-4">
              멤버쉽 가입하기
            </button>
          </div>
        </div>
    </SettingsLayout>
  );
}

