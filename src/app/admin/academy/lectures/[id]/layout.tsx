"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

const SUB_TABS = [
  { label: "기본 정보·챕터", suffix: "" },
  { label: "리뷰", suffix: "/reviews" },
  { label: "게시판", suffix: "/board" },
  { label: "미션", suffix: "/missions" },
  { label: "프로모션", suffix: "/promotions" },
];

export default function AdminLectureDetailLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const id = params.id as string;

  const [lectureTitle, setLectureTitle] = useState<string>("");

  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    supabase
      .from("lectures")
      .select("title")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (data) setLectureTitle(data.title);
      });
  }, [id]);

  const isTabActive = (suffix: string) => {
    const tabPath = `/admin/academy/lectures/${id}${suffix}`;
    if (suffix === "") {
      // 기본 탭: 하위 경로(리뷰/게시판 등)가 아닐 때 활성
      return (
        pathname === tabPath ||
        pathname === `/admin/academy/lectures/${id}`
      );
    }
    return pathname.startsWith(tabPath);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Sticky Header */}
      <div
        className="sticky top-0 z-20 border-b"
        style={{ background: "#faf9f5", borderColor: "#e6dfd8" }}
      >
        {/* 상단 행: 뒤로가기 + 강의명 */}
        <div className="flex items-center gap-3 px-8 pt-5 pb-3">
          <Link
            href="/admin/academy/lectures"
            className="flex items-center gap-1 text-sm font-medium transition-colors"
            style={{ color: "#8e8b82" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "#cc785c")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "#8e8b82")}
          >
            <ChevronLeft className="w-4 h-4" />
            강의 목록
          </Link>
          {lectureTitle && (
            <>
              <span style={{ color: "#e6dfd8" }}>/</span>
              <span className="text-sm font-semibold truncate max-w-xs" style={{ color: "#141413" }}>
                {lectureTitle}
              </span>
            </>
          )}
        </div>

        {/* 하위 탭 */}
        <div className="flex items-end gap-1 px-8">
          {SUB_TABS.map((tab) => {
            const active = isTabActive(tab.suffix);
            return (
              <Link
                key={tab.suffix}
                href={`/admin/academy/lectures/${id}${tab.suffix}`}
                className="px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-all"
                style={
                  active
                    ? { color: "#cc785c", borderColor: "#cc785c", background: "#fff3ee" }
                    : { color: "#8e8b82", borderColor: "transparent" }
                }
                onMouseEnter={(e) => {
                  if (!active) (e.currentTarget as HTMLAnchorElement).style.color = "#252523";
                }}
                onMouseLeave={(e) => {
                  if (!active) (e.currentTarget as HTMLAnchorElement).style.color = "#8e8b82";
                }}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Page Content */}
      <div className="flex-1">{children}</div>
    </div>
  );
}
