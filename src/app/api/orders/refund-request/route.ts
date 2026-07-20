import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { canRefundOrderByDeliveryState } from "@/lib/fulfillment/cancelPolicy";

export async function POST(req: NextRequest) {
  try {
    const { orderId, reason, amount } = await req.json();

    if (!orderId || !reason?.trim() || reason.length > 1000) {
      return NextResponse.json({ error: "필수 파라미터가 누락되었습니다." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const adminDb = createAdminClient();
    const { data: order } = await adminDb
      .from("orders")
      .select("id, user_id, status, order_type, final_price, refund_status")
      .eq("id", orderId)
      .single();

    if (!order) {
      return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
    }
    if (order.user_id !== user.id) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }
    if (order.refund_status) {
      return NextResponse.json(
        { error: "이미 환불 신청이 접수되었거나 처리 완료된 주문입니다." },
        { status: 400 }
      );
    }

    const { data: tracking } = await adminDb
      .from("shipping_tracking")
      .select("delivered_at")
      .eq("order_id", order.id)
      .maybeSingle();

    const eligibility = canRefundOrderByDeliveryState({
      status: order.status,
      order_type: order.order_type,
      delivered_at: tracking?.delivered_at ?? null,
    });
    if (!eligibility.allowed) {
      return NextResponse.json(
        { error: eligibility.reason ?? "환불 신청이 불가능한 상태입니다." },
        { status: 400 }
      );
    }

    const refundAmount = amount ?? order.final_price;
    if (typeof refundAmount !== "number" || refundAmount < 0 || refundAmount > order.final_price) {
      return NextResponse.json({ error: "환불 금액이 올바르지 않습니다." }, { status: 400 });
    }

    // refund_status IS NULL 조건은 동시 요청에 대한 안전장치 (위에서 이미 확인했지만 TOCTOU 방지)
    const { error, count } = await adminDb
      .from("orders")
      .update(
        {
          refund_reason: reason.trim(),
          refund_amount: refundAmount,
          refund_status: "requested",
          refund_requested_at: new Date().toISOString(),
        },
        { count: "exact" }
      )
      .eq("id", orderId)
      .is("refund_status", null);

    if (error || count === 0) {
      return NextResponse.json({ error: "환불 신청 처리 중 오류가 발생했습니다." }, { status: 409 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("refund-request unexpected error:", err);
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
