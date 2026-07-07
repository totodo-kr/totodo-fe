"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAdminProductCategories } from "@/hooks/useAdminProductCategories";
import { AdminPageHeader, AdminTable } from "@/components/admin/organisms";
import { IconActionButton } from "@/components/admin/molecules";

const COLUMNS = [
  { label: "이름" },
  { label: "slug" },
  { label: "설명" },
  { label: "상세 항목 수", className: "text-center" },
  { label: "관리", className: "text-center" },
];

const GRID = "140px 140px 1fr 100px 90px";

export default function AdminProductCategoriesPage() {
  const router = useRouter();
  const { categories, loading, pendingId, fetchCategories, deleteCategory } =
    useAdminProductCategories();

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`"${name}" 카테고리를 삭제하시겠습니까?`)) return;
    const res = await deleteCategory(id);
    if (!res.ok) toast.error(res.message ?? "삭제 실패");
  };

  return (
    <div className="p-8 max-w-6xl">
      <AdminPageHeader
        title="상품 카테고리 목록"
        description="상품 카테고리와 카테고리별 상세 항목(상품 등록 시 표시될 필드)을 관리합니다."
        action={{ label: "새 카테고리 등록", href: "/admin/shop/categories/write" }}
      />

      <AdminTable
        columns={COLUMNS}
        gridTemplateColumns={GRID}
        loading={loading}
        isEmpty={categories.length === 0}
        emptyMessage="등록된 카테고리가 없습니다."
      >
        {categories.map((category) => (
          <div
            key={category.id}
            className="grid items-center px-5 py-3.5 border-b last:border-b-0 hover:bg-[#efe9de]/30 transition-colors"
            style={{ gridTemplateColumns: GRID, borderColor: "#e6dfd8" }}
          >
            <span className="text-sm font-medium" style={{ color: "#141413" }}>
              {category.name}
            </span>
            <code
              className="text-xs font-mono px-2 py-0.5 rounded w-fit"
              style={{ background: "#efe9de", color: "#cc785c" }}
            >
              {category.slug}
            </code>
            <span className="text-sm truncate" style={{ color: "#6c6a64" }}>
              {category.description || "-"}
            </span>
            <span className="text-sm text-center" style={{ color: "#252523" }}>
              {category.field_schema?.length ?? 0}
            </span>
            <div className="flex items-center justify-center gap-1">
              <IconActionButton
                icon={<Pencil className="w-3.5 h-3.5" />}
                onClick={() => router.push(`/admin/shop/categories/${category.id}/edit`)}
              />
              <IconActionButton
                icon={<Trash2 className="w-3.5 h-3.5" />}
                variant="danger"
                loading={pendingId === category.id}
                onClick={() => handleDelete(category.id, category.name)}
              />
            </div>
          </div>
        ))}
      </AdminTable>
    </div>
  );
}
