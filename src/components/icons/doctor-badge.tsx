
import { cn } from "@/lib/utils";
import { Stethoscope } from "lucide-react";
import React from "react";

export const DoctorBadge = ({ className }: { className?: string }) => (
    <Stethoscope className={cn("text-red-500", className)} />
);
