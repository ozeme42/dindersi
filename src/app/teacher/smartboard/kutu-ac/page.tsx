
'use client';

import { Suspense } from 'react';
import { Loader2, Package } from 'lucide-react';
import { SmartboardBireyselClientPage } from '../bireysel/client-page';
import { DEFAULT_GAME_SETTINGS } from '@/lib/game-config';

// Bu sayfa artık standart akıllı tahta kurulumunu kullanacak.
// Gerekli oyun adı, ikonu ve yolu prop olarak geçirilecek.
function SmartboardKutuAcSetupPage() {
    return (
        <SmartboardBireyselClientPage 
            gameName="Kutu Aç"
            gamePath="kutu-ac"
            gameIconName="Package"
            gameConfig={DEFAULT_GAME_SETTINGS.teacherBireysel} // Şimdilik bireysel ayarları kullanabiliriz.
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
