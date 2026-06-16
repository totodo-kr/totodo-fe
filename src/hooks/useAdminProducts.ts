import { useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

export interface AdminProduct {
  id: number;
  title: string;
  subtitle: string | null;
  price: number;
  is_active: boolean;
  is_best: boolean;
  delivery_type: string;
  view_count: number;
  sales_count: number;
  review_count: number;
  average_rating: number;
  thumbnail_url: string | null;
  created_at: string;
  product_categories: { name: string; slug: string } | null;
}

export interface ProductCategory {
  id: number;
  name: string;
  slug: string;
}

const PAGE_SIZE = 15;

export function useAdminProducts() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pendingId, setPendingId] = useState<number | null>(null);

  const fetchCategories = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("product_categories")
      .select("id, name, slug")
      .order("id");
    setCategories(data ?? []);
  }, []);

  const fetchProducts = useCallback(
    async (page = 1, keyword = "", categoryId?: number) => {
      const supabase = createClient();
      setLoading(true);

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("products")
        .select(
          `id, title, subtitle, price, is_active, is_best, delivery_type,
           view_count, sales_count, review_count, average_rating, thumbnail_url, created_at,
           product_categories!category_id (name, slug)`,
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(from, to);

      if (keyword.trim()) {
        query = query.ilike("title", `%${keyword.trim()}%`);
      }
      if (categoryId) {
        query = query.eq("category_id", categoryId);
      }

      const { data, count } = await query;
      setProducts((data as unknown as AdminProduct[]) ?? []);
      setTotal(count ?? 0);
      setLoading(false);
    },
    []
  );

  const toggleActive = async (id: number, current: boolean) => {
    const supabase = createClient();
    setPendingId(id);
    const { error } = await supabase
      .from("products")
      .update({ is_active: !current })
      .eq("id", id);
    if (!error) {
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_active: !current } : p))
      );
    }
    setPendingId(null);
    return !error;
  };

  const toggleBest = async (id: number, current: boolean) => {
    const supabase = createClient();
    setPendingId(id);
    const { error } = await supabase
      .from("products")
      .update({ is_best: !current })
      .eq("id", id);
    if (!error) {
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_best: !current } : p))
      );
    }
    setPendingId(null);
    return !error;
  };

  const deleteProduct = async (id: number) => {
    const supabase = createClient();
    setPendingId(id);
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (!error) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setTotal((prev) => prev - 1);
    }
    setPendingId(null);
    return !error;
  };

  return {
    products,
    categories,
    total,
    loading,
    pendingId,
    fetchProducts,
    fetchCategories,
    toggleActive,
    toggleBest,
    deleteProduct,
  };
}
