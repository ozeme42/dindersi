
import { cn } from "@/lib/utils";
import React from "react";

export const SpyBadge = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("text-slate-700", className)}
  >
    <path d="M2.5 12a5.5 5.5 0 0 1 19 0" />
    <path d="M2.5 12A5.5 5.5 0 0 0 12 20a5.5 5.5 0 0 0 9.5-8" />
    <path d="M12 20V12" />
    <path d="M12 12a2.5 2.5 0 0 0-5 0" />
    <path d="M12 12a2.5 2.5 0 0 1 5 0" />
    <path d="M12 12h.01" />
  </svg>
);
