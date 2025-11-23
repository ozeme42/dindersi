
import { cn } from "@/lib/utils";
import React from "react";

export const HilalBadge = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("text-teal-400", className)}
  >
    <path d="M12 3a9 9 0 1 0 9 9c0-.46-.02-.91-.06-1.36A5.5 5.5 0 0 1 12 10.5 5.5 5.5 0 0 1 6.5 5c.34-.04.69-.06 1.04-.06" />
    <path d="M16 4a2 2 0 0 0-2 2 2 2 0 0 0-2-2 2 2 0 0 0-2 2 2 2 0 0 0 2 2 2 2 0 0 0 2-2" />
  </svg>
);
