import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import './ElectricChargerLoader.css';

export interface ElectricChargerLoaderProps {
  /**
   * Main text message displayed below the animation.
   * Defaults to localized 'Connecting to the power network...'
   */
  message?: string;
  /**
   * Optional subtitle label.
   */
  subMessage?: string;
  /**
   * When true, takes over the viewport with full screen styling.
   * When false, renders neatly centered within its parent container.
   */
  fullScreen?: boolean;
  /**
   * Custom min-height for inline container (e.g., 'min-h-[60vh]').
   */
  minHeight?: string;
  /**
   * Optional additional class name.
   */
  className?: string;
}

export const ElectricChargerLoader: React.FC<ElectricChargerLoaderProps> = ({
  message,
  subMessage,
  fullScreen = false,
  minHeight = 'min-h-[55vh]',
  className = '',
}) => {
  const { language } = useLanguage();

  const defaultTitle =
    language === 'ne'
      ? 'विद्युत सञ्जालमा जोडिँदै...'
      : 'Connecting to the power network...';

  const defaultSubTitle =
    language === 'ne'
      ? 'भीमदत्त नगरपालिका • नेपाल विद्युत प्राधिकरण'
      : 'Bheemdatta Municipal Electricity Grid • NEA';

  const titleText = message || defaultTitle;
  const subText = subMessage !== undefined ? subMessage : defaultSubTitle;

  const containerClasses = fullScreen
    ? 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-4 select-none overflow-hidden transition-colors duration-200'
    : `w-full flex flex-col items-center justify-center p-6 ${minHeight} select-none ${className}`;

  return (
    <div
      id="nea-electric-loader"
      role="status"
      aria-live="polite"
      className={containerClasses}
    >
      <style href="nea-charger-loader" precedence="default">{`
        /* -------------------------------------------------------------
           NEA ELECTRIC CHARGER LOADING ANIMATION KEYFRAMES
           Loop duration: Exactly 3.0 seconds (3000ms) per complete cycle
           0% - 24%  (0.00s - 0.72s): Charger plug approaches wall socket smoothly
           24% - 30% (0.72s - 0.90s): Plug firmly connects with mechanical snap
           30% - 36% (0.90s - 1.08s): Connection spark flash & contact glow burst
           32% - 58% (0.96s - 1.74s): Electric current travels along cable to plug
           40% - 76% (1.20s - 2.28s): Electricity radiates into background circuit lines
           78% - 88% (2.34s - 2.64s): Power settles, gentle disengage / reset
           88% - 100% (2.64s - 3.00s): Smooth seamless transition to cycle start
        ------------------------------------------------------------- */

        @keyframes neaPlugMotion {
          0%, 6% {
            transform: translate(-68px, 0px);
          }
          24% {
            transform: translate(-14px, 0px);
          }
          30%, 80% {
            transform: translate(0px, 0px);
          }
          88%, 100% {
            transform: translate(-68px, 0px);
          }
        }

        @keyframes neaContactFlash {
          0%, 28% {
            opacity: 0;
            transform: scale(0.3);
          }
          31% {
            opacity: 1;
            transform: scale(1.6);
          }
          35% {
            opacity: 0.85;
            transform: scale(1.1);
          }
          42%, 76% {
            opacity: 0.65;
            transform: scale(1);
          }
          82%, 100% {
            opacity: 0;
            transform: scale(0.3);
          }
        }

        @keyframes neaCableCurrent {
          0%, 30% {
            stroke-dashoffset: 420;
            opacity: 0;
          }
          33% {
            opacity: 1;
          }
          54%, 78% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
          84% {
            opacity: 0.2;
          }
          88%, 100% {
            stroke-dashoffset: 420;
            opacity: 0;
          }
        }

        @keyframes neaCircuitSurge {
          0%, 38% {
            stroke-dashoffset: 260;
            opacity: 0;
          }
          44% {
            opacity: 0.95;
          }
          68%, 76% {
            stroke-dashoffset: 0;
            opacity: 0.85;
          }
          82% {
            opacity: 0;
          }
          100% {
            stroke-dashoffset: 260;
            opacity: 0;
          }
        }

        @keyframes neaAmbientGlow {
          0%, 28% {
            opacity: 0.08;
            transform: scale(0.85);
          }
          33% {
            opacity: 0.55;
            transform: scale(1.15);
          }
          50%, 76% {
            opacity: 0.45;
            transform: scale(1.05);
          }
          82%, 100% {
            opacity: 0.08;
            transform: scale(0.85);
          }
        }

        @keyframes neaNodePulse {
          0%, 42% {
            opacity: 0.3;
            transform: scale(1);
          }
          56%, 74% {
            opacity: 1;
            transform: scale(1.4);
          }
          82%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
        }

        @keyframes neaRunnerBar {
          0% {
            left: -35%;
          }
          50% {
            left: 55%;
          }
          100% {
            left: 105%;
          }
        }

        .nea-plug-anim {
          transform-box: fill-box;
          transform-origin: center;
          animation: neaPlugMotion 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          will-change: transform;
        }

        .nea-flash-anim {
          transform-box: fill-box;
          transform-origin: center;
          animation: neaContactFlash 3s ease-out infinite;
          will-change: transform, opacity;
        }

        .nea-cable-anim {
          stroke-dasharray: 420;
          animation: neaCableCurrent 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          will-change: stroke-dashoffset, opacity;
        }

        .nea-circuit-anim {
          stroke-dasharray: 120 140;
          animation: neaCircuitSurge 3s ease-out infinite;
          will-change: stroke-dashoffset, opacity;
        }

        .nea-ambient-anim {
          transform-box: fill-box;
          transform-origin: center;
          animation: neaAmbientGlow 3s ease-in-out infinite;
          will-change: transform, opacity;
        }

        .nea-node-anim {
          transform-box: fill-box;
          transform-origin: center;
          animation: neaNodePulse 3s ease-in-out infinite;
          will-change: transform, opacity;
        }

        .nea-runner-anim {
          animation: neaRunnerBar 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          will-change: left;
        }
      `}</style>

      {/* Main Vector Stage */}
      <div className="relative w-full max-w-[540px] aspect-[16/9] min-h-[220px] flex items-center justify-center">
        <svg
          viewBox="0 0 640 360"
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full drop-shadow-2xl overflow-visible pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            {/* Cable gradients */}
            <linearGradient id="cableBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="40%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            <linearGradient id="cableGlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="35%" stopColor="#06b6d4" />
              <stop offset="70%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#ffffff" />
            </linearGradient>

            {/* Plug casing gradient */}
            <linearGradient id="plugGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="60%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* Metal prongs gradient */}
            <linearGradient id="prongMetalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="50%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>

            {/* Socket Faceplate gradients */}
            <linearGradient id="socketPlateGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="40%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#090e17" />
            </linearGradient>

            <linearGradient id="socketWellGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#020617" />
              <stop offset="100%" stopColor="#0b1324" />
            </linearGradient>

            {/* Electric Blue Radial Ambient Glow */}
            <radialGradient id="electricBurstRadial" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.85" />
              <stop offset="45%" stopColor="#0284c7" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0" />
            </radialGradient>

            {/* Glow Filters */}
            <filter id="electricFilter" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur1" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur2" />
              <feMerge>
                <feMergeNode in="blur1" />
                <feMergeNode in="blur2" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="softGlowFilter" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* -------------------------------------------------------------
              LAYER 1: BACKGROUND AMBIENT ILLUMINATION & CIRCUIT TRACES
              Originates outward from the central socket hub at (400, 180)
          ------------------------------------------------------------- */}
          <g className="z-0">
            {/* Ambient radial lighting pool */}
            <circle
              cx="400"
              cy="180"
              r="170"
              fill="url(#electricBurstRadial)"
              className="nea-ambient-anim"
            />

            {/* Branching Grid Line 1: Top-Left to High Voltage node */}
            <path
              d="M 390 125 L 390 60 L 310 25 L 180 25 L 120 70"
              fill="none"
              stroke="#0369a1"
              strokeWidth="1.5"
              strokeOpacity="0.25"
              strokeLinecap="round"
            />
            <path
              d="M 390 125 L 390 60 L 310 25 L 180 25 L 120 70"
              fill="none"
              stroke="url(#cableGlowGrad)"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeDasharray="120 140"
              filter="url(#electricFilter)"
              className="nea-circuit-anim"
            />
            <circle cx="310" cy="25" r="3.5" fill="#38bdf8" className="nea-node-anim" />
            <circle cx="180" cy="25" r="3" fill="#38bdf8" className="nea-node-anim" />

            {/* Branching Grid Line 2: Top-Right to Feeder Distribution */}
            <path
              d="M 425 125 L 465 65 L 540 65 L 600 25"
              fill="none"
              stroke="#0369a1"
              strokeWidth="1.5"
              strokeOpacity="0.25"
              strokeLinecap="round"
            />
            <path
              d="M 425 125 L 465 65 L 540 65 L 600 25"
              fill="none"
              stroke="url(#cableGlowGrad)"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeDasharray="120 140"
              filter="url(#electricFilter)"
              className="nea-circuit-anim"
              style={{ animationDelay: '0.06s' }}
            />
            <circle cx="465" cy="65" r="3.5" fill="#38bdf8" className="nea-node-anim" />
            <circle cx="540" cy="65" r="3" fill="#38bdf8" className="nea-node-anim" />

            {/* Branching Grid Line 3: Direct East Bus to Substation */}
            <path
              d="M 455 180 L 525 180 L 565 145 L 635 145"
              fill="none"
              stroke="#0369a1"
              strokeWidth="1.5"
              strokeOpacity="0.25"
              strokeLinecap="round"
            />
            <path
              d="M 455 180 L 525 180 L 565 145 L 635 145"
              fill="none"
              stroke="url(#cableGlowGrad)"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeDasharray="120 140"
              filter="url(#electricFilter)"
              className="nea-circuit-anim"
              style={{ animationDelay: '0.12s' }}
            />
            <circle cx="525" cy="180" r="3.5" fill="#38bdf8" className="nea-node-anim" />
            <circle cx="565" cy="145" r="3" fill="#38bdf8" className="nea-node-anim" />

            {/* Branching Grid Line 4: Bottom-Right to Ward Line */}
            <path
              d="M 430 235 L 475 295 L 555 295 L 605 335"
              fill="none"
              stroke="#0369a1"
              strokeWidth="1.5"
              strokeOpacity="0.25"
              strokeLinecap="round"
            />
            <path
              d="M 430 235 L 475 295 L 555 295 L 605 335"
              fill="none"
              stroke="url(#cableGlowGrad)"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeDasharray="120 140"
              filter="url(#electricFilter)"
              className="nea-circuit-anim"
              style={{ animationDelay: '0.16s' }}
            />
            <circle cx="475" cy="295" r="3.5" fill="#38bdf8" className="nea-node-anim" />
            <circle cx="555" cy="295" r="3" fill="#38bdf8" className="nea-node-anim" />

            {/* Branching Grid Line 5: Bottom Ground Trunk */}
            <path
              d="M 400 235 L 400 305 L 325 335 L 210 335"
              fill="none"
              stroke="#0369a1"
              strokeWidth="1.5"
              strokeOpacity="0.25"
              strokeLinecap="round"
            />
            <path
              d="M 400 235 L 400 305 L 325 335 L 210 335"
              fill="none"
              stroke="url(#cableGlowGrad)"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeDasharray="120 140"
              filter="url(#electricFilter)"
              className="nea-circuit-anim"
              style={{ animationDelay: '0.20s' }}
            />
            <circle cx="400" cy="305" r="3.5" fill="#38bdf8" className="nea-node-anim" />
            <circle cx="325" cy="335" r="3" fill="#38bdf8" className="nea-node-anim" />

            {/* Branching Grid Line 6: Bottom-Left to Municipal Loop */}
            <path
              d="M 365 215 L 305 265 L 215 265 L 155 315"
              fill="none"
              stroke="#0369a1"
              strokeWidth="1.5"
              strokeOpacity="0.25"
              strokeLinecap="round"
            />
            <path
              d="M 365 215 L 305 265 L 215 265 L 155 315"
              fill="none"
              stroke="url(#cableGlowGrad)"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeDasharray="120 140"
              filter="url(#electricFilter)"
              className="nea-circuit-anim"
              style={{ animationDelay: '0.14s' }}
            />
            <circle cx="305" cy="265" r="3.5" fill="#38bdf8" className="nea-node-anim" />
          </g>

          {/* -------------------------------------------------------------
              LAYER 2: STATIONARY ELECTRICAL WALL SOCKET
              Centered at (400, 180)
          ------------------------------------------------------------- */}
          <g id="nea-wall-socket">
            {/* Outer socket shadow */}
            <rect
              x="343"
              y="118"
              width="114"
              height="124"
              rx="22"
              fill="#000000"
              opacity="0.45"
            />

            {/* Modern civic electrical faceplate */}
            <rect
              x="345"
              y="115"
              width="110"
              height="130"
              rx="20"
              fill="url(#socketPlateGrad)"
              stroke="#334155"
              strokeWidth="2"
            />

            {/* Beveled faceplate rim highlight */}
            <rect
              x="347"
              y="117"
              width="106"
              height="126"
              rx="18"
              fill="none"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="1"
            />

            {/* Corner mounting screw indentations */}
            <circle cx="357" cy="127" r="2.2" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />
            <circle cx="443" cy="127" r="2.2" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />
            <circle cx="357" cy="233" r="2.2" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />
            <circle cx="443" cy="233" r="2.2" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />

            {/* Socket inner circular recessed well */}
            <circle
              cx="400"
              cy="180"
              r="44"
              fill="url(#socketWellGrad)"
              stroke="#1e293b"
              strokeWidth="2"
            />

            {/* Soft inner socket rim shadow */}
            <circle
              cx="400"
              cy="180"
              r="40"
              fill="none"
              stroke="#020617"
              strokeWidth="2.5"
            />

            {/* Ground safety clips */}
            <rect x="397" y="142" width="6" height="8" rx="2" fill="#020617" stroke="#334155" strokeWidth="0.8" />
            <rect x="397" y="210" width="6" height="8" rx="2" fill="#020617" stroke="#334155" strokeWidth="0.8" />

            {/* Top & Bottom Receptacle slots (where horizontal prongs enter) */}
            {/* Top slot (Neutral): y=170 */}
            <rect
              x="372"
              y="170"
              width="16"
              height="6"
              rx="2"
              fill="#020617"
              stroke="#1e293b"
              strokeWidth="1"
            />
            {/* Bottom slot (Live / Phase): y=184 */}
            <rect
              x="372"
              y="184"
              width="16"
              height="6"
              rx="2"
              fill="#020617"
              stroke="#1e293b"
              strokeWidth="1"
            />

            {/* Subtle civic NEA brand indicator on faceplate */}
            <text
              x="400"
              y="134"
              textAnchor="middle"
              fill="#64748b"
              fontSize="7"
              fontWeight="800"
              letterSpacing="1.5"
            >
              NEA 230V
            </text>
          </g>

          {/* -------------------------------------------------------------
              LAYER 3: ANIMATED CHARGER ASSEMBLY (CABLE + PLUG)
              Moves smoothly into the socket with precision alignment
          ------------------------------------------------------------- */}
          <g className="nea-plug-anim">
            {/* 1. Base Physical Cable (Dark charcoal with realistic cylindrical highlight) */}
            <path
              d="M -30 265 C 70 265, 140 180, 245 180"
              fill="none"
              stroke="#020617"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <path
              d="M -30 265 C 70 265, 140 180, 245 180"
              fill="none"
              stroke="url(#cableBodyGrad)"
              strokeWidth="8"
              strokeLinecap="round"
            />
            {/* Subtle top reflection along the cable curve */}
            <path
              d="M -30 263 C 70 263, 140 178, 245 178"
              fill="none"
              stroke="rgba(255, 255, 255, 0.12)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />

            {/* 2. Glowing Electric Current (Animates along cable after connection!) */}
            <path
              d="M -30 265 C 70 265, 140 180, 245 180"
              fill="none"
              stroke="url(#cableGlowGrad)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray="420"
              filter="url(#electricFilter)"
              className="nea-cable-anim"
            />

            {/* 3. Charger Cable Strain-Relief Boot (Flexible grooved rubber) */}
            <g id="strain-relief" fill="#1e293b" stroke="#0f172a" strokeWidth="0.8">
              <rect x="238" y="174" width="4" height="12" rx="2" />
              <rect x="243" y="172" width="4" height="16" rx="2" />
              <rect x="248" y="170" width="5" height="20" rx="2" />
              <rect x="254" y="167" width="6" height="26" rx="2" />
              <rect x="261" y="164" width="7" height="32" rx="2" />
            </g>

            {/* 4. Charger Plug Main Body (Modern ergonomic block) */}
            {/* Plug Drop Shadow */}
            <rect
              x="266"
              y="157"
              width="76"
              height="48"
              rx="12"
              fill="#000000"
              opacity="0.5"
            />

            {/* Plug Outer Shell */}
            <rect
              x="268"
              y="155"
              width="74"
              height="50"
              rx="11"
              fill="url(#plugGrad)"
              stroke="#334155"
              strokeWidth="1.8"
            />

            {/* Shell Top Edge Highlight */}
            <rect
              x="270"
              y="156.5"
              width="70"
              height="20"
              rx="9"
              fill="none"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="1"
            />

            {/* Ergonomic Textured Grip Ribs on Top & Bottom */}
            <line x1="288" y1="160" x2="308" y2="160" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
            <line x1="288" y1="164" x2="308" y2="164" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
            <line x1="288" y1="196" x2="308" y2="196" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
            <line x1="288" y1="200" x2="308" y2="200" stroke="#334155" strokeWidth="2" strokeLinecap="round" />

            {/* Status indicator LED on charger body */}
            <circle cx="320" cy="180" r="3" fill="#0f172a" stroke="#334155" strokeWidth="0.8" />
            <circle
              cx="320"
              cy="180"
              r="2.2"
              fill="#38bdf8"
              filter="url(#softGlowFilter)"
              className="nea-cable-anim"
            />

            {/* 5. Solid Metal Prongs (Enter into the socket slots) */}
            {/* Top prong: y=170.5 */}
            <rect
              x="342"
              y="170.5"
              width="34"
              height="5"
              rx="2"
              fill="url(#prongMetalGrad)"
              stroke="#64748b"
              strokeWidth="0.8"
            />
            {/* Bottom prong: y=184.5 */}
            <rect
              x="342"
              y="184.5"
              width="34"
              height="5"
              rx="2"
              fill="url(#prongMetalGrad)"
              stroke="#64748b"
              strokeWidth="0.8"
            />
          </g>

          {/* -------------------------------------------------------------
              LAYER 4: CONNECTION SPARK & ARC BURST
              Ignites at connection contact interface (345, 180)
          ------------------------------------------------------------- */}
          <g id="connection-sparks" className="nea-flash-anim">
            {/* Radial glow flash */}
            <circle
              cx="345"
              cy="180"
              r="26"
              fill="url(#electricBurstRadial)"
            />

            {/* Expanding shock ring */}
            <circle
              cx="345"
              cy="180"
              r="18"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.5"
              filter="url(#electricFilter)"
            />

            {/* Small energetic electric spark arcs */}
            <path
              d="M 345 180 L 333 166 M 345 180 L 345 158 M 345 180 L 358 168 M 345 180 L 362 180 M 345 180 L 356 194 M 345 180 L 345 202 M 345 180 L 334 192"
              stroke="#e0f2fe"
              strokeWidth="2"
              strokeLinecap="round"
              filter="url(#electricFilter)"
            />

            {/* Core incandescent center */}
            <circle cx="345" cy="180" r="4" fill="#ffffff" />
          </g>
        </svg>
      </div>

      {/* -------------------------------------------------------------
          STEP 5: LOADING INDICATOR & INDETERMINATE PROGRESS BAR
      ------------------------------------------------------------- */}
      <div className="mt-4 flex flex-col items-center text-center space-y-2 max-w-md px-4">
        {/* Status Heading */}
        <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>{titleText}</span>
        </h3>

        {/* Secondary Civic Notice */}
        {subText && (
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {subText}
          </p>
        )}

        {/* Indeterminate Animated Progress Bar */}
        <div
          className="mt-2 w-48 sm:w-56 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800/80 overflow-hidden relative border border-slate-300/50 dark:border-slate-700/50"
          aria-hidden="true"
        >
          <div
            className="nea-runner-anim absolute top-0 bottom-0 w-24 rounded-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_#38bdf8]"
          />
        </div>
      </div>
    </div>
  );
};

export default ElectricChargerLoader;
