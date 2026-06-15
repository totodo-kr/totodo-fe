"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingCart, X, LogIn, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useWishlist } from "@/hooks/useWishlist";
import { useCart } from "@/hooks/useCart";
import LoginModal from "@/components/LoginModal";

export default function WishlistPage() {
  const { user, isLoading: authLoading } = useAuthStore();
  const {
    wishlistItems,
    loading,
    fetchWishlist,
    removeFromWishlist,
  } = useWishlist();
  const { addToCart, isInCart } = useCart();
  const [loginOpen, setLoginOpen] = useState(false);
  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set());
  const [addingIds, setAddingIds] = useState<Set<number>>(new Set());
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (user) {
      fetchWishlist();
    }
  }, [user, fetchWishlist]);

  const handleRemove = async (productId: number) => {
    setRemovingIds((prev) => new Set([...prev, productId]));
    await removeFromWishlist(productId);
    setRemovingIds((prev) => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
  };

  const handleAddToCart = async (productId: number) => {
    if (!user) {
      setLoginOpen(true);
      return;
    }
    setAddingIds((prev) => new Set([...prev, productId]));
    const success = await addToCart(productId, 1);
    setAddingIds((prev) => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
    if (success) {
      setAddedIds((prev) => new Set([...prev, productId]));
      setTimeout(() => {
        setAddedIds((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      }, 2000);
    }
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
          <Heart size={64} className="text-gray-600" />
          <h2 className="text-2xl font-bold text-white">로그인이 필요합니다</h2>
          <p className="text-gray-400 text-center">
            위시리스트를 이용하려면 로그인 후 이용해주세요.
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
    <>
      <main className="min-h-screen py-16 px-6">
        <div className="max-w-[1200px] mx-auto">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-white mb-3">위시리스트</h1>
            <p className="text-gray-400">마음에 드는 상품을 저장해두세요</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-brand-500" />
            </div>
          ) : wishlistItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {wishlistItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-zinc-900 rounded-xl border border-white/10 overflow-hidden group"
                  style={{
                    opacity: removingIds.has(item.product_id) ? 0.5 : 1,
                    transition: "opacity 0.2s",
                  }}
                >
                  {/* Image */}
                  <div className="relative aspect-square overflow-hidden bg-zinc-800">
                    {item.thumbnail_url ? (
                      <Image
                        src={item.thumbnail_url}
                        alt={item.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Heart size={48} className="text-gray-600" />
                      </div>
                    )}
                    {/* Remove Button */}
                    <button
                      onClick={() => handleRemove(item.product_id)}
                      disabled={removingIds.has(item.product_id)}
                      className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-colors disabled:opacity-40"
                      aria-label="위시리스트에서 제거"
                    >
                      <X size={18} className="text-white" />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="p-5 flex flex-col gap-3">
                    <h3 className="text-xl font-bold text-white truncate">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-medium text-brand-500">
                        {item.price.toLocaleString()}원
                      </p>
                      {item.original_price &&
                        item.original_price > item.price && (
                          <p className="text-sm text-gray-500 line-through">
                            {item.original_price.toLocaleString()}원
                          </p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 mt-2">
                      <button
                        onClick={() => handleAddToCart(item.product_id)}
                        disabled={addingIds.has(item.product_id)}
                        className="flex-1 px-4 py-2.5 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {addingIds.has(item.product_id) ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : addedIds.has(item.product_id) ? (
                          <>
                            <ShoppingCart size={18} />
                            담기 완료
                          </>
                        ) : isInCart(item.product_id) ? (
                          <>
                            <ShoppingCart size={18} />
                            장바구니에 있음
                          </>
                        ) : (
                          <>
                            <ShoppingCart size={18} />
                            장바구니 담기
                          </>
                        )}
                      </button>
                      <Link
                        href={`/shop/goods/${item.product_id}`}
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
      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
