'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import type { CategorySortStep, CategorySortCategory, CategorySortItem } from '@/lib/types';

// 🕌 Varsayılan 4 Kategori (Namaz Çeşitleri)
const DEFAULT_CATEGORIES: CategorySortCategory[] = [
    {
        id: 'farz',
        name: 'Farz Namazlar',
        badge: 'Kesin Hüküm',
        description: "Farz: Allah'ın kesin olarak emrettiği, terk edilmesi günah olan ibadetlerdir.",
        color: 'farz',
    },
    {
        id: 'vacip',
        name: 'Vacip Namazlar',
        badge: 'Gerekli İbadet',
        description: 'Vacip: Farza yakın, yapılması gerekli olan ibadetlerdir.',
        color: 'vacip',
    },
    {
        id: 'sunnet',
        name: 'Sünnet Namazlar',
        badge: 'Örnek İbadet',
        description: 'Sünnet: Peygamberimizin yaptığı ve yapılmasını tavsiye ettiği ibadetlerdir.',
        color: 'sunnet',
    },
    {
        id: 'nafile',
        name: 'Nafile Namazlar',
        badge: 'Gönüllü İbadet',
        description: 'Nafile: Yapılması sevap, yapılmaması günah olmayan ek ibadetlerdir.',
        color: 'nafile',
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

// 🎴 Alt Tepsideki Kart Konumları (1672px sahne genişliğinde)
function getCardPositions(count: number): number[] {
    const cardW = 124;
    if (count <= 1) return [836];
    if (count === 9) {
        return [275, 408, 544, 684, 821, 960, 1097, 1234, 1374];
    }
    const startX = 230;
    const endX = 1470;
    const step = (endX - startX - cardW) / (count - 1);
    return Array.from({ length: count }, (_, i) => Math.round(startX + cardW / 2 + i * step));
}

// 4 Standart Kaide Bilgisi
interface BoothSlot {
    idx: number;
    binX: number;
    colorKey: 'blue' | 'orange' | 'green' | 'purple';
    name: string;
}

const ALL_BOOTHS: BoothSlot[] = [
    { idx: 0, binX: 310, colorKey: 'blue', name: 'Mavi Kaide' },
    { idx: 1, binX: 620, colorKey: 'orange', name: 'Turuncu Kaide' },
    { idx: 2, binX: 928, colorKey: 'green', name: 'Yeşil Kaide' },
    { idx: 3, binX: 1236, colorKey: 'purple', name: 'Mor Kaide' },
];

interface ActiveBoothMapping {
    cat: CategorySortCategory;
    booth: BoothSlot;
}

interface GameCard {
    id: string;
    text: string;
    subtitle: string;
    icon: string;
    targetCatId: string;
    cx: number;
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
    const stageRef = useRef<HTMLDivElement>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const tipTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Fullscreen ve Ölçekleme
    const [isFullscreen, setIsFullscreen] = useState(Boolean(propIsFullscreen));
    const [scale, setScale] = useState(1);

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

    // Dinamik Başlık ve Açıklama Metinleri (Kategori oyununa göre özelleştirilmiş)
    const titleText = step.title || 'Kavramları Sınıflandıralım';
    const descriptionText = step.description || 'Verilen kavramları doğru kategorilere sürükleyerek yerleştirin.';

    // 🌟 Kategori Kadar Bölüm Olsun: Kategori sayısına göre aktif ve kapalı kaidelerin belirlenmesi
    const { activeBooths, closedBooths } = useMemo(() => {
        const count = categories.length;
        const active: ActiveBoothMapping[] = [];
        const closed: BoothSlot[] = [];

        if (count >= 4) {
            // 4 Kategori -> 4 Bölüm (Hepsi aktif)
            categories.slice(0, 4).forEach((cat, i) => {
                active.push({ cat, booth: ALL_BOOTHS[i] });
            });
        } else if (count === 3) {
            // 3 Kategori -> 3 Bölüm (Mavi, Turuncu, Yeşil aktif; Mor kapalı)
            categories.slice(0, 3).forEach((cat, i) => {
                active.push({ cat, booth: ALL_BOOTHS[i] });
            });
            closed.push(ALL_BOOTHS[3]);
        } else if (count === 2) {
            // 2 Kategori -> 2 Bölüm (Ortadaki Turuncu ve Yeşil aktif; Mavi ve Mor kapalı)
            active.push({ cat: categories[0], booth: ALL_BOOTHS[1] });
            active.push({ cat: categories[1], booth: ALL_BOOTHS[2] });
            closed.push(ALL_BOOTHS[0]);
            closed.push(ALL_BOOTHS[3]);
        } else {
            // 1 Kategori -> Ortadaki Turuncu aktif
            active.push({ cat: categories[0], booth: ALL_BOOTHS[1] });
            closed.push(ALL_BOOTHS[0], ALL_BOOTHS[2], ALL_BOOTHS[3]);
        }

        return { activeBooths: active, closedBooths: closed };
    }, [categories]);

    // Oyun Durumları
    const [score, setScore] = useState(250);
    const [okCount, setOkCount] = useState(0);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [cards, setCards] = useState<GameCard[]>([]);
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

    // Overlay ve Bilgi Baloncuğu
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

    const [tip, setTip] = useState<{ show: boolean; text: string; left: number }>({
        show: false,
        text: '',
        left: 310,
    });

    const [flashes, setFlashes] = useState<Record<string, 'ok' | 'bad' | 'hot' | null>>({});

    // Sürükleme ve senkron erişim için ref
    const stateRef = useRef({
        isPaused: false,
        isMuted: false,
        scale: 1,
        cards: [] as GameCard[],
        okCount: 0,
        score: 250,
        selectedCardId: null as string | null,
        activeBooths: [] as ActiveBoothMapping[],
    });

    useEffect(() => {
        stateRef.current.isPaused = isPaused;
        stateRef.current.isMuted = isMuted;
        stateRef.current.scale = scale;
        stateRef.current.cards = cards;
        stateRef.current.okCount = okCount;
        stateRef.current.score = score;
        stateRef.current.selectedCardId = selectedCardId;
        stateRef.current.activeBooths = activeBooths;
    }, [isPaused, isMuted, scale, cards, okCount, score, selectedCardId, activeBooths]);

    // Ses Sentezleyici
    const beep = useCallback((f: number, d = 0.15, type: OscillatorType = 'sine') => {
        if (stateRef.current.isMuted) return;
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
            // Audio context not allowed
        }
    }, []);

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

    // 1672x941 Sahne Duyarlı Ölçeklemesi
    const updateScale = useCallback(() => {
        if (!containerRef.current) return;
        const w = containerRef.current.clientWidth || window.innerWidth;
        const h = containerRef.current.clientHeight || window.innerHeight;
        const s = Math.min(w / 1672, h / 941);
        setScale(s > 0 ? s : 1);
    }, []);

    useEffect(() => {
        updateScale();
        window.addEventListener('resize', updateScale);
        let ro: ResizeObserver | null = null;
        if (containerRef.current && typeof ResizeObserver !== 'undefined') {
            ro = new ResizeObserver(() => updateScale());
            ro.observe(containerRef.current);
        }
        return () => {
            window.removeEventListener('resize', updateScale);
            if (ro) ro.disconnect();
        };
    }, [updateScale, isFullscreen]);

    // Parlama Efekti
    const triggerFlash = useCallback((catId: string, type: 'ok' | 'bad') => {
        setFlashes(prev => ({ ...prev, [catId]: type }));
        setTimeout(() => {
            setFlashes(prev => ({ ...prev, [catId]: null }));
        }, 500);
    }, []);

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
        setTip(prev => ({ ...prev, show: false }));
        setOverlay({
            show: false,
            title: '',
            desc: '',
            btnText: 'Tekrar Oyna',
            isWin: false,
        });

        const positions = getCardPositions(rawItems.length);
        const initialCards: GameCard[] = rawItems.map((item, idx) => ({
            id: item.id || `card-${idx}`,
            text: item.text,
            subtitle: item.hint || '',
            icon: getItemIcon(item.text, item.hint),
            targetCatId: item.categoryId,
            cx: positions[idx] || 836,
            placed: false,
        }));

        setCards(initialCards);
    }, [rawItems]);

    useEffect(() => {
        startGame();
    }, [startGame]);

    // Zafer Kontrolü
    const checkWin = useCallback((nextOkCount: number) => {
        if (nextOkCount >= rawItems.length && rawItems.length > 0) {
            if (timerRef.current) clearInterval(timerRef.current);
            // Zafer melodisi
            [523, 659, 784, 1046].forEach((f, i) => {
                setTimeout(() => beep(f, 0.2), i * 150);
            });
            setTimeout(() => {
                setOverlay({
                    show: true,
                    title: 'Tebrikler! 🎉',
                    desc: `Tüm kavramları başarıyla sınıflandırdınız! Puan: ${stateRef.current.score}`,
                    btnText: 'Tekrar Oyna',
                    isWin: true,
                });
            }, 600);
        }
    }, [rawItems.length, beep]);

    // Karta Dokunarak veya Sürükleyerek Kategoriye Yerleştirme
    const placeCardIntoCategory = useCallback((cardId: string, targetCat: CategorySortCategory) => {
        const card = stateRef.current.cards.find(c => c.id === cardId);
        if (!card || card.placed) return;

        const isMatch = isCategoryMatch(card.targetCatId, targetCat);

        if (isMatch) {
            beep(700, 0.15, 'triangle');
            triggerFlash(targetCat.id, 'ok');

            const nextOk = stateRef.current.okCount + 1;
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
    }, [beep, triggerFlash, checkWin]);

    // Sürükleme Mantığı (Pointer Events)
    const dragRef = useRef<{
        active: boolean;
        cardId: string;
        ghostEl: HTMLDivElement | null;
        dx: number;
        dy: number;
        startX: number;
        startY: number;
    }>({
        active: false,
        cardId: '',
        ghostEl: null,
        dx: 0,
        dy: 0,
        startX: 0,
        startY: 0,
    });

    const getCategoryAt = useCallback((clientX: number, clientY: number): CategorySortCategory | null => {
        if (!stageRef.current) return null;
        const rect = stageRef.current.getBoundingClientRect();
        const stageX = (clientX - rect.left) / stateRef.current.scale;
        const stageY = (clientY - rect.top) / stateRef.current.scale;

        // Kaide Yükseklik Alanı: y: 240..710
        if (stageY < 240 || stageY > 710) return null;

        // Yalnızca aktif kaideler taranır (Kapalı bölümlere kart bırakılamaz)
        for (const item of stateRef.current.activeBooths) {
            const bx = item.booth.binX;
            if (stageX >= bx && stageX <= bx + 296) {
                return item.cat;
            }
        }
        return null;
    }, []);

    const handleCardPointerDown = (e: React.PointerEvent, card: GameCard) => {
        if (card.placed || isPaused || overlay.show) return;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        const cardEl = e.currentTarget as HTMLElement;
        const rect = cardEl.getBoundingClientRect();

        const ghost = cardEl.cloneNode(true) as HTMLDivElement;
        ghost.style.position = 'fixed';
        ghost.style.left = `${rect.left}px`;
        ghost.style.top = `${rect.top}px`;
        ghost.style.width = `${rect.width}px`;
        ghost.style.height = `${rect.height}px`;
        ghost.style.pointerEvents = 'none';
        ghost.style.zIndex = '9999';
        ghost.style.transform = 'scale(1.08) rotate(-2deg)';
        ghost.style.boxShadow = '0 12px 28px rgba(0,0,0,0.6)';
        ghost.style.opacity = '0.95';
        document.body.appendChild(ghost);

        dragRef.current = {
            active: true,
            cardId: card.id,
            ghostEl: ghost,
            dx: e.clientX - rect.left,
            dy: e.clientY - rect.top,
            startX: e.clientX,
            startY: e.clientY,
        };
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!dragRef.current.active || !dragRef.current.ghostEl) return;
        const { ghostEl, dx, dy } = dragRef.current;
        ghostEl.style.left = `${e.clientX - dx}px`;
        ghostEl.style.top = `${e.clientY - dy}px`;

        const targetCat = getCategoryAt(e.clientX, e.clientY);
        setFlashes(prev => {
            const next = { ...prev };
            for (const k in next) {
                if (next[k] === 'hot') next[k] = null;
            }
            if (targetCat) next[targetCat.id] = 'hot';
            return next;
        });
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!dragRef.current.active) return;
        const { cardId, ghostEl, startX, startY } = dragRef.current;
        if (ghostEl) {
            ghostEl.remove();
        }
        dragRef.current = {
            active: false,
            cardId: '',
            ghostEl: null,
            dx: 0,
            dy: 0,
            startX: 0,
            startY: 0,
        };

        setFlashes(prev => {
            const next = { ...prev };
            for (const k in next) {
                if (next[k] === 'hot') next[k] = null;
            }
            return next;
        });

        // Küçük tıklama kontrolü (Akıllı tahtada karta dokunma seçimi)
        const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
        if (dist < 8) {
            setSelectedCardId(prev => prev === cardId ? null : cardId);
            return;
        }

        const targetCat = getCategoryAt(e.clientX, e.clientY);
        if (targetCat) {
            placeCardIntoCategory(cardId, targetCat);
        }
    };

    // Kategori Kaidesine Dokunma
    const handleCategoryClick = (cat: CategorySortCategory) => {
        if (selectedCardId !== null) {
            placeCardIntoCategory(selectedCardId, cat);
        }
    };

    // Kategori Bilgi Baloncuğu
    const handleInfoClick = (cat: CategorySortCategory, binX: number) => {
        if (tipTimerRef.current) clearTimeout(tipTimerRef.current);
        const left = Math.min(binX, 1672 - 360);
        const text = cat.description || `${cat.name}: Bu kategoriye ait kavramları yerleştirin.`;
        setTip({
            show: true,
            text,
            left,
        });
        tipTimerRef.current = setTimeout(() => {
            setTip(prev => ({ ...prev, show: false }));
        }, 4500);
    };

    // Duraklat / Devam Et
    const handlePauseToggle = () => {
        if (overlay.show && isPaused) {
            setIsPaused(false);
            setOverlay(prev => ({ ...prev, show: false }));
        } else {
            setIsPaused(true);
            setOverlay({
                show: true,
                title: 'Duraklatıldı',
                desc: 'Oyuna devam etmek için tıklayın.',
                btnText: 'Devam Et',
                isWin: false,
            });
        }
    };

    // Zaman Formatlama (mm:ss)
    const fmtTime = (seconds: number) => {
        const m = String(Math.floor(seconds / 60)).padStart(2, '0');
        const s = String(seconds % 60).padStart(2, '0');
        return `${m}:${s}`;
    };

    const successPct = rawItems.length > 0 ? Math.round((okCount / rawItems.length) * 100) : 100;

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full min-h-[580px] flex items-center justify-center overflow-hidden bg-[#0b0f2e] select-none"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
        >
            <style jsx>{`
                @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&display=swap');

                .cat-stage {
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    width: 1672px;
                    height: 941px;
                    transform-origin: center center;
                    background: url('/images/category-game/stage-bg.jpg') 0 0 / 100% 100% no-repeat;
                    font-family: 'Baloo 2', 'Trebuchet MS', Arial, sans-serif;
                    overflow: hidden;
                }

                .num-label {
                    position: absolute;
                    color: #fff;
                    font-weight: 800;
                    text-align: center;
                    line-height: 1;
                    text-shadow: 0 2px 0 #0a1a5a;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .hit-btn {
                    position: absolute;
                    cursor: pointer;
                    border-radius: 50%;
                    background: transparent;
                    border: 0;
                    transition: transform 0.15s;
                }

                .hit-btn:hover {
                    transform: scale(1.08);
                }

                .hit-btn:active {
                    transform: scale(0.95);
                }

                .fs-toggle-btn {
                    position: absolute;
                    left: 1345px;
                    top: 27px;
                    width: 82px;
                    height: 82px;
                    border-radius: 50%;
                    background: radial-gradient(circle, #5a3318 0%, #2f1707 100%);
                    border: 4px solid #d49b42;
                    color: #ffe066;
                    box-shadow: 0 4px 14px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.2);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    z-index: 20;
                    transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
                }

                .fs-toggle-btn:hover {
                    transform: scale(1.1);
                    border-color: #ffd700;
                    box-shadow: 0 0 18px #ffd70088;
                }

                .fs-toggle-btn:active {
                    transform: scale(0.95);
                }

                /* 🏷️ 1. Üst Ahşap Tabela Dinamik Başlığı */
                .stage-title {
                    position: absolute;
                    left: 540px;
                    top: 36px;
                    width: 592px;
                    height: 110px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    color: #ffeb99;
                    font-family: 'Baloo 2', 'Trebuchet MS', Arial, sans-serif;
                    font-weight: 800;
                    line-height: 1.1;
                    text-shadow: 0 4px 0 #5c2406, 0 8px 16px rgba(0, 0, 0, 0.85);
                    padding: 0 16px;
                    box-sizing: border-box;
                    pointer-events: none;
                    z-index: 10;
                }

                /* 📜 2. Parşömen Kurdele Dinamik Açıklaması */
                .stage-subtitle {
                    position: absolute;
                    left: 486px;
                    top: 154px;
                    width: 700px;
                    height: 44px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    color: #4a2206;
                    font-family: 'Baloo 2', 'Trebuchet MS', Arial, sans-serif;
                    font-weight: 800;
                    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.7);
                    padding: 0 20px;
                    box-sizing: border-box;
                    pointer-events: none;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    z-index: 10;
                }

                /* 💬 3. Çocuk Karakterin Konuşma Baloncuğu */
                .boy-speech {
                    position: absolute;
                    left: 116px;
                    top: 152px;
                    width: 228px;
                    height: 118px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    padding: 4px 12px;
                    box-sizing: border-box;
                    pointer-events: none;
                    z-index: 10;
                }

                .boy-speech-title {
                    color: #2e1706;
                    font-size: 21px;
                    font-weight: 800;
                    line-height: 1.15;
                    font-family: 'Baloo 2', sans-serif;
                }

                .boy-speech-desc {
                    color: #5a2e0a;
                    font-size: 16px;
                    font-weight: 700;
                    line-height: 1.2;
                    margin-top: 4px;
                    font-family: 'Baloo 2', sans-serif;
                }

                /* 🌟 4. Kategori Tabelası: Kaide kemerini 264px genişlikte kusursuz örter */
                .booth-sign {
                    position: absolute;
                    top: 318px;
                    width: 264px;
                    height: 62px;
                    border-radius: 14px;
                    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.75), inset 0 2px 4px rgba(255, 255, 255, 0.3), inset 0 -2px 4px rgba(0, 0, 0, 0.5);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 2px 10px;
                    box-sizing: border-box;
                    z-index: 15;
                    cursor: pointer;
                    transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
                }

                .booth-sign.color-blue {
                    background: linear-gradient(180deg, #1952a8 0%, #0d2c60 100%);
                    border: 3px solid #4da1ff;
                }

                .booth-sign.color-orange {
                    background: linear-gradient(180deg, #b05c08 0%, #683002 100%);
                    border: 3px solid #ffb443;
                }

                .booth-sign.color-green {
                    background: linear-gradient(180deg, #1d6e1b 0%, #0b380a 100%);
                    border: 3px solid #55de52;
                }

                .booth-sign.color-purple {
                    background: linear-gradient(180deg, #6c2394 0%, #3a0d54 100%);
                    border: 3px solid #c765fa;
                }

                .booth-sign:hover {
                    transform: translateY(-2px) scale(1.02);
                    box-shadow: 0 10px 22px rgba(0, 0, 0, 0.8), 0 0 14px rgba(255, 215, 0, 0.4);
                }

                .booth-sign-content {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    width: 100%;
                }

                .booth-sign-icon {
                    font-size: 24px;
                    line-height: 1;
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
                    flex-shrink: 0;
                }

                .booth-sign-title {
                    font-family: 'Baloo 2', 'Trebuchet MS', Arial, sans-serif;
                    color: #ffeb99;
                    font-weight: 800;
                    text-align: center;
                    line-height: 1.1;
                    text-shadow: 0 2px 4px #000, 0 0 8px rgba(0,0,0,0.8);
                    letter-spacing: 0.5px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .booth-sign-badge {
                    margin-top: 2px;
                    background: rgba(255, 235, 153, 0.2);
                    border: 1px solid rgba(255, 235, 153, 0.4);
                    color: #ffe066;
                    font-size: 10px;
                    font-weight: 800;
                    padding: 1px 8px;
                    border-radius: 8px;
                    letter-spacing: 0.3px;
                    text-shadow: 0 1px 2px #000;
                }

                .booth-sign-info {
                    position: absolute;
                    right: -10px;
                    top: -10px;
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    background: radial-gradient(circle, #e6a835 0%, #a66a1a 100%);
                    border: 2px solid #fff;
                    color: #fff;
                    font-weight: 900;
                    font-size: 15px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.6);
                    transition: transform 0.15s;
                    z-index: 20;
                }

                .booth-sign-info:hover {
                    transform: scale(1.2);
                }

                /* 🔒 5. Kategori Kadar Bölüm: Kullanılmayan Kaideleri Estetik Şekilde Kapatan Panel */
                .closed-booth {
                    position: absolute;
                    top: 236px;
                    width: 296px;
                    height: 472px;
                    border-radius: 46px 46px 14px 14px;
                    background: radial-gradient(circle at 50% 50%, rgba(212, 155, 66, 0.12) 2px, transparent 3px),
                                linear-gradient(45deg, rgba(212, 155, 66, 0.08) 25%, transparent 25%, transparent 75%, rgba(212, 155, 66, 0.08) 75%),
                                linear-gradient(-45deg, rgba(212, 155, 66, 0.08) 25%, transparent 25%, transparent 75%, rgba(212, 155, 66, 0.08) 75%),
                                linear-gradient(180deg, rgba(8, 14, 40, 0.94) 0%, rgba(5, 8, 24, 0.97) 100%);
                    background-size: 24px 24px, 24px 24px, 24px 24px, 100% 100%;
                    border: 3px solid rgba(212, 155, 66, 0.4);
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.85), inset 0 0 35px rgba(0, 0, 0, 0.9);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    z-index: 12;
                    pointer-events: none;
                }

                .closed-booth-seal {
                    width: 72px;
                    height: 72px;
                    border-radius: 50%;
                    border: 2px solid rgba(212, 155, 66, 0.5);
                    background: radial-gradient(circle, rgba(212, 155, 66, 0.25) 0%, rgba(10, 16, 45, 0.8) 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 32px;
                    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.6);
                }

                .closed-booth-text {
                    margin-top: 10px;
                    color: rgba(255, 235, 153, 0.6);
                    font-size: 14px;
                    font-weight: 800;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                }

                /* 🎴 6. Dinamik Parşömen Kartlar */
                .game-card {
                    position: absolute;
                    top: 722px;
                    width: 124px;
                    height: 154px;
                    border-radius: 24px 24px 14px 14px;
                    background: linear-gradient(180deg, #fffdf8 0%, #fdf2d2 50%, #f6dfa2 100%);
                    border: 3.5px solid #c9933e;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.8), inset 0 -2px 4px rgba(180,120,40,0.25);
                    cursor: grab;
                    touch-action: none;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 6px;
                    box-sizing: border-box;
                    transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
                    user-select: none;
                }

                .game-card:hover {
                    transform: translateY(-8px) scale(1.03);
                    box-shadow: 0 10px 22px rgba(0,0,0,0.5);
                    border-color: #ffd700;
                    z-index: 30;
                }

                .game-card.selected {
                    transform: translateY(-12px) scale(1.05);
                    box-shadow: 0 0 24px 5px #ffd700, 0 12px 24px rgba(0,0,0,0.6);
                    border-color: #ffd700;
                    outline: 3px solid #ffd700;
                    z-index: 35;
                }

                .game-card.dragging {
                    opacity: 0.25;
                }

                .card-icon {
                    font-size: 28px;
                    line-height: 1;
                    margin-top: 3px;
                    filter: drop-shadow(0 2px 3px rgba(0,0,0,0.15));
                }

                .card-title {
                    font-family: 'Baloo 2', 'Trebuchet MS', sans-serif;
                    font-weight: 800;
                    color: #3b2010;
                    text-align: center;
                    line-height: 1.15;
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2px 4px;
                    word-break: break-word;
                }

                .card-badge {
                    font-size: 10px;
                    font-weight: 700;
                    color: #7a461b;
                    background: rgba(140, 75, 20, 0.12);
                    border: 1px solid rgba(140, 75, 20, 0.22);
                    border-radius: 8px;
                    padding: 2px 6px;
                    max-width: 95%;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                /* 📦 Kaideye Yerleşmiş Kartlar */
                .placed-card {
                    width: 74px;
                    height: 92px;
                    border-radius: 14px;
                    background: linear-gradient(180deg, #fffdf8 0%, #f6dfa2 100%);
                    border: 2px solid #c9933e;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 4px 2px;
                    text-align: center;
                    animation: pop 0.4s ease-out;
                    box-sizing: border-box;
                }

                .placed-card-icon {
                    font-size: 22px;
                    line-height: 1;
                }

                .placed-card-text {
                    font-size: 10px;
                    font-weight: 800;
                    color: #3b2010;
                    line-height: 1.1;
                    margin-top: 3px;
                    max-height: 34px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .zone-box {
                    position: absolute;
                    top: 392px;
                    width: 236px;
                    height: 196px;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    align-content: flex-start;
                    justify-content: center;
                    cursor: pointer;
                    overflow: hidden;
                }

                .flash-overlay {
                    position: absolute;
                    top: 232px;
                    width: 296px;
                    height: 440px;
                    border-radius: 60px;
                    pointer-events: none;
                    opacity: 0;
                    transition: opacity 0.2s;
                }

                .flash-overlay.ok {
                    animation: flashAnim 0.5s forwards;
                    box-shadow: 0 0 50px 10px #7dff7d, inset 0 0 40px #7dff7d;
                }

                .flash-overlay.bad {
                    animation: flashAnim 0.5s forwards;
                    box-shadow: 0 0 50px 10px #ff4d4d, inset 0 0 40px #ff4d4d;
                }

                .flash-overlay.hot {
                    opacity: 1;
                    box-shadow: 0 0 40px 6px #fff, inset 0 0 30px rgba(255,255,255,0.5);
                }

                @keyframes flashAnim {
                    0% { opacity: 1; }
                    100% { opacity: 0; }
                }

                @keyframes pop {
                    0% { transform: scale(0.7); }
                    50% { transform: scale(1.15); }
                    100% { transform: scale(1); }
                }

                .tip-box {
                    position: absolute;
                    top: 170px;
                    width: 350px;
                    background: #fff6dc;
                    color: #3b2a14;
                    border: 4px solid #c9a05e;
                    border-radius: 18px;
                    padding: 14px 20px;
                    font-weight: 700;
                    font-size: 22px;
                    line-height: 1.25;
                    box-shadow: 0 8px 25px rgba(0,0,0,0.7);
                    z-index: 50;
                    animation: pop 0.25s ease-out;
                }

                .game-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.72);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 60;
                    text-align: center;
                    color: #fff;
                    animation: fadeIn 0.3s ease-out;
                }

                .game-overlay-card {
                    background: linear-gradient(180deg, #5a3318, #3b2010);
                    border: 6px solid #c9893c;
                    border-radius: 40px;
                    padding: 40px 70px;
                    box-shadow: 0 15px 40px rgba(0,0,0,0.8);
                }

                .game-overlay h2 {
                    font-size: 64px;
                    color: #ffc933;
                    font-weight: 800;
                    margin: 0;
                    text-shadow: 0 3px 6px rgba(0,0,0,0.5);
                }

                .game-overlay p {
                    font-size: 34px;
                    margin: 14px 0 28px;
                    font-weight: 700;
                    color: #f3f3f3;
                }

                .game-overlay button {
                    font: 800 30px 'Baloo 2', sans-serif;
                    color: #fff;
                    border: 4px solid #c9a0ff;
                    background: linear-gradient(180deg, #8a3ce0, #5a1fa8);
                    border-radius: 40px;
                    padding: 10px 48px;
                    cursor: pointer;
                    box-shadow: 0 8px 20px rgba(0,0,0,0.4);
                    transition: transform 0.15s, box-shadow 0.15s;
                }

                .game-overlay button:hover {
                    transform: scale(1.05);
                    box-shadow: 0 10px 25px rgba(138,60,224,0.6);
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>

            {/* 1672x941 Orijinal Ahşap Sahne Tasarımı */}
            <div
                ref={stageRef}
                className="cat-stage"
                style={{
                    transform: `translate(-50%, -50%) scale(${scale})`,
                }}
            >
                {/* 1. Skor Göstergesi */}
                <div
                    className="num-label"
                    style={{ left: 166, top: 38, width: 90, height: 44, fontSize: 50 }}
                >
                    {score}
                </div>

                {/* 2. Kronometre (Zaman Sınırı Olmadan) */}
                <div
                    className="num-label"
                    style={{ left: 1272, top: 38, width: 130, height: 44, fontSize: 48 }}
                >
                    {fmtTime(elapsedTime)}
                </div>

                {/* 3. Başarı Yüzdesi */}
                <div
                    className="num-label"
                    style={{ left: 1543, top: 860, width: 80, height: 38, fontSize: 40 }}
                >
                    %{successPct}
                </div>

                {/* 4. Tam Ekran Butonu */}
                <button
                    className="fs-toggle-btn"
                    onClick={toggleFullscreen}
                    title={isFullscreen ? 'Tam Ekrandan Çık' : 'Tam Ekran Yap'}
                    aria-label="Tam Ekran"
                >
                    {isFullscreen ? (
                        <Minimize2 size={38} strokeWidth={2.5} />
                    ) : (
                        <Maximize2 size={38} strokeWidth={2.5} />
                    )}
                </button>

                {/* 5. Duraklat Butonu */}
                <button
                    className="hit-btn"
                    style={{ left: 1443, top: 27, width: 82, height: 82 }}
                    onClick={handlePauseToggle}
                    aria-label="Duraklat"
                    title="Duraklat / Devam Et"
                />

                {/* 6. Ses Aç/Kapa Butonu */}
                <button
                    className="hit-btn"
                    style={{ left: 1543, top: 27, width: 82, height: 82 }}
                    onClick={() => setIsMuted(prev => !prev)}
                    aria-label="Ses"
                    title={isMuted ? 'Sesi Aç' : 'Sesi Kapat'}
                />
                {isMuted && (
                    <div
                        style={{
                            position: 'absolute',
                            left: 1543,
                            top: 27,
                            width: 82,
                            height: 82,
                            pointerEvents: 'none',
                            color: '#ff3b3b',
                            fontSize: 96,
                            lineHeight: '78px',
                            textAlign: 'center',
                            fontWeight: 800,
                            zIndex: 10,
                        }}
                    >
                        ╲
                    </div>
                )}

                {/* 7. Yeniden Başla Butonu */}
                <button
                    className="hit-btn"
                    style={{ left: 10, top: 810, width: 160, height: 95, borderRadius: 40 }}
                    onClick={startGame}
                    aria-label="Yeniden Başla"
                    title="Yeniden Başla"
                />

                {/* 🏷️ 8. Üst Ahşap Tabela Dinamik Başlığı */}
                <h1
                    className="stage-title"
                    style={{
                        fontSize: titleText.length > 32 ? 30 : titleText.length > 20 ? 36 : 46,
                    }}
                >
                    {titleText}
                </h1>

                {/* 📜 9. Parşömen Kurdele Dinamik Açıklaması */}
                <div
                    className="stage-subtitle"
                    style={{
                        fontSize: descriptionText.length > 60 ? 15 : descriptionText.length > 40 ? 17 : 20,
                    }}
                >
                    {descriptionText}
                </div>

                {/* 💬 10. Çocuk Karakterin Konuşma Baloncuğu Metni */}
                <div className="boy-speech">
                    <div className="boy-speech-title">Haydi bakalım!</div>
                    <div className="boy-speech-desc">Kavramları doğru kategorilere yerleştir!</div>
                </div>

                {/* 🔒 11. Kategori Kadar Bölüm: Kullanılmayan Kaidelerin Estetik Kapatılması */}
                {closedBooths.map(b => (
                    <div
                        key={`closed-${b.idx}`}
                        className="closed-booth"
                        style={{ left: b.binX }}
                    >
                        <div className="closed-booth-seal">✨</div>
                        <div className="closed-booth-text">Kullanılmıyor</div>
                    </div>
                ))}

                {/* 🌟 12. Aktif Kaideler (Kategori Kadar Bölüm & Dinamik Başlıklar) */}
                {activeBooths.map(({ cat, booth }) => {
                    const binX = booth.binX;
                    const catTitle = cat.name.toUpperCase();
                    const fontSize = catTitle.length > 20 ? 13 : catTitle.length > 13 ? 15 : 18;

                    return (
                        <React.Fragment key={cat.id}>
                            {/* Parlama Efekti */}
                            <div
                                className={`flash-overlay ${flashes[cat.id] || ''}`}
                                style={{ left: binX }}
                            />

                            {/* 🌟 Ahşap/Metalik Kategori Tabelası (Eski metin alanını 264px genişlikte 100% örter) */}
                            <div
                                className={`booth-sign color-${booth.colorKey}`}
                                style={{ left: binX + 16 }}
                                onClick={() => handleCategoryClick(cat)}
                                title={`${cat.name}: Bu kaideye yerleştirmek için tıklayın`}
                            >
                                <div className="booth-sign-content">
                                    <span className="booth-sign-icon">{getCategoryIcon(cat.name, booth.idx)}</span>
                                    <span className="booth-sign-title" style={{ fontSize }}>
                                        {catTitle}
                                    </span>
                                </div>
                                {cat.badge && (
                                    <span className="booth-sign-badge">{cat.badge}</span>
                                )}
                                {/* Bilgi Butonu (i) */}
                                <button
                                    type="button"
                                    className="booth-sign-info"
                                    onClick={e => {
                                        e.stopPropagation();
                                        handleInfoClick(cat, binX);
                                    }}
                                    title={`${cat.name} hakkında açıklama`}
                                    aria-label="Bilgi"
                                >
                                    i
                                </button>
                            </div>

                            {/* Yerleşen Kartların Dizildiği Kaide Alanı */}
                            <div
                                className="zone-box"
                                style={{ left: binX + 30 }}
                                onClick={() => handleCategoryClick(cat)}
                            >
                                {cards
                                    .filter(c => c.placed && c.placedInCatId === cat.id)
                                    .map(c => (
                                        <div key={c.id} className="placed-card">
                                            <span className="placed-card-icon">{c.icon}</span>
                                            <span className="placed-card-text">{c.text}</span>
                                        </div>
                                    ))}
                            </div>
                        </React.Fragment>
                    );
                })}

                {/* 13. Bilgi Baloncuğu (#tip) */}
                {tip.show && (
                    <div
                        className="tip-box"
                        style={{ left: tip.left }}
                    >
                        {tip.text}
                    </div>
                )}

                {/* 14. Alt Tepsi: Dinamik Parşömen Kartlar (Yazıları ve İkonları Otomatik Uyumlu) */}
                {cards
                    .filter(c => !c.placed)
                    .map(c => {
                        const isDragging = dragRef.current.active && dragRef.current.cardId === c.id;
                        const isSelected = selectedCardId === c.id;
                        const fontSize = c.text.length > 22 ? 13 : c.text.length > 15 ? 14 : 16;

                        return (
                            <div
                                key={c.id}
                                className={`game-card ${isDragging ? 'dragging' : ''} ${isSelected ? 'selected' : ''}`}
                                style={{
                                    left: c.cx - 62,
                                }}
                                onPointerDown={e => handleCardPointerDown(e, c)}
                            >
                                <span className="card-icon">{c.icon}</span>
                                <span className="card-title" style={{ fontSize }}>
                                    {c.text}
                                </span>
                                {c.subtitle && (
                                    <span className="card-badge" title={c.subtitle}>
                                        {c.subtitle}
                                    </span>
                                )}
                            </div>
                        );
                    })}

                {/* 15. Oyun Sonu / Duraklatma Katmanı (#ov) */}
                {overlay.show && (
                    <div className="game-overlay">
                        <div className="game-overlay-card">
                            <h2>{overlay.title}</h2>
                            <p>{overlay.desc}</p>
                            <button
                                onClick={() => {
                                    if (overlay.btnText === 'Devam Et') {
                                        setIsPaused(false);
                                        setOverlay(prev => ({ ...prev, show: false }));
                                    } else {
                                        startGame();
                                    }
                                }}
                            >
                                {overlay.btnText}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
