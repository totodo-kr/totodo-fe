"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";

export interface WishlistItem {
  id: number; // wishlists.id
  product_id: number;
  title: string;
  price: number;
  original_price?: number | null;
  thumbnail_url?: string | null;
  delivery_type: string;
  category_slug?: string;
}

export function useWishlist() {
  const { user } = useAuthStore();
  const [wishlistIds, setWishlistIds] = useState<Set<number>>(new Set());
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  const fetchWishlist = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("wishlists")
        .select(
          "id, product_id, products(title, price, original_price, thumbnail_url, delivery_type)"
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const items: WishlistItem[] = (data ?? []).map((row: any) => ({
        id: row.id,
        product_id: row.product_id,
        title: row.products?.title ?? "",
        price: row.products?.price ?? 0,
        original_price: row.products?.original_price ?? null,
        thumbnail_url: row.products?.thumbnail_url ?? null,
        delivery_type: row.products?.delivery_type ?? "physical",
      }));

      setWishlistItems(items);
      setWishlistIds(new Set(items.map((item) => item.product_id)));
    } catch (err) {
      console.error("Error fetching wishlist:", err);
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  const addToWishlist = async (productId: number): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("wishlists")
        .insert({ product_id: productId });

      if (error) throw error;

      setWishlistIds((prev) => new Set([...prev, productId]));
      await fetchWishlist();
      return true;
    } catch (err) {
      console.error("Error adding to wishlist:", err);
      return false;
    }
  };

  const removeFromWishlist = async (productId: number): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("wishlists")
        .delete()
        .eq("product_id", productId);

      if (error) throw error;

      setWishlistIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
      setWishlistItems((prev) =>
        prev.filter((item) => item.product_id !== productId)
      );
      return true;
    } catch (err) {
      console.error("Error removing from wishlist:", err);
      return false;
    }
  };

  const isInWishlist = (productId: number): boolean => {
    return wishlistIds.has(productId);
  };

  const toggleWishlist = async (productId: number): Promise<boolean> => {
    if (isInWishlist(productId)) {
      return removeFromWishlist(productId);
    } else {
      return addToWishlist(productId);
    }
  };

  return {
    wishlistItems,
    wishlistIds,
    loading,
    fetchWishlist,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    toggleWishlist,
  };
}
