'use client';

import { SmartboardBireyselClientPage } from '../bireysel/client-page';
import { DEFAULT_GAME_SETTINGS } from '@/lib/game-config';
import { Megaphone } from 'lucide-react';

export default function AnlatBakalimSetupPage() {
    // "Anlat Bakalım" için basitleştirilmiş bir config kullanabiliriz.
    // Örneğin, sadece ders, ünite, konu seçimi yeterli, soru sayısı gibi ayarlar gereksiz.
    // Ancak esneklik için bireysel yarışma ayarlarını temel alabiliriz.
    const gameConfig = DEFAULT_GAME_SETTINGS.teacherBireysel;

    return <SmartboardBireyselClientPage 
        gameConfig={gameConfig} 
        gamePath="anlat-bakalim"
        gameName="Anlat Bakalım"
        gameIconName="Megaphone"
    />;
}
