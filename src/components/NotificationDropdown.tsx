"use client";

import { useEffect, useRef } from "react";
import { clsx } from "clsx";
import { Notification } from "@/hooks/useNotifications";

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffMonth / 12);

  if (diffSec < 60) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 30) return `${diffDay}일 전`;
  if (diffMonth < 12) return `${diffMonth}달 전`;
  return `${diffYear}년 전`;
}

interface Props {
  notifications: Notification[];
  loading: boolean;
  onClose: () => void;
  onMarkAllAsRead: () => void;
}

export default function NotificationDropdown({
  notifications,
  loading,
  onClose,
  onMarkAllAsRead,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-80 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#1a1a1a]">
        <span className="text-white font-semibold text-base">알림</span>
        {notifications.some((n) => !n.is_read) && (
          <button
            onClick={onMarkAllAsRead}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            모두 읽음
          </button>
        )}
      </div>

      {/* 알림 목록 */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500 text-sm">
            알림이 없습니다
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={clsx(
                "px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors",
                !notification.is_read && "bg-brand-500/5"
              )}
            >
              <div className="flex items-start gap-2">
                {!notification.is_read && (
                  <span className="mt-1.5 w-2 h-2 rounded-full bg-brand-500 shrink-0" />
                )}
                <div className={clsx("flex flex-col gap-0.5", notification.is_read && "pl-4")}>
                  <span className="text-white text-sm font-medium">{notification.title}</span>
                  <span className="text-gray-400 text-xs leading-relaxed">{notification.body}</span>
                  <span className="text-gray-600 text-xs mt-1">
                    {formatRelativeTime(notification.created_at)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
