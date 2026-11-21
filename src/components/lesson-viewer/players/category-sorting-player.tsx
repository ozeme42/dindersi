'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Maximize2, Minimize2, RotateCcw, Volume2, VolumeX, Pause, Play } from 'lucide-react';
import type { CategorySortStep, CategorySortCategory, CategorySortItem } from '@/lib/types';

// 🕌 Varsayılan Namaz Çeşitleri Kategorileri
const DEFAULT_CATEGORIES: CategorySortCategory[] = [
    { id: 'farz', name: 'FARZ', badge: 'Kesin Emir', description: 'Kılınması farz olan namazlar', color: 'farz' },
    { id: 'vacip', name: 'VACİP', badge: 'Gerekli', description: 'Yerine getirilmesi vacip olan namazlar', color: 'vacip' },
    { id: 'sunnet', name: 'SÜNNET', badge: 'Örnek İbadet', description: 'Peygamberimizin sünnet namazları', color: 'sunnet' },
    { id: 'nafile', name: 'NAFİLE', badge: 'Gönüllü İbadet', description: 'Sevabı çok olan nafile namazlar', color: 'nafile' }
];

// 🎴 Varsayılan 12 Kart
const DEFAULT_ITEMS: CategorySortItem[] = [
    { id: 'it-1', text: 'Beş Vakit Namaz', hint: 'Günlük farz', categoryId: 'farz' },
    { id: 'it-2', text: 'Cuma Namazı', hint: 'Cuma günü farz', categoryId: 'farz' },
    { id: 'it-3', text: 'Cenaze Namazı', hint: 'Farz-ı kifâye', categoryId: 'farz' },
    { id: 'it-4', text: 'Bayram Namazı', hint: 'Ramazan & Kurban', categoryId: 'vacip' },
    { id: 'it-5', text: 'Vitir Namazı', hint: 'Yatsıdan sonra 3 rekat', categoryId: 'vacip' },
    { id: 'it-6', text: 'Sabah Sünneti', hint: 'Farzdan önce 2 rekat', categoryId: 'sunnet' },
    { id: 'it-7', text: 'Öğle Sünnetleri', hint: 'İlk ve son sünnet', categoryId: 'sunnet' },
    { id: 'it-8', text: 'Akşam Sünneti', hint: 'Farzdan sonra 2 rekat', categoryId: 'sunnet' },
    { id: 'it-9', text: 'Yatsı Sünneti', hint: 'İlk ve son sünnet', categoryId: 'sunnet' },
    { id: 'it-10', text: 'Kuşluk Namazı', hint: 'Duha namazı', categoryId: 'nafile' },
    { id: 'it-11', text: 'Teheccüd Namazı', hint: 'Gece kılınan namaz', categoryId: 'nafile' },
    { id: 'it-12', text: 'Evvâbin Namazı', hint: 'Akşam ile yatsı arası', categoryId: 'nafile' }
];

// 🎨 Kategori Renk Temaları
const THEME_COLORS: Record<string, { c: string; bgc: string; glow: string }> = {
    farz: { c: '#35a8ff', bgc: '#1267b4', glow: '#198cff' },
    vacip: { c: '#ffb31b', bgc: '#bd6506', glow: '#ff9d00' },
    sunnet: { c: '#5de34a', bgc: '#197b29', glow: '#45e52e' },
    nafile: { c: '#d16aff', bgc: '#7b2ea9', glow: '#be3fff' },
    blue: { c: '#35a8ff', bgc: '#1267b4', glow: '#198cff' },
    amber: { c: '#ffb31b', bgc: '#bd6506', glow: '#ff9d00' },
    emerald: { c: '#5de34a', bgc: '#197b29', glow: '#45e52e' },
    purple: { c: '#d16aff', bgc: '#7b2ea9', glow: '#be3fff' },
    rose: { c: '#ff5470', bgc: '#b81432', glow: '#ff3355' },
    cyan: { c: '#00d2d3', bgc: '#07797a', glow: '#00b5b6' },
    orange: { c: '#ff793f', bgc: '#cd4608', glow: '#ff5200' },
    teal: { c: '#1dd1a1', bgc: '#107c60', glow: '#10ac84' }
};

const COLOR_KEYS = ['farz', 'vacip', 'sunnet', 'nafile', 'rose', 'cyan', 'orange', 'teal'];

function getCategoryColor(cat: CategorySortCategory, index: number) {
    const raw = (cat.color || cat.id || '').toLowerCase();
    if (THEME_COLORS[raw]) return THEME_COLORS[raw];
    const n = cat.name.toLowerCase();
    if (n.includes('farz')) return THEME_COLORS.farz;
    if (n.includes('vacip')) return THEME_COLORS.vacip;
    if (n.includes('sünnet')) return THEME_COLORS.sunnet;
    if (n.includes('nafile')) return THEME_COLORS.nafile;
    const fallbackKey = COLOR_KEYS[index % COLOR_KEYS.length];
    return THEME_COLORS[fallbackKey];
}

// 🎯 Akıllı İkon Bulucu
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

// 🔍 Kategori Eşleşme Kontrolü
function isCategoryMatch(itemCatId: string, cat: CategorySortCategory): boolean {
    const norm = (s: string) => (s || '').trim().toLowerCase().replace(/[\s-_]/g, '');
    const i = norm(itemCatId);
    const cId = norm(cat.id);
    const cName = norm(cat.name);
    return i === cId || i === cName || cName.includes(i) || i.includes(cName);
}

interface ProcessedItem {
    id: string;
    text: string;
    subtitle: string;
    icon: string;
    categoryId: string;
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
    const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Fullscreen Durumu
    const [isFullscreen, setIsFullscreen] = useState(Boolean(propIsFullscreen));

    // Kategoriler ve Maddeler (Dinamik)
    const categories: CategorySortCategory[] = useMemo(() => {
        if (Array.isArray(step.categories) && step.categories.length > 0) {
            return step.categories;
        }
        return DEFAULT_CATEGORIES;
    }, [step.categories]);

    const allItems: ProcessedItem[] = useMemo(() => {
        const source = Array.isArray(step.items) && step.items.length > 0 ? step.items : DEFAULT_ITEMS;
        return source.map((it, idx) => ({
            id: it.id || `it-${idx}`,
            text: it.text,
            subtitle: it.hint || '',
            icon: getItemIcon(it.text, it.hint),
            categoryId: it.categoryId,
        }));
    }, [step.items]);

    // 🌟 Parıldayan Yıldızlar
    const stars = useMemo(() => Array.from({ length: 55 }).map((_, i) => ({
        id: i,
        left: `${(i * 17.3 + 7) % 98}%`,
        top: `${(i * 11.7 + 3) % 55}%`,
        delay: `${((i * 0.37) % 2).toFixed(1)}s`,
        size: i % 4 === 0 ? '4px' : (i % 2 === 0 ? '3px' : '2px')
    })), []);

    // Oyun State'leri
    const [score, setScore] = useState(0);
    const [placedCount, setPlacedCount] = useState(0);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isGameOver, setIsGameOver] = useState(false);

    // Yerleşimler: { [itemId]: categoryId }
    const [placements, setPlacements] = useState<Record<string, string>>({});
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const [dragOverZoneId, setDragOverZoneId] = useState<string | null>(null);

    // Toast Bildirimi
    const [toast, setToast] = useState<{ show: boolean; icon: string; title: string; text: string }>({
        show: false,
        icon: '🎉',
        title: 'Harika!',
        text: '',
    });

    // Ses Sentezleyici (Web Audio API)
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
            // Audio context not allowed or blocked
        }
    }, [isMuted]);

    // Toast Gösterici
    const showToast = useCallback((icon: string, title: string, text: string) => {
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        setToast({ show: true, icon, title, text });
        toastTimeoutRef.current = setTimeout(() => {
            setToast(prev => ({ ...prev, show: false }));
        }, 900);
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

    // Kronometre (Zaman Sınırı Olmadan)
    useEffect(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (!isPaused && !isGameOver) {
            timerRef.current = setInterval(() => {
                setElapsedTime(prev => prev + 1);
            }, 1000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isPaused, isGameOver]);

    // Oyunu Başlat
    const startGame = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        setScore(0);
        setPlacedCount(0);
        setElapsedTime(0);
        setIsPaused(false);
        setIsGameOver(false);
        setPlacements({});
        setSelectedCardId(null);
        setDragOverZoneId(null);
    }, []);

    useEffect(() => {
        startGame();
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        };
    }, [startGame]);

    // Kartı Kategoriye Bırak
    const dropItem = useCallback((itemId: string, targetCat: CategorySortCategory) => {
        const item = allItems.find(it => it.id === itemId);
        if (!item || placements[itemId] || isPaused) return;

        if (isCategoryMatch(item.categoryId, targetCat)) {
            // Doğru eşleşme!
            beep(660, 0.15);
            setPlacements(prev => ({ ...prev, [itemId]: targetCat.id }));
            setScore(prev => prev + 10);
            const newCount = placedCount + 1;
            setPlacedCount(newCount);
            setSelectedCardId(null);
            showToast('🎉', 'Doğru!', 'Çok iyi! +10 puan');

            if (newCount === allItems.length) {
                // Zafer melodisi
                setTimeout(() => {
                    [523, 659, 784, 1046].forEach((f, i) => {
                        setTimeout(() => beep(f, 0.2), i * 150);
                    });
                    setIsGameOver(true);
                }, 400);
            }
        } else {
            // Yanlış deneme!
            beep(180, 0.25, 'sawtooth');
            setScore(prev => Math.max(0, prev - 2));
            showToast('🤔', 'Tekrar Düşün', 'Bu kart başka bir kategoriye ait.');
        }
    }, [allItems, placements, isPaused, placedCount, beep, showToast]);

    // Format zaman
    const fmtTime = (sec: number) => {
        const m = String(Math.floor(sec / 60)).padStart(2, '0');
        const s = String(sec % 60).padStart(2, '0');
        return `${m}:${s}`;
    };

    const level = Math.min(5, 1 + Math.floor(placedCount / 3));
    const titleText = step.title || 'Namaz Çeşitlerini Sınıflandıralım';

    return (
        <div
            ref={containerRef}
            className={`relative w-full h-full min-h-[640px] select-none overflow-hidden font-sans text-white ${
                isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'rounded-2xl shadow-2xl'
            }`}
            style={{
                background: 'radial-gradient(circle at 50% 18%, #335ed8 0, #182c72 42%, #07132e 100%)',
            }}
        >
            {/* 🌟 1. Gece Gökyüzü ve Yıldızlar */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {stars.map(s => (
                    <i
                        key={s.id}
                        className="cat-star"
                        style={{
                            left: s.left,
                            top: s.top,
                            width: s.size,
                            height: s.size,
                            animationDelay: s.delay,
                        }}
                    />
                ))}
            </div>

            {/* 🌙 2. Parıldayan Hilal Ay */}
            <div className="cat-moon" />

            {/* 🕌 3. Cami Silueti (Kubbe ve Minareler) */}
            <div className="cat-mosque">
                <div className="cat-dome" />
                <div className="cat-minaret m1" />
                <div className="cat-minaret m2" />
            </div>

            {/* 👑 4. Üst Bilgi Başlığı (Puan, Seviye, Kronometre, Tam Ekran) */}
            <div className="cat-header">
                <div className="cat-pill">
                    ⭐ <b className="text-xl sm:text-2xl ml-1">{score}</b>
                    <small>Puan</small>
                </div>

                <div className="cat-pill">
                    🏆 <b className="text-xl sm:text-2xl ml-1">{level}</b>
                    <small>Seviye</small>
                </div>

                <div className="cat-pill">
                    ⏱️ <b className="text-xl sm:text-2xl ml-1">{fmtTime(elapsedTime)}</b>
                    <small>Geçen Süre</small>
                </div>

                {/* Tam Ekran Butonu */}
                <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="cat-pill cursor-pointer hover:border-yellow-300 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                    title={isFullscreen ? 'Tam Ekrandan Çık' : 'Tam Ekran Yap'}
                >
                    {isFullscreen ? <Minimize2 size={20} className="text-yellow-300" /> : <Maximize2 size={20} className="text-yellow-300" />}
                    <small className="font-bold">{isFullscreen ? 'Küçült' : 'Tam Ekran'}</small>
                </button>
            </div>

            {/* 🏷️ 5. Oyun Ana Başlığı */}
            <div className="cat-title">
                <h1>{titleText}</h1>
                <span>🎯 Kartları doğru kategoriye SÜRÜKLE veya DOKUNARAK BIRAK!</span>
            </div>

            {/* 🏛️ 6. Kategoriler Sahnesi (Dinamik Kaideler) */}
            <div
                className="cat-board"
                style={{
                    gridTemplateColumns: `repeat(${categories.length}, minmax(0, 1fr))`,
                }}
            >
                {categories.map((cat, idx) => {
                    const theme = getCategoryColor(cat, idx);
                    const isOver = dragOverZoneId === cat.id;
                    const placedHere = allItems.filter(it => placements[it.id] === cat.id);

                    return (
                        <div
                            key={cat.id}
                            className={`cat-zone ${isOver ? 'over' : ''}`}
                            style={{
                                '--c': theme.c,
                                '--bgc': theme.bgc,
                                '--glow': theme.glow,
                            } as React.CSSProperties}
                            onDragOver={e => {
                                e.preventDefault();
                                setDragOverZoneId(cat.id);
                            }}
                            onDragLeave={() => setDragOverZoneId(null)}
                            onDrop={e => {
                                e.preventDefault();
                                setDragOverZoneId(null);
                                const itemId = e.dataTransfer.getData('text/plain') || selectedCardId;
                                if (itemId) dropItem(itemId, cat);
                            }}
                            onClick={() => {
                                if (selectedCardId) {
                                    dropItem(selectedCardId, cat);
                                }
                            }}
                            title={cat.description || `${cat.name} kategorisi`}
                        >
                            {/* Kategori Başlığı */}
                            <div className="cat-zone-head">
                                <span>{getCategoryIcon(cat.name, idx)}</span>
                                <span>{cat.name.toUpperCase()}</span>
                            </div>

                            {/* Yerleşen Kartlar Bölgesi */}
                            <div className="cat-zone-body">
                                {placedHere.map(it => (
                                    <div key={it.id} className="cat-card used">
                                        <div className="cat-ico">{it.icon}</div>
                                        <div className="cat-card-text">
                                            <b>{it.text}</b>
                                            {it.subtitle && <small>{it.subtitle}</small>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 🎴 7. Alt Güverte: Henüz Yerleşmemiş Kartlar Deste Bölgesi */}
            <div className="cat-deck">
                {allItems
                    .filter(it => !placements[it.id])
                    .map(it => {
                        const isSelected = selectedCardId === it.id;
                        return (
                            <div
                                key={it.id}
                                draggable
                                onDragStart={e => {
                                    e.dataTransfer.setData('text/plain', it.id);
                                    setSelectedCardId(it.id);
                                }}
                                onDragEnd={() => setSelectedCardId(null)}
                                onClick={() => setSelectedCardId(prev => prev === it.id ? null : it.id)}
                                className={`cat-card ${isSelected ? 'selected' : ''}`}
                                title="Sürükleyin veya dokunup ardından yukarıdaki kutuya dokunun"
                            >
                                <div className="cat-ico">{it.icon}</div>
                                <div className="cat-card-text">
                                    <b>{it.text}</b>
                                    {it.subtitle && <small>{it.subtitle}</small>}
                                </div>
                            </div>
                        );
                    })}
            </div>

            {/* 💡 8. İpucu Çubuğu */}
            <div className="cat-help">
                💡 Bir kartı tut → doğru kutuya sürükle veya karta dokunup kutuyu seç!
            </div>

            {/* ⚙️ 9. Sağ Alt Kontroller (Duraklat, Ses, Sıfırla) */}
            <div className="cat-controls">
                <button
                    type="button"
                    className="cat-ctrl"
                    onClick={() => setIsPaused(prev => !prev)}
                    title={isPaused ? 'Devam Et' : 'Duraklat'}
                >
                    {isPaused ? <Play size={20} /> : <Pause size={20} />}
                </button>
                <button
                    type="button"
                    className="cat-ctrl"
                    onClick={() => setIsMuted(prev => !prev)}
                    title={isMuted ? 'Sesi Aç' : 'Sesi Kapat'}
                >
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <button
                    type="button"
                    className="cat-ctrl"
                    onClick={startGame}
                    title="Yeniden Başla"
                >
                    <RotateCcw size={20} />
                </button>
            </div>

            {/* 💬 10. Toast Bildirim Kutusu */}
            <div className={`cat-toast ${toast.show ? 'show' : ''}`}>
                <div className="text-5xl mb-1">{toast.icon}</div>
                <h2 className="text-2xl font-black">{toast.title}</h2>
                <p className="text-sm font-bold text-gray-500 mt-1">{toast.text}</p>
            </div>

            {/* 🏆 11. Görev Tamamlandı Overlay Modal */}
            {isGameOver && (
                <div className="cat-overlay">
                    <div className="cat-modal">
                        <div className="text-6xl mb-3">🏆</div>
                        <h2 className="text-3xl font-black text-amber-300">Tebrikler!</h2>
                        <p className="text-lg text-blue-100 my-4 leading-relaxed">
                            {allItems.length} kartın tamamını başarıyla doğru kategorilere yerleştirdin!
                            <br />
                            <b>Toplam Puan: {score}</b> — <b>Geçen Süre: {fmtTime(elapsedTime)}</b>
                        </p>
                        <button
                            type="button"
                            className="cat-play-btn"
                            onClick={startGame}
                        >
                            ↻ Yeniden Oyna
                        </button>
                    </div>
                </div>
            )}

            {/* Duraklatıldı Katmanı */}
            {isPaused && (
                <div className="cat-overlay">
                    <div className="cat-modal">
                        <div className="text-5xl mb-3">⏸️</div>
                        <h2 className="text-3xl font-black text-white">Oyun Duraklatıldı</h2>
                        <p className="text-base text-blue-200 my-4">
                            Hazır olduğunuzda devam etmek için butona tıklayın.
                        </p>
                        <button
                            type="button"
                            className="cat-play-btn"
                            onClick={() => setIsPaused(false)}
                        >
                            ▶ Devam Et
                        </button>
                    </div>
                </div>
            )}

            {/* 💅 12. Saf CSS Kuralları (Kullanıcının Verdiği Tasarımla 1:1) */}
            <style jsx>{`
                .cat-star {
                    position: absolute;
                    border-radius: 50%;
                    background: #fff;
                    opacity: 0.8;
                    animation: twinkle 2s infinite alternate;
                }

                @keyframes twinkle {
                    to {
                        opacity: 0.2;
                        transform: scale(0.5);
                    }
                }

                .cat-moon {
                    position: absolute;
                    right: 7vw;
                    top: 8vh;
                    width: 78px;
                    height: 78px;
                    border-radius: 50%;
                    background: #fff7c7;
                    box-shadow: 0 0 35px #fff5a3;
                    pointer-events: none;
                }

                .cat-moon:after {
                    content: '';
                    position: absolute;
                    right: -17px;
                    top: -8px;
                    width: 78px;
                    height: 78px;
                    border-radius: 50%;
                    background: #11255c;
                }

                .cat-mosque {
                    position: absolute;
                    left: 0;
                    right: 0;
                    bottom: -3vh;
                    height: 55vh;
                    opacity: 0.28;
                    pointer-events: none;
                }

                .cat-dome {
                    position: absolute;
                    bottom: 17%;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 33vw;
                    height: 19vw;
                    max-height: 230px;
                    border-radius: 50% 50% 0 0;
                    background: #172d70;
                }

                .cat-minaret {
                    position: absolute;
                    bottom: 16%;
                    width: 3vw;
                    height: 40vh;
                    max-height: 400px;
                    background: #14285f;
                }

                .cat-minaret:before {
                    content: '';
                    position: absolute;
                    top: -5vh;
                    left: -1vw;
                    width: 5vw;
                    height: 5vh;
                    border-radius: 50% 50% 0 0;
                    background: #18347a;
                }

                .cat-minaret.m1 {
                    left: 20%;
                }

                .cat-minaret.m2 {
                    right: 20%;
                }

                .cat-header {
                    position: absolute;
                    left: 2vw;
                    right: 2vw;
                    top: 1.8vh;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 14px;
                    z-index: 10;
                }

                .cat-pill {
                    background: rgba(8, 20, 55, 0.72);
                    border: 2px solid rgba(255, 255, 255, 0.25);
                    border-radius: 20px;
                    padding: 8px 16px;
                    min-width: 120px;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
                    backdrop-filter: blur(10px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 4px;
                }

                .cat-pill small {
                    display: block;
                    color: #cdd7ff;
                    font-weight: 800;
                    margin-left: 6px;
                    font-size: 11px;
                }

                .cat-title {
                    position: absolute;
                    top: 2vh;
                    left: 50%;
                    transform: translateX(-50%);
                    text-align: center;
                    z-index: 5;
                    white-space: nowrap;
                    pointer-events: none;
                }

                .cat-title h1 {
                    margin: 0;
                    font-size: clamp(24px, 3vw, 48px);
                    line-height: 1;
                    font-weight: 900;
                    text-shadow: 0 4px 0 #7b3308, 0 8px 18px rgba(0, 0, 0, 0.6);
                    color: #fff5d7;
                }

                .cat-title span {
                    display: inline-block;
                    margin-top: 8px;
                    background: #fff0bd;
                    color: #7b3d0a;
                    padding: 6px 16px;
                    border-radius: 999px;
                    font-weight: 900;
                    font-size: clamp(11px, 1vw, 15px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                }

                .cat-board {
                    position: absolute;
                    left: 4vw;
                    right: 4vw;
                    top: 17vh;
                    bottom: 18vh;
                    display: grid;
                    gap: 1.5vw;
                    z-index: 5;
                }

                .cat-zone {
                    position: relative;
                    border: 4px solid var(--c);
                    border-radius: 28px 28px 22px 22px;
                    background: linear-gradient(180deg, var(--bgc), rgba(0, 0, 0, 0.25));
                    box-shadow: 0 0 30px var(--glow), inset 0 0 35px rgba(255, 255, 255, 0.15);
                    min-width: 0;
                    transition: transform 0.2s, box-shadow 0.2s;
                    display: flex;
                    flex-direction: column;
                    cursor: pointer;
                }

                .cat-zone.over {
                    transform: translateY(-8px) scale(1.02);
                    box-shadow: 0 0 55px var(--glow), inset 0 0 40px rgba(255, 255, 255, 0.3);
                }

                .cat-zone-head {
                    height: 64px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    font-size: clamp(18px, 1.8vw, 30px);
                    font-weight: 900;
                    text-shadow: 0 3px 5px rgba(0, 0, 0, 0.6);
                    letter-spacing: 0.5px;
                    flex-shrink: 0;
                    border-bottom: 2px solid rgba(255, 255, 255, 0.15);
                }

                .cat-zone-body {
                    flex: 1;
                    padding: 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    overflow-y: auto;
                }

                .cat-zone-body::-webkit-scrollbar {
                    width: 5px;
                }

                .cat-zone-body::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.35);
                    border-radius: 9px;
                }

                /* 🎴 Saf CSS Kart */
                .cat-card {
                    position: relative;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background: linear-gradient(135deg, #fff8e4, #ffe7b3);
                    color: #3b260e;
                    border: 2px solid #fff;
                    box-shadow: 0 7px 16px rgba(0, 0, 0, 0.35);
                    border-radius: 16px;
                    padding: 10px 14px;
                    min-height: 60px;
                    cursor: grab;
                    touch-action: none;
                    animation: cardIn 0.35s ease;
                    transition: transform 0.15s, box-shadow 0.15s;
                    user-select: none;
                }

                @keyframes cardIn {
                    from {
                        opacity: 0;
                        transform: translateY(12px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: none;
                    }
                }

                .cat-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.45);
                    border-color: #ffd700;
                }

                .cat-card.selected {
                    transform: translateY(-6px) scale(1.03);
                    box-shadow: 0 0 20px 4px #ffd700, 0 10px 20px rgba(0, 0, 0, 0.5);
                    border-color: #ffd700;
                    outline: 3px solid #ffd700;
                }

                .cat-card:active {
                    cursor: grabbing;
                    transform: scale(0.98);
                }

                .cat-card.used {
                    cursor: default;
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
                    min-height: 52px;
                    padding: 8px 10px;
                }

                .cat-card.used:hover {
                    transform: none;
                }

                .cat-ico {
                    width: 38px;
                    height: 38px;
                    display: grid;
                    place-items: center;
                    background: #fff0c8;
                    border-radius: 11px;
                    font-size: 22px;
                    flex: none;
                }

                .cat-card-text {
                    display: flex;
                    flex-direction: column;
                    min-width: 0;
                    flex: 1;
                }

                .cat-card-text b {
                    font-size: 14px;
                    line-height: 1.2;
                    word-break: break-word;
                    color: #3b260e;
                }

                .cat-card-text small {
                    display: block;
                    font-size: 11px;
                    color: #795c39;
                    margin-top: 3px;
                    font-weight: 700;
                }

                .cat-deck {
                    position: absolute;
                    left: 3vw;
                    right: 3vw;
                    bottom: 2vh;
                    height: 14vh;
                    min-height: 90px;
                    z-index: 10;
                    border: 3px solid #d99024;
                    border-radius: 25px;
                    background: linear-gradient(180deg, #6f350d, #321706);
                    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.6), inset 0 0 20px rgba(249, 165, 29, 0.2);
                    padding: 12px;
                    display: flex;
                    gap: 12px;
                    overflow-x: auto;
                    align-items: center;
                }

                .cat-deck::-webkit-scrollbar {
                    height: 7px;
                }

                .cat-deck::-webkit-scrollbar-thumb {
                    background: #f3bd58;
                    border-radius: 99px;
                }

                .cat-deck .cat-card {
                    min-width: 170px;
                    max-width: 220px;
                    flex-shrink: 0;
                }

                .cat-help {
                    position: absolute;
                    left: 3.5vw;
                    bottom: 17vh;
                    z-index: 12;
                    background: #fff4bd;
                    color: #693709;
                    border-radius: 16px;
                    padding: 6px 14px;
                    font-weight: 900;
                    font-size: 12px;
                    box-shadow: 0 7px 20px rgba(0, 0, 0, 0.4);
                    pointer-events: none;
                }

                .cat-controls {
                    position: absolute;
                    right: 3.5vw;
                    bottom: 17vh;
                    z-index: 12;
                    display: flex;
                    gap: 8px;
                }

                .cat-ctrl {
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    border: 2px solid rgba(255, 255, 255, 0.5);
                    background: #152b68;
                    color: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
                    transition: transform 0.15s, background 0.15s;
                }

                .cat-ctrl:hover {
                    transform: scale(1.08);
                    background: #1e3d94;
                }

                .cat-ctrl:active {
                    transform: scale(0.95);
                }

                .cat-toast {
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    transform: translate(-50%, -50%) scale(0.8);
                    z-index: 30;
                    opacity: 0;
                    pointer-events: none;
                    background: #fff;
                    border-radius: 25px;
                    padding: 22px 36px;
                    text-align: center;
                    color: #16204c;
                    box-shadow: 0 20px 70px rgba(0, 0, 0, 0.6);
                    transition: opacity 0.2s, transform 0.2s;
                }

                .cat-toast.show {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }

                .cat-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(5, 11, 26, 0.85);
                    backdrop-filter: blur(8px);
                    z-index: 40;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }

                .cat-modal {
                    width: min(560px, 92vw);
                    background: linear-gradient(160deg, #172b67, #0b1538);
                    border: 3px solid #f4b83e;
                    border-radius: 30px;
                    padding: 34px;
                    text-align: center;
                    box-shadow: 0 30px 100px rgba(0, 0, 0, 0.8);
                }

                .cat-play-btn {
                    border: 0;
                    border-radius: 999px;
                    padding: 14px 34px;
                    background: linear-gradient(90deg, #ffb11b, #ff7b22);
                    color: #fff;
                    font-weight: 900;
                    font-size: 18px;
                    cursor: pointer;
                    box-shadow: 0 10px 30px rgba(255, 152, 23, 0.4);
                    transition: transform 0.15s;
                }

                .cat-play-btn:hover {
                    transform: scale(1.05);
                }

                @media (max-width: 850px) {
                    .cat-title {
                        top: 1vh;
                    }
                    .cat-title h1 {
                        font-size: 20px;
                    }
                    .cat-header .cat-pill {
                        min-width: 75px;
                        padding: 5px 8px;
                    }
                    .cat-board {
                        top: 15vh;
                        bottom: 20vh;
                        gap: 8px;
                        left: 2vw;
                        right: 2vw;
                    }
                    .cat-zone {
                        border-width: 2px;
                        border-radius: 16px;
                    }
                    .cat-zone-head {
                        height: 48px;
                        font-size: 15px;
                    }
                    .cat-card {
                        padding: 6px 8px;
                        min-height: 48px;
                    }
                    .cat-ico {
                        width: 28px;
                        height: 28px;
                        font-size: 16px;
                    }
                    .cat-card-text b {
                        font-size: 11px;
                    }
                    .cat-card-text small {
                        font-size: 9px;
                    }
                    .cat-deck {
                        left: 1.5vw;
                        right: 1.5vw;
                        height: 16vh;
                        bottom: 1vh;
                    }
                    .cat-deck .cat-card {
                        min-width: 140px;
                    }
                    .cat-help {
                        display: none;
                    }
                }
            `}</style>
        </div>
    );
}
