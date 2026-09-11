/**
 * BIG CRUISE〽️ PULSE MARK
 * 
 * Proposed geometric construction component
 * SVG-based, editable, vector-scalable
 * 
 * STATUS: Proposed Foundation — Ready for Design Validation
 * 
 * This is an editable proposed mark, not the final approved logo.
 * When the official canonical mark is approved, replace the SVG geometry here
 * without needing to rebuild the entire presentation system.
 */

import React from "react";

interface PulseMarkProps {
  size?: number;
  color?: string;
  variant?: "primary" | "micro" | "outline" | "pattern" | "construction";
  backgroundColor?: string;
  showConstruction?: boolean;
  showGrid?: boolean;
  showClearSpace?: boolean;
  className?: string;
  title?: string;
}

export const PulseMark: React.FC<PulseMarkProps> = ({
  size = 128,
  color = "#f5c400",
  variant = "primary",
  backgroundColor,
  showConstruction = false,
  showGrid = false,
  showClearSpace = false,
  className = "",
  title = "BIG CRUISE Pulse Mark",
}) => {
  // Calculate viewBox and scaling
  const masterSize = 1000;
  const scale = size / masterSize;
  const viewBoxSize = variant === "pattern" ? 250 : masterSize;

  // Micro variant simplified geometry
  const isMicro = variant === "micro";

  // Peak coordinates (〰️ DNA + community elements)
  const leftPeakBase = isMicro ? [200, 600] : [275, 650];
  const leftPeakApex = isMicro ? [300, 250] : [375, 225];
  const leftPeakRight = isMicro ? [400, 600] : [475, 650];

  const rightPeakBase = isMicro ? [450, 600] : [525, 650];
  const rightPeakApex = isMicro ? [550, 250] : [625, 225];
  const rightPeakRight = isMicro ? [650, 600] : [725, 650];

  // Foundation line
  const foundationStart = isMicro ? [150, 700] : [225, 750];
  const foundationEnd = isMicro ? [650, 700] : [775, 750];
  const foundationStroke = isMicro ? 8 : 12;

  // Community circles (removed in micro variant for clarity)
  const primaryCircle = {
    cx: 500,
    cy: 500,
    r: 60,
    strokeWidth: 8,
  };

  const secondaryCircles = [
    { cx: 375, cy: 525, r: 40, strokeWidth: 6 },
    { cx: 625, cy: 525, r: 40, strokeWidth: 6 },
  ];

  // Clear space visualization
  const clearSpaceMargin = 75;

  // Pattern variant (repeating tile)
  let patternContent = null;
  if (variant === "pattern") {
    patternContent = (
      <>
        {/* Repeating pattern unit - simplified peaks */}
        <polygon
          points={`62.5,0 125,100 0,100`}
          fill={color}
          opacity="0.8"
        />
        <polygon points={`187.5,0 250,100 125,100`} fill={color} opacity="0.6" />
        <line x1="62.5" y1="85" x2="62.5" y2="140" stroke={color} strokeWidth="6" />
        <line
          x1="187.5"
          y1="85"
          x2="187.5"
          y2="140"
          stroke={color}
          strokeWidth="6"
        />
      </>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      className={`pulse-mark pulse-mark--${variant} ${className}`}
      style={{
        backgroundColor: backgroundColor || "transparent",
        display: "block",
      }}
      aria-label={title}
      role="img"
    >
      {/* Master grid background (optional) */}
      {showGrid && variant !== "pattern" && (
        <>
          <defs>
            <pattern
              id="grid"
              width="100"
              height="100"
              patternUnits="userSpaceOnUse"
            >
              <rect width="100" height="100" fill="none" />
              <path
                d="M 100 0 L 0 0 0 100"
                fill="none"
                stroke="rgba(245, 196, 0, 0.1)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width={masterSize} height={masterSize} fill="url(#grid)" />
        </>
      )}

      {/* Clear space visualization */}
      {showClearSpace && variant === "primary" && (
        <>
          <defs>
            <pattern
              id="clearspace"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="10" cy="10" r="1" fill="rgba(245, 196, 0, 0.2)" />
            </pattern>
          </defs>
          <rect
            x={clearSpaceMargin}
            y={clearSpaceMargin}
            width={masterSize - clearSpaceMargin * 2}
            height={masterSize - clearSpaceMargin * 2}
            fill="url(#clearspace)"
            opacity="0.5"
          />
          <rect
            x={clearSpaceMargin}
            y={clearSpaceMargin}
            width={masterSize - clearSpaceMargin * 2}
            height={masterSize - clearSpaceMargin * 2}
            fill="none"
            stroke="rgba(245, 196, 0, 0.3)"
            strokeWidth="2"
            strokeDasharray="10,10"
          />
        </>
      )}

      {/* Construction guides (optional) */}
      {showConstruction && variant === "primary" && (
        <>
          {/* Vertical center line */}
          <line
            x1={masterSize / 2}
            y1={0}
            x2={masterSize / 2}
            y2={masterSize}
            stroke="rgba(245, 196, 0, 0.15)"
            strokeWidth="1"
            strokeDasharray="5,5"
          />
          {/* Horizontal guides */}
          <line
            x1={0}
            y1={225}
            x2={masterSize}
            y2={225}
            stroke="rgba(245, 196, 0, 0.15)"
            strokeWidth="1"
            strokeDasharray="5,5"
          />
          <line
            x1={0}
            y1={500}
            x2={masterSize}
            y2={500}
            stroke="rgba(245, 196, 0, 0.15)"
            strokeWidth="1"
            strokeDasharray="5,5"
          />
          <line
            x1={0}
            y1={650}
            x2={masterSize}
            y2={650}
            stroke="rgba(245, 196, 0, 0.15)"
            strokeWidth="1"
            strokeDasharray="5,5"
          />
        </>
      )}

      {/* Main mark geometry */}
      {variant === "pattern" && patternContent}

      {variant !== "pattern" && (
        <g>
          {/* LEFT PEAK */}
          <polygon
            points={`${leftPeakBase[0]},${leftPeakBase[1]} ${leftPeakApex[0]},${leftPeakApex[1]} ${leftPeakRight[0]},${leftPeakRight[1]}`}
            fill={variant === "outline" ? "none" : color}
            stroke={variant === "outline" ? color : "none"}
            strokeWidth={variant === "outline" ? 8 : 0}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* RIGHT PEAK */}
          <polygon
            points={`${rightPeakBase[0]},${rightPeakBase[1]} ${rightPeakApex[0]},${rightPeakApex[1]} ${rightPeakRight[0]},${rightPeakRight[1]}`}
            fill={variant === "outline" ? "none" : color}
            stroke={variant === "outline" ? color : "none"}
            strokeWidth={variant === "outline" ? 8 : 0}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* FOUNDATION LINE */}
          <line
            x1={foundationStart[0]}
            y1={foundationStart[1]}
            x2={foundationEnd[0]}
            y2={foundationEnd[1]}
            stroke={color}
            strokeWidth={foundationStroke}
            strokeLinecap="round"
          />

          {/* COMMUNITY CIRCLES (hidden in micro variant) */}
          {!isMicro && (
            <>
              {/* Primary circle - center community gathering point */}
              <circle
                cx={primaryCircle.cx}
                cy={primaryCircle.cy}
                r={primaryCircle.r}
                fill={variant === "outline" ? "none" : "transparent"}
                stroke={color}
                strokeWidth={primaryCircle.strokeWidth}
                strokeLinecap="round"
              />

              {/* Secondary circles - connection rhythm */}
              {secondaryCircles.map((circle, idx) => (
                <circle
                  key={`secondary-${idx}`}
                  cx={circle.cx}
                  cy={circle.cy}
                  r={circle.r}
                  fill="transparent"
                  stroke={color}
                  strokeWidth={circle.strokeWidth}
                  opacity="0.8"
                  strokeLinecap="round"
                />
              ))}
            </>
          )}
        </g>
      )}

      {/* Construction point indicators (for development only) */}
      {showConstruction && variant === "primary" && (
        <>
          <circle cx={leftPeakBase[0]} cy={leftPeakBase[1]} r="8" fill="rgba(255, 0, 0, 0.3)" />
          <circle cx={leftPeakApex[0]} cy={leftPeakApex[1]} r="8" fill="rgba(0, 255, 0, 0.3)" />
          <circle cx={leftPeakRight[0]} cy={leftPeakRight[1]} r="8" fill="rgba(255, 0, 0, 0.3)" />
          <circle cx={rightPeakBase[0]} cy={rightPeakBase[1]} r="8" fill="rgba(255, 0, 0, 0.3)" />
          <circle cx={rightPeakApex[0]} cy={rightPeakApex[1]} r="8" fill="rgba(0, 255, 0, 0.3)" />
          <circle cx={rightPeakRight[0]} cy={rightPeakRight[1]} r="8" fill="rgba(255, 0, 0, 0.3)" />
        </>
      )}
    </svg>
  );
};

export default PulseMark;
