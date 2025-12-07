'use client';

import React, { Suspense } from 'react';
import { BookOpen, Loader2 } from 'lucide-react';
import { TopicSelectionClient } from '@/components/topic-selection-client';


function OzetlerPage() {
    return (
        <div className="pb-20 md:pb-0">
            <TopicSelectionClient 
                pageTitle="Konu Özetleri"
                pageIcon={BookOpen}
                targetPath="student/ozetler"
                dataType="ozetler"
            />
        </div>
    );
}

export default function OzetlerSuspense() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <OzetlerPage />
        </Suspense>
    );
}
