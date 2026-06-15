"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

export interface ProductFormData {
  title: string;
  subtitle: string;
  description: string;
  category_id: number | "";
  delivery_type: string;
  price: number | "";
  original_price: number | "";
  discount_rate: number | "";
  event_label: string;
  event_end_date: string;
  stock: number | "";
  is_active: boolean;
  is_best: boolean;
  display_order: number | "";
  thumbnail_url: string;
  detailed_description: string;
  notes: string;
  images: Array<{ url: string; order: number; alt: string }>;
  type_meta: Record<string, unknown>;
}

export const EMPTY_FORM: ProductFormData = {
  title: "",
  subtitle: "",
  description: "",
  category_id: "",
  delivery_type: "physical",
  price: "",
  original_price: "",
  discount_rate: "",
  event_label: "",
  event_end_date: "",
  stock: "",
  is_active: true,
  is_best: false,
  display_order: "",
  thumbnail_url: "",
  detailed_description: "",
  notes: "",
  images: [],
  type_meta: {},
};

export function useAdminProductDetail() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProduct = useCallback(async (id: number): Promise<ProductFormData | null> => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { data: product, error: pErr } = await supabase
      .from("products")
      .select(
        `id, category_id, title, subtitle, description, price, original_price,
         discount_rate, event_label, event_end_date, stock, is_active, is_best,
         display_order, thumbnail_url, delivery_type`
      )
      .eq("id", id)
      .single();

    if (pErr || !product) {
      setError(pErr?.message ?? "상품을 찾을 수 없습니다.");
      setLoading(false);
      return null;
    }

    const { data: detail } = await supabase
      .from("product_details")
      .select("detailed_description, images, notes, type_meta")
      .eq("product_id", id)
      .maybeSingle();

    setLoading(false);

    return {
      title: product.title ?? "",
      subtitle: product.subtitle ?? "",
      description: product.description ?? "",
      category_id: product.category_id ?? "",
      delivery_type: product.delivery_type ?? "physical",
      price: product.price ?? "",
      original_price: product.original_price ?? "",
      discount_rate: product.discount_rate ?? "",
      event_label: product.event_label ?? "",
      event_end_date: product.event_end_date ?? "",
      stock: product.stock ?? "",
      is_active: product.is_active ?? true,
      is_best: product.is_best ?? false,
      display_order: product.display_order ?? "",
      thumbnail_url: product.thumbnail_url ?? "",
      detailed_description: detail?.detailed_description ?? "",
      notes: detail?.notes ?? "",
      images: (detail?.images as ProductFormData["images"]) ?? [],
      type_meta: (detail?.type_meta as Record<string, unknown>) ?? {},
    };
  }, []);

  const createProduct = useCallback(async (data: ProductFormData): Promise<{ id: number } | null> => {
    setSaving(true);
    setError(null);
    const supabase = createClient();

    const { data: inserted, error: pErr } = await supabase
      .from("products")
      .insert({
        title: data.title,
        subtitle: data.subtitle || null,
        description: data.description || null,
        category_id: data.category_id || null,
        delivery_type: data.delivery_type,
        price: data.price === "" ? 0 : data.price,
        original_price: data.original_price === "" ? null : data.original_price,
        discount_rate: data.discount_rate === "" ? null : data.discount_rate,
        event_label: data.event_label || null,
        event_end_date: data.event_end_date || null,
        stock: data.stock === "" ? -1 : data.stock,
        is_active: data.is_active,
        is_best: data.is_best,
        display_order: data.display_order === "" ? 0 : data.display_order,
        thumbnail_url: data.thumbnail_url || null,
      })
      .select("id")
      .single();

    if (pErr || !inserted) {
      setError(pErr?.message ?? "상품 등록에 실패했습니다.");
      setSaving(false);
      return null;
    }

    const { error: dErr } = await supabase.from("product_details").insert({
      product_id: inserted.id,
      detailed_description: data.detailed_description || null,
      notes: data.notes || null,
      images: data.images.length > 0 ? data.images : null,
      type_meta: Object.keys(data.type_meta).length > 0 ? data.type_meta : null,
    });

    if (dErr) {
      setError(dErr.message);
      setSaving(false);
      return null;
    }

    setSaving(false);
    return { id: inserted.id };
  }, []);

  const updateProduct = useCallback(async (id: number, data: ProductFormData): Promise<boolean> => {
    setSaving(true);
    setError(null);
    const supabase = createClient();

    const { error: pErr } = await supabase
      .from("products")
      .update({
        title: data.title,
        subtitle: data.subtitle || null,
        description: data.description || null,
        category_id: data.category_id || null,
        delivery_type: data.delivery_type,
        price: data.price === "" ? 0 : data.price,
        original_price: data.original_price === "" ? null : data.original_price,
        discount_rate: data.discount_rate === "" ? null : data.discount_rate,
        event_label: data.event_label || null,
        event_end_date: data.event_end_date || null,
        stock: data.stock === "" ? -1 : data.stock,
        is_active: data.is_active,
        is_best: data.is_best,
        display_order: data.display_order === "" ? 0 : data.display_order,
        thumbnail_url: data.thumbnail_url || null,
      })
      .eq("id", id);

    if (pErr) {
      setError(pErr.message);
      setSaving(false);
      return false;
    }

    const { error: dErr } = await supabase.from("product_details").upsert(
      {
        product_id: id,
        detailed_description: data.detailed_description || null,
        notes: data.notes || null,
        images: data.images.length > 0 ? data.images : null,
        type_meta: Object.keys(data.type_meta).length > 0 ? data.type_meta : null,
      },
      { onConflict: "product_id" }
    );

    if (dErr) {
      setError(dErr.message);
      setSaving(false);
      return false;
    }

    setSaving(false);
    return true;
  }, []);

  const deleteProduct = useCallback(async (id: number): Promise<boolean> => {
    setSaving(true);
    setError(null);
    const supabase = createClient();

    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      setError(error.message);
      setSaving(false);
      return false;
    }

    setSaving(false);
    return true;
  }, []);

  return {
    loading,
    saving,
    error,
    fetchProduct,
    createProduct,
    updateProduct,
    deleteProduct,
  };
}
