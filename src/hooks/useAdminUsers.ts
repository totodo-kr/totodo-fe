import { useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { Profile } from "@/hooks/useProfile";

export function useAdminUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchUsers = useCallback(async (page = 1, keyword = "") => {
    const supabase = createClient();
    setLoading(true);

    const pageSize = 15;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("profiles")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (keyword.trim()) {
      query = query.or(
        `name.ilike.%${keyword}%,display_name.ilike.%${keyword}%`
      );
    }

    const { data, count } = await query;
    setUsers(data ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  }, []);

  const updateRole = async (userId: string, role: "user" | "admin") => {
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", userId);

    if (!error) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role } : u))
      );
    }
    return !error;
  };

  return { users, loading, total, fetchUsers, updateRole };
}
