
export const QUESTION_TYPES = [
    { id: 'mcq', name: 'Çoktan Seçmeli' },
    { id: 'tf', name: 'Doğru/Yanlış' },
    { id: 'fitb', name: 'Boşluk Doldurma' },
] as const;

export const DIFFICULTY_LEVELS = ['Kolay', 'Orta', 'Zor'] as const;

export const playableActivities = [
  { href: '/oyunlar/milyoner-yarismasi', label: 'Kim 1000 Puan İster?' },
  { href: '/oyunlar/yazi-tura', label: 'Yazı Tura' },
  { href: '/oyunlar/kavram-yarismasi', label: 'Kavram Yarışması' },
  { href: '/oyunlar/kelime-avi', label: 'Kelime Avı' },
  { href: '/oyunlar/kutu-ac', label: 'Kutu Aç' },
  { href: '/oyunlar/kavram-avi', label: 'Kavram Avı' },
  { href: '/oyunlar/eslestirme', label: 'Eşleştirme' },
  { href: '/oyunlar/cumle-olusturma', label: 'Cümle Ustası' },
  { href: '/oyunlar/adam-asmaca', label: 'Adam Asmaca' },
  { href: '/oyunlar/hafiza-kartlari', label: 'Hafıza Kartları' },
  { href: '/oyunlar/hedefi-vur', label: 'Hedefi Vur' },
  { href: '/oyunlar/bil-bakalim', label: 'Bil Bakalım' },
  { href: '/oyunlar/dogru-yanlis-zinciri', label: 'D/Y Zinciri' },
  { href: '/oyunlar/acik-uclu-cevapla', label: 'Açık Uçlu' },
  { href: '/oyunlar/ilim-hazinesi', label: 'İlim Hazinesi' },
  { href: '/oyunlar/labirent', label: 'Labirent' },
  { href: '/oyunlar/soru-coz', label: 'Soru Çöz' },
  { href: '/oyunlar/tornado', label: 'Tornado' },
  { href: '/oyunlar/dogru-yol-kosucusu', label: 'Doğru Yol Koşucusu' },
  { href: '/oyunlar/balon-avcisi', label: 'Balon Avcısı' },
];

const DEFAULT_POINTS = {
    mcq: { Kolay: 10, Orta: 15, Zor: 20 },
    tf: { Kolay: 5, Orta: 10, Zor: 15 },
    fitb: { Kolay: 10, Orta: 15, Zor: 20 },
};

const DEFAULT_PENALTY = {
    mcq: { Kolay: 5, Orta: 8, Zor: 10 },
    tf: { Kolay: 3, Orta: 5, Zor: 8 },
    fitb: { Kolay: 5, Orta: 8, Zor: 10 },
};

export const DEFAULT_GAME_SETTINGS = {
    // Student-facing games
    studentSoruCoz: {
        questionCount: { min: 5, max: 20, default: 10, step: 1 },
        difficulty: { default: ['Orta'] },
        questionTypes: { default: ['mcq'] },
        displayModes: {
            random: { id: 'random', name: 'Kapalı Kutu (Rastgele)' },
            sequential: { id: 'sequential', name: 'Açık Sıralı' },
            default: 'random'
        },
        points: DEFAULT_POINTS,
        penalty: DEFAULT_PENALTY,
    },
    studentBireysel: {
        questionCount: { min: 5, max: 50, default: 20, step: 1 },
        finishScore: { default: 100, min: 0, step: 10 },
        streakBonus: { default: true },
        questionTimer: { default: 15, min: 0, max: 60, step: 5 },
        difficulty: { default: ['Kolay', 'Orta', 'Zor'] },
        questionTypes: { default: ['mcq', 'tf', 'fitb'] },
        points: DEFAULT_POINTS,
        penalty: DEFAULT_PENALTY,
    },
    studentTakim: {
        questionCount: { min: 10, max: 80, default: 40, step: 5 },
        questionTimer: { default: 0, min: 0, max: 60, step: 5 },
        finishScore: { default: 150, min: 0, step: 10 },
        difficulty: { default: ['Kolay', 'Orta', 'Zor'] },
        questionTypes: { default: ['mcq', 'tf', 'fitb'] },
        points: DEFAULT_POINTS,
        penalty: DEFAULT_PENALTY,
    },
    studentDuello: {
        questionCount: { min: 10, max: 50, default: 20, step: 2 },
        questionTimer: { default: 0, min: 0, max: 60, step: 5 },
        difficulty: { default: ['Kolay', 'Orta', 'Zor'] },
        questionTypes: { default: ['mcq', 'tf', 'fitb'] },
        pullStrength: { Kolay: 10, Orta: 15, Zor: 20 },
    },
    // Teacher-facing smartboard games
    teacherBireysel: {
        questionCount: { min: 5, max: 50, default: 20, step: 1 },
        questionTimer: { default: 0, min: 0, max: 60, step: 5 },
        finishScore: { default: 100, min: 0, step: 10 },
        difficulty: { default: ['Kolay', 'Orta', 'Zor'] },
        questionTypes: { default: ['mcq', 'tf', 'fitb'] },
        points: DEFAULT_POINTS,
        penalty: DEFAULT_PENALTY,
    },
    teacherTakim: {
        questionCount: { min: 10, max: 80, default: 40, step: 5 },
        questionTimer: { default: 0, min: 0, max: 60, step: 5 },
        finishScore: { default: 150, min: 0, step: 10 },
        difficulty: { default: ['Kolay', 'Orta', 'Zor'] },
        questionTypes: { default: ['mcq', 'tf', 'fitb'] },
        points: DEFAULT_POINTS,
        penalty: DEFAULT_PENALTY,
    },
    teacherDuello: {
        questionCount: { min: 10, max: 50, default: 20, step: 2 },
        questionTimer: { default: 0, min: 0, max: 60, step: 5 },
        difficulty: { default: ['Kolay', 'Orta', 'Zor'] },
        questionTypes: { default: ['mcq', 'tf', 'fitb'] },
        pullStrength: { Kolay: 10, Orta: 15, Zor: 20 },
    },
};
