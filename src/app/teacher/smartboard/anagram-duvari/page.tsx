'use client';

import { Suspense } from 'react';
import { Loader2, Puzzle } from 'lucide-react';
import { SmartboardBireyselClientPage } from '../bireysel/client-page';
import { DEFAULT_GAME_SETTINGS } from '@/lib/game-config';

function AnagramDuvariSetupPage() {
    const gameConfig = DEFAULT_GAME_SETTINGS.teacherBireysel;

    return (
        <SmartboardBireyselClientPage
            gameConfig={gameConfig}
            gamePath="anagram-duvari"
            gameName="Anagram Duvarı"
            gameIconName="Puzzle"
        />
    );
}

export default function AnagramDuvariSuspense() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12