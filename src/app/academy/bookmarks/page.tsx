"use client";

import AuthGuard from "@/components/AuthGuard";

export default function BookmarksPage() {
  return (
    <AuthGuard>
      <main className="min-h-screen p-8 max-w-[1600px] mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-white">나의 북마크</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <p className="text-gray-400">저장된 북마크가 없습니다.</p>
        </div>
      </main>
    </AuthGuard>
  );
}

