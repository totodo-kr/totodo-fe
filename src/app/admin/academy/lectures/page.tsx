"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  ExternalLink,
} from "lucide-react";
import { useAdminLectures } from "@/hooks/useAdminLectures";

const PAGE_SIZE = 15;

function formatDate(s: string) {
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function formatPrice(p: number) {
  return p === 0 ? "무료" : `${p.toLocaleString()}원`;
}

export default function AdminLecturesPage() {
  const { lectures, total, loading, pendingId, fetchLectures, togglePublished } =
    useAdminLectures();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const load = useCallback(
    (p: number, kw: string) => fetchLectures(p, kw),
    [fetchLectures]
  );

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
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "#141413" }}>
          강의 관리
        </h1>
        <p className="text-sm mt-1" style={{ color: "#6c6a64" }}>
          강의 목록을 조회하고 공개 여부를 관리합니다.
        </p>
      </div>

      {/* Search + count */}
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-xs">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "#8e8b82" }}
          />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="강의 제목 검색"
            className="w-full h-10 pl-9 pr-4 rounded-lg text-sm border outline-none transition-all"
            style={{ background: "#efe9de", borderColor: "#e6dfd8", color: "#141413" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#cc785c")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#e6dfd8")}
          />
        </form>
        <span className="text-sm" style={{ color: "#6c6a64" }}>
          총{" "}
          <span className="font-semibold" style={{ color: "#141413" }}>
            {total}
          </span>
          개
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#e6dfd8" }}>
        {/* Header row */}
        <div
          className="grid items-center px-5 py-3 text-xs font-semibold uppercase tracking-wide border-b"
          style={{
            gridTemplateColumns: "1fr 80px 100px 100px 80px",
            background: "#efe9de",
            color: "#6c6a64",
            borderColor: "#e6dfd8",
          }}
        >
          <span>강의명</span>
          <span className="text-center">가격</span>
          <span className="text-center">공개 상태</span>
          <span className="text-center">등록일</span>
          <span className="text-center">바로가기</span>
        </div>

        <div style={{ background: "#faf9f5" }}>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div
                className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: "#cc785c", borderTopColor: "transparent" }}
              />
            </div>
          ) : lectures.length === 0 ? (
            <p className="text-center py-12 text-sm" style={{ color: "#8e8b82" }}>
              강의가 없습니다.
            </p>
          ) : (
            lectures.map((lecture) => (
              <div
                key={lecture.id}
                className="grid items-center px-5 py-3.5 border-b last:border-b-0 hover:bg-[#efe9de]/30 transition-colors"
                style={{
                  gridTemplateColumns: "1fr 80px 100px 100px 80px",
                  borderColor: "#e6dfd8",
                }}
              >
                {/* Title */}
                <Link
                  href={`/admin/academy/lectures/${lecture.id}`}
                  className="min-w-0 pr-4 group"
                >
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

                {/* Price */}
                <div className="text-center">
                  <span className="text-sm" style={{ color: "#3d3d3a" }}>
                    {formatPrice(lecture.price)}
                  </span>
                </div>

                {/* Published toggle */}
                <div className="flex justify-center">
                  <button
                    onClick={() => togglePublished(lecture.id, lecture.is_published)}
                    disabled={pendingId === lecture.id}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all disabled:opacity-50"
                    style={
                      lecture.is_published
                        ? { borderColor: "#5db872", color: "#5db872", background: "transparent" }
                        : { borderColor: "#e6dfd8", color: "#8e8b82", background: "transparent" }
                    }
                    onMouseEnter={(e) => {
                      if (pendingId !== lecture.id)
                        (e.currentTarget as HTMLButtonElement).style.background = "#efe9de";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    }}
                  >
                    {pendingId === lecture.id ? (
                      <div
                        className="w-3 h-3 border border-t-transparent rounded-full animate-spin"
                        style={{ borderColor: "currentColor", borderTopColor: "transparent" }}
                      />
                    ) : lecture.is_published ? (
                      <>
                        <Eye className="w-3 h-3" />
                        공개 중
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3 h-3" />
                        비공개
                      </>
                    )}
                  </button>
                </div>

                {/* Date */}
                <div className="text-center">
                  <span className="text-sm" style={{ color: "#6c6a64" }}>
                    {formatDate(lecture.created_at)}
                  </span>
                </div>

                {/* Link */}
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
            ))
          )}
        </div>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-6">
          <button
            onClick={() => handlePage(page - 1)}
            disabled={page === 1}
            className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30"
            style={{ color: "#6c6a64" }}
            onMouseEnter={(e) => {
              if (page !== 1) (e.currentTarget as HTMLButtonElement).style.background = "#efe9de";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => handlePage(p)}
              className="w-8 h-8 rounded-lg text-sm font-medium transition-all"
              style={
                p === page
                  ? { background: "#cc785c", color: "#fff" }
                  : { color: "#6c6a64", background: "transparent" }
              }
              onMouseEnter={(e) => {
                if (p !== page)
                  (e.currentTarget as HTMLButtonElement).style.background = "#efe9de";
              }}
              onMouseLeave={(e) => {
                if (p !== page)
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => handlePage(page + 1)}
            disabled={page === totalPages}
            className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30"
            style={{ color: "#6c6a64" }}
            onMouseEnter={(e) => {
              if (page !== totalPages)
                (e.currentTarget as HTMLButtonElement).style.background = "#efe9de";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
