"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { clsx } from "clsx";
import {
  Bell,
  User as UserIcon,
  Heart,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import LoginModal from "./LoginModal";
import NotificationDropdown from "./NotificationDropdown";
import { useNotifications } from "@/hooks/useNotifications";
import { useMenus } from "@/hooks/useMenus";

// 서브메뉴 우측 아이콘 이름 → 컴포넌트 매핑
const ICON_MAP: Record<string, LucideIcon> = {
  Heart,
  ShoppingCart,
};

export default function Navbar() {
  const pathname = usePathname();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();
  const { notifications, loading: notifLoading, unreadCount, markAsRead, markAllAsRead } =
    useNotifications(user);
  const { menus, subMenus } = useMenus();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setIsNotificationOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsHidden(document.body.hasAttribute("data-hide-navbar"));
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-hide-navbar"] });
    return () => observer.disconnect();
  }, []);

  // 현재 경로에 해당하는 메인 메뉴 찾기
  const activeMenu = menus.find((m) =>
    m.href === "/" ? pathname === "/" : pathname.startsWith(m.href) && m.href !== "/"
  );

  // 해당 메뉴의 서브메뉴 (중앙/좌/우 분리)
  const menuSubMenus = activeMenu
    ? subMenus.filter((s) => s.menu_id === activeMenu.id)
    : [];
  const centerSubs = menuSubMenus.filter((s) => s.position === "center");
  const leftSubs   = menuSubMenus.filter((s) => s.position === "left");
  const rightSubs  = menuSubMenus.filter((s) => s.position === "right");
  const hasSubBar  = menuSubMenus.length > 0;

  return (
    <>
      <div
        className={clsx(
          "fixed top-0 left-0 right-0 z-30 flex flex-col transition-transform duration-300",
          isHidden && "-translate-y-full"
        )}
      >
        {/* 1단: 메인 네비게이션 */}
        <nav
          className={clsx(
            "bg-black backdrop-blur-md h-16 w-full",
            hasSubBar ? "border-b-0" : "border-b border-white/10"
          )}
        >
          <div className="max-w-[1600px] mx-auto px-4 h-full flex items-center justify-between">
            {/* Left: Logo */}
            <Link href="/" className="flex w-52 items-center">
              <span className="text-5xl font-bold text-brand-500 tracking-tight">TOTODO</span>
            </Link>

            {/* Center: Menu */}
            <div className="flex items-center gap-8">
              {menus.map((item) => {
                const isActive =
                  item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={clsx(
                      "text-lg font-medium transition-colors",
                      isActive ? "text-brand-500 font-bold" : "text-gray-400 hover:text-white"
                    )}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>

            {/* Right: Auth Status */}
            <div className="flex w-52 justify-end gap-4">
              {user ? (
                <>
                  <div ref={notificationRef} className="relative flex items-center">
                    <button
                      onClick={() => setIsNotificationOpen((prev) => !prev)}
                      className="relative text-gray-400 hover:text-white transition-colors"
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
                        loading={notifLoading}
                        onClose={() => setIsNotificationOpen(false)}
                        onMarkAsRead={markAsRead}
                        onMarkAllAsRead={markAllAsRead}
                      />
                    )}
                  </div>
                  <Link href="/settings">
                    <div className="w-9 h-9 rounded-full bg-gray-800 overflow-hidden border border-white/10 flex items-center justify-center cursor-pointer hover:border-brand-500 transition-colors">
                      {user.user_metadata?.avatar_url ? (
                        <img
                          src={user.user_metadata.avatar_url}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UserIcon size={18} className="text-gray-400" />
                      )}
                    </div>
                  </Link>
                </>
              ) : (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-5 py-2 bg-white text-brand-500 rounded-lg font-bold text-sm hover:bg-gray-100 transition-colors"
                >
                  시작하기
                </button>
              )}
            </div>
          </div>
        </nav>

        {/* 2단: 서브 탭 (서브메뉴가 있는 메뉴에서만 표시) */}
        {hasSubBar && (
          <div className="bg-black border-b border-white/10 h-12 w-full">
            <div className="flex mx-auto max-w-[1600px] px-4 h-full">
              {/* 좌측 */}
              <div className="flex items-center justify-start w-1/8 h-full gap-6">
                {leftSubs.map((sub) => (
                  <Link
                    key={sub.id}
                    href={sub.href}
                    className={clsx(
                      "h-full flex items-center text-sm font-medium border-b-2 transition-colors px-1",
                      pathname.startsWith(sub.href)
                        ? "text-brand-500 border-brand-500"
                        : "text-gray-400 border-transparent hover:text-white"
                    )}
                  >
                    {sub.name}
                  </Link>
                ))}
              </div>

              {/* 중앙 */}
              <div className="flex items-center justify-center w-6/8 h-full gap-6">
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
                        "h-full flex items-center text-sm font-medium border-b-2 transition-colors px-1",
                        isSubActive
                          ? "text-brand-500 border-brand-500"
                          : "text-gray-400 border-transparent hover:text-white"
                      )}
                    >
                      {sub.name}
                    </Link>
                  );
                })}
              </div>

              {/* 우측 */}
              <div className="flex items-center justify-end w-1/8 h-full gap-6">
                {rightSubs.map((sub) => {
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
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 컨텐츠 여백 확보 */}
      <div className={clsx("w-full", hasSubBar ? "h-28" : "h-16")} />

      <LoginModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
