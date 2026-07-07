import { useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

export type AdminProductQnaFilter = "all" | "pending" | "answered";

export interface AdminProductQna {
  id: number;
  product_id: number;
  user_id: string;
  title: string;
  content: string;
  is_private: boolean;
  answer: string | null;
  answered_at: string | null;
  created_at: string;
  profiles: {
    display_name: string | null;
    name: string | null;
  } | null;
}

const PAGE_SIZE = 15;

export function useAdminProductQna(productId: number | string) {
  const [qna, setQna] = useState<AdminProductQna[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pendingId, setPendingId] = useState<number | null>(null);

  const fetchQna = useCallback(
    async (page = 1, keyword = "", filter: AdminProductQnaFilter = "all") => {
      if (!productId) return;
      setLoading(true);
      const supabase = createClient();
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("product_qna")
        .select(
          "id, product_id, user_id, title, content, is_private, answer, answered_at, created_at",
          { count: "exact" }
        )
        .eq("product_id", productId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (filter === "pending") query = query.is("answer", null);
      if (filter === "answered") query = query.not("answer", "is", null);
      if (keyword.trim()) query = query.ilike("title", `%${keyword.trim()}%`);

      const { data, count } = await query;
      const rows = (data ?? []) as Omit<AdminProductQna, "profiles">[];

      const userIds = [...new Set(rows.map((r) => r.user_id))];
      let profileMap: Record<string, { display_name: string | null; name: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, display_name, name")
          .in("id", userIds);
        profileMap = Object.fromEntries(
          (profileData ?? []).map((p: { id: string; display_name: string | null; name: string | null }) => [
            p.id,
            { display_name: p.display_name, name: p.name },
          ])
        );
      }

      setQna(rows.map((r) => ({ ...r, profiles: profileMap[r.user_id] ?? null })));
      setTotal(count ?? 0);
      setLoading(false);
    },
    [productId]
  );

  const answerQna = async (qnaId: number, answerText: string): Promise<boolean> => {
    const supabase = createClient();
    setPendingId(qnaId);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("product_qna")
      .update({
        answer: answerText.trim(),
        answered_at: new Date().toISOString(),
        answered_by: user?.id ?? null,
      })
      .eq("id", qnaId);

    if (!error) {
      setQna((prev) =>
        prev.map((q) =>
          q.id === qnaId
            ? { ...q, answer: answerText.trim(), answered_at: new Date().toISOString() }
            : q
        )
      );
    }
    setPendingId(null);
    return !error;
  };

  const deleteQna = async (qnaId: number): Promise<boolean> => {
    const supabase = createClient();
    const { error } = await supabase.from("product_qna").delete().eq("id", qnaId);
    if (!error) {
      setQna((prev) => prev.filter((q) => q.id !== qnaId));
      setTotal((prev) => prev - 1);
    }
    return !error;
  };

  return { qna, total, loading, pendingId, fetchQna, answerQna, deleteQna };
}
