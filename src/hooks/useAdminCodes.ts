import { useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

export interface Code {
  id: number;
  group_code: string;
  code: string;
  label: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export const CODE_GROUPS = [
  { value: "DELIVERY_TYPE", label: "배송 타입" },
  { value: "BOOK_TYPE", label: "출판 형태" },
  { value: "PRINT_COLOR", label: "인쇄 컬러" },
  { value: "AGE_LIMIT", label: "연령 제한" },
] as const;

export function useAdminCodes() {
  const [codes, setCodes] = useState<Code[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingId, setPendingId] = useState<number | null>(null);

  const fetchCodes = useCallback(async (groupCode: string) => {
    const supabase = createClient();
    setLoading(true);
    const { data } = await supabase
      .from("codes")
      .select("*")
      .eq("group_code", groupCode)
      .order("sort_order")
      .order("id");
    setCodes((data as Code[]) ?? []);
    setLoading(false);
  }, []);

  const addCode = async (params: {
    group_code: string;
    code: string;
    label: string;
    sort_order: number;
    description?: string;
  }): Promise<{ ok: boolean; message?: string }> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("codes")
      .insert(params)
      .select()
      .single();
    if (error) return { ok: false, message: error.message };
    setCodes((prev) => [...prev, data as Code].sort((a, b) => a.sort_order - b.sort_order));
    return { ok: true };
  };

  const updateCode = async (
    id: number,
    updates: Partial<Pick<Code, "label" | "sort_order" | "description">>
  ): Promise<boolean> => {
    const supabase = createClient();
    setPendingId(id);
    const { error } = await supabase.from("codes").update(updates).eq("id", id);
    if (!error) {
      setCodes((prev) =>
        prev
          .map((c) => (c.id === id ? { ...c, ...updates } : c))
          .sort((a, b) => a.sort_order - b.sort_order)
      );
    }
    setPendingId(null);
    return !error;
  };

  const toggleActive = async (id: number, current: boolean): Promise<boolean> => {
    const supabase = createClient();
    setPendingId(id);
    const { error } = await supabase
      .from("codes")
      .update({ is_active: !current })
      .eq("id", id);
    if (!error) {
      setCodes((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_active: !current } : c))
      );
    }
    setPendingId(null);
    return !error;
  };

  const deleteCode = async (id: number): Promise<boolean> => {
    const supabase = createClient();
    const { error } = await supabase.from("codes").delete().eq("id", id);
    if (!error) {
      setCodes((prev) => prev.filter((c) => c.id !== id));
    }
    return !error;
  };

  return {
    codes,
    loading,
    pendingId,
    fetchCodes,
    addCode,
    updateCode,
    toggleActive,
    deleteCode,
  };
}
