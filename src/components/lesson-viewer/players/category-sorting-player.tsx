'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import type { CategorySortStep, CategorySortCategory, CategorySortItem } from '@/lib/types';

// 🕌 Varsayılan 4 Kategori (Namaz Çeşitleri)
const DEFAULT_CATEGORIES: CategorySortCategory[] = [
    {
        id: 'farz',
        name: 'FARZ',
        badge: 'Kesin Emir',
        description: "Farz: Allah'ın kesin olarak emrettiği, terk edilmesi günah olan ibadetlerdir.",
        color: 'farz',
    },
    {
        id: 'vacip',
        name: 'VACİP',
        badge: 'Gerekli',
        description: 'Vacip: Farza yakın, yapılması gerekli olan ibadetlerdir.',
        color: 'vacip',
    },
    {
        id: 'sunnet',
        name: 'SÜNNET',
        badge: 'Örnek İbadet',
        description: 'Sünnet: Peygamberimizin yaptığı ve yapılmasını tavsiye ettiği ibadetlerdir.',
        color: 'sunnet',
    },
    {
        id: 'nafile',
        name: 'NAFİLE',
        badge: 'Gönüllü İbadet',
        description: 'Nafile: Yapılması sevap, yapılmaması günah olmayan ek ibadetlerdir.',
        color: 'nafile',
    },
];

// 🎴 Varsayılan 12 Kart
const DEFAULT_ITEMS: CategorySortItem[] = [
    { id: 'it-1', text: 'Beş Vakit Namaz', hint: 'Günlük farz', categoryId: 'farz' },
    { id: 'it-2', text: 'Cuma Namazı', hint: 'Cuma günü', categoryId: 'farz' },
    { id: 'it-3', text: 'Cenaze Namazı', hint: 'Farz-ı kifâye', categoryId: 'farz' },
    { id: 'it-4', text: 'Bayram Namazı', hint: 'Ramazan & Kurban', categoryId: 'vacip' },
    { id: 'it-5', text: 'Vitir Namazı', hint: 'Yatsıdan sonra 3 rekat', categoryId: 'vacip' },
    { id: 'it-6', text: 'Sabah Sünneti', hint: 'Farzdan önce', categoryId: 'sunnet' },
    { id: 'it-7', text: 'Öğle Sünnetleri', hint: 'Öğle vaktinde', categoryId: 'sunnet' },
    { id: 'it-8', text: 'Akşam Sünneti', hint: 'Farzdan sonra', categoryId: 'sunnet' },
    { id: 'it-9', text: 'Yatsı Sünneti', hint: 'Yatsı vaktinde', categoryId: 'sunnet' },
    { id: 'it-10', text: 'Kuşluk Namazı', hint: 'Duha namazı', categoryId: 'nafile' },
    { id: 'it-11', text: 'Teheccüd Namazı', hint: 'Gece namazı', categoryId: 'nafile' },
    { id: 'it-12', text: 'Evvâbin Namazı', hint: 'Akşamdan sonra', categoryId: 'nafile' },
];

// 🎯 Akıllı İkon Eşleştirici
function getItemIcon(text: string, subtitle?: string): string {
    const combined = `${text} ${subtitle || ''}`.toLowerCase();
    if (combined.includes('cuma') || combined.includes('camii')) return '☪️';
    if (combined.includes('cenaze') || combined.includes('dua') || combined.includes('rahmet')) return '🤲';
    if (combined.includes('bayram') || combined.includes('hilal') || combined.includes('ramazan')) return '🌙';
    if (combined.includes('vitir') || combined.includes('yıldız')) return '⭐';
    if (combined.includes('sabah') || combined.includes('fecr') || combined.includes('şafak')) return '🌅';
    if (combined.includes('öğle') || combined.includes('güneş')) return '☀️';
    if (combined.includes('akşam') || combined.includes('ikindi') || combined.includes('gurub')) return '🌆';
    if (combined.includes('yatsı') || combined.includes('gece') || combined.includes('teheccüd')) return '🌌';
    if (combined.includes('kuşluk') || combined.includes('duha')) return '🌤️';
    if (combined.includes('evvabin') || combined.includes('nafile') || combined.includes('sevap')) return '✨';
    if (combined.includes('farz') || combined.includes('namaz') || combined.includes('ezan')) return '🕌';
    if (combined.includes('oruç') || combined.includes('iftar') || combined.includes('sahur')) return '🥣';
    if (combined.includes('zekat') || combined.includes('sadaka') || combined.includes('infak')) return '💰';
    if (combined.includes('hac') || combined.includes('umre') || combined.includes('kabe')) return '🕋';
    if (combined.includes('kuran') || combined.includes('ayet') || combined.includes('sure') || combined.includes('kitap')) return '📖';
    if (combined.includes('peygamber') || combined.includes('sünnet') || combined.includes('hadis')) return '💚';
    if (combined.includes('melek') || combined.includes('vahiy') || combined.includes('cebrail')) return '🪽';
    if (combined.includes('ahiret') || combined.includes('cennet') || combined.includes('kıyamet')) return '🕊️';
    if (combined.includes('adalet') || combined.includes('terazi') || combined.includes('hak')) return '⚖️';
    return '✨';
}

function getCategoryIcon(name: string, index: number): string {
    const n = name.toLowerCase();
    if (n.includes('farz')) return '🕌';
    if (n.includes('vacip')) return '⭐';
    if (n.includes('sünnet')) return '💚';
    if (n.includes('nafile')) return '💜';
    const defaults = ['🕌', '⭐', '💚', '💜', '🔷', '🔶', '🎯', '✨'];
    return defaults[index % defaults.length];
}

// Kategori Şerit Plaka Stilleri
const RIBBON_STYLES = [
    { bg: 'linear-gradient(180deg, #1976d2 0%, #0d47a1 100%)', border: '#64b5f6', shadow: '#1565c0' },
    { bg: 'linear-gradient(180deg, #e67e22 0%, #d35400 100%)', border: '#f39c12', shadow: '#b9770e' },
    { bg: 'linear-gradient(180deg, #2e7d32 0%, #1b5e20 100%)', border: '#81c784', shadow: '#1e8449' },
    { bg: 'linear-gradient(180deg, #7b1fa2 0%, #4a148c 100%)', border: '#ba68c8', shadow: '#6c3483' },
    { bg: 'linear-gradient(180deg, #c0392b 0%, #922b21 100%)', border: '#e74c3c', shadow: '#78281f' },
    { bg: 'linear-gradient(180deg, #00838f 0%, #006064 100%)', border: '#4dd0e1', shadow: '#00838f' },
];

// Kategori Eşleştirme Kontrolü
function isCategoryMatch(itemCatId: string, cat: CategorySortCategory): boolean {
    const norm = (s: string) => (s || '').trim().toLowerCase().replace(/[\s-_]/g, '');
    const i = norm(itemCatId);
    const cId = norm(cat.id);
    const cName = norm(cat.name);
    return i === cId || i === cName || cName.includes(i) || i.includes(cName);
}

// 🎴 Alt Tepsideki Kart Konumları
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

    // Kaide Koordinatları (Kategori sayısına göre dinamik)
    const binXCoords = useMemo(() => {
        const count = categories.length;
        if (count === 4) return [310, 620, 928, 1236];
        if (count === 3) return [420, 774, 1128];
        if (count === 2) return [465, 928];
        const startX = 200;
        const totalW = 1270;
        const stepW = totalW / count;
        return Array.from({ length: count }, (_, i) => Math.round(startX + i * stepW));
    }, [categories.length]);

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
        categories: [] as CategorySortCategory[],
        binXCoords: [] as number[],
    });

    useEffect(() => {
        stateRef.current.isPaused = isPaused;
        stateRef.current.isMuted = isMuted;
        stateRef.current.scale = scale;
        stateRef.current.cards = cards;
        stateRef.current.okCount = okCount;
        stateRef.current.score = score;
        stateRef.current.selectedCardId = selectedCardId;
        stateRef.current.categories = categories;
        stateRef.current.binXCoords = binXCoords;
    }, [isPaused, isMuted, scale, cards, okCount, score, selectedCardId, categories, binXCoords]);

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
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (tipTimerRef.current) clearTimeout(tipTimerRef.current);
        };
    }, [startGame]);

    // Zafer Kontrolü
    const checkWin = useCallback((currentOk: number, currentScore: number) => {
        if (currentOk === rawItems.length) {
            setTimeout(() => {
                [523, 659, 784, 1046].forEach((f, i) => {
                    setTimeout(() => beep(f, 0.2), i * 150);
                });
                setOverlay({
                    show: true,
                    title: 'Tebrikler! 🎉',
                    desc: `Puan: ${currentScore} — Başarı: %100`,
                    btnText: 'Tekrar Oyna',
                    isWin: true,
                });
            }, 400);
        }
    }, [rawItems.length, beep]);

    // Kartı Kategoriye Bırak
    const placeCardIntoCategory = useCallback((cardId: string, targetCat: CategorySortCategory) => {
        const card = stateRef.current.cards.find(c => c.id === cardId);
        if (!card || card.placed || stateRef.current.isPaused) return;

        if (isCategoryMatch(card.targetCatId, targetCat)) {
            // Doğru yerleşim!
            const newOk = stateRef.current.okCount + 1;
            const newScore = stateRef.current.score + 10;
            beep(660, 0.15);
            triggerFlash(targetCat.id, 'ok');
            setScore(newScore);
            setOkCount(newOk);
            setSelectedCardId(null);
            setCards(prev => prev.map(c => c.id === cardId ? { ...c, placed: true, placedInCatId: targetCat.id } : c));
            checkWin(newOk, newScore);
        } else {
            // Yanlış deneme!
            const newScore = Math.max(0, stateRef.current.score - 5);
            beep(180, 0.25, 'sawtooth');
            triggerFlash(targetCat.id, 'bad');
            setScore(newScore);
        }
    }, [beep, triggerFlash, checkWin]);

    // Koordinattan Hedef Kategoriyi Bul
    const getCategoryAt = useCallback((clientX: number, clientY: number): CategorySortCategory | null => {
        if (!stageRef.current) return null;
        const r = stageRef.current.getBoundingClientRect();
        const s = stateRef.current.scale;
        const sx = (clientX - r.left) / s;
        const sy = (clientY - r.top) / s;

        if (sy < 220 || sy > 672) return null;
        const cats = stateRef.current.categories;
        const binXs = stateRef.current.binXCoords;

        for (let i = 0; i < cats.length; i++) {
            const bx = binXs[i];
            if (sx >= bx && sx <= bx + 296) {
                return cats[i];
            }
        }
        return null;
    }, []);

    // Pointer Drag Sürükleme Mantığı
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

    const handleCardPointerDown = (e: React.PointerEvent<HTMLDivElement>, card: GameCard) => {
        if (stateRef.current.isPaused || card.placed) return;
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        const cardEl = e.currentTarget;
        const r = cardEl.getBoundingClientRect();

        const ghost = cardEl.cloneNode(true) as HTMLDivElement;
        ghost.className = 'game-card cat-ghost-clone';
        ghost.style.position = 'fixed';
        ghost.style.zIndex = '9999';
        ghost.style.pointerEvents = 'none';
        ghost.style.left = `${r.left}px`;
        ghost.style.top = `${r.top}px`;
        ghost.style.width = `${r.width}px`;
        ghost.style.height = `${r.height}px`;
        ghost.style.margin = '0';
        ghost.style.transform = 'none';
        ghost.style.boxShadow = '0 18px 36px rgba(0,0,0,0.7)';
        ghost.style.transition = 'none';
        document.body.appendChild(ghost);

        dragRef.current = {
            active: true,
            cardId: card.id,
            ghostEl: ghost,
            dx: e.clientX - r.left,
            dy: e.clientY - r.top,
            startX: e.clientX,
            startY: e.clientY,
        };

        beep(440, 0.06);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!dragRef.current.active || !dragRef.current.ghostEl) return;
        const { ghostEl, dx, dy } = dragRef.current;
        ghostEl.style.left = `${e.clientX - dx}px`;
        ghostEl.style.top = `${e.clientY - dy}px`;

        const targetCat = getCategoryAt(e.clientX, e.clientY);
        setFlashes(prev => {
            const next: Record<string, 'ok' | 'bad' | 'hot' | null> = { ...prev };
            categories.forEach(cat => {
                if (targetCat && cat.id === targetCat.id) {
                    next[cat.id] = 'hot';
                } else if (next[cat.id] === 'hot') {
                    next[cat.id] = null;
                }
            });
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
        const text = cat.description || `${cat.name}: Bu kategoriye ait ibadet ve kavramları yerleştirin.`;
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

                /* 🌟 Dinamik Kategori Şerit Plakası (Arka plandaki yazıyı tamamen örter ve dinamik başlığı gösterir) */
                .cat-ribbon-plaque {
                    position: absolute;
                    top: 318px;
                    width: 226px;
                    height: 52px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0 10px;
                    box-sizing: border-box;
                    z-index: 10;
                    cursor: pointer;
                    transition: transform 0.15s;
                }

                .cat-ribbon-plaque:hover {
                    transform: scale(1.03);
                }

                .cat-ribbon-title {
                    color: #fff;
                    font-weight: 800;
                    text-align: center;
                    letter-spacing: 0.5px;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.8);
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .cat-info-circle {
                    position: absolute;
                    top: 325px;
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: transparent;
                    border: 0;
                    cursor: pointer;
                    z-index: 15;
                    transition: transform 0.15s;
                }

                .cat-info-circle:hover {
                    transform: scale(1.15);
                }

                /* 🎴 Dinamik Parşömen Kartlar (Şablondaki kartlarla 1:1 ebat ve tasarım) */
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

                {/* 8. Dinamik Kategoriler (Otomatik Değişen İsimler, İkonlar, Şeritler ve Kaideler) */}
                {categories.map((cat, idx) => {
                    const binX = binXCoords[idx] || 310;
                    const ribbon = RIBBON_STYLES[idx % RIBBON_STYLES.length];
                    const catTitle = cat.name.toUpperCase();
                    const fontSize = catTitle.length > 18 ? 14 : catTitle.length > 12 ? 16 : 20;

                    return (
                        <React.Fragment key={cat.id}>
                            {/* Parlama Efekti */}
                            <div
                                className={`flash-overlay ${flashes[cat.id] || ''}`}
                                style={{ left: binX }}
                            />

                            {/* 🌟 Kategori İsim Plakası: Arka plandaki şeridi örter, kategori ismini dinamik gösterir */}
                            <div
                                className="cat-ribbon-plaque"
                                style={{
                                    left: binX + 16,
                                    background: ribbon.bg,
                                    border: `2.5px solid ${ribbon.border}`,
                                    boxShadow: `0 4px 10px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.35)`,
                                }}
                                onClick={() => handleCategoryClick(cat)}
                                title={`${cat.name}: Bu kaideye yerleştirmek için tıklayın`}
                            >
                                <div className="cat-ribbon-title" style={{ fontSize }}>
                                    <span>{getCategoryIcon(cat.name, idx)}</span>
                                    <span>{catTitle}</span>
                                </div>
                            </div>

                            {/* Kategori Bilgi Butonu (i) */}
                            <button
                                type="button"
                                className="cat-info-circle"
                                style={{ left: binX + 242 }}
                                onClick={e => {
                                    e.stopPropagation();
                                    handleInfoClick(cat, binX);
                                }}
                                title={`${cat.name} hakkında açıklama`}
                                aria-label="Bilgi"
                            />

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

                {/* 9. Bilgi Baloncuğu (#tip) */}
                {tip.show && (
                    <div
                        className="tip-box"
                        style={{ left: tip.left }}
                    >
                        {tip.text}
                    </div>
                )}

                {/* 10. Alt Tepsi: Dinamik Parşömen Kartlar (Yazıları ve İkonları Otomatik Uyumlu) */}
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

                {/* 11. Oyun Sonu / Duraklatma Katmanı (#ov) */}
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
