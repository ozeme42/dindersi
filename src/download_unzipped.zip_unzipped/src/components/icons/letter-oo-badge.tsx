
import { cn } from "@/lib/utils";
import React from "react";

export const LetterOoBadge = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={cn("text-gray-700", className)}>
    <defs>
        <linearGradient id="gradOo" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{stopColor: '#F57C00', stopOpacity:1}} />
            <stop offset="100%" style={{stopColor: '#EF6C00', stopOpacity:1}} />
        </linearGradient>
    </defs>
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#000000" fillOpacity="0.2" stroke="#F57C00" strokeWidth="1"/>
    {/* Shadow/3D effect */}
    <text x="51%" y="51%" dominantBaseline="middle" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#000000" fillOpacity="0.4">Ö</text>
    {/* Main Letter */}
    <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="16" fontWeight="bold" fill="url(#gradOo)">Ö</text>
  </svg>
);
