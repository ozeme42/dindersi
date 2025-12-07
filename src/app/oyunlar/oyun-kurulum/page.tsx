// THIS IS A GENERALIZED, REUSABLE SETUP PAGE COMPONENT.
// IT IS NOT ACCESSED VIA A URL BUT IMPORTED BY OTHER pages.

'use client';

import React, { Suspense } from "react";
import { Loader2 } from "lucide-react";
import OyunKurulum from './SetupComponent';


function OyunKurulumWrapper() {
    // This is now a Client Component because it uses `useSearchParams`.
    // The OyunKurulum component can now be rendered here.
    return <OyunKurulum />;
}


export default function OyunKurulumSuspense() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <OyunKurulumWrapper />
        </Suspense>
    );
}
