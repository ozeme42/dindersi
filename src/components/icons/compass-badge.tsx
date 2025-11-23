
import { cn } from "@/lib/utils";
import { Compass } from "lucide-react";
import React from "react";

export const CompassBadge = ({ className }: { className?: string }) => (
    <Compass className={cn("text-gray-500", className)} />
);
