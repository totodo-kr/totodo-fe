"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Minus, Plus, X } from "lucide-react";
import { useState } from "react";

interface CartItem {
  id: number;
  title: string;
  price: number;
  quantity: number;
  image: string;
}

export default function CartPage() {
  // 임시 장바구니 데이터
  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      id: 1,
      title: "Ritual Note",
      price: 12000,
      quantity: 2,
      image:
        "https://images.unsplash.com/photo-1517842645767-c639042777db?q=80&w=800&auto=format&fit=crop",
    },
    {
      id: 2,
      title: "Weekly Planner",
      price: 15000,
      quantity: 1,
      image:
        "https://images.unsplash.com/photo-1531346378271-e6b3f77860c0?q=80&w=800&auto=format&fit=crop",
    },
  ]);

  const updateQuantity = (id: number, change: number) => {
    setCartItems((items) =>
      items.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + change) }
          : item
      )
    );
  };

  const removeItem = (id: number) => {
    setCartItems((items) => items.filter((item) => item.id !== id));
  };

  const totalPrice = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <main className="min-h-screen py-16 px-6">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">장바구니</h1>
          <p className="text-gray-400">선택한 상품을 확인하고 결제하세요</p>
        </div>

        {cartItems.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-zinc-900 rounded-xl border border-white/10 p-5 flex gap-5"
                >
                  {/* Image */}
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-2">
                        {item.title}
                      </h3>
                      <p className="text-brand-500 font-medium">
                        {item.price.toLocaleString()}원
                      </p>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                      >
                        <Minus size={16} className="text-white" />
                      </button>
                      <span className="text-white font-medium w-8 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                      >
                        <Plus size={16} className="text-white" />
                      </button>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeItem(item.id)}
                    className="w-10 h-10 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors flex-shrink-0"
                    aria-label="장바구니에서 제거"
                  >
                    <X size={20} className="text-gray-400" />
                  </button>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="lg:col-span-1">
              <div className="bg-zinc-900 rounded-xl border border-white/10 p-6 sticky top-20">
                <h2 className="text-xl font-bold text-white mb-6">주문 요약</h2>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-400">
                    <span>상품 금액</span>
                    <span>{totalPrice.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>배송비</span>
                    <span>무료</span>
                  </div>
                  <div className="border-t border-white/10 pt-3 mt-3">
                    <div className="flex justify-between text-white text-xl font-bold">
                      <span>총 결제금액</span>
                      <span className="text-brand-500">
                        {totalPrice.toLocaleString()}원
                      </span>
                    </div>
                  </div>
                </div>

                <button className="w-full px-6 py-4 bg-brand-500 text-white rounded-lg font-bold hover:bg-brand-600 transition-colors">
                  결제하기
                </button>

                <Link
                  href="/shop"
                  className="block w-full px-6 py-3 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-colors text-center mt-3"
                >
                  계속 쇼핑하기
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <ShoppingCart size={64} className="mx-auto mb-6 text-gray-600" />
            <h2 className="text-2xl font-bold text-white mb-3">
              장바구니가 비어있습니다
            </h2>
            <p className="text-gray-400 mb-8">
              상품을 장바구니에 추가해보세요
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
