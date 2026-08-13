// StowAway brand mark: a stowed container riding a single wave — storage + safe harbor.
interface StowAwayLogoProps {
  color?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function StowAwayLogo({ color = 'currentColor', size = 28, className, style }: StowAwayLogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className={className}
      style={style}
      aria-label="StowAway"
      role="img"
    >
      {/* Container */}
      <rect x="26" y="20" width="48" height="36" rx="8" fill="none" stroke={color} strokeWidth="5" />
      <line x1="30" y1="34" x2="70" y2="34" stroke={color} strokeWidth="4" strokeLinecap="round" />

      {/* Wave (Safe Harbor) */}
      <path
        d="M 12 76 Q 30 62 50 76 T 88 76"
        fill="none"
        stroke="#2EB89C"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

