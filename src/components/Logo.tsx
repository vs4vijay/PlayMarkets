import { useId } from 'react';

// ── LogoIcon ──────────────────────────────────────────────────────────────────
// The PlayMarkets mark: a cricket ball whose upward-arching seam doubles as a
// market-trend line. Works at any size; gradient IDs are unique per instance.

export function LogoIcon({ size = 36, className = '' }: { size?: number; className?: string }) {
  const uid = useId().replace(/:/g, '');
  const gradId = `pm-bg-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="PlayMarkets logo"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#003791"/>
          <stop offset="60%"  stopColor="#1a4fab"/>
          <stop offset="100%" stopColor="#FF7722"/>
        </linearGradient>
      </defs>

      {/* Ball body */}
      <circle cx="32" cy="32" r="32" fill={`url(#${gradId})`}/>

      {/* Subtle highlight */}
      <circle cx="22" cy="18" r="10" fill="rgba(255,255,255,0.06)"/>

      {/* PRIMARY SEAM — upward arch (market trend ↑) */}
      <path
        d="M 7 41 C 15 11, 49 11, 57 41"
        stroke="white" strokeWidth="3" fill="none" strokeLinecap="round"
      />

      {/* Stitch marks crossing the primary seam */}
      <line x1="10" y1="36" x2="15" y2="30" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="20" y1="19" x2="23" y2="13" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="32" y1="14" x2="32" y2="7"  stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="44" y1="19" x2="41" y2="13" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="54" y1="36" x2="49" y2="30" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round"/>

      {/* SECONDARY SEAM — downward arch (completes the ball) */}
      <path
        d="M 7 41 C 15 60, 49 60, 57 41"
        stroke="rgba(255,255,255,0.38)" strokeWidth="2" fill="none" strokeLinecap="round"
      />

      {/* Lower stitch marks (faint) */}
      <line x1="12" y1="48" x2="17" y2="54" stroke="rgba(255,255,255,0.28)" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="32" y1="54" x2="32" y2="61" stroke="rgba(255,255,255,0.28)" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="52" y1="48" x2="47" y2="54" stroke="rgba(255,255,255,0.28)" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

// ── Logo (icon + wordmark) ────────────────────────────────────────────────────

export function Logo({ iconSize = 36, showTagline = true }: { iconSize?: number; showTagline?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <LogoIcon size={iconSize} className="shrink-0 rounded-xl overflow-hidden" />
      <div>
        <span className="font-black text-lg tracking-tight leading-none">
          <span className="text-[#FF7722]">Play</span>
          <span className="text-white">Markets</span>
        </span>
        {showTagline && (
          <p className="text-[10px] text-zinc-500 mt-0.5 hidden sm:block leading-none">
            The Social Prediction Layer for Live Sports
          </p>
        )}
      </div>
    </div>
  );
}
