import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { DIGITAL_CANCEL_WINDOW_HOURS } from "@/lib/fulfillment/cancelPolicy";

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
      .select("id, user_id, status, final_price, refund_amount, refund_status, payment_info, user_coupon_id, coupon_discount, paid_at")
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

    let excludedFromRefund = 0;

    // 이 주문의 모든 디지털 이행 레코드 조회 (Phase 1 이후 생성된 주문)
    const { data: allFulfillments } = await adminDb
      .from("digital_fulfillments")
      .select("id, order_item_id, delivery_type")
      .eq("order_id", order.id)
      .eq("status", "success");

    const couponFulfillmentIds = (allFulfillments ?? [])
      .filter((f) => f.delivery_type === "coupon")
      .map((f) => f.id);

    const gifticonFulfillments = (allFulfillments ?? []).filter(
      (f) => f.delivery_type === "gifticon"
    );
    const gifticonFulfillmentIds = gifticonFulfillments.map((f) => f.id);

    // [digital_download] §4: 다운로드 완료했거나 결제 후 24시간이 지난 경우 취소/환불 자체를 막는다.
    // 별도의 부분 취소 경로가 없으므로(order_item 단위 선택 취소 불가) 위반 시 요청 전체를 거부한다.
    const digitalDownloadFulfillmentIds = (allFulfillments ?? [])
      .filter((f) => f.delivery_type === "digital_download")
      .map((f) => f.id);

    if (digitalDownloadFulfillmentIds.length > 0) {
      const { data: ebooks } = await adminDb
        .from("ebook_downloads")
        .select("digital_fulfillment_id, download_count")
        .in("digital_fulfillment_id", digitalDownloadFulfillmentIds);

      const anyDownloaded = (ebooks ?? []).some((e) => (e.download_count ?? 0) > 0);
      if (anyDownloaded) {
        return NextResponse.json(
          { error: "다운로드한 상품이 포함되어 있어 취소/환불할 수 없습니다." },
          { status: 400 }
        );
      }

      if (order.paid_at) {
        const hoursSincePaid = (Date.now() - new Date(order.paid_at).getTime()) / (1000 * 60 * 60);
        if (hoursSincePaid > DIGITAL_CANCEL_WINDOW_HOURS) {
          return NextResponse.json(
            { error: `결제 후 ${DIGITAL_CANCEL_WINDOW_HOURS}시간이 지나 취소/환불할 수 없습니다.` },
            { status: 400 }
          );
        }
      }
    }

    // [쿠폰 상품] purchase 쿠폰 상태 확인 및 처리
    // Phase 1 이후: digital_fulfillment_id FK 조인
    // Phase 1 이전 주문 fallback: issue_epoch LIKE (전환 기간 안전망)
    let purchaseUserCoupons: { id: number; status: string; coupon_id: number }[] = [];

    if (couponFulfillmentIds.length > 0) {
      const { data } = await adminDb
        .from("user_coupons")
        .select("id, status, coupon_id")
        .in("digital_fulfillment_id", couponFulfillmentIds);
      purchaseUserCoupons = (data ?? []) as typeof purchaseUserCoupons;
    } else {
      // Phase 1 이전 발급 주문: issue_epoch 패턴으로 fallback
      const { data } = await adminDb
        .from("user_coupons")
        .select("id, status, coupon_id")
        .eq("issue_method", "purchase")
        .like("issue_epoch", `${order.id}_%`);
      purchaseUserCoupons = (data ?? []) as typeof purchaseUserCoupons;
    }

    if (purchaseUserCoupons.length > 0) {
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

        excludedFromRefund += Math.round(totalCouponAmount * (usedCoupons.length / totalCouponUnits));
      }

      if (activeCoupons.length > 0) {
        const activeIds = activeCoupons.map((uc) => uc.id);
        await adminDb
          .from("user_coupons")
          .update({ status: "cancelled" })
          .in("id", activeIds);

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

    // [기프티콘 상품] revealed_at 기반 환불 제외 계산 + 코드 void 처리
    if (gifticonFulfillmentIds.length > 0) {
      const { data: issuedCodes } = await adminDb
        .from("gifticon_codes")
        .select("id, revealed_at, issued_to_fulfillment_id")
        .in("issued_to_fulfillment_id", gifticonFulfillmentIds);

      const revealedCodes = (issuedCodes ?? []).filter((c) => c.revealed_at !== null);

      if (revealedCodes.length > 0) {
        // 열람한 코드 1개당 unit price(product_price) 1개분만 환불 제외에 추가.
        // quantity > 1인 아이템(코드 여러 개가 같은 fulfillment_id를 공유)은 subtotal 전체가 아니라
        // 실제 열람된 코드 수만큼만 제외해야 한다 — 그렇지 않으면 일부만 열람했는데도
        // 전액(또는 그 이상)이 중복 차감되는 버그가 생긴다.
        const { data: gifticonItems } = await adminDb
          .from("order_items")
          .select("id, product_price")
          .in("id", gifticonFulfillments.map((f) => f.order_item_id));

        const itemUnitPriceMap = new Map(
          (gifticonItems ?? []).map((i) => [i.id, i.product_price as number])
        );
        const fulfillmentItemMap = new Map(
          gifticonFulfillments.map((f) => [f.id, f.order_item_id])
        );

        for (const code of revealedCodes) {
          const itemId = fulfillmentItemMap.get(code.issued_to_fulfillment_id);
          excludedFromRefund += itemUnitPriceMap.get(itemId ?? 0) ?? 0;
        }
      }

      // 열람 여부와 무관하게 코드를 void 처리 (재고 풀로 반납 안 함)
      await adminDb
        .from("gifticon_codes")
        .update({ status: "void" })
        .in("issued_to_fulfillment_id", gifticonFulfillmentIds);

      // 기프티콘 이행 레코드 cancelled 처리
      await adminDb
        .from("digital_fulfillments")
        .update({ status: "cancelled" })
        .in("id", gifticonFulfillmentIds);
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
          : { status: "active", restored_at: now };

      await adminDb
        .from("user_coupons")
        .update(restoreFields)
        .eq("id", order.user_coupon_id)
        .eq("status", "used");

      await adminDb.rpc("decrement_coupon_used_count", {
        user_coupon_id_arg: order.user_coupon_id,
        amount_arg: 1,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Payment cancel unexpected error:", err);
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
