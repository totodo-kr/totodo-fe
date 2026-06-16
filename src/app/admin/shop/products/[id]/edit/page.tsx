"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { ProductCategory } from "@/hooks/useAdminProducts";
import {
  useAdminProductDetail,
  ProductFormData,
} from "@/hooks/useAdminProductDetail";
import { Spinner } from "@/components/admin/atoms";
import ProductForm from "../../_components/ProductForm";

export default function AdminProductEditPage() {
  const router = useRouter();
  const params = useParams();
  const productId = Number(params.id);

  const { user, isLoading } = useAuthStore();
  const { fetchProduct, loading, error } = useAdminProductDetail();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [initialData, setInitialData] = useState<ProductFormData | null>(null);
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user || !productId) return;

    const supabase = createClient();

    Promise.all([
      supabase.from("product_categories").select("id, name, slug").order("id"),
      fetchProduct(productId),
    ]).then(([{ data: cats }, product]) => {
      setCategories(cats ?? []);
      setInitialData(product);
      setDataReady(true);
    });
  }, [user, productId, fetchProduct]);

  if (isLoading || loading || !dataReady) {
    return (
      <div className="flex items-center justify-center p-16">
        <Spinner size="md" color="#cc785c" />
      </div>
    );
  }

  if (!user) return null;

  if (error || !initialData) {
    return (
      <div className="p-8">
        <p style={{ color: "#c64545" }}>{error ?? "상품을 찾을 수 없습니다."}</p>
      </div>
    );
  }

  return (
    <ProductForm
      mode="edit"
      productId={productId}
      initialData={initialData}
      categories={categories}
    />
  );
}
