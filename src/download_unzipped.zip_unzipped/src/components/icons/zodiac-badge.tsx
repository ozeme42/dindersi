
import { cn } from "@/lib/utils";
import React from "react";

export const ZodiacBadge = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("text-purple-400", className)}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a10 10 0 0 0-10 10" />
    <path d="M12 22a10 10 0 0 1-10-10" />
    <path d="M2 12a10 10 0 0 1 10 10" />
    <path d="M22 12a10 10 0 0 0-10 10" />
    <path d="m2 12 5 3" />
    <path d="m17 9 5 3" />
    <path d="m9 17 3 5" />
    <path d="M15 2l-3 5" />
  </svg>
);
