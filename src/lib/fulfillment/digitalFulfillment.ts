// 결제 확인(confirm) / 0원 확인(free-confirm) 양쪽이 공유하는 디지털 이행 로직.
// 두 라우트에 각자 따로 구현하면 한쪽만 고치고 다른 쪽을 빠뜨리는 드리프트 버그가
// 생기기 쉽다 (실제로 free-confirm은 원래 coupon만 처리하고 digital_download/gifticon을
// 전혀 다루지 않는 상태로 남아있었다).

import type { SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";

interface DigitalOrderItem {
  id: number;
  product_id: number;
  quantity: number;
  subtotal: number;
  delivery_type: string;
  type_meta: Record<string, unknown>;
}

async function fetchDigitalOrderItems(
  admin: SupabaseClient,
  orderId: number
): Promise<DigitalOrderItem[]> {
  const { data } = await admin
    .from("order_items")
    .select(
      `id, product_id, quantity, subtotal,
       products (
         delivery_type,
         product_details (type_meta)
       )`
    )
    .eq("order_id", orderId)
    .not("product_id", "is", null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((item: any) => {
    const pd = item.products?.product_details;
    const typeMeta = (Array.isArray(pd) ? pd[0]?.type_meta : pd?.type_meta) ?? {};
    return {
      id: item.id,
      product_id: item.product_id,
      quantity: item.quantity,
      subtotal: item.subtotal,
      delivery_type: item.products?.delivery_type ?? "physical",
      type_meta: typeMeta,
    };
  });
}

export interface DigitalItemsValidation {
  ok: boolean;
  error?: string;
  code?: string;
}

/**
 * 실제 결제(Toss confirm) 또는 0원 확정 전에 호출한다.
 * 재고 부족/파일 미준비/쿠폰 미연결 상품이 있으면 결제 자체를 막는다 —
 * "결제는 됐는데 상품을 못 받는" 상황(신뢰 문제 + 수동 환불 부담)을 애초에 없애기 위함.
 */
export async function validateDigitalItemsBeforeCharge(
  admin: SupabaseClient,
  orderId: number
): Promise<DigitalItemsValidation> {
  const items = await fetchDigitalOrderItems(admin, orderId);

  for (const item of items) {
    if (item.delivery_type === "gifticon") {
      const { count } = await admin
        .from("gifticon_codes")
        .select("id", { count: "exact", head: true })
        .eq("product_id", item.product_id)
        .eq("status", "available");

      if ((count ?? 0) < item.quantity) {
        return {
          ok: false,
          error: "선택한 기프티콘 상품의 재고가 부족합니다.",
          code: "GIFTICON_OUT_OF_STOCK",
        };
      }
    } else if (item.delivery_type === "digital_download") {
      if (!item.type_meta.file_path) {
        return {
          ok: false,
          error: "다운로드 파일이 아직 준비되지 않은 상품입니다. 관리자에게 문의해주세요.",
          code: "FILE_NOT_READY",
        };
      }
    } else if (item.delivery_type === "coupon") {
      const couponId = item.type_meta.coupon_id;
      if (!couponId) {
        return {
          ok: false,
          error: "연결된 쿠폰이 없는 상품입니다. 관리자에게 문의해주세요.",
          code: "COUPON_NOT_LINKED",
        };
      }

      const { data: coupon } = await admin
        .from("coupons")
        .select("id, is_active")
        .eq("id", couponId as number)
        .single();

      if (!coupon || !coupon.is_active) {
        return {
          ok: false,
          error: "연결된 쿠폰을 사용할 수 없습니다. 관리자에게 문의해주세요.",
          code: "COUPON_NOT_LINKED",
        };
      }
    }
  }

  return { ok: true };
}

export interface PartialFailure {
  order_item_id: number;
  reason: string;
}

export interface CreateFulfillmentsParams {
  admin: SupabaseClient;
  orderId: number;
  userId: string;
  // Toss 실결제 경로에서만 넘긴다 — 재고 소진 시 이 정보로 부분 취소를 시도한다.
  // 0원(free-confirm) 주문은 취소할 실제 결제가 없으므로 undefined로 둔다.
  tossRefund?: { paymentKey: string; secretKey: string };
}

/**
 * order_items → digital_fulfillments + 타입별 자식 테이블 생성.
 * order_item_id UNIQUE 제약으로 재시도 시 조용히 skip되어 멱등하다.
 */
export async function createDigitalFulfillments({
  admin,
  orderId,
  userId,
  tossRefund,
}: CreateFulfillmentsParams): Promise<PartialFailure[]> {
  const items = await fetchDigitalOrderItems(admin, orderId);
  const digitalItems = items.filter((item) =>
    ["digital_download", "gifticon", "coupon"].includes(item.delivery_type)
  );

  const partialFailures: PartialFailure[] = [];
  const issuedCouponIds = new Set<number>();

  for (const item of digitalItems) {
    const { data: fulfillmentRow, error: fulfillmentError } = await admin
      .from("digital_fulfillments")
      .insert({
        order_id: orderId,
        order_item_id: item.id,
        user_id: userId,
        delivery_type: item.delivery_type,
        status: "success",
      })
      .select("id")
      .single();

    if (fulfillmentError) {
      if (fulfillmentError.code === "23505") continue; // 이미 이행됨, skip (멱등성)
      console.error("digital_fulfillments insert error:", fulfillmentError);
      continue;
    }

    const fulfillmentId = fulfillmentRow.id;

    if (item.delivery_type === "digital_download") {
      const downloadToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      const { error: ebookError } = await admin.from("ebook_downloads").insert({
        digital_fulfillment_id: fulfillmentId,
        download_token: downloadToken,
        download_count: 0,
        download_limit: 3,
        expires_at: expiresAt.toISOString(),
        source_ref: (item.type_meta.file_path as string) ?? null,
      });

      if (ebookError) {
        console.error("ebook_downloads insert error:", ebookError);
      }
    } else if (item.delivery_type === "gifticon") {
      // quantity개만큼 원자적 코드 예약 (SELECT FOR UPDATE SKIP LOCKED)
      // 하나라도 재고 소진으로 실패하면 이 fulfillment 전체를 취소 대상으로 본다 —
      // 이미 예약된 나머지 코드는 아직 유저에게 노출되지 않았으므로 재고 풀로 되돌린다.
      const claimedCodeIds: number[] = [];
      let stockExhausted = false;

      for (let q = 0; q < item.quantity; q++) {
        const { data: codeId, error: claimError } = await admin.rpc("claim_gifticon_code", {
          p_product_id: item.product_id,
          p_fulfillment_id: fulfillmentId,
        });

        if (claimError || codeId === null) {
          stockExhausted = true;
          break;
        }
        claimedCodeIds.push(codeId);
      }

      if (stockExhausted) {
        if (claimedCodeIds.length > 0) {
          await admin
            .from("gifticon_codes")
            .update({ status: "available", issued_to_fulfillment_id: null, issued_at: null })
            .in("id", claimedCodeIds);
        }

        await admin
          .from("digital_fulfillments")
          .update({ status: "cancelled" })
          .eq("id", fulfillmentId);

        if (tossRefund) {
          const cancelEncoded = Buffer.from(`${tossRefund.secretKey}:`).toString("base64");
          const cancelRes = await fetch(
            `https://api.tosspayments.com/v1/payments/${tossRefund.paymentKey}/cancel`,
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
        } else {
          // 0원 주문 — 환불할 실제 결제가 없으므로 취소 상태로 남기고 안내만 한다.
          partialFailures.push({ order_item_id: item.id, reason: "재고 소진으로 발급되지 않았습니다" });
        }
      }
    } else if (item.delivery_type === "coupon") {
      const couponId = item.type_meta.coupon_id as number | undefined;
      if (!couponId) continue;

      for (let q = 0; q < item.quantity; q++) {
        const { error: issueError } = await admin.from("user_coupons").insert({
          user_id: userId,
          coupon_id: couponId,
          // order_id + item_id + quantity_index로 결정론적 멱등 키 구성
          issue_epoch: `${orderId}_${item.id}_${q}`,
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

  return partialFailures;
}
