
'use client';

import { OyunKurulum } from '@/components/oyun-kurulum';
import { Package } from 'lucide-react';

export default function SmartboardKutuAcSetupPage() {
    return (
        <OyunKurulum 
            pageTitle="Kutu Aç Kurulum"
            gameIcon={Package}
            targetPath="teacher/smartboard/kutu-ac"
            dataType="games" // Bu, genel oyun kurulum mantığını kullanır
            isStatic={false} // Akıllı tahta için dinamik veri çeker
        />
    );
}
