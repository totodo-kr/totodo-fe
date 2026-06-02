"use client";

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
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/admin", label: "대시보드", icon: LayoutDashboard, phase: 1 },
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
        className="fixed top-0 left-0 h-full w-60 flex flex-col z-40"
        style={{ background: "#181715" }}
      >
        {/* Logo */}
        <div className="px-6 py-6 border-b" style={{ borderColor: "#2a2826" }}>
          <Link href="/admin" className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center text-white font-bold text-sm"
              style={{ background: "#cc785c" }}
            >
              T
            </div>
            <span className="font-semibold text-sm" style={{ color: "#faf9f5" }}>
              TOTODO Admin
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {/* Phase 1 - active */}
          <div className="mb-1">
            {activeItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all mb-0.5"
                style={
                  isActive(href)
                    ? { background: "#cc785c", color: "#ffffff" }
                    : { color: "#8e8b82" }
                }
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
                {label}
              </Link>
            ))}
          </div>

          {/* Coming soon section - only rendered when there are inactive items */}
          {inactiveItems.length > 0 && (
            <div className="mt-4 pt-4 border-t" style={{ borderColor: "#2a2826" }}>
              <p className="px-3 mb-2 text-xs font-medium uppercase tracking-widest" style={{ color: "#3d3b37" }}>
                준비 중
              </p>
              {inactiveItems.map(({ href, label, icon: Icon }) => (
                <div
                  key={href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-0.5 cursor-not-allowed opacity-40"
                  style={{ color: "#6c6a64" }}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </div>
              ))}
            </div>
          )}
        </nav>

        {/* Bottom: sign out */}
        <div className="px-3 py-4 border-t" style={{ borderColor: "#2a2826" }}>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full transition-all"
            style={{ color: "#6c6a64" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "#faf9f5";
              (e.currentTarget as HTMLButtonElement).style.background = "#252320";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "#6c6a64";
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-60 min-h-screen" style={{ background: "#faf9f5" }}>
        {children}
      </main>
    </div>
  );
}
