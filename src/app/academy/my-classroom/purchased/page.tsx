"use client";

import Image from "next/image";
import Link from "next/link";

export default function PurchasedPage() {
  // TODO: 실제 구매한 클래스 데이터를 API에서 가져오기, 타입 설정
  const purchasedCourses: any[] = [
    // {
    //   id: 1,
    //   title: "오레노 니홍고",
    //   totalSessions: 33,
    //   instructor: "도도토",
    //   purchaseDate: "2024-01-08",
    //   image:
    //     "https://images.unsplash.com/photo-1528164344705-47542687000d?q=80&w=2992&auto=format&fit=crop",
    // },
  ];

  return (
    <>
      <h1 className="text-4xl font-bold text-white mb-12">구매한 클래스</h1>

      {purchasedCourses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <p className="text-gray-500 text-center">구매한 클래스가 없습니다.</p>
          <p className="text-gray-500 text-center">지금 바로 클래스를 구매해보세요!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          {purchasedCourses.map((course) => (
            <Link href={`/academy/${course.id}`} key={course.id}>
              <div className="flex flex-col gap-4 group cursor-pointer">
                {/* Image Container */}
                <div className="relative overflow-hidden rounded-2xl w-full aspect-[750/450] bg-zinc-800 border border-white/5">
                  <Image
                    src={course.image}
                    alt={course.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>

                {/* Text Content */}
                <div className="flex flex-col gap-2">
                  <h3 className="text-2xl font-bold text-white group-hover:text-purple-500 transition-colors">
                    {course.title}
                  </h3>
                  <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
                    <span>총 {course.totalSessions}세션</span>
                    <span className="w-1 h-1 rounded-full bg-gray-500" />
                    <span>{course.instructor}</span>
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
