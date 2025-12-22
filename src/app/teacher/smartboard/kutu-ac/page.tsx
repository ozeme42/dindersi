
'use client';

import OyunKurulum from '@/app/oyunlar/oyun-kurulum/SetupComponent';
import { Package } from 'lucide-react';


export default function SmartboardBireyselPage() {
    return <OyunKurulum gameName="Kutu Aç" gameIcon={Package} gamePath="kutu-ac" />;
}
