"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSliderStore } from "@/store/useSliderStore";

export default function TopSlider() {
  const { slides } = useSliderStore();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  // Reset slide index when slides change
  useEffect(() => {
    setCurrentSlide(0);
  }, [slides]);

  // Auto-play slider (resets when currentSlide changes)
  useEffect(() => {
    if (slides.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [slides.length, currentSlide]);

  if (slides.length === 0) {
    return null;
  }

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  // 터치 이벤트 핸들러
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      nextSlide();
    }
    if (isRightSwipe) {
      prevSlide();
    }

    // Reset
    setTouchStart(0);
    setTouchEnd(0);
  };

  return (
    <div
      className="relative w-full h-[350px] md:h-[400px] overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="flex transition-transform duration-500 ease-in-out h-full"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {slides.map((slide) => (
          <div key={slide.id} className="min-w-full h-full relative bg-black">
            {/* Background Image */}
            <div className="absolute inset-0">
              <Image
                src={slide.image}
                alt={slide.title}
                fill
                className="object-cover"
                priority={currentSlide === slides.findIndex((s) => s.id === slide.id)}
              />
              {/* Dark overlay for better text readability */}
              <div className="absolute inset-0 bg-black/30" />
            </div>

            {/* Text Content Overlay */}
            <div className="relative h-full flex items-center justify-center">
              <div className="max-w-[1600px] w-full mx-auto px-6 md:px-24">
                <div className="flex flex-col gap-3 md:gap-6 max-w-2xl">
                  <div>
                    <h1 className="text-3xl md:text-6xl font-bold text-white mb-2 md:mb-3 drop-shadow-lg">
                      {slide.title}
                    </h1>
                    {slide.subtitle && (
                      <h2 className="text-xl md:text-4xl font-bold text-white/90 drop-shadow-lg">
                        {slide.subtitle}
                      </h2>
                    )}
                  </div>
                  {slide.description && (
                    <p className="text-base md:text-xl text-white/90 drop-shadow-md">
                      {slide.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows - 데스크톱에만 표시 */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="hidden md:block absolute left-8 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm p-3 rounded-full transition-colors z-20"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-6 text-black" />
          </button>
          <button
            onClick={nextSlide}
            className="hidden md:block absolute right-8 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm p-3 rounded-full transition-colors z-20"
            aria-label="Next slide"
          >
            <ChevronRight className="w-6 h-6 text-black" />
          </button>

          {/* Slide Indicators */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentSlide ? "w-8 bg-black" : "w-2 bg-black/30"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
