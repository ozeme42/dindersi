

"use client";

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { KavramYarismaSetupClientPage } from './client-page';
import KavramYarismaOyunPage from './oyun/page';

function KavramYarismasiPageWrapper() {
    const searchParams = useSearchParams();
    const hasGameParams = searchParams.has('courseId') && searchParams.has('topicId');

    if (hasGameParams) {
        return <KavramYarismaOyunPage searchParams={Object.fromEntries(searchParams.entries())} />;
    }

    return <KavramYarismaSetupClientPage />;
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
            <KavramYarismasiPageWrapper />
        </Suspense>
    );
}
