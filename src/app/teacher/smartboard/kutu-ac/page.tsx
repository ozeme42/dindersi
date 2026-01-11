
'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { SmartboardBireyselClientPage } from '../bireysel/client-page';
import { DEFAULT_GAME_SETTINGS } from '@/lib/game-config';

function SmartboardKutuAcSetupPage() {
    return (
        <SmartboardBireyselClientPage 
            gameName="Kutu Aç"
            gamePath="kutu-ac"
            gameIconName="Package"
            gameConfig={DEFAULT_GAME_SETTINGS.teacherBireysel}
        />
    );
}

export default function SmartboardKutuAcSuspense() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <SmartboardKutuAcSetupPage />
        </Suspense>
    );
}
