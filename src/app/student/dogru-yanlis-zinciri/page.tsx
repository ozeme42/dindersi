
"use client";

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { TrueFalseChainSetupClientPage } from './client-page';
import TrueFalseChainPage from './oyun/page';

function DogruYanlisZinciriPageWrapper() {
    const searchParams = useSearchParams();
    const hasGameParams = searchParams.has('courseId') && searchParams.has('topicId');

    if (hasGameParams) {
        return <TrueFalseChainPage />;
    }

    return <TrueFalseChainSetupClientPage />;
}


export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
            <DogruYanlisZinciriPageWrapper />
        </Suspense>
    );
}
