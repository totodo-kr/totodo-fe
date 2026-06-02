import { useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

export interface NotificationTarget {
  id: string;
  name: string | null;
  display_name: string | null;
}

export function useAdminNotifications() {
  const [searchResults, setSearchResults] = useState<NotificationTarget[]>([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);

  const searchUsers = useCallback(async (keyword: string) => {
    if (!keyword.trim()) {
      setSearchResults([]);
      return;
    }
    const supabase = createClient();
    setSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, name, display_name")
      .or(`name.ilike.%${keyword.trim()}%,display_name.ilike.%${keyword.trim()}%`)
      .limit(20);
    setSearchResults((data as NotificationTarget[]) ?? []);
    setSearching(false);
  }, []);

  /** 특정 유저 목록에게 알림 발송 */
  const sendToUsers = async (
    userIds: string[],
    title: string,
    body: string
  ): Promise<{ success: number; failed: number }> => {
    const supabase = createClient();
    setSending(true);

    const rows = userIds.map((uid) => ({ user_id: uid, title, body }));

    // Supabase 한 번에 최대 500행 → 배치 처리
    const BATCH = 500;
    let success = 0;
    let failed = 0;

    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const { error } = await supabase.from("notifications").insert(batch);
      if (error) failed += batch.length;
      else success += batch.length;
    }

    setSending(false);
    return { success, failed };
  };

  /** 전체 유저에게 알림 발송 */
  const sendToAll = async (
    title: string,
    body: string
  ): Promise<{ success: number; failed: number }> => {
    const supabase = createClient();
    setSending(true);

    // 전체 유저 ID 수집
    const { data: profiles } = await supabase.from("profiles").select("id");
    const userIds = (profiles ?? []).map((p: { id: string }) => p.id);

    setSending(false);
    return sendToUsers(userIds, title, body);
  };

  return {
    searchResults,
    searching,
    sending,
    searchUsers,
    sendToUsers,
    sendToAll,
  };
}
