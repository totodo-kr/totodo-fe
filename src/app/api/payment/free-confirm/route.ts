import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { validateDigitalItemsBeforeCharge, createDigitalFulfillments } from "@/lib/fulfillment/digitalFulfillment";

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

    // 2.5. [디지털 상품] 0원 확정 전 사전 검증 — 기프티콘 재고, 다운로드 파일 준비, 쿠폰 연결 여부
    // (0원이라도 "지급 못 하는 상품을 판매 확정"하면 안 되므로 유료 결제와 동일하게 검증한다)
    const validation = await validateDigitalItemsBeforeCharge(admin, orderRow.id);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error, code: validation.code }, { status: 400 });
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

    // 5. [디지털 상품] 공통 이행 생성 (digital_download/gifticon/coupon)
    // Toss 결제 자체가 없는 경로이므로 tossRefund는 넘기지 않는다 —
    // 재고 소진 시 부분 취소 대신 그냥 취소 상태로 남기고 안내만 한다.
    const partialFailures = await createDigitalFulfillments({
      admin,
      orderId: orderRow.id,
      userId: orderRow.user_id,
    });

    // 6. 장바구니 비우기
    const { error: cartError } = await admin
      .from("cart_items")
      .delete()
      .eq("user_id", user.id);

    if (cartError) {
      console.error("Cart clear error:", cartError);
    }

    return NextResponse.json({
      success: true,
      ...(partialFailures.length > 0 && { partialFailures }),
    });
  } catch (err) {
    console.error("Free order confirm error:", err);
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
