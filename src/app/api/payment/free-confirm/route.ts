import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: "필수 파라미터가 누락되었습니다." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const admin = createAdminClient();

    // 1. 주문 조회 (본인 주문, 0원, pending 상태만)
    const { data: orderRow } = await admin
      .from("orders")
      .select("id, user_id, final_price, status, user_coupon_id")
      .eq("order_number", orderId)
      .eq("user_id", user.id)
      .single();

    if (!orderRow) {
      return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
    }

    if (orderRow.final_price !== 0) {
      return NextResponse.json({ error: "0원 주문이 아닙니다." }, { status: 400 });
    }

    // 멱등성: 이미 처리된 주문
    if (orderRow.status === "paid") {
      return NextResponse.json({ success: true, already_confirmed: true });
    }

    // 2. 쿠폰 재검증
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

    // 3. 주문 status → paid
    const { error: updateError } = await admin
      .from("orders")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("order_number", orderId)
      .eq("status", "pending");

    if (updateError) {
      console.error("Order update error:", updateError);
      return NextResponse.json({ error: "주문 상태 업데이트에 실패했습니다." }, { status: 500 });
    }

    // 4. 쿠폰 → used (WHERE status='active' 조건으로 레이스 컨디션 방지)
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

    // 5. 쿠폰 상품(delivery_type='coupon') 자동 발급
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const couponItems = (orderItems ?? []).filter((item: any) => item.products?.delivery_type === "coupon");

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
          const { error: issueError } = await admin
            .from("user_coupons")
            .insert({
              user_id: orderRow.user_id,
              coupon_id: couponId,
              issue_epoch,
              issue_method: "purchase",
              status: "active",
            });

          if (!issueError) issuedCouponIds.add(couponId);
        }
      }

      for (const couponId of issuedCouponIds) {
        await admin.rpc("increment_coupon_issued_count", { coupon_id_arg: couponId });
      }
    }

    // 6. 장바구니 비우기
    const { error: cartError } = await admin
      .from("cart_items")
      .delete()
      .eq("user_id", user.id);

    if (cartError) {
      console.error("Cart clear error:", cartError);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Free order confirm error:", err);
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
