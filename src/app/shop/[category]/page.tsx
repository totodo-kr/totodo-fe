"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useProducts, ShopProduct } from "@/hooks/useProducts";
import ProductCard from "@/components/shop/ProductCard";
import PageLoading from "@/components/PageLoading";

const PAGE_SIZE = 12;

export default function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = use(params);
  const { fetchCategoryProducts } = useProducts();

  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [categoryName, setCategoryName] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    async function load() {
      setLoading(true);
      const result = await fetchCategoryProducts(category, page);
      if (!result.categoryName) {
        setNotFound(true);
      } else {
        setNotFound(false);
        setCategoryName(result.categoryName);
        setProducts(result.products);
        setTotal(result.total);
      }
      setLoading(false);
    }
    load();
  }, [category, page, fetchCategoryProducts]);

  if (loading) {
    return <PageLoading />;
  }

  if (notFound) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-2xl font-bold">카테고리를 찾을 수 없습니다.</p>
          <Link href="/shop" className="text-brand-500 hover:underline">
            쇼핑 홈으로 돌아가기 →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-[1600px] mx-auto px-8 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">{categoryName}</h1>
          <p className="text-gray-400">총 {total.toLocaleString()}개 상품</p>
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-2">
              <p className="text-gray-400 text-lg font-medium">상품이 없습니다.</p>
              <p className="text-gray-500 text-sm">다른 카테고리를 둘러보세요.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                title={product.title}
                subtitle={product.subtitle}
                price={product.price}
                original_price={product.original_price}
                event_label={product.event_label}
                thumbnail_url={product.thumbnail_url}
                review_count={product.review_count}
                average_rating={product.average_rating}
                delivery_type={product.delivery_type}
                stock={product.stock}
                categorySlug={category}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-12">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-white/10 hover:border-white/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                  p === page
                    ? "bg-brand-500 text-white"
                    : "border border-white/10 hover:border-white/30 text-gray-400 hover:text-white"
                }`}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-white/10 hover:border-white/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
