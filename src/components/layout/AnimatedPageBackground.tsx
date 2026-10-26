import React from 'react';

interface AnimatedPageBackgroundProps {
  /**
   * Layout variant: 'public' for resident/public pages, 'admin' for central console.
   */
  variant?: 'public' | 'admin';
}

export const AnimatedPageBackground: React.FC<AnimatedPageBackgroundProps> = ({
  variant = 'public',
}) => {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* -------------------------------------------------------------
          ORB 1: TOP-RIGHT DRIFTING AMBIENT GRADIENT
          Pale-blue in light mode; subdued electric-cyan/blue in dark mode.
      ------------------------------------------------------------- */}
      <div
        className={`absolute -top-32 -right-32 w-[520px] h-[520px] rounded-full blur-[110px] animate-ambient-drift-1 ${
          variant === 'admin'
            ? 'bg-blue-200/30 dark:bg-blue-600/10'
            : 'bg-sky-200/35 dark:bg-cyan-500/8'
        }`}
      />

      {/* -------------------------------------------------------------
          ORB 2: MID-LEFT DRIFTING AMBIENT GRADIENT
          Gentle civic blue tint providing depth across the screen.
      ------------------------------------------------------------- */}
      <div
        className={`absolute top-1/4 -left-36 w-[480px] h-[480px] rounded-full blur-[100px] animate-ambient-drift-2 ${
          variant === 'admin'
            ? 'bg-orange-100/25 dark:bg-orange-500/6'
            : 'bg-blue-100/40 dark:bg-blue-600/7'
        }`}
      />

      {/* -------------------------------------------------------------
          ORB 3: BOTTOM-RIGHT DRIFTING AMBIENT ACCENT
          Warm amber/electricity accent at the lower edge.
      ------------------------------------------------------------- */}
      <div
        className={`absolute -bottom-36 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] animate-ambient-drift-3 ${
          variant === 'admin'
            ? 'bg-blue-100/25 dark:bg-blue-500/6'
            : 'bg-amber-100/30 dark:bg-amber-500/4'
        }`}
      />

      {/* -------------------------------------------------------------
          SUBTLE ELECTRIC CIRCUIT WATERMARK & NODES
          Ultra-low visual intensity (2%-5% opacity) to provide authentic
          electricity-technology texture without distracting from text.
      ------------------------------------------------------------- */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.035] dark:opacity-[0.055]"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
      >
        <defs>
          <pattern
            id="nea-grid-circuit-pattern"
            width="240"
            height="240"
            patternUnits="userSpaceOnUse"
          >
            {/* Horizontal & vertical bus lines */}
            <path
              d="M 0 60 H 160 L 190 90 H 240 M 80 0 V 140 L 110 170 V 240 M 160 180 H 240"
              stroke="currentColor"
              strokeWidth="1.2"
              className="text-slate-800 dark:text-cyan-400"
            />
            {/* Small circuit junction nodes */}
            <circle cx="160" cy="60" r="2.5" fill="currentColor" className="text-slate-800 dark:text-cyan-400" />
            <circle cx="110" cy="170" r="2.5" fill="currentColor" className="text-slate-800 dark:text-cyan-400" />
          </pattern>
        </defs>

        {/* Pattern fill layer across entire background */}
        <rect width="100%" height="100%" fill="url(#nea-grid-circuit-pattern)" />

        {/* Floating soft energy nodes that slowly pulse */}
        <g className="text-cyan-600 dark:text-cyan-400">
          <circle
            cx="18%"
            cy="22%"
            r="3"
            fill="currentColor"
            className="animate-ambient-node"
            style={{ animationDelay: '0s' }}
          />
          <circle
            cx="84%"
            cy="36%"
            r="3.5"
            fill="currentColor"
            className="animate-ambient-node"
            style={{ animationDelay: '2.5s' }}
          />
          <circle
            cx="42%"
            cy="78%"
            r="3"
            fill="currentColor"
            className="animate-ambient-node"
            style={{ animationDelay: '4.5s' }}
          />
        </g>
      </svg>
    </div>
  );
};
