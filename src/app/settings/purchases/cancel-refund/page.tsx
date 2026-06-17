"use client";

import { useAuthStore } from "@/store/useAuthStore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import SettingsLayout from "@/components/SettingsLayout";
import PageLoading from "@/components/PageLoading";
import { useMyOrders, type MyOrder } from "@/hooks/useMyOrders";

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

function getBadge(order: MyOrder): { label: string; cls: string } {
  if (order.refund_status === "requested") return { label: "환불 신청", cls: "bg-orange-600 text-orange-100" };
  if (order.refund_status === "completed") return { label: "환불 완료", cls: "bg-blue-600 text-blue-100" };
  if (order.refund_status === "rejected") return { label: "환불 거절", cls: "bg-red-800 text-red-200" };
  return { label: "취소", cls: "bg-red-600 text-red-100" };
}

function OrderCard({ order }: { order: MyOrder }) {
  const itemLabel =
    (order.item_count ?? 0) > 1
      ? `${order.first_item_name} 외 ${(order.item_count ?? 1) - 1}건`
      : order.first_item_name ?? "상품 없음";

  const { label, cls } = getBadge(order);

  return (
    <div className="bg-[#1a1a1a] rounded-xl border border-white/5 p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="font-mono text-sm text-gray-400 mb-1">{order.order_number}</p>
          <p className="text-white font-medium leading-snug">{itemLabel}</p>
          <p className="text-gray-500 text-sm mt-1">{formatDate(order.created_at)}</p>
        </div>
        <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${cls}`}>
          {label}
        </span>
      </div>

      {order.cancel_reason && (
        <p className="text-xs text-gray-500 mb-3">사유: {order.cancel_reason}</p>
      )}

      <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-3">
        <span className="text-white font-bold">{formatPrice(order.final_price)}</span>
        <Link
          href={`/settings/purchases/${order.id}`}
          className="text-xs px-3 py-1.5 rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors"
        >
          상세 보기
        </Link>
      </div>
    </div>
  );
}

const PAGE_SIZE = 10;

export default function CancelRefundPage() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();
  const { fetchCancelRefundOrders } = useMyOrders();

  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) router.push("/");
  }, [user, isLoading, router]);

  const load = useCallback(
    async (p: number) => {
      setLoading(true);
      const result = await fetchCancelRefundOrders(p);
      setOrders(result.orders);
      setTotal(result.total);
      setLoading(false);
    },
    [fetchCancelRefundOrders]
  );

  useEffect(() => {
    if (user) load(page);
  }, [user, page, load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (isLoading) return <PageLoading variant="top" />;
  if (!user) return null;

  return (
    <SettingsLayout title="취소/환불 내역">
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-t-transparent border-brand-500 rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <p className="text-center text-gray-500 py-16 text-sm">취소 또는 환불 내역이 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-1 mt-6">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 rounded-lg bg-[#1a1a1a] text-gray-400 disabled:opacity-40 hover:bg-[#2a2a2a] transition-colors text-sm"
          >
            이전
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
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
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-lg bg-[#1a1a1a] text-gray-400 disabled:opacity-40 hover:bg-[#2a2a2a] transition-colors text-sm"
          >
            다음
          </button>
        </div>
      )}
    </SettingsLayout>
  );
}
