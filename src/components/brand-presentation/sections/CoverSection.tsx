/**
 * BIG CRUISE〽️ BRAND PRESENTATION
 * Cover Section
 */

import React from "react";
import { PulseMark } from "./PulseMark";
import { BRAND_CONFIG } from "./config";

export const CoverSection: React.FC = () => {
  return (
    <section className="relative overflow-hidden bg-white py-24 md:py-32">
      {/* Background grain texture */}
      <div className="absolute inset-0 opacity-5 mix-blend-overlay pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-6 md:px-8">
        {/* Evolution visualization */}
        <div className="mb-16 flex flex-col items-center gap-8 md:gap-12">
          <h3 className="text-center text-sm font-bold uppercase tracking-widest text-stone-600">
            Mark Evolution
          </h3>

          <div className="flex flex-col items-center gap-6 md:flex-row md:gap-8">
            {/* Original 〰️ */}
            <div className="flex flex-col items-center gap-2">
              <div className="text-5xl">〰️</div>
              <p className="text-xs text-stone-600">Unicode Glyph</p>
            </div>

            {/* Arrow */}
            <div className="text-2xl text-stone-400">→</div>

            {/* Refined geometry */}
            <div className="flex flex-col items-center gap-2">
              <PulseMark
                size={120}
                color={BRAND_CONFIG.colors.danfoYellow}
                backgroundColor={BRAND_CONFIG.colors.midnightBlack}
              />
              <p className="text-xs text-stone-600">Geometric Refinement</p>
            </div>

            {/* Arrow */}
            <div className="text-2xl text-stone-400">→</div>

            {/* Final mark */}
            <div className="flex flex-col items-center gap-2">
              <PulseMark
                size={120}
                color={BRAND_CONFIG.colors.danfoYellow}
                backgroundColor={BRAND_CONFIG.colors.midnightBlack}
              />
              <p className="text-xs text-stone-600">Pulse Mark</p>
            </div>
          </div>
        </div>

        {/* Main title and description */}
        <div className="text-center">
          <h1
            className="mb-4 text-5xl font-bold md:text-6xl lg:text-7xl"
            style={{ fontFamily: BRAND_CONFIG.typography.display.family }}
          >
            {BRAND_CONFIG.name}
          </h1>

          <h2 className="mb-8 text-xl text-stone-600 md:text-2xl">
            {BRAND_CONFIG.tagline}
          </h2>

          <p className="mx-auto mb-12 max-w-2xl text-base leading-relaxed text-stone-700 md:text-lg">
            {BRAND_CONFIG.description}
          </p>

          {/* Status badge */}
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="inline-block rounded border border-stone-300 bg-stone-50 px-4 py-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                {BRAND_CONFIG.status}
              </p>
            </div>
            <p className="text-xs italic text-stone-500">{BRAND_CONFIG.note}</p>
          </div>
        </div>
      </div>

      {/* Subtle lane pattern accent */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1 opacity-10"
        style={{
          backgroundImage: "repeating-linear-gradient(-8deg, currentColor 0px, currentColor 1px, transparent 1px, transparent 8px)",
          color: BRAND_CONFIG.colors.danfoYellow,
        }}
      />
    </section>
  );
};
