"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { clsx } from "clsx";
import { Bell, User as UserIcon, Menu, X, Heart, ShoppingCart, type LucideIcon } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import LoginModal from "./LoginModal";
import NotificationDropdown from "./NotificationDropdown";
import { useNotifications } from "@/hooks/useNotifications";
import { useMenus } from "@/hooks/useMenus";

const ICON_MAP: Record<string, LucideIcon> = { Heart, ShoppingCart };

export default function MobileNavbar() {
  const pathname = usePathname();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();
  const { notifications, loading, unreadCount, markAsRead, markAllAsRead } = useNotifications(user);
  const { menus, subMenus } = useMenus();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setIsNotificationOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // 사이드바 닫힐 때 알림도 닫기
  useEffect(() => {
    if (!isSidebarOpen) setIsNotificationOpen(false);
  }, [isSidebarOpen]);

  // Listen for data-hide-navbar attribute changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsHidden(document.body.hasAttribute("data-hide-navbar"));
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-hide-navbar"],
    });

    return () => observer.disconnect();
  }, []);

  // 사이드바 열릴 때 배경 스크롤 막기
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isSidebarOpen]);

  // 현재 경로에 해당하는 메인 메뉴
  const activeMenu = menus.find((m) =>
    m.href === "/" ? pathname === "/" : pathname.startsWith(m.href) && m.href !== "/"
  );
  const menuSubMenus = activeMenu ? subMenus.filter((s) => s.menu_id === activeMenu.id) : [];
  const centerSubs = menuSubMenus.filter((s) => s.position === "center");
  const rightSubs  = menuSubMenus.filter((s) => s.position === "right");

  return (
    <>
      {/* 모바일 사이드바 오버레이 */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => { setIsSidebarOpen(false); setIsNotificationOpen(false); }}
        />
      )}

      {/* 모바일 사이드바 */}
      <div
        className={clsx(
          "fixed top-0 right-0 h-full w-64 bg-black border-l border-white/10 z-50 transform transition-transform duration-300",
          isSidebarOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* 사이드바 헤더 */}
          <div className="flex items-center justify-between px-4 h-16 border-b border-white/10">
            <span className="text-2xl font-bold text-brand-500">TOTODO</span>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* 사이드바 메뉴 */}
          <nav className="flex-1 px-4 py-6 overflow-y-auto">
            {menus.map((item) => {
              const isActive =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={clsx(
                    "block py-3 px-4 rounded-lg text-base font-medium transition-colors mb-2",
                    isActive
                      ? "text-brand-500 bg-brand-500/10 border border-brand-500/20"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* 사이드바 하단 (로그인/프로필) */}
          <div className="px-4 py-2 border-t border-white/10">
            {user ? (
              <div className="flex items-center gap-1 p-1">
                <Link
                  href="/settings"
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-3 flex-1 min-w-0 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden border border-white/10 flex items-center justify-center shrink-0">
                    {user.user_metadata?.avatar_url ? (
                      <img
                        src={user.user_metadata.avatar_url}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserIcon size={20} className="text-gray-400" />
                    )}
                  </div>
                  <span className="text-white font-medium truncate">
                    {user.user_metadata?.full_name ||
                      user.user_metadata?.name ||
                      user.email?.split("@")[0] ||
                      "사용자"}
                  </span>
                </Link>
                <div ref={notificationRef} className="relative flex items-center shrink-0">
                  <button
                    onClick={() => setIsNotificationOpen((prev) => !prev)}
                    className="relative text-gray-400 hover:text-white hover:bg-white/5 transition-colors p-2 rounded-lg"
                  >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>
                  {isNotificationOpen && (
                    <NotificationDropdown
                      notifications={notifications}
                      loading={loading}
                      placement="top"
                      onClose={() => setIsNotificationOpen(false)}
                      onMarkAsRead={markAsRead}
                      onMarkAllAsRead={markAllAsRead}
                    />
                  )}
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setIsSidebarOpen(false);
                  setIsModalOpen(true);
                }}
                className="w-full px-5 py-3 bg-white text-brand-500 rounded-lg font-bold text-sm hover:bg-gray-100 transition-colors"
              >
                시작하기
              </button>
            )}
          </div>
        </div>
      </div>

      <div
        className={clsx(
          "fixed top-0 left-0 right-0 z-30 flex flex-col transition-transform duration-300",
          isHidden && "-translate-y-full"
        )}
      >
        {/* 메인 네비게이션 */}
        <nav className="bg-black backdrop-blur-md h-16 w-full border-b border-white/10">
          <div className="max-w-[1600px] mx-auto px-4 h-full flex items-center justify-between">
            {/* 왼쪽: TOTODO 로고 */}
            <Link href="/" className="shrink-0">
              <span className="text-2xl font-bold text-brand-500 tracking-tight">TOTODO</span>
            </Link>

            {/* 중앙: 서브메뉴 */}
            <div className="flex items-center gap-3 flex-1 justify-center">
              {centerSubs.map((sub) => {
                const isSubActive =
                  sub.href === activeMenu?.href
                    ? pathname === sub.href
                    : pathname.startsWith(sub.href);
                return (
                  <Link
                    key={sub.id}
                    href={sub.href}
                    className={clsx(
                      "text-xs font-medium transition-colors",
                      isSubActive ? "text-brand-500 font-bold" : "text-gray-400 hover:text-white"
                    )}
                  >
                    {sub.name}
                  </Link>
                );
              })}
            </div>

            {/* 오른쪽: 우측 서브메뉴 아이콘 or 시작하기 버튼 */}
            <div className="flex items-center gap-3 shrink-0">
              {rightSubs.length > 0 ? (
                rightSubs.map((sub) => {
                  const IconComponent = sub.icon ? ICON_MAP[sub.icon] : null;
                  return (
                    <Link
                      key={sub.id}
                      href={sub.href}
                      className={clsx(
                        "transition-colors",
                        pathname === sub.href ? "text-brand-500" : "text-gray-400 hover:text-white"
                      )}
                      aria-label={sub.name}
                    >
                      {IconComponent ? <IconComponent size={20} /> : sub.name}
                    </Link>
                  );
                })
              ) : (
                !user && (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-3 py-1.5 bg-white text-brand-500 rounded-lg font-bold text-xs hover:bg-gray-100 transition-colors"
                  >
                    시작하기
                  </button>
                )
              )}
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <Menu size={24} />
              </button>
            </div>
          </div>
        </nav>
      </div>

      {/* 컨텐츠 여백 확보 */}
      <div className="w-full h-16" />

      <LoginModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
