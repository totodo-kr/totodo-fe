"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

interface DeleteAccountModalProps {
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export default function DeleteAccountModal({ onConfirm, onClose }: DeleteAccountModalProps) {
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const isConfirmed = confirmText === "탈퇴";

  const handleConfirm = async () => {
    if (!isConfirmed) return;
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-sm bg-[#1a1a1a] rounded-2xl border border-white/10 shadow-2xl p-6">
        {/* 헤더 */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={20} className="text-red-400" />
            </div>
            <h2 className="text-white font-semibold text-lg">서비스 탈퇴</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* 안내 문구 */}
        <div className="space-y-3 mb-6">
          <p className="text-gray-300 text-sm leading-relaxed">
            탈퇴하시면 <span className="text-red-400 font-medium">모든 계정 정보와 주문 내역</span>이
            영구적으로 삭제되며, 이 작업은 되돌릴 수 없습니다.
          </p>
          <ul className="text-gray-400 text-xs space-y-1.5 pl-3">
            <li className="flex gap-2"><span className="text-red-500 mt-0.5">•</span>프로필 및 계정 정보 삭제</li>
            <li className="flex gap-2"><span className="text-red-500 mt-0.5">•</span>주문 내역 및 수강 기록 삭제</li>
            <li className="flex gap-2"><span className="text-red-500 mt-0.5">•</span>동일 이메일로 재가입 가능 (기존 데이터 복구 불가)</li>
          </ul>
        </div>

        {/* 확인 입력 */}
        <div className="mb-5">
          <label className="block text-gray-400 text-xs mb-2">
            계속하려면 아래에 <span className="text-white font-medium">"탈퇴"</span>를 입력하세요.
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="탈퇴"
            className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-red-500/50 transition-colors"
          />
        </div>

        {/* 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-xl bg-[#2a2a2a] text-gray-300 text-sm font-medium hover:bg-[#333] transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isConfirmed || loading}
            className="flex-1 h-11 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "처리 중..." : "탈퇴하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
