"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

export interface ShopProduct {
  id: number;
  title: string;
  subtitle: string | null;
  description: string | null;
  price: number;
  original_price: number | null;
  thumbnail_url: string | null;
  is_best: boolean;
  delivery_type: string;
  review_count: number;
  average_rating: number;
  event_label: string | null;
  stock: number | null;
  product_categories: { name: string; slug: string } | null;
}

export interface ShopProductDetail extends ShopProduct {
  event_end_date: string | null;
  display_order: number;
  product_details: {
    detailed_description: string | null;
    images: Array<{ url: string; order: number; alt: string }>;
    notes: string | null;
    type_meta: Record<string, unknown>;
  } | null;
}

export interface ProductCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
}

export interface ProductReview {
  id: number;
  product_id: number;
  user_id: string;
  rating: number;
  title: string | null;
  content: string;
  images: Array<{ url: string }> | null;
  is_verified_purchase: boolean;
  helpful_count: number;
  created_at: string;
}

export interface ProductQna {
  id: number;
  product_id: number;
  user_id: string;
  title: string;
  content: string;
  is_private: boolean;
  answer: string | null;
  answered_at: string | null;
  created_at: string;
}

const PAGE_SIZE = 12;
const QNA_PAGE_SIZE = 10;
const REVIEW_PAGE_SIZE = 10;

export function useProducts() {
  const [loading, setLoading] = useState(false);

  const fetchCategoryProducts = useCallback(
    async (slug: string, page = 1): Promise<{ products: ShopProduct[]; total: number; categoryName: string }> => {
      const supabase = createClient();
      setLoading(true);

      try {
        const { data: category, error: categoryError } = await supabase
          .from("product_categories")
          .select("id, name")
          .eq("slug", slug)
          .single();

        if (categoryError || !category) {
          return { products: [], total: 0, categoryName: "" };
        }

        const from = (page - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const { data, count, error } = await supabase
          .from("products")
          .select(
            `id, title, subtitle, description, price, original_price,
             thumbnail_url, is_best, delivery_type, review_count, average_rating,
             event_label, stock,
             product_categories!category_id (name, slug)`,
            { count: "exact" }
          )
          .eq("category_id", category.id)
          .eq("is_active", true)
          .order("display_order", { ascending: true })
          .order("created_at", { ascending: false })
          .range(from, to);

        if (error) {
          console.error("Error fetching category products:", error);
          return { products: [], total: 0, categoryName: category.name };
        }

        return {
          products: (data as unknown as ShopProduct[]) ?? [],
          total: count ?? 0,
          categoryName: category.name,
        };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchBestProducts = useCallback(async (limit = 8): Promise<ShopProduct[]> => {
    const supabase = createClient();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("products")
        .select(
          `id, title, subtitle, description, price, original_price,
           thumbnail_url, is_best, delivery_type, review_count, average_rating,
           event_label, stock,
           product_categories!category_id (name, slug)`
        )
        .eq("is_best", true)
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .limit(limit);

      if (error) {
        console.error("Error fetching best products:", error);
        return [];
      }

      return (data as unknown as ShopProduct[]) ?? [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProduct = useCallback(async (id: number): Promise<ShopProductDetail | null> => {
    const supabase = createClient();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("products")
        .select(
          `id, title, subtitle, description, price, original_price,
           thumbnail_url, is_best, delivery_type, review_count, average_rating,
           event_label, event_end_date, stock, display_order,
           product_categories!category_id (name, slug),
           product_details (detailed_description, images, notes, type_meta)`
        )
        .eq("id", id)
        .eq("is_active", true)
        .single();

      if (error || !data) {
        console.error("Error fetching product:", error);
        return null;
      }

      const raw = data as any;
      const details = Array.isArray(raw.product_details)
        ? raw.product_details[0]
        : raw.product_details;

      return {
        ...raw,
        product_details: details ?? null,
      } as ShopProductDetail;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProductReviews = useCallback(
    async (productId: number, page = 1): Promise<{ reviews: ProductReview[]; total: number }> => {
      const supabase = createClient();

      const from = (page - 1) * REVIEW_PAGE_SIZE;
      const to = from + REVIEW_PAGE_SIZE - 1;

      const { data, count, error } = await supabase
        .from("product_reviews")
        .select(
          "id, product_id, user_id, rating, title, content, images, is_verified_purchase, helpful_count, created_at",
          { count: "exact" }
        )
        .eq("product_id", productId)
        .eq("is_visible", true)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        console.error("Error fetching reviews:", error);
        return { reviews: [], total: 0 };
      }

      return { reviews: (data as ProductReview[]) ?? [], total: count ?? 0 };
    },
    []
  );

  const fetchProductQna = useCallback(
    async (
      productId: number,
      page = 1,
      userId?: string
    ): Promise<{ qna: ProductQna[]; total: number }> => {
      const supabase = createClient();

      const from = (page - 1) * QNA_PAGE_SIZE;
      const to = from + QNA_PAGE_SIZE - 1;

      let query = supabase
        .from("product_qna")
        .select(
          "id, product_id, user_id, title, content, is_private, answer, answered_at, created_at",
          { count: "exact" }
        )
        .eq("product_id", productId);

      query = userId
        ? query.or(`is_private.eq.false,user_id.eq.${userId}`)
        : query.eq("is_private", false);

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        console.error("Error fetching Q&A:", error);
        return { qna: [], total: 0 };
      }

      return { qna: (data as ProductQna[]) ?? [], total: count ?? 0 };
    },
    []
  );

  const submitQna = useCallback(
    async (input: {
      productId: number;
      userId: string;
      title: string;
      content: string;
      isPrivate: boolean;
    }): Promise<{ ok: boolean; error?: string }> => {
      const supabase = createClient();

      const { error } = await supabase.from("product_qna").insert({
        product_id: input.productId,
        user_id: input.userId,
        title: input.title.trim(),
        content: input.content.trim(),
        is_private: input.isPrivate,
      });

      if (!error) return { ok: true };
      console.error("Error submitting Q&A:", error);
      return { ok: false, error: error.message };
    },
    []
  );

  const fetchCategories = useCallback(async (): Promise<ProductCategory[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("product_categories")
      .select("id, name, slug, description")
      .order("id");

    if (error) {
      console.error("Error fetching categories:", error);
      return [];
    }

    return (data as ProductCategory[]) ?? [];
  }, []);

  return {
    loading,
    fetchCategoryProducts,
    fetchBestProducts,
    fetchProduct,
    fetchProductReviews,
    fetchProductQna,
    submitQna,
    fetchCategories,
  };
}
