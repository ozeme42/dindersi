// THIS IS A GENERALIZED, REUSABLE SETUP PAGE COMPONENT.
// IT IS NOT ACCESSED VIA A URL BUT IMPORTED BY OTHER pages.

'use client';

import React, { Suspense, useState, useEffect } from "react";
import { 
    ArrowLeft, ArrowRight, Check, Book, Library, ListTodo, 
    PartyPopper, Sparkles, Feather, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { getCoursesForSetup as getCoursesForOyunKurulum } from './actions';
import OyunKurulum from './SetupComponent';


function OyunKurulumWrapper() {
    // This is now a Client Component because it uses `useSearchParams`.
    const searchParams = useSearchParams();

    // The OyunKurulum component can now be rendered here,
    // and it will receive searchParams as needed.
    // For simplicity, we assume OyunKurulum is now designed to be a client component
    // or we pass props to it. Let's modify OyunKurulum to be a client component.
    // So we just call it directly. The Suspense boundary is in the default export.
    return <OyunKurulum />;
}


export default function OyunKurulumSuspense() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <OyunKurulumWrapper />
        </Suspense>
    );
}