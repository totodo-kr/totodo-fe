"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import SettingsLayout from "@/components/SettingsLayout";

export default function CertifyPage() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();

  // 로그인하지 않은 경우 리다이렉트
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  const handleCertify = () => {
    // 본인 인증 로직 구현
    alert("본인 인증 기능이 곧 추가될 예정입니다.");
  };

  if (isLoading) {
    return <div className="min-h-screen text-center">Loading...</div>;
  }

  if (!user) return null;

  return (
    <SettingsLayout title="본인인증 안내">
      {/* 본인 인증 카드 */}
      <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-white/5 shadow-lg">
        <div className="flex flex-col items-center gap-6 mb-8">
          <div className="w-20 h-20 rounded-full bg-brand-500/10 flex items-center justify-center">
            <ShieldCheck size={40} className="text-brand-500" />
          </div>
          <h2 className="text-2xl font-bold text-white">본인인증</h2>
        </div>

        {/* 안내 사항 */}
        <div className="space-y-4 mb-8">
          <div className="flex gap-3">
            <span className="text-brand-500 font-bold">•</span>
            <p className="text-gray-300 leading-relaxed">
              서비스 내에 청소년 유해물 콘텐츠가 포함된 경우, 해당 콘텐츠는 유니폼 본인인증 절차를
              통해 연령 확인이 완료된 이용자에게 표시됩니다.
            </p>
          </div>

          <div className="flex gap-3">
            <span className="text-brand-500 font-bold">•</span>
            <p className="text-gray-300 leading-relaxed">
              본인인증을 위해 입력한 실명과 휴대폰 번호는 연령 확인 및 회원관리 목적으로 사용되며,
              사업자에게 제공될 수 있습니다.
            </p>
          </div>

          <div className="flex gap-3">
            <span className="text-brand-500 font-bold">•</span>
            <p className="text-gray-300 leading-relaxed">
              본인인증 절차 중 입증번호 문자 수신 시, 개인정보 처리주체인 (주)키를클스의 이름으로
              인증 문자가 전송될 예정입니다.
            </p>
          </div>

          <div className="flex gap-3">
            <span className="text-brand-500 font-bold">•</span>
            <p className="text-gray-300 leading-relaxed">
              본인인증으로 확인된 개인정보는 최대 14일까지 유효하며, 이후에 본인인증 절차를 다시
              진행하여 개인정보를 갱신할 수 있습니다.
            </p>
          </div>
        </div>

        {/* 인증하기 버튼 */}
        <button
          onClick={handleCertify}
          className="w-full h-14 rounded-full bg-brand-500 text-white font-bold text-lg hover:bg-brand-600 transition-all shadow-lg"
        >
          인증하기
        </button>
      </div>
    </SettingsLayout>
  );
}
