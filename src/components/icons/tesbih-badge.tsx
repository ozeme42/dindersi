
import { cn } from "@/lib/utils";
import React from "react";

export const TesbihBadge = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("text-emerald-600", className)}
  >
    <path d="M4 12a8 8 0 0 1 16 0" />
    <path d="M12 4V2.5" />
    <circle cx="12" cy="12" r="2" />
    <path d="m16.24 7.76 1.06-1.06" />
    <circle cx="18.36" cy="5.64" r="1" />
    <path d="M20 12h1.5" />
    <circle cx="14" cy="12" r="2" />
    <path d="m19.07 14.93-1.06 1.06" />
    <circle cx="20.49" cy="17.05" r="1" />
    <path d="M12 20v1.5" />
    <circle cx="12" cy="14" r="2" />
    <path d="m4.93 14.93 1.06 1.06" />
    <circle cx="3.51" cy="17.05" r="1" />
    <path d="M4 12H2.5" />
    <circle cx="10" cy="12" r="2" />
    <path d="m7.76 7.76 1.06-1.06" />
    <circle cx="5.64" cy="5.64" r="1" />
  </svg>
);
