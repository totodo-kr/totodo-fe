"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function CoursePage() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    // 기본적으로 information 페이지로 리다이렉트
    router.replace(`/academy/${params.id}/information`);
  }, [router, params.id]);

  return null;
}
