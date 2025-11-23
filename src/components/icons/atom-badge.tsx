
import { cn } from "@/lib/utils";
import React from "react";

export const AtomBadge = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("text-sky-500", className)}
  >
    <circle cx="12" cy="12" r="1" />
    <path d="M20.2 20.2c2.04-2.03.02-5.71-1.99-7.72-2.01-2.01-5.7-4.03-7.72-1.99" />
    <path d="M3.8 3.8c-2.04 2.03-.02 5.71 1.99 7.72 2.01 2.01 5.7 4.03 7.72 1.99" />
    <path d="M8.27 21.92c2.42.13 4.8-.97 5.6-3.37" />
    <path d="M15.73 2.08c-2.42-.13-4.8.97-5.6 3.37" />
  </svg>
);
