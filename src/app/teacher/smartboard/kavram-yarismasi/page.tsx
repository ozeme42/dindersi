
'use client';

import OyunKurulum from '@/app/oyunlar/oyun-kurulum/SetupComponent';
import { BrainCircuit } from 'lucide-react';

export default function SmartboardKavramYarismasiPage() {
    return <OyunKurulum gameName="Kavram Yarışması" gameIcon={BrainCircuit} gamePath="kavram-yarismasi" />;
}
