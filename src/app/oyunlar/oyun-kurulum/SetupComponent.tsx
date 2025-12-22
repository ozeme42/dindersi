
'use client';

import { OyunKurulum } from '@/components/oyun-kurulum';
import { Wind } from 'lucide-react';

export default function TornadoSetupPage() {
    return <OyunKurulum gameName="Tornado" gameIcon={Wind} gamePath="tornado" dataType="games" />;
}
