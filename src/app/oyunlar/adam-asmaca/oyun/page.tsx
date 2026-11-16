'use client';

import { AtolyeGameView } from '@/components/games/atolye-game-view';

export default function HangmanPage() {
    return (
        <AtolyeGameView
            initialTemplate="adam-asmaca"
            gameTitle="Adam Asmaca"
            gamePath="adam-asmaca"
        />
    );
}
