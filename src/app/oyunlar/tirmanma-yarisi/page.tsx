'use client';

import { Suspense } from 'react';
import { Loader2, Mountain } from 'lucide-react';
import { OyunKurulum } from '@/components/oyun-kurulum';

export default function TirmanmaYarisiSetupPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <OyunKurulum
                gameName="Tırmanma Yarışı"
                gameIcon={Mountain}
                gamePath="tirmanma-yarisi"
                dataType="games"
                isStatic={true}
            />
        </Suspense>
    );
}
