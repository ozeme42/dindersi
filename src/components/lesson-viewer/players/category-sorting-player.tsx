'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
    Maximize2, Minimize2, RotateCcw, Volume2, VolumeX, Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { playSound } from '@/lib/audio-service';
import type { CategorySortStep, CategorySortCategory, CategorySortItem } from '@/lib/types';
import { useAuth } from '@/context/auth-context';

const useTeacherMode = () => {
    const { user } = useAuth();
    return user?.role === 'teacher' || user?.role === 'superadmin';
};

// 🕌 Şablondaki Varsayılan Kategoriler (Namaz Çeşitleri)
const DEFAULT_CATEGORIES: CategorySortCategory[] = [
    { id: 'farz', name: 'FARZ', badge: 'Kesin Emir', description: 'Kılınması farz olan namazlar', color: 'farz' },
    { id: 'vacip', name: 'VACİP', badge: 'Gerekli', description: 'Yerine getirilmesi vacip olanlar', color: 'vacip' },
    { id: 'sunnet', name: 'SÜNNET', badge: 'Örnek İbadet', description: 'Peygamberimizin sünnetleri', color: 'sunnet' },
    { id: 'nafile', name: 'NAFİLE', badge: 'Gönüllü İbadet', description: 'Sevabı çok olan nafile namazlar', color: 'nafile' }
];

// 🎴 Şablondaki Varsayılan 12 Kart
const DEFAULT_ITEMS = [
    { id: 'it-1', text: 'Beş Vakit Namaz', subtitle: 'Günlük farz', categoryId: 'farz', icon: '🕌' },
    { id: 'it-2', text: 'Cuma Namazı', subtitle: 'Cuma günü', categoryId: 'farz', icon: '☪️' },
    { id: 'it-3', text: 'Cenaze Namazı', subtitle: 'Farz-ı kifâye', categoryId: 'farz', icon: '🤲' },
    { id: 'it-4', text: 'Bayram Namazı', subtitle: 'Ramazan / Kurban', categoryId: 'vacip', icon: '🌙' },
    { id: 'it-5', text: 'Vitir Namazı', subtitle: 'Yatsıdan sonra', categoryId: 'vacip', icon: '⭐' },
    { id: 'it-6', text: 'Sabah Sünneti', subtitle: 'Farzdan önce', categoryId: 'sunnet', icon: '🌅' },
    { id: 'it-7', text: 'Öğle Sünnetleri', subtitle: 'Öğle vaktinde', categoryId: 'sunnet', icon: '☀️' },
    { id: 'it-8', text: 'Akşam Sünneti', subtitle: 'Farzdan sonra', categoryId: 'sunnet', icon: '🌆' },
    { id: 'it-9', text: 'Yatsı Sünneti', subtitle: 'Yatsı vaktinde', categoryId: 'sunnet', icon: '🌙' },
    { id: 'it-10', text: 'Kuşluk Namazı', subtitle: 'Duha', categoryId: 'nafile', icon: '🌤️' },
    { id: 'it-11', text: 'Teheccüd Namazı', subtitle: 'Gece namazı', categoryId: 'nafile', icon: '🌌' },
    { id: 'it-12', text: 'Evvâbin Namazı', subtitle: 'Akşamdan sonra', categoryId: 'nafile', icon: '✨' }
];

// 🎯 Akıllı İkon Eşleştirici (Dinamik Konu Maddeleri İçin)
function getItemIcon(text: string, subtitle?: string): string {
    const combined = `${text} ${subtitle || ''}`.toLowerCase();
    if (combined.includes('cuma') || combined.includes('camii')) return '☪️';
    if (combined.includes('cenaze') || combined.includes('dua')) return '🤲';
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

// 4 Ana Kategori Tema Sınıfı Eşleştirmesi
function getCategoryColorClass(cat: CategorySortCategory, index: number): string {
    const n = cat.name.toLowerCase();
    const c = (cat.color || '').toLowerCase();
    if (n.includes('farz') || c === 'farz' || c === 'blue' || c === 'cyan') return 'farz';
    if (n.includes('vacip') || c === 'vacip' || c === 'amber' || c === 'orange' || c === 'yellow') return 'vacip';
    if (n.includes('sünnet') || c === 'sunnet' || c === 'emerald' || c === 'green') return 'sunnet';
    if (n.includes('nafile') || c === 'nafile' || c === 'purple' || c === 'indigo' || c === 'rose') return 'nafile';
    const order = ['farz', 'vacip', 'sunnet', 'nafile'];
    return order[index % order.length];
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
    const isTeacher = useTeacherMode();
    const containerRef = useRef<HTMLDivElement>(null);

    // Tam Ekran Durumu
    const [isFullscreen, setIsFullscreen] = useState(Boolean(propIsFullscreen));

    useEffect(() => {
        if (typeof propIsFullscreen === 'boolean') {
            setIsFullscreen(propIsFullscreen);
        }
    }, [propIsFullscreen]);

    const toggleFullscreen = async () => {
        try {
            if (!isFullscreen) {
                if (containerRef.current?.requestFullscreen) {
                    await containerRef.current.requestFullscreen();
                }
                setIsFullscreen(true);
            } else {
                if (document.fullscreenElement && document.exitFullscreen) {
                    await document.exitFullscreen();
                }
                setIsFullscreen(false);
            }
        } catch (err) {
            console.error('Tam ekran hatası:', err);
            setIsFullscreen(!isFullscreen);
        }
    };

    useEffect(() => {
        const onFsChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', onFsChange);
        return () => document.removeEventListener('fullscreenchange', onFsChange);
    }, []);

    // 🌟 Gökyüzündeki 55 Adet Parıldayan Yıldız
    const stars = useMemo(() => Array.from({ length: 55 }).map((_, i) => ({
        id: i,
        left: `${(i * 17.3 + 7) % 98}%`,
        top: `${(i * 11.7 + 3) % 55}%`,
        delay: `${((i * 0.37) % 2).toFixed(1)}s`,
        size: i % 4 === 0 ? '4px' : (i % 2 === 0 ? '3px' : '2px')
    })), []);

    // 📚 Kategorileri Normalize Et
    const categories: CategorySortCategory[] = useMemo(() => {
        if (Array.isArray(step.categories) && step.categories.length > 0) {
            return step.categories;
        }
        return DEFAULT_CATEGORIES;
    }, [step.categories]);

    // 🎴 Kartları Normalize Et
    interface CardItem {
        id: string;
        text: string;
        subtitle: string;
        categoryId: string;
        icon: string;
    }

    const allItems: CardItem[] = useMemo(() => {
        if (Array.isArray(step.items) && step.items.length > 0) {
            return step.items.map((item, idx) => ({
                id: item.id || `it-${idx}`,
                text: item.text,
                subtitle: item.hint || '',
                categoryId: item.categoryId,
                icon: getItemIcon(item.text, item.hint)
            }));
        }
        return DEFAULT_ITEMS;
    }, [step.items]);

    // Oyun State'leri
    const [score, setScore] = useState(0);
    const [placedCount, setPlacedCount] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isGameOver, setIsGameOver] = useState(false);

    // Kart yerleşimleri: { [itemId]: categoryId }
    const [placements, setPlacements] = useState<{ [itemId: string]: string }>({});
    
    // Tıklayarak veya sürükleyerek seçili kart
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const [dragOverZoneId, setDragOverZoneId] = useState<string | null>(null);

    // Toast bildirimi state'i
    const [toast, setToast] = useState<{ show: boolean; icon: string; title: string; text: string }>({
        show: false,
        icon: '🎉',
        title: 'Harika!',
        text: ''
    });
    const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const triggerToast = useCallback((icon: string, title: string, text: string) => {
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        setToast({ show: true, icon, title, text });
        toastTimeoutRef.current = setTimeout(() => {
            setToast(prev => ({ ...prev, show: false }));
        }, 1100);
    }, []);

    // Seviye Hesabı: Her 3 doğru yerleşimde 1 seviye atla (Max 5)
    const level = Math.min(5, 1 + Math.floor(placedCount / 3));

    // Kategori Eşleştirme Mantığı
    const isItemBelongsToCategory = useCallback((item: CardItem, cat: CategorySortCategory) => {
        return item.categoryId === cat.id || 
               item.categoryId?.toLowerCase() === cat.name.toLowerCase() ||
               item.categoryId?.toLowerCase() === cat.id.toLowerCase();
    }, []);

    // Kartı Kategoriye Yerleştirme Fonksiyonu
    const dropItemIntoCategory = useCallback((itemId: string, categoryId: string) => {
        const item = allItems.find(it => it.id === itemId);
        const cat = categories.find(c => c.id === categoryId);
        if (!item || !cat) return;

        const isMatch = isItemBelongsToCategory(item, cat);

        if (isMatch) {
            if (!isMuted) playSound('pop');
            setPlacements(prev => ({ ...prev, [itemId]: categoryId }));
            setSelectedCardId(null);
            setScore(prev => prev + 10);
            const newPlaced = placedCount + 1;
            setPlacedCount(newPlaced);
            triggerToast('🎉', 'Doğru!', 'Çok iyi! +10 puan');

            // Tüm kartlar tamamlandı mı?
            if (newPlaced >= allItems.length) {
                setTimeout(() => {
                    if (!isMuted) playSound('win');
                    import('canvas-confetti').then(m => {
                        m.default({ particleCount: 160, spread: 100, origin: { y: 0.6 } });
                    }).catch(() => {});
                    setIsGameOver(true);
                }, 400);
            }
        } else {
            if (!isMuted) playSound('incorrect');
            setScore(prev => Math.max(0, prev - 2));
            triggerToast('🤔', 'Tekrar Düşün', 'Bu kart başka bir kategoriye ait.');
        }
    }, [allItems, categories, isItemBelongsToCategory, placedCount, isMuted, triggerToast]);

    // Kart Tıklama (Dokunmatik / Akıllı Tahta Desteği)
    const handleCardClick = (item: CardItem) => {
        if (!isMuted) playSound('pop');
        if (selectedCardId === item.id) {
            setSelectedCardId(null);
        } else {
            setSelectedCardId(item.id);
        }
    };

    // Kategoriye Tıklama (Seçili kartı yerleştir)
    const handleZoneClick = (catId: string) => {
        if (selectedCardId) {
            dropItemIntoCategory(selectedCardId, catId);
        }
    };

    // HTML5 Drag & Drop
    const handleDragStart = (e: React.DragEvent, itemId: string) => {
        e.dataTransfer.setData('text/plain', itemId);
        setSelectedCardId(itemId);
    };

    const handleDragOver = (e: React.DragEvent, catId: string) => {
        e.preventDefault();
        setDragOverZoneId(catId);
    };

    const handleDragLeave = () => {
        setDragOverZoneId(null);
    };

    const handleDrop = (e: React.DragEvent, catId: string) => {
        e.preventDefault();
        setDragOverZoneId(null);
        const itemId = e.dataTransfer.getData('text/plain') || selectedCardId;
        if (itemId) {
            dropItemIntoCategory(itemId, catId);
        }
    };

    // Oyunu Yeniden Başlat
    const startGame = () => {
        if (!isMuted) playSound('pop');
        setPlacements({});
        setSelectedCardId(null);
        setDragOverZoneId(null);
        setScore(0);
        setPlacedCount(0);
        setIsGameOver(false);
    };

    // Öğretmen Modu: Tüm kartları doğru sandıklara otomatik doldur
    const handleTeacherSolve = () => {
        if (!isMuted) playSound('pop');
        const solved: { [itemId: string]: string } = {};
        allItems.forEach(item => {
            const matched = categories.find(c => isItemBelongsToCategory(item, c));
            solved[item.id] = matched ? matched.id : item.categoryId;
        });
        setPlacements(solved);
        setPlacedCount(allItems.length);
        setScore(allItems.length * 10);
        setSelectedCardId(null);
        triggerToast('👁️', 'Çözüm Açıldı', 'Öğretmen modu: Tüm kartlar yerleştirildi.');
    };

    // Destede Kalan Kartlar
    const unplacedItems = useMemo(() => {
        return allItems.filter(item => !placements[item.id]);
    }, [allItems, placements]);

    // Başlık ve Açıklama Metni
    const pageTitle = step.title && step.title !== 'categorySort' 
        ? step.title 
        : 'Namaz Çeşitlerini Sınıflandıralım';
    const pageDescription = step.description || '🎯 Kartları doğru kategoriye SÜRÜKLE ve BIRAK!';

    // Kategori Sütun Genişliği
    const boardGridColumns = categories.length === 2 ? 'repeat(2, 1fr)' :
                             categories.length === 3 ? 'repeat(3, 1fr)' :
                             `repeat(${Math.min(categories.length, 4)}, 1fr)`;

    return (
        <div 
            ref={containerRef}
            className={cn(
                "relative w-full h-full select-none overflow-hidden font-sans text-white",
                isFullscreen ? "fixed inset-0 z-[100] w-screen h-screen" : "w-full min-h-[640px] rounded-2xl md:rounded-3xl"
            )}
            style={{
                background: 'radial-gradient(circle at 50% 18%, #335ed8 0, #182c72 42%, #07132e 100%)'
            }}
        >
            {/* ══ STYLES (Kullanıcının Şablonunun Birebir CSS Kuralları) ══ */}
            <style dangerouslySetInnerHTML={{ __html: `
                .star {
                    position: absolute;
                    width: 3px;
                    height: 3px;
                    border-radius: 50%;
                    background: #fff;
                    opacity: .8;
                    animation: twinkle 2s infinite alternate;
                }
                @keyframes twinkle {
                    to { opacity: .2; transform: scale(.5); }
                }
                .moon {
                    position: absolute;
                    right: 6vw;
                    top: 6vh;
                    width: 78px;
                    height: 78px;
                    border-radius: 50%;
                    background: #fff7c7;
                    box-shadow: 0 0 35px #fff5a3;
                    pointer-events: none;
                    z-index: 1;
                }
                .moon:after {
                    content: "";
                    position: absolute;
                    right: -17px;
                    top: -8px;
                    width: 78px;
                    height: 78px;
                    border-radius: 50%;
                    background: #11255c;
                }
                .mosque {
                    position: absolute;
                    left: 0;
                    right: 0;
                    bottom: -3vh;
                    height: 55vh;
                    opacity: .28;
                    pointer-events: none;
                    z-index: 1;
                }
                .dome {
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
                .minaret {
                    position: absolute;
                    bottom: 16%;
                    width: 3vw;
                    height: 40vh;
                    max-height: 400px;
                    background: #14285f;
                }
                .minaret:before {
                    content: "";
                    position: absolute;
                    top: -5vh;
                    left: -1vw;
                    width: 5vw;
                    height: 5vh;
                    border-radius: 50% 50% 0 0;
                    background: #18347a;
                }
                .m1 { left: 20%; }
                .m2 { right: 20%; }

                .pill-hud {
                    background: rgba(8,20,55,.75);
                    border: 2px solid rgba(255,255,255,.25);
                    border-radius: 20px;
                    padding: 8px 16px;
                    min-width: 110px;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.35);
                    backdrop-filter: blur(10px);
                }
                .pill-hud b {
                    font-size: 22px;
                    line-height: 1;
                    display: inline-block;
                }
                .pill-hud small {
                    display: block;
                    color: #cdd7ff;
                    font-weight: 800;
                    font-size: 11px;
                    margin-top: 2px;
                }

                .title-area h1 {
                    margin: 0;
                    font-size: clamp(22px, 2.7vw, 46px);
                    line-height: 1;
                    text-shadow: 0 4px 0 #7b3308, 0 8px 18px rgba(0,0,0,0.5);
                    color: #fff5d7;
                    font-weight: 900;
                    letter-spacing: -0.5px;
                }
                .title-area span {
                    display: inline-block;
                    margin-top: 6px;
                    background: #fff0bd;
                    color: #7b3d0a;
                    padding: 5px 16px;
                    border-radius: 999px;
                    font-weight: 900;
                    font-size: clamp(10px, 0.95vw, 14px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                }

                .zone-box {
                    position: relative;
                    border: 4px solid var(--c);
                    border-radius: 28px 28px 22px 22px;
                    background: linear-gradient(180deg, var(--bgc), rgba(0,0,0,.22));
                    box-shadow: 0 0 30px var(--glow), inset 0 0 35px rgba(255,255,255,0.15);
                    min-width: 0;
                    transition: transform .2s ease, box-shadow .2s ease;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                .zone-box.over {
                    transform: translateY(-8px) scale(1.02);
                    box-shadow: 0 0 55px var(--glow), inset 0 0 40px rgba(255,255,255,0.28);
                }
                .zone-head-box {
                    height: 64px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    font-size: clamp(18px, 1.8vw, 28px);
                    font-weight: 900;
                    text-shadow: 0 3px 5px rgba(0,0,0,0.5);
                    flex-shrink: 0;
                    border-bottom: 2px solid rgba(255,255,255,0.15);
                }
                .zone-body-box {
                    flex: 1;
                    padding: 10px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    overflow-y: auto;
                }
                .zone-body-box::-webkit-scrollbar { width: 5px; }
                .zone-body-box::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); border-radius: 9px; }

                .farz { --c: #35a8ff; --bgc: #1267b4; --glow: #198cff; }
                .vacip { --c: #ffb31b; --bgc: #bd6506; --glow: #ff9d00; }
                .sunnet { --c: #5de34a; --bgc: #197b29; --glow: #45e52e; }
                .nafile { --c: #d16aff; --bgc: #7b2ea9; --glow: #be3fff; }

                .card-item {
                    position: relative;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background: linear-gradient(135deg, #fff8e4, #ffe7b3);
                    color: #3b260e;
                    border: 2px solid #fff;
                    box-shadow: 0 7px 16px rgba(0,0,0,0.35);
                    border-radius: 16px;
                    padding: 8px 12px;
                    min-height: 58px;
                    cursor: grab;
                    touch-action: none;
                    animation: cardIn .35s ease;
                    transition: transform 0.15s ease, box-shadow 0.15s ease;
                    user-select: none;
                }
                @keyframes cardIn {
                    from { opacity: 0; transform: translateY(12px) scale(.95); }
                    to { opacity: 1; transform: none; }
                }
                .card-item:active {
                    cursor: grabbing;
                    transform: scale(.98);
                }
                .card-item.selected {
                    outline: 3.5px solid #ffcc00;
                    transform: translateY(-5px) scale(1.03);
                    box-shadow: 0 12px 25px rgba(255, 204, 0, 0.6);
                }
                .card-item .ico {
                    width: 36px;
                    height: 36px;
                    display: grid;
                    place-items: center;
                    background: #fff0c8;
                    border-radius: 11px;
                    font-size: 20px;
                    flex: none;
                    box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);
                }
                .card-item b {
                    font-size: 13.5px;
                    line-height: 1.15;
                    color: #2e1b07;
                    display: block;
                }
                .card-item small {
                    display: block;
                    font-size: 10.5px;
                    color: #795c39;
                    margin-top: 2px;
                    font-weight: 700;
                }

                .deck-bar {
                    border: 3px solid #d99024;
                    border-radius: 25px;
                    background: linear-gradient(180deg, #6f350d, #321706);
                    box-shadow: 0 15px 40px rgba(0,0,0,0.65), inset 0 0 20px rgba(249, 165, 29, 0.25);
                    padding: 10px 14px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    overflow-x: auto;
                }
                .deck-bar::-webkit-scrollbar { height: 7px; }
                .deck-bar::-webkit-scrollbar-thumb { background: #f3bd58; border-radius: 99px; }
                .deck-bar .card-item {
                    min-width: 155px;
                    max-width: 195px;
                    height: 100%;
                    flex-shrink: 0;
                }

                .ctrl-btn {
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    border: 2px solid rgba(255,255,255,0.45);
                    background: #152b68;
                    color: #fff;
                    font-size: 18px;
                    cursor: pointer;
                    box-shadow: 0 8px 20px rgba(0,0,0,0.45);
                    display: grid;
                    place-items: center;
                    transition: transform 0.15s, background 0.15s, border-color 0.15s;
                }
                .ctrl-btn:hover {
                    transform: scale(1.08);
                    background: #1c3987;
                    border-color: #fff;
                }
                .ctrl-btn:active {
                    transform: scale(0.95);
                }

                .custom-toast {
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    transform: translate(-50%, -50%) scale(.8);
                    z-index: 60;
                    opacity: 0;
                    pointer-events: none;
                    background: #fff;
                    border-radius: 25px;
                    padding: 22px 34px;
                    text-align: center;
                    color: #16204c;
                    box-shadow: 0 20px 70px rgba(0,0,0,0.65);
                    transition: transform .25s ease, opacity .25s ease;
                }
                .custom-toast.show {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }

                @media(max-width: 850px) {
                    .title-area h1 { font-size: 20px; }
                    .pill-hud { min-width: 75px; padding: 6px 10px; }
                    .pill-hud b { font-size: 16px; }
                    .pill-hud small { font-size: 9px; }
                    .zone-head-box { height: 48px; font-size: 14px; }
                    .zone-body-box { padding: 6px; gap: 6px; }
                    .card-item { padding: 7px; min-height: 48px; border-radius: 12px; }
                    .card-item .ico { width: 28px; height: 28px; font-size: 16px; }
                    .card-item b { font-size: 11px; }
                    .card-item small { font-size: 9px; }
                    .deck-bar { min-height: 74px; padding: 8px; }
                    .deck-bar .card-item { min-width: 125px; }
                    .ctrl-btn { width: 36px; height: 36px; font-size: 14px; }
                }
            `}} />

            {/* ══ 1. GÖKYÜZÜ, PARILDAYAN YILDIZLAR, HİLAL VE CAMİ SİLÜETİ ══ */}
            <div id="sky" className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                {stars.map(s => (
                    <i 
                        key={s.id} 
                        className="star" 
                        style={{ 
                            left: s.left, 
                            top: s.top, 
                            animationDelay: s.delay,
                            width: s.size,
                            height: s.size 
                        }} 
                    />
                ))}
            </div>

            <div className="moon" aria-hidden="true" />

            <div className="mosque" aria-hidden="true">
                <div className="dome" />
                <div className="minaret m1" />
                <div className="minaret m2" />
            </div>

            {/* ══ 2. ÜST BİLGİ PİLLERİ (HUD) ══ */}
            <div className="absolute left-[2vw] right-[2vw] top-[1.8vh] flex items-center justify-between gap-3 z-20 pointer-events-auto">
                {/* Sol Piller: Puan ve Seviye */}
                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="pill-hud">
                        ⭐ <b>{score}</b>
                        <small>Puan</small>
                    </div>
                    <div className="pill-hud">
                        🏆 <b>{level}</b>
                        <small>Seviye</small>
                    </div>
                </div>

                {/* Sağ Piller: Süre ve Öğretmen Araçları */}
                <div className="flex items-center gap-2 sm:gap-3">
                    {/* Öğretmen Çözüm Butonu */}
                    {isTeacher && (
                        <button
                            type="button"
                            onClick={handleTeacherSolve}
                            className="pill-hud flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-900/80 transition-colors border-cyan-400/50"
                            title="Öğretmen Modu: Tüm kartları doğru sandıklara yerleştir"
                        >
                            <span className="text-sm sm:text-base font-black text-cyan-300 flex items-center gap-1">
                                <Eye className="w-4 h-4" /> Çözüm
                            </span>
                            <small className="text-cyan-200">Öğretmen</small>
                        </button>
                    )}

                    {/* Kart İlerleme Pili (Geri sayım olmadan yerleşim durumu) */}
                    <div className="pill-hud">
                        🎯 <b>{placedCount}/{allItems.length}</b>
                        <small>İlerleme</small>
                    </div>
                </div>
            </div>

            {/* ══ 3. ORTA BAŞLIK VE ROZET ALANI ══ */}
            <div className="title-area absolute top-[1.8vh] left-1/2 -translate-x-1/2 text-center z-10 pointer-events-none px-2 max-w-[60vw]">
                <h1 className="truncate">{pageTitle}</h1>
                <span className="truncate">{pageDescription}</span>
            </div>

            {/* ══ 4. OYUN ALANI: KATEGORİ SANDIKLARI (BOARD) ══ */}
            <div 
                className="absolute left-[2vw] sm:left-[3vw] right-[2vw] sm:right-[3vw] top-[16.5vh] bottom-[16vh] grid gap-2 sm:gap-3 lg:gap-4 z-10 pointer-events-auto"
                style={{ gridTemplateColumns: boardGridColumns }}
            >
                {categories.map((cat, idx) => {
                    const colorClass = getCategoryColorClass(cat, idx);
                    const isOver = dragOverZoneId === cat.id;
                    const catItems = allItems.filter(item => placements[item.id] === cat.id);
                    const icon = getCategoryIcon(cat.name, idx);

                    return (
                        <div
                            key={cat.id}
                            className={cn(
                                "zone-box",
                                colorClass,
                                isOver && "over",
                                selectedCardId && "cursor-pointer ring-2 ring-white/40"
                            )}
                            onClick={() => handleZoneClick(cat.id)}
                            onDragOver={(e) => handleDragOver(e, cat.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, cat.id)}
                        >
                            {/* Kategori Başlığı */}
                            <div className="zone-head-box">
                                <span>{icon}</span>
                                <span>{cat.name}</span>
                                <span className="text-xs sm:text-sm font-black px-2 py-0.5 rounded-full bg-black/40 text-white/90 border border-white/20 ml-1">
                                    {catItems.length}
                                </span>
                            </div>

                            {/* Kategori Gövdesi (Yerleştirilen Kartlar) */}
                            <div className="zone-body-box">
                                {catItems.map((item) => (
                                    <div key={item.id} className="card-item !cursor-default !bg-white/95">
                                        <div className="ico">{item.icon}</div>
                                        <div className="min-w-0 flex-1">
                                            <b className="truncate">{item.text}</b>
                                            {item.subtitle && <small className="truncate">{item.subtitle}</small>}
                                        </div>
                                    </div>
                                ))}

                                {catItems.length === 0 && (
                                    <div className="flex-1 flex flex-col items-center justify-center p-3 text-center border-2 border-dashed border-white/20 rounded-2xl opacity-60">
                                        <span className="text-2xl mb-1">📥</span>
                                        <span className="text-xs font-bold text-white/80">
                                            {selectedCardId ? '👉 Buraya Bırak' : 'Kartları buraya sürükleyin'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ══ 5. ALT KART DESTESİ (DECK) ══ */}
            <div className="deck-bar absolute left-[2vw] sm:left-[3vw] right-[2vw] sm:right-[3vw] bottom-[1.8vh] h-[13vh] min-h-[86px] max-h-[110px] z-20 pointer-events-auto">
                {unplacedItems.length > 0 ? (
                    unplacedItems.map(item => {
                        const isSelected = selectedCardId === item.id;
                        return (
                            <div
                                key={item.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, item.id)}
                                onClick={() => handleCardClick(item)}
                                className={cn(
                                    "card-item",
                                    isSelected && "selected"
                                )}
                                title={item.subtitle ? `${item.text} (${item.subtitle})` : item.text}
                            >
                                <div className="ico">{item.icon}</div>
                                <div className="min-w-0 flex-1">
                                    <b className="truncate">{item.text}</b>
                                    {item.subtitle && <small className="truncate">{item.subtitle}</small>}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="w-full flex items-center justify-center text-center text-amber-200 font-black text-sm sm:text-base drop-shadow-md">
                        🎉 Tebrikler! Tüm kartları başarıyla yerleştirdiniz!
                    </div>
                )}
            </div>

            {/* ══ 6. SOL ALT İPUCU VE YÖNLENDİRME ROZETİ ══ */}
            <div className="help absolute left-[2vw] bottom-[1.5vh] z-30 hidden sm:block pointer-events-none">
                💡 Bir kartı tut → doğru kutuya sürükle → bırak! Veya dokun ve seç!
            </div>

            {/* ══ 7. SAĞ ALT OYUN VE TAM EKRAN KONTROLLERİ (KULLANICININ İSTEDİĞİ TAM EKRAN BUTONU) ══ */}
            <div className="controls absolute right-[2vw] bottom-[1.3vh] z-30 flex items-center gap-2 pointer-events-auto">
                {/* Ses Aç / Kapa Butonu */}
                <button 
                    type="button" 
                    className="ctrl-btn" 
                    onClick={() => setIsMuted(prev => !prev)}
                    title={isMuted ? "Sesi Aç" : "Sesi Kapat"}
                >
                    {isMuted ? <VolumeX className="w-4 h-4 text-rose-300" /> : <Volume2 className="w-4 h-4 text-amber-300" />}
                </button>

                {/* Yeniden Başlat Butonu */}
                <button 
                    type="button" 
                    className="ctrl-btn" 
                    onClick={startGame}
                    title="Yeniden Başlat"
                >
                    <RotateCcw className="w-4 h-4" />
                </button>

                {/* ⛶ KULLANICININ ÖZEL İSTEĞİ: TAM EKRAN TUŞU ⛶ */}
                <button 
                    type="button" 
                    className="ctrl-btn !bg-emerald-600 hover:!bg-emerald-500 border-emerald-300" 
                    onClick={toggleFullscreen}
                    title={isFullscreen ? 'Tam Ekrandan Çık (Esc)' : 'Akıllı Tahta Tam Ekran'}
                >
                    {isFullscreen ? (
                        <Minimize2 className="w-4 h-4 text-white" />
                    ) : (
                        <Maximize2 className="w-4 h-4 text-white" />
                    )}
                </button>
            </div>

            {/* ══ 8. ORTA BİLDİRİM TOAST POPUP'I ══ */}
            <div 
                id="toast" 
                className={cn(
                    "custom-toast",
                    toast.show && "show"
                )}
            >
                <div className="text-5xl mb-1">{toast.icon}</div>
                <h2 className="text-2xl font-black text-slate-900 m-0">{toast.title}</h2>
                {toast.text && <p className="text-sm font-bold text-slate-600 mt-1 mb-0">{toast.text}</p>}
            </div>

            {/* ══ 9. OYUN SONU TEBRİK MODALI (OVERLAY) ══ */}
            {isGameOver && (
                <div 
                    id="overlay" 
                    className="absolute inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4"
                >
                    <div className="w-full max-w-lg bg-gradient-to-br from-[#172b67] to-[#0b1538] border-3 border-[#f4b83e] rounded-[30px] p-8 text-center shadow-2xl text-white">
                        <div className="text-6xl mb-2">🏆</div>
                        <h2 className="text-3xl font-black text-amber-300 mb-2">
                            Görev Tamamlandı!
                        </h2>
                        <p className="text-slate-200 text-base leading-relaxed mb-6 font-semibold">
                            Tebrikler! {allItems.length} kartın tamamını doğru sınıflandırdın. Puanın: {score}.
                        </p>
                        <button 
                            type="button" 
                            className="inline-flex items-center gap-2 border-0 rounded-full px-8 py-3.5 bg-gradient-to-r from-[#ffb11b] to-[#ff7b22] text-white font-black text-lg cursor-pointer shadow-lg shadow-orange-500/40 hover:scale-105 active:scale-95 transition-transform"
                            onClick={startGame}
                        >
                            <RotateCcw className="w-5 h-5" /> Yeniden Oyna
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
