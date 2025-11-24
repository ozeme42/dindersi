

"use client";

import { Suspense, useEffect } from 'react';
import { AcikUcluCevaplaSetupClientPage } from './client-page';
import { useRouter, useSearchParams } from 'next/navigation';

function PageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isStatic = searchParams.get('static') === 'true';

    useEffect(() => {
        // If it's a static test from the teacher panel, go directly to the game.
        if (isStatic) {
            // Reconstruct the search params for the game page
            const params = new URLSearchParams(searchParams.toString());
            router.replace(`/student/acik-uclu-cevapla/oyun?${params.toString()}`);
        }
    }, [isStatic, router, searchParams]);

    // If not static, show the setup page. The loading will be handled inside.
    if (!isStatic) {
        return <AcikUcluCevaplaSetupClientPage />;
    }

    // While redirecting, show a loader
    return <div className="flex h-screen w-full items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
}

export default function AcikUcluCevaplaPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
            <PageContent />
        </Suspense>
    );
}
