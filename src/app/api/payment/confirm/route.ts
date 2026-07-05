// Server-side API route for Toss Payments confirmation.
//
// Required environment variables:
// NEXT_PUBLIC_TOSS_CLIENT_KEY — Toss Payments client key (browser-side)
// TOSS_SECRET_KEY             — Toss Payments secret key (server-side only, never expose to client)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { validateDigitalItemsBeforeCharge, createDigitalFulfillments } from "@/lib/fulfillment/digitalFulfillment";

export async function POST(req: NextRequest) {
  try {
    const { paymentKey, orderId, amount } = await req.json();

    if (!paymentKey || !orderId || amount === undefined) {
      return NextResponse.json(
        { error: "필수 파라미터가 누락되었습니다." },
        { status: 400 }
      );
    }

    const secretKey = process.env.TOSS_SECRET_KEY;
    if (!secretKey) {
      console.error("TOSS_SECRET_KEY is not set");
      return NextResponse.json(
        { error: "서버 설정 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    // admin client used for DB writes — orders RLS has no user-level UPDATE policy
    const admin = createAdminClient();

    // 1. Verify order exists and is not already paid (idempotency)
    const { data: orderRow } = await admin
      .from("orders")
      .select("id, user_id, final_price, status, user_coupon_id, coupon_discount")
      .eq("order_number", orderId)
      .single();

    if (!orderRow) {
      return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
    }

    if (orderRow.status === "paid") {
      return NextResponse.json({ success: true, already_confirmed: true });
    }

    // 2. Amount match check
    if (orderRow.final_price !== amount) {
      console.error(`Amount mismatch: DB=${orderRow.final_price}, received=${amount}`);
      return NextResponse.json({ error: "결제 금액이 주문 금액과 일치하지 않습니다." }, { status: 400 });
    }

    // 3. [쿠폰] Toss 호출 전 쿠폰 재검증
    if (orderRow.user_coupon_id) {
      const { data: userCoupon } = await admin
        .from("user_coupons")
        .select("id, status, coupons(is_active, valid_until)")
        .eq("id", orderRow.user_coupon_id)
        .eq("status", "active")
        .single();

      if (!userCoupon) {
        return NextResponse.json(
          { error: "선택한 쿠폰이 만료되었어요!", code: "COUPON_EXPIRED" },
          { status: 400 }
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const coupon = userCoupon.coupons as any;
      if (!coupon?.is_active || (coupon.valid_until && new Date(coupon.valid_until) < new Date())) {
        return NextResponse.json(
          { error: "선택한 쿠폰이 만료되었어요!", code: "COUPON_EXPIRED" },
          { status: 400 }
        );
      }
    }

    // 3.5. [디지털 상품] Toss 호출 전 사전 검증 — 기프티콘 재고, 다운로드 파일 준비, 쿠폰 연결 여부
    // 여기서 막히면 Toss confirm 자체를 호출하지 않아 결제가 아예 일어나지 않는다.
    const validation = await validateDigitalItemsBeforeCharge(admin, orderRow.id);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error, code: validation.code }, { status: 400 });
    }

    // 4. Call Toss Payments confirm API
    const encoded = Buffer.from(`${secretKey}:`).toString("base64");
    const tossRes = await fetch(
      "https://api.tosspayments.com/v1/payments/confirm",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${encoded}`,
        },
        body: JSON.stringify({ paymentKey, orderId, amount }),
      }
    );

    const tossData = await tossRes.json();

    if (!tossRes.ok) {
      console.error("Toss confirm error:", tossData);
      return NextResponse.json(
        { error: tossData.message ?? "Toss 결제 확인에 실패했습니다." },
        { status: 400 }
      );
    }

    // 5. Update order: status='paid'
    const { error: updateError } = await admin
      .from("orders")
      .update({
        status: "paid",
        payment_method: tossData.method ?? null,
        payment_info: tossData,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("order_number", orderId)
      .eq("status", "pending");

    if (updateError) {
      console.error("Order update error:", updateError);
      return NextResponse.json({ error: "주문 상태 업데이트에 실패했습니다." }, { status: 500 });
    }

    // 6. [쿠폰] 할인 쿠폰 status='used' 원자적 처리 (WHERE status='active' 조건으로 레이스 컨디션 방지)
    if (orderRow.user_coupon_id) {
      const { data: updatedCoupons, error: couponUpdateError } = await admin
        .from("user_coupons")
        .update({
          status: "used",
          used_at: new Date().toISOString(),
          used_order_id: orderRow.id,
        })
        .eq("id", orderRow.user_coupon_id)
        .eq("status", "active")
        .select();

      if (!couponUpdateError && updatedCoupons && updatedCoupons.length > 0) {
        await admin.rpc("increment_coupon_used_count", {
          user_coupon_id_arg: orderRow.user_coupon_id,
        });
      }
    }

    // 7. [디지털 상품] 공통 이행 생성
    // ⚠️ 이 블록이 기존 "delivery_type='coupon' → user_coupons 임시 발급" 블록을 완전히 대체한다.
    //    두 블록이 동시에 존재하면 쿠폰 이중 발급 버그가 발생하므로 절대 병존 금지.
    const partialFailures = await createDigitalFulfillments({
      admin,
      orderId: orderRow.id,
      userId: orderRow.user_id,
      tossRefund: { paymentKey: tossData.paymentKey, secretKey },
    });

    // 8. Clear the user's cart
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { error: cartError } = await admin
        .from("cart_items")
        .delete()
        .eq("user_id", user.id);

      if (cartError) {
        console.error("Cart clear error:", cartError);
      }
    }

    return NextResponse.json({
      success: true,
      method: tossData.method ?? null,
      approvedAt: tossData.approvedAt ?? null,
      ...(partialFailures.length > 0 && { partialFailures }),
    });
  } catch (err) {
    console.error("Payment confirm unexpected error:", err);
    return NextResponse.json(
      { error: "결제 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
