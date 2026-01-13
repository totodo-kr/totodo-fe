"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { clsx } from "clsx";
import { Bell, User as UserIcon, Menu, X, Heart, ShoppingCart } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import LoginModal from "./LoginModal";

export default function MobileNavbar() {
  const pathname = usePathname();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user } = useAuthStore();

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

  const menuItems = [
    { name: "홈", href: "/" },
    { name: "이세계 학원", href: "/academy" },
    { name: "상점", href: "/shop" },
    { name: "강의 후기", href: "/reviews" },
    { name: "자주 묻는 질문", href: "/faq" },
  ];

  // 서브 메뉴 정의
  const subMenus: Record<string, { name: string; href: string }[]> = {
    "/academy": [
      { name: "홈", href: "/academy" },
      { name: "내 강의실", href: "/academy/my-classroom" },
      { name: "나의 북마크", href: "/academy/bookmarks" },
    ],
    "/shop": [
      { name: "홈", href: "/shop" },
      { name: "도서", href: "/shop/books" },
      { name: "잡화", href: "/shop/goods" },
    ],
  };

  // 현재 경로에 맞는 서브 메뉴 찾기
  const activeSubMenuKey = Object.keys(subMenus).find((key) => pathname.startsWith(key));
  const currentSubMenus = activeSubMenuKey ? subMenus[activeSubMenuKey] : null;

  // 상점 메뉴인지 확인
  const isShopMenu = activeSubMenuKey === "/shop";

  return (
    <>
      {/* 모바일 사이드바 오버레이 */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setIsSidebarOpen(false)}
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
            {menuItems.map((item) => {
              const isActive =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
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
          <div className="px-4 border-t border-white/10">
            {user ? (
              <Link
                href="/settings"
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden border border-white/10 flex items-center justify-center">
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
                <div className="flex flex-col">
                  <span className="text-white font-medium">
                    {user.user_metadata?.full_name ||
                      user.user_metadata?.name ||
                      user.email?.split("@")[0] ||
                      "사용자"}
                  </span>
                </div>
              </Link>
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

            {/* 중앙: 서브메뉴 (있으면 표시, 없으면 비워둠) */}
            <div className="flex items-center gap-3 flex-1 justify-center">
              {currentSubMenus?.map((subItem) => {
                const isSubActive =
                  subItem.href === activeSubMenuKey
                    ? pathname === subItem.href
                    : pathname.startsWith(subItem.href);
                return (
                  <Link
                    key={subItem.name}
                    href={subItem.href}
                    className={clsx(
                      "text-xs font-medium transition-colors",
                      isSubActive ? "text-brand-500 font-bold" : "text-gray-400 hover:text-white"
                    )}
                  >
                    {subItem.name}
                  </Link>
                );
              })}
            </div>

            {/* 오른쪽: 상점이면 하트/장바구니/햄버거, 일반이면 알림/프로필/햄버거 */}
            <div className="flex items-center gap-3 shrink-0">
              {isShopMenu ? (
                <>
                  <Link
                    href="/shop/wishlist"
                    className={clsx(
                      "transition-colors",
                      pathname === "/shop/wishlist"
                        ? "text-brand-500"
                        : "text-gray-400 hover:text-white"
                    )}
                    aria-label="위시리스트"
                  >
                    <Heart size={20} />
                  </Link>
                  <Link
                    href="/shop/cart"
                    className={clsx(
                      "transition-colors",
                      pathname === "/shop/cart"
                        ? "text-brand-500"
                        : "text-gray-400 hover:text-white"
                    )}
                    aria-label="장바구니"
                  >
                    <ShoppingCart size={20} />
                  </Link>
                </>
              ) : (
                <>
                  {user ? (
                    <>
                      <button className="text-gray-400 hover:text-white transition-colors">
                        <Bell size={20} />
                      </button>
                      <Link href="/settings">
                        <div className="w-8 h-8 rounded-full bg-gray-800 overflow-hidden border border-white/10 flex items-center justify-center cursor-pointer hover:border-brand-500 transition-colors">
                          {user.user_metadata?.avatar_url ? (
                            <img
                              src={user.user_metadata.avatar_url}
                              alt="Profile"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <UserIcon size={16} className="text-gray-400" />
                          )}
                        </div>
                      </Link>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="px-3 py-1.5 bg-white text-brand-500 rounded-lg font-bold text-xs hover:bg-gray-100 transition-colors"
                    >
                      시작하기
                    </button>
                  )}
                </>
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
