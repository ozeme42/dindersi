
import { cn } from "@/lib/utils";
import { Pencil } from "lucide-react";
import React from "react";

export const PencilBadge = ({ className }: { className?: string }) => (
    <Pencil className={cn("text-orange-400", className)} />
);
