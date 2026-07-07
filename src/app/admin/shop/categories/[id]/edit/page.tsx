"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useAdminProductCategories, AdminProductCategory } from "@/hooks/useAdminProductCategories";
import { Spinner } from "@/components/admin/atoms";
import CategoryForm from "../../_components/CategoryForm";

export default function AdminCategoryEditPage() {
  const router = useRouter();
  const params = useParams();
  const categoryId = Number(params.id);

  const { user, isLoading } = useAuthStore();
  const { fetchCategory } = useAdminProductCategories();
  const [initialData, setInitialData] = useState<AdminProductCategory | null>(null);
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user || !categoryId) return;
    fetchCategory(categoryId).then((category) => {
      setInitialData(category);
      setDataReady(true);
    });
  }, [user, categoryId, fetchCategory]);

  if (isLoading || !dataReady) {
    return (
      <div className="flex items-center justify-center p-16">
        <Spinner size="md" color="#cc785c" />
      </div>
    );
  }

  if (!user) return null;

  if (!initialData) {
    return (
      <div className="p-8">
        <p style={{ color: "#c64545" }}>카테고리를 찾을 수 없습니다.</p>
      </div>
    );
  }

  return <CategoryForm mode="edit" categoryId={categoryId} initialData={initialData} />;
}
