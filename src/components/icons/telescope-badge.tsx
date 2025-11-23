
import { cn } from "@/lib/utils";
import { Telescope } from "lucide-react";
import React from "react";

export const TelescopeBadge = ({ className }: { className?: string }) => (
    <Telescope className={cn("text-indigo-400", className)} />
);
