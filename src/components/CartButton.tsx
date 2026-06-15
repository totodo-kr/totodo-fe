"use client";

import { useState } from "react";
import { ShoppingCart, Loader2, Check } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useAuthStore } from "@/store/useAuthStore";
import LoginModal from "@/components/LoginModal";

interface CartButtonProps {
  productId: number;
  productName?: string;
  className?: string;
}

export default function CartButton({
  productId,
  productName,
  className,
}: CartButtonProps) {
  const { user } = useAuthStore();
  const { addToCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  const handleClick = async () => {
    if (!user) {
      setLoginOpen(true);
      return;
    }

    if (loading || added) return;

    setLoading(true);
    const success = await addToCart(productId, 1);
    setLoading(false);

    if (success) {
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        aria-label={productName ? `${productName} 장바구니 담기` : "장바구니 담기"}
        className={
          className ??
          "flex items-center gap-2 px-6 py-3 bg-brand-500 text-white rounded-lg font-bold hover:bg-brand-600 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        }
      >
        {loading ? (
          <Loader2 size={20} className="animate-spin" />
        ) : added ? (
          <Check size={20} />
        ) : (
          <ShoppingCart size={20} />
        )}
        {loading ? "처리중..." : added ? "담기 완료" : "장바구니 담기"}
      </button>
      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
