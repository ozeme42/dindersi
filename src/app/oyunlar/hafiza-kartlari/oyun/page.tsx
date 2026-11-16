'use client';

import { AtolyeGameView } from '@/components/games/atolye-game-view';

export default function HafizaKartlariOyunPage() {
    return (
        <AtolyeGameView
            initialTemplate="eslesen-ciftler"
            gameTitle="Hafıza Kartları"
            gamePath="hafiza-kartlari"
        />
    );
}
