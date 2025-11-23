
import { cn } from "@/lib/utils";
import React from "react";

export const CamiBadge = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("text-cyan-500", className)}
  >
    <path d="M4 22h16" />
    <path d="M8 22V8" />
    <path d="M16 22V8" />
    <path d="M12 13a4 4 0 0 1-4-4h8a4 4 0 0 1-4 4Z" />
    <path d="M18 8a6 6 0 0 0-12 0" />
    <path d="M12 4V2" />
    <path d="M12 13v9" />
  </svg>
);
