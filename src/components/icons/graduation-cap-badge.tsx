
import { cn } from "@/lib/utils";
import { GraduationCap } from "lucide-react";
import React from "react";

export const GraduationCapBadge = ({ className }: { className?: string }) => (
    <GraduationCap className={cn("text-gray-700", className)} />
);
