"use client";

import { useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { useCartStore, CartItem } from "@/store/useCartStore";

const DIGITAL_DOWNLOAD = "digital_download";

export function useCart() {
  const { user } = useAuthStore();
  const { items, setItems, setLoading, updateItemQuantity, removeItem, clearCart } =
    useCartStore();

  const supabase = createClient();

  const fetchCart = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cart_items")
        .select(
          "id, product_id, quantity, products(title, price, original_price, thumbnail_url, delivery_type, stock)"
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const cartItems: CartItem[] = (data ?? []).map((row: any) => ({
        id: row.id,
        product_id: row.product_id,
        quantity: row.quantity,
        title: row.products?.title ?? "",
        price: row.products?.price ?? 0,
        original_price: row.products?.original_price ?? null,
        thumbnail_url: row.products?.thumbnail_url ?? null,
        delivery_type: row.products?.delivery_type ?? "physical",
        stock: row.products?.stock ?? null,
      }));

      setItems(cartItems);
    } catch (err) {
      console.error("Error fetching cart:", err);
    } finally {
      setLoading(false);
    }
  }, [user, supabase, setItems, setLoading]);

  const addToCart = async (
    productId: number,
    quantity: number = 1
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      // Check if item already exists in cart
      const { data: existing, error: fetchError } = await supabase
        .from("cart_items")
        .select("id, quantity, products(delivery_type)")
        .eq("product_id", productId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existing) {
        const deliveryType = (existing as any).products?.delivery_type;
        // digital_download는 항상 수량 1로 클램프
        const newQty = deliveryType === DIGITAL_DOWNLOAD ? 1 : existing.quantity + quantity;
        const { error: updateError } = await supabase
          .from("cart_items")
          .update({ quantity: newQty, updated_at: new Date().toISOString() })
          .eq("id", existing.id);

        if (updateError) throw updateError;
        updateItemQuantity(existing.id, newQty);
      } else {
        // Insert new item
        const { error: insertError } = await supabase
          .from("cart_items")
          .insert({ product_id: productId, quantity, user_id: user.id });

        if (insertError) throw insertError;
        // Refresh cart to get full product info
        await fetchCart();
      }

      return true;
    } catch (err) {
      console.error("Error adding to cart:", err);
      return false;
    }
  };

  const removeFromCart = async (cartItemId: number): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("id", cartItemId);

      if (error) throw error;

      removeItem(cartItemId);
      return true;
    } catch (err) {
      console.error("Error removing from cart:", err);
      return false;
    }
  };

  const updateQuantity = async (
    cartItemId: number,
    quantity: number
  ): Promise<boolean> => {
    if (!user || quantity < 1) return false;

    try {
      const { error } = await supabase
        .from("cart_items")
        .update({ quantity, updated_at: new Date().toISOString() })
        .eq("id", cartItemId);

      if (error) throw error;

      updateItemQuantity(cartItemId, quantity);
      return true;
    } catch (err) {
      console.error("Error updating quantity:", err);
      return false;
    }
  };

  const clearAllCart = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      clearCart();
      return true;
    } catch (err) {
      console.error("Error clearing cart:", err);
      return false;
    }
  };

  const isInCart = (productId: number): boolean => {
    return items.some((item) => item.product_id === productId);
  };

  return {
    items,
    fetchCart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearAllCart,
    isInCart,
  };
}
