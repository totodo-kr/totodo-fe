"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X, Send, Users, User, CheckCircle, AlertCircle } from "lucide-react";
import { useAdminNotifications, NotificationTarget } from "@/hooks/useAdminNotifications";
import { Spinner } from "@/components/admin/atoms";

type TargetMode = "all" | "specific";

interface SendResult {
  type: "success" | "error";
  message: string;
}

export default function AdminNotificationsPage() {
  const { searchResults, searching, sending, searchUsers, sendToUsers, sendToAll } =
    useAdminNotifications();

  const [targetMode, setTargetMode] = useState<TargetMode>("all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [keyword, setKeyword] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<NotificationTarget[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 검색어 디바운스
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (keyword.trim()) {
      debounceRef.current = setTimeout(() => {
        searchUsers(keyword);
        setShowDropdown(true);
      }, 300);
    } else {
      setShowDropdown(false);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [keyword, searchUsers]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const addUser = (user: NotificationTarget) => {
    if (!selectedUsers.find((u) => u.id === user.id)) {
      setSelectedUsers((prev) => [...prev, user]);
    }
    setKeyword("");
    setShowDropdown(false);
  };

  const removeUser = (id: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const getUserLabel = (u: NotificationTarget) =>
    u.display_name || u.name || "이름 없음";

  const canSend =
    title.trim() &&
    body.trim() &&
    (targetMode === "all" || selectedUsers.length > 0);

  const handleSend = async () => {
    if (!canSend || sending) return;

    setResult(null);
    const confirmed = confirm(
      targetMode === "all"
        ? `전체 유저에게 알림을 발송하시겠습니까?\n제목: ${title}`
        : `${selectedUsers.length}명에게 알림을 발송하시겠습니까?\n제목: ${title}`
    );
    if (!confirmed) return;

    const res =
      targetMode === "all"
        ? await sendToAll(title, body)
        : await sendToUsers(selectedUsers.map((u) => u.id), title, body);

    if (res.failed === 0) {
      setResult({ type: "success", message: `${res.success}명에게 알림을 발송했습니다.` });
      setTitle("");
      setBody("");
      setSelectedUsers([]);
    } else {
      setResult({
        type: "error",
        message: `발송 완료: ${res.success}명 성공, ${res.failed}명 실패`,
      });
    }
  };

  return (
    <div className="p-8 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "#141413" }}>
          알림 발송
        </h1>
        <p className="text-sm mt-1" style={{ color: "#6c6a64" }}>
          전체 또는 특정 유저에게 앱 알림을 발송합니다.
        </p>
      </div>

      <div
        className="rounded-xl border p-6"
        style={{ background: "#faf9f5", borderColor: "#e6dfd8" }}
      >
        {/* 발송 결과 */}
        {result && (
          <div
            className="flex items-center gap-3 p-4 rounded-lg mb-6 text-sm font-medium"
            style={
              result.type === "success"
                ? { background: "#e8f4e8", color: "#2d7d32" }
                : { background: "#fdecea", color: "#c62828" }
            }
          >
            {result.type === "success" ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            {result.message}
            <button
              onClick={() => setResult(null)}
              className="ml-auto opacity-60 hover:opacity-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 발송 대상 토글 */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-3" style={{ color: "#141413" }}>
            발송 대상
          </label>
          <div className="flex gap-3">
            {(["all", "specific"] as TargetMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setTargetMode(mode);
                  setSelectedUsers([]);
                  setKeyword("");
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all"
                style={
                  targetMode === mode
                    ? { background: "#cc785c", color: "#fff", borderColor: "#cc785c" }
                    : { background: "#efe9de", color: "#6c6a64", borderColor: "#e6dfd8" }
                }
              >
                {mode === "all" ? (
                  <>
                    <Users className="w-4 h-4" />
                    전체 발송
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4" />
                    특정 유저
                  </>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 특정 유저 검색 */}
        {targetMode === "specific" && (
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2" style={{ color: "#141413" }}>
              유저 선택
            </label>

            {/* 선택된 유저 칩 */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedUsers.map((u) => (
                  <span
                    key={u.id}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
                    style={{ background: "#efe9de", color: "#3d3d3a" }}
                  >
                    {getUserLabel(u)}
                    <button
                      onClick={() => removeUser(u.id)}
                      className="hover:opacity-70 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* 유저 검색 인풋 */}
            <div ref={searchRef} className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: "#8e8b82" }}
              />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="이름 또는 닉네임으로 검색"
                className="w-full h-10 pl-9 pr-4 rounded-lg text-sm border outline-none"
                style={{ background: "#efe9de", borderColor: "#e6dfd8", color: "#141413" }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#cc785c";
                  if (keyword.trim()) setShowDropdown(true);
                }}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#e6dfd8")}
              />

              {/* 검색 드롭다운 */}
              {showDropdown && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 rounded-lg border shadow-lg z-20 overflow-hidden"
                  style={{ background: "#faf9f5", borderColor: "#e6dfd8" }}
                >
                  {searching ? (
                    <div className="flex items-center justify-center py-4">
                      <Spinner size="sm" />
                    </div>
                  ) : searchResults.length === 0 ? (
                    <p className="text-sm text-center py-4" style={{ color: "#8e8b82" }}>
                      검색 결과가 없습니다.
                    </p>
                  ) : (
                    searchResults.map((user) => {
                      const already = !!selectedUsers.find((u) => u.id === user.id);
                      return (
                        <button
                          key={user.id}
                          onClick={() => !already && addUser(user)}
                          disabled={already}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left transition-colors disabled:opacity-40"
                          style={{ color: "#252523" }}
                          onMouseEnter={(e) => {
                            if (!already)
                              (e.currentTarget as HTMLButtonElement).style.background = "#efe9de";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                          }}
                        >
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                            style={{ background: "#efe9de", color: "#cc785c" }}
                          >
                            {getUserLabel(user)[0].toUpperCase()}
                          </div>
                          <span>{getUserLabel(user)}</span>
                          {already && (
                            <span className="ml-auto text-xs" style={{ color: "#8e8b82" }}>
                              선택됨
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {selectedUsers.length > 0 && (
              <p className="text-xs mt-2" style={{ color: "#8e8b82" }}>
                {selectedUsers.length}명 선택됨
              </p>
            )}
          </div>
        )}

        {/* 제목 */}
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2" style={{ color: "#141413" }}>
            알림 제목
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            placeholder="알림 제목을 입력하세요"
            className="w-full h-10 px-4 rounded-lg text-sm border outline-none"
            style={{ background: "#efe9de", borderColor: "#e6dfd8", color: "#141413" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#cc785c")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#e6dfd8")}
          />
          <p className="text-xs mt-1 text-right" style={{ color: "#8e8b82" }}>
            {title.length}/100
          </p>
        </div>

        {/* 내용 */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2" style={{ color: "#141413" }}>
            알림 내용
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder="알림 내용을 입력하세요"
            className="w-full px-4 py-3 rounded-lg text-sm border outline-none resize-none"
            style={{ background: "#efe9de", borderColor: "#e6dfd8", color: "#141413" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#cc785c")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#e6dfd8")}
          />
          <p className="text-xs mt-1 text-right" style={{ color: "#8e8b82" }}>
            {body.length}/500
          </p>
        </div>

        {/* 발송 버튼 */}
        <button
          onClick={handleSend}
          disabled={!canSend || sending}
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "#cc785c", color: "#fff" }}
          onMouseEnter={(e) => {
            if (canSend && !sending)
              (e.currentTarget as HTMLButtonElement).style.background = "#a9583e";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "#cc785c";
          }}
        >
          {sending ? (
            <>
              <Spinner size="sm" color="#fff" />
              발송 중...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              {targetMode === "all"
                ? "전체 발송"
                : `${selectedUsers.length}명에게 발송`}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
