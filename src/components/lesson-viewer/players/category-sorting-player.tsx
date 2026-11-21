'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    Maximize2,
    Minimize2,
    Pause,
    Play,
    Volume2,
    VolumeX,
    RotateCcw,
    Info,
    Trophy,
    Sparkles,
    CheckCircle2,
    HelpCircle
} from 'lucide-react';
import type { CategorySortStep, CategorySortCategory, CategorySortItem } from '@/lib/types';

// 🕌 Varsayılan 4 Kategori (Namaz Çeşitleri)
const DEFAULT_CATEGORIES: CategorySortCategory[] = [
    {
        id: 'farz',
        name: 'Farz Namazlar',
        badge: 'Kesin Hüküm',
        description: "Farz: Allah'ın kesin olarak emrettiği, terk edilmesi günah olan ibadetlerdir.",
        color: 'blue',
    },
    {
        id: 'vacip',
        name: 'Vacip Namazlar',
        badge: 'Gerekli İbadet',
        description: 'Vacip: Farza yakın, yapılması gerekli olan ibadetlerdir.',
        color: 'orange',
    },
    {
        id: 'sunnet',
        name: 'Sünnet Namazlar',
        badge: 'Örnek İbadet',
        description: 'Sünnet: Peygamberimizin yaptığı ve yapılmasını tavsiye ettiği ibadetlerdir.',
        color: 'green',
    },
    {
        id: 'nafile',
        name: 'Nafile Namazlar',
        badge: 'Gönüllü İbadet',
        description: 'Nafile: Yapılması sevap, yapılmaması günah olmayan ek ibadetlerdir.',
        color: 'purple',
    },
];

// 🎴 Varsayılan 9 Kart
const DEFAULT_ITEMS: CategorySortItem[] = [
    { id: 'it-1', text: 'Beş Vakit Namazın Farzları', hint: 'Günde 5 vakit kılınır', categoryId: 'farz' },
    { id: 'it-2', text: 'Cuma Namazı', hint: 'Haftada bir gün cemaatle', categoryId: 'farz' },
    { id: 'it-3', text: 'Cenaze Namazı', hint: 'Vefat eden Müslüman için', categoryId: 'farz' },
    { id: 'it-4', text: 'Vitir Namazı', hint: 'Yatsı namazından sonra', categoryId: 'vacip' },
    { id: 'it-5', text: 'Ramazan Bayramı Namazı', hint: 'Ramazan bayramında', categoryId: 'vacip' },
    { id: 'it-6', text: 'Kurban Bayramı Namazı', hint: 'Yılda bir defa Kurban bayramında', categoryId: 'vacip' },
    { id: 'it-7', text: 'Beş Vakit Namazın Sünnetleri', hint: 'Farz namazların öncesinde/sonrasında', categoryId: 'sunnet' },
    { id: 'it-8', text: 'Teravih Namazı', hint: 'Ramazan gecelerinde kılınır', categoryId: 'sunnet' },
    { id: 'it-9', text: 'Teheccüt Namazı', hint: 'Gece uykudan uyanıp kılınır', categoryId: 'nafile' },
];

// 🎨 Renk Paletleri (Kaide Renk Temaları)
interface ThemeConfig {
    border: string;
    bgTop: string;
    bgBot: string;
    glow: string;
    text: string;
    badgeBg: string;
    badgeText: string;
}

const THEMES: ThemeConfig[] = [
    // 0: Mavi (Farz vb.)
    {
        border: '#38bdf8',
        bgTop: '#0c4a6e',
        bgBot: '#082f49',
        glow: 'rgba(56, 189, 248, 0.45)',
        text: '#bae6fd',
        badgeBg: 'rgba(56, 189, 248, 0.2)',
        badgeText: '#7dd3fc',
    },
    // 1: Turuncu / Altın (Vacip vb.)
    {
        border: '#f59e0b',
        bgTop: '#78350f',
        bgBot: '#451a03',
        glow: 'rgba(245, 158, 11, 0.45)',
        text: '#fde68a',
        badgeBg: 'rgba(245, 158, 11, 0.2)',
        badgeText: '#fcd34d',
    },
    // 2: Zümrüt Yeşili (Sünnet vb.)
    {
        border: '#22c55e',
        bgTop: '#14532d',
        bgBot: '#052e16',
        glow: 'rgba(34, 197, 94, 0.45)',
        text: '#bbf7d0',
        badgeBg: 'rgba(34, 197, 94, 0.2)',
        badgeText: '#86efac',
    },
    // 3: Kraliyet Moru (Nafile vb.)
    {
        border: '#c084fc',
        bgTop: '#581c87',
        bgBot: '#3b0764',
        glow: 'rgba(192, 132, 252, 0.45)',
        text: '#f3e8ff',
        badgeBg: 'rgba(192, 132, 252, 0.2)',
        badgeText: '#d8b4fe',
    },
    // 4: Gül Pembesi / Kırmızı
    {
        border: '#f43f5e',
        bgTop: '#881337',
        bgBot: '#4c0519',
        glow: 'rgba(244, 63, 94, 0.45)',
        text: '#fecdd3',
        badgeBg: 'rgba(244, 63, 94, 0.2)',
        badgeText: '#fda4af',
    },
    // 5: Camgöbeği / Turkuaz
    {
        border: '#14b8a6',
        bgTop: '#134e4a',
        bgBot: '#042f2e',
        glow: 'rgba(20, 184, 166, 0.45)',
        text: '#ccfbf1',
        badgeBg: 'rgba(20, 184, 166, 0.2)',
        badgeText: '#5eead4',
    },
];

// 🎯 Akıllı İkon Eşleştirici
function getItemIcon(text: string, subtitle?: string): string {
    const combined = `${text} ${subtitle || ''}`.toLowerCase();
    if (combined.includes('cuma') || combined.includes('camii')) return '☪️';
    if (combined.includes('cenaze') || combined.includes('vefat') || combined.includes('dua')) return '🤲';
    if (combined.includes('bayram') || combined.includes('kurban') || combined.includes('ramazan')) return '🌙';
    if (combined.includes('vitir') || combined.includes('yıldız')) return '⭐';
    if (combined.includes('sabah') || combined.includes('fecr') || combined.includes('şafak')) return '🌅';
    if (combined.includes('öğle') || combined.includes('güneş')) return '☀️';
    if (combined.includes('akşam') || combined.includes('ikindi') || combined.includes('gurub')) return '🌆';
    if (combined.includes('yatsı') || combined.includes('gece') || combined.includes('teheccüt') || combined.includes('teheccüd')) return '🌌';
    if (combined.includes('teravih')) return '🌙';
    if (combined.includes('kuşluk') || combined.includes('duha')) return '🌤️';
    if (combined.includes('evvabin') || combined.includes('nafile') || combined.includes('sevap')) return '✨';
    if (combined.includes('farz') || combined.includes('namaz') || combined.includes('ezan')) return '🕌';
    if (combined.includes('şart') || combined.includes('abdest') || combined.includes('taharet') || combined.includes('hazırlık')) return '🧼';
    if (combined.includes('kıyam') || combined.includes('rükû') || combined.includes('secde') || combined.includes('tekbir')) return '🧘';
    if (combined.includes('oruç') || combined.includes('iftar') || combined.includes('sahur')) return '🥣';
    if (combined.includes('zekat') || combined.includes('sadaka') || combined.includes('infak')) return '💰';
    if (combined.includes('hac') || combined.includes('umre') || combined.includes('kabe')) return '🕋';
    if (combined.includes('kuran') || combined.includes('ayet') || combined.includes('sure') || combined.includes('kitap')) return '📖';
    if (combined.includes('peygamber') || combined.includes('sünnet') || combined.includes('hadis')) return '💚';
    if (combined.includes('melek') || combined.includes('cebrail')) return '🪽';
    if (combined.includes('adalet') || combined.includes('terazi') || combined.includes('hak')) return '⚖️';
    return '✨';
}

function getCategoryIcon(name: string, index: number): string {
    const n = name.toLowerCase();
    if (n.includes('farz') || n.includes('hazırlık')) return '🕌';
    if (n.includes('vacip') || n.includes('kılınış')) return '⭐';
    if (n.includes('sünnet') || n.includes('cemaat')) return '💚';
    if (n.includes('nafile')) return '💜';
    const defaults = ['🕌', '⭐', '💚', '💜', '🔷', '🔶', '🎯', '✨'];
    return defaults[index % defaults.length];
}

// Kategori Eşleştirme Kontrolü
function isCategoryMatch(itemCatId: string, cat: CategorySortCategory): boolean {
    const norm = (s: string) => (s || '').trim().toLowerCase().replace(/[\s-_]/g, '');
    const i = norm(itemCatId);
    const cId = norm(cat.id);
    const cName = norm(cat.name);
    return i === cId || i === cName || cName.includes(i) || i.includes(cName);
}

interface GameCard {
    id: string;
    text: string;
    subtitle: string;
    icon: string;
    targetCatId: string;
    placed: boolean;
    placedInCatId?: string;
}

export function CategorySortingPlayer({
    step,
    isFullscreen: propIsFullscreen,
}: {
    step: CategorySortStep;
    isFullscreen?: boolean;
    fontSizeScale?: string;
    presentationTheme?: string;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const tipTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Tam Ekran Durumu
    const [isFullscreen, setIsFullscreen] = useState(Boolean(propIsFullscreen));

    // Kategoriler ve Maddeler (Adımdan dinamik alınır)
    const categories: CategorySortCategory[] = useMemo(() => {
        if (Array.isArray(step.categories) && step.categories.length > 0) {
            return step.categories;
        }
        return DEFAULT_CATEGORIES;
    }, [step.categories]);

    const rawItems: CategorySortItem[] = useMemo(() => {
        if (Array.isArray(step.items) && step.items.length > 0) {
            return step.items;
        }
        return DEFAULT_ITEMS;
    }, [step.items]);

    // Başlık ve Açıklama (Dinamik ve Temiz)
    const titleText = step.title || 'Kavramları Sınıflandıralım';
    const descriptionText = step.description || 'Verilen kavramları doğru kategorilere sürükleyiniz veya dokunarak yerleştiriniz.';

    // Oyun Durumları
    const [score, setScore] = useState(250);
    const [okCount, setOkCount] = useState(0);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [cards, setCards] = useState<GameCard[]>([]);
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

    // Bilgi Baloncuğu
    const [tip, setTip] = useState<{ show: boolean; text: string; catId: string | null }>({
        show: false,
        text: '',
        catId: null,
    });

    // Parlama Efektleri (Doğru / Yanlış)
    const [flashes, setFlashes] = useState<Record<string, 'ok' | 'bad' | 'hot' | null>>({});

    // Oyun Sonu Modalı
    const [overlay, setOverlay] = useState<{
        show: boolean;
        title: string;
        desc: string;
        btnText: string;
        isWin: boolean;
    }>({
        show: false,
        title: '',
        desc: '',
        btnText: 'Tekrar Oyna',
        isWin: false,
    });

    // Ses Sentezleyici
    const beep = useCallback((f: number, d = 0.15, type: OscillatorType = 'sine') => {
        if (isMuted) return;
        try {
            const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            if (!AudioContextClass) return;
            if (!audioCtxRef.current) {
                audioCtxRef.current = new AudioContextClass();
            }
            const ctx = audioCtxRef.current;
            if (ctx.state === 'suspended') {
                ctx.resume();
            }
            const o = ctx.createOscillator();
            const gn = ctx.createGain();
            o.type = type;
            o.frequency.value = f;
            gn.gain.value = 0.12;
            o.connect(gn);
            gn.connect(ctx.destination);
            o.start();
            gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + d);
            o.stop(ctx.currentTime + d);
        } catch {
            // Audio context engellendi
        }
    }, [isMuted]);

    // Fullscreen Listener
    useEffect(() => {
        const handleFsChange = () => {
            setIsFullscreen(Boolean(document.fullscreenElement));
        };
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }, []);

    const toggleFullscreen = async () => {
        try {
            if (!document.fullscreenElement) {
                if (containerRef.current?.requestFullscreen) {
                    await containerRef.current.requestFullscreen();
                }
            } else {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                }
            }
        } catch (err) {
            console.error('Tam ekran hatası:', err);
        }
    };

    // Kronometre (Zaman Sınırı Olmadan)
    useEffect(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (!isPaused && !overlay.show) {
            timerRef.current = setInterval(() => {
                setElapsedTime(prev => prev + 1);
            }, 1000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isPaused, overlay.show]);

    // Oyunu Başlat
    const startGame = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        setScore(250);
        setOkCount(0);
        setElapsedTime(0);
        setIsPaused(false);
        setSelectedCardId(null);
        setTip({ show: false, text: '', catId: null });
        setOverlay({
            show: false,
            title: '',
            desc: '',
            btnText: 'Tekrar Oyna',
            isWin: false,
        });

        const initialCards: GameCard[] = rawItems.map((item, idx) => ({
            id: item.id || `card-${idx}`,
            text: item.text,
            subtitle: item.hint || '',
            icon: getItemIcon(item.text, item.hint),
            targetCatId: item.categoryId,
            placed: false,
        }));

        setCards(initialCards);
    }, [rawItems]);

    useEffect(() => {
        startGame();
    }, [startGame]);

    // Parlama Efekti Tetikleyici
    const triggerFlash = useCallback((catId: string, type: 'ok' | 'bad') => {
        setFlashes(prev => ({ ...prev, [catId]: type }));
        setTimeout(() => {
            setFlashes(prev => ({ ...prev, [catId]: null }));
        }, 550);
    }, []);

    // Zafer Kontrolü
    const checkWin = useCallback((nextOkCount: number) => {
        if (nextOkCount >= rawItems.length && rawItems.length > 0) {
            if (timerRef.current) clearInterval(timerRef.current);
            // Zafer ezgisi
            [523, 659, 784, 1046].forEach((f, i) => {
                setTimeout(() => beep(f, 0.2), i * 150);
            });
            setTimeout(() => {
                setOverlay({
                    show: true,
                    title: 'Tebrikler! 🎉',
                    desc: `Tüm kavramları doğru kategorilere başarıyla yerleştirdiniz! Puanınız: ${score}`,
                    btnText: 'Tekrar Oyna',
                    isWin: true,
                });
            }, 500);
        }
    }, [rawItems.length, beep, score]);

    // Kartı Kategoriye Yerleştirme Fonksiyonu
    const placeCardIntoCategory = useCallback((cardId: string, targetCat: CategorySortCategory) => {
        const card = cards.find(c => c.id === cardId);
        if (!card || card.placed) return;

        const isMatch = isCategoryMatch(card.targetCatId, targetCat);

        if (isMatch) {
            beep(700, 0.15, 'triangle');
            triggerFlash(targetCat.id, 'ok');

            const nextOk = okCount + 1;
            setOkCount(nextOk);
            setScore(prev => prev + 50);

            setCards(prev => prev.map(c => {
                if (c.id === cardId) {
                    return { ...c, placed: true, placedInCatId: targetCat.id };
                }
                return c;
            }));

            setSelectedCardId(null);
            checkWin(nextOk);
        } else {
            beep(220, 0.25, 'sawtooth');
            triggerFlash(targetCat.id, 'bad');
            setScore(prev => Math.max(0, prev - 10));
            setSelectedCardId(null);
        }
    }, [cards, okCount, beep, triggerFlash, checkWin]);

    // Sürükle - Bırak (HTML5 Drag & Drop)
    const handleDragStart = (e: React.DragEvent, card: GameCard) => {
        if (card.placed || isPaused || overlay.show) return;
        e.dataTransfer.setData('text/plain', card.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, catId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (flashes[catId] !== 'hot') {
            setFlashes(prev => ({ ...prev, [catId]: 'hot' }));
        }
    };

    const handleDragLeave = (_e: React.DragEvent, catId: string) => {
        if (flashes[catId] === 'hot') {
            setFlashes(prev => ({ ...prev, [catId]: null }));
        }
    };

    const handleDrop = (e: React.DragEvent, cat: CategorySortCategory) => {
        e.preventDefault();
        setFlashes(prev => ({ ...prev, [cat.id]: null }));
        const cardId = e.dataTransfer.getData('text/plain');
        if (cardId) {
            placeCardIntoCategory(cardId, cat);
        }
    };

    // Tıklayarak Seç ve Kaideye Dokunarak Yerleştir (Akıllı Tahta Dostu)
    const handleCardClick = (card: GameCard) => {
        if (card.placed || isPaused || overlay.show) return;
        setSelectedCardId(prev => prev === card.id ? null : card.id);
    };

    const handleCategoryClick = (cat: CategorySortCategory) => {
        if (selectedCardId !== null) {
            placeCardIntoCategory(selectedCardId, cat);
        }
    };

    // Bilgi Butonu Tıklaması
    const handleInfoClick = (cat: CategorySortCategory) => {
        if (tipTimerRef.current) clearTimeout(tipTimerRef.current);
        const text = cat.description || `${cat.name}: Bu kategoriye ait kavramları yerleştiriniz.`;
        setTip({
            show: true,
            text,
            catId: cat.id,
        });
        tipTimerRef.current = setTimeout(() => {
            setTip(prev => ({ ...prev, show: false }));
        }, 4000);
    };

    // Zaman Formatı (mm:ss)
    const fmtTime = (s: number) => {
        const m = String(Math.floor(s / 60)).padStart(2, '0');
        const sec = String(s % 60).padStart(2, '0');
        return `${m}:${sec}`;
    };

    const successPct = rawItems.length > 0 ? Math.round((okCount / rawItems.length) * 100) : 100;
    const remainingCards = cards.filter(c => !c.placed);

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full min-h-[620px] flex flex-col justify-between overflow-hidden select-none"
            style={{
                background: 'radial-gradient(circle at 50% 15%, #1e3a8a 0%, #0f172a 45%, #020617 100%)',
                fontFamily: `'Baloo 2', 'Trebuchet MS', Arial, sans-serif`,
            }}
        >
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800;900&display=swap');

                @keyframes twinkle {
                    0%, 100% { opacity: 0.25; transform: scale(0.8); }
                    50% { opacity: 0.95; transform: scale(1.2); }
                }

                @keyframes popIn {
                    0% { transform: scale(0.85); opacity: 0; }
                    60% { transform: scale(1.05); }
                    100% { transform: scale(1); opacity: 1; }
                }

                @keyframes cardHover {
                    0% { transform: translateY(0); }
                    100% { transform: translateY(-6px); }
                }

                .custom-scroll::-webkit-scrollbar {
                    height: 8px;
                    width: 6px;
                }
                .custom-scroll::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 8px;
                }
                .custom-scroll::-webkit-scrollbar-thumb {
                    background: rgba(245, 158, 11, 0.5);
                    border-radius: 8px;
                }
                .custom-scroll::-webkit-scrollbar-thumb:hover {
                    background: rgba(245, 158, 11, 0.8);
                }
            `}</style>

            {/* 🌌 Gökyüzü ve Yıldızlar Arka Planı */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* Parıldayan Yıldızlar */}
                {[
                    { left: '8%', top: '12%', size: '3px', delay: '0.2s' },
                    { left: '16%', top: '24%', size: '4px', delay: '1.4s' },
                    { left: '25%', top: '9%', size: '2px', delay: '0.8s' },
                    { left: '38%', top: '18%', size: '3px', delay: '2.1s' },
                    { left: '48%', top: '8%', size: '4px', delay: '1.1s' },
                    { left: '62%', top: '14%', size: '3px', delay: '0.5s' },
                    { left: '74%', top: '22%', size: '2px', delay: '1.9s' },
                    { left: '84%', top: '10%', size: '4px', delay: '0.3s' },
                    { left: '92%', top: '20%', size: '3px', delay: '1.7s' },
                    { left: '12%', top: '38%', size: '2px', delay: '1.0s' },
                    { left: '88%', top: '35%', size: '3px', delay: '2.4s' },
                ].map((s, idx) => (
                    <div
                        key={idx}
                        className="absolute rounded-full bg-white"
                        style={{
                            left: s.left,
                            top: s.top,
                            width: s.size,
                            height: s.size,
                            animation: `twinkle 2.5s infinite ease-in-out ${s.delay}`,
                            boxShadow: '0 0 6px 1px rgba(255,255,255,0.7)',
                        }}
                    />
                ))}

                {/* Hilal ve Işık Haresi */}
                <div
                    className="absolute right-12 top-6 w-16 h-16 rounded-full flex items-center justify-center opacity-85"
                    style={{
                        background: 'radial-gradient(circle, #fef08a 0%, #fde047 60%, rgba(253, 224, 71, 0) 100%)',
                        boxShadow: '0 0 35px 8px rgba(253, 224, 71, 0.45)',
                    }}
                >
                    <span className="text-3xl filter drop-shadow">🌙</span>
                </div>

                {/* Arka Plan Cami Silüeti */}
                <div
                    className="absolute bottom-28 left-0 right-0 h-44 opacity-20 pointer-events-none flex justify-center items-end"
                    style={{
                        background: 'linear-gradient(180deg, transparent 0%, rgba(15, 23, 42, 0.6) 100%)',
                    }}
                >
                    <div className="w-[85%] max-w-5xl h-24 flex items-end justify-between px-10">
                        <div className="w-4 h-32 bg-indigo-950 rounded-t-full shadow-lg" />
                        <div className="w-16 h-20 bg-indigo-950 rounded-t-full" />
                        <div className="w-32 h-28 bg-indigo-950 rounded-t-full" />
                        <div className="w-16 h-20 bg-indigo-950 rounded-t-full" />
                        <div className="w-4 h-32 bg-indigo-950 rounded-t-full shadow-lg" />
                    </div>
                </div>
            </div>

            {/* 👑 ÜST PANEL: Göstergeler ve Ana Başlık */}
            <header className="relative z-20 w-full px-4 pt-3 pb-2 flex flex-col items-center">
                <div className="w-full flex items-center justify-between gap-3 max-w-7xl">
                    {/* Sol: Skor ve Başarı */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-amber-950/80 border-2 border-amber-500/50 shadow-lg text-amber-200">
                            <span className="text-xl">⭐</span>
                            <div className="flex flex-col leading-none">
                                <span className="text-xs text-amber-300/80 font-bold uppercase tracking-wider">Puan</span>
                                <span className="text-xl font-black text-amber-100">{score}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-indigo-950/80 border-2 border-indigo-500/50 shadow-lg text-indigo-200">
                            <span className="text-xl">🎯</span>
                            <div className="flex flex-col leading-none">
                                <span className="text-xs text-indigo-300/80 font-bold uppercase tracking-wider">İlerleme</span>
                                <span className="text-xl font-black text-indigo-100">{okCount}/{rawItems.length}</span>
                            </div>
                        </div>
                    </div>

                    {/* Merkez: 3D Ahşap Görünümlü Ana Başlık ve Yönerge Kurdelesi */}
                    <div className="flex-1 max-w-2xl text-center px-2">
                        {/* Ahşap Tabela */}
                        <div
                            className="inline-block px-7 py-2 rounded-2xl border-4 border-amber-500/80 shadow-2xl relative"
                            style={{
                                background: 'linear-gradient(180deg, #78350f 0%, #451a03 100%)',
                                boxShadow: '0 8px 25px rgba(0,0,0,0.65), inset 0 2px 4px rgba(255,255,255,0.3)',
                            }}
                        >
                            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-amber-100 tracking-wide filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                                {titleText}
                            </h1>
                        </div>

                        {/* Alt Kurdele Yönergesi */}
                        <div className="mt-1.5 inline-block">
                            <div
                                className="px-5 py-1 rounded-full border-2 border-amber-300/60 shadow-md text-amber-950 font-bold text-xs md:text-sm"
                                style={{
                                    background: 'linear-gradient(180deg, #fef3c7 0%, #fde68a 100%)',
                                    boxShadow: '0 3px 10px rgba(0,0,0,0.4)',
                                }}
                            >
                                {descriptionText}
                            </div>
                        </div>
                    </div>

                    {/* Sağ: Süre ve Kontroller */}
                    <div className="flex items-center gap-2">
                        {/* Süre (Kronometre - Sınır Yok) */}
                        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-sky-950/80 border-2 border-sky-500/50 shadow-lg text-sky-200">
                            <span className="text-xl">⏱️</span>
                            <div className="flex flex-col leading-none">
                                <span className="text-xs text-sky-300/80 font-bold uppercase tracking-wider">Süre</span>
                                <span className="text-xl font-black text-sky-100 font-mono">{fmtTime(elapsedTime)}</span>
                            </div>
                        </div>

                        {/* Tam Ekran Tuşu */}
                        <button
                            onClick={toggleFullscreen}
                            className="p-2.5 rounded-2xl bg-amber-900/80 hover:bg-amber-800 border-2 border-amber-500 text-amber-200 shadow-lg transition active:scale-95"
                            title={isFullscreen ? 'Tam Ekrandan Çık' : 'Tam Ekran'}
                        >
                            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                        </button>

                        {/* Duraklat Tuşu */}
                        <button
                            onClick={() => setIsPaused(p => !p)}
                            className="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 border-2 border-slate-500 text-slate-200 shadow-lg transition active:scale-95"
                            title={isPaused ? 'Devam Et' : 'Duraklat'}
                        >
                            {isPaused ? <Play size={20} /> : <Pause size={20} />}
                        </button>

                        {/* Ses Tuşu */}
                        <button
                            onClick={() => setIsMuted(m => !m)}
                            className="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 border-2 border-slate-500 text-slate-200 shadow-lg transition active:scale-95"
                            title={isMuted ? 'Sesi Aç' : 'Sesi Kapat'}
                        >
                            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                        </button>

                        {/* Yeniden Başlat Tuşu */}
                        <button
                            onClick={startGame}
                            className="p-2.5 rounded-2xl bg-emerald-900/80 hover:bg-emerald-800 border-2 border-emerald-500 text-emerald-200 shadow-lg transition active:scale-95"
                            title="Yeniden Başlat"
                        >
                            <RotateCcw size={20} />
                        </button>
                    </div>
                </div>
            </header>

            {/* 🕌 ORTA PANEL: Kategori Sayısı Kadar Dinamik Bölümler (Booths) */}
            <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 py-2 flex flex-col justify-center min-h-[300px]">
                {/* Dinamik Bölüm Izgarası: Kategori Sayısı Kadar Eşit Sütun */}
                <div
                    className="grid gap-4 w-full h-full max-h-[460px] items-stretch"
                    style={{
                        gridTemplateColumns: `repeat(${categories.length}, minmax(0, 1fr))`,
                    }}
                >
                    {categories.map((cat, idx) => {
                        const theme = THEMES[idx % THEMES.length];
                        const placedInThisCat = cards.filter(c => c.placed && c.placedInCatId === cat.id);
                        const isHot = flashes[cat.id] === 'hot';
                        const isOk = flashes[cat.id] === 'ok';
                        const isBad = flashes[cat.id] === 'bad';

                        return (
                            <div
                                key={cat.id}
                                onDragOver={e => handleDragOver(e, cat.id)}
                                onDragLeave={e => handleDragLeave(e, cat.id)}
                                onDrop={e => handleDrop(e, cat)}
                                onClick={() => handleCategoryClick(cat)}
                                className={`relative rounded-3xl border-4 flex flex-col overflow-hidden transition-all duration-200 cursor-pointer ${
                                    isHot ? 'scale-[1.02] -translate-y-1' : ''
                                } ${isOk ? 'ring-4 ring-emerald-400' : ''} ${isBad ? 'ring-4 ring-rose-500' : ''}`}
                                style={{
                                    borderColor: isOk ? '#4ade80' : isBad ? '#f43f5e' : isHot ? '#fef08a' : theme.border,
                                    background: `linear-gradient(180deg, ${theme.bgTop} 0%, ${theme.bgBot} 100%)`,
                                    boxShadow: isHot
                                        ? `0 0 35px 8px ${theme.glow}, inset 0 0 25px rgba(255,255,255,0.2)`
                                        : isOk
                                        ? '0 0 40px 10px rgba(74, 222, 128, 0.6)'
                                        : isBad
                                        ? '0 0 40px 10px rgba(244, 63, 94, 0.6)'
                                        : `0 12px 30px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.2)`,
                                }}
                            >
                                {/* Kaide Başlık Kemer Alanı */}
                                <div
                                    className="px-3 py-3 flex items-center justify-between border-b-2 gap-2"
                                    style={{
                                        borderColor: `${theme.border}44`,
                                        background: 'rgba(0, 0, 0, 0.25)',
                                    }}
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-2xl filter drop-shadow">
                                            {getCategoryIcon(cat.name, idx)}
                                        </span>
                                        <div className="min-w-0 flex flex-col">
                                            <h2
                                                className="text-base md:text-lg lg:text-xl font-black truncate leading-tight tracking-wide"
                                                style={{ color: theme.text }}
                                            >
                                                {cat.name.toUpperCase()}
                                            </h2>
                                            {cat.badge && (
                                                <span
                                                    className="inline-block mt-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full w-max border leading-none"
                                                    style={{
                                                        background: theme.badgeBg,
                                                        color: theme.badgeText,
                                                        borderColor: `${theme.border}55`,
                                                    }}
                                                >
                                                    {cat.badge}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Bilgi Butonu (i) */}
                                    <button
                                        type="button"
                                        onClick={e => {
                                            e.stopPropagation();
                                            handleInfoClick(cat);
                                        }}
                                        className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-90 flex-shrink-0"
                                        title={`${cat.name} hakkında bilgi`}
                                    >
                                        <Info size={16} />
                                    </button>
                                </div>

                                {/* Bilgi Tooltip'i */}
                                {tip.show && tip.catId === cat.id && (
                                    <div
                                        className="absolute top-16 left-3 right-3 z-30 p-3 rounded-2xl bg-amber-100 border-2 border-amber-500 text-amber-950 font-bold text-xs shadow-2xl animate-in fade-in"
                                        style={{ animation: 'popIn 0.25s ease-out' }}
                                    >
                                        <p>{tip.text}</p>
                                    </div>
                                )}

                                {/* Kaide Gövdesi (Yerleşen Kartların Sergilendiği Bölüm) */}
                                <div className="flex-1 p-3 overflow-y-auto custom-scroll flex flex-wrap content-start gap-2.5 min-h-[140px]">
                                    {placedInThisCat.length === 0 ? (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-center py-6 opacity-40">
                                            <div
                                                className="w-16 h-16 rounded-full border-2 border-dashed flex items-center justify-center text-2xl mb-2"
                                                style={{ borderColor: theme.border }}
                                            >
                                                📥
                                            </div>
                                            <span className="text-xs font-bold text-white/80">
                                                Kartları buraya bırakın
                                            </span>
                                        </div>
                                    ) : (
                                        placedInThisCat.map(card => (
                                            <div
                                                key={card.id}
                                                className="px-3 py-2 rounded-xl flex items-center gap-2 border-2 shadow-md w-full animate-in fade-in zoom-in-95"
                                                style={{
                                                    background: 'linear-gradient(135deg, #fffdf8 0%, #fef3c7 100%)',
                                                    borderColor: theme.border,
                                                    animation: 'popIn 0.3s ease-out',
                                                }}
                                            >
                                                <span className="text-xl flex-shrink-0">{card.icon}</span>
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-xs md:text-sm font-black text-amber-950 truncate">
                                                        {card.text}
                                                    </div>
                                                    {card.subtitle && (
                                                        <div className="text-[10px] text-amber-800/80 truncate font-semibold">
                                                            {card.subtitle}
                                                        </div>
                                                    )}
                                                </div>
                                                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>

            {/* 🎴 ALT PANEL: Kart Tepsisi ve Kalan Kartlar */}
            <footer className="relative z-20 w-full px-4 pb-3 pt-1">
                <div
                    className="w-full max-w-7xl mx-auto rounded-3xl border-4 border-amber-600/70 p-3 shadow-2xl relative"
                    style={{
                        background: 'linear-gradient(180deg, #451a03 0%, #1c0a00 100%)',
                        boxShadow: '0 -6px 25px rgba(0,0,0,0.7), inset 0 2px 6px rgba(245, 158, 11, 0.25)',
                    }}
                >
                    {/* Tepsi Başlığı ve Kalan Sayaç */}
                    <div className="flex items-center justify-between px-2 mb-2">
                        <div className="flex items-center gap-2 text-amber-300 font-black text-sm uppercase tracking-wider">
                            <span>🎴 Kart Tepsisi</span>
                            <span className="text-xs text-amber-400/70 font-semibold">
                                (Sürükleyin veya dokunup kategoriye tıklayın)
                            </span>
                        </div>
                        <div className="px-3 py-0.5 rounded-full bg-amber-950 border border-amber-500/40 text-amber-300 text-xs font-bold">
                            Kalan: {remainingCards.length}
                        </div>
                    </div>

                    {/* Kartların Dizildiği Yatay Alan */}
                    <div className="flex items-center gap-3 overflow-x-auto custom-scroll pb-1 min-h-[92px]">
                        {remainingCards.length === 0 ? (
                            <div className="w-full py-4 text-center text-amber-300/80 font-bold text-sm flex items-center justify-center gap-2">
                                <Sparkles size={18} className="text-amber-400" />
                                <span>Harika! Tüm kartlar ait oldukları bölümlere yerleştirildi.</span>
                            </div>
                        ) : (
                            remainingCards.map(card => {
                                const isSelected = selectedCardId === card.id;

                                return (
                                    <div
                                        key={card.id}
                                        draggable={!isPaused && !overlay.show}
                                        onDragStart={e => handleDragStart(e, card)}
                                        onClick={() => handleCardClick(card)}
                                        className={`flex-shrink-0 w-44 md:w-48 p-2.5 rounded-2xl border-3 flex items-center gap-2.5 cursor-grab active:cursor-grabbing transition-all select-none ${
                                            isSelected
                                                ? 'scale-105 -translate-y-2 ring-4 ring-amber-400 shadow-2xl border-amber-400'
                                                : 'hover:-translate-y-1 hover:shadow-xl border-amber-300/80'
                                        }`}
                                        style={{
                                            background: 'linear-gradient(135deg, #fffdf8 0%, #fef3c7 60%, #fde68a 100%)',
                                            boxShadow: isSelected
                                                ? '0 12px 25px rgba(245, 158, 11, 0.45)'
                                                : '0 6px 14px rgba(0,0,0,0.5)',
                                        }}
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-2xl flex-shrink-0 shadow-inner">
                                            {card.icon}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs md:text-sm font-black text-amber-950 leading-tight line-clamp-2">
                                                {card.text}
                                            </div>
                                            {card.subtitle && (
                                                <div className="text-[10px] text-amber-800 truncate font-semibold mt-0.5">
                                                    {card.subtitle}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </footer>

            {/* 🏆 OYUN SONU / TEBRİKLER MODALI */}
            {overlay.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
                    <div
                        className="max-w-md w-full p-8 rounded-3xl border-4 border-amber-500 text-center shadow-2xl relative"
                        style={{
                            background: 'linear-gradient(180deg, #451a03 0%, #1c0a00 100%)',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.9), inset 0 2px 6px rgba(255,255,255,0.2)',
                        }}
                    >
                        <div className="w-20 h-20 mx-auto rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-4xl mb-4 shadow-inner">
                            🏆
                        </div>
                        <h2 className="text-3xl font-black text-amber-200 mb-2">
                            {overlay.title}
                        </h2>
                        <p className="text-amber-100/90 text-sm md:text-base font-bold mb-6">
                            {overlay.desc}
                        </p>
                        <button
                            onClick={startGame}
                            className="px-8 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-amber-950 font-black text-lg shadow-xl hover:scale-105 active:scale-95 transition-all border-2 border-amber-300"
                        >
                            {overlay.btnText}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
