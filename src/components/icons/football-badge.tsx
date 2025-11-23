
import { cn } from "@/lib/utils";
import { Futbol } from "lucide-react";
import React from "react";

export const FootballBadge = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn("text-gray-700", className)}
    >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a7.5 7.5 0 0 1 7.5 7.5c0 2.07-1.68 4.23-2.92 5.5" />
        <path d="M12 2a7.5 7.5 0 0 0-7.5 7.5c0 2.07 1.68 4.23 2.92 5.5" />
        <path d="M12 22a7.5 7.5 0 0 0 7.5-7.5c0-2.07-1.68-4.23-2.92-5.5" />
        <path d="M12 22a7.5 7.5 0 0 1-7.5-7.5c0-2.07 1.68-4.23 2.92-5.5" />
        <path d="M2 12a7.5 7.5 0 0 0 7.5 7.5c2.07 0 4.23-1.68 5.5-2.92" />
        <path d="M22 12a7.5 7.5 0 0 1-7.5 7.5c-2.07 0-4.23-1.68-5.5-2.92" />
    </svg>
);
