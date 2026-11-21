'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import type { CategorySortStep } from '@/lib/types';

// 🕌 Şablondaki 9 Kart ve Konumları
const CARDS: Array<'farz' | 'vacip' | 'sunnet' | 'nafile'> = [
    'farz', 'farz', 'vacip', 'farz', 'vacip', 'sunnet', 'farz', 'farz', 'nafile'
];

const CX = [275, 408, 544, 684, 821, 960, 1097, 1234, 1374];

const BINX: Record<'farz' | 'vacip' | 'sunnet' | 'nafile', number> = {
    farz: 310,
    vacip: 620,
    sunnet: 928,
    nafile: 1236,
};

const INFO: Record<'farz' | 'vacip' | 'sunnet' | 'nafile', string> = {
    farz: "Farz: Allah'ın kesin olarak emrettiği, terk edilmesi günah olan ibadetlerdir.",
    vacip: 'Vacip: Farza yakın, yapılması gerekli olan ibadetlerdir.',
    sunnet: 'Sünnet: Peygamberimizin yaptığı ve yapılmasını tavsiye ettiği ibadetlerdir.',
    nafile: 'Nafile: Yapılması sevap, yapılmaması günah olmayan ek ibadetlerdir.',
};

const IMG = [
    '/images/category-game/card-0.jpg',
    '/images/category-game/card-1.jpg',
    '/images/category-game/card-2.jpg',
    '/images/category-game/card-3.jpg',
    '/images/category-game/card-4.jpg',
    '/images/category-game/card-5.jpg',
    '/images/category-game/card-6.jpg',
    '/images/category-game/card-7.jpg',
    '/images/category-game/card-8.jpg',
];

interface CardState {
    id: number;
    category: 'farz' | 'vacip' | 'sunnet' | 'nafile';
    img: string;
    cx: number;
    placed: boolean;
    placedIn?: 'farz' | 'vacip' | 'sunnet' | 'nafile';
}

export function CategorySortingPlayer({
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

    // Fullscreen durumu
    const [isFullscreen, setIsFullscreen] = useState(Boolean(propIsFullscreen));
    const [scale, setScale] = useState(1);

    // Oyun durumları
    const [score, setScore] = useState(250);
    const [okCount, setOkCount] = useState(0);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [cards, setCards] = useState<CardState[]>([]);
    const [selectedCardId, setSelectedCardId] = useState<number | null>(null);

    // Overlay ve Bilgi Balonu
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

    const [flashes, setFlashes] = useState<Record<string, 'ok' | 'bad' | 'hot' | null>>({
        farz: null,
        vacip: null,
        sunnet: null,
        nafile: null,
    });

    // Refs for drag and synchronous state access
    const stateRef = useRef({
        isPaused: false,
        isMuted: false,
        scale: 1,
        cards: [] as CardState[],
        okCount: 0,
        score: 250,
        selectedCardId: null as number | null,
    });

    useEffect(() => {
        stateRef.current.isPaused = isPaused;
        stateRef.current.isMuted = isMuted;
        stateRef.current.scale = scale;
        stateRef.current.cards = cards;
        stateRef.current.okCount = okCount;
        stateRef.current.score = score;
        stateRef.current.selectedCardId = selectedCardId;
    }, [isPaused, isMuted, scale, cards, okCount, score, selectedCardId]);

    // Ses Efektleri (Web Audio API Synthesizer)
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
            // Audio context not allowed or failed
        }
    }, []);

    // Fullscreen listener
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
            console.error('Fullscreen toggle error:', err);
        }
    };

    // Responsive 1672x941 fit scaling
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

    // Flash glow efekti
    const triggerFlash = useCallback((cat: 'farz' | 'vacip' | 'sunnet' | 'nafile', type: 'ok' | 'bad') => {
        setFlashes(prev => ({ ...prev, [cat]: type }));
        setTimeout(() => {
            setFlashes(prev => ({ ...prev, [cat]: null }));
        }, 500);
    }, []);

    // Zamanlayıcı (Sonsuz / Sınır Yok - Kronometre)
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

        const initialCards: CardState[] = CARDS.map((cat, i) => ({
            id: i,
            category: cat,
            img: IMG[i],
            cx: CX[i],
            placed: false,
        }));
        setCards(initialCards);
    }, []);

    useEffect(() => {
        startGame();
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (tipTimerRef.current) clearTimeout(tipTimerRef.current);
        };
    }, [startGame]);

    // Zafer Kontrolü
    const checkWin = useCallback((currentOk: number, currentScore: number) => {
        if (currentOk === CARDS.length) {
            setTimeout(() => {
                // Zafer Melodisi
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
    }, [beep]);

    // Kartı Kategoriye Yerleştir (Ortak mantık: Sürükleme veya Tıklama)
    const placeCardIntoCategory = useCallback((cardId: number, targetCategory: 'farz' | 'vacip' | 'sunnet' | 'nafile') => {
        const card = stateRef.current.cards.find(c => c.id === cardId);
        if (!card || card.placed || stateRef.current.isPaused) return;

        if (targetCategory === card.category) {
            // Doğru yerleştirme!
            const newOk = stateRef.current.okCount + 1;
            const newScore = stateRef.current.score + 10;
            beep(660, 0.15);
            triggerFlash(targetCategory, 'ok');
            setScore(newScore);
            setOkCount(newOk);
            setSelectedCardId(null);
            setCards(prev => prev.map(c => c.id === cardId ? { ...c, placed: true, placedIn: targetCategory } : c));
            checkWin(newOk, newScore);
        } else {
            // Yanlış yerleştirme!
            const newScore = Math.max(0, stateRef.current.score - 5);
            beep(180, 0.25, 'sawtooth');
            triggerFlash(targetCategory, 'bad');
            setScore(newScore);
        }
    }, [beep, triggerFlash, checkWin]);

    // Koordinattan Bini Bul
    const getBinAt = useCallback((clientX: number, clientY: number): ('farz' | 'vacip' | 'sunnet' | 'nafile') | null => {
        if (!stageRef.current) return null;
        const r = stageRef.current.getBoundingClientRect();
        const s = stateRef.current.scale;
        const sx = (clientX - r.left) / s;
        const sy = (clientY - r.top) / s;

        if (sy < 232 || sy > 672) return null;
        for (const k of ['farz', 'vacip', 'sunnet', 'nafile'] as const) {
            if (sx > BINX[k] && sx < BINX[k] + 296) {
                return k;
            }
        }
        return null;
    }, []);

    // Pointer Drag Mantığı
    const dragRef = useRef<{
        active: boolean;
        cardId: number;
        ghostEl: HTMLDivElement | null;
        dx: number;
        dy: number;
        startX: number;
        startY: number;
    }>({
        active: false,
        cardId: -1,
        ghostEl: null,
        dx: 0,
        dy: 0,
        startX: 0,
        startY: 0,
    });

    const handleCardPointerDown = (e: React.PointerEvent<HTMLDivElement>, card: CardState) => {
        if (stateRef.current.isPaused || card.placed) return;
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        const cardEl = e.currentTarget;
        const r = cardEl.getBoundingClientRect();
        const ghost = document.createElement('div');
        ghost.className = 'cat-game-ghost';
        ghost.style.position = 'fixed';
        ghost.style.zIndex = '9999';
        ghost.style.pointerEvents = 'none';
        ghost.style.left = `${r.left}px`;
        ghost.style.top = `${r.top}px`;
        ghost.style.width = `${r.width}px`;
        ghost.style.height = `${r.height}px`;
        ghost.style.backgroundImage = `url(${card.img})`;
        ghost.style.backgroundSize = '100% 100%';
        ghost.style.borderRadius = '24px 24px 14px 14px';
        ghost.style.boxShadow = '0 14px 26px rgba(0,0,0,0.7)';
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

        const bin = getBinAt(e.clientX, e.clientY);
        setFlashes(prev => {
            const next: Record<string, 'ok' | 'bad' | 'hot' | null> = { ...prev };
            for (const k of ['farz', 'vacip', 'sunnet', 'nafile'] as const) {
                if (k === bin) {
                    next[k] = 'hot';
                } else if (next[k] === 'hot') {
                    next[k] = null;
                }
            }
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
            cardId: -1,
            ghostEl: null,
            dx: 0,
            dy: 0,
            startX: 0,
            startY: 0,
        };

        // Temizle hover parlamasını
        setFlashes(prev => {
            const next = { ...prev };
            for (const k in next) {
                if (next[k] === 'hot') next[k] = null;
            }
            return next;
        });

        // Sürükleme mesafesi kontrolü (Çok küçük hareket tıklama sayılır)
        const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
        if (dist < 8) {
            // Tıklama seçimi (Akıllı tahta için)
            setSelectedCardId(prev => prev === cardId ? null : cardId);
            return;
        }

        const bin = getBinAt(e.clientX, e.clientY);
        if (bin) {
            placeCardIntoCategory(cardId, bin);
        }
    };

    // Kategoriye Tıklama (Tıklanan kartı yerleştirmek için)
    const handleCategoryClick = (cat: 'farz' | 'vacip' | 'sunnet' | 'nafile') => {
        if (selectedCardId !== null) {
            placeCardIntoCategory(selectedCardId, cat);
        }
    };

    // Bilgi Butonu Tıklama
    const handleInfoClick = (cat: 'farz' | 'vacip' | 'sunnet' | 'nafile') => {
        if (tipTimerRef.current) clearTimeout(tipTimerRef.current);
        const left = Math.min(BINX[cat], 1672 - 360);
        setTip({
            show: true,
            text: INFO[cat],
            left,
        });
        tipTimerRef.current = setTimeout(() => {
            setTip(prev => ({ ...prev, show: false }));
        }, 4000);
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

    // Zaman Formatlama (Kronometre: mm:ss)
    const fmtTime = (seconds: number) => {
        const m = String(Math.floor(seconds / 60)).padStart(2, '0');
        const s = String(seconds % 60).padStart(2, '0');
        return `${m}:${s}`;
    };

    const successPct = Math.round((okCount / CARDS.length) * 100);

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full min-h-[580px] flex items-center justify-center overflow-hidden bg-[#0b0f2e] select-none"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
        >
            {/* Scoped CSS for exact template rendering & animations */}
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

                .game-card {
                    position: absolute;
                    top: 722px;
                    width: 124px;
                    height: 154px;
                    border-radius: 24px 24px 14px 14px;
                    background-size: 100% 100%;
                    cursor: grab;
                    touch-action: none;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.35);
                    transition: transform 0.15s, box-shadow 0.15s;
                }

                .game-card:hover {
                    transform: translateY(-6px);
                    box-shadow: 0 8px 16px rgba(0,0,0,0.4);
                }

                .game-card.selected {
                    transform: translateY(-10px);
                    box-shadow: 0 0 20px 4px #ffd700, 0 12px 24px rgba(0,0,0,0.6);
                    outline: 4px solid #ffd700;
                }

                .game-card.dragging {
                    opacity: 0.25;
                }

                .placed-card {
                    position: static;
                    width: 74px;
                    height: 92px;
                    cursor: default;
                    border-radius: 14px;
                    background-size: 100% 100%;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                    animation: pop 0.4s ease-out;
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

            {/* 1672x941 Birebir Oyun Sahnesi */}
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

                {/* 2. Kronometre (Süre Sınırı Olmadan Geçen Zaman) */}
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

                {/* 4. Tam Ekran Tuşu (Kullanıcının İstediği Özel Düğme) */}
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

                {/* 5. Duraklat Tuşu (Orijinal Şablondaki Konum) */}
                <button
                    className="hit-btn"
                    style={{ left: 1443, top: 27, width: 82, height: 82 }}
                    onClick={handlePauseToggle}
                    aria-label="Duraklat"
                    title="Duraklat / Devam Et"
                />

                {/* 6. Ses Tuşu ve Sessiz Çizgisi */}
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

                {/* 7. Yeniden Başla Tuşu */}
                <button
                    className="hit-btn"
                    style={{ left: 10, top: 810, width: 160, height: 95, borderRadius: 40 }}
                    onClick={startGame}
                    aria-label="Yeniden Başla"
                    title="Yeniden Başla"
                />

                {/* 8. 4 Kategori Bölgesi (Zones) ve Parlama Efektleri (Flashes) */}
                {(['farz', 'vacip', 'sunnet', 'nafile'] as const).map(k => (
                    <React.Fragment key={k}>
                        {/* Parlama Efekti Katmanı */}
                        <div
                            className={`flash-overlay ${flashes[k] || ''}`}
                            style={{ left: BINX[k] }}
                        />

                        {/* Yerleşen Kartların Listelendiği Zone */}
                        <div
                            className="zone-box"
                            style={{ left: BINX[k] + 30 }}
                            onClick={() => handleCategoryClick(k)}
                        >
                            {cards
                                .filter(c => c.placed && c.placedIn === k)
                                .map(c => (
                                    <div
                                        key={c.id}
                                        className="placed-card"
                                        style={{ backgroundImage: `url(${c.img})` }}
                                    />
                                ))}
                        </div>
                    </React.Fragment>
                ))}

                {/* 9. Kategori Bilgi Butonları (.hit.i) */}
                <button
                    className="hit-btn"
                    style={{ left: 550, top: 325, width: 36, height: 36 }}
                    onClick={() => handleInfoClick('farz')}
                    title="Farz Nedir?"
                    aria-label="Farz Bilgi"
                />
                <button
                    className="hit-btn"
                    style={{ left: 860, top: 325, width: 36, height: 36 }}
                    onClick={() => handleInfoClick('vacip')}
                    title="Vacip Nedir?"
                    aria-label="Vacip Bilgi"
                />
                <button
                    className="hit-btn"
                    style={{ left: 1168, top: 325, width: 36, height: 36 }}
                    onClick={() => handleInfoClick('sunnet')}
                    title="Sünnet Nedir?"
                    aria-label="Sünnet Bilgi"
                />
                <button
                    className="hit-btn"
                    style={{ left: 1476, top: 325, width: 36, height: 36 }}
                    onClick={() => handleInfoClick('nafile')}
                    title="Nafile Nedir?"
                    aria-label="Nafile Bilgi"
                />

                {/* 10. Bilgi Kutusu (#tip) */}
                {tip.show && (
                    <div
                        className="tip-box"
                        style={{ left: tip.left }}
                    >
                        {tip.text}
                    </div>
                )}

                {/* 11. Alt Tepsi: Henüz Yerleşmemiş Kartlar (#tray) */}
                {cards
                    .filter(c => !c.placed)
                    .map(c => {
                        const isDragging = dragRef.current.active && dragRef.current.cardId === c.id;
                        const isSelected = selectedCardId === c.id;
                        return (
                            <div
                                key={c.id}
                                className={`game-card ${isDragging ? 'dragging' : ''} ${isSelected ? 'selected' : ''}`}
                                style={{
                                    left: c.cx - 62,
                                    backgroundImage: `url(${c.img})`,
                                }}
                                onPointerDown={e => handleCardPointerDown(e, c)}
                            />
                        );
                    })}

                {/* 12. Oyun Sonu ve Duraklatma Katmanı (#ov) */}
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
