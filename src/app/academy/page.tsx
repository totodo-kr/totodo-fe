"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLectures } from "@/hooks/useLecture";
import LoadingSpinner from "@/components/LoadingSpinner";
import BookmarkButton from "@/components/BookmarkButton";
import LoginModal from "@/components/LoginModal";

export default function AcademyPage() {
  const { lectures, loading } = useLectures();
  const [showLoginModal, setShowLoginModal] = useState(false);

  return (
    <main className="min-h-screen p-8">
      {loading ? (
        <LoadingSpinner className="py-24" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mx-auto">
          {lectures.map((lecture) => (
            <Link href={`/academy/${lecture.id}`} key={lecture.id}>
              <div className="flex flex-col gap-4 group cursor-pointer">
                <div className="relative overflow-hidden rounded-2xl w-full aspect-[750/450] bg-zinc-800 border border-white/5">
                  {lecture.thumbnail_url && (
                    <Image
                      src={lecture.thumbnail_url}
                      alt={lecture.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  <div className="absolute top-3 right-3">
                    <BookmarkButton
                      lectureId={lecture.id}
                      onNeedLogin={() => setShowLoginModal(true)}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-2xl font-bold text-white group-hover:text-brand-500 transition-colors">
                    {lecture.title}
                  </h3>
                  <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
                    <span>총 {lecture.total_sessions}세션</span>
                    <span className="w-1 h-1 rounded-full bg-gray-500" />
                    <span>{lecture.instructor_name}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </main>
  );
}
