"use client";

import Image from "next/image";
import Link from "next/link";

export default function AcademyPage() {
  const courses = [
    {
      id: 1,
      title: "오레노 니홍고",
      totalSessions: 33,
      instructor: "도도토",
      image:
        "https://images.unsplash.com/photo-1528164344705-47542687000d?q=80&w=2992&auto=format&fit=crop",
    },
  ];

  return (
    <main className="min-h-screen p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mx-auto">
        {courses.map((course) => (
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
                <h3 className="text-2xl font-bold text-white group-hover:text-brand-500 transition-colors">
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
    </main>
  );
}
