"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { ProductCategory } from "@/hooks/useAdminProducts";
import { Spinner } from "@/components/admin/atoms";
import ProductForm from "../_components/ProductForm";

export default function AdminProductWritePage() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [catLoading, setCatLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from("product_categories")
      .select("id, name, slug, field_schema")
      .order("id")
      .then(({ data }) => {
        setCategories(data ?? []);
        setCatLoading(false);
      });
  }, [user]);

  if (isLoading || catLoading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Spinner size="md" color="#cc785c" />
      </div>
    );
  }

  if (!user) return null;

  return <ProductForm mode="create" categories={categories} />;
}
