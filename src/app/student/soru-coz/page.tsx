
"use client";

import { Suspense } from 'react';
import { SoruCozSetupClientPage } from './client-page';
import { useSearchParams } from 'next/navigation';
import SoruCozOyunPage from './coz/page';

function SoruCozPageWrapper() {
    const searchParams = useSearchParams();
    const hasGameParams = searchParams.has('courseId') && searchParams.has('topicId');

    if (hasGameParams) {
        return <SoruCozOyunPage />;
    }

    return <SoruCozSetupClientPage />;
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
            <SoruCozPageWrapper />
        </Suspense>
    );
}
