"use client";

import Image from "next/image";

export default function ShopPage() {
  const products = [
    {
      id: 1,
      title: "전자책",
      price: "9,900원",
      image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=800&auto=format&fit=crop", // 책 이미지
    },
    {
      id: 2,
      title: "실물책",
      price: "14,900원",
      image: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=800&auto=format&fit=crop", // 다른 책 이미지
    },
  ];

  return (
    <main className="min-h-screen p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-[1600px] mx-auto">
        {products.map((product) => (
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
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            </div>

            {/* Text Content */}
            <div className="flex flex-col gap-1">
              <h3 className="text-xl font-bold text-white group-hover:text-brand-500 transition-colors">
                {product.title}
              </h3>
              <p className="text-gray-400 font-medium text-lg">
                {product.price}
              </p>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}



