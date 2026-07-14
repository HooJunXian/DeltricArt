import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { assets } from "../assets/assets";

const slides = [
  {
    eyebrow: "Featured Painting",
    title: "Crimson Stillness",
    description:
      "A slow-burning oil painting with dense pigment, dramatic contrast, and a presence meant to be experienced without hurry.",
    meta: "Oil on canvas | Curated for the current exhibition",
    image: assets.oilpainting_1,
    cta: "View Products",
  },
  {
    eyebrow: "Featured Sculpture",
    title: "Stone Gesture",
    description:
      "A sculptural form shaped by balance, silence, and shadow, presented with enough space to let material and contour lead.",
    meta: "Collector edition | Sculptural study",
    image: assets.sculpture_2,
    cta: "Explore Works",
  },
];

const Hero = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 7000);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <section className="relative left-1/2 ml-[-50vw] flex min-h-screen w-screen overflow-hidden bg-stone-950 text-white">
      {slides.map((slide, index) => {
        const isActive = index === activeIndex;

        return (
          <div
            key={slide.title}
            className={`absolute inset-0 transition-opacity duration-[1800ms] ease-out ${
              isActive ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <img
              className={`absolute inset-0 h-full w-full object-cover transition-transform duration-[9000ms] ease-out ${
                isActive ? "scale-100" : "scale-105"
              }`}
              src={slide.image}
              alt={slide.title}
            />

            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,12,8,0.86)_0%,rgba(17,12,8,0.56)_38%,rgba(17,12,8,0.2)_100%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,12,8,0.14)_0%,rgba(17,12,8,0.22)_45%,rgba(17,12,8,0.58)_100%)]" />

            <div className="relative z-10 flex h-full w-full items-end px-5 pb-12 pt-28 sm:px-8 md:px-12 lg:px-16 lg:pb-16">
              <div
                className={`max-w-2xl transition-all duration-[1200ms] ease-out ${
                  isActive
                    ? "translate-y-0 opacity-100"
                    : "translate-y-4 opacity-0"
                }`}
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.42em] text-white/70 sm:text-xs">
                  {slide.eyebrow}
                </p>

                <h1 className="prata-regular mt-5 text-5xl leading-[1.05] sm:text-6xl lg:text-8xl">
                  {slide.title}
                </h1>

                <p className="mt-6 max-w-xl text-sm leading-8 text-white/78 sm:text-base">
                  {slide.description}
                </p>

                <p className="mt-6 text-xs uppercase tracking-[0.28em] text-white/58 sm:text-sm">
                  {slide.meta}
                </p>

                <div className="mt-10 flex items-center gap-5">
                  <Link
                    to="/products"
                    className="rounded-full border border-white/35 px-7 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-white hover:text-stone-900"
                  >
                    {slide.cta}
                  </Link>

                  <div className="hidden h-px w-20 bg-white/30 sm:block" />
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <div className="pointer-events-none absolute inset-x-0 bottom-8 z-20 flex items-center justify-between px-5 sm:px-8 md:px-12 lg:px-16">
        <div className="flex items-center gap-3">
          {slides.map((slide, index) => (
            <button
              key={slide.title}
              type="button"
              aria-label={`Show slide ${index + 1}`}
              onClick={() => setActiveIndex(index)}
              className={`pointer-events-auto h-2 rounded-full transition-all duration-500 ${
                index === activeIndex ? "w-12 bg-white" : "w-2 bg-white/35"
              }`}
            />
          ))}
        </div>

        <p className="text-[11px] uppercase tracking-[0.35em] text-white/60 sm:text-xs">
          Exhibition View {String(activeIndex + 1).padStart(2, "0")}
        </p>
      </div>
    </section>
  );
};

export default Hero;
