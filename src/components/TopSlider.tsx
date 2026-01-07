"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSliderStore } from "@/store/useSliderStore";

export default function TopSlider() {
  const { slides } = useSliderStore();
  const [currentSlide, setCurrentSlide] = useState(0);

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

  return (
    <div className="relative w-full h-[500px] overflow-hidden">
      <div
        className="flex transition-transform duration-500 ease-in-out h-full"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {slides.map((slide) => (
          <div
            key={slide.id}
            className={`min-w-full h-full ${slide.bgColor} flex items-center justify-center relative`}
          >
            <div className="max-w-[1600px] w-full mx-auto px-24 flex items-center justify-between">
              {/* Left Content */}
              <div className="flex flex-col gap-6 max-w-xl z-10">
                <div>
                  <h1 className="text-5xl font-bold text-black mb-3">{slide.title}</h1>
                  {slide.subtitle && (
                    <h2 className="text-3xl font-bold text-black/80">{slide.subtitle}</h2>
                  )}
                </div>
                {slide.description && <p className="text-lg text-black/70">{slide.description}</p>}
                {slide.buttonText && (
                  <>
                    {slide.buttonLink ? (
                      <Link
                        href={slide.buttonLink}
                        className="bg-black text-white px-8 py-3 rounded-full w-fit hover:bg-black/80 transition-colors"
                      >
                        {slide.buttonText}
                      </Link>
                    ) : (
                      <button className="bg-black text-white px-8 py-3 rounded-full w-fit hover:bg-black/80 transition-colors">
                        {slide.buttonText}
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Right Image */}
              <div className="relative w-[400px] h-[450px] rounded-3xl overflow-hidden shadow-2xl">
                <Image
                  src={slide.image}
                  alt={slide.title}
                  fill
                  className="object-cover"
                  priority={currentSlide === slides.findIndex((s) => s.id === slide.id)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-8 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm p-3 rounded-full transition-colors z-20"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-6 text-black" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-8 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm p-3 rounded-full transition-colors z-20"
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
