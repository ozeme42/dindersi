
import { cn } from "@/lib/utils";
import React from "react";

export const BjkBadge = ({ className }: { className?: string }) => (
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
      <clipPath id="bjkCircleClip">
        <circle cx="12" cy="12" r="12" />
      </clipPath>
    </defs>
    <g clipPath="url(#bjkCircleClip)">
      <rect x="0" y="0" width="12" height="24" fill="white" />
      <rect x="12" y="0" width="12" height="24" fill="black" />
       <text x="5" y="16" fontFamily="Arial, sans-serif" fontSize="6" fontWeight="bold" fill="black" textAnchor="middle">B</text>
       <text x="12" y="16" fontFamily="Arial, sans-serif" fontSize="6" fontWeight="bold" fill="white" textAnchor="middle">J</text>
      <text x="19" y="16" fontFamily="Arial, sans-serif" fontSize="6" fontWeight="bold" fill="white" textAnchor="middle">K</text>
    </g>
  </svg>
);
