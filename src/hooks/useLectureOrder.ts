import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";

export function useLectureOrder() {
  const [creating, setCreating] = useState(false);
  const { user } = useAuthStore();

  function generateOrderNumber(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.random().toString(36).slice(2, 10).toUpperCase();
    return `ORD-${date}-${random}`;
  }

  async function createLectureOrder(data: {
    lecture_id: number;
    lecture_title: string;
    final_price: number;
  }): Promise<{ order_id: number; order_number: string } | null> {
    if (!user) return null;

    setCreating(true);
    const supabase = createClient();

    try {
      const order_number = generateOrderNumber();

      const { data: orderRow, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          order_number,
          total_product_price: data.final_price,
          total_shipping_fee: 0,
          total_discount: 0,
          final_price: data.final_price,
          recipient_name: user.email?.split("@")[0] ?? "수강생",
          recipient_phone: "-",
          shipping_address: "디지털 상품",
          status: "pending",
        })
        .select("id, order_number")
        .single();

      if (orderError || !orderRow) {
        console.error("Lecture order insert error:", orderError);
        return null;
      }

      const order_id: number = orderRow.id;

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert({
          order_id,
          lecture_id: data.lecture_id,
          product_name: data.lecture_title,
          product_price: data.final_price,
          quantity: 1,
          subtotal: data.final_price,
        });

      if (itemsError) {
        console.error("Lecture order items insert error:", itemsError);
        await supabase.from("orders").delete().eq("id", order_id);
        return null;
      }

      return { order_id, order_number };
    } catch (err) {
      console.error("createLectureOrder error:", err);
      return null;
    } finally {
      setCreating(false);
    }
  }

  return { creating, createLectureOrder };
}
