import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { user_coupon_id, product_amount, shipping_fee } = await req.json();
    if (!user_coupon_id || product_amount === undefined || shipping_fee === undefined) {
      return NextResponse.json({ error: "필수 파라미터가 누락되었습니다." }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: userCoupon } = await admin
      .from("user_coupons")
      .select(`
        id, status,
        coupons (
          id, discount_type, discount_value, max_discount_amount,
          min_order_amount, valid_from, valid_until, is_active
        )
      `)
      .eq("id", user_coupon_id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!userCoupon) {
      return NextResponse.json({ error: "사용할 수 없는 쿠폰입니다." }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const coupon = userCoupon.coupons as any;

    if (!coupon?.is_active) {
      return NextResponse.json({ error: "비활성화된 쿠폰입니다." }, { status: 400 });
    }

    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return NextResponse.json({ error: "아직 사용 기간이 아닙니다." }, { status: 400 });
    }
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return NextResponse.json({ error: "만료된 쿠폰입니다." }, { status: 400 });
    }
    if (product_amount < (coupon.min_order_amount ?? 0)) {
      return NextResponse.json(
        { error: `최소 주문금액 ${coupon.min_order_amount.toLocaleString()}원 이상 주문 시 사용 가능합니다.` },
        { status: 400 }
      );
    }

    let coupon_discount = 0;
    let shipping_discount = 0;

    if (coupon.discount_type === "fixed") {
      coupon_discount = Math.min(coupon.discount_value, product_amount);
    } else if (coupon.discount_type === "percentage") {
      const raw = Math.floor(product_amount * coupon.discount_value / 100);
      coupon_discount = coupon.max_discount_amount !== null
        ? Math.min(raw, coupon.max_discount_amount)
        : raw;
    } else if (coupon.discount_type === "free_shipping") {
      shipping_discount = shipping_fee;
    }

    const final_price = Math.max(0, product_amount - coupon_discount) + Math.max(0, shipping_fee - shipping_discount);

    return NextResponse.json({ coupon_discount, shipping_discount, final_price });
  } catch (err) {
    console.error("Coupon validate unexpected error:", err);
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
