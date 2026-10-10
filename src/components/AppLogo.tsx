import React from 'react'

interface AppLogoProps {
  size?: number
  className?: string
  showBadge?: boolean
  isPro?: boolean
  customLogo?: string | null
  animated?: boolean
}

/**
 * TINDA POS "Ultra-Modern Quantum T" Mark (Mathematical Edition)
 * Engineered with signature brand emerald green gradient, dynamic ambient aura,
 * animated SVG shimmer wave, breathing quantum jewel, and real-time hardware beacon.
 */
export function AppLogo({
  size = 42,
  className = '',
  showBadge = true,
  isPro = false,
  customLogo,
  animated = true
}: AppLogoProps): React.JSX.Element {
  if (customLogo) {
    return (
      <div
        className={`relative inline-flex items-center justify-center shrink-0 select-none group ${className}`}
        style={{ width: size, height: size }}
      >
        <div
          className="w-full h-full rounded-2xl overflow-hidden border border-emerald-500/40 bg-obsidian-950 flex items-center justify-center shadow-vault transition-transform duration-300 group-hover:scale-105"
          style={{ width: size, height: size }}
        >
          <img
            src={customLogo}
            alt="Store Logo"
            className="w-full h-full object-contain p-1"
          />
        </div>
        {showBadge && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 pointer-events-none">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 ring-2 ring-obsidian-950" />
          </span>
        )}
      </div>
    )
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none group ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Dynamic ambient pulsing emerald halo behind the chassis */}
      {animated && (
        <div
          className="absolute -inset-1.5 rounded-2xl bg-gradient-to-r from-emerald-500/30 via-teal-400/35 to-emerald-600/30 blur-md opacity-75 group-hover:opacity-100 transition-opacity duration-500 animate-pulse pointer-events-none"
        />
      )}

      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible drop-shadow-[0_4px_16px_rgba(16,185,129,0.4)] transition-transform duration-300 group-hover:scale-105"
      >
        <defs>
          {/* Base Background Gradient */}
          <linearGradient id="tindaModernBg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#062119" />
            <stop offset="50%" stopColor="#041812" />
            <stop offset="100%" stopColor="#020d09" />
          </linearGradient>

          {/* Core Emerald Mark Gradient */}
          <linearGradient id="tindaModernMark" x1="18" y1="18" x2="82" y2="82" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#a7f3d0" />
            <stop offset="25%" stopColor="#6ee7b7" />
            <stop offset="60%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>

          {/* Emerald Glass Bevel Highlight */}
          <linearGradient id="tindaEmeraldBevel" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.85" />
            <stop offset="35%" stopColor="#34d399" stopOpacity="0.4" />
            <stop offset="70%" stopColor="#10b981" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#064e3b" stopOpacity="0.7" />
          </linearGradient>

          {/* Animated Shimmer Sweep Filter */}
          <linearGradient id="tindaShimmer" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0">
              <animate attributeName="offset" values="-1; 2" dur="3s" repeatCount="indefinite" />
            </stop>
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.45">
              <animate attributeName="offset" values="-0.5; 2.5" dur="3s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0">
              <animate attributeName="offset" values="0; 3" dur="3s" repeatCount="indefinite" />
            </stop>
          </linearGradient>
        </defs>

        {/* 1. Cupertino Squircle Chassis */}
        <rect
          x="4"
          y="4"
          width="92"
          height="92"
          rx="24"
          fill="url(#tindaModernBg)"
          stroke="url(#tindaEmeraldBevel)"
          strokeWidth="1.8"
        />

        {/* 2. Inner Radial Soft Ambient Aura */}
        <circle
          cx="50"
          cy="48"
          r="34"
          fill="#10b981"
          opacity="0.22"
          filter="blur(8px)"
        >
          {animated && (
            <animate
              attributeName="opacity"
              values="0.14; 0.32; 0.14"
              dur="2.5s"
              repeatCount="indefinite"
            />
          )}
        </circle>

        {/* 3. The Iconic Quantum T Mark (Mathematical Precision in Brand Emerald) */}
        <path
          d="M20 28 C20 24.686 22.686 22 26 22 H74 C77.314 22 80 24.686 80 28 C80 31.314 77.314 34 74 34 H61 V74 C61 77.314 58.314 80 55 80 H45 C41.686 80 39 77.314 39 74 V34 H26 C22.686 34 20 31.314 20 28 Z"
          fill="url(#tindaModernMark)"
        />

        {/* 4. Left Summation Winglet (Mathematical Σ Accent Angle) */}
        <path
          d="M20 40 L33 40 L26 49 L20 49 Z"
          fill="#34d399"
          opacity="0.95"
        />

        {/* 5. Right Summation Winglet (Symmetric Equilibrium Apex) */}
        <path
          d="M80 40 L67 40 L74 49 L80 49 Z"
          fill="#059669"
          opacity="0.95"
        />

        {/* 6. Vertical Light Spine Ray */}
        <line
          x1="50"
          y1="23"
          x2="50"
          y2="78"
          stroke="#ecfdf5"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.75"
        />

        {/* 7. Shimmer Sweep Overlay over T-Mark */}
        {animated && (
          <path
            d="M20 28 C20 24.686 22.686 22 26 22 H74 C77.314 22 80 24.686 80 28 C80 31.314 77.314 34 74 34 H61 V74 C61 77.314 58.314 80 55 80 H45 C41.686 80 39 77.314 39 74 V34 H26 C22.686 34 20 31.314 20 28 Z"
            fill="url(#tindaShimmer)"
            opacity="0.8"
          />
        )}

        {/* 8. Quantum Center Core Jewel with Glowing Breathing Animation */}
        <circle
          cx="50"
          cy="28"
          r="3.5"
          fill="#ffffff"
          className="drop-shadow-[0_0_8px_#34d399]"
        >
          {animated && (
            <animate
              attributeName="r"
              values="3; 4.2; 3"
              dur="2s"
              repeatCount="indefinite"
            />
          )}
        </circle>
      </svg>

      {/* Real-time Hardware Ping Beacon Badge */}
      {showBadge && (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 pointer-events-none">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 ring-2 ring-obsidian-950" />
        </span>
      )}
    </div>
  )
}
