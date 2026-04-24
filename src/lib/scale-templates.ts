
import { EvaluationScale } from "./types";

export type ScaleTemplate = {
    id: string;
    name: string;
    description: string;
    type: 'tally' | 'checklist' | 'points';
    columns: { id: string; name: string; type: 'status' | 'number' }[];
};

export const SCALE_TEMPLATES: ScaleTemplate[] = [
    {
        id: 'namaz_takibi',
        name: 'Namaz Takibi (Beş Vakit)',
        description: 'Öğrencilerin günlük namaz durumlarını takip etmek için.',
        type: 'checklist',
        columns: [
            { id: 'sabah', name: 'Sabah', type: 'status' },
            { id: 'ogle', name: 'Öğle', type: 'status' },
            { id: 'ikindi', name: 'İkindi', type: 'status' },
            { id: 'aksam', name: 'Akşam', type: 'status' },
            { id: 'yatsi', name: 'Yatsı', type: 'status' },
        ]
    },
    {
        id: 'odev_kontrol',
        name: 'Ödev ve Materyal Kontrolü',
        description: 'Kitap getirme ve ödev yapma durumları.',
        type: 'checklist',
        columns: [
            { id: 'kitap', name: 'Kitap Getirme', type: 'status' },
            { id: 'odev', name: 'Ödevi Yapma', type: 'status' },
            { id: 'materyal', name: 'Araç Gereç', type: 'status' },
        ]
    },
    {
        id: 'sinif_performans',
        name: 'Sınıf İçi Performans (Puanlı)',
        description: 'Katılım ve davranışların 0-100 arası puanlanması.',
        type: 'points',
        columns: [
            { id: 'katilim', name: 'Derse Katılım', type: 'number' },
            { id: 'davranis', name: 'Örnek Davranış', type: 'number' },
            { id: 'uyum', name: 'Grup Uyumu', type: 'number' },
        ]
    },
    {
        id: 'sure_takip',
        name: 'Sure/Dua Ezber Takibi',
        description: 'Ezberlenen sure ve duaların kontrolü.',
        type: 'checklist',
        columns: [
            { id: 'fatiha', name: 'Fatiha', type: 'status' },
            { id: 'ihlas', name: 'İhlas', type: 'status' },
            { id: 'felak_nas', name: 'Felak-Nas', type: 'status' },
            { id: 'ayetel_kursi', name: 'Ayetel Kürsi', type: 'status' },
        ]
    }
];
