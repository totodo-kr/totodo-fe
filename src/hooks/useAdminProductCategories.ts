import { useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { MetaField } from "@/config/productMetaSchemas";

export interface AdminProductCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  field_schema: MetaField[];
  created_at: string;
}

export interface CategoryInput {
  name: string;
  slug: string;
  description: string;
  field_schema: MetaField[];
}

export function useAdminProductCategories() {
  const [categories, setCategories] = useState<AdminProductCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingId, setPendingId] = useState<number | null>(null);

  const fetchCategories = useCallback(async () => {
    const supabase = createClient();
    setLoading(true);
    const { data } = await supabase
      .from("product_categories")
      .select("id, name, slug, description, field_schema, created_at")
      .order("id");
    setCategories((data as AdminProductCategory[]) ?? []);
    setLoading(false);
  }, []);

  const fetchCategory = async (id: number): Promise<AdminProductCategory | null> => {
    const supabase = createClient();
    const { data } = await supabase
      .from("product_categories")
      .select("id, name, slug, description, field_schema, created_at")
      .eq("id", id)
      .single();
    return (data as AdminProductCategory) ?? null;
  };

  const createCategory = async (
    input: CategoryInput
  ): Promise<{ ok: boolean; message?: string }> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("product_categories")
      .insert({
        name: input.name,
        slug: input.slug,
        description: input.description || null,
        field_schema: input.field_schema,
      })
      .select()
      .single();
    if (error) return { ok: false, message: error.message };
    setCategories((prev) => [...prev, data as AdminProductCategory].sort((a, b) => a.id - b.id));
    return { ok: true };
  };

  const updateCategory = async (
    id: number,
    updates: Partial<Pick<CategoryInput, "name" | "description" | "field_schema">>
  ): Promise<{ ok: boolean; message?: string }> => {
    const supabase = createClient();
    setPendingId(id);
    const { error } = await supabase.from("product_categories").update(updates).eq("id", id);
    setPendingId(null);
    if (error) return { ok: false, message: error.message };
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    return { ok: true };
  };

  const deleteCategory = async (id: number): Promise<{ ok: boolean; message?: string }> => {
    const supabase = createClient();

    const { count } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("category_id", id);

    if (count && count > 0) {
      return { ok: false, message: `이 카테고리에 속한 상품이 ${count}개 있어 삭제할 수 없습니다.` };
    }

    setPendingId(id);
    const { error } = await supabase.from("product_categories").delete().eq("id", id);
    setPendingId(null);
    if (error) return { ok: false, message: error.message };
    setCategories((prev) => prev.filter((c) => c.id !== id));
    return { ok: true };
  };

  return {
    categories,
    loading,
    pendingId,
    fetchCategories,
    fetchCategory,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
