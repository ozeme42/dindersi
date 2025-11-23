
import { cn } from "@/lib/utils";
import { ChefHat } from "lucide-react";
import React from "react";

export const ChefBadge = ({ className }: { className?: string }) => (
    <ChefHat className={cn("text-gray-600", className)} />
);
