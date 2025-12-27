'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { SmartboardBireyselClientPage } from "@/app/teacher/smartboard/bireysel/client-page";
import { getGameSettings } from "@/app/teacher/game-settings/actions";

// Bu bileşen artık doğrudan `default` olarak export edilecek ve sunucu tarafında çalışacak.
export default async function TornadoSetupPage() {
    const settings = await getGameSettings();
    const gameConfig = settings.teacherBireysel;

    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            {/* Veriyi istemci bileşenine prop olarak iletiyoruz */}
            <SmartboardBireyselClientPage gameConfig={gameConfig} gamePath="tornado" gameName="Tornado" />
        </Suspense>
    );
}
