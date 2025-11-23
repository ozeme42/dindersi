
import { cn } from "@/lib/utils";
import { ShieldCheck } from "lucide-react";
import React from "react";

export const PoliceBadge = ({ className }: { className?: string }) => (
    <ShieldCheck className={cn("text-blue-600", className)} />
);
