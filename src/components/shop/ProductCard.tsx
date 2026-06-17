"use client";

import Image from "next/image";
import Link from "next/link";
import { Package } from "lucide-react";

interface ProductCardProps {
  id: number;
  title: string;
  subtitle?: string | null;
  price: number;
  original_price?: number | null;
  event_label?: string | null;
  thumbnail_url?: string | null;
  review_count?: number;
  average_rating?: number;
  delivery_type?: string;
  categorySlug?: string;
  href?: string;
  stock?: number | null;
}

const EVENT_BADGE_STYLES: Record<string, string> = {
  HOT: "bg-red-500 text-white",
  SALE: "bg-orange-500 text-white",
  NEW: "bg-green-500 text-white",
  LIMITED: "bg-purple-600 text-white",
};

const DELIVERY_TYPE_LABELS: Record<string, string> = {
  physical: "배송",
  digital_download: "다운로드",
  gifticon: "기프티콘",
  coupon: "쿠폰",
};

export default function ProductCard({
  id,
  title,
  subtitle,
  price,
  original_price,
  event_label,
  thumbnail_url,
  review_count = 0,
  average_rating = 0,
  delivery_type,
  categorySlug,
  href,
  stock,
}: ProductCardProps) {
  const linkHref = href ?? (categorySlug ? `/shop/${categorySlug}/${id}` : `/shop/products/${id}`);
  const isSoldOut = stock === 0;
  const effectiveDiscountRate =
    original_price && original_price > price
      ? Math.round(((original_price - price) / original_price) * 100)
      : null;
  const hasDiscount = effectiveDiscountRate != null && effectiveDiscountRate > 0;
  const eventBadgeStyle = event_label ? (EVENT_BADGE_STYLES[event_label.toUpperCase()] ?? "bg-brand-500 text-white") : null;
  const deliveryLabel = delivery_type ? DELIVERY_TYPE_LABELS[delivery_type] ?? delivery_type : null;

  return (
    <Link href={linkHref} className="group flex flex-col gap-3">
      {/* Image Container */}
      <div className="relative overflow-hidden rounded-2xl w-full aspect-square bg-zinc-800 border border-white/5">
        {thumbnail_url ? (
          <Image
            src={thumbnail_url}
            alt={title}
            fill
            className={`object-cover transition-transform duration-500 group-hover:scale-105 ${isSoldOut ? "opacity-50" : ""}`}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-600">
            <Package className="w-10 h-10" />
            <span className="text-sm">이미지 없음</span>
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors" />

        {/* Event Badge */}
        {event_label && eventBadgeStyle && !isSoldOut && (
          <span className={`absolute top-3 left-3 px-2 py-0.5 rounded text-xs font-bold ${eventBadgeStyle}`}>
            {event_label.toUpperCase()}
          </span>
        )}

        {/* 품절 Badge */}
        {isSoldOut && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="bg-black/70 text-white text-sm font-bold px-4 py-2 rounded-lg">
              품절
            </span>
          </div>
        )}
      </div>

      {/* Text Content */}
      <div className="flex flex-col gap-1">
        {/* Delivery type badge */}
        {deliveryLabel && (
          <span className="text-xs text-gray-400 font-medium">{deliveryLabel}</span>
        )}

        <h3 className="text-base font-bold text-white group-hover:text-brand-500 transition-colors line-clamp-2 leading-snug">
          {title}
        </h3>

        {subtitle && (
          <p className="text-gray-500 text-sm line-clamp-1">{subtitle}</p>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-2 mt-1">
          {hasDiscount && original_price != null && (
            <span className="text-gray-500 line-through text-sm">
              {original_price.toLocaleString()}원
            </span>
          )}
          <span className={`font-bold ${isSoldOut ? "text-gray-500" : "text-white"} text-lg`}>
            {price.toLocaleString()}원
          </span>
          {hasDiscount && effectiveDiscountRate != null && (
            <span className="text-brand-500 font-bold text-sm">
              {effectiveDiscountRate}%
            </span>
          )}
        </div>

        {/* Rating */}
        {review_count > 0 && (
          <div className="flex items-center gap-1 text-sm text-gray-400 mt-0.5">
            <span className="text-yellow-400">★</span>
            <span>{average_rating.toFixed(1)}</span>
            <span>({review_count})</span>
          </div>
        )}
      </div>
    </Link>
  );
}
