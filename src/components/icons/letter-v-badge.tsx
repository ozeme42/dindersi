
import { cn } from "@/lib/utils";
import React from "react";

export const LetterVBadge = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={cn("text-gray-700", className)}>
    <defs>
        <linearGradient id="gradV" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{stopColor: '#303F9F', stopOpacity:1}} />
            <stop offset="100%" style={{stopColor: '#1A237E', stopOpacity:1}} />
        </linearGradient>
    </defs>
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#000000" fillOpacity="0.2" stroke="#303F9F" strokeWidth="1"/>
    {/* Shadow/3D effect */}
    <text x="51%" y="51%" dominantBaseline="middle" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#000000" fillOpacity="0.4">V</text>
    {/* Main Letter */}
    <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="16" fontWeight="bold" fill="url(#gradV)">V</text>
  </svg>
);
