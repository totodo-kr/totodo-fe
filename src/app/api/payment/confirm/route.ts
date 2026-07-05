// Server-side API route for Toss Payments confirmation.
//
// Required environment variables:
// NEXT_PUBLIC_TOSS_CLIENT_KEY — Toss Payments client key (browser-side)
// TOSS_SECRET_KEY             — Toss Payments secret key (server-side only, never expose to client)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import crypto from "crypto";

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

    // 3.5. [gifticon] Toss 호출 전 재고 사전 체크
    // 재고가 부족하면 Toss confirm 자체를 호출하지 않아 결제가 아예 안 일어남
    const { data: allOrderItems } = await admin
      .from("order_items")
      .select(`
        id, product_id, quantity, subtotal,
        products (
          delivery_type,
          product_details (type_meta)
        )
      `)
      .eq("order_id", orderRow.id)
      .not("product_id", "is", null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gifticonItems = (allOrderItems ?? []).filter((item: any) => item.products?.delivery_type === "gifticon");

    for (const item of gifticonItems as { product_id: number; quantity: number }[]) {
      const { count } = await admin
        .from("gifticon_codes")
        .select("id", { count: "exact", head: true })
        .eq("product_id", item.product_id)
        .eq("status", "available");

      if ((count ?? 0) < item.quantity) {
        return NextResponse.json(
          { error: "선택한 기프티콘 상품의 재고가 부족합니다.", code: "GIFTICON_OUT_OF_STOCK" },
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

    // 7. [디지털 상품] 공통 이행 생성
    // ⚠️ 이 블록이 기존 "delivery_type='coupon' → user_coupons 임시 발급" 블록을 완전히 대체한다.
    //    두 블록이 동시에 존재하면 쿠폰 이중 발급 버그가 발생하므로 절대 병존 금지.
    const digitalItems = (allOrderItems ?? []).filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (item: any) => ["digital_download", "gifticon", "coupon"].includes(item.products?.delivery_type)
    );

    const partialFailures: Array<{ order_item_id: number; reason: string }> = [];
    const issuedCouponIds = new Set<number>();

    for (const item of digitalItems as {
      id: number;
      product_id: number;
      quantity: number;
      subtotal: number;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      products: any;
    }[]) {
      const deliveryType = item.products?.delivery_type as string;

      // digital_fulfillments INSERT
      // order_item_id에 UNIQUE 제약 → 재시도 시 23505(unique violation)로 skip (멱등성)
      const { data: fulfillmentRow, error: fulfillmentError } = await admin
        .from("digital_fulfillments")
        .insert({
          order_id: orderRow.id,
          order_item_id: item.id,
          user_id: orderRow.user_id,
          delivery_type: deliveryType,
          status: "success",
        })
        .select("id")
        .single();

      if (fulfillmentError) {
        if (fulfillmentError.code === "23505") continue; // 이미 이행됨, skip
        console.error("digital_fulfillments insert error:", fulfillmentError);
        continue;
      }

      const fulfillmentId = fulfillmentRow.id;

      if (deliveryType === "digital_download") {
        const downloadToken = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);

        const { error: ebookError } = await admin
          .from("ebook_downloads")
          .insert({
            digital_fulfillment_id: fulfillmentId,
            download_token: downloadToken,
            download_count: 0,
            download_limit: 3,
            expires_at: expiresAt.toISOString(),
          });

        if (ebookError) {
          console.error("ebook_downloads insert error:", ebookError);
        }

      } else if (deliveryType === "gifticon") {
        // 원자적 코드 예약 (SELECT FOR UPDATE SKIP LOCKED)
        const { data: codeId, error: claimError } = await admin.rpc("claim_gifticon_code", {
          p_product_id: item.product_id,
          p_fulfillment_id: fulfillmentId,
        });

        if (claimError || codeId === null) {
          // 사전 체크를 통과했음에도 경쟁으로 재고 소진 → 자동 부분 취소
          await admin
            .from("digital_fulfillments")
            .update({ status: "cancelled" })
            .eq("id", fulfillmentId);

          const cancelEncoded = Buffer.from(`${secretKey}:`).toString("base64");
          const cancelRes = await fetch(
            `https://api.tosspayments.com/v1/payments/${tossData.paymentKey}/cancel`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${cancelEncoded}`,
              },
              body: JSON.stringify({
                cancelReason: "재고 소진으로 인한 자동 환불",
                cancelAmount: item.subtotal,
              }),
            }
          );

          if (!cancelRes.ok) {
            // 부분 취소 자체도 실패 → failed로 남겨 어드민이 수동 처리
            await admin
              .from("digital_fulfillments")
              .update({ status: "failed" })
              .eq("id", fulfillmentId);
          }

          partialFailures.push({ order_item_id: item.id, reason: "재고 소진으로 자동 환불" });
        }

      } else if (deliveryType === "coupon") {
        const pd = item.products?.product_details;
        const typeMeta = Array.isArray(pd) ? pd[0]?.type_meta : pd?.type_meta;
        const couponId = typeMeta?.coupon_id;
        if (!couponId) continue;

        for (let q = 0; q < item.quantity; q++) {
          const { error: issueError } = await admin
            .from("user_coupons")
            .insert({
              user_id: orderRow.user_id,
              coupon_id: couponId,
              // order_id + item_id + quantity_index로 결정론적 멱등 키 구성
              issue_epoch: `${orderRow.id}_${item.id}_${q}`,
              issue_method: "purchase",
              status: "active",
              digital_fulfillment_id: fulfillmentId,
            });

          if (!issueError) {
            issuedCouponIds.add(couponId);
          }
        }
      }
    }

    // 쿠폰형 상품 issued_count 증가 (coupon_id별로 1회씩)
    for (const couponId of issuedCouponIds) {
      await admin.rpc("increment_coupon_issued_count", { coupon_id_arg: couponId });
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
