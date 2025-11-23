
import { cn } from "@/lib/utils";
import { Lightbulb } from "lucide-react";
import React from "react";

export const LightbulbBadge = ({ className }: { className?: string }) => (
    <Lightbulb className={cn("text-yellow-400", className)} />
);
