"use client";

import Image from "next/image";
import Link from "next/link";
import { useMyPurchasedLectures } from "@/hooks/useLecture";

export default function PurchasedPage() {
  const { lectures, loading } = useMyPurchasedLectures();

  return (
    <>
      <h1 className="text-4xl font-bold text-white mb-12">구매한 클래스</h1>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <p className="text-gray-500">로딩 중...</p>
        </div>
      ) : lectures.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <p className="text-gray-500 text-center">구매한 클래스가 없습니다.</p>
          <p className="text-gray-500 text-center">지금 바로 클래스를 구매해보세요!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
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
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-2xl font-bold text-white group-hover:text-purple-500 transition-colors">
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
    </>
  );
}
