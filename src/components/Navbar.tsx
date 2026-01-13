"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { clsx } from "clsx";
import { Bell, User as UserIcon, Menu, X } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import LoginModal from "./LoginModal";

export default function Navbar() {
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
  // 단순히 pathname과 일치하는 키를 찾는 것이 아니라, pathname이 키로 시작하는지 확인해야 함
  // 예: /academy/my-classroom 에서도 /academy 탭이 보여야 함
  const activeSubMenuKey = Object.keys(subMenus).find((key) => pathname.startsWith(key));
  const currentSubMenus = activeSubMenuKey ? subMenus[activeSubMenuKey] : null;

  return (
    <>
      {/* 모바일 사이드바 오버레이 */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 모바일 사이드바 */}
      <div
        className={clsx(
          "fixed top-0 left-0 h-full w-64 bg-black border-r border-white/10 z-50 transform transition-transform duration-300 md:hidden",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
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
                      ? "text-white bg-brand-500/10 border border-brand-500/20"
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
        {/* 1단: 메인 네비게이션 */}
        <nav
          className={clsx(
            "bg-black backdrop-blur-md h-16 w-full",
            currentSubMenus ? "border-b-0" : "border-b border-white/10"
          )}
        >
          <div className="max-w-[1600px] mx-auto px-4 h-full flex items-center justify-between">
            {/* 모바일: 햄버거 메뉴 + 로고 중앙 */}
            <div className="flex md:hidden items-center justify-between w-full">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <Menu size={24} />
              </button>
              <Link href="/" className="absolute left-1/2 transform -translate-x-1/2">
                <span className="text-3xl font-bold text-brand-500 tracking-tight">TOTODO</span>
              </Link>
              <div className="flex gap-3">
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
              </div>
            </div>

            {/* 데스크톱: 기존 레이아웃 */}
            <div className="hidden md:flex items-center justify-between w-full">
              {/* Left: Logo */}
              <Link href="/" className="flex w-52 items-center">
                <span className="text-5xl font-bold text-brand-500 tracking-tight">TOTODO</span>
              </Link>

              {/* Center: Menu */}
              <div className="flex items-center gap-8">
                {menuItems.map((item) => {
                  const isActive =
                    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={clsx(
                        "text-lg font-medium transition-colors",
                        isActive ? "text-white font-bold" : "text-gray-400 hover:text-white"
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
                    <button className="text-gray-400 hover:text-white transition-colors">
                      <Bell size={20} />
                    </button>
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
          </div>
        </nav>

        {/* 2단: 서브 탭 (조건부 렌더링) */}
        {currentSubMenus && (
          <div className="bg-black border-b border-white/10 h-12 w-full">
            <div className="flex mx-auto max-w-[1600px] px-4 h-full">
              <div className="flex items-center justify-start w-1/8 h-full gap-6">
                <div>1-1</div>
                <div>1-2</div>
              </div>
              <div className="flex items-center justify-center w-6/8 h-full gap-6">
                {currentSubMenus.map((subItem) => {
                  const isSubActive =
                    subItem.href === activeSubMenuKey
                      ? pathname === subItem.href
                      : pathname.startsWith(subItem.href);
                  return (
                    <Link
                      key={subItem.name}
                      href={subItem.href}
                      className={clsx(
                        "h-full flex items-center text-sm font-medium border-b-2 transition-colors px-1",
                        isSubActive
                          ? "text-white border-brand-500"
                          : "text-gray-400 border-transparent hover:text-white"
                      )}
                    >
                      {subItem.name}
                    </Link>
                  );
                })}
              </div>
              <div className="flex items-center justify-end w-1/8 h-full gap-6">
                <div>2-1</div>
                <div>2-2</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 컨텐츠 여백 확보: 2단 메뉴 유무에 따라 상단 여백 조절을 위해 body나 main에 pt를 동적으로 줘야 하지만, 
          간단하게 Navbar 컴포넌트 자체가 공간을 차지하지 않으므로(fixed), 
          페이지 레이아웃에서 pt를 조절하거나, 여기서 투명한 div로 공간을 밀어줄 수 있음.
          하지만 Next.js App Router 구조상 Navbar는 Layout에 있고 Page는 children으로 들어감.
          Layout에서 Navbar의 상태를 알기 어려우므로, 전역적인 padding 처리가 필요함.
          여기서는 간단하게, 2단 메뉴가 있을 때 추가적인 여백을 주는 방식보다는, 
          Navbar가 fixed이므로 메인 컨텐츠가 가려지지 않게 하는 것이 중요함.
          
          RootLayout의 pt-16은 1단 높이만큼임. 2단일 땐 더 내려와야 함.
          이를 해결하기 위해 CSS 변수나 Context를 쓸 수도 있지만, 
          가장 쉬운 방법은 Navbar 내부에 '공간 차지용 div'를 두거나, 
          Navbar가 fixed가 아닌 sticky 등을 사용하는 것임.
          하지만 요구사항의 '상단 고정'을 유지하려면 fixed가 적합함.
          
          여기서는 Navbar 아래에 높이만큼의 빈 div를 렌더링하여 컨텐츠가 밀리도록 처리.
      */}
      <div className={clsx("w-full", currentSubMenus ? "h-28" : "h-16")} />

      <LoginModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
