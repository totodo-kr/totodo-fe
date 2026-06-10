"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";

export type MenuRow = {
  id: string;
  name: string;
  href: string;
  sort_order: number;
  is_visible: boolean;
};

export type SubMenuRow = {
  id: string;
  menu_id: string;
  name: string;
  href: string;
  position: "left" | "center" | "right";
  icon: string | null;
  sort_order: number;
  is_visible: boolean;
};

export type MenuData = {
  menus: MenuRow[];
  subMenus: SubMenuRow[];
  loading: boolean;
};

// DB 조회 실패 또는 로딩 전 폴백 (현재 하드코딩 값과 동일)
const FALLBACK_MENUS: MenuRow[] = [
  { id: "1", name: "홈",           href: "/",        sort_order: 0, is_visible: true },
  // { id: "2", name: "이세계 학원", href: "/academy", sort_order: 1, is_visible: true },
  // { id: "3", name: "상점",         href: "/shop",    sort_order: 2, is_visible: true },
  // { id: "4", name: "커뮤니티",    href: "/community", sort_order: 3, is_visible: true },
  // { id: "5", name: "자주 묻는 질문", href: "/faq",  sort_order: 4, is_visible: true },
];

const FALLBACK_SUB_MENUS: SubMenuRow[] = [
  { id: "s1", menu_id: "2", name: "홈",          href: "/academy",            position: "center", icon: null, sort_order: 0, is_visible: true },
  { id: "s2", menu_id: "2", name: "내 강의실",   href: "/academy/my-lectures",position: "center", icon: null, sort_order: 1, is_visible: true },
  { id: "s3", menu_id: "2", name: "나의 북마크", href: "/academy/bookmarks",  position: "center", icon: null, sort_order: 2, is_visible: true },
  { id: "s4", menu_id: "3", name: "홈",   href: "/shop",       position: "center", icon: null,            sort_order: 0, is_visible: true },
  { id: "s5", menu_id: "3", name: "도서", href: "/shop/books", position: "center", icon: null,            sort_order: 1, is_visible: true },
  { id: "s6", menu_id: "3", name: "잡화", href: "/shop/goods", position: "center", icon: null,            sort_order: 2, is_visible: true },
  { id: "s7", menu_id: "3", name: "위시리스트", href: "/shop/wishlist", position: "right", icon: "Heart",        sort_order: 0, is_visible: true },
  { id: "s8", menu_id: "3", name: "장바구니",   href: "/shop/cart",     position: "right", icon: "ShoppingCart", sort_order: 1, is_visible: true },
];

export function useMenus(): MenuData {
  const [menus, setMenus] = useState<MenuRow[]>(FALLBACK_MENUS);
  const [subMenus, setSubMenus] = useState<SubMenuRow[]>(FALLBACK_SUB_MENUS);
  const [loading, setLoading] = useState(true);
  const { isLoading: authLoading } = useAuthStore();

  useEffect(() => {
    // auth 초기화가 끝난 뒤에 fetch해야 RLS가 있어도 세션이 준비된 상태로 쿼리가 나감
    if (authLoading) return;

    const supabase = createClient();

    async function fetch() {
      const [{ data: menuData, error: menuError }, { data: subData, error: subError }] = await Promise.all([
        supabase
          .from("menus")
          .select("id, name, href, sort_order, is_visible")
          .eq("is_visible", true)
          .order("sort_order"),
        supabase
          .from("sub_menus")
          .select("id, menu_id, name, href, position, icon, sort_order, is_visible")
          .eq("is_visible", true)
          .order("sort_order"),
      ]);

      if (menuError) console.error("[useMenus] menus fetch error:", menuError);
      if (subError) console.error("[useMenus] sub_menus fetch error:", subError);

      if (menuData && menuData.length > 0) setMenus(menuData);
      if (subData) setSubMenus(subData);
      setLoading(false);
    }

    fetch();
  }, [authLoading]);

  return { menus, subMenus, loading };
}
