"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingCart, X } from "lucide-react";

export default function WishlistPage() {
  // 임시 위시리스트 데이터
  const wishlistItems = [
    {
      id: 1,
      title: "Ritual Note",
      price: "12,000원",
      image:
        "https://images.unsplash.com/photo-1517842645767-c639042777db?q=80&w=800&auto=format&fit=crop",
    },
    {
      id: 2,
      title: "Weekly Planner",
      price: "15,000원",
      image:
        "https://images.unsplash.com/photo-1531346378271-e6b3f77860c0?q=80&w=800&auto=format&fit=crop",
    },
    {
      id: 3,
      title: "Essential Kit",
      price: "28,000원",
      image:
        "https://images.unsplash.com/photo-1590736969955-71cc94901144?q=80&w=800&auto=format&fit=crop",
    },
  ];

  return (
    <main className="min-h-screen py-16 px-6">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">위시리스트</h1>
          <p className="text-gray-400">마음에 드는 상품을 저장해두세요</p>
        </div>

        {/* Wishlist Items */}
        {wishlistItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {wishlistItems.map((item) => (
              <div
                key={item.id}
                className="bg-zinc-900 rounded-xl border border-white/10 overflow-hidden group"
              >
                {/* Image */}
                <div className="relative aspect-square overflow-hidden">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* Remove Button */}
                  <button
                    className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-colors"
                    aria-label="위시리스트에서 제거"
                  >
                    <X size={18} className="text-white" />
                  </button>
                </div>

                {/* Info */}
                <div className="p-5 flex flex-col gap-3">
                  <h3 className="text-xl font-bold text-white">{item.title}</h3>
                  <p className="text-lg font-medium text-brand-500">{item.price}</p>

                  {/* Actions */}
                  <div className="flex gap-3 mt-2">
                    <button className="flex-1 px-4 py-2.5 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition-colors flex items-center justify-center gap-2">
                      <ShoppingCart size={18} />
                      장바구니
                    </button>
                    <Link
                      href={`/shop/goods/${item.id}`}
                      className="flex-1 px-4 py-2.5 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-colors text-center"
                    >
                      상세보기
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Heart size={64} className="mx-auto mb-6 text-gray-600" />
            <h2 className="text-2xl font-bold text-white mb-3">
              위시리스트가 비어있습니다
            </h2>
            <p className="text-gray-400 mb-8">
              마음에 드는 상품을 위시리스트에 추가해보세요
            </p>
            <Link
              href="/shop"
              className="inline-block px-8 py-3 bg-brand-500 text-white rounded-lg font-bold hover:bg-brand-600 transition-colors"
            >
              상점 둘러보기
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
