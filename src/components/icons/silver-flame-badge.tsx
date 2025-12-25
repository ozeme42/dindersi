
import { cn } from "@/lib/utils";
import React from "react";

export const SilverFlameBadge = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("text-slate-300", className)}
  >
    <path d="M11.43 14.92c-.2-1.8-.4-3.4-.4-4.92h.02c0 1.5.2 3.1.4 4.9Z" />
    <path d="m15.15 9.32-1.53-1.97a2.5 2.5 0 0 0-2.38-1.38c-1.12 0-2.38.92-2.38 2.38 0 .8.23 1.54 1.97 4.38" />
    <path d="M18.07 17.97c.7 2.5 1.6 4.5 2.93 4.5 1.38 0 1.48-2.38.5-3.38-.8-.8-2.33-1.17-3.43-1.17s-2.63.38-3.43 1.17c-.98 1-.88 3.38.5 3.38 1.33 0 2.23-2 2.93-4.5Z" />
    <path d="M19 12c0 1.5-1.25 5.4-10 5.4-1.75 0-2.82-1.62-2.5-4.5" />
  </svg>
);
