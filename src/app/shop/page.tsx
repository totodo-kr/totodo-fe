"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSliderStore } from "@/store/useSliderStore";
import { useProducts, ShopProduct, ProductCategory } from "@/hooks/useProducts";
import ProductCard from "@/components/shop/ProductCard";

function BestProductSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="w-full aspect-square rounded-2xl bg-zinc-800 animate-pulse" />
      <div className="space-y-2">
        <div className="h-4 bg-zinc-800 rounded animate-pulse w-3/4" />
        <div className="h-4 bg-zinc-800 rounded animate-pulse w-1/2" />
      </div>
    </div>
  );
}

function CategorySkeleton() {
  return (
    <div className="h-16 bg-zinc-800 rounded-xl animate-pulse" />
  );
}

export default function ShopPage() {
  const { setSlides } = useSliderStore();
  const { fetchBestProducts, fetchCategories } = useProducts();

  const [bestProducts, setBestProducts] = useState<ShopProduct[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loadingBest, setLoadingBest] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    setSlides([
      {
        id: 1,
        title: "Original Mind Essential English",
        subtitle: "분섭 영어개론",
        description: "영어 마스터를 위한 명쾌 추천들 세우기",
        buttonText: "자세히 보기",
        buttonLink: "/shop/books",
        image:
          "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=800&auto=format&fit=crop",
        bgColor: "bg-[#f4b591]",
      },
      {
        id: 2,
        title: "Premium Notebook Series",
        subtitle: "프리미엄 노트",
        description: "당신의 생각을 담을 최고의 노트",
        buttonText: "자세히 보기",
        buttonLink: "/shop/goods",
        image:
          "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=800&auto=format&fit=crop",
        bgColor: "bg-[#e8c5a8]",
      },
      {
        id: 3,
        title: "Study Essential Kit",
        subtitle: "학습 필수템",
        description: "효율적인 학습을 위한 완벽한 구성",
        buttonText: "자세히 보기",
        image:
          "https://images.unsplash.com/photo-1553729459-efe14ef6055d?q=80&w=800&auto=format&fit=crop",
        bgColor: "bg-[#d4b5a0]",
      },
    ]);

    return () => {
      setSlides([]);
    };
  }, [setSlides]);

  useEffect(() => {
    fetchBestProducts(8).then((data) => {
      setBestProducts(data);
      setLoadingBest(false);
    });
  }, [fetchBestProducts]);

  useEffect(() => {
    fetchCategories().then((data) => {
      setCategories(data);
      setLoadingCategories(false);
    });
  }, [fetchCategories]);

  return (
    <main className="min-h-screen">
      {/* Best Products Section */}
      <div className="py-16 px-8">
        <div className="max-w-[1600px] mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-3">베스트 상품</h2>
            <p className="text-gray-400">ORGN MAKT의 베스트 아이템을 소개합니다.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {loadingBest
              ? Array.from({ length: 4 }).map((_, i) => <BestProductSkeleton key={i} />)
              : bestProducts.length > 0
              ? bestProducts.map((product) => (
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
                    categorySlug={product.product_categories?.slug}
                  />
                ))
              : (
                <div className="col-span-4 text-center py-16 text-gray-500">
                  베스트 상품이 없습니다.
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Category Section */}
      <div className="py-16 px-8 border-t border-white/5">
        <div className="max-w-[1600px] mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-3">카테고리</h2>
            <p className="text-gray-400">원하는 카테고리를 둘러보세요.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {loadingCategories
              ? Array.from({ length: 10 }).map((_, i) => <CategorySkeleton key={i} />)
              : categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={cat.slug === "books" ? "/shop/books" : `/shop/${cat.slug}`}
                    className="group flex items-center justify-center h-16 rounded-xl border border-white/10 hover:border-brand-500/50 hover:bg-brand-500/5 transition-all duration-200"
                  >
                    <span className="text-gray-300 group-hover:text-white font-medium transition-colors">
                      {cat.name}
                    </span>
                  </Link>
                ))}
          </div>
        </div>
      </div>
    </main>
  );
}
