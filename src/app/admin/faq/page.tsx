"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight, Plus, Pencil, Trash2 } from "lucide-react";
import { useFaqs } from "@/hooks/useFaqs";
import { createClient } from "@/utils/supabase/client";

function formatDate(s: string) {
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function getAuthorName(profiles: { display_name: string | null; name: string | null } | null) {
  return profiles?.display_name || profiles?.name || "—";
}

export default function AdminFaqPage() {
  const [page, setPage] = useState(1);
  const { faqs, totalCount, loading, keyword, setKeyword, setPage: setHookPage, fetchFaqs, totalPages } =
    useFaqs(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [localKeyword, setLocalKeyword] = useState("");

  useEffect(() => {
    setHookPage(1);
  }, [setHookPage]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setHookPage(1);
    setKeyword(localKeyword);
  };

  const handlePage = (p: number) => {
    setPage(p);
    setHookPage(p);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`"${title}" FAQ를 삭제하시겠습니까?`)) return;
    const supabase = createClient();
    setDeletingId(id);
    const { error } = await supabase.from("faq").delete().eq("id", id);
    if (error) {
      alert("삭제 중 오류가 발생했습니다.");
    } else {
      fetchFaqs();
    }
    setDeletingId(null);
  };

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "#141413" }}>
            FAQ 관리
          </h1>
          <p className="text-sm mt-1" style={{ color: "#6c6a64" }}>
            FAQ 목록을 조회하고 등록·수정·삭제합니다.
          </p>
        </div>
        <Link
          href="/admin/faq/write"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{ background: "#cc785c", color: "#fff" }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLAnchorElement).style.background = "#a9583e")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLAnchorElement).style.background = "#cc785c")
          }
        >
          <Plus className="w-4 h-4" />
          새 FAQ 작성
        </Link>
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
            value={localKeyword}
            onChange={(e) => setLocalKeyword(e.target.value)}
            placeholder="제목 검색"
            className="w-full h-10 pl-9 pr-4 rounded-lg text-sm border outline-none"
            style={{ background: "#efe9de", borderColor: "#e6dfd8", color: "#141413" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#cc785c")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#e6dfd8")}
          />
        </form>
        <span className="text-sm" style={{ color: "#6c6a64" }}>
          총{" "}
          <span className="font-semibold" style={{ color: "#141413" }}>
            {totalCount}
          </span>
          개
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#e6dfd8" }}>
        <div
          className="grid items-center px-5 py-3 text-xs font-semibold uppercase tracking-wide border-b"
          style={{
            gridTemplateColumns: "1fr 100px 100px 80px",
            background: "#efe9de",
            color: "#6c6a64",
            borderColor: "#e6dfd8",
          }}
        >
          <span>제목</span>
          <span className="text-center">작성자</span>
          <span className="text-center">등록일</span>
          <span className="text-center">관리</span>
        </div>

        <div style={{ background: "#faf9f5" }}>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div
                className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: "#cc785c", borderTopColor: "transparent" }}
              />
            </div>
          ) : faqs.length === 0 ? (
            <p className="text-center py-12 text-sm" style={{ color: "#8e8b82" }}>
              FAQ가 없습니다.
            </p>
          ) : (
            faqs.map((faq) => (
              <div
                key={faq.id}
                className="grid items-center px-5 py-3.5 border-b last:border-b-0 hover:bg-[#efe9de]/30 transition-colors"
                style={{
                  gridTemplateColumns: "1fr 100px 100px 80px",
                  borderColor: "#e6dfd8",
                }}
              >
                {/* Title */}
                <Link
                  href={`/faq/${faq.id}`}
                  className="text-sm font-medium truncate pr-4 hover:underline"
                  style={{ color: "#252523" }}
                  target="_blank"
                >
                  {faq.title}
                </Link>

                {/* Author */}
                <div className="text-center">
                  <span className="text-sm" style={{ color: "#6c6a64" }}>
                    {getAuthorName(faq.profiles)}
                  </span>
                </div>

                {/* Date */}
                <div className="text-center">
                  <span className="text-sm" style={{ color: "#6c6a64" }}>
                    {formatDate(faq.created_at)}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-center gap-1">
                  <Link
                    href={`/admin/faq/${faq.id}/edit`}
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
                    <Pencil className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(faq.id, faq.title)}
                    disabled={deletingId === faq.id}
                    className="p-1.5 rounded-lg transition-colors disabled:opacity-40"
                    style={{ color: "#8e8b82" }}
                    onMouseEnter={(e) => {
                      if (deletingId !== faq.id) {
                        (e.currentTarget as HTMLButtonElement).style.color = "#c64545";
                        (e.currentTarget as HTMLButtonElement).style.background = "#efe9de";
                      }
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = "#8e8b82";
                      (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    }}
                  >
                    {deletingId === faq.id ? (
                      <div
                        className="w-4 h-4 border border-t-transparent rounded-full animate-spin"
                        style={{ borderColor: "#c64545", borderTopColor: "transparent" }}
                      />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
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
