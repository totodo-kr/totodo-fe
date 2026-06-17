import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { orderId, reason, amount, mode } = await req.json();

    if (!orderId || !reason?.trim() || !["cancel", "refund"].includes(mode)) {
      return NextResponse.json({ error: "필수 파라미터가 누락되었습니다." }, { status: 400 });
    }

    const secretKey = process.env.TOSS_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: "서버 설정 오류가 발생했습니다." }, { status: 500 });
    }

    // 1. Auth
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    // 2. Fetch order
    const adminDb = createAdminClient();
    const { data: order } = await adminDb
      .from("orders")
      .select("id, user_id, status, final_price, refund_amount, refund_status, payment_info")
      .eq("id", orderId)
      .single();

    if (!order) {
      return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
    }

    // 3. Authorization
    if (mode === "cancel") {
      if (order.user_id !== user.id) {
        return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
      }
      if (!["pending", "paid"].includes(order.status)) {
        return NextResponse.json({ error: "취소할 수 없는 주문 상태입니다." }, { status: 400 });
      }
    } else {
      // refund — admin only
      const { data: profile } = await adminDb
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile?.role !== "admin") {
        return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
      }
      if (order.refund_status !== "requested") {
        return NextResponse.json({ error: "환불 요청 상태가 아닙니다." }, { status: 400 });
      }
    }

    // 4. Call Toss cancel API if payment was actually processed
    const paymentInfo = order.payment_info as Record<string, unknown> | null;
    const paymentKey = paymentInfo?.paymentKey as string | undefined;

    if (paymentKey) {
      const cancelAmount =
        mode === "refund"
          ? (amount ?? order.refund_amount ?? order.final_price)
          : order.final_price;

      const encoded = Buffer.from(`${secretKey}:`).toString("base64");
      const tossRes = await fetch(
        `https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${encoded}`,
          },
          body: JSON.stringify({ cancelReason: reason.trim(), cancelAmount }),
        }
      );

      if (!tossRes.ok) {
        const tossData = await tossRes.json();
        console.error("Toss cancel error:", tossData);
        return NextResponse.json(
          { error: tossData.message ?? "결제 취소에 실패했습니다." },
          { status: 400 }
        );
      }
    }

    // 5. Update DB
    const now = new Date().toISOString();
    if (mode === "cancel") {
      await adminDb
        .from("orders")
        .update({ status: "cancelled", cancel_reason: reason.trim(), cancel_requested_at: now, updated_at: now })
        .eq("id", orderId);
    } else {
      await adminDb
        .from("orders")
        .update({ refund_status: "completed", refund_completed_at: now, updated_at: now })
        .eq("id", orderId);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Payment cancel unexpected error:", err);
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
