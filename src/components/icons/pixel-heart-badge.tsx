
import { cn } from "@/lib/utils";
import React from "react";

export const PixelHeartBadge = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="currentColor"
    strokeWidth="1"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("text-red-600", className)}
  >
    <path d="M4 4h2v2H4zM6 4h2v2H6zM16 4h2v2h-2zM18 4h2v2h-2zM2 6h2v2H2zM20 6h2v2h-2zM4 18h2v2H4zM18 18h2v2h-2z"/>
    <path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
      transform="scale(0.8) translate(3, 3)"/>
  </svg>
);
