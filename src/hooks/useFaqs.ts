import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";

export interface Faq {
  id: string;
  title: string;
  content: string;
  created_at: string;
  author_id: string | null;
  profiles: {
    display_name: string | null;
    name: string | null;
  } | null;
}

const ITEMS_PER_PAGE = 10;

export function useFaqs(initialPage: number = 1) {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(initialPage);
  const [keyword, setKeyword] = useState("");

  const supabase = useMemo(() => createClient(), []);

  const fetchFaqs = useCallback(async () => {
    setLoading(true);
    try {
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      const trimmed = keyword.trim();
      const hasKeyword = trimmed.length > 0;

      let query = supabase
        .from("faq")
        .select(
          `
          *,
          profiles:author_id (display_name, name)
        `,
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(from, to);

      if (hasKeyword) {
        query = query.ilike("title", `%${trimmed}%`);
      }

      const { data, count, error } = await query;

      if (error) throw error;

      setFaqs((data as Faq[]) || []);
      if (count !== null) {
        setTotalCount(count);
      }
    } catch (error) {
      console.error("Error fetching FAQs:", error);
    } finally {
      setLoading(false);
    }
  }, [keyword, page, supabase]);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  return {
    faqs,
    totalCount,
    loading,
    page,
    setPage,
    keyword,
    setKeyword,
    fetchFaqs,
    totalPages: Math.ceil(totalCount / ITEMS_PER_PAGE),
  };
}

