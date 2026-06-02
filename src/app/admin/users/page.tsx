"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, ShieldCheck, User } from "lucide-react";
import { useAdminUsers } from "@/hooks/useAdminUsers";

const PAGE_SIZE = 15;

function formatDate(dateString: string) {
  const d = new Date(dateString);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function AdminUsersPage() {
  const { users, loading, total, fetchUsers, updateRole } = useAdminUsers();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const load = useCallback(
    (p: number, kw: string) => {
      fetchUsers(p, kw);
    },
    [fetchUsers]
  );

  useEffect(() => {
    load(1, "");
  }, [load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load(1, keyword);
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    load(p, keyword);
  };

  const handleRoleToggle = async (userId: string, currentRole: string | null) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    setPendingId(userId);
    await updateRole(userId, newRole as "user" | "admin");
    setPendingId(null);
  };

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "#141413" }}>
          유저 관리
        </h1>
        <p className="text-sm mt-1" style={{ color: "#6c6a64" }}>
          전체 회원 목록을 조회하고 역할을 변경할 수 있습니다.
        </p>
      </div>

      {/* Search + count */}
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-xs">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "#8e8b82" }}
          />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="이름 또는 닉네임 검색"
            className="w-full h-10 pl-9 pr-4 rounded-lg text-sm border outline-none transition-all"
            style={{
              background: "#efe9de",
              borderColor: "#e6dfd8",
              color: "#141413",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#cc785c")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#e6dfd8")}
          />
        </form>
        <span className="text-sm" style={{ color: "#6c6a64" }}>
          총{" "}
          <span className="font-semibold" style={{ color: "#141413" }}>
            {total.toLocaleString()}
          </span>
          명
        </span>
      </div>

      {/* Table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: "#e6dfd8" }}
      >
        {/* Table header */}
        <div
          className="grid grid-cols-[1fr_auto_auto_auto] items-center px-5 py-3 text-xs font-semibold uppercase tracking-wide border-b"
          style={{
            background: "#efe9de",
            color: "#6c6a64",
            borderColor: "#e6dfd8",
          }}
        >
          <span>회원</span>
          <span className="w-20 text-center">역할</span>
          <span className="w-28 text-center">가입일</span>
          <span className="w-24 text-center">역할 변경</span>
        </div>

        {/* Rows */}
        <div style={{ background: "#faf9f5" }}>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div
                className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: "#cc785c", borderTopColor: "transparent" }}
              />
            </div>
          ) : users.length === 0 ? (
            <p className="text-center py-12 text-sm" style={{ color: "#8e8b82" }}>
              검색 결과가 없습니다.
            </p>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center px-5 py-3.5 border-b last:border-b-0 transition-colors hover:bg-[#efe9de]/30"
                style={{ borderColor: "#e6dfd8" }}
              >
                {/* User info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                    style={{ background: "#efe9de", color: "#cc785c" }}
                  >
                    {(user.display_name || user.name || "?")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: "#252523" }}
                    >
                      {user.display_name || user.name || "이름 없음"}
                    </p>
                    {user.display_name && user.name && (
                      <p className="text-xs truncate" style={{ color: "#8e8b82" }}>
                        {user.name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Role badge */}
                <div className="w-20 flex justify-center">
                  <span
                    className="text-xs font-medium px-2.5 py-1 rounded-full"
                    style={
                      user.role === "admin"
                        ? { background: "#cc785c", color: "#fff" }
                        : { background: "#efe9de", color: "#6c6a64" }
                    }
                  >
                    {user.role === "admin" ? "관리자" : "일반"}
                  </span>
                </div>

                {/* Join date */}
                <div className="w-28 text-center">
                  <span className="text-sm" style={{ color: "#6c6a64" }}>
                    {formatDate(user.created_at)}
                  </span>
                </div>

                {/* Role toggle button */}
                <div className="w-24 flex justify-center">
                  <button
                    onClick={() => handleRoleToggle(user.id, user.role)}
                    disabled={pendingId === user.id}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all disabled:opacity-50"
                    style={
                      user.role === "admin"
                        ? {
                            borderColor: "#e6dfd8",
                            color: "#6c6a64",
                            background: "transparent",
                          }
                        : {
                            borderColor: "#cc785c",
                            color: "#cc785c",
                            background: "transparent",
                          }
                    }
                    onMouseEnter={(e) => {
                      if (pendingId !== user.id) {
                        (e.currentTarget as HTMLButtonElement).style.background =
                          user.role === "admin" ? "#efe9de" : "#cc785c20";
                      }
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    }}
                  >
                    {pendingId === user.id ? (
                      <div
                        className="w-3 h-3 border border-t-transparent rounded-full animate-spin"
                        style={{ borderColor: "currentColor", borderTopColor: "transparent" }}
                      />
                    ) : user.role === "admin" ? (
                      <>
                        <User className="w-3 h-3" />
                        일반으로
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3 h-3" />
                        관리자로
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-6">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30 transition-colors"
            style={{ color: "#6c6a64" }}
            onMouseEnter={(e) => {
              if (page !== 1)
                (e.currentTarget as HTMLButtonElement).style.background = "#efe9de";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => handlePageChange(p)}
              className="w-8 h-8 rounded-lg text-sm font-medium transition-all"
              style={
                p === page
                  ? { background: "#cc785c", color: "#fff" }
                  : { color: "#6c6a64", background: "transparent" }
              }
              onMouseEnter={(e) => {
                if (p !== page)
                  (e.currentTarget as HTMLButtonElement).style.background = "#efe9de";
              }}
              onMouseLeave={(e) => {
                if (p !== page)
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }}
            >
              {p}
            </button>
          ))}

          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages}
            className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30 transition-colors"
            style={{ color: "#6c6a64" }}
            onMouseEnter={(e) => {
              if (page !== totalPages)
                (e.currentTarget as HTMLButtonElement).style.background = "#efe9de";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
