
import { cn } from "@/lib/utils";
import { Megaphone } from "lucide-react";
import React from "react";

export const MegaphoneBadge = ({ className }: { className?: string }) => (
    <Megaphone className={cn("text-orange-500", className)} />
);
