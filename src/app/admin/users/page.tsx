"use client";

import { useEffect, useState, useCallback } from "react";
import { ShieldCheck, User } from "lucide-react";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { AdminPageHeader, AdminTable } from "@/components/admin/organisms";
import { SearchBar, ResultCount, Pagination, ToggleButton } from "@/components/admin/molecules";

const PAGE_SIZE = 15;

function formatDate(dateString: string) {
  const d = new Date(dateString);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

const COLUMNS = [
  { label: "회원" },
  { label: "역할", className: "w-20 text-center" },
  { label: "가입일", className: "w-28 text-center" },
  { label: "역할 변경", className: "w-24 text-center" },
];

export default function AdminUsersPage() {
  const { users, loading, total, fetchUsers, updateRole } = useAdminUsers();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const load = useCallback((p: number, kw: string) => fetchUsers(p, kw), [fetchUsers]);

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
      <AdminPageHeader
        title="유저 관리"
        description="전체 회원 목록을 조회하고 역할을 변경할 수 있습니다."
      />

      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <SearchBar
          value={keyword}
          onChange={setKeyword}
          onSubmit={handleSearch}
          placeholder="이름 또는 닉네임 검색"
        />
        <ResultCount total={total} unit="명" />
      </div>

      <AdminTable
        columns={COLUMNS}
        gridTemplateColumns="1fr auto auto auto"
        loading={loading}
        isEmpty={users.length === 0}
        emptyMessage="검색 결과가 없습니다."
      >
        {users.map((user) => (
          <div
            key={user.id}
            className="grid grid-cols-[1fr_auto_auto_auto] items-center px-5 py-3.5 border-b last:border-b-0 transition-colors hover:bg-[#efe9de]/30"
            style={{ borderColor: "#e6dfd8" }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                style={{ background: "#efe9de", color: "#cc785c" }}
              >
                {(user.display_name || user.name || "?")[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "#252523" }}>
                  {user.display_name || user.name || "이름 없음"}
                </p>
                {user.display_name && user.name && (
                  <p className="text-xs truncate" style={{ color: "#8e8b82" }}>
                    {user.name}
                  </p>
                )}
              </div>
            </div>

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

            <div className="w-28 text-center">
              <span className="text-sm" style={{ color: "#6c6a64" }}>
                {formatDate(user.created_at)}
              </span>
            </div>

            <div className="w-24 flex justify-center">
              <ToggleButton
                active={user.role !== "admin"}
                pending={pendingId === user.id}
                activeColor="#cc785c"
                activeLabel={<><ShieldCheck className="w-3 h-3" />관리자로</>}
                inactiveLabel={<><User className="w-3 h-3" />일반으로</>}
                onClick={() => handleRoleToggle(user.id, user.role)}
              />
            </div>
          </div>
        ))}
      </AdminTable>

      <Pagination
        page={page}
        totalPages={totalPages}
        loading={loading}
        onChange={handlePageChange}
      />
    </div>
  );
}
