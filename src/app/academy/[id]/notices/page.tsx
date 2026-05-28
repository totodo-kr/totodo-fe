"use client";

import { Lock } from "lucide-react";

// TODO: Replace with actual purchase check from API
const isPurchased = false;

export default function NoticesPage() {
  if (!isPurchased) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white mb-6">강의 공지</h2>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Lock className="w-10 h-10 text-gray-500" />
          <p className="text-gray-400 text-base font-medium">
            클래스 구매 후 참여 가능합니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6">강의 공지</h2>
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500">아직 등록된 내용이 없습니다.</p>
      </div>
    </div>
  );
}
