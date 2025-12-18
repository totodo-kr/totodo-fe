"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { createClient } from "@/utils/supabase/client";
import { ChevronRight, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SettingsPage() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();

  // 로그인하지 않은 경우 리다이렉트 (선택 사항)
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  if (isLoading) {
    return <div className="min-h-screen pt-24 text-center">Loading...</div>;
  }

  if (!user) return null;

  const menuItems = [
    "내 보관함",
    "내 쿠폰함",
    "결제 내역",
    "사업자 정보",
    "환경 설정",
    "본인 인증",
    "계정 설정",
  ];

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 flex justify-center">
      <div className="w-full max-w-md flex flex-col gap-[10px]">
        
        {/* 1행: 프로필 정보 컴포넌트 */}
        <div className="bg-[#1a1a1a] rounded-2xl p-8 flex flex-col items-center gap-6 border border-white/5 shadow-lg">
          <h1 className="text-xl font-bold text-white">설정</h1>
          
          <div className="flex flex-col items-center gap-4">
            {/* 프로필 사진 */}
            <div className="w-24 h-24 rounded-full bg-gray-800 overflow-hidden border-2 border-white/10 flex items-center justify-center">
              {user.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserIcon size={40} className="text-gray-400" />
              )}
            </div>
            
            {/* 회원 코드 */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-gray-400 text-sm">회원코드</span>
              <span className="text-gray-300 font-mono text-xs bg-black/30 px-2 py-1 rounded">
                {user.id}
              </span>
            </div>
          </div>

          {/* 프로필 수정 버튼 */}
          <button className="w-full max-w-[200px] h-11 rounded-full bg-[#2a2a2a] border border-[#2a2a2a] text-purple-400 font-medium text-sm hover:bg-[#333] hover:border-purple-500/30 transition-all">
            프로필 수정
          </button>
        </div>

        {/* 2행: 설정 목록 컴포넌트 */}
        <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/5 shadow-lg">
          <div className="flex flex-col">
            {menuItems.map((item, index) => (
              <button
                key={index}
                className="flex items-center justify-between w-full p-5 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 text-left"
              >
                <span className="text-gray-200">{item}</span>
                <ChevronRight size={18} className="text-gray-500" />
              </button>
            ))}
            
            {/* 로그아웃 버튼 */}
            <button
              onClick={handleLogout}
              className="flex items-center justify-between w-full p-5 hover:bg-red-500/10 transition-colors border-t border-white/5 text-left"
            >
              <span className="text-red-500 font-medium">로그아웃</span>
              <ChevronRight size={18} className="text-red-500/50" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

