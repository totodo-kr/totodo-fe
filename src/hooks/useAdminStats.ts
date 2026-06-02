import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

export interface AdminStats {
  userCount: number;
  lectureCount: number;
  faqCount: number;
  orderCount: number;
  recentUsers: {
    id: string;
    name: string | null;
    display_name: string | null;
    role: string | null;
    created_at: string;
  }[];
  recentFaqs: {
    id: string;
    title: string;
    created_at: string;
  }[];
}

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const supabase = createClient();
      setLoading(true);

      const [
        { count: userCount },
        { count: lectureCount },
        { count: faqCount },
        { count: orderCount },
        { data: recentUsers },
        { data: recentFaqs },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("lectures").select("*", { count: "exact", head: true }),
        supabase.from("faq").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase
          .from("profiles")
          .select("id, name, display_name, role, created_at")
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("faq")
          .select("id, title, created_at")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

      setStats({
        userCount: userCount ?? 0,
        lectureCount: lectureCount ?? 0,
        faqCount: faqCount ?? 0,
        orderCount: orderCount ?? 0,
        recentUsers: recentUsers ?? [],
        recentFaqs: recentFaqs ?? [],
      });
      setLoading(false);
    }

    fetchStats();
  }, []);

  return { stats, loading };
}
