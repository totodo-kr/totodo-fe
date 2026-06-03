"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
        <AlertCircle size={48} className="text-red-400" />
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-bold text-white">링크가 만료되었습니다</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            인증 링크가 만료되었거나 이미 사용된 링크입니다.
            <br />
            비밀번호 재설정을 다시 요청해 주세요.
          </p>
        </div>
        <Link
          href="/"
          className="w-full h-12 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium text-sm flex items-center justify-center transition-colors"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
