"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { Receipt } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import SettingsLayout from "@/components/SettingsLayout";
import PageLoading from "@/components/PageLoading";
import { useMyOrders, type MyOrder, type MyOrderStatus } from "@/hooks/useMyOrders";

/* ─── helpers ─────────────────────────────────────────────── */

function formatPrice(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

const STATUS_LABEL: Record<string, string> = {
  pending: "결제대기",
  paid: "결제완료",
  shipped: "배송중",
  delivered: "배송완료",
  cancelled: "취소",
};

const STATUS_CLASS: Record<string, string> = {
  pending: "bg-gray-600 text-gray-200",
  paid: "bg-blue-600 text-blue-100",
  shipped: "bg-purple-600 text-purple-100",
  delivered: "bg-green-600 text-green-100",
  cancelled: "bg-red-600 text-red-100",
};

const REFUND_STATUS_LABEL: Record<string, string> = {
  requested: "환불 신청됨",
  processing: "환불 처리중",
  completed: "환불 완료",
  rejected: "환불 거절",
};

/* ─── tab config ───────────────────────────────────────────── */

const TABS: { id: MyOrderStatus; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "pending", label: "결제대기" },
  { id: "paid", label: "결제완료" },
  { id: "shipped", label: "배송중" },
  { id: "delivered", label: "배송완료" },
  { id: "cancelled", label: "취소" },
];

const PAGE_SIZE = 10;

/* ─── order card ───────────────────────────────────────────── */

function OrderCard({ order }: { order: MyOrder }) {
  const itemLabel =
    (order.item_count ?? 0) > 1
      ? `${order.first_item_name} 외 ${(order.item_count ?? 1) - 1}건`
      : order.first_item_name ?? "상품 없음";

  const badgeClass = STATUS_CLASS[order.status] ?? "bg-gray-600 text-gray-200";
  const statusLabel = STATUS_LABEL[order.status] ?? order.status;

  const canCancel = order.status === "pending" || order.status === "paid";
  const canRefund = order.status === "delivered" && !order.refund_status;

  return (
    <div className="bg-[#1a1a1a] rounded-xl border border-white/5 p-5 hover:border-white/10 transition-colors">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="font-mono text-sm text-gray-400 mb-1">{order.order_number}</p>
          <p className="text-white font-medium leading-snug">{itemLabel}</p>
          <p className="text-gray-500 text-sm mt-1">{formatDate(order.created_at)}</p>
        </div>
        <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${badgeClass}`}>
          {statusLabel}
        </span>
      </div>

      <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-3">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold">{formatPrice(order.final_price)}</span>
          {order.refund_status && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/50 text-yellow-400">
              {REFUND_STATUS_LABEL[order.refund_status] ?? order.refund_status}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canCancel && (
            <Link
              href={`/settings/purchases/${order.id}/cancel`}
              className="text-xs px-3 py-1.5 rounded-lg bg-[#2a2a2a] text-gray-400 hover:bg-[#333] hover:text-white transition-colors"
            >
              취소 신청
            </Link>
          )}
          {canRefund && (
            <Link
              href={`/settings/purchases/${order.id}/refund`}
              className="text-xs px-3 py-1.5 rounded-lg bg-[#2a2a2a] text-gray-400 hover:bg-[#333] hover:text-white transition-colors"
            >
              환불 신청
            </Link>
          )}
          <Link
            href={`/settings/purchases/${order.id}`}
            className="text-xs px-3 py-1.5 rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors"
          >
            상세 보기
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── pagination ───────────────────────────────────────────── */

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex justify-center items-center gap-1 mt-6">
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="px-3 py-1.5 rounded-lg bg-[#1a1a1a] text-gray-400 disabled:opacity-40 hover:bg-[#2a2a2a] transition-colors text-sm"
      >
        이전
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`w-8 h-8 rounded-lg text-sm transition-colors ${
            p === page
              ? "bg-brand-500 text-white"
              : "bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a]"
          }`}
        >
          {p}
        </button>
      ))}
      <button
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="px-3 py-1.5 rounded-lg bg-[#1a1a1a] text-gray-400 disabled:opacity-40 hover:bg-[#2a2a2a] transition-colors text-sm"
      >
        다음
      </button>
    </div>
  );
}

/* ─── page ─────────────────────────────────────────────────── */

export default function PurchasesPage() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();
  const { fetchOrders } = useMyOrders();

  const [activeTab, setActiveTab] = useState<MyOrderStatus>("all");
  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [fetching, setFetching] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  const load = useCallback(
    async (p: number, status: MyOrderStatus) => {
      setFetching(true);
      try {
        const result = await fetchOrders(p, status);
        setOrders(result.orders);
        setTotal(result.total);
      } finally {
        setFetching(false);
      }
    },
    [fetchOrders]
  );

  useEffect(() => {
    if (user) {
      load(page, activeTab);
    }
  }, [user, page, activeTab, load]);

  const handleTabChange = (tab: MyOrderStatus) => {
    setActiveTab(tab);
    setPage(1);
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (isLoading) return <PageLoading variant="top" />;
  if (!user) return null;

  return (
    <SettingsLayout title="주문 내역">
      {/* 탭 */}
      <div className="flex flex-wrap gap-2 mb-6">
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

      {/* 주문 목록 */}
      {fetching ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent" />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-[#1a1a1a] rounded-2xl border border-white/5 min-h-[400px] flex items-center justify-center">
          <div className="text-center">
            <Receipt size={48} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">주문 내역이 없습니다.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} />
    </SettingsLayout>
  );
}
