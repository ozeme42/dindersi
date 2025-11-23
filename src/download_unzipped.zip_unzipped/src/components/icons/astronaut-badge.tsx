
import { cn } from "@/lib/utils";
import { Rocket } from "lucide-react";
import React from "react";

export const AstronautBadge = ({ className }: { className?: string }) => (
    <Rocket className={cn("text-indigo-500", className)} />
);
