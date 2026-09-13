import React from 'react';

interface SundaramLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const SundaramLogo: React.FC<SundaramLogoProps> = ({ 
  className = '', 
  size = 'md' 
}) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-14 h-14'
  };

  const dim = sizeMap[size] || sizeMap.md;

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${dim} ${className}`}>
      <svg 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm transition-transform hover:scale-105"
        aria-label="Sundaram Prep Official Emblem"
      >
        <defs>
          {/* Deep Navy Shield Gradient */}
          <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0B2545" />
            <stop offset="50%" stopColor="#0D3269" />
            <stop offset="100%" stopColor="#061528" />
          </linearGradient>

          {/* Indian Tricolour Flow Gradient */}
          <linearGradient id="tricolourRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF671F" />
            <stop offset="45%" stopColor="#FF9933" />
            <stop offset="50%" stopColor="#FFFFFF" />
            <stop offset="55%" stopColor="#138808" />
            <stop offset="100%" stopColor="#046A38" />
          </linearGradient>

          {/* Gold Accent Gradient */}
          <linearGradient id="goldGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FCD34D" />
            <stop offset="100%" stopColor="#D4AF37" />
          </linearGradient>
        </defs>

        {/* Outer Rounded Shield Frame */}
        <rect 
          x="4" 
          y="4" 
          width="92" 
          height="92" 
          rx="24" 
          fill="url(#shieldGrad)" 
          stroke="url(#tricolourRing)" 
          strokeWidth="3.5" 
        />

        {/* Subtle Ashoka Chakra Rays in Background */}
        <circle cx="50" cy="50" r="32" stroke="#357BB7" strokeWidth="1" strokeDasharray="2 3" opacity="0.4" />

        {/* Stylized Open Book of Knowledge (White Pages) */}
        <path 
          d="M 28 62 C 38 58, 46 60, 50 64 C 54 60, 62 58, 72 62 L 72 40 C 62 36, 54 38, 50 42 C 46 38, 38 36, 28 40 Z" 
          fill="#FFFFFF" 
          opacity="0.95"
        />

        {/* Central Spine */}
        <path d="M 50 42 L 50 64" stroke="#0D3269" strokeWidth="2.5" strokeLinecap="round" />

        {/* Knowledge Flame (Saffron & Gold) */}
        <path 
          d="M 50 20 C 53 26, 57 29, 57 34 C 57 39, 53 41, 50 41 C 47 41, 43 39, 43 34 C 43 29, 47 26, 50 20 Z" 
          fill="url(#goldGlow)" 
        />
        <path 
          d="M 50 24 C 51.5 28, 54 30, 54 33 C 54 36, 52 38, 50 38 C 48 38, 46 36, 46 33 C 46 30, 48.5 28, 50 24 Z" 
          fill="#FF671F" 
        />

        {/* Ashoka Chakra Star Center Dot */}
        <circle cx="50" cy="52" r="3.5" fill="#0D3269" />
        <circle cx="50" cy="52" r="1.5" fill="#FCD34D" />

        {/* Bottom Tricolour Ribbon Curve */}
        <path 
          d="M 32 76 C 44 72, 56 72, 68 76" 
          stroke="#FF671F" 
          strokeWidth="3" 
          strokeLinecap="round" 
        />
        <path 
          d="M 36 81 C 45 78, 55 78, 64 81" 
          stroke="#046A38" 
          strokeWidth="3" 
          strokeLinecap="round" 
        />
      </svg>
    </div>
  );
};
