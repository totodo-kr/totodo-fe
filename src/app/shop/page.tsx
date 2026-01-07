"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useSliderStore } from "@/store/useSliderStore";

export default function ShopPage() {
  const { setSlides } = useSliderStore();

  // Set slider data on mount
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

    // Cleanup: hide slider when component unmounts
    return () => {
      setSlides([]);
    };
  }, [setSlides]);

  const bestProducts = [
    {
      id: 1,
      title: "Ritual Note",
      image:
        "https://images.unsplash.com/photo-1517842645767-c639042777db?q=80&w=800&auto=format&fit=crop",
    },
    {
      id: 2,
      title: "Ritual Note",
      image:
        "https://images.unsplash.com/photo-1531346378271-e6b3f77860c0?q=80&w=800&auto=format&fit=crop",
    },
    {
      id: 3,
      title: "Weekly Planner",
      image:
        "https://images.unsplash.com/photo-1517842645767-c639042777db?q=80&w=800&auto=format&fit=crop",
    },
    {
      id: 4,
      title: "Essential Kit",
      image:
        "https://images.unsplash.com/photo-1590736969955-71cc94901144?q=80&w=800&auto=format&fit=crop",
    },
  ];

  return (
    <main className="min-h-screen">
      {/* Best Products Section */}
      <div className="py-16 px-8">
        <div className="max-w-[1600px] mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-3">베스트 상품</h2>
            <p className="text-gray-400">ORGN MAKT의 베스트 아이템을 소개합니다.</p>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {bestProducts.map((product) => (
              <div key={product.id} className="flex flex-col gap-4 group cursor-pointer">
                {/* Image Container */}
                <div className="relative overflow-hidden rounded-2xl w-full aspect-square bg-zinc-800 border border-white/5">
                  <Image
                    src={product.image}
                    alt={product.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </div>

                {/* Text Content */}
                <div className="flex flex-col gap-1">
                  <h3 className="text-xl font-bold text-white group-hover:text-brand-500 transition-colors">
                    {product.title}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
