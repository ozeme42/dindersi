
import { cn } from "@/lib/utils";
import React from "react";

export const InfinityBadge = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("text-purple-500", className)}
  >
    <path d="M10 10c-1.657 0-3-1.567-3-3.5S8.343 3 10 3s3 1.567 3 3.5-1.343 3.5-3 3.5h0zm4 4c1.657 0 3 1.567 3 3.5S15.657 21 14 21s-3-1.567-3-3.5 1.343-3.5 3-3.5h0zm-4-4h4" />
    <path d="M10 10c-1.657 0-3-1.567-3-3.5S8.343 3 10 3s3 1.567 3 3.5-1.343 3.5-3 3.5" />
    <path d="M14 14c1.657 0 3 1.567 3 3.5S15.657 21 14 21s-3-1.567-3-3.5 1.343-3.5 3-3.5" />
  </svg>
);
