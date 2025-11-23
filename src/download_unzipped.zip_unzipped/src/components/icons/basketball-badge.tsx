
import { cn } from "@/lib/utils";
import React from "react";

export const BasketballBadge = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn("text-orange-600", className)}
    >
        <circle cx="12" cy="12" r="10" />
        <path d="M4.22 4.22c4.48-4.48 15.28 15.28 0 15.56-4.48-4.48-15.28-15.28 0-15.56" />
        <path d="M19.78 4.22c-4.48-4.48-15.28 15.28 0 15.56 4.48-4.48 15.28-15.28 0-15.56" />
        <path d="M4.22 19.78c4.48 4.48 15.28-15.28 0-15.56-4.48 4.48-15.28 15.28 0 15.56" />
        <path d="M19.78 19.78c-4.48 4.48-15.28-15.28 0-15.56 4.48 4.48 15.28 15.28 0-15.56" />
    </svg>
);
