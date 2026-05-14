import React from 'react';

/**
 * Cheeseburguers — Logo SVG de 5 capas
 * bun-top → queso-con-goteo → carne → lechuga → bun-bottom
 * 
 * Props: size (default 48), className
 */
const BurgerLogo = ({ size = 48, className = '' }) => (
  <svg
    viewBox="0 0 80 72"
    width={size}
    height={size * 0.9}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="Cheeseburguers logo"
  >
    {/* ── Layer 1: Top Bun ── */}
    <path
      d="M10 28 C10 14, 70 14, 70 28 L70 32 L10 32 Z"
      fill="#c8941f"
      stroke="#1b1410"
      strokeWidth="1.5"
    />
    {/* Sesame seeds */}
    <ellipse cx="30" cy="22" rx="2.5" ry="1.5" fill="#fbf7ed" opacity="0.7" />
    <ellipse cx="45" cy="19" rx="2.5" ry="1.5" fill="#fbf7ed" opacity="0.7" />
    <ellipse cx="55" cy="24" rx="2" ry="1.2" fill="#fbf7ed" opacity="0.7" />
    <ellipse cx="25" cy="26" rx="2" ry="1.2" fill="#fbf7ed" opacity="0.5" />

    {/* ── Layer 2: Cheese with drip ── */}
    <path
      d="M8 32 L72 32 L72 37 
         Q72 37, 70 37 L68 37 Q66 37, 66 40 Q66 44, 64 44 L62 37 
         L50 37 Q48 37, 48 40 Q48 43, 46 43 L44 37 
         L28 37 Q26 37, 26 41 Q26 45, 24 45 L22 37 
         L10 37 Q8 37, 8 32 Z"
      fill="#e8a920"
      stroke="#1b1410"
      strokeWidth="1.2"
    />

    {/* ── Layer 3: Meat Patty ── */}
    <rect
      x="9" y="40"
      width="62" height="10"
      rx="5" ry="5"
      fill="#3d2817"
      stroke="#1b1410"
      strokeWidth="1.2"
    />
    {/* Grill marks */}
    <line x1="20" y1="43" x2="20" y2="48" stroke="#2a1a0e" strokeWidth="1" opacity="0.4" />
    <line x1="35" y1="43" x2="35" y2="48" stroke="#2a1a0e" strokeWidth="1" opacity="0.4" />
    <line x1="50" y1="43" x2="50" y2="48" stroke="#2a1a0e" strokeWidth="1" opacity="0.4" />
    <line x1="62" y1="43" x2="62" y2="48" stroke="#2a1a0e" strokeWidth="1" opacity="0.4" />

    {/* ── Layer 4: Lettuce ── */}
    <path
      d="M7 52 Q12 48, 18 52 Q24 56, 30 52 Q36 48, 42 52 Q48 56, 54 52 Q60 48, 66 52 Q72 56, 73 52 
         L73 55 Q72 58, 66 55 Q60 52, 54 55 Q48 58, 42 55 Q36 52, 30 55 Q24 58, 18 55 Q12 52, 7 55 Z"
      fill="#5b7c3a"
      stroke="#1b1410"
      strokeWidth="1.2"
    />

    {/* ── Layer 5: Bottom Bun ── */}
    <path
      d="M10 56 L70 56 L70 62 Q70 68, 40 68 Q10 68, 10 62 Z"
      fill="#c8941f"
      stroke="#1b1410"
      strokeWidth="1.5"
    />
  </svg>
);

export default BurgerLogo;
