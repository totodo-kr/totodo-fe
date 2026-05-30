"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MyLecturesPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/academy/my-lectures/ongoing");
  }, [router]);

  return null;
}
