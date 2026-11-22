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
    CheckCircle2,
    Sparkles,
    Trophy
} from 'lucide-react';
import { playSound } from '@/lib/audio-service';
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
        name: 'Nafile ve Sünnet Namazlar',
        badge: 'Gönüllü İbadet',
        description: 'Sünnet ve Nafile: Peygamberimizin yaptığı ve yapılmasını tavsiye ettiği gönüllü ibadetlerdir.',
        color: 'green',
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
    { id: 'it-9', text: 'Teheccüt Namazı', hint: 'Gece uykudan uyanıp kılınır', categoryId: 'sunnet' },
];

// 🎨 3D Kabin / Portal Renk Temaları
interface PortalTheme {
    border: string;
    borderDark: string;
    accent: string;
    headerBg: string;
    glow: string;
    shadow: string;
    chamberBg: string;
    pedestalBorder: string;
    text: string;
    badgeBg: string;
    badgeText: string;
    icon: string;
}

const PORTAL_THEMES: PortalTheme[] = [
    // 0: Safir Mavisi (Farz vb.)
    {
        border: '#0284c7',
        borderDark: '#0369a1',
        accent: '#38bdf8',
        headerBg: 'linear-gradient(180deg, #0284c7 0%, #0369a1 100%)',
        glow: 'rgba(56, 189, 248, 0.45)',
        shadow: '#075985',
        chamberBg: 'linear-gradient(180deg, rgba(8, 47, 73, 0.9) 0%, rgba(3, 105, 161, 0.4) 50%, rgba(12, 74, 110, 0.9) 100%)',
        pedestalBorder: '#38bdf8',
        text: '#f0f9ff',
        badgeBg: 'rgba(56, 189, 248, 0.25)',
        badgeText: '#bae6fd',
        icon: '🕌',
    },
    // 1: Amber / Altın (Vacip vb.)
    {
        border: '#d97706',
        borderDark: '#b45309',
        accent: '#fbbf24',
        headerBg: 'linear-gradient(180deg, #d97706 0%, #b45309 100%)',
        glow: 'rgba(251, 191, 36, 0.45)',
        shadow: '#78350f',
        chamberBg: 'linear-gradient(180deg, rgba(69, 26, 3, 0.9) 0%, rgba(180, 83, 9, 0.4) 50%, rgba(120, 53, 15, 0.9) 100%)',
        pedestalBorder: '#fbbf24',
        text: '#fefce8',
        badgeBg: 'rgba(251, 191, 36, 0.25)',
        badgeText: '#fef08a',
        icon: '⭐',
    },
    // 2: Zümrüt Yeşili (Sünnet vb.)
    {
        border: '#059669',
        borderDark: '#047857',
        accent: '#34d399',
        headerBg: 'linear-gradient(180deg, #059669 0%, #047857 100%)',
        glow: 'rgba(52, 211, 153, 0.45)',
        shadow: '#064e3b',
        chamberBg: 'linear-gradient(180deg, rgba(2, 44, 34, 0.9) 0%, rgba(4, 120, 87, 0.4) 50%, rgba(6, 78, 59, 0.9) 100%)',
        pedestalBorder: '#34d399',
        text: '#f0fdf4',
        badgeBg: 'rgba(52, 211, 153, 0.25)',
        badgeText: '#bbf7d0',
        icon: '🌙',
    },
    // 3: Kraliyet Moru (Nafile vb.)
    {
        border: '#7c3aed',
        borderDark: '#6d28d9',
        accent: '#c084fc',
        headerBg: 'linear-gradient(180deg, #7c3aed 0%, #6d28d9 100%)',
        glow: 'rgba(192, 132, 252, 0.45)',
        shadow: '#4c1d95',
        chamberBg: 'linear-gradient(180deg, rgba(30, 11, 54, 0.9) 0%, rgba(109, 40, 217, 0.4) 50%, rgba(76, 29, 149, 0.9) 100%)',
        pedestalBorder: '#c084fc',
        text: '#faf5ff',
        badgeBg: 'rgba(192, 132, 252, 0.25)',
        badgeText: '#e9d5ff',
        icon: '💜',
    },
    // 4: Yakut Kırmızısı
    {
        border: '#e11d48',
        borderDark: '#be123c',
        accent: '#fb7185',
        headerBg: 'linear-gradient(180deg, #e11d48 0%, #be123c 100%)',
        glow: 'rgba(251, 113, 133, 0.45)',
        shadow: '#881337',
        chamberBg: 'linear-gradient(180deg, rgba(76, 5, 25, 0.9) 0%, rgba(190, 18, 60, 0.4) 50%, rgba(136, 19, 55, 0.9) 100%)',
        pedestalBorder: '#fb7185',
        text: '#fff1f2',
        badgeBg: 'rgba(251, 113, 133, 0.25)',
        badgeText: '#fecdd3',
        icon: '💎',
    },
    // 5: Turkuaz Pınar
    {
        border: '#0891b2',
        borderDark: '#0e7490',
        accent: '#22d3ee',
        headerBg: 'linear-gradient(180deg, #0891b2 0%, #0e7490 100%)',
        glow: 'rgba(34, 211, 238, 0.45)',
        shadow: '#155e75',
        chamberBg: 'linear-gradient(180deg, rgba(4, 47, 46, 0.9) 0%, rgba(14, 116, 144, 0.4) 50%, rgba(21, 94, 117, 0.9) 100%)',
        pedestalBorder: '#22d3ee',
        text: '#ecfeff',
        badgeBg: 'rgba(34, 211, 238, 0.25)',
        badgeText: '#a5f3fc',
        icon: '✨',
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
    if (combined.includes('yatsı') || combined.includes('gece') || combined.includes('teheccüt')) return '🌌';
    if (combined.includes('teravih')) return '🌙';
    if (combined.includes('farz') || combined.includes('namaz') || combined.includes('ezan')) return '🕌';
    if (combined.includes('abdest') || combined.includes('taharet') || combined.includes('şart')) return '🧼';
    if (combined.includes('kıyam') || combined.includes('rükû') || combined.includes('secde')) return '🧘';
    if (combined.includes('oruç') || combined.includes('iftar') || combined.includes('sahur')) return '🥣';
    if (combined.includes('zekat') || combined.includes('sadaka')) return '💰';
    if (combined.includes('hac') || combined.includes('umre') || combined.includes('kabe')) return '🕋';
    if (combined.includes('kuran') || combined.includes('ayet') || combined.includes('sure')) return '📖';
    if (combined.includes('peygamber') || combined.includes('sünnet')) return '💚';
    return '✨';
}

function getCategoryIcon(name: string, index: number): string {
    const n = name.toLowerCase();
    if (n.includes('farz') || n.includes('hazırlık')) return '🕌';
    if (n.includes('vacip') || n.includes('kılınış')) return '⭐';
    if (n.includes('sünnet') || n.includes('cemaat')) return '🌙';
    if (n.includes('nafile')) return '💜';
    const defaults = ['🕌', '⭐', '🌙', '💜', '💎', '✨'];
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
    const titleText = step.title || 'Namaz Çeşitlerini Sınıflandıralım';
    const descriptionText = step.description || 'Aşağıdaki kavramları ait oldukları hüküm kategorilerine sürükleyiniz veya dokunarak yerleştiriniz.';

    // Oyun Durumları
    const [score, setScore] = useState(250);
    const [okCount, setOkCount] = useState(0);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [cards, setCards] = useState<GameCard[]>([]);
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

    // Ali'nin Konuşma Baloncuğu
    const [aliSpeech, setAliSpeech] = useState<string>(() => {
        if (titleText.toLowerCase().includes('namaz')) {
            return 'Namazları doğru kategorilere yerleştir!';
        }
        return 'Kavramları doğru kategorilere yerleştir!';
    });

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

    // Ses Çalma Yardımcısı
    const triggerSound = useCallback((type: 'correct' | 'error' | 'pop' | 'win') => {
        if (isMuted) return;
        playSound(type);
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
        }, 600);
    }, []);

    // Zafer Kontrolü
    const checkWin = useCallback((nextOkCount: number) => {
        if (nextOkCount >= rawItems.length && rawItems.length > 0) {
            if (timerRef.current) clearInterval(timerRef.current);
            triggerSound('win');
            setTimeout(() => {
                setOverlay({
                    show: true,
                    title: 'Tebrikler Şampiyon! 🏆',
                    desc: `Tüm kavramları doğru kategorilere başarıyla yerleştirdiniz! Toplam Puanınız: ${score + 50}`,
                    btnText: 'Tekrar Oyna 🔄',
                    isWin: true,
                });
            }, 500);
        }
    }, [rawItems.length, triggerSound, score]);

    // Kartı Kategoriye Yerleştirme Fonksiyonu
    const placeCardIntoCategory = useCallback((cardId: string, targetCat: CategorySortCategory) => {
        const card = cards.find(c => c.id === cardId);
        if (!card || card.placed) return;

        const isMatch = isCategoryMatch(card.targetCatId, targetCat);

        if (isMatch) {
            triggerSound('correct');
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

            setAliSpeech(`Harika! ${card.text} doğru kategoriye yerleşti! 🌟`);
            setSelectedCardId(null);
            checkWin(nextOk);
        } else {
            triggerSound('error');
            triggerFlash(targetCat.id, 'bad');
            setScore(prev => Math.max(0, prev - 10));
            setAliSpeech('Tekrar dene şampiyon, bu kavram başka bir kategoriye ait! 💡');
            setSelectedCardId(null);
        }
    }, [cards, okCount, triggerSound, triggerFlash, checkWin]);

    // Sürükle - Bırak (HTML5 Drag & Drop)
    const handleDragStart = (e: React.DragEvent, card: GameCard) => {
        if (card.placed || isPaused || overlay.show) return;
        e.dataTransfer.setData('text/plain', card.id);
        e.dataTransfer.effectAllowed = 'move';
        triggerSound('pop');
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

    // Tıklayarak Seç ve Kaideye Dokunarak Yerleştir (Akıllı Tahta / Dokunmatik Ekran)
    const handleCardClick = (card: GameCard) => {
        if (card.placed || isPaused || overlay.show) return;
        triggerSound('pop');
        setSelectedCardId(prev => (prev === card.id ? null : card.id));
    };

    const handleCategoryClick = (cat: CategorySortCategory) => {
        if (selectedCardId !== null) {
            placeCardIntoCategory(selectedCardId, cat);
        }
    };

    // Bilgi Butonu Tıklaması
    const handleInfoClick = (cat: CategorySortCategory) => {
        if (tipTimerRef.current) clearTimeout(tipTimerRef.current);
        triggerSound('pop');
        const text = cat.description || `${cat.name}: Bu kategoriye ait kavramları sürükleyiniz veya dokunarak yerleştiriniz.`;
        setTip({
            show: true,
            text,
            catId: cat.id,
        });
        tipTimerRef.current = setTimeout(() => {
            setTip(prev => ({ ...prev, show: false }));
        }, 4500);
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
            className="relative w-full h-full min-h-[640px] flex flex-col justify-between overflow-hidden select-none"
            style={{
                background: 'radial-gradient(ellipse 120% 80% at 50% 15%, #1e3a8a 0%, #0d1b3e 40%, #060b1e 100%)',
                fontFamily: `'Baloo 2', 'Trebuchet MS', Arial, sans-serif`,
            }}
        >
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800;900&display=swap');

                @keyframes twinkle {
                    0%, 100% { opacity: 0.3; transform: scale(0.85); }
                    50% { opacity: 1; transform: scale(1.25); filter: drop-shadow(0 0 6px #fff); }
                }

                @keyframes boyBreath {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-4px); }
                }

                @keyframes lanternPulse {
                    0%, 100% { filter: drop-shadow(0 0 14px rgba(245, 158, 11, 0.7)); }
                    50% { filter: drop-shadow(0 0 26px rgba(251, 191, 36, 0.95)); }
                }

                @keyframes ringRotate {
                    0% { stroke-dashoffset: 0; }
                    100% { stroke-dashoffset: 40; }
                }

                @keyframes popToken {
                    0% { transform: scale(0.8) translateY(10px); opacity: 0; }
                    70% { transform: scale(1.06) translateY(-2px); }
                    100% { transform: scale(1) translateY(0); opacity: 1; }
                }

                .boy-motion {
                    animation: boyBreath 3.5s ease-in-out infinite;
                }

                .lantern-glow {
                    animation: lanternPulse 2.2s ease-in-out infinite;
                }

                .custom-scroll::-webkit-scrollbar {
                    height: 8px;
                    width: 6px;
                }
                .custom-scroll::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 8px;
                }
                .custom-scroll::-webkit-scrollbar-thumb {
                    background: rgba(245, 158, 11, 0.6);
                    border-radius: 8px;
                }
                .custom-scroll::-webkit-scrollbar-thumb:hover {
                    background: rgba(245, 158, 11, 0.9);
                }
            `}</style>

            {/* 🌌 1. İSLAMİ FANTASTİK SAHNE ARKA PLANI (CAMİ KUBBELERİ, MİNARELER, GÖKYÜZÜ, FISKIYELER) */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                {/* Parıldayan Yıldızlar */}
                {[
                    { left: '6%', top: '8%', size: '3px', delay: '0.1s' },
                    { left: '14%', top: '18%', size: '4px', delay: '1.2s' },
                    { left: '26%', top: '7%', size: '3px', delay: '0.6s' },
                    { left: '38%', top: '15%', size: '4px', delay: '2.0s' },
                    { left: '49%', top: '6%', size: '5px', delay: '0.9s' },
                    { left: '64%', top: '12%', size: '3px', delay: '0.4s' },
                    { left: '76%', top: '19%', size: '4px', delay: '1.7s' },
                    { left: '88%', top: '8%', size: '4px', delay: '0.3s' },
                    { left: '94%', top: '16%', size: '3px', delay: '1.5s' },
                ].map((s, idx) => (
                    <div
                        key={idx}
                        className="absolute rounded-full bg-white"
                        style={{
                            left: s.left,
                            top: s.top,
                            width: s.size,
                            height: s.size,
                            animation: `twinkle 2.8s infinite ease-in-out ${s.delay}`,
                        }}
                    />
                ))}

                {/* Altın Hilal & Gökyüzü Halesi */}
                <div
                    className="absolute right-10 top-4 w-16 h-16 rounded-full flex items-center justify-center opacity-90"
                    style={{
                        background: 'radial-gradient(circle, #fef08a 0%, #fde047 50%, rgba(253, 224, 71, 0) 100%)',
                        boxShadow: '0 0 35px 10px rgba(253, 224, 71, 0.5)',
                    }}
                >
                    <span className="text-3xl filter drop-shadow">🌙</span>
                </div>

                {/* Arka Plandaki İhtişamlı Cami & Saray Silüeti */}
                <div className="absolute bottom-28 left-0 right-0 h-52 flex items-end justify-between px-6 opacity-35">
                    {/* Sol Minareler ve Hurma Ağaçları */}
                    <div className="flex items-end gap-2">
                        <span className="text-5xl filter drop-shadow opacity-70">🌴</span>
                        <div className="w-5 h-52 bg-gradient-to-t from-indigo-950 via-indigo-900 to-sky-800 rounded-t-full shadow-2xl relative border-t border-sky-400">
                            <div className="absolute top-6 left-1/2 -translate-x-1/2 w-8 h-2.5 bg-amber-400/80 rounded-full shadow-lg" />
                            <div className="absolute top-16 left-1/2 -translate-x-1/2 w-8 h-2 bg-amber-400/60 rounded-full" />
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs text-amber-300">🌙</div>
                        </div>
                    </div>

                    {/* Merkez Kubbeler & Pencereler */}
                    <div className="flex items-end justify-center gap-1.5 flex-1 max-w-3xl">
                        <div className="w-24 h-24 bg-gradient-to-t from-indigo-950 to-sky-900 rounded-t-full border-t border-sky-400/40" />
                        <div className="w-40 h-36 bg-gradient-to-t from-indigo-950 to-sky-800 rounded-t-full relative border-t-2 border-sky-300/60 shadow-2xl flex items-center justify-center">
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-amber-300 text-sm">🌙</div>
                            <div className="w-6 h-10 bg-amber-300/40 rounded-t-full mt-10 shadow-[0_0_15px_#fde047]" />
                        </div>
                        <div className="w-24 h-24 bg-gradient-to-t from-indigo-950 to-sky-900 rounded-t-full border-t border-sky-400/40" />
                    </div>

                    {/* Sağ Minareler ve Şadırvan Fıskiyesi */}
                    <div className="flex items-end gap-2">
                        <span className="text-4xl filter drop-shadow opacity-70">⛲</span>
                        <div className="w-5 h-52 bg-gradient-to-t from-indigo-950 via-indigo-900 to-sky-800 rounded-t-full shadow-2xl relative border-t border-sky-400">
                            <div className="absolute top-6 left-1/2 -translate-x-1/2 w-8 h-2.5 bg-amber-400/80 rounded-full shadow-lg" />
                            <div className="absolute top-16 left-1/2 -translate-x-1/2 w-8 h-2 bg-amber-400/60 rounded-full" />
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs text-amber-300">🌙</div>
                        </div>
                        <span className="text-5xl filter drop-shadow opacity-70">🌴</span>
                    </div>
                </div>

                {/* Taş Zemin Tererası Işıltısı */}
                <div
                    className="absolute bottom-0 left-0 right-0 h-36 opacity-30"
                    style={{
                        background: 'linear-gradient(180deg, transparent 0%, rgba(30, 27, 75, 0.8) 40%, rgba(15, 23, 42, 0.95) 100%)',
                    }}
                />
            </div>

            {/* 👑 2. ÜST HUD: 3D AHŞAP TABELA, ASILI ZİNCİRLER, PUAN, SEVİYE, KRONOMETRE & BUTONLAR */}
            <header className="relative z-20 w-full px-4 pt-2.5 pb-1 flex flex-col items-center">
                <div className="w-full max-w-7xl flex items-center justify-between gap-3">
                    {/* Sol Bölüm: 3D Yıldız Puan Kapsülü ve Seviye Madalyası */}
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                        {/* 3D Puan Kapsülü */}
                        <div
                            className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border-3 border-amber-400/80 shadow-[0_8px_20px_rgba(0,0,0,0.6)]"
                            style={{
                                background: 'linear-gradient(180deg, #1e3a8a 0%, #0c4a6e 100%)',
                            }}
                        >
                            <span className="text-2xl filter drop-shadow-[0_2px_4px_#f59e0b]">⭐</span>
                            <div className="flex flex-col leading-none">
                                <span className="text-xl md:text-2xl font-black text-amber-300 drop-shadow">{score}</span>
                                <span className="text-[10px] text-amber-100 font-extrabold uppercase tracking-wider">Puan</span>
                            </div>
                        </div>

                        {/* 3D Seviye Madalyası */}
                        <div
                            className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border-3 border-amber-400/80 shadow-[0_8px_20px_rgba(0,0,0,0.6)]"
                            style={{
                                background: 'linear-gradient(180deg, #1e3a8a 0%, #0c4a6e 100%)',
                            }}
                        >
                            <span className="text-2xl filter drop-shadow">🎖️</span>
                            <div className="flex flex-col leading-none">
                                <span className="text-[10px] text-amber-200 font-bold uppercase tracking-wider">İlerleme</span>
                                <span className="text-lg md:text-xl font-black text-white drop-shadow">
                                    {okCount}/{rawItems.length}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Merkez: 3D Oymalı Asılı Ahşap Tabela ve Kurdele */}
                    <div className="flex-1 max-w-2xl text-center px-2 flex flex-col items-center relative">
                        {/* Asılı Çift Zincir/Halat */}
                        <div className="w-48 h-3 flex justify-between px-6 pointer-events-none -mb-1 z-10">
                            <div className="w-1.5 h-4 bg-gradient-to-b from-amber-200 via-amber-600 to-amber-900 rounded-full shadow" />
                            <div className="w-1.5 h-4 bg-gradient-to-b from-amber-200 via-amber-600 to-amber-900 rounded-full shadow" />
                        </div>

                        {/* 3D Ahşap Tabela */}
                        <div
                            className="w-full px-6 py-2 rounded-2xl border-4 border-amber-600/90 shadow-[0_10px_25px_rgba(0,0,0,0.8),inset_0_3px_6px_rgba(255,255,255,0.35)] relative overflow-hidden"
                            style={{
                                background: 'linear-gradient(180deg, #854d0e 0%, #713f12 35%, #451a03 100%)',
                            }}
                        >
                            {/* Köşe Pirinç Çivileri */}
                            <div className="absolute top-1.5 left-2 w-2 h-2 rounded-full bg-amber-300 shadow-inner" />
                            <div className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-amber-300 shadow-inner" />
                            <div className="absolute bottom-1.5 left-2 w-2 h-2 rounded-full bg-amber-300 shadow-inner" />
                            <div className="absolute bottom-1.5 right-2 w-2 h-2 rounded-full bg-amber-300 shadow-inner" />

                            <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-amber-200 tracking-wide filter drop-shadow-[0_3px_5px_rgba(0,0,0,0.9)] truncate">
                                {titleText}
                            </h1>
                        </div>

                        {/* Alt Dalgalı Kurdele Yönergesi */}
                        <div className="relative -mt-1 z-10 max-w-xl">
                            <div
                                className="px-5 py-1 rounded-full border-2 border-amber-300/80 shadow-[0_4px_12px_rgba(0,0,0,0.5)] text-amber-950 font-black text-xs md:text-sm tracking-tight truncate"
                                style={{
                                    background: 'linear-gradient(180deg, #fffbeb 0%, #fef3c7 40%, #fde68a 100%)',
                                }}
                            >
                                {descriptionText}
                            </div>
                        </div>
                    </div>

                    {/* Sağ Bölüm: 3D Kronometre Cep Saati & Yuvarlak Butonlar */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {/* 3D Kronometre (Zaman Sınırı Yok) */}
                        <div
                            className="flex items-center gap-2 px-3 py-1.5 rounded-2xl border-3 border-amber-400/80 shadow-[0_8px_20px_rgba(0,0,0,0.6)]"
                            style={{
                                background: 'linear-gradient(180deg, #1e3a8a 0%, #0c4a6e 100%)',
                            }}
                        >
                            <span className="text-2xl filter drop-shadow">⏱️</span>
                            <div className="flex flex-col leading-none">
                                <span className="text-lg md:text-xl font-black text-white font-mono drop-shadow">
                                    {fmtTime(elapsedTime)}
                                </span>
                                <span className="text-[9px] text-sky-200 font-extrabold uppercase tracking-wider">Süre</span>
                            </div>
                        </div>

                        {/* 3D Tam Ekran Butonu */}
                        <button
                            onClick={toggleFullscreen}
                            className="w-10 h-10 rounded-full border-3 border-amber-400/90 flex items-center justify-center text-amber-200 shadow-xl hover:scale-105 active:scale-95 transition-all"
                            style={{
                                background: 'linear-gradient(180deg, #b45309 0%, #78350f 100%)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.3)',
                            }}
                            title={isFullscreen ? 'Tam Ekrandan Çık' : 'Tam Ekran'}
                        >
                            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                        </button>

                        {/* 3D Duraklat Butonu */}
                        <button
                            onClick={() => {
                                triggerSound('pop');
                                setIsPaused(p => !p);
                            }}
                            className="w-10 h-10 rounded-full border-3 border-sky-400/90 flex items-center justify-center text-sky-100 shadow-xl hover:scale-105 active:scale-95 transition-all"
                            style={{
                                background: 'linear-gradient(180deg, #0284c7 0%, #0369a1 100%)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.3)',
                            }}
                            title={isPaused ? 'Devam Et' : 'Duraklat'}
                        >
                            {isPaused ? <Play size={18} /> : <Pause size={18} />}
                        </button>

                        {/* 3D Ses Butonu */}
                        <button
                            onClick={() => {
                                setIsMuted(m => !m);
                            }}
                            className="w-10 h-10 rounded-full border-3 border-sky-400/90 flex items-center justify-center text-sky-100 shadow-xl hover:scale-105 active:scale-95 transition-all"
                            style={{
                                background: 'linear-gradient(180deg, #0284c7 0%, #0369a1 100%)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.3)',
                            }}
                            title={isMuted ? 'Sesi Aç' : 'Sesi Kapat'}
                        >
                            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        </button>
                    </div>
                </div>
            </header>

            {/* 🕌 3. ORTA ALAN: SOLDA SEVİMLİ REHBER ALİ & SAĞDA KATEGORİ SAYISI KADAR 3D KABİNLER (PORTALLAR) */}
            <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 py-2 flex items-stretch gap-4 min-h-[300px]">
                {/* SOL: SEVİMLİ KARAKTER ALİ & 3D FENER & KONUŞMA BALONCUĞU */}
                <div className="hidden lg:flex flex-col items-center justify-end w-56 flex-shrink-0 select-none pb-2 relative">
                    {/* Konuşma Baloncuğu */}
                    <div
                        className="mb-3 p-3 rounded-2xl border-3 border-amber-300 shadow-2xl relative cursor-pointer hover:scale-105 active:scale-95 transition-all"
                        onClick={() => {
                            triggerSound('pop');
                            setAliSpeech('Kelimeleri doğru kutuya sürükle ya da dokun! 🌟');
                        }}
                        style={{
                            background: 'linear-gradient(180deg, #ffffff 0%, #fef3c7 70%, #fde68a 100%)',
                            boxShadow: '0 8px 25px rgba(0,0,0,0.6)',
                        }}
                    >
                        <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-base">🧒</span>
                            <span className="text-xs font-black text-amber-900 tracking-wide uppercase">Haydi bakalım!</span>
                        </div>
                        <p className="text-xs font-black text-amber-950 leading-snug">
                            {aliSpeech}
                        </p>
                        {/* Baloncuk Kuyruğu */}
                        <div
                            className="absolute -bottom-2.5 left-10 w-4 h-4 rotate-45 border-r-3 border-b-3 border-amber-300"
                            style={{ background: '#fde68a' }}
                        />
                    </div>

                    {/* Ali Karakteri Vector SVG & Fener */}
                    <div className="relative flex flex-col items-center boy-motion">
                        <svg
                            viewBox="0 0 200 240"
                            className="w-40 h-48 filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.8)]"
                        >
                            {/* Gövde / Cübbe (Thobe) */}
                            <path
                                d="M60 110 L140 110 L155 235 L45 235 Z"
                                fill="url(#aliThobe)"
                                stroke="#cbd5e1"
                                strokeWidth="2.5"
                            />
                            {/* Yaka ve Düğmeler */}
                            <path d="M100 110 L100 170" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
                            <circle cx="100" cy="125" r="3" fill="#f59e0b" />
                            <circle cx="100" cy="145" r="3" fill="#f59e0b" />
                            <circle cx="100" cy="165" r="3" fill="#f59e0b" />

                            {/* Sağ Kol (Yanda) */}
                            <path
                                d="M60 115 L40 160 L50 170 L70 125 Z"
                                fill="#ffffff"
                                stroke="#cbd5e1"
                                strokeWidth="2"
                            />
                            {/* Sağ El */}
                            <circle cx="45" cy="170" r="10" fill="#fbcfe8" />

                            {/* Sol Kol & İleri İşaret Eden El (Kabinleri Gösteriyor) */}
                            <path
                                d="M140 115 L175 130 L170 145 L135 130 Z"
                                fill="#ffffff"
                                stroke="#cbd5e1"
                                strokeWidth="2"
                            />
                            {/* İşaret Eden El */}
                            <circle cx="178" cy="135" r="10" fill="#fbcfe8" />
                            <path d="M182 133 L198 131" stroke="#fbcfe8" strokeWidth="5" strokeLinecap="round" />

                            {/* Boyun */}
                            <rect x="90" y="95" width="20" height="18" rx="6" fill="#fbcfe8" />

                            {/* Yüz */}
                            <ellipse cx="100" cy="72" rx="36" ry="34" fill="#fbcfe8" stroke="#f472b6" strokeWidth="1" />

                            {/* Kulaklar */}
                            <circle cx="64" cy="74" r="8" fill="#fbcfe8" />
                            <circle cx="136" cy="74" r="8" fill="#fbcfe8" />

                            {/* Sevimli Saçlar */}
                            <path
                                d="M66 60 Q100 35 134 60 Q130 45 100 42 Q70 45 66 60 Z"
                                fill="#451a03"
                            />

                            {/* Namaz Takkesi (İşlemeli Beyaz Takke) */}
                            <path
                                d="M66 58 Q100 22 134 58 Z"
                                fill="#ffffff"
                                stroke="#f59e0b"
                                strokeWidth="2"
                            />
                            <path d="M72 52 Q100 30 128 52" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 3" />

                            {/* Büyük Çizgi Film Gözleri */}
                            <ellipse cx="86" cy="70" rx="6.5" ry="8.5" fill="#1e1b4b" />
                            <circle cx="84" cy="67" r="2.5" fill="#ffffff" />
                            <ellipse cx="114" cy="70" rx="6.5" ry="8.5" fill="#1e1b4b" />
                            <circle cx="112" cy="67" r="2.5" fill="#ffffff" />

                            {/* Kaşlar */}
                            <path d="M79 58 Q86 54 93 57" stroke="#451a03" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                            <path d="M107 57 Q114 54 121 58" stroke="#451a03" strokeWidth="2.5" fill="none" strokeLinecap="round" />

                            {/* Gülümseyen Ağız & Yanak Pembeliği */}
                            <path d="M88 84 Q100 96 112 84" stroke="#be123c" strokeWidth="3" fill="#fda4af" strokeLinecap="round" />
                            <ellipse cx="76" cy="78" rx="5" ry="3" fill="#fb7185" opacity="0.6" />
                            <ellipse cx="124" cy="78" rx="5" ry="3" fill="#fb7185" opacity="0.6" />

                            {/* Degrade Tanımları */}
                            <defs>
                                <linearGradient id="aliThobe" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#ffffff" />
                                    <stop offset="100%" stopColor="#e2e8f0" />
                                </linearGradient>
                            </defs>
                        </svg>

                        {/* Yerde Yanan 3D Pirinç İslami Kandil / Fener */}
                        <div className="absolute -bottom-2 -left-3 flex items-center lantern-glow">
                            <span className="text-4xl filter drop-shadow-[0_0_20px_#f59e0b]">🏮</span>
                            {/* Işık Haleleri */}
                            <div className="absolute -bottom-1 left-2 w-16 h-6 rounded-full bg-amber-400/30 blur-md pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* SAĞ: KATEGORİ SAYISI KADAR DİNAMİK 3D KABİNLER (PORTALLAR) */}
                <div
                    className="flex-1 grid gap-4 items-stretch h-full min-h-[360px]"
                    style={{
                        gridTemplateColumns: `repeat(${categories.length}, minmax(0, 1fr))`,
                    }}
                >
                    {categories.map((cat, idx) => {
                        const theme = PORTAL_THEMES[idx % PORTAL_THEMES.length];
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
                                className={`relative rounded-t-[42px] rounded-b-3xl border-4 md:border-[6px] border-b-[12px] md:border-b-[16px] flex flex-col overflow-hidden transition-all duration-200 cursor-pointer ${
                                    isHot ? 'scale-[1.02] -translate-y-2' : ''
                                } ${isOk ? 'ring-4 ring-emerald-400' : ''} ${isBad ? 'ring-4 ring-rose-500 animate-shake' : ''}`}
                                style={{
                                    borderColor: isOk ? '#4ade80' : isBad ? '#f43f5e' : isHot ? '#fef08a' : theme.border,
                                    borderBottomColor: isOk ? '#15803d' : isBad ? '#9f1239' : isHot ? '#ca8a04' : theme.shadow,
                                    background: theme.chamberBg,
                                    boxShadow: isHot
                                        ? `0 0 45px 12px ${theme.glow}, inset 0 0 35px rgba(255,255,255,0.3)`
                                        : isOk
                                        ? '0 0 50px 15px rgba(74, 222, 128, 0.7)'
                                        : isBad
                                        ? '0 0 50px 15px rgba(244, 63, 94, 0.7)'
                                        : `0 15px 35px rgba(0,0,0,0.7), inset 0 3px 6px rgba(255,255,255,0.3)`,
                                }}
                            >
                                {/* 3D Kemerli Tepe Kubbe Tacı */}
                                <div
                                    className="pt-2 pb-2 px-3 flex flex-col items-center justify-center relative border-b-3"
                                    style={{
                                        background: theme.headerBg,
                                        borderColor: `${theme.accent}66`,
                                        boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                                    }}
                                >
                                    {/* Tepe İkonu Rozeti */}
                                    <div
                                        className="w-10 h-10 -mt-5 mb-1 rounded-full border-3 border-amber-300 flex items-center justify-center text-xl shadow-lg"
                                        style={{
                                            background: 'linear-gradient(180deg, #fef08a 0%, #f59e0b 100%)',
                                        }}
                                    >
                                        {getCategoryIcon(cat.name, idx)}
                                    </div>

                                    {/* Kategori Başlığı & Rozet */}
                                    <div className="w-full flex items-center justify-between gap-1.5 px-1">
                                        <div className="flex-1 min-w-0 text-center">
                                            <h2
                                                className="text-base md:text-lg lg:text-xl font-black truncate leading-tight tracking-wider text-white filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                                            >
                                                {cat.name.toUpperCase()}
                                            </h2>
                                            {cat.badge && (
                                                <span
                                                    className="inline-block mt-0.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border leading-none shadow-sm"
                                                    style={{
                                                        background: theme.badgeBg,
                                                        color: theme.badgeText,
                                                        borderColor: `${theme.accent}66`,
                                                    }}
                                                >
                                                    {cat.badge}
                                                </span>
                                            )}
                                        </div>

                                        {/* Bilgi Butonu (ℹ️) */}
                                        <button
                                            type="button"
                                            onClick={e => {
                                                e.stopPropagation();
                                                handleInfoClick(cat);
                                            }}
                                            className="p-1 rounded-full bg-white/20 hover:bg-white/35 text-white transition active:scale-90 flex-shrink-0"
                                            title={`${cat.name} hakkında bilgi`}
                                        >
                                            <Info size={15} />
                                        </button>
                                    </div>
                                </div>

                                {/* Bilgi Tooltip'i */}
                                {tip.show && tip.catId === cat.id && (
                                    <div
                                        className="absolute top-20 left-3 right-3 z-30 p-3 rounded-2xl bg-amber-100 border-3 border-amber-500 text-amber-950 font-black text-xs shadow-2xl animate-in fade-in zoom-in-95"
                                    >
                                        <p>{tip.text}</p>
                                    </div>
                                )}

                                {/* Kabin İç Boşluğu & Yerleşen Kartlar */}
                                <div className="flex-1 p-3 flex flex-col justify-between overflow-y-auto custom-scroll relative">
                                    {/* Cami Silüeti ve Işık Huzmesi */}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-15 pointer-events-none">
                                        <span className="text-8xl">🕌</span>
                                    </div>

                                    {/* Yerleşen Kartlar Listesi */}
                                    <div className="relative z-10 flex flex-col gap-2 w-full">
                                        {placedInThisCat.map(card => (
                                            <div
                                                key={card.id}
                                                className="px-3 py-2 rounded-xl flex items-center gap-2 border-2 shadow-md w-full animate-in fade-in"
                                                style={{
                                                    background: 'linear-gradient(135deg, #fffdf8 0%, #fef3c7 100%)',
                                                    borderColor: theme.border,
                                                    animation: 'popToken 0.35s ease-out',
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
                                        ))}
                                    </div>

                                    {/* Taban: 3D Perspektif Kesikli Halka (Pedestal) */}
                                    <div className="relative z-0 mt-auto pt-4 flex flex-col items-center justify-center pointer-events-none">
                                        <div
                                            className="w-4/5 h-10 rounded-[50%] border-3 border-dashed flex items-center justify-center"
                                            style={{
                                                borderColor: theme.pedestalBorder,
                                                boxShadow: `0 0 20px 4px ${theme.glow}`,
                                                background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.15) 0%, transparent 70%)',
                                            }}
                                        >
                                            {placedInThisCat.length === 0 && (
                                                <span className="text-[11px] font-extrabold text-white/70 uppercase tracking-wider">
                                                    Buraya Bırakın
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>

            {/* 🎴 4. ALT HUD: 3D YENİDEN BAŞLA BUTONU, 3D AHŞAP KART TEPSİSİ & HAZİNE SANDIĞI */}
            <footer className="relative z-20 w-full px-4 pb-3 pt-1">
                <div className="w-full max-w-7xl mx-auto flex items-center gap-3">
                    {/* SOL: 3D Mor Yeniden Başla Butonu */}
                    <button
                        onClick={startGame}
                        className="flex-shrink-0 w-24 md:w-28 h-20 md:h-24 rounded-3xl border-3 border-purple-400/90 border-b-[8px] border-b-purple-950 flex flex-col items-center justify-center text-white shadow-2xl hover:scale-105 active:scale-95 active:border-b-3 transition-all"
                        style={{
                            background: 'linear-gradient(180deg, #a855f7 0%, #7e22ce 100%)',
                            boxShadow: '0 8px 25px rgba(0,0,0,0.7), inset 0 2px 4px rgba(255,255,255,0.4)',
                        }}
                        title="Oyunu Sıfırla"
                    >
                        <RotateCcw size={26} className="mb-0.5 filter drop-shadow" />
                        <span className="text-xs md:text-sm font-black tracking-tight leading-none">Yeniden</span>
                        <span className="text-[11px] font-bold text-purple-200 leading-none">Başla</span>
                    </button>

                    {/* MERKEZ: 3D Oymalı Ahşap Tepsi & Oynanabilir Kartlar */}
                    <div
                        className="flex-1 rounded-3xl border-4 border-amber-600/80 border-b-[8px] border-b-amber-950 p-2.5 shadow-[0_12px_30px_rgba(0,0,0,0.8),inset_0_3px_6px_rgba(255,255,255,0.25)] relative overflow-hidden"
                        style={{
                            background: 'linear-gradient(180deg, #451a03 0%, #1c0a00 100%)',
                        }}
                    >
                        {/* Köşe Pirinç Kelepçeleri */}
                        <div className="absolute top-1 left-2 w-3 h-3 bg-amber-400/80 rounded shadow" />
                        <div className="absolute top-1 right-2 w-3 h-3 bg-amber-400/80 rounded shadow" />

                        {/* Kartların Dizildiği Yatay Alan */}
                        <div className="flex items-center gap-3 overflow-x-auto custom-scroll py-1 min-h-[78px] px-1">
                            {remainingCards.length === 0 ? (
                                <div className="w-full py-2 text-center text-amber-200 font-black text-sm flex items-center justify-center gap-2">
                                    <Sparkles size={20} className="text-amber-400 animate-spin" />
                                    <span>Tebrikler! Tüm kavramlar başarıyla ait oldukları kategorilere yerleştirildi!</span>
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
                                            className={`flex-shrink-0 w-36 md:w-44 p-2 rounded-2xl border-3 border-b-[6px] flex flex-col items-center text-center cursor-grab active:cursor-grabbing transition-all select-none ${
                                                isSelected
                                                    ? 'scale-105 -translate-y-2 ring-4 ring-amber-400 shadow-2xl border-amber-400 border-b-amber-600'
                                                    : 'hover:-translate-y-1 hover:shadow-xl border-amber-300 border-b-amber-400'
                                            }`}
                                            style={{
                                                background: 'linear-gradient(180deg, #fffdf8 0%, #fef3c7 50%, #fde68a 100%)',
                                                boxShadow: isSelected
                                                    ? '0 12px 25px rgba(245, 158, 11, 0.5)'
                                                    : '0 6px 14px rgba(0,0,0,0.6)',
                                            }}
                                        >
                                            <div className="text-2xl mb-1 filter drop-shadow">
                                                {card.icon}
                                            </div>
                                            <div className="w-full text-xs md:text-sm font-black text-amber-950 leading-tight line-clamp-2">
                                                {card.text}
                                            </div>
                                            {card.subtitle && (
                                                <div className="w-full text-[10px] text-amber-800/80 truncate font-bold mt-1 px-1.5 py-0.5 rounded-full bg-amber-200/50">
                                                    {card.subtitle}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* SAĞ: 3D Işıltılı Hazine Sandığı & Başarı Rozeti */}
                    <div
                        className="flex-shrink-0 w-24 md:w-28 h-20 md:h-24 rounded-3xl border-3 border-amber-400/90 border-b-[8px] border-b-amber-950 flex flex-col items-center justify-center shadow-2xl relative"
                        style={{
                            background: 'linear-gradient(180deg, #b45309 0%, #78350f 100%)',
                            boxShadow: '0 8px 25px rgba(0,0,0,0.7), inset 0 2px 4px rgba(255,255,255,0.4)',
                        }}
                    >
                        <span className="text-3xl filter drop-shadow-[0_0_12px_#fbbf24]">🎁</span>
                        {/* Altın Yıldız */}
                        <div className="absolute -top-2 -right-1 text-xl filter drop-shadow">⭐</div>

                        {/* 3D Başarı % Kapsülü */}
                        <div
                            className="mt-1 px-2.5 py-0.5 rounded-full border-2 border-purple-300 shadow flex items-center gap-1 text-[11px] font-black text-white"
                            style={{
                                background: 'linear-gradient(180deg, #9333ea 0%, #6b21a8 100%)',
                            }}
                        >
                            <span>Başarı</span>
                            <span className="text-amber-300">%{successPct}</span>
                        </div>
                    </div>
                </div>
            </footer>

            {/* 🏆 5. OYUN SONU / ZAFER MODALI */}
            {overlay.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                    <div
                        className="max-w-md w-full p-8 rounded-3xl border-4 border-amber-400 text-center shadow-2xl relative"
                        style={{
                            background: 'linear-gradient(180deg, #78350f 0%, #451a03 50%, #1c0a00 100%)',
                            boxShadow: '0 25px 60px rgba(0,0,0,0.95), inset 0 3px 6px rgba(255,255,255,0.3)',
                        }}
                    >
                        <div className="w-24 h-24 mx-auto rounded-full bg-amber-400/20 border-3 border-amber-300 flex items-center justify-center text-5xl mb-4 shadow-inner">
                            🏆
                        </div>
                        <h2 className="text-3xl font-black text-amber-200 mb-2 drop-shadow">
                            {overlay.title}
                        </h2>
                        <p className="text-amber-100/90 text-sm md:text-base font-bold mb-6">
                            {overlay.desc}
                        </p>
                        <button
                            onClick={startGame}
                            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-amber-950 font-black text-lg shadow-2xl hover:scale-105 active:scale-95 transition-all border-3 border-amber-200"
                        >
                            {overlay.btnText}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
