"use client";

import { use, useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Share2, ChevronRight, Lock, Loader2 } from "lucide-react";
import { useProducts, ShopProductDetail, ProductReview, ProductQna } from "@/hooks/useProducts";
import { useCart } from "@/hooks/useCart";
import { useWishlist } from "@/hooks/useWishlist";
import { useAuthStore } from "@/store/useAuthStore";
import LoginModal from "@/components/LoginModal";
import PageLoading from "@/components/PageLoading";

const DELIVERY_TYPE_LABELS: Record<string, string> = {
  physical: "배송",
  digital_download: "다운로드",
  gifticon: "기프티콘",
  coupon: "쿠폰",
};

const EVENT_BADGE_STYLES: Record<string, string> = {
  HOT: "bg-red-500 text-white",
  SALE: "bg-orange-500 text-white",
  NEW: "bg-green-500 text-white",
  LIMITED: "bg-purple-600 text-white",
};

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <span className="text-yellow-400">
      {Array.from({ length: max }, (_, i) => (
        <span key={i}>{i < Math.round(rating) ? "★" : "☆"}</span>
      ))}
    </span>
  );
}

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ category: string; id: string }>;
}) {
  const { category, id } = use(params);
  const { user } = useAuthStore();
  const { fetchProduct, fetchProductReviews, fetchProductQna } = useProducts();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist, fetchWishlist } = useWishlist();

  const [product, setProduct] = useState<ShopProductDetail | null>(null);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [qna, setQna] = useState<ProductQna[]>([]);
  const [qnaTotal, setQnaTotal] = useState(0);

  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("detail");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const [showStickyFooter, setShowStickyFooter] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cartLoading, setCartLoading] = useState(false);
  const [cartAdded, setCartAdded] = useState(false);
  const [wishlistPending, setWishlistPending] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  const detailRef = useRef<HTMLDivElement>(null);
  const reviewRef = useRef<HTMLDivElement>(null);
  const returnRef = useRef<HTMLDivElement>(null);
  const inquiryRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) fetchWishlist();
  }, [user, fetchWishlist]);

  useEffect(() => {
    async function load() {
      try {
        const productId = parseInt(id, 10);
        const [productData, reviewData, qnaData] = await Promise.all([
          fetchProduct(productId),
          fetchProductReviews(productId),
          fetchProductQna(productId),
        ]);

        if (!productData) {
          setError("상품을 찾을 수 없습니다.");
          return;
        }

        setProduct(productData);
        setReviews(reviewData.reviews);
        setReviewTotal(reviewData.total);
        setQna(qnaData.qna);
        setQnaTotal(qnaData.total);
      } catch {
        setError("상품 정보를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, fetchProduct, fetchProductReviews, fetchProductQna]);

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: "-20% 0px -70% 0px",
      threshold: 0,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.getAttribute("data-section");
          if (sectionId) setActiveTab(sectionId);
        }
      });
    }, observerOptions);

    [detailRef, reviewRef, returnRef, inquiryRef].forEach((ref) => {
      if (ref.current) observer.observe(ref.current);
    });

    return () => observer.disconnect();
  }, [product]);

  useEffect(() => {
    const handleScroll = () => {
      if (tabsRef.current) {
        const tabsRect = tabsRef.current.getBoundingClientRect();
        const shouldShow = tabsRect.top < 0;
        setShowStickyHeader(shouldShow);
        setShowStickyFooter(shouldShow);
        if (shouldShow) {
          document.body.setAttribute("data-hide-navbar", "true");
        } else {
          document.body.removeAttribute("data-hide-navbar");
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.body.removeAttribute("data-hide-navbar");
    };
  }, []);

  const tabs = [
    { id: "detail", label: "상세정보", ref: detailRef },
    { id: "review", label: `리뷰 (${reviewTotal})`, ref: reviewRef },
    { id: "return", label: "반품/교환정보", ref: returnRef },
    { id: "inquiry", label: `상품문의 (${qnaTotal})`, ref: inquiryRef },
  ];

  const scrollToSection = (sectionId: string) => {
    const ref = tabs.find((t) => t.id === sectionId)?.ref;
    if (ref?.current) {
      window.scrollTo({ top: ref.current.offsetTop - 100, behavior: "smooth" });
    }
    setActiveTab(sectionId);
  };

  const productId = parseInt(id, 10);

  const handleAddToCart = async () => {
    if (!user) { setLoginOpen(true); return; }
    if (cartLoading || cartAdded) return;
    setCartLoading(true);
    const success = await addToCart(productId, quantity);
    setCartLoading(false);
    if (success) {
      setCartAdded(true);
      setTimeout(() => setCartAdded(false), 2000);
    }
  };

  const handleToggleWishlist = async () => {
    if (!user) { setLoginOpen(true); return; }
    setWishlistPending(true);
    await toggleWishlist(productId);
    setWishlistPending(false);
  };

  if (loading) return <PageLoading />;

  if (error || !product) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-400 text-xl">{error ?? "상품을 찾을 수 없습니다."}</p>
          <Link href={`/shop/${category}`} className="text-brand-500 hover:underline">
            목록으로 돌아가기 →
          </Link>
        </div>
      </main>
    );
  }

  const details = product.product_details;
  const imageList =
    details?.images && details.images.length > 0
      ? [...details.images].sort((a, b) => a.order - b.order).map((img) => img.url)
      : product.thumbnail_url
      ? [product.thumbnail_url]
      : [];

  const isSoldOut = product.stock === 0;
  const effectiveDiscountRate =
    product.original_price && product.original_price > product.price
      ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
      : null;
  const hasDiscount = effectiveDiscountRate != null && effectiveDiscountRate > 0;
  const totalPrice = product.price * quantity;
  const categoryDisplayName = product.product_categories?.name ?? category;
  const typeMeta = (details?.type_meta ?? {}) as Record<string, string | number>;
  const deliveryLabel = DELIVERY_TYPE_LABELS[product.delivery_type] ?? product.delivery_type;
  const eventBadgeStyle = product.event_label
    ? (EVENT_BADGE_STYLES[product.event_label.toUpperCase()] ?? "bg-brand-500 text-white")
    : null;

  return (
    <>
    <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
    <main className="min-h-screen bg-black text-white">
<div className="max-w-7xl mx-auto px-4 py-8">
        {/* 상단: 이미지 + 구매 정보 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* 이미지 */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-zinc-900 border border-white/10">
              {imageList.length > 0 ? (
                <Image
                  src={imageList[currentImageIndex]}
                  alt={product.title}
                  fill
                  className={`object-cover ${isSoldOut ? "opacity-60" : ""}`}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600">
                  이미지 없음
                </div>
              )}

              {/* Event badge */}
              {product.event_label && eventBadgeStyle && (
                <span className={`absolute top-4 left-4 px-3 py-1 rounded text-sm font-bold ${eventBadgeStyle}`}>
                  {product.event_label.toUpperCase()}
                </span>
              )}

              {/* 품절 overlay */}
              {isSoldOut && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <span className="text-white text-2xl font-bold bg-black/70 px-6 py-3 rounded-lg">
                    품절
                  </span>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {imageList.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {imageList.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      currentImageIndex === idx
                        ? "border-brand-500"
                        : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    <Image src={img} alt={`${product.title} ${idx + 1}`} fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 구매 정보 */}
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {deliveryLabel && (
                    <span className="text-xs text-gray-400 border border-white/20 px-2 py-0.5 rounded">
                      {deliveryLabel}
                    </span>
                  )}
                </div>
                <h1 className="text-3xl font-bold mb-2">{product.title}</h1>
                {product.subtitle && <p className="text-xl text-gray-400">{product.subtitle}</p>}
                {product.description && <p className="text-sm text-gray-500 mt-2">{product.description}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={handleToggleWishlist}
                  disabled={wishlistPending}
                  className="p-2 rounded-lg border border-white/10 hover:border-white/30 transition-colors disabled:opacity-50"
                  aria-label="위시리스트"
                >
                  {wishlistPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Heart
                      className={`w-5 h-5 transition-colors ${
                        isInWishlist(productId) ? "fill-red-500 text-red-500" : ""
                      }`}
                    />
                  )}
                </button>
                <button className="p-2 rounded-lg border border-white/10 hover:border-white/30 transition-colors">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Rating */}
            {product.review_count > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <StarRating rating={product.average_rating} />
                <span>{product.average_rating.toFixed(1)}</span>
                <span>({product.review_count}개 리뷰)</span>
              </div>
            )}

            {/* 가격 */}
            <div className="py-4 border-t border-white/10">
              {hasDiscount && product.original_price != null && (
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-gray-500 line-through text-lg">
                    {product.original_price.toLocaleString()}원
                  </span>
                  <span className="text-brand-500 font-bold text-lg">
                    {effectiveDiscountRate}% 할인
                  </span>
                </div>
              )}
              <div className="text-4xl font-bold">{product.price.toLocaleString()}원</div>
            </div>

            {/* 배송비 */}
            {product.delivery_type === "physical" && (
              <div className="flex items-center justify-between py-3 border-b border-white/10">
                <span className="text-gray-400">배송비</span>
                <span className="font-medium">
                  {((typeMeta.shipping_fee as number) ?? 3000).toLocaleString()}원
                </span>
              </div>
            )}

            {/* 무이자 할부 */}
            <div className="flex items-center justify-between py-3 border-b border-white/10">
              <span className="text-gray-400">무이자 할부</span>
              <button className="text-brand-500 hover:underline flex items-center gap-1 text-sm">
                카드 자세히 보기
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* 수량 선택 */}
            {!isSoldOut && (
              <div className="bg-zinc-900 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">{product.title}</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-8 h-8 rounded border border-white/20 hover:border-white/40 transition-colors flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-medium">{quantity}</span>
                    <button
                      onClick={() => setQuantity((q) => q + 1)}
                      className="w-8 h-8 rounded border border-white/20 hover:border-white/40 transition-colors flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 총 구매 금액 */}
            {!isSoldOut && (
              <div className="flex items-center justify-between text-xl font-bold py-4">
                <span>총 구매 금액</span>
                <div className="text-3xl text-brand-500">{totalPrice.toLocaleString()}원</div>
              </div>
            )}

            {/* 버튼 */}
            {isSoldOut ? (
              <div className="py-4 px-6 rounded-lg bg-zinc-800 text-center text-gray-400 font-medium">
                현재 품절된 상품입니다
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={cartLoading}
                  className="py-4 px-6 rounded-lg border border-white/20 hover:border-white/40 transition-colors font-medium disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {cartLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : cartAdded ? (
                    "담기 완료 ✓"
                  ) : (
                    "장바구니"
                  )}
                </button>
                <button className="py-4 px-6 rounded-lg bg-brand-500 hover:bg-brand-600 transition-colors font-bold">
                  구매하기
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Header */}
        <div
          className={`fixed top-0 left-0 right-0 bg-black/95 backdrop-blur-md border-b border-white/10 z-50 transition-transform duration-300 ${
            showStickyHeader ? "translate-y-0" : "-translate-y-full"
          }`}
        >
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between py-4">
              <h2 className="text-lg font-bold truncate flex-1 mr-4">{product.title}</h2>
              <div className="flex gap-4">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => scrollToSection(tab.id)}
                    className={`pb-2 font-medium transition-colors relative text-sm ${
                      activeTab === tab.id ? "text-white" : "text-gray-400 hover:text-gray-300"
                    }`}
                  >
                    {tab.label}
                    {activeTab === tab.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 탭 메뉴 */}
        <div ref={tabsRef} className="border-b border-white/10 mb-8">
          <div className="flex gap-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => scrollToSection(tab.id)}
                className={`pb-4 font-medium transition-colors relative ${
                  activeTab === tab.id ? "text-white" : "text-gray-400 hover:text-gray-300"
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 상세정보 탭 */}
        <div ref={detailRef} data-section="detail" className="space-y-12 mb-16">
          {/* type_meta 상세 필드 */}
          {Object.keys(typeMeta).length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-6">상세정보</h2>
              <div className="bg-zinc-900 rounded-lg overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2">
                  {[
                    { label: "상품명", value: product.title + (product.subtitle ? ` - ${product.subtitle}` : "") },
                    ...(typeMeta.author ? [{ label: "저자", value: String(typeMeta.author) }] : []),
                    ...(typeMeta.publisher ? [{ label: "출판사", value: String(typeMeta.publisher) }] : []),
                    ...(typeMeta.publish_date ? [{ label: "출판일", value: String(typeMeta.publish_date) }] : []),
                    ...(typeMeta.isbn ? [{ label: "ISBN", value: String(typeMeta.isbn) }] : []),
                    ...(typeMeta.page_count ? [{ label: "페이지 수", value: `${typeMeta.page_count}p` }] : []),
                    ...(typeMeta.book_type ? [{ label: "출판형태", value: String(typeMeta.book_type) }] : []),
                    ...(typeMeta.size ? [{ label: "사이즈", value: String(typeMeta.size) }] : []),
                    ...(typeMeta.material ? [{ label: "소재", value: String(typeMeta.material) }] : []),
                    ...(typeMeta.age_limit ? [{ label: "연령 제한", value: String(typeMeta.age_limit) }] : []),
                    ...(typeMeta.published_by ? [{ label: "제조사", value: String(typeMeta.published_by) }] : []),
                    ...(typeMeta.distributor ? [{ label: "A/S문의", value: String(typeMeta.distributor) }] : []),
                    ...(deliveryLabel ? [{ label: "배송유형", value: deliveryLabel }] : []),
                  ].map((item, idx) => (
                    <div
                      key={item.label}
                      className={`flex gap-4 px-6 py-4 border-b border-white/10 ${idx % 2 === 0 ? "md:border-r" : ""}`}
                    >
                      <span className="text-gray-400 font-medium w-24 shrink-0">{item.label}</span>
                      <span>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* 저자 소개 */}
          {typeMeta.author_introduction && (
            <section>
              <h2 className="text-2xl font-bold mb-6">저자 소개</h2>
              <div className="bg-zinc-900 rounded-lg p-6">
                <div
                  className="text-gray-300 leading-relaxed prose prose-invert max-w-none [&_li>p]:my-0"
                  dangerouslySetInnerHTML={{ __html: String(typeMeta.author_introduction) }}
                />
              </div>
            </section>
          )}

          {/* 상품 소개 */}
          {(details?.detailed_description || product.description) && (
            <section>
              <h2 className="text-2xl font-bold mb-6">상품 소개</h2>
              <div className="bg-zinc-900 rounded-lg p-6">
                <div
                  className="text-gray-300 leading-relaxed prose prose-invert max-w-none [&_li>p]:my-0"
                  dangerouslySetInnerHTML={{
                    __html: details?.detailed_description || product.description || "",
                  }}
                />
              </div>
            </section>
          )}

          {/* 도서 목차 */}
          {typeMeta.table_of_contents && (
            <section>
              <h2 className="text-2xl font-bold mb-6">도서 목차</h2>
              <div className="bg-zinc-900 rounded-lg p-6">
                <div
                  className="text-gray-300 leading-relaxed prose prose-invert max-w-none [&_li>p]:my-0"
                  dangerouslySetInnerHTML={{ __html: String(typeMeta.table_of_contents) }}
                />
              </div>
            </section>
          )}

          {/* notes */}
          {details?.notes && (
            <section>
              <h2 className="text-2xl font-bold mb-6">유의사항</h2>
              <div className="bg-zinc-900 rounded-lg p-6">
                <div
                  className="text-gray-300 leading-relaxed prose prose-invert max-w-none [&_li>p]:my-0"
                  dangerouslySetInnerHTML={{ __html: details.notes }}
                />
              </div>
            </section>
          )}
        </div>

        {/* 리뷰 탭 */}
        <div ref={reviewRef} data-section="review" className="space-y-8 mb-16">
          <section className="bg-zinc-900 rounded-lg p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">리뷰</h2>
              <p className="text-gray-400">고객님의 소중한 후기를 남겨주세요.</p>
            </div>
            <div className="grid grid-cols-3 gap-8 mb-8">
              <div className="text-center">
                <div className="text-gray-400 mb-2">상품만족도</div>
                <div className="text-3xl font-bold">
                  <span className="text-brand-500">{product.average_rating || 0}</span> / 5
                </div>
              </div>
              <div className="text-center">
                <div className="text-gray-400 mb-2">리뷰 개수</div>
                <div className="text-3xl font-bold">{product.review_count || 0}</div>
              </div>
              <div className="text-center border-l border-white/10 pl-8">
                <div className="text-gray-400 mb-4">고객님의 리뷰를 공유해주세요!</div>
                <button className="px-6 py-2 bg-brand-500 hover:bg-brand-600 rounded-lg font-medium transition-colors">
                  리뷰 작성하기
                </button>
              </div>
            </div>
          </section>

          {reviews.length > 0 ? (
            <section className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="bg-zinc-900 rounded-lg p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <StarRating rating={review.rating} />
                      {review.is_verified_purchase && (
                        <span className="text-xs text-green-400 border border-green-400/30 px-2 py-0.5 rounded">
                          구매 확인
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(review.created_at).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                  {review.title && <p className="font-semibold">{review.title}</p>}
                  <p className="text-gray-300 text-sm leading-relaxed">{review.content}</p>
                  {review.helpful_count > 0 && (
                    <p className="text-xs text-gray-500">도움이 됐어요 {review.helpful_count}명</p>
                  )}
                </div>
              ))}
            </section>
          ) : (
            <section className="bg-zinc-900 rounded-lg p-8">
              <div className="text-center py-12">
                <p className="text-gray-400">아직 리뷰가 없습니다.</p>
              </div>
            </section>
          )}
        </div>

        {/* 반품/교환 탭 */}
        <div ref={returnRef} data-section="return" className="bg-zinc-900 rounded-lg p-8 mb-16">
          <h2 className="text-2xl font-bold mb-6">상품 결제 정보</h2>
          <div className="space-y-6 text-gray-300 leading-relaxed">
            <section>
              <h3 className="text-lg font-semibold text-white mb-3">배송 안내</h3>
              <ul className="space-y-2 text-sm">
                <li>• 배송비: 3,000원 (50,000원 이상 구매 시 무료배송)</li>
                <li>• 배송 기간: 주문 후 2-3일 소요</li>
                <li>• 제주도 및 도서산간 지역은 추가 배송비가 발생할 수 있습니다.</li>
              </ul>
            </section>
            <section>
              <h3 className="text-lg font-semibold text-white mb-3">교환/반품 안내</h3>
              <ul className="space-y-2 text-sm">
                <li>• 교환 및 반품은 상품 수령 후 7일 이내 가능합니다.</li>
                <li>• 단순 변심에 의한 교환/반품 시 왕복 배송비는 고객 부담입니다.</li>
                <li>• 상품 하자 또는 오배송의 경우 무료로 교환/반품 가능합니다.</li>
                <li>• 포장을 개봉하였거나 사용한 흔적이 있는 경우 교환/반품이 불가능합니다.</li>
              </ul>
            </section>
          </div>
        </div>

        {/* Q&A 탭 */}
        <div ref={inquiryRef} data-section="inquiry" className="space-y-6 mb-16">
          <section className="bg-zinc-900 rounded-lg p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Q&A</h2>
              <p className="text-gray-400">상품의 궁금한 점을 해결해 드립니다.</p>
            </div>
            {qna.length > 0 ? (
              <div className="divide-y divide-white/10">
                {qna.map((item) => (
                  <div key={item.id} className="py-4 space-y-2">
                    <div className="flex items-center gap-4">
                      <span className="font-medium">Q.</span>
                      <span className="flex-1">{item.title}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(item.created_at).toLocaleDateString("ko-KR")}
                      </span>
                    </div>
                    {item.answer && (
                      <div className="flex items-start gap-4 pl-6 text-gray-300 text-sm">
                        <span className="text-brand-500 font-medium shrink-0">A.</span>
                        <span>{item.answer}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400">등록된 Q&A가 없습니다.</p>
              </div>
            )}
            <div className="flex justify-center gap-3 mt-8">
              <button className="px-6 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors font-medium">
                문의하기
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Sticky Footer */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-md border-t border-white/10 z-50 transition-transform duration-300 ${
          showStickyFooter ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-400">총 구매 금액</div>
              <div className="text-2xl font-bold text-brand-500">
                {isSoldOut ? "품절" : `${totalPrice.toLocaleString()}원`}
              </div>
            </div>
            {!isSoldOut && (
              <div className="flex gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={cartLoading}
                  className="px-6 py-3 rounded-lg border border-white/20 hover:border-white/40 transition-colors font-medium disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {cartLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : cartAdded ? (
                    "담기 완료 ✓"
                  ) : (
                    "장바구니"
                  )}
                </button>
                <button className="px-8 py-3 rounded-lg bg-brand-500 hover:bg-brand-600 transition-colors font-bold">
                  구매하기
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
    </>
  );
}
