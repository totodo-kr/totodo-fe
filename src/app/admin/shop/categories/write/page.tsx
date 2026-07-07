"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Spinner } from "@/components/admin/atoms";
import CategoryForm from "../_components/CategoryForm";

export default function AdminCategoryWritePage() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Spinner size="md" color="#cc785c" />
      </div>
    );
  }

  if (!user) return null;

  return <CategoryForm mode="create" />;
}
