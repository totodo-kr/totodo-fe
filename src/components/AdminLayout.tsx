"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  ShoppingBag,
  ClipboardList,
  MessageSquare,
  HelpCircle,
  Bell,
  Code2,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LayoutTemplate,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/admin", label: "대시보드", icon: LayoutDashboard, phase: 1 },
  { href: "/admin/pages/home", label: "메인 페이지 편집", icon: LayoutTemplate, phase: 1 },
  { href: "/admin/users", label: "유저 관리", icon: Users, phase: 1 },
  { href: "/admin/academy/lectures", label: "강의 관리", icon: GraduationCap, phase: 2 },
  { href: "/admin/shop/products", label: "상품 관리", icon: ShoppingBag, phase: 3 },
  { href: "/admin/orders", label: "주문 관리", icon: ClipboardList, phase: 3 },
  { href: "/admin/reviews", label: "후기 관리", icon: MessageSquare, phase: 2 },
  { href: "/admin/faq", label: "FAQ 관리", icon: HelpCircle, phase: 2 },
  { href: "/admin/notifications", label: "알림 발송", icon: Bell, phase: 4 },
  { href: "/admin/codes", label: "코드 관리", icon: Code2, phase: 4 },
];

const activeItems = navItems;
const inactiveItems: typeof navItems = [];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/");
  };

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <div className="flex min-h-screen" style={{ background: "#faf9f5" }}>
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full flex flex-col z-40 transition-all duration-300 ${collapsed ? "w-16" : "w-60"}`}
        style={{ background: "#181715" }}
      >
        {/* 접기/펼치기 버튼 — 우측 모서리 수직 중앙 */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center z-50 border transition-colors"
          style={{ background: "#faf9f5", borderColor: "#e6dfd8", color: "#6c6a64" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "#efe9de";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#cc785c";
            (e.currentTarget as HTMLButtonElement).style.color = "#cc785c";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "#faf9f5";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#e6dfd8";
            (e.currentTarget as HTMLButtonElement).style.color = "#6c6a64";
          }}
          title={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </button>

        {/* Logo */}
        <div
          className="py-6 border-b flex items-center"
          style={{
            borderColor: "#2a2826",
            padding: collapsed ? "1.5rem 0" : "1.5rem 1.5rem",
            justifyContent: collapsed ? "center" : undefined,
          }}
        >
          <Link href="/admin" className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ background: "#cc785c" }}
            >
              T
            </div>
            {!collapsed && (
              <span className="font-semibold text-sm whitespace-nowrap" style={{ color: "#faf9f5" }}>
                TOTODO Admin
              </span>
            )}
          </Link>
        </div>

        {/* Nav */}
        <nav
          className="flex-1 py-4 overflow-y-auto"
          style={{ padding: collapsed ? "1rem 0.5rem" : "1rem 0.75rem" }}
        >
          <div className="mb-1">
            {activeItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className="flex items-center py-2.5 rounded-lg text-sm font-medium transition-all mb-0.5"
                style={{
                  ...(isActive(href)
                    ? { background: "#cc785c", color: "#ffffff" }
                    : { color: "#8e8b82" }),
                  gap: collapsed ? undefined : "0.75rem",
                  padding: collapsed ? "0.625rem 0" : "0.625rem 0.75rem",
                  justifyContent: collapsed ? "center" : undefined,
                }}
                onMouseEnter={(e) => {
                  if (!isActive(href)) {
                    (e.currentTarget as HTMLAnchorElement).style.color = "#faf9f5";
                    (e.currentTarget as HTMLAnchorElement).style.background = "#252320";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive(href)) {
                    (e.currentTarget as HTMLAnchorElement).style.color = "#8e8b82";
                    (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                  }
                }}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && label}
              </Link>
            ))}
          </div>

          {inactiveItems.length > 0 && (
            <div className="mt-4 pt-4 border-t" style={{ borderColor: "#2a2826" }}>
              {!collapsed && (
                <p
                  className="px-3 mb-2 text-xs font-medium uppercase tracking-widest"
                  style={{ color: "#3d3b37" }}
                >
                  준비 중
                </p>
              )}
              {inactiveItems.map(({ href, label, icon: Icon }) => (
                <div
                  key={href}
                  title={collapsed ? label : undefined}
                  className="flex items-center py-2.5 rounded-lg text-sm font-medium mb-0.5 cursor-not-allowed opacity-40"
                  style={{
                    color: "#6c6a64",
                    justifyContent: collapsed ? "center" : undefined,
                    padding: collapsed ? "0.625rem 0" : "0.625rem 0.75rem",
                    gap: collapsed ? undefined : "0.75rem",
                  }}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && label}
                </div>
              ))}
            </div>
          )}
        </nav>

        {/* Bottom: site link + sign out */}
        <div
          className="py-4 border-t"
          style={{
            borderColor: "#2a2826",
            padding: collapsed ? "1rem 0.5rem" : "1rem 0.75rem",
          }}
        >
          <Link
            href="/"
            title={collapsed ? "TOTODO 바로가기" : undefined}
            className="flex items-center py-2.5 rounded-lg text-sm font-medium w-full transition-all mb-0.5"
            style={{
              color: "#6c6a64",
              gap: collapsed ? undefined : "0.75rem",
              padding: collapsed ? "0.625rem 0" : "0.625rem 0.75rem",
              justifyContent: collapsed ? "center" : undefined,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = "#faf9f5";
              (e.currentTarget as HTMLAnchorElement).style.background = "#252320";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = "#6c6a64";
              (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
            }}
          >
            <ExternalLink className="w-4 h-4 flex-shrink-0" />
            {!collapsed && "TOTODO 바로가기"}
          </Link>
          <button
            onClick={handleSignOut}
            title={collapsed ? "로그아웃" : undefined}
            className="flex items-center py-2.5 rounded-lg text-sm font-medium w-full transition-all"
            style={{
              color: "#6c6a64",
              gap: collapsed ? undefined : "0.75rem",
              padding: collapsed ? "0.625rem 0" : "0.625rem 0.75rem",
              justifyContent: collapsed ? "center" : undefined,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "#faf9f5";
              (e.currentTarget as HTMLButtonElement).style.background = "#252320";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "#6c6a64";
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && "로그아웃"}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main
        className="flex-1 min-h-screen transition-all duration-300"
        style={{ background: "#faf9f5", marginLeft: collapsed ? "4rem" : "15rem" }}
      >
        {children}
      </main>
    </div>
  );
}
