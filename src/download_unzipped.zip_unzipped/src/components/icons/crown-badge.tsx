
import { cn } from "@/lib/utils";
import React from "react";

export const CrownBadge = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("text-yellow-500", className)}
  >
    <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7z" />
    <path d="M12 22V8" />
  </svg>
);
