'use client';

import { Suspense } from 'react';
import { Loader2, Flag } from 'lucide-react';
import { OyunKurulum } from '@/components/oyun-kurulum';

export default function FetihOyunuSetupPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <OyunKurulum
                gameName="Fetih Oyunu"
                gameIcon={Flag}
                gamePath="fetih-oyunu"
                dataType="games"
                isStatic={true}
            />
        </Suspense>
    );
}
