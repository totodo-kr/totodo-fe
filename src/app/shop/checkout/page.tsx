"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Loader2, AlertCircle, ChevronLeft, Package, CreditCard, Building2, Smartphone, Landmark, Ticket } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { useOrders, type OrderItem } from "@/hooks/useOrders";
import { useCouponValidate } from "@/hooks/useCouponValidate";
import type { UserCoupon } from "@/types/coupon";

interface CartItem {
  id: number;
  product_id: number;
  title: string;
  price: number;
  original_price?: number | null;
  thumbnail_url?: string | null;
  delivery_type: string;
  quantity: number;
  stock?: number | null;
}

interface FormErrors {
  recipient_name?: string;
  recipient_phone?: string;
  shipping_address?: string;
}

type PaymentMethod = "CARD" | "TRANSFER" | "VIRTUAL_ACCOUNT" | "MOBILE_PHONE";

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { value: "CARD", label: "신용/체크카드", icon: <CreditCard size={18} /> },
  { value: "TRANSFER", label: "계좌이체", icon: <Building2 size={18} /> },
  { value: "VIRTUAL_ACCOUNT", label: "가상계좌", icon: <Landmark size={18} /> },
  { value: "MOBILE_PHONE", label: "휴대폰", icon: <Smartphone size={18} /> },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TossPayment = any;

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuthStore();
  const { creating, createOrder } = useOrders();
  const {
    availableCoupons,
    selectedCouponId,
    discount: couponDiscount,
    loading: couponsLoading,
    validating: couponValidating,
    fetchAvailableCoupons,
    selectCoupon,
    clearCoupon,
  } = useCouponValidate();

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartLoading, setCartLoading] = useState(true);

  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingZipcode, setShippingZipcode] = useState("");
  const [shippingMemo, setShippingMemo] = useState("");
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("CARD");
  const paymentRef = useRef<TossPayment>(null);
  const [paymentReady, setPaymentReady] = useState(false);
  const [paymentInitError, setPaymentInitError] = useState<string | null>(null);
  const [requestingPayment, setRequestingPayment] = useState(false);

  const totalProductPrice = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const hasPhysical = cartItems.some((item) => item.delivery_type === "physical");
  const shippingFee = hasPhysical && totalProductPrice < 50000 ? 3000 : 0;
  const appliedCouponDiscount = couponDiscount?.coupon_discount ?? 0;
  const appliedShippingDiscount = couponDiscount?.shipping_discount ?? 0;
  const totalDiscount = appliedCouponDiscount + appliedShippingDiscount;
  const finalPrice = totalProductPrice + shippingFee - totalDiscount;

  // ─── Fetch cart items ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    async function fetchCart() {
      setCartLoading(true);
      const supabase = createClient();

      const { data, error } = await supabase
        .from("cart_items")
        .select(
          `id, quantity,
           products (
             id, title, price, thumbnail_url, delivery_type, stock
           )`
        )
        .eq("user_id", user!.id);

      if (error) {
        console.error("Cart fetch error:", error);
        setCartLoading(false);
        return;
      }

      const items: CartItem[] = (data ?? []).map((row) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p = (row as any).products as {
          id: number;
          title: string;
          price: number;
          thumbnail_url: string | null;
          delivery_type: string;
          stock: number | null;
        };
        return {
          id: row.id,
          product_id: p.id,
          title: p.title,
          price: p.price,
          thumbnail_url: p.thumbnail_url,
          delivery_type: p.delivery_type,
          quantity: row.quantity,
          stock: p.stock,
        };
      });

      setCartItems(items);
      setCartLoading(false);
    }

    fetchCart();
  }, [user]);

  // ─── Initialize Toss Payments ────────────────────────────────────────────────
  const initTossPayments = useCallback(async () => {
    if (!user) return;

    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
    if (!clientKey) {
      setPaymentInitError("NEXT_PUBLIC_TOSS_CLIENT_KEY 환경변수가 설정되지 않았습니다.");
      return;
    }

    try {
      const { loadTossPayments } = await import("@tosspayments/tosspayments-sdk");
      const tossPayments = await loadTossPayments(clientKey);
      paymentRef.current = tossPayments.payment({ customerKey: user.id });
      setPaymentReady(true);
    } catch (err) {
      console.error("Toss init error:", err);
      setPaymentInitError("결제 모듈 초기화에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
  }, [user]);

  useEffect(() => {
    if (!cartLoading && cartItems.length > 0) {
      initTossPayments();
      fetchAvailableCoupons();
    }
  }, [cartLoading, initTossPayments, fetchAvailableCoupons]);

  // ─── Auth redirect ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [authLoading, user, router]);

  // ─── Form validation ─────────────────────────────────────────────────────────
  function validateForm(): boolean {
    const errors: FormErrors = {};

    if (!recipientName.trim()) {
      errors.recipient_name = "수령인 이름을 입력해주세요.";
    }
    if (!recipientPhone.trim()) {
      errors.recipient_phone = "연락처를 입력해주세요.";
    } else if (!/^[0-9]{10,11}$/.test(recipientPhone.replace(/-/g, ""))) {
      errors.recipient_phone = "올바른 전화번호를 입력해주세요.";
    }
    if (!shippingAddress.trim()) {
      errors.shipping_address = "배송 주소를 입력해주세요.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ─── Payment handler ─────────────────────────────────────────────────────────
  async function handlePayment() {
    if (!validateForm()) return;
    if (!paymentRef.current || !paymentReady) {
      alert("결제 모듈이 아직 로딩 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    if (cartItems.length === 0) {
      alert("장바구니가 비어있습니다.");
      return;
    }

    setRequestingPayment(true);

    try {
      const orderItems: OrderItem[] = cartItems.map((item) => ({
        product_id: item.product_id,
        product_name: item.title,
        product_price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity,
      }));

      const result = await createOrder({
        items: orderItems,
        total_product_price: totalProductPrice,
        total_shipping_fee: shippingFee,
        total_discount: totalDiscount,
        final_price: finalPrice,
        recipient_name: recipientName.trim(),
        recipient_phone: recipientPhone.trim(),
        shipping_address: shippingAddress.trim(),
        shipping_zipcode: shippingZipcode.trim() || undefined,
        shipping_memo: shippingMemo.trim() || undefined,
        user_coupon_id: selectedCouponId ?? undefined,
        coupon_discount: totalDiscount || undefined,
      });

      if (!result) {
        alert("주문 생성에 실패했습니다. 다시 시도해주세요.");
        setRequestingPayment(false);
        return;
      }

      sessionStorage.setItem("pending_order_id", String(result.order_id));
      sessionStorage.setItem("pending_order_number", result.order_number);

      const orderName =
        cartItems.length === 1
          ? cartItems[0].title
          : `${cartItems[0].title} 외 ${cartItems.length - 1}건`;

      // order_number를 Toss orderId로 사용 — 별도 pg 전용 컬럼 불필요
      await paymentRef.current.requestPayment({
        method: selectedMethod,
        amount: { currency: "KRW", value: finalPrice },
        orderId: result.order_number,
        orderName,
        successUrl: `${window.location.origin}/shop/payment/success`,
        failUrl: `${window.location.origin}/shop/payment/fail`,
        customerEmail: user?.email ?? undefined,
        customerName: recipientName.trim(),
      });
    } catch (err) {
      console.error("Payment request error:", err);
      setRequestingPayment(false);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  if (authLoading || cartLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </main>
    );
  }

  if (!user) return null;

  if (!cartLoading && cartItems.length === 0) {
    return (
      <main className="min-h-screen py-16 px-6 flex flex-col items-center justify-center gap-6">
        <Package size={56} className="text-gray-600" />
        <h1 className="text-2xl font-bold text-white">장바구니가 비어있습니다</h1>
        <Link
          href="/shop"
          className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-bold transition-colors"
        >
          상점 둘러보기
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen py-12 px-4 sm:px-6">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-10">
          <Link
            href="/shop/cart"
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">주문 / 결제</h1>
            <p className="text-gray-400 text-sm mt-1">
              주문 정보를 확인하고 결제를 완료해주세요
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ─── Left Column ─────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recipient Info */}
            <section className="bg-zinc-900 rounded-xl border border-white/10 p-6">
              <h2 className="text-xl font-bold text-white mb-5">수령인 정보</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">
                    수령인 이름 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="홍길동"
                    className={`w-full px-4 py-3 bg-black/30 border rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 transition-colors ${
                      formErrors.recipient_name
                        ? "border-red-500 focus:ring-red-500/30"
                        : "border-white/10 focus:border-brand-500 focus:ring-brand-500/20"
                    }`}
                  />
                  {formErrors.recipient_name && (
                    <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle size={12} />
                      {formErrors.recipient_name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">
                    연락처 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    placeholder="01012345678"
                    className={`w-full px-4 py-3 bg-black/30 border rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 transition-colors ${
                      formErrors.recipient_phone
                        ? "border-red-500 focus:ring-red-500/30"
                        : "border-white/10 focus:border-brand-500 focus:ring-brand-500/20"
                    }`}
                  />
                  {formErrors.recipient_phone && (
                    <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle size={12} />
                      {formErrors.recipient_phone}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">
                    배송 주소 <span className="text-red-400">*</span>
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={shippingZipcode}
                      onChange={(e) => setShippingZipcode(e.target.value)}
                      placeholder="우편번호"
                      className="w-32 px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors"
                    />
                  </div>
                  <input
                    type="text"
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="도로명 주소를 입력해주세요"
                    className={`w-full px-4 py-3 bg-black/30 border rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 transition-colors ${
                      formErrors.shipping_address
                        ? "border-red-500 focus:ring-red-500/30"
                        : "border-white/10 focus:border-brand-500 focus:ring-brand-500/20"
                    }`}
                  />
                  {formErrors.shipping_address && (
                    <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle size={12} />
                      {formErrors.shipping_address}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">
                    배송 메모 <span className="text-gray-600 text-xs">(선택)</span>
                  </label>
                  <select
                    value={shippingMemo}
                    onChange={(e) => setShippingMemo(e.target.value)}
                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors appearance-none"
                  >
                    <option value="">배송 메모를 선택해주세요</option>
                    <option value="문 앞에 놓아주세요">문 앞에 놓아주세요</option>
                    <option value="경비실에 맡겨주세요">경비실에 맡겨주세요</option>
                    <option value="부재 시 문자 남겨주세요">부재 시 문자 남겨주세요</option>
                    <option value="배송 전 연락주세요">배송 전 연락주세요</option>
                    <option value="직접 입력">직접 입력</option>
                  </select>
                  {shippingMemo === "직접 입력" && (
                    <input
                      type="text"
                      placeholder="메모를 입력해주세요"
                      className="mt-2 w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors"
                      onChange={(e) => setShippingMemo(e.target.value)}
                    />
                  )}
                </div>
              </div>
            </section>

            {/* Payment Method */}
            <section className="bg-zinc-900 rounded-xl border border-white/10 p-6">
              <h2 className="text-xl font-bold text-white mb-5">결제 수단</h2>

              {paymentInitError ? (
                <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-400 font-medium text-sm">결제 초기화 오류</p>
                    <p className="text-red-400/80 text-xs mt-1">{paymentInitError}</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {PAYMENT_METHODS.map((method) => (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setSelectedMethod(method.value)}
                      className={`flex flex-col items-center justify-center gap-2 py-4 rounded-lg border text-sm font-medium transition-colors ${
                        selectedMethod === method.value
                          ? "border-brand-500 bg-brand-500/10 text-brand-400"
                          : "border-white/10 text-gray-400 hover:border-white/30 hover:text-white"
                      }`}
                    >
                      {method.icon}
                      {method.label}
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>

            {/* Coupon */}
            <section className="bg-zinc-900 rounded-xl border border-white/10 p-6">
              <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
                <Ticket className="w-5 h-5 text-brand-500" />
                쿠폰 적용
              </h2>

              {couponsLoading ? (
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  쿠폰 목록 불러오는 중...
                </div>
              ) : availableCoupons.length === 0 ? (
                <p className="text-gray-500 text-sm">사용 가능한 쿠폰이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {/* 쿠폰 미사용 */}
                  <CouponSelectCard
                    selected={selectedCouponId === null}
                    onClick={clearCoupon}
                    label="쿠폰 사용 안함"
                  />
                  {availableCoupons.map((uc) => (
                    <CouponSelectCard
                      key={uc.id}
                      selected={selectedCouponId === uc.id}
                      onClick={() => selectCoupon(uc.id, totalProductPrice, shippingFee)}
                      label={uc.coupon?.name ?? "—"}
                      sub={formatCouponLabel(uc)}
                      loading={couponValidating && selectedCouponId !== uc.id}
                    />
                  ))}
                </div>
              )}

              {couponDiscount && totalDiscount > 0 && (
                <p className="mt-3 text-sm font-medium text-brand-400">
                  {totalDiscount.toLocaleString()}원 할인 적용됨
                </p>
              )}
            </section>
          </div>

          {/* ─── Right Column: Order Summary ──────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="bg-zinc-900 rounded-xl border border-white/10 p-6 sticky top-20">
              <h2 className="text-xl font-bold text-white mb-5">주문 요약</h2>

              <div className="space-y-3 mb-5">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-3 items-start">
                    {item.thumbnail_url ? (
                      <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-zinc-800">
                        <Image
                          src={item.thumbnail_url}
                          alt={item.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-zinc-800 shrink-0 flex items-center justify-center">
                        <Package size={20} className="text-gray-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium leading-tight line-clamp-2">
                        {item.title}
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        {item.quantity}개 × {item.price.toLocaleString()}원
                      </p>
                    </div>
                    <span className="text-white text-sm font-medium shrink-0">
                      {(item.price * item.quantity).toLocaleString()}원
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/10 pt-4 space-y-2.5">
                <div className="flex justify-between text-sm text-gray-400">
                  <span>상품 금액</span>
                  <span>{totalProductPrice.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between text-sm text-gray-400">
                  <span>배송비</span>
                  <span>{shippingFee > 0 ? `${shippingFee.toLocaleString()}원` : "무료"}</span>
                </div>
                {appliedCouponDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-400">
                    <span>쿠폰 할인</span>
                    <span>-{appliedCouponDiscount.toLocaleString()}원</span>
                  </div>
                )}
                {appliedShippingDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-400">
                    <span>배송비 할인</span>
                    <span>-{appliedShippingDiscount.toLocaleString()}원</span>
                  </div>
                )}
                <div className="border-t border-white/10 pt-3 flex justify-between">
                  <span className="text-white font-bold">총 결제금액</span>
                  <span className="text-brand-500 font-bold text-xl">
                    {finalPrice.toLocaleString()}원
                  </span>
                </div>
              </div>

              <button
                onClick={handlePayment}
                disabled={creating || requestingPayment || !paymentReady || !!paymentInitError}
                className="mt-6 w-full py-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold text-base transition-colors flex items-center justify-center gap-2"
              >
                {creating || requestingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  `${finalPrice.toLocaleString()}원 결제하기`
                )}
              </button>

              <p className="mt-3 text-xs text-gray-500 text-center">
                결제 시 이용약관 및 개인정보처리방침에 동의하게 됩니다
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function formatCouponLabel(uc: UserCoupon) {
  const c = uc.coupon;
  if (!c) return "";
  if (c.discount_type === "fixed") return `${c.discount_value.toLocaleString()}원 할인`;
  if (c.discount_type === "percentage") {
    const base = `${c.discount_value}% 할인`;
    return c.max_discount_amount ? `${base} (최대 ${c.max_discount_amount.toLocaleString()}원)` : base;
  }
  return "무료배송";
}

function CouponSelectCard({
  selected,
  onClick,
  label,
  sub,
  loading,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  sub?: string;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-colors disabled:opacity-50 ${
        selected
          ? "border-brand-500 bg-brand-500/10"
          : "border-white/10 hover:border-white/30"
      }`}
    >
      <div
        className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
          selected ? "border-brand-500" : "border-gray-600"
        }`}
      >
        {selected && <div className="w-2 h-2 rounded-full bg-brand-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${selected ? "text-brand-400" : "text-gray-300"}`}>
          {label}
        </p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
      {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-500 shrink-0" />}
    </button>
  );
}
