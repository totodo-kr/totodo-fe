"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Eye, EyeOff, ExternalLink } from "lucide-react";
import { useAdminLectures } from "@/hooks/useAdminLectures";
import { AdminPageHeader, AdminTable } from "@/components/admin/organisms";
import { SearchBar, ResultCount, Pagination, ToggleButton } from "@/components/admin/molecules";

const PAGE_SIZE = 15;

function formatDate(s: string) {
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function formatPrice(p: number) {
  return p === 0 ? "무료" : `${p.toLocaleString()}원`;
}

const COLUMNS = [
  { label: "강의명" },
  { label: "가격", className: "text-center" },
  { label: "공개 상태", className: "text-center" },
  { label: "등록일", className: "text-center" },
  { label: "바로가기", className: "text-center" },
];

const GRID = "1fr 80px 100px 100px 80px";

export default function AdminLecturesPage() {
  const { lectures, total, loading, pendingId, fetchLectures, togglePublished } =
    useAdminLectures();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const load = useCallback((p: number, kw: string) => fetchLectures(p, kw), [fetchLectures]);

  useEffect(() => {
    load(1, "");
  }, [load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load(1, keyword);
  };

  const handlePage = (p: number) => {
    setPage(p);
    load(p, keyword);
  };

  return (
    <div className="p-8 max-w-6xl">
      <AdminPageHeader
        title="강의 관리"
        description="강의 목록을 조회하고 공개 여부를 관리합니다."
      />

      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <SearchBar
          value={keyword}
          onChange={setKeyword}
          onSubmit={handleSearch}
          placeholder="강의 제목 검색"
        />
        <ResultCount total={total} />
      </div>

      <AdminTable
        columns={COLUMNS}
        gridTemplateColumns={GRID}
        loading={loading}
        isEmpty={lectures.length === 0}
        emptyMessage="강의가 없습니다."
      >
        {lectures.map((lecture) => (
          <div
            key={lecture.id}
            className="grid items-center px-5 py-3.5 border-b last:border-b-0 hover:bg-[#efe9de]/30 transition-colors"
            style={{ gridTemplateColumns: GRID, borderColor: "#e6dfd8" }}
          >
            <Link href={`/admin/academy/lectures/${lecture.id}`} className="min-w-0 pr-4 group">
              <p
                className="text-sm font-medium truncate group-hover:underline"
                style={{ color: "#252523" }}
              >
                {lecture.title}
              </p>
              {lecture.subtitle && (
                <p className="text-xs truncate mt-0.5" style={{ color: "#8e8b82" }}>
                  {lecture.subtitle}
                </p>
              )}
            </Link>

            <div className="text-center">
              <span className="text-sm" style={{ color: "#3d3d3a" }}>
                {formatPrice(lecture.price)}
              </span>
            </div>

            <div className="flex justify-center">
              <ToggleButton
                active={lecture.is_published}
                pending={pendingId === lecture.id}
                activeColor="#5db872"
                activeLabel={<><Eye className="w-3 h-3" />공개 중</>}
                inactiveLabel={<><EyeOff className="w-3 h-3" />비공개</>}
                onClick={() => togglePublished(lecture.id, lecture.is_published)}
              />
            </div>

            <div className="text-center">
              <span className="text-sm" style={{ color: "#6c6a64" }}>
                {formatDate(lecture.created_at)}
              </span>
            </div>

            <div className="flex justify-center">
              <Link
                href={`/academy/${lecture.id}`}
                target="_blank"
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: "#8e8b82" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color = "#cc785c";
                  (e.currentTarget as HTMLAnchorElement).style.background = "#efe9de";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color = "#8e8b82";
                  (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                }}
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ))}
      </AdminTable>

      <Pagination page={page} totalPages={totalPages} loading={loading} onChange={handlePage} />
    </div>
  );
}
