import React from 'react';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = "w-full h-full" }) => {
  return (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="p0" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#38BDF8" />
        </radialGradient>
        <radialGradient id="p45" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#C084FC" />
        </radialGradient>
        <radialGradient id="p90" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#9333EA" />
        </radialGradient>
        <radialGradient id="p135" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#93C5FD" />
        </radialGradient>
        <radialGradient id="p180" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#2563EB" />
        </radialGradient>
        <radialGradient id="p225" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#0284C7" />
        </radialGradient>
        <radialGradient id="p270" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#0EA5E9" />
        </radialGradient>
        <radialGradient id="p315" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#7DD3FC" />
        </radialGradient>
      </defs>
      <g transform="translate(50, 50)">
        <circle cx="0" cy="-18" r="22" fill="url(#p0)" transform="rotate(0)" />
        <circle cx="0" cy="-18" r="22" fill="url(#p45)" transform="rotate(45)" />
        <circle cx="0" cy="-18" r="22" fill="url(#p90)" transform="rotate(90)" />
        <circle cx="0" cy="-18" r="22" fill="url(#p135)" transform="rotate(135)" />
        <circle cx="0" cy="-18" r="22" fill="url(#p180)" transform="rotate(180)" />
        <circle cx="0" cy="-18" r="22" fill="url(#p225)" transform="rotate(225)" />
        <circle cx="0" cy="-18" r="22" fill="url(#p270)" transform="rotate(270)" />
        <circle cx="0" cy="-18" r="22" fill="url(#p315)" transform="rotate(315)" />
      </g>
    </svg>
  );
};
