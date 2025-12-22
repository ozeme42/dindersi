
'use client';

import OyunKurulum from '@/app/oyunlar/oyun-kurulum/SetupComponent';
import { Wind } from 'lucide-react';


export default function TornadoSetupPage() {
    return <OyunKurulum gameName="Tornado" gameIcon={Wind} gamePath="tornado" />;
}
