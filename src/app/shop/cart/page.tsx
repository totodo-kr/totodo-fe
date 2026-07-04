"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Minus, Plus, X, LogIn, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useCartStore } from "@/store/useCartStore";
import { useCart } from "@/hooks/useCart";
import LoginModal from "@/components/LoginModal";

export default function CartPage() {
  const { user, isLoading: authLoading } = useAuthStore();
  const { items, isLoading } = useCartStore();
  const { fetchCart, removeFromCart, updateQuantity } = useCart();
  const [loginOpen, setLoginOpen] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (user) {
      fetchCart();
    }
  }, [user, fetchCart]);

  // Calculate shipping: 3000 for physical items, free for digital
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const physicalSubtotal = items
    .filter((item) => item.delivery_type === "physical")
    .reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = physicalSubtotal > 0 && physicalSubtotal < 30000 ? 3000 : 0;
  const total = subtotal + shippingFee;

  const handleQuantityChange = async (itemId: number, newQty: number) => {
    if (newQty < 1) return;
    setPendingIds((prev) => new Set([...prev, itemId]));
    await updateQuantity(itemId, newQty);
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  };

  const handleRemove = async (itemId: number) => {
    setPendingIds((prev) => new Set([...prev, itemId]));
    await removeFromCart(itemId);
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  };

  // Show loading while auth is resolving
  if (authLoading) {
    return (
      <main className="min-h-screen py-16 px-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-brand-500" />
      </main>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <>
        <main className="min-h-screen py-16 px-6 flex flex-col items-center justify-center gap-6">
          <ShoppingCart size={64} className="text-gray-600" />
          <h2 className="text-2xl font-bold text-white">로그인이 필요합니다</h2>
          <p className="text-gray-400 text-center">
            장바구니를 이용하려면 로그인 후 이용해주세요.
          </p>
          <button
            onClick={() => setLoginOpen(true)}
            className="flex items-center gap-2 px-8 py-3 bg-brand-500 text-white rounded-lg font-bold hover:bg-brand-600 transition-colors"
          >
            <LogIn size={20} />
            로그인하기
          </button>
          <Link
            href="/shop"
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            상점으로 돌아가기
          </Link>
        </main>
        <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
      </>
    );
  }

  return (
    <main className="min-h-screen py-16 px-6">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">장바구니</h1>
          <p className="text-gray-400">선택한 상품을 확인하고 결제하세요</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-brand-500" />
          </div>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {/* Free Shipping Progress */}
              {physicalSubtotal > 0 && (() => {
                const FREE = 30000;
                const remaining = FREE - physicalSubtotal;
                const progress = Math.min((physicalSubtotal / FREE) * 100, 100);
                const done = physicalSubtotal >= FREE;
                return (
                  <div className="bg-zinc-900 rounded-xl border border-white/10 px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Truck size={16} className={done ? "text-green-400" : "text-gray-400"} />
                        {done ? (
                          <span className="text-green-400 font-medium">무료배송 달성!</span>
                        ) : (
                          <span className="text-gray-300">
                            <span className="text-white font-bold">{remaining.toLocaleString()}원</span> 추가 시 무료배송!
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {physicalSubtotal.toLocaleString()} / 30,000원
                      </span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${progress}%`,
                          background: done ? "#5db872" : "linear-gradient(90deg, #cc785c, #e8a55a)",
                        }}
                      />
                    </div>
                  </div>
                );
              })()}
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-zinc-900 rounded-xl border border-white/10 p-5 flex gap-5"
                  style={{ opacity: pendingIds.has(item.id) ? 0.6 : 1 }}
                >
                  {/* Image */}
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800">
                    {item.thumbnail_url ? (
                      <Image
                        src={item.thumbnail_url}
                        alt={item.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingCart size={28} className="text-gray-600" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1 truncate">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        <p className="text-brand-500 font-medium">
                          {item.price.toLocaleString()}원
                        </p>
                        {item.original_price &&
                          item.original_price > item.price && (
                            <p className="text-gray-500 text-sm line-through">
                              {item.original_price.toLocaleString()}원
                            </p>
                          )}
                      </div>
                      <p className="text-gray-500 text-xs mt-1">
                        {item.delivery_type === "physical"
                          ? "실물 상품"
                          : "디지털 상품 (배송 없음)"}
                      </p>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() =>
                          handleQuantityChange(item.id, item.quantity - 1)
                        }
                        disabled={item.quantity <= 1 || pendingIds.has(item.id)}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Minus size={16} className="text-white" />
                      </button>
                      <span className="text-white font-medium w-8 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          handleQuantityChange(item.id, item.quantity + 1)
                        }
                        disabled={
                          pendingIds.has(item.id) ||
                          item.delivery_type === "digital_download" ||
                          (item.stock !== null &&
                            item.stock !== -1 &&
                            item.quantity >= (item.stock ?? Infinity))
                        }
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Plus size={16} className="text-white" />
                      </button>
                    </div>
                  </div>

                  {/* Item Total + Remove */}
                  <div className="flex flex-col items-end justify-between flex-shrink-0">
                    <button
                      onClick={() => handleRemove(item.id)}
                      disabled={pendingIds.has(item.id)}
                      className="w-10 h-10 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors disabled:opacity-40"
                      aria-label="장바구니에서 제거"
                    >
                      <X size={20} className="text-gray-400" />
                    </button>
                    <p className="text-white font-bold text-sm">
                      {(item.price * item.quantity).toLocaleString()}원
                    </p>
                  </div>
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
                    <span>{subtotal.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>배송비</span>
                    <span>
                      {shippingFee > 0
                        ? `${shippingFee.toLocaleString()}원`
                        : "무료"}
                    </span>
                  </div>
                  <div className="border-t border-white/10 pt-3 mt-3">
                    <div className="flex justify-between text-white text-xl font-bold">
                      <span>총 결제금액</span>
                      <span className="text-brand-500">
                        {total.toLocaleString()}원
                      </span>
                    </div>
                  </div>
                </div>

                <Link
                  href="/shop/checkout"
                  className="block w-full px-6 py-4 bg-brand-500 text-white rounded-lg font-bold hover:bg-brand-600 transition-colors text-center"
                >
                  결제하기
                </Link>

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
            <p className="text-gray-400 mb-8">상품을 장바구니에 추가해보세요</p>
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
