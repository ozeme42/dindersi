
'use client';

import { OyunKurulum } from '@/components/oyun-kurulum';
import { BrainCircuit } from 'lucide-react';

export default function SmartboardKavramYarismasiPage() {
    return <OyunKurulum gameName="Kavram Yarışması" gameIcon={BrainCircuit} gamePath="kavram-yarismasi" dataType="games" />;
}
