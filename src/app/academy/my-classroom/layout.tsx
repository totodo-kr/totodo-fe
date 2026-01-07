"use client";

import AuthGuard from "@/components/AuthGuard";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MyClassroomLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const tabs = [
    { label: "수강 중", path: "/academy/my-classroom/ongoing" },
    { label: "구매한 클래스", path: "/academy/my-classroom/purchased" },
  ];

  const isActive = (path: string) => pathname === path;

  return (
    <AuthGuard>
      <main className="min-h-screen bg-black">
        {/* Content Section */}
        <div className="flex gap-8 px-8 pb-16 pt-8">
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
      </main>
    </AuthGuard>
  );
}
