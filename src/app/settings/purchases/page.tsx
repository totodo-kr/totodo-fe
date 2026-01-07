"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { Receipt } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SettingsLayout from "@/components/SettingsLayout";

type TabType = "all" | "regular" | "point";

export default function PurchasesPage() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("all");

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

  const tabs = [
    { id: "all" as TabType, label: "전체" },
    { id: "regular" as TabType, label: "일반 결제" },
    { id: "point" as TabType, label: "포인트 결제" },
  ];

  return (
    <SettingsLayout title="결제 내역">
      {/* 탭 버튼 */}
        <div className="flex gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 h-11 rounded-full font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-brand-500 text-white"
                  : "bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 결제 내역 리스트 */}
        <div className="bg-[#1a1a1a] rounded-2xl border border-white/5 shadow-lg min-h-[500px] flex items-center justify-center">
          <div className="text-center">
            <Receipt size={48} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">결제 내역이 없습니다.</p>
          </div>
        </div>
    </SettingsLayout>
  );
}

