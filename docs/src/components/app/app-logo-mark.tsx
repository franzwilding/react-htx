import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Reactolith brand mark — hex-prism monolith silhouette with a 3-orbit React
 * atom carved into the front face, a violet light-spine down the middle and a
 * pulsing nucleus. Renders as inline SVG so SMIL animations work everywhere.
 */
export function AppLogoMark({
  className,
  animated = true,
  ...props
}: React.SVGAttributes<SVGSVGElement> & { animated?: boolean }) {
  return (
    <svg
      viewBox="0 0 120 160"
      fill="none"
      aria-hidden="true"
      className={cn("block", className)}
      {...props}
    >
      <defs>
        <linearGradient id="lm-face" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a1530" />
          <stop offset="1" stopColor="#06040e" />
        </linearGradient>
        <linearGradient id="lm-side" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#241f44" />
          <stop offset="1" stopColor="#0d0a1f" />
        </linearGradient>
        <linearGradient id="lm-spine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c2b1ff" />
          <stop offset=".5" stopColor="#7c6cff" />
          <stop offset="1" stopColor="#2a1f7a" />
        </linearGradient>
        <radialGradient id="lm-foot" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#7c6cff" stopOpacity=".9" />
          <stop offset="1" stopColor="#7c6cff" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* ground halo */}
      <ellipse cx="60" cy="154" rx="36" ry="3" fill="url(#lm-foot)" opacity=".6" />
      {/* hex prism: front + side faces */}
      <path d="M60 8 L24 36 L20 132 L60 152 Z" fill="url(#lm-face)" />
      <path d="M60 8 L96 36 L100 132 L60 152 Z" fill="url(#lm-side)" />
      {/* top facet rim */}
      <path
        d="M24 36 L60 8 L96 36"
        stroke="#a594ff"
        strokeWidth=".7"
        opacity=".5"
        strokeLinejoin="round"
      />
      {/* bright violet spine */}
      <path
        d="M60 8 L60 152"
        stroke="url(#lm-spine)"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity=".95"
      />
      {/* React atom carved into the front face */}
      <g transform="translate(60 80)" strokeLinecap="round">
        <ellipse
          cx="0"
          cy="0"
          rx="28"
          ry="10"
          stroke="#a594ff"
          strokeWidth="1.6"
          opacity=".85"
        />
        <ellipse
          cx="0"
          cy="0"
          rx="28"
          ry="10"
          stroke="#a594ff"
          strokeWidth="1.6"
          opacity=".85"
          transform="rotate(60)"
        />
        <ellipse
          cx="0"
          cy="0"
          rx="28"
          ry="10"
          stroke="#a594ff"
          strokeWidth="1.6"
          opacity=".85"
          transform="rotate(-60)"
        />
        <circle cx="0" cy="0" r="3.4" fill="#e8e0ff">
          {animated && (
            <animate
              attributeName="opacity"
              values="1;.55;1"
              dur="2.6s"
              repeatCount="indefinite"
            />
          )}
        </circle>
        <circle cx="0" cy="0" r="6" fill="#a594ff" opacity=".25">
          {animated && (
            <>
              <animate
                attributeName="r"
                values="6;10;6"
                dur="2.6s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values=".35;.05;.35"
                dur="2.6s"
                repeatCount="indefinite"
              />
            </>
          )}
        </circle>
      </g>
    </svg>
  );
}
