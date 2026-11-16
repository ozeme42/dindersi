'use client';

import { AtolyeGameView } from '@/components/games/atolye-game-view';

export default function EslestirmeOyunPage() {
    return (
        <AtolyeGameView
            initialTemplate="eslestir"
            gameTitle="Kavram Eşleştirme"
            gamePath="eslestirme"
        />
    );
}
