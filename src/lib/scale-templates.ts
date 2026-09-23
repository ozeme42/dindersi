
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
    },
    {
        id: 'kuran_tilavet_tecvid',
        name: "Kur'an Tilavet ve Tecvid Değerlendirme Ölçeği (10x10=100 Puan)",
        description: "10 ölçüt üzerinden her biri 10 puanlık (toplam 100) Kur'an okuma ve tecvid değerlendirmesi.",
        type: 'points',
        columns: [
            { id: 'euzu_besmele', name: '1. Eûzü Besmele (0-10)', type: 'number' },
            { id: 'harf_mahrec', name: '2. Harf & Mahreç (0-10)', type: 'number' },
            { id: 'harekeler', name: '3. Harekeler (0-10)', type: 'number' },
            { id: 'cezm', name: '4. Cezm (0-10)', type: 'number' },
            { id: 'sedde', name: '5. Şedde (0-10)', type: 'number' },
            { id: 'tenvin', name: '6. Tenvin & İhfa (0-10)', type: 'number' },
            { id: 'meddi_tabii', name: '7. Medd-i Tabîi (0-10)', type: 'number' },
            { id: 'dort_elif', name: '8. 4 Elif Uzatma (0-10)', type: 'number' },
            { id: 'duraklar', name: '9. Duraklar & Vakıf (0-10)', type: 'number' },
            { id: 'akicilik', name: '10. Akıcılık & Vasıl (0-10)', type: 'number' },
        ]
    }
];
