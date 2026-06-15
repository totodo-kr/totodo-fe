"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Receipt } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import SettingsLayout from "@/components/SettingsLayout";
import PageLoading from "@/components/PageLoading";
import { useMyOrders, MyOrderStatus } from "@/hooks/useMyOrders";

type TabDef = { id: MyOrderStatus; label: string };

const TABS: TabDef[] = [
  { id: "all", label: "전체" },
  { id: "pending", label: "결제대기" },
  { id: "paid", label: "결제완료" },
  { id: "shipped", label: "배송중" },
  { id: "delivered", label: "배송완료" },
  { id: "cancelled", label: "취소" },
];

const STATUS_LABELS: Record<string, string> = {
  pending: "결제대기",
  paid: "결제완료",
  shipped: "배송중",
  delivered: "배송완료",
  cancelled: "취소",
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: "#3d3d3a", text: "#c8c5bc" },
  paid: { bg: "#1a3a5c", text: "#7eb8f7" },
  shipped: { bg: "#2d1a5c", text: "#c084fc" },
  delivered: { bg: "#1a3d1a", text: "#6ee7b7" },
  cancelled: { bg: "#3d1a1a", text: "#f87171" },
};

function formatDate(s: string) {
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

const PAGE_SIZE = 10;

export default function PurchasesPage() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<MyOrderStatus>("all");
  const [page, setPage] = useState(1);

  const { orders, total, loading, fetchOrders } = useMyOrders();
  const totalPages = Math.ceil(total / PAGE_SIZE);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  const load = useCallback(
    (p: number, s: MyOrderStatus) => fetchOrders(p, s),
    [fetchOrders]
  );

  useEffect(() => {
    if (user) {
      load(1, "all");
    }
  }, [user, load]);

  const handleTabChange = (tab: MyOrderStatus) => {
    setActiveTab(tab);
    setPage(1);
    load(1, tab);
  };

  const handlePage = (p: number) => {
    setPage(p);
    load(p, activeTab);
  };

  if (isLoading) return <PageLoading variant="top" />;
  if (!user) return null;

  return (
    <SettingsLayout title="주문 내역">
      {/* 탭 */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`px-5 h-10 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-brand-500 text-white"
                : "bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="text-center py-20 text-gray-500">불러오는 중...</div>
      )}

      {/* 빈 상태 */}
      {!loading && orders.length === 0 && (
        <div className="bg-[#1a1a1a] rounded-2xl border border-white/5 min-h-[400px] flex items-center justify-center">
          <div className="text-center">
            <Receipt size={48} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">주문 내역이 없습니다.</p>
          </div>
        </div>
      )}

      {/* 주문 목록 */}
      {!loading && orders.length > 0 && (
        <div className="space-y-3">
          {orders.map((order) => {
            const statusColor = STATUS_COLORS[order.status] ?? STATUS_COLORS.pending;
            const canCancel = order.status === "pending" || order.status === "paid";
            const canRefund = order.status === "delivered" && !order.refund_status;

            return (
              <div
                key={order.id}
                className="bg-[#1a1a1a] rounded-xl border border-white/5 p-5"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="font-mono text-xs text-gray-500">
                      {order.order_number}
                    </span>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {formatDate(order.created_at)}
                    </p>
                  </div>
                  <span
                    className="text-xs px-2.5 py-1 rounded-full font-medium shrink-0"
                    style={{ background: statusColor.bg, color: statusColor.text }}
                  >
                    {STATUS_LABELS[order.status] ?? order.status}
                  </span>
                </div>

                <p className="text-white font-medium mb-1">
                  {order.first_item_name}
                  {order.item_count > 1 && (
                    <span className="text-gray-400 text-sm ml-1">
                      외 {order.item_count - 1}건
                    </span>
                  )}
                </p>
                <p className="text-brand-500 font-bold text-lg mb-4">
                  {order.final_price.toLocaleString()}원
                </p>

                <div className="flex gap-2 flex-wrap">
                  <Link
                    href={`/settings/purchases/${order.id}`}
                    className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
                  >
                    상세 보기
                  </Link>
                  {canCancel && (
                    <Link
                      href={`/settings/purchases/${order.id}/cancel`}
                      className="px-4 py-2 rounded-lg text-sm transition-colors"
                      style={{ background: "#3d1a1a", color: "#f87171" }}
                    >
                      취소 신청
                    </Link>
                  )}
                  {canRefund && (
                    <Link
                      href={`/settings/purchases/${order.id}/refund`}
                      className="px-4 py-2 rounded-lg text-sm transition-colors"
                      style={{ background: "#1a3a5c", color: "#7eb8f7" }}
                    >
                      환불 신청
                    </Link>
                  )}
                  {order.refund_status && (
                    <span
                      className="px-4 py-2 rounded-lg text-sm"
                      style={{ background: "#2d2a20", color: "#e8a55a" }}
                    >
                      환불 {order.refund_status === "requested" ? "신청됨" : order.refund_status === "processing" ? "처리중" : order.refund_status === "completed" ? "완료" : "거절됨"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => handlePage(p)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                page === p
                  ? "bg-brand-500 text-white"
                  : "bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </SettingsLayout>
  );
}
