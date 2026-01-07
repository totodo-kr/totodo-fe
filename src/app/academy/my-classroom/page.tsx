"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MyClassroomPage() {
  const router = useRouter();

  useEffect(() => {
    // 기본적으로 수강 중 페이지로 리다이렉트
    router.replace("/academy/my-classroom/ongoing");
  }, [router]);

  return null;
}
