
"use client";

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { OlaySiralamaSetupClientPage } from './client-page';
import EventSortingPage from './oyun/page';

function OlaySiralamaPageWrapper() {
    const searchParams = useSearchParams();
    const hasGameParams = searchParams.has('courseId') && searchParams.has('topicId');

    if (hasGameParams) {
        return <EventSortingPage />;
    }

    return <OlaySiralamaSetupClientPage />;
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
            <OlaySiralamaPageWrapper />
        </Suspense>
    );
}
