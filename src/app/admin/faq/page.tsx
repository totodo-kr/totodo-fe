"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { useFaqs } from "@/hooks/useFaqs";
import { createClient } from "@/utils/supabase/client";
import { AdminPageHeader, AdminTable } from "@/components/admin/organisms";
import { SearchBar, ResultCount, Pagination, IconActionButton } from "@/components/admin/molecules";

function formatDate(s: string) {
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function getAuthorName(profiles: { display_name: string | null; name: string | null } | null) {
  return profiles?.display_name || profiles?.name || "—";
}

const COLUMNS = [
  { label: "제목" },
  { label: "작성자", className: "text-center" },
  { label: "등록일", className: "text-center" },
  { label: "관리", className: "text-center" },
];

export default function AdminFaqPage() {
  const [page, setPage] = useState(1);
  const { faqs, totalCount, loading, setKeyword, setPage: setHookPage, fetchFaqs, totalPages } =
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
      <AdminPageHeader
        title="FAQ 관리"
        description="FAQ 목록을 조회하고 등록·수정·삭제합니다."
        action={{ label: "새 FAQ 작성", href: "/admin/faq/write" }}
      />

      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <SearchBar
          value={localKeyword}
          onChange={setLocalKeyword}
          onSubmit={handleSearch}
          placeholder="제목 검색"
        />
        <ResultCount total={totalCount} />
      </div>

      <AdminTable
        columns={COLUMNS}
        gridTemplateColumns="1fr 100px 100px 80px"
        loading={loading}
        isEmpty={faqs.length === 0}
        emptyMessage="FAQ가 없습니다."
      >
        {faqs.map((faq) => (
          <div
            key={faq.id}
            className="grid items-center px-5 py-3.5 border-b last:border-b-0 hover:bg-[#efe9de]/30 transition-colors"
            style={{ gridTemplateColumns: "1fr 100px 100px 80px", borderColor: "#e6dfd8" }}
          >
            <Link
              href={`/faq/${faq.id}`}
              className="text-sm font-medium truncate pr-4 hover:underline"
              style={{ color: "#252523" }}
              target="_blank"
            >
              {faq.title}
            </Link>

            <div className="text-center">
              <span className="text-sm" style={{ color: "#6c6a64" }}>
                {getAuthorName(faq.profiles)}
              </span>
            </div>

            <div className="text-center">
              <span className="text-sm" style={{ color: "#6c6a64" }}>
                {formatDate(faq.created_at)}
              </span>
            </div>

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
              <IconActionButton
                icon={<Trash2 className="w-4 h-4" />}
                loading={deletingId === faq.id}
                variant="danger"
                onClick={() => handleDelete(faq.id, faq.title)}
              />
            </div>
          </div>
        ))}
      </AdminTable>

      <Pagination page={page} totalPages={totalPages} loading={loading} onChange={handlePage} />
    </div>
  );
}
