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

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const adminDb = createAdminClient();
    const { data: order } = await adminDb
      .from("orders")
      .select("id, user_id, status, final_price, refund_amount, refund_status, payment_info, user_coupon_id, coupon_discount")
      .eq("id", orderId)
      .single();

    if (!order) {
      return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
    }

    if (mode === "cancel") {
      if (order.user_id !== user.id) {
        return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
      }
      if (!["pending", "paid"].includes(order.status)) {
        return NextResponse.json({ error: "취소할 수 없는 주문 상태입니다." }, { status: 400 });
      }
    } else {
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

    // [쿠폰 상품] delivery_type='coupon'인 order_items의 purchase 쿠폰 상태 확인
    // 이미 사용된 쿠폰이 있으면 해당 금액을 환불에서 제외
    let excludedFromRefund = 0;

    const { data: purchaseUserCoupons } = await adminDb
      .from("user_coupons")
      .select("id, status, coupon_id")
      .eq("issue_method", "purchase")
      .like("issue_epoch", `${order.id}_%`);

    if (purchaseUserCoupons && purchaseUserCoupons.length > 0) {
      const usedCoupons = purchaseUserCoupons.filter((uc) => uc.status === "used");
      const activeCoupons = purchaseUserCoupons.filter((uc) => uc.status === "active");

      if (usedCoupons.length > 0) {
        // 이미 사용된 쿠폰의 unit 가격 합산 (order_items에서 조회)
        const { data: couponOrderItems } = await adminDb
          .from("order_items")
          .select("product_price, quantity, products(delivery_type)")
          .eq("order_id", order.id)
          .not("product_id", "is", null);

        const couponProductItems = (couponOrderItems ?? []).filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (item: any) => item.products?.delivery_type === "coupon"
        );

        const totalCouponUnits = purchaseUserCoupons.length;
        const totalCouponAmount = couponProductItems.reduce(
          (sum: number, item: { product_price: number; quantity: number }) =>
            sum + item.product_price * item.quantity,
          0
        );

        // 사용된 쿠폰 비율만큼 환불 제외
        excludedFromRefund = Math.round(totalCouponAmount * (usedCoupons.length / totalCouponUnits));
      }

      // active 상태의 purchase 쿠폰은 cancelled로 처리
      if (activeCoupons.length > 0) {
        const activeIds = activeCoupons.map((uc) => uc.id);
        await adminDb
          .from("user_coupons")
          .update({ status: "cancelled" })
          .in("id", activeIds);

        // 쿠폰별로 issued_count 감소
        const couponIdCounts = activeCoupons.reduce<Record<number, number>>((acc, uc) => {
          acc[uc.coupon_id] = (acc[uc.coupon_id] ?? 0) + 1;
          return acc;
        }, {});
        for (const [couponId, count] of Object.entries(couponIdCounts)) {
          await adminDb.rpc("decrement_coupon_issued_count", {
            coupon_id_arg: Number(couponId),
            amount_arg: count,
          });
        }
      }
    }

    const paymentInfo = order.payment_info as Record<string, unknown> | null;
    const paymentKey = paymentInfo?.paymentKey as string | undefined;

    if (paymentKey) {
      const baseAmount = mode === "refund"
        ? (amount ?? order.refund_amount ?? order.final_price)
        : order.final_price;

      const cancelAmount = Math.max(0, baseAmount - excludedFromRefund);

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

    // [쿠폰] 할인 쿠폰 복원
    if (order.user_coupon_id) {
      const restoreFields =
        mode === "cancel"
          ? { status: "active", used_at: null, used_order_id: null, restored_at: now }
          : { status: "active", restored_at: now };  // 환불: used_at/used_order_id 이력 보존

      await adminDb
        .from("user_coupons")
        .update(restoreFields)
        .eq("id", order.user_coupon_id)
        .eq("status", "used");

      // used_count 감소
      await adminDb.rpc("decrement_coupon_used_count", {
        coupon_id_arg: order.user_coupon_id,
        amount_arg: 1,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Payment cancel unexpected error:", err);
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
