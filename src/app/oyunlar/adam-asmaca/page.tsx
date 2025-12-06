'use client';

import OyunKurulum from '@/app/oyunlar/oyun-kurulum/SetupComponent';
import { Skull } from 'lucide-react';
import { Suspense } from 'react';
import AdamAsmacaOyun from './oyun';

function AdamAsmacaSetup() {
    const searchParams = new URLSearchParams(window.location.search);
    const isOyun = searchParams.has('courseId');

    if (isOyun) {
        return <AdamAsmacaOyun />;
    }

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
