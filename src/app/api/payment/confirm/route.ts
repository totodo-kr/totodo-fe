// Server-side API route for Toss Payments confirmation.
//
// Required environment variables:
// NEXT_PUBLIC_TOSS_CLIENT_KEY — Toss Payments client key (browser-side)
// TOSS_SECRET_KEY             — Toss Payments secret key (server-side only, never expose to client)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

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

    // 7. [쿠폰 상품] delivery_type='coupon'인 order_items → user_coupons 자동 발급
    const { data: orderItems } = await admin
      .from("order_items")
      .select(`
        id, product_id, quantity,
        products (
          delivery_type,
          product_details (type_meta)
        )
      `)
      .eq("order_id", orderRow.id)
      .not("product_id", "is", null);

    const couponItems = (orderItems ?? []).filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (item: any) => item.products?.delivery_type === "coupon"
    );

    if (couponItems.length > 0) {
      let seq = 0;
      const issuedCouponIds = new Set<number>();

      for (const item of couponItems) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pd = (item as any).products?.product_details;
        const typeMeta = Array.isArray(pd) ? pd[0]?.type_meta : pd?.type_meta;
        const couponId = typeMeta?.coupon_id;
        if (!couponId) continue;

        for (let q = 0; q < (item as { quantity: number }).quantity; q++) {
          seq++;
          const issue_epoch = `${orderRow.id}_${seq}`;
          // ON CONFLICT DO NOTHING: 멱등성 보장 (confirm 재실행 시 중복 방지)
          const { error: issueError } = await admin
            .from("user_coupons")
            .insert({
              user_id: orderRow.user_id,
              coupon_id: couponId,
              issue_epoch,
              issue_method: "purchase",
              status: "active",
            });

          if (!issueError) {
            issuedCouponIds.add(couponId);
          }
        }
      }

      // issued_count 증가 (실제 발급된 쿠폰 ID별로)
      for (const couponId of issuedCouponIds) {
        await admin.rpc("increment_coupon_issued_count", { coupon_id_arg: couponId });
      }
    }

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
    });
  } catch (err) {
    console.error("Payment confirm unexpected error:", err);
    return NextResponse.json(
      { error: "결제 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
