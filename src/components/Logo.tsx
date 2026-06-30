import React from "react";

export function Logo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 120 120" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      aria-label="NEXUS Logo"
    >
      <defs>
        <linearGradient id="nexusLeft" x1="0" y1="96" x2="0" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="nexusRight" x1="0" y1="24" x2="0" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="nexusDiag" x1="34" y1="24" x2="86" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>

      {/* Outer Broken Circle */}
      <circle 
        cx="60" cy="60" r="50" 
        stroke="#34d399" strokeWidth="1.5" fill="none" 
        strokeDasharray="80 20 60 20 40 20" 
        strokeLinecap="round" opacity="0.5" 
        transform="rotate(-45 60 60)" 
      />
      
      {/* Clock Tick Marks */}
      <circle 
        cx="60" cy="60" r="54" 
        stroke="#10b981" strokeWidth="2" fill="none" 
        strokeDasharray="1 18" strokeLinecap="round" opacity="0.3" 
        transform="rotate(-15 60 60)" 
      />
      
      {/* Speed Lines (Left) */}
      <line x1="2" y1="52" x2="10" y2="52" stroke="#10b981" strokeWidth="3" strokeLinecap="round" opacity="0.5"/>
      <line x1="6" y1="62" x2="12" y2="62" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
      <line x1="4" y1="72" x2="10" y2="72" stroke="#10b981" strokeWidth="3" strokeLinecap="round" opacity="0.7"/>

      {/* Sparkle (Right) */}
      <path 
        d="M 106 50 Q 106 60 116 60 Q 106 60 106 70 Q 106 60 96 60 Q 106 60 106 50 Z" 
        fill="#10b981" opacity="0.9"
      />

      {/* The N Logo */}
      {/* Left Vertical Leg (Fades to dark at the top fold) */}
      <path 
        d="M 14 96 L 14 44 A 20 20 0 0 1 34 24 L 34 96 Z" 
        fill="url(#nexusLeft)" 
      />
      
      {/* Right Vertical Leg (Fades to dark at the bottom fold) */}
      <path 
        d="M 86 24 L 106 24 L 106 76 A 20 20 0 0 1 86 96 Z" 
        fill="url(#nexusRight)" 
      />

      {/* Center Diagonal Fold (Bright overlay) */}
      <path 
        d="M 34 24 L 86 76 L 86 96 L 34 44 Z" 
        fill="url(#nexusDiag)" 
      />
    </svg>
  );
}
