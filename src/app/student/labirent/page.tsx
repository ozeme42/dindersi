
"use client";

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LabirentSetupClientPage } from './client-page';
import LabirentOyunPage from './oyun/page';

function LabirentPageWrapper() {
    const searchParams = useSearchParams();
    const hasGameParams = searchParams.has('courseId') && searchParams.has('topicId');

    if (hasGameParams) {
        return <LabirentOyunPage />;
    }

    return <LabirentSetupClientPage />;
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
            <LabirentPageWrapper />
        </Suspense>
    );
}
