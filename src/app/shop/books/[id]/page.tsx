"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { Heart, Share2, ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface BookDetail {
  id: number;
  title: string;
  subtitle: string | null;
  description: string | null;
  price: number;
  thumbnail_url: string | null;
  review_count: number;
  average_rating: number;
  shipping_fee: number;
  author: string | null;
  publisher: string | null;
  publish_date: string | null;
  size: string | null;
  material: string | null;
  published_by: string | null;
  distributor: string | null;
  detailed_description: string | null;
  images: Array<{ url: string; order: number; alt: string }>;
}

export default function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("detail");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const [showStickyFooter, setShowStickyFooter] = useState(false);
  const [book, setBook] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs for each section
  const detailRef = useRef<HTMLDivElement>(null);
  const reviewRef = useRef<HTMLDivElement>(null);
  const returnRef = useRef<HTMLDivElement>(null);
  const inquiryRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  // 데이터 로딩
  useEffect(() => {
    async function fetchBookDetail() {
      try {
        const supabase = createClient();
        const resolvedParams = await params;

        // products와 product_details 조인해서 가져오기
        const { data, error } = await supabase
          .from("products")
          .select(
            `
            id,
            title,
            subtitle,
            description,
            price,
            thumbnail_url,
            review_count,
            average_rating,
            product_details (
              shipping_fee,
              author,
              publisher,
              publish_date,
              size,
              material,
              published_by,
              distributor,
              detailed_description,
              images
            )
          `
          )
          .eq("id", resolvedParams.id)
          .eq("is_active", true)
          .single();

        if (error) {
          console.error("Error fetching book:", error);
          throw error;
        }

        if (!data) {
          throw new Error("상품을 찾을 수 없습니다.");
        }

        // 데이터 변환 (product_details는 배열로 반환됨)
        const details = Array.isArray(data.product_details)
          ? data.product_details[0]
          : data.product_details;

        const bookData: BookDetail = {
          id: data.id,
          title: data.title,
          subtitle: data.subtitle,
          description: data.description,
          price: data.price,
          thumbnail_url: data.thumbnail_url,
          review_count: data.review_count,
          average_rating: data.average_rating,
          shipping_fee: details?.shipping_fee || 3000,
          author: details?.author || null,
          publisher: details?.publisher || null,
          publish_date: details?.publish_date || null,
          size: details?.size || null,
          material: details?.material || null,
          published_by: details?.published_by || null,
          distributor: details?.distributor || null,
          detailed_description: details?.detailed_description || null,
          images: details?.images || [],
        };

        setBook(bookData);
      } catch (err) {
        console.error("Error:", err);
        setError("상품 정보를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }

    fetchBookDetail();
  }, [params]);

  // Intersection Observer for auto-switching tabs based on scroll
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: "-20% 0px -70% 0px",
      threshold: 0,
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.getAttribute("data-section");
          if (sectionId) {
            setActiveTab(sectionId);
          }
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Observe all sections
    [detailRef, reviewRef, returnRef, inquiryRef].forEach((ref) => {
      if (ref.current) {
        observer.observe(ref.current);
      }
    });

    return () => observer.disconnect();
  }, []);

  // Scroll observer for sticky header and footer
  useEffect(() => {
    const handleScroll = () => {
      // Show sticky header and footer when tabs go out of view
      if (tabsRef.current) {
        const tabsRect = tabsRef.current.getBoundingClientRect();
        const shouldShow = tabsRect.top < 0;
        setShowStickyHeader(shouldShow);
        setShowStickyFooter(shouldShow);

        // Hide Navbar when sticky header is shown
        if (shouldShow) {
          document.body.setAttribute("data-hide-navbar", "true");
        } else {
          document.body.removeAttribute("data-hide-navbar");
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Check initial state

    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.body.removeAttribute("data-hide-navbar");
    };
  }, []);

  // 데이터 기반 변수 및 함수
  const handleQuantityChange = (change: number) => {
    const newQuantity = quantity + change;
    if (newQuantity >= 1) {
      setQuantity(newQuantity);
    }
  };

  const totalPrice = book ? book.price * quantity : 0;
  const imageList =
    book?.images && book.images.length > 0
      ? book.images.sort((a, b) => a.order - b.order).map((img) => img.url)
      : book?.thumbnail_url
      ? [book.thumbnail_url]
      : [];

  const tabs = [
    { id: "detail", label: "상세정보", ref: detailRef },
    { id: "review", label: `리뷰 (${book?.review_count || 0})`, ref: reviewRef },
    { id: "return", label: "반품/교환정보", ref: returnRef },
    { id: "inquiry", label: "상품문의 (0)", ref: inquiryRef },
  ];

  // Smooth scroll to section when tab is clicked
  const scrollToSection = (sectionId: string) => {
    const ref = tabs.find((tab) => tab.id === sectionId)?.ref;
    if (ref?.current) {
      const offsetTop = ref.current.offsetTop - 100; // Account for sticky header
      window.scrollTo({
        top: offsetTop,
        behavior: "smooth",
      });
    }
    setActiveTab(sectionId);
  };

  // 로딩 상태
  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent"></div>
          <p className="mt-4 text-gray-400">상품 정보를 불러오는 중...</p>
        </div>
      </main>
    );
  }

  // 에러 상태
  if (error || !book) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">{error || "상품을 찾을 수 없습니다."}</p>
          <Link href="/shop/books" className="text-brand-500 hover:underline">
            도서 목록으로 돌아가기 →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Breadcrumb */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <span>/</span>
            <Link href="/shop" className="hover:text-white transition-colors">
              쇼핑
            </Link>
            <span>/</span>
            <span className="text-white">도서</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 상단 섹션: 이미지 + 구매 정보 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* 왼쪽: 이미지 */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-zinc-900 border border-white/10">
              {imageList.length > 0 ? (
                <Image
                  src={imageList[currentImageIndex]}
                  alt={book.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600">
                  이미지 없음
                </div>
              )}
            </div>
            {/* 썸네일 */}
            {imageList.length > 1 && (
              <div className="flex gap-2">
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
                    <Image
                      src={img}
                      alt={`${book.title} ${idx + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 오른쪽: 구매 정보 */}
          <div className="space-y-6">
            {/* 제목과 아이콘 */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">{book.title}</h1>
                <p className="text-xl text-gray-400">{book.subtitle}</p>
                <p className="text-sm text-gray-500 mt-2">{book.description}</p>
              </div>
              <div className="flex gap-2">
                <button className="p-2 rounded-lg border border-white/10 hover:border-white/30 transition-colors">
                  <Heart className="w-5 h-5" />
                </button>
                <button className="p-2 rounded-lg border border-white/10 hover:border-white/30 transition-colors">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 가격 */}
            <div className="py-4 border-t border-white/10">
              <div className="text-4xl font-bold">{book.price.toLocaleString()}원</div>
            </div>

            {/* 배송비 */}
            <div className="flex items-center justify-between py-3 border-b border-white/10">
              <span className="text-gray-400">배송비</span>
              <span className="font-medium">{book.shipping_fee.toLocaleString()}원</span>
            </div>

            {/* 무이자 할부 */}
            <div className="flex items-center justify-between py-3 border-b border-white/10">
              <span className="text-gray-400">무이자 할부</span>
              <button className="text-brand-500 hover:underline flex items-center gap-1">
                카드 자세히 보기
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* 제품 선택 */}
            <div className="bg-zinc-900 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">{book.title} 개론</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleQuantityChange(-1)}
                    className="w-8 h-8 rounded border border-white/20 hover:border-white/40 transition-colors flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-medium">{quantity}</span>
                  <button
                    onClick={() => handleQuantityChange(1)}
                    className="w-8 h-8 rounded border border-white/20 hover:border-white/40 transition-colors flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">{book.price.toLocaleString()}원</span>
              </div>
            </div>

            {/* 총 구매 금액 */}
            <div className="flex items-center justify-between text-xl font-bold py-4">
              <span>총 구매 금액</span>
              <div className="text-right">
                <div className="text-3xl text-brand-500">{totalPrice.toLocaleString()}원</div>
                <div className="text-xs text-gray-400 font-normal">(17할)</div>
              </div>
            </div>

            {/* 버튼 */}
            <div className="grid grid-cols-2 gap-3">
              <button className="py-4 px-6 rounded-lg border border-white/20 hover:border-white/40 transition-colors font-medium">
                장바구니
              </button>
              <button className="py-4 px-6 rounded-lg bg-brand-500 hover:bg-brand-600 transition-colors font-bold">
                구매하기
              </button>
            </div>
          </div>
        </div>

        {/* Sticky Header - appears on scroll and covers Navbar */}
        <div
          className={`fixed top-0 left-0 right-0 bg-black/95 backdrop-blur-md border-b border-white/10 z-50 transition-transform duration-300 ${
            showStickyHeader ? "translate-y-0" : "-translate-y-full"
          }`}
        >
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between py-4">
              <h2 className="text-lg font-bold truncate flex-1 mr-4">{book.title}</h2>
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

        {/* 탭 컨텐츠 */}
        <div ref={detailRef} data-section="detail" className="space-y-12">
          {/* 책 소개 */}
          <section>
            <h2 className="text-2xl font-bold mb-6">책 소개</h2>
            <div className="bg-zinc-900 rounded-lg p-6">
              <p className="text-gray-300 leading-relaxed mb-4">
                {book.detailed_description || book.description || "상세 설명이 준비 중입니다."}
              </p>
              {imageList.length > 0 && (
                <div className="relative aspect-3/4 max-w-md mx-auto rounded-lg overflow-hidden">
                  <Image src={imageList[0]} alt={book.title} fill className="object-cover" />
                </div>
              )}
            </div>
          </section>

          {/* 상세정보 */}
          <section>
            <h2 className="text-2xl font-bold mb-6">상세정보</h2>
            <div className="bg-zinc-900 rounded-lg overflow-hidden">
              <table className="w-full">
                <tbody className="divide-y divide-white/10">
                  <tr>
                    <td className="px-6 py-4 text-gray-400 font-medium w-1/4">제품명</td>
                    <td className="px-6 py-4">
                      {book.title}
                      {book.subtitle && ` - ${book.subtitle}`}
                    </td>
                  </tr>
                  {book.author && (
                    <tr>
                      <td className="px-6 py-4 text-gray-400 font-medium">저자</td>
                      <td className="px-6 py-4">{book.author}</td>
                    </tr>
                  )}
                  {book.publisher && (
                    <tr>
                      <td className="px-6 py-4 text-gray-400 font-medium">출판사</td>
                      <td className="px-6 py-4">{book.publisher}</td>
                    </tr>
                  )}
                  {book.size && (
                    <tr>
                      <td className="px-6 py-4 text-gray-400 font-medium">사이즈</td>
                      <td className="px-6 py-4">{book.size}</td>
                    </tr>
                  )}
                  {book.publish_date && (
                    <tr>
                      <td className="px-6 py-4 text-gray-400 font-medium">출판일</td>
                      <td className="px-6 py-4">{book.publish_date}</td>
                    </tr>
                  )}
                  {book.published_by && (
                    <tr>
                      <td className="px-6 py-4 text-gray-400 font-medium">제조사</td>
                      <td className="px-6 py-4">{book.published_by}</td>
                    </tr>
                  )}
                  {book.distributor && (
                    <tr>
                      <td className="px-6 py-4 text-gray-400 font-medium">A/S문의</td>
                      <td className="px-6 py-4">{book.distributor}</td>
                    </tr>
                  )}
                  {book.material && (
                    <tr>
                      <td className="px-6 py-4 text-gray-400 font-medium">소재</td>
                      <td className="px-6 py-4">{book.material}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-4 space-y-2 text-sm text-gray-400">
              <p>
                - 제품색상은 사용자의 모니터의 해상도에 따라 실제 색상과 다소 차이가 있을 수
                있습니다.
              </p>
              <p>- 제품의 색상이 실물 제품 색상과 가장 비슷합니다.</p>
            </div>
          </section>
        </div>

        <div ref={reviewRef} data-section="review" className="space-y-8">
          <section className="bg-zinc-900 rounded-lg p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">리뷰</h2>
              <p className="text-gray-400">고객님의 소중한 후기를 남겨주세요.</p>
            </div>

            <div className="grid grid-cols-3 gap-8 mb-8">
              <div className="text-center">
                <div className="text-gray-400 mb-2">상품만족도</div>
                <div className="text-3xl font-bold">
                  <span className="text-brand-500">{book.average_rating || 0}</span> / 5
                </div>
              </div>
              <div className="text-center">
                <div className="text-gray-400 mb-2">리뷰 개수</div>
                <div className="text-3xl font-bold">{book.review_count || 0}</div>
              </div>
              <div className="text-center border-l border-white/10 pl-8">
                <div className="text-gray-400 mb-4">고객님의 리뷰를 공유해주세요!</div>
                <button className="px-6 py-2 bg-brand-500 hover:bg-brand-600 rounded-lg font-medium transition-colors">
                  리뷰 작성하기
                </button>
              </div>
            </div>

            <div className="flex gap-2 justify-center mb-8">
              {["5점", "4점", "3점", "2점", "1점"].map((rating) => (
                <button
                  key={rating}
                  className="px-4 py-2 rounded-lg border border-white/10 hover:border-brand-500 transition-colors text-sm"
                >
                  {rating}
                </button>
              ))}
            </div>
          </section>

          <section className="bg-zinc-900 rounded-lg p-8">
            <div className="text-center py-12">
              <p className="text-gray-400">게시물이 없습니다</p>
            </div>
            <div className="flex justify-center gap-3 mt-8">
              <button className="px-6 py-2 rounded-lg border border-white/20 hover:border-white/40 transition-colors">
                전체 보기
              </button>
              <button className="px-6 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors font-medium">
                리뷰작성
              </button>
            </div>
          </section>

          {/* 포토리뷰 */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">포토리뷰 (최근 리뷰 20개)</h3>
              <Link href="#" className="text-brand-500 hover:underline text-sm">
                리뷰 전체보기 →
              </Link>
            </div>
            <div className="bg-zinc-900 rounded-lg p-8">
              <div className="text-center py-12 text-gray-400">게시물이 없습니다</div>
            </div>
          </section>
        </div>

        <div ref={returnRef} data-section="return" className="bg-zinc-900 rounded-lg p-8">
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

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">교환/반품 불가 안내</h3>
              <ul className="space-y-2 text-sm">
                <li>• 고객의 책임 있는 사유로 상품이 훼손된 경우</li>
                <li>• 포장을 개봉하였거나 포장이 훼손되어 상품 가치가 현저히 감소한 경우</li>
                <li>• 고객의 사용 또는 일부 소비에 의하여 상품 가치가 현저히 감소한 경우</li>
                <li>• 시간 경과에 의하여 재판매가 곤란할 정도로 상품 가치가 현저히 감소한 경우</li>
              </ul>
            </section>
          </div>
        </div>

        <div ref={inquiryRef} data-section="inquiry" className="space-y-6">
          <section className="bg-zinc-900 rounded-lg p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Q&A</h2>
              <p className="text-gray-400">상품의 궁금한 점을 해결해 드립니다.</p>
            </div>

            {/* Q&A 목록 */}
            <div className="divide-y divide-white/10">
              <div className="flex items-center gap-8 py-4">
                <div className="w-12 text-center font-bold text-gray-400">5</div>
                <div className="flex-1">책 질문</div>
                <div className="text-sm text-gray-400">0****</div>
                <div className="text-sm text-gray-400">2025-11-02 20:25:47</div>
                <div className="w-16 text-right text-gray-400">36</div>
              </div>
              <div className="flex items-center gap-8 py-4">
                <div className="w-12 text-center font-bold text-gray-400">4</div>
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-gray-400">🔒</span>
                  <span>교재 관련 문의드립니다</span>
                </div>
                <div className="text-sm text-gray-400">3****</div>
                <div className="text-sm text-gray-400">2024-07-17 01:19:31</div>
                <div className="w-16 text-right text-gray-400">3</div>
              </div>
            </div>

            <div className="flex justify-center gap-3 mt-8">
              <button className="px-6 py-2 rounded-lg border border-white/20 hover:border-white/40 transition-colors">
                전체 보기
              </button>
              <button className="px-6 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors font-medium">
                리뷰작성
              </button>
            </div>
          </section>

          {/* 상품 결제 정보 */}
          <details className="bg-zinc-900 rounded-lg">
            <summary className="px-6 py-4 cursor-pointer font-medium flex items-center justify-between">
              <span>상품 결제 정보</span>
              <ChevronRight className="w-5 h-5 transition-transform" />
            </summary>
            <div className="px-6 pb-6 text-sm text-gray-400">
              <p>상품 결제 관련 안내사항입니다.</p>
            </div>
          </details>

          <details className="bg-zinc-900 rounded-lg">
            <summary className="px-6 py-4 cursor-pointer font-medium flex items-center justify-between">
              <span>배송 안내</span>
              <ChevronRight className="w-5 h-5 transition-transform" />
            </summary>
            <div className="px-6 pb-6 text-sm text-gray-400">
              <p>배송 관련 안내사항입니다.</p>
            </div>
          </details>

          <details className="bg-zinc-900 rounded-lg">
            <summary className="px-6 py-4 cursor-pointer font-medium flex items-center justify-between">
              <span>교환/반품 안내</span>
              <ChevronRight className="w-5 h-5 transition-transform" />
            </summary>
            <div className="px-6 pb-6 text-sm text-gray-400">
              <p>교환 및 반품 관련 안내사항입니다.</p>
            </div>
          </details>
        </div>
      </div>

      {/* Sticky Footer - appears when sticky header appears */}
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
                {totalPrice.toLocaleString()}원
              </div>
            </div>
            <div className="flex gap-3">
              <button className="px-6 py-3 rounded-lg border border-white/20 hover:border-white/40 transition-colors font-medium">
                장바구니
              </button>
              <button className="px-8 py-3 rounded-lg bg-brand-500 hover:bg-brand-600 transition-colors font-bold">
                구매하기
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
