
"use client";

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { KavramAviSetupClientPage } from './client-page';
import ConceptHuntPage from './oyun/page';

function KavramAviPageWrapper() {
    const searchParams = useSearchParams();
    const hasGameParams = searchParams.has('courseId') && searchParams.has('topicId');

    if (hasGameParams) {
        return <ConceptHuntPage />;
    }

    return <KavramAviSetupClientPage />;
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
            <KavramAviPageWrapper />
        </Suspense>
    );
}
