"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Star, ExternalLink, Pencil } from "lucide-react";
import { useAdminProducts } from "@/hooks/useAdminProducts";
import { AdminPageHeader, AdminTable } from "@/components/admin/organisms";
import {
  SearchBar,
  ResultCount,
  Pagination,
  FilterTabs,
  ToggleButton,
  IconActionButton,
} from "@/components/admin/molecules";

const PAGE_SIZE = 15;

const DELIVERY_LABELS: Record<string, string> = {
  physical: "배송",
  digital_download: "다운로드",
  gifticon: "기프티콘",
  coupon: "쿠폰",
};

function formatPrice(p: number) {
  return p === 0 ? "무료" : `${p.toLocaleString()}원`;
}

function formatDate(s: string) {
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

const COLUMNS = [
  { label: "상품명" },
  { label: "카테고리", className: "text-center" },
  { label: "배송타입", className: "text-center" },
  { label: "가격", className: "text-center" },
  { label: "판매", className: "text-center" },
  { label: "리뷰", className: "text-center" },
  { label: "공개", className: "text-center" },
  { label: "BEST", className: "text-center" },
  { label: "링크", className: "text-center" },
  { label: "수정", className: "text-center" },
];

const GRID = "1fr 70px 90px 70px 55px 55px 70px 70px 44px 36px";

export default function AdminProductsPage() {
  const {
    products,
    categories,
    total,
    loading,
    pendingId,
    fetchProducts,
    fetchCategories,
    toggleActive,
    toggleBest,
  } = useAdminProducts();

  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const load = useCallback(
    (p: number, kw: string, cat?: number) => fetchProducts(p, kw, cat),
    [fetchProducts]
  );

  useEffect(() => {
    fetchCategories();
    load(1, "");
  }, [fetchCategories, load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load(1, keyword, categoryId);
  };

  const handleCategoryChange = (id: number | undefined) => {
    setCategoryId(id);
    setPage(1);
    load(1, keyword, id);
  };

  const handlePage = (p: number) => {
    setPage(p);
    load(p, keyword, categoryId);
  };

  const categoryTabs = [
    { label: "전체", value: undefined as number | undefined },
    ...categories.map((cat) => ({ label: cat.name, value: cat.id as number | undefined })),
  ];

  return (
    <div className="p-8 max-w-6xl">
      <AdminPageHeader
        title="상품 관리"
        description="상품 목록을 조회하고 공개 여부 및 베스트 설정을 관리합니다."
        action={{ label: "새 상품 등록", href: "/admin/shop/products/write" }}
      />

      <div className="mb-4">
        <FilterTabs tabs={categoryTabs} active={categoryId} onChange={handleCategoryChange} />
      </div>

      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <SearchBar
          value={keyword}
          onChange={setKeyword}
          onSubmit={handleSearch}
          placeholder="상품명 검색"
        />
        <ResultCount total={total} />
      </div>

      <AdminTable
        columns={COLUMNS}
        gridTemplateColumns={GRID}
        loading={loading}
        isEmpty={products.length === 0}
        emptyMessage="상품이 없습니다."
        px="px-4"
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="grid items-center px-4 py-3 border-b last:border-b-0 hover:bg-[#efe9de]/20 transition-colors"
            style={{ gridTemplateColumns: GRID, borderColor: "#e6dfd8" }}
          >
            <div className="min-w-0 pr-3">
              <p className="text-sm font-medium truncate" style={{ color: "#252523" }}>
                {product.title}
              </p>
              {product.subtitle && (
                <p className="text-xs truncate mt-0.5" style={{ color: "#8e8b82" }}>
                  {product.subtitle}
                </p>
              )}
            </div>

            <div className="text-center">
              <span className="text-xs" style={{ color: "#6c6a64" }}>
                {product.product_categories?.name ?? "—"}
              </span>
            </div>

            <div className="text-center">
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: "#efe9de", color: "#6c6a64" }}
              >
                {DELIVERY_LABELS[product.delivery_type] ?? product.delivery_type}
              </span>
            </div>

            <div className="text-center">
              <span className="text-xs font-medium" style={{ color: "#3d3d3a" }}>
                {formatPrice(product.price)}
              </span>
            </div>

            <div className="text-center">
              <span className="text-xs" style={{ color: "#6c6a64" }}>
                {product.sales_count}
              </span>
            </div>

            <div className="text-center flex flex-col items-center">
              <span className="text-xs" style={{ color: "#6c6a64" }}>
                {product.review_count}
              </span>
              {product.review_count > 0 && (
                <div className="flex items-center gap-0.5">
                  <Star className="w-2.5 h-2.5" style={{ color: "#e8a55a" }} />
                  <span className="text-xs" style={{ color: "#8e8b82" }}>
                    {product.average_rating}
                  </span>
                </div>
              )}
            </div>

            <div>
              <ToggleButton
                active={product.is_active}
                pending={pendingId === product.id}
                activeLabel="공개"
                inactiveLabel="비공개"
                activeColor="#5db872"
                onClick={() => toggleActive(product.id, product.is_active)}
                className="justify-center w-full"
              />
            </div>

            <div>
              <ToggleButton
                active={product.is_best}
                pending={pendingId === product.id}
                activeLabel="★ BEST"
                inactiveLabel="일반"
                activeColor="#e8a55a"
                onClick={() => toggleBest(product.id, product.is_best)}
                className="justify-center w-full"
              />
            </div>

            <div className="flex justify-center">
              <Link
                href={`/shop/${product.product_categories?.slug ?? "books"}/${product.id}`}
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
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="flex justify-center">
              <Link href={`/admin/shop/products/${product.id}/edit`}>
                <IconActionButton
                  icon={<Pencil className="w-3.5 h-3.5" />}
                  variant="default"
                  title="상품 수정"
                />
              </Link>
            </div>
          </div>
        ))}
      </AdminTable>

      <Pagination page={page} totalPages={totalPages} loading={loading} onChange={handlePage} />
    </div>
  );
}
