
import { cn } from "@/lib/utils";
import React from "react";

export const BrainBadge = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("text-pink-500", className)}
  >
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08.5.5 0 0 0-.23-.44" />
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08.5.5 0 0 1 .23-.44" />
    <path d="M12 4.5a2.5 2.5 0 0 0-4.96-2.44" />
    <path d="M12 4.5a2.5 2.5 0 0 1 4.96-2.44" />
  </svg>
);
