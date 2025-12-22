
'use client';

import { OyunKurulum } from '@/components/oyun-kurulum';
import { Package } from 'lucide-react';


export default function SmartboardBireyselPage() {
    return <OyunKurulum gameName="Kutu Aç" gameIcon={Package} gamePath="kutu-ac" dataType="games" />;
}
