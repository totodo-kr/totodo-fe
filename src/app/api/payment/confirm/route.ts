// Server-side API route for Toss Payments confirmation.
//
// Required environment variables:
// NEXT_PUBLIC_TOSS_CLIENT_KEY — Toss Payments client key (browser-side)
// TOSS_SECRET_KEY             — Toss Payments secret key (server-side only, never expose to client)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

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

    // 1. Call Toss Payments confirm API
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

    // 2. Verify order exists, amount matches, and is not already paid (idempotency)
    const supabase = await createClient();

    const { data: orderRow } = await supabase
      .from("orders")
      .select("id, final_price, status")
      .eq("order_number", orderId)
      .single();

    if (!orderRow) {
      return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
    }

    if (orderRow.status === "paid") {
      return NextResponse.json({ success: true, already_confirmed: true });
    }

    if (orderRow.final_price !== amount) {
      console.error(`Amount mismatch: DB=${orderRow.final_price}, received=${amount}`);
      return NextResponse.json({ error: "결제 금액이 주문 금액과 일치하지 않습니다." }, { status: 400 });
    }

    // 3. Update order in DB: status='paid', toss_payment_key, payment_method, paid_at
    const { error: updateError } = await supabase
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
    }

    // 4. Clear the user's cart
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { error: cartError } = await supabase
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
