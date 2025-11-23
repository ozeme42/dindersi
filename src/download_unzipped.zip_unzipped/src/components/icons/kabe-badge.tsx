
import { cn } from "@/lib/utils";
import React from "react";

export const KabeBadge = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("text-amber-500", className)}
  >
    <path d="M3.5 8.5v10l8.5 4 8.5-4v-10l-8.5-4z" strokeWidth="1" fill="black" />
    <path d="M12 4.5 20.5 8.5v10" strokeWidth="1" />
    <path d="M12 22.5 3.5 18.5v-10" strokeWidth="1" />
    <path d="m16.5 10.25-8.5 4" strokeWidth="1" />
    <path d="M12 4.5V1" strokeWidth="1" />
  </svg>
);
