
"use client";

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { TornadoSetupClientPage } from './client-page';
import TornadoOyunPage from './oyun/page';

function TornadoPageWrapper() {
    const searchParams = useSearchParams();
    const hasGameParams = searchParams.has('courseId') && searchParams.has('topicId');

    if (hasGameParams) {
        return <TornadoOyunPage />;
    }

    return <TornadoSetupClientPage />;
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
            <TornadoPageWrapper />
        </Suspense>
    );
}
