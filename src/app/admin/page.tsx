"use client";

import Link from "next/link";
import { Users, GraduationCap, HelpCircle, ShoppingBag, ArrowRight } from "lucide-react";
import { useAdminStats } from "@/hooks/useAdminStats";

const kpiCards = [
  {
    label: "총 회원수",
    key: "userCount" as const,
    icon: Users,
    href: "/admin/users",
  },
  {
    label: "강의 수",
    key: "lectureCount" as const,
    icon: GraduationCap,
    href: "/admin/academy/lectures",
  },
  {
    label: "FAQ",
    key: "faqCount" as const,
    icon: HelpCircle,
    href: "/admin/faq",
  },
  {
    label: "총 주문",
    key: "orderCount" as const,
    icon: ShoppingBag,
    href: "/admin/orders",
  },
];

function formatDate(dateString: string) {
  const d = new Date(dateString);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function AdminDashboard() {
  const { stats, loading } = useAdminStats();

  return (
    <div className="p-8 max-w-6xl">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "#141413" }}>
          대시보드
        </h1>
        <p className="text-sm mt-1" style={{ color: "#6c6a64" }}>
          TOTODO 서비스 현황을 한눈에 확인하세요.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {kpiCards.map(({ label, key, icon: Icon, href }) => (
          <Link
            key={key}
            href={href}
            className="group rounded-xl p-5 border transition-all hover:shadow-sm"
            style={{ background: "#efe9de", borderColor: "#e6dfd8" }}
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: "#faf9f5" }}
              >
                <Icon className="w-4 h-4" style={{ color: "#cc785c" }} />
              </div>
              <ArrowRight
                className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: "#cc785c" }}
              />
            </div>
            <div
              className="text-3xl font-semibold mb-1"
              style={{ color: "#141413" }}
            >
              {loading ? (
                <span
                  className="inline-block w-12 h-7 rounded animate-pulse"
                  style={{ background: "#e6dfd8" }}
                />
              ) : (
                stats?.[key].toLocaleString() ?? "—"
              )}
            </div>
            <div className="text-sm" style={{ color: "#6c6a64" }}>
              {label}
            </div>
          </Link>
        ))}
      </div>

      {/* Recent tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: "#e6dfd8" }}
        >
          <div
            className="flex items-center justify-between px-5 py-4 border-b"
            style={{ background: "#efe9de", borderColor: "#e6dfd8" }}
          >
            <h2 className="text-sm font-semibold" style={{ color: "#141413" }}>
              최근 가입 회원
            </h2>
            <Link
              href="/admin/users"
              className="text-xs font-medium transition-colors"
              style={{ color: "#cc785c" }}
            >
              전체 보기 →
            </Link>
          </div>
          <div style={{ background: "#faf9f5" }}>
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div
                  className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: "#cc785c", borderTopColor: "transparent" }}
                />
              </div>
            ) : stats?.recentUsers.length === 0 ? (
              <p className="text-center py-8 text-sm" style={{ color: "#8e8b82" }}>
                회원이 없습니다.
              </p>
            ) : (
              stats?.recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between px-5 py-3 border-b last:border-b-0"
                  style={{ borderColor: "#e6dfd8" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                      style={{ background: "#efe9de", color: "#cc785c" }}
                    >
                      {(user.display_name || user.name || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "#252523" }}>
                        {user.display_name || user.name || "이름 없음"}
                      </p>
                      <p className="text-xs" style={{ color: "#8e8b82" }}>
                        {formatDate(user.created_at)}
                      </p>
                    </div>
                  </div>
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={
                      user.role === "admin"
                        ? { background: "#cc785c", color: "#fff" }
                        : { background: "#efe9de", color: "#6c6a64" }
                    }
                  >
                    {user.role === "admin" ? "관리자" : "일반"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent FAQs */}
        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: "#e6dfd8" }}
        >
          <div
            className="flex items-center justify-between px-5 py-4 border-b"
            style={{ background: "#efe9de", borderColor: "#e6dfd8" }}
          >
            <h2 className="text-sm font-semibold" style={{ color: "#141413" }}>
              최근 FAQ
            </h2>
            <Link
              href="/admin/faq"
              className="text-xs font-medium transition-colors"
              style={{ color: "#cc785c" }}
            >
              전체 보기 →
            </Link>
          </div>
          <div style={{ background: "#faf9f5" }}>
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div
                  className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: "#cc785c", borderTopColor: "transparent" }}
                />
              </div>
            ) : stats?.recentFaqs.length === 0 ? (
              <p className="text-center py-8 text-sm" style={{ color: "#8e8b82" }}>
                FAQ가 없습니다.
              </p>
            ) : (
              stats?.recentFaqs.map((faq) => (
                <Link
                  key={faq.id}
                  href={`/faq/${faq.id}`}
                  className="flex items-center justify-between px-5 py-3 border-b last:border-b-0 hover:bg-[#efe9de]/40 transition-colors"
                  style={{ borderColor: "#e6dfd8" }}
                >
                  <p
                    className="text-sm font-medium truncate flex-1 mr-4"
                    style={{ color: "#252523" }}
                  >
                    {faq.title}
                  </p>
                  <p className="text-xs flex-shrink-0" style={{ color: "#8e8b82" }}>
                    {formatDate(faq.created_at)}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
