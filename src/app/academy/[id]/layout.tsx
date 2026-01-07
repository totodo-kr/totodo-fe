"use client";

import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function CourseLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const courseId = params.id;

  // watch 페이지에서는 레이아웃 없이 children만 렌더링
  const isWatchPage = pathname?.includes("/session/");

  if (isWatchPage) {
    return <>{children}</>;
  }

  // 임시 데이터
  const courseData = {
    id: courseId,
    title: "오레노 니홍고",
    instructor: "도도토",
    image:
      "https://images.unsplash.com/photo-1528164344705-47542687000d?q=80&w=2992&auto=format&fit=crop",
  };

  const tabs = [
    { path: `/academy/${courseId}/information`, label: "강의 소개" },
    { path: `/academy/${courseId}/curriculums`, label: "목차" },
    { path: `/academy/${courseId}/notices`, label: "강의 공지" },
    { path: `/academy/${courseId}/board`, label: "마호 칼럼" },
  ];

  const isActive = (path: string) => pathname === path;

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative w-full h-[400px] mb-8">
        <Image
          src={courseData.image}
          alt={courseData.title}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-[1200px] mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 bg-brand-500 text-white text-sm font-bold rounded-full">
                미리보기
              </span>
              <button className="px-4 py-1 border border-white/30 text-white text-sm font-medium rounded-full hover:bg-white/10 transition-colors">
                북마크
              </button>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">{courseData.title}</h1>
            <p className="text-gray-300 text-sm">도도토</p>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="flex gap-8 px-8 pb-16">
        {/* Left Sidebar - Tabs */}
        <aside className="w-[200px] shrink-0">
          <nav className="sticky top-8 flex flex-col gap-2">
            {tabs.map((tab) => (
              <Link
                key={tab.path}
                href={tab.path}
                className={`px-4 py-3 text-left text-lg font-bold rounded-lg transition-all ${
                  isActive(tab.path)
                    ? "bg-white text-black"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Right Content */}
        <div className="flex-1 max-w-[900px]">{children}</div>
      </div>
    </div>
  );
}
