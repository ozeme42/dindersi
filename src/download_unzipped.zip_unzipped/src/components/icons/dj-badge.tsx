
import { cn } from "@/lib/utils";
import React from "react";

export const DjBadge = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("text-fuchsia-500", className)}
  >
    <path d="M9 18V5h10v13" />
    <path d="M12.5 3a2.5 2.5 0 0 1 5 0v3a2.5 2.5 0 0 1-5 0" />
    <path d="M5.5 10a2.5 2.5 0 0 1 0 5H3" />
  </svg>
);
