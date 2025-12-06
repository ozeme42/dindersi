'use client';

import OyunKurulum from '@/app/oyunlar/oyun-kurulum/SetupComponent';
import { Skull } from 'lucide-react';
import { Suspense } from 'react';

function AdamAsmacaSetup() {
    return (
        <OyunKurulum
            gameName="Adam Asmaca"
            gameIcon={Skull}
            gamePath="adam-asmaca"
        />
    );
}

export default function Page() {
    return (
        <Suspense>
            <AdamAsmacaSetup />
        </Suspense>
    )
}