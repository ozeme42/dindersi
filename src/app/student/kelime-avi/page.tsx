
"use client";

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { KelimeAviSetupClientPage } from './client-page';
import KelimeAviGamePage from './oyun/page';

function KelimeAviPageWrapper() {
    const searchParams = useSearchParams();
    const hasGameParams = searchParams.has('courseId') && searchParams.has('topicId');

    if (hasGameParams) {
        return <KelimeAviGamePage />;
    }

    return <KelimeAviSetupClientPage />;
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
            <KelimeAviPageWrapper />
        </Suspense>
    );
}
