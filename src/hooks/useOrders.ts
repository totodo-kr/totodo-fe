import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";

export interface OrderItem {
  product_id: number;
  product_name: string;
  product_price: number;
  quantity: number;
  subtotal: number;
  delivery_type: string;
}

export interface CreateOrderInput {
  items: OrderItem[];
  total_product_price: number;
  total_shipping_fee: number;
  total_discount: number;
  final_price: number;
  recipient_name: string;
  recipient_phone: string;
  shipping_address: string;
  shipping_zipcode?: string;
  shipping_memo?: string;
  user_coupon_id?: number;
  coupon_discount?: number;
}

export function useOrders() {
  const [creating, setCreating] = useState(false);
  const { user } = useAuthStore();

  /**
   * Generate a human-readable order number.
   * Format: ORD-YYYYMMDD-XXXXXXXX (8 random alphanumeric chars)
   */
  function generateOrderNumber(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.random().toString(36).slice(2, 10).toUpperCase();
    return `ORD-${date}-${random}`;
  }

  /**
   * Create a pending order in Supabase.
   * 1. INSERT into orders
   * 2. INSERT into order_items (bulk)
   * Returns { order_id, order_number } on success, null on error.
   */
  async function createOrder(
    data: CreateOrderInput,
    status: "pending" | "paid" = "pending"
  ): Promise<{ order_id: number; order_number: string } | null> {
    if (!user) return null;

    setCreating(true);
    const supabase = createClient();

    try {
      const order_number = generateOrderNumber();

      // §2: order_items.delivery_type 스냅샷 조합으로 order_type 파생
      const hasPhysical = data.items.some((item) => item.delivery_type === "physical");
      const hasDigital = data.items.some((item) => item.delivery_type !== "physical");
      const order_type = hasPhysical && hasDigital ? "mixed" : hasDigital ? "digital" : "physical";

      // 1. Insert order
      const { data: orderRow, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          order_number,
          total_product_price: data.total_product_price,
          total_shipping_fee: data.total_shipping_fee,
          total_discount: data.total_discount,
          final_price: data.final_price,
          recipient_name: data.recipient_name,
          recipient_phone: data.recipient_phone,
          shipping_address: data.shipping_address,
          shipping_zipcode: data.shipping_zipcode ?? null,
          shipping_memo: data.shipping_memo ?? null,
          status,
          order_type,
          user_coupon_id: data.user_coupon_id ?? null,
          coupon_discount: data.coupon_discount ?? 0,
        })
        .select("id, order_number")
        .single();

      if (orderError || !orderRow) {
        console.error("Order insert error:", orderError);
        return null;
      }

      const order_id: number = orderRow.id;

      // 2. Bulk insert order_items
      const itemRows = data.items.map((item) => ({
        order_id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_price: item.product_price,
        quantity: item.quantity,
        subtotal: item.subtotal,
        delivery_type: item.delivery_type,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(itemRows);

      if (itemsError) {
        console.error("Order items insert error:", itemsError);
        // Roll back: delete the order we just created
        await supabase.from("orders").delete().eq("id", order_id);
        return null;
      }

      return { order_id, order_number };
    } catch (err) {
      console.error("createOrder unexpected error:", err);
      return null;
    } finally {
      setCreating(false);
    }
  }

  return {
    creating,
    createOrder,
    generateOrderNumber,
  };
}
