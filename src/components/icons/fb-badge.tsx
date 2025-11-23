
import { cn } from "@/lib/utils";
import React from "react";

export const FbBadge = ({ className }: { className?: string }) => (
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
      <clipPath id="fbCircleClip">
        <circle cx="12" cy="12" r="12" />
      </clipPath>
    </defs>
    <g clipPath="url(#fbCircleClip)">
      <rect x="0" y="0" width="12" height="24" fill="#003366" />
      <rect x="12" y="0" width="12" height="24" fill="#FBB03B" />
      <text x="6" y="16" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="bold" fill="#FBB03B" textAnchor="middle">F</text>
      <text x="18" y="16" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="bold" fill="#003366" textAnchor="middle">B</text>
    </g>
  </svg>
);
