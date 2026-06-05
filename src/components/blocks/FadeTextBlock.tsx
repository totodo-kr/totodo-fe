"use client";

import { useEffect, useRef, useState } from "react";
import type { FadeTextBlockData } from "@/types/blocks";

export default function FadeTextBlock({ data }: { data: FadeTextBlockData }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const timeout = setTimeout(() => setVisible(true), data.delay ?? 0);
          observer.disconnect();
          return () => clearTimeout(timeout);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [data.delay]);

  return (
    <div
      ref={ref}
      className="prose prose-invert max-w-none transition-all duration-700"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
      }}
      dangerouslySetInnerHTML={{ __html: data.content }}
    />
  );
}
