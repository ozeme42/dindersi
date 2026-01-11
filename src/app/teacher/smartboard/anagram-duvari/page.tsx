'use client';

import { SmartboardBireyselClientPage } from '../bireysel/client-page'; // Yol doğruysa burası kalabilir, hata verirse ../../bireysel... diye dene
import { DEFAULT_GAME_SETTINGS } from '@/lib/game-config';
import { Puzzle } from 'lucide-react';

export default function AnagramDuvariSetupPage() {
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