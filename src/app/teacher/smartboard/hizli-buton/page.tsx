'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { HizliButonSetupClientPage } from "./client-page";

export default function HizliButonSetupPage() {
    // Bu component, ayarları client-page'e prop olarak geçebilir.
    // Şimdilik boş bir config yolluyoruz.
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <HizliButonSetupClientPage gameConfig={{}} />
        </Suspense>
    );
}
