"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  ShoppingBag,
  ClipboardList,
  HelpCircle,
  Bell,
  Code2,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  LayoutTemplate,
  Menu,
  List,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

type NavItem =
  | { kind: "link"; href: string; label: string; icon: React.ElementType }
  | {
      kind: "group";
      label: string;
      icon: React.ElementType;
      basePath: string;
      children: { href: string; label: string }[];
    };

const navItems: NavItem[] = [
  { kind: "link", href: "/admin", label: "대시보드", icon: LayoutDashboard },
  { kind: "link", href: "/admin/pages/home", label: "메인 페이지 편집", icon: LayoutTemplate },
  { kind: "link", href: "/admin/menus", label: "메뉴 관리", icon: Menu },
  { kind: "link", href: "/admin/users", label: "유저 관리", icon: Users },
  {
    kind: "group",
    label: "강의 관리",
    icon: GraduationCap,
    basePath: "/admin/academy",
    children: [
      { href: "/admin/academy/lectures", label: "강의 목록" },
    ],
  },
  { kind: "link", href: "/admin/shop/products", label: "상품 관리", icon: ShoppingBag },
  { kind: "link", href: "/admin/orders", label: "주문 관리", icon: ClipboardList },
  { kind: "link", href: "/admin/faq", label: "FAQ 관리", icon: HelpCircle },
  { kind: "link", href: "/admin/notifications", label: "알림 발송", icon: Bell },
  { kind: "link", href: "/admin/codes", label: "코드 관리", icon: Code2 },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--admin-sidebar-w",
      collapsed ? "4rem" : "15rem"
    );
  }, [collapsed]);
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    // 현재 경로가 속한 그룹을 초기 오픈 상태로
    const initial = new Set<string>();
    for (const item of navItems) {
      if (item.kind === "group" && pathname.startsWith(item.basePath)) {
        initial.add(item.basePath);
      }
    }
    return initial;
  });

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/");
  };

  const isLinkActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  const toggleGroup = (basePath: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(basePath)) next.delete(basePath);
      else next.add(basePath);
      return next;
    });
  };

  const linkStyle = (active: boolean) => ({
    ...(active ? { background: "#cc785c", color: "#ffffff" } : { color: "#8e8b82" }),
    gap: collapsed ? undefined : "0.75rem",
    padding: collapsed ? "0.625rem 0" : "0.625rem 0.75rem",
    justifyContent: collapsed ? ("center" as const) : undefined,
  });

  const labelClass = `whitespace-nowrap overflow-hidden transition-[max-width,opacity] duration-300 ${
    collapsed ? "max-w-0 opacity-0" : "max-w-[160px] opacity-100"
  }`;

  const hoverHandlers = (active: boolean) => ({
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      if (!active) {
        (e.currentTarget as HTMLElement).style.color = "#faf9f5";
        (e.currentTarget as HTMLElement).style.background = "#252320";
      }
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      if (!active) {
        (e.currentTarget as HTMLElement).style.color = "#8e8b82";
        (e.currentTarget as HTMLElement).style.background = "transparent";
      }
    },
  });

  return (
    <div className="flex min-h-screen" style={{ background: "#faf9f5" }}>
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full flex flex-col z-40 transition-all duration-300 ${collapsed ? "w-16" : "w-60"}`}
        style={{ background: "#181715" }}
      >
        {/* 접기/펼치기 버튼 */}
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
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
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
          <Link href="/admin" className="flex items-center" style={{ gap: collapsed ? undefined : "0.5rem" }}>
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ background: "#cc785c" }}
            >
              T
            </div>
            <span className={`font-semibold text-sm ${labelClass}`} style={{ color: "#faf9f5" }}>
              TOTODO Admin
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav
          className="flex-1 overflow-y-auto"
          style={{ padding: collapsed ? "1rem 0.5rem" : "1rem 0.75rem" }}
        >
          {navItems.map((item) => {
            if (item.kind === "link") {
              const active = isLinkActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className="flex items-center py-2.5 rounded-lg text-sm font-medium transition-all mb-0.5"
                  style={linkStyle(active)}
                  {...hoverHandlers(active)}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span className={labelClass}>{item.label}</span>
                </Link>
              );
            }

            // group
            const groupActive = pathname.startsWith(item.basePath);
            const isOpen = openGroups.has(item.basePath) || groupActive;

            return (
              <div key={item.basePath} className="mb-0.5">
                {/* 그룹 헤더 */}
                <button
                  onClick={() => !collapsed && toggleGroup(item.basePath)}
                  title={collapsed ? item.label : undefined}
                  className="flex items-center w-full py-2.5 rounded-lg text-sm font-medium transition-all"
                  style={{
                    ...(groupActive ? { color: "#cc785c" } : { color: "#8e8b82" }),
                    gap: collapsed ? undefined : "0.75rem",
                    padding: collapsed ? "0.625rem 0" : "0.625rem 0.75rem",
                    justifyContent: collapsed ? "center" : undefined,
                  }}
                  {...hoverHandlers(false)}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span className={`flex-1 text-left ${labelClass}`}>{item.label}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 shrink-0 transition-[transform,max-width,opacity] duration-300 ${isOpen ? "rotate-180" : ""} ${collapsed ? "max-w-0 opacity-0 overflow-hidden" : "max-w-[1rem] opacity-100"}`}
                  />
                </button>

                {/* 하위 메뉴 */}
                <div
                  className="overflow-hidden transition-[max-height,opacity] duration-300"
                  style={{
                    maxHeight: !collapsed && isOpen ? `${item.children.length * 40}px` : "0px",
                    opacity: !collapsed && isOpen ? 1 : 0,
                  }}
                >
                  <div className="mt-0.5 ml-4 pl-3 border-l" style={{ borderColor: "#2a2826" }}>
                    {item.children.map((child) => {
                      const childActive = pathname.startsWith(child.href);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="flex items-center gap-2 py-2 px-2.5 rounded-lg text-sm font-medium transition-all mb-0.5"
                          style={
                            childActive
                              ? { background: "#cc785c", color: "#fff" }
                              : { color: "#8e8b82" }
                          }
                          {...hoverHandlers(childActive)}
                        >
                          <List className="w-3.5 h-3.5 flex-shrink-0" />
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* Bottom: site link + sign out */}
        <div
          className="border-t"
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
            <span className={labelClass}>TOTODO 바로가기</span>
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
            <span className={labelClass}>로그아웃</span>
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
