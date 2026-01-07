"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SettingsLayout from "@/components/SettingsLayout";

export default function PreferencesPage() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();
  const [language, setLanguage] = useState("한국어");
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);

  const languages = ["한국어", "English", "日本語", "中文"];

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
    <SettingsLayout title="환경 설정">
      {/* 설정 카드 */}
        <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-white/5 shadow-lg">
          {/* 표시 언어 */}
          <div className="mb-6">
            <h2 className="text-white font-semibold mb-2">표시 언어</h2>
            <p className="text-sm text-gray-400 mb-4">
              사이트에서 사용할 언어를 설정할 수 있습니다.
            </p>
            
            <div className="relative">
              <button
                onClick={() => setIsLanguageOpen(!isLanguageOpen)}
                className="w-full h-12 px-4 bg-black/30 border border-white/10 rounded-lg text-white flex items-center justify-between hover:border-white/20 transition-colors"
              >
                <span>{language}</span>
                <ChevronDown size={20} className="text-gray-400" />
              </button>

              {/* 드롭다운 메뉴 */}
              {isLanguageOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#2a2a2a] border border-white/10 rounded-lg overflow-hidden z-10 shadow-lg">
                  {languages.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => {
                        setLanguage(lang);
                        setIsLanguageOpen(false);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-white/5 transition-colors ${
                        language === lang ? "text-brand-500 bg-white/5" : "text-white"
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 알림 설정 */}
          <div className="border-t border-white/5 pt-6">
            <h2 className="text-white font-semibold mb-4">알림 설정</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">이메일 알림</p>
                  <p className="text-sm text-gray-400">중요한 업데이트를 이메일로 받습니다</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">마케팅 알림</p>
                  <p className="text-sm text-gray-400">프로모션 및 할인 정보를 받습니다</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
                </label>
              </div>
            </div>
          </div>

          {/* 개인정보 설정 */}
          <div className="border-t border-white/5 pt-6 mt-6">
            <h2 className="text-white font-semibold mb-4">개인정보 설정</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">프로필 공개</p>
                  <p className="text-sm text-gray-400">다른 사용자에게 프로필을 공개합니다</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">학습 기록 공유</p>
                  <p className="text-sm text-gray-400">학습 통계를 다른 사용자와 공유합니다</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
    </SettingsLayout>
  );
}

