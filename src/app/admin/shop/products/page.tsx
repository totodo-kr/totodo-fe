"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Star,
  Eye,
  EyeOff,
  ExternalLink,
} from "lucide-react";
import { useAdminProducts } from "@/hooks/useAdminProducts";

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

function ToggleButton({
  active,
  pending,
  activeLabel,
  inactiveLabel,
  activeColor,
  onClick,
}: {
  active: boolean;
  pending: boolean;
  activeLabel: string;
  inactiveLabel: string;
  activeColor: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={pending}
      className="flex items-center justify-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border transition-all disabled:opacity-40 w-full"
      style={
        active
          ? { borderColor: activeColor, color: activeColor }
          : { borderColor: "#e6dfd8", color: "#8e8b82" }
      }
      onMouseEnter={(e) => {
        if (!pending) (e.currentTarget as HTMLButtonElement).style.background = "#efe9de";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
    >
      {pending ? (
        <div
          className="w-3 h-3 border border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "currentColor", borderTopColor: "transparent" }}
        />
      ) : (
        <span>{active ? activeLabel : inactiveLabel}</span>
      )}
    </button>
  );
}

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

  const handleCategoryChange = (id?: number) => {
    setCategoryId(id);
    setPage(1);
    load(1, keyword, id);
  };

  const handlePage = (p: number) => {
    setPage(p);
    load(p, keyword, categoryId);
  };

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "#141413" }}>
          상품 관리
        </h1>
        <p className="text-sm mt-1" style={{ color: "#6c6a64" }}>
          상품 목록을 조회하고 공개 여부 및 베스트 설정을 관리합니다.
        </p>
      </div>

      {/* Category filter tabs */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {[{ id: undefined, name: "전체" }, ...categories].map((cat) => (
          <button
            key={cat.id ?? "all"}
            onClick={() => handleCategoryChange(cat.id)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={
              categoryId === cat.id
                ? { background: "#cc785c", color: "#fff" }
                : { background: "#efe9de", color: "#6c6a64" }
            }
            onMouseEnter={(e) => {
              if (categoryId !== cat.id)
                (e.currentTarget as HTMLButtonElement).style.background = "#e6dfd8";
            }}
            onMouseLeave={(e) => {
              if (categoryId !== cat.id)
                (e.currentTarget as HTMLButtonElement).style.background = "#efe9de";
            }}
          >
            {cat.name}
          </button>
        ))}
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
            placeholder="상품명 검색"
            className="w-full h-10 pl-9 pr-4 rounded-lg text-sm border outline-none"
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
        <div
          className="grid items-center px-4 py-3 text-xs font-semibold uppercase tracking-wide border-b"
          style={{
            gridTemplateColumns: "1fr 70px 90px 70px 55px 55px 70px 70px 44px",
            background: "#efe9de",
            color: "#6c6a64",
            borderColor: "#e6dfd8",
          }}
        >
          <span>상품명</span>
          <span className="text-center">카테고리</span>
          <span className="text-center">배송타입</span>
          <span className="text-center">가격</span>
          <span className="text-center">판매</span>
          <span className="text-center">리뷰</span>
          <span className="text-center">공개</span>
          <span className="text-center">BEST</span>
          <span className="text-center">링크</span>
        </div>

        <div style={{ background: "#faf9f5" }}>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div
                className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: "#cc785c", borderTopColor: "transparent" }}
              />
            </div>
          ) : products.length === 0 ? (
            <p className="text-center py-12 text-sm" style={{ color: "#8e8b82" }}>
              상품이 없습니다.
            </p>
          ) : (
            products.map((product) => (
              <div
                key={product.id}
                className="grid items-center px-4 py-3 border-b last:border-b-0 hover:bg-[#efe9de]/20 transition-colors"
                style={{
                  gridTemplateColumns: "1fr 70px 90px 70px 55px 55px 70px 70px 44px",
                  borderColor: "#e6dfd8",
                }}
              >
                {/* Title */}
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

                {/* Category */}
                <div className="text-center">
                  <span className="text-xs" style={{ color: "#6c6a64" }}>
                    {product.product_categories?.name ?? "—"}
                  </span>
                </div>

                {/* Delivery type */}
                <div className="text-center">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: "#efe9de", color: "#6c6a64" }}
                  >
                    {DELIVERY_LABELS[product.delivery_type] ?? product.delivery_type}
                  </span>
                </div>

                {/* Price */}
                <div className="text-center">
                  <span className="text-xs font-medium" style={{ color: "#3d3d3a" }}>
                    {formatPrice(product.price)}
                  </span>
                </div>

                {/* Sales count */}
                <div className="text-center">
                  <span className="text-xs" style={{ color: "#6c6a64" }}>
                    {product.sales_count}
                  </span>
                </div>

                {/* Review count + rating */}
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

                {/* Active toggle */}
                <div>
                  <ToggleButton
                    active={product.is_active}
                    pending={pendingId === product.id}
                    activeLabel="공개"
                    inactiveLabel="비공개"
                    activeColor="#5db872"
                    onClick={() => toggleActive(product.id, product.is_active)}
                  />
                </div>

                {/* Best toggle */}
                <div>
                  <ToggleButton
                    active={product.is_best}
                    pending={pendingId === product.id}
                    activeLabel="★ BEST"
                    inactiveLabel="일반"
                    activeColor="#e8a55a"
                    onClick={() => toggleBest(product.id, product.is_best)}
                  />
                </div>

                {/* Link */}
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
