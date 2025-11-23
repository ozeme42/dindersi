
import { cn } from "@/lib/utils";
import React from "react";

export const GsBadge = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("text-gray-700", className)}
  >
    <defs>
      <clipPath id="gsCircleClip">
        <circle cx="12" cy="12" r="12" />
      </clipPath>
    </defs>
    <g clipPath="url(#gsCircleClip)">
      <rect x="0" y="0" width="12" height="24" fill="#C10E21" />
      <rect x="12" y="0" width="12" height="24" fill="#FDB913" />
      <text x="6" y="16" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="bold" fill="white" textAnchor="middle">G</text>
      <text x="18" y="16" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="bold" fill="black" textAnchor="middle">S</text>
    </g>
  </svg>
);
