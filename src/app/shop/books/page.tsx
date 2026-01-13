"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

interface Product {
  id: number;
  title: string;
  subtitle: string | null;
  description: string | null;
  price: number;
  thumbnail_url: string | null;
  category_name: string;
  review_count: number;
  average_rating: number;
}

export default function ShopBooksPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const supabase = createClient();

        // 1. 먼저 도서 카테고리 ID 찾기
        const { data: category, error: categoryError } = await supabase
          .from("product_categories")
          .select("id")
          .eq("slug", "books")
          .single();

        if (categoryError) {
          console.error("Category error:", categoryError);
          throw categoryError;
        }

        // 2. 해당 카테고리의 상품 조회 (카테고리 정보 조인)
        const { data, error } = await supabase
          .from("products")
          .select(
            `
            id,
            title,
            subtitle,
            description,
            price,
            thumbnail_url,
            review_count,
            average_rating,
            display_order,
            created_at,
            product_categories!inner (
              name,
              slug
            )
          `
          )
          .eq("category_id", category.id)
          .eq("is_active", true)
          .order("display_order", { ascending: true })
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Products error:", error);
          throw error;
        }

        // 데이터 변환 (중첩된 카테고리 정보를 평탄화)
        const formattedData =
          data?.map((product: any) => ({
            id: product.id,
            title: product.title,
            subtitle: product.subtitle,
            description: product.description,
            price: product.price,
            thumbnail_url: product.thumbnail_url,
            review_count: product.review_count,
            average_rating: product.average_rating,
            category_name: product.product_categories?.name || "",
          })) || [];

        setProducts(formattedData);
      } catch (err) {
        console.error("Error fetching products:", err);
        setError("상품을 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent"></div>
            <p className="mt-4 text-gray-400">상품을 불러오는 중...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  if (products.length === 0) {
    return (
      <main className="min-h-screen p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-gray-400 text-lg font-medium">아직 등록된 도서가 없어요.</p>
            <p className="text-gray-400 text-lg font-medium">조금만 기다려주세요!</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">도서</h1>
          <p className="text-gray-400">학습에 필요한 교재와 서적을 만나보세요</p>
        </div>

        {/* 상품 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((product) => (
            <Link href={`/shop/books/${product.id}`} key={product.id}>
              <div className="flex flex-col gap-4 group cursor-pointer">
                {/* Image Container */}
                <div className="relative overflow-hidden rounded-2xl w-full aspect-square bg-zinc-800 border border-white/5">
                  {product.thumbnail_url ? (
                    <Image
                      src={product.thumbnail_url}
                      alt={product.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      이미지 없음
                    </div>
                  )}
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>

                {/* Text Content */}
                <div className="flex flex-col gap-1">
                  <h3 className="text-xl font-bold text-white group-hover:text-brand-500 transition-colors">
                    {product.title}
                  </h3>
                  {product.subtitle && <p className="text-gray-500 text-sm">{product.subtitle}</p>}
                  {product.description && (
                    <p className="text-gray-600 font-medium text-sm line-clamp-2">
                      {product.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-white font-bold text-lg">
                      {product.price.toLocaleString()}원
                    </p>
                    {product.review_count > 0 && (
                      <div className="flex items-center gap-1 text-sm text-gray-400">
                        <span className="text-yellow-500">★</span>
                        <span>{product.average_rating}</span>
                        <span>({product.review_count})</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
