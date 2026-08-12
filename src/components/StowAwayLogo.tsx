// StowAway brand mark: glasses (search), arrow (stow action), container, maritime waves.
// See stowaway-logo-config.json (v1.2) for the source spec this is ported from.
interface StowAwayLogoProps {
  color?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function StowAwayLogo({ color = 'currentColor', size = 28, className, style }: StowAwayLogoProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className={className}
      style={style}
      aria-label="StowAway"
      role="img"
    >
      {/* Frame Circle */}
      <circle cx="60" cy="60" r="55" fill="none" stroke={color} strokeWidth="2.5" />

      {/* Glasses */}
      <circle cx="42" cy="28" r="8" fill="none" stroke={color} strokeWidth="2.5" />
      <circle cx="78" cy="28" r="8" fill="none" stroke={color} strokeWidth="2.5" />
      <line x1="50" y1="28" x2="70" y2="28" stroke={color} strokeWidth="2.5" strokeLinecap="round" />

      {/* Accent Dot (Teal) */}
      <circle cx="42" cy="28" r="2.5" fill="#2EB89C" />

      {/* Arrow (Stow Action) */}
      <path d="M 60 40 L 60 60" stroke={color} strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <path
        d="M 52 54 L 60 64 L 68 54"
        stroke={color}
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Container/Mouth */}
      <path
        d="M 38 72 Q 38 68 42 68 L 78 68 Q 82 68 82 72 L 80 84 Q 80 86 78 86 L 42 86 Q 40 86 40 84 Z"
        fill="none"
        stroke="#2EB89C"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Waves (Maritime) */}
      <path
        d="M 32 92 Q 36 89 40 92 Q 44 95 48 92 Q 52 89 56 92 Q 60 95 64 92 Q 68 89 72 92 Q 76 95 80 92 Q 84 89 88 92"
        fill="none"
        stroke="#2EB89C"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.8"
      />
      <path
        d="M 30 100 Q 35 97 40 100 Q 45 103 50 100 Q 55 97 60 100 Q 65 103 70 100 Q 75 97 80 100 Q 85 103 90 100"
        fill="none"
        stroke="#FAF9F5"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
}
