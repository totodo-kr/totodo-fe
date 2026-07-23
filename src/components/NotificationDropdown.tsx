"use client";

import { clsx } from "clsx";
import { Notification } from "@/hooks/useNotifications";
import { Spinner } from "@/components/ui/atoms";

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
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  placement?: "bottom" | "top";
}

export default function NotificationDropdown({
  notifications,
  loading,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
  placement = "bottom",
}: Props) {
  return (
    <div
      className={clsx(
        "absolute right-0 w-80 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50",
        placement === "bottom" ? "top-full mt-2" : "bottom-full mb-2"
      )}
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
            <Spinner size="md" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500 text-sm">
            알림이 없습니다
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => !notification.is_read && onMarkAsRead(notification.id)}
              className={clsx(
                "px-4 py-3 border-b border-white/5 transition-colors",
                !notification.is_read
                  ? "bg-brand-500/5 hover:bg-brand-500/10 cursor-pointer"
                  : "hover:bg-white/5"
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
