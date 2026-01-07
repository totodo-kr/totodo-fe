"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { Ticket } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SettingsLayout from "@/components/SettingsLayout";

export default function MyCouponsPage() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"available" | "used">("available");

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
    <SettingsLayout title="내 쿠폰함">
      {/* 쿠폰 입력 섹션 */}
        <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-white/5 shadow-lg mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="쿠폰 일련번호를 입력해 주세요."
              className="flex-1 h-12 px-4 bg-black/30 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-brand-500/50"
            />
            <button className="h-12 px-6 rounded-lg bg-[#2a2a2a] text-white font-medium hover:bg-[#333] transition-colors">
              등록
            </button>
          </div>
        </div>

        {/* 탭 버튼 */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab("available")}
            className={`flex-1 h-12 rounded-lg font-medium transition-colors ${
              activeTab === "available"
                ? "bg-brand-500 text-white"
                : "bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a]"
            }`}
          >
            사용 가능 0
          </button>
          <button
            onClick={() => setActiveTab("used")}
            className={`flex-1 h-12 rounded-lg font-medium transition-colors ${
              activeTab === "used"
                ? "bg-brand-500 text-white"
                : "bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a]"
            }`}
          >
            사용 완료/만료 0
          </button>
        </div>

        {/* 쿠폰 리스트 */}
        <div className="bg-[#1a1a1a] rounded-2xl border border-white/5 shadow-lg min-h-[400px] flex items-center justify-center">
          <div className="text-center">
            <Ticket size={48} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">
              {activeTab === "available"
                ? "아직 등록된 쿠폰이 없습니다."
                : "아직 사용한 쿠폰이 없습니다."}
            </p>
          </div>
        </div>

        {/* 쿠폰 이용 안내 */}
        <div className="mt-6 bg-[#1a1a1a] rounded-2xl p-6 border border-white/5 shadow-lg">
          <h2 className="text-white font-semibold mb-4">쿠폰 이용 안내</h2>
          <ul className="text-sm text-gray-400 space-y-2">
            <li>• 쿠폰은 타인에게 양도될 수 없습니다.</li>
            <li>• 쿠폰의 적용 조건(대상, 혜택, 사용 조건 등)은 쿠폰별로 다를 수 있습니다.</li>
            <li>• 부정한 방법으로 발급·사용한 쿠폰은 사전 고지 없이 회수될 수 있습니다.</li>
            <li>• 회원 탈퇴 시 보유 중인 모든 쿠폰은 복구될 수 없이 삭제됩니다.</li>
            <li>• 쿠폰 운영 정책은 당사의 사정에 따라 별도 고지 없이 변경되거나 종료될 수 있습니다.</li>
          </ul>
        </div>
    </SettingsLayout>
  );
}

