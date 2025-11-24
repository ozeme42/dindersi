

"use client";

import { Suspense, useEffect } from 'react';
import { AdamAsmacaSetupClientPage } from './client-page';
import { useRouter, useSearchParams } from 'next/navigation';

function PageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isStatic = searchParams.get('static') === 'true';

    useEffect(() => {
        if (isStatic) {
            const params = new URLSearchParams(searchParams.toString());
            router.replace(`/student/adam-asmaca/oyun?${params.toString()}`);
        }
    }, [isStatic, router, searchParams]);

    if (!isStatic) {
        return <AdamAsmacaSetupClientPage />;
    }

    return <div className="flex h-screen w-full items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
}


export default function AdamAsmacaPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
            <PageContent />
        </Suspense>
    );
}
