"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { HeroSlide } from "@/lib/siteContent";

/** Home hero — slides come from the published home layout (admin → صفحه اصلی). */
export default function HeroSlider({
  slides,
  intervalMs = 5000,
}: {
  slides: HeroSlide[];
  intervalMs?: number;
}) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);

  const go = (n: number) => setI((n + slides.length) % slides.length);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const id = setInterval(() => go(i + 1), Math.max(1500, intervalMs));
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, paused, slides.length, intervalMs]);

  if (slides.length === 0) return null;

  return (
    <section
      role="region"
      aria-roledescription="carousel"
      aria-label="پیشنهادهای ویژه"
      className="modilish_home_slider relative h-56 w-full overflow-hidden lg:h-[440px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
        setPaused(true);
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        touchX.current = null;
        setPaused(false);
        if (start === null) return;
        const dx = e.changedTouches[0].clientX - start;
        if (Math.abs(dx) < 40) return;
        // RTL: a swipe to the right advances
        go(dx > 0 ? i + 1 : i - 1);
      }}
    >
      {slides.map((s, n) => (
        <div
          key={n}
          aria-hidden={n !== i}
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: n === i ? 1 : 0, pointerEvents: n === i ? "auto" : "none" }}
        >
          <Image
            src={s.img}
            alt=""
            fill
            sizes="(min-width: 1024px) 100vw, 400px"
            className="object-cover"
            priority={n === 0}
          />
          <div className="absolute inset-0 bg-gradient-to-l from-white/90 via-white/50 to-white/5" />
          <div className="absolute inset-y-0 right-0 flex w-2/3 flex-col justify-center px-5 text-right lg:w-full lg:px-8">
            <div className="lg:max-w-md">
              <h2 className="text-xl font-bold text-modi-purple-800 lg:text-4xl">
                {s.title}
              </h2>
              <p className="mt-1.5 text-xs leading-5 text-[#4b34a8] lg:mt-3 lg:text-base">
                {s.sub}
              </p>
              {s.cta && (
                <Link
                  href={s.href || "/shop"}
                  className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-xl bg-modi-purple-800 px-4 text-xs font-bold text-white shadow-[0_6px_16px_-8px_rgba(107,63,160,0.8)] lg:mt-6 lg:h-11 lg:px-6 lg:text-sm"
                >
                  <span>{s.cta}</span>
                  <svg width="8" height="12" viewBox="0 0 8 12" aria-hidden>
                    <path
                      d="M6 1L2 6l4 5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </Link>
              )}
            </div>
          </div>
        </div>
      ))}

      {slides.length > 1 && (
        <div className="absolute bottom-3 left-4 flex items-center gap-0.5 rounded-full bg-white/90 px-1.5 shadow-sm lg:bottom-6 lg:left-8">
          {slides.map((_, n) => (
            <button
              key={n}
              type="button"
              aria-label={`اسلاید ${n + 1}`}
              aria-current={n === i}
              onClick={() => go(n)}
              className="flex h-7 w-6 items-center justify-center"
            >
              <span
                className={`block h-1.5 rounded-full transition-all ${
                  n === i ? "w-4 bg-modi-purple-800" : "w-1.5 bg-modi-gray-900"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
