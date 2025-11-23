
import { cn } from "@/lib/utils";
import React from "react";

export const GamepadBadge = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("text-slate-500", className)}
  >
    <line x1="6" x2="10" y1="12" y2="12" />
    <line x1="8" x2="8" y1="10" y2="14" />
    <path d="M10 18.5v-13A2.5 2.5 0 0 1 12.5 3h1A2.5 2.5 0 0 1 16 5.5v13A2.5 2.5 0 0 1 13.5 21h-1A2.5 2.5 0 0 1 10 18.5Z" />
    <path d="M17 8.5c.33.17.67.33 1 .5" />
    <path d="M17 15.5c.33-.17.67-.33 1-.5" />
  </svg>
);
