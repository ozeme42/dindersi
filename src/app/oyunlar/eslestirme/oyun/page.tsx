'use client';

import { useState, useEffect, useCallback, Suspense, useRef, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getEslestirmeAction, submitEslestirmeScoreAction, type MatchingPair } from '../actions';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { 
    Loader2, CheckCircle2, XCircle, RotateCcw, Home, Trophy, 
    XOctagon, Maximize2, Minimize2, Volume2, VolumeX, Menu,
    Check, ArrowLeft, Eye, EyeOff, Sparkles, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { playSound } from '@/lib/audio-service';
import confetti from 'canvas-confetti';
import { db } from '@/lib/firebase';
import { collection, serverTimestamp, writeBatch, doc, increment } from 'firebase/firestore';
import { getGameBackUrl } from '@/lib/game-navigation';

// Wordwall Primary renk paleti (Ekran görüntüsündeki zengin tonlar)
const WORD_COLORS = [
    "bg-[#258146]", // Orman Yeşili (Medine, Ebu Talib)
    "bg-[#504bb5]", // Mor / İndigo (Abdulmüttalib, Amine)
    "bg-[#b23b25]", // Pas Kırmızısı (632, 571)
    "bg-[#1b76b2]", // Okyanus Mavisi (Ticaret, Ebu Leheb)
    "bg-[#583f2e]", // Koyu Kahve (Çobanlık)
    "bg-[#254d82]", // Gece Laciverti (Abdullah)
    "bg-[#8e5837]", // Sıcak Bronz (Haşimoğulları)
    "bg-[#2d8b4e]", // Açık Orman Yeşili
    "bg-[#5c49b6]", // Koyu Lavanta
    "bg-[#bf3921]", // Kiremit Kırmızısı
    "bg-[#156ea9]", // Gölet Mavisi
    "bg-[#684b39]", // Fındık Kabuğu Kahve
];

// Yazı Boyutu Seviyeleri (Akıllı Tahta & Kullanıcı Uyumu)
const FONT_LEVELS = [
    {
        name: '%85',
        termBtn: 'text-xs px-2.5 py-1',
        slotSize: 'w-24 sm:w-28 md:w-34 lg:w-38 h-8 sm:h-9 md:h-10 shrink-0',
        slotText: 'text-[11px] sm:text-xs',
        defText: 'text-xs sm:text-sm md:text-base'
    },
    {
        name: '%100',
        termBtn: 'text-xs sm:text-sm md:text-base px-3 sm:px-4 py-1.5 sm:py-2',
        slotSize: 'w-26 sm:w-32 md:w-38 lg:w-42 h-8.5 sm:h-10 md:h-11 lg:h-12 shrink-0',
        slotText: 'text-xs sm:text-sm',
        defText: 'text-xs sm:text-sm md:text-base lg:text-lg'
    },
    {
        name: '%115',
        termBtn: 'text-sm sm:text-base md:text-lg px-3.5 sm:px-4.5 py-1.5 sm:py-2',
        slotSize: 'w-28 sm:w-34 md:w-40 lg:w-44 h-9 sm:h-11 md:h-12 lg:h-13 shrink-0',
        slotText: 'text-xs sm:text-sm md:text-base',
        defText: 'text-sm sm:text-base md:text-lg lg:text-xl'
    },
    {
        name: '%130',
        termBtn: 'text-base sm:text-lg md:text-xl px-4 sm:px-5 py-2 sm:py-2.5',
        slotSize: 'w-30 sm:w-36 md:w-42 lg:w-46 h-10 sm:h-11 md:h-12 lg:h-13 shrink-0',
        slotText: 'text-sm sm:text-base',
        defText: 'text-base sm:text-lg md:text-xl lg:text-2xl'
    }
];

interface PairItem {
    id: string;
    content: string;
    pairId: string;
    colorClass: string;
}

function WordwallClassicMatchUp() {
    const { user } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();
    const gameContainerRef = useRef<HTMLDivElement>(null);

    // Veri state'leri
    const [allDefinitions, setAllDefinitions] = useState<PairItem[]>([]);
    const [allTerms, setAllTerms] = useState<PairItem[]>([]);
    const [gameState, setGameState] = useState<'loading' | 'playing' | 'error'>('loading');
    const [error, setError] = useState<string | null>(null);

    // Sayfalama (Wordwall ◀ 1 / 1 ▶ mantığı)
    const ITEMS_PER_PAGE = 12; // 6 sol + 6 sağ
    const [currentPage, setCurrentPage] = useState(1);

    // Eşleştirmeler: definitionId -> termId | null
    const [assignments, setAssignments] = useState<Record<string, string | null>>({});

    // Dokunmatik / Tıklama ile yerleştirme için seçili kelime
    const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
    const [dragOverDefId, setDragOverDefId] = useState<string | null>(null);

    // Yazı boyutu ve Hata Animasyon Durumu
    const [fontScaleLevel, setFontScaleLevel] = useState<number>(1);
    const [shakeDefId, setShakeDefId] = useState<string | null>(null);
    const currentFont = FONT_LEVELS[fontScaleLevel] || FONT_LEVELS[1];

    // Kontrol ve Değerlendirme
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [showAnswers, setShowAnswers] = useState(false);
    const [score, setScore] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);
    const [showMenuModal, setShowMenuModal] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    // Süre Sayacı
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Tam Ekran
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            gameContainerRef.current?.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    };

    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    const mode = searchParams.get('mode');
    const topicId = searchParams.get('topicId');
    const isMission = mode === 'mission';
    const courseName = searchParams.get('courseName') || '';
    const topicName = searchParams.get('topicName') || '';
    const gameContext = `Eşleştirme - ${courseName} > ${topicName}`;
    const backUrl = getGameBackUrl({ user, searchParams, defaultBackUrl: isMission ? '/student/gorevler' : '/oyunlar/eslestirme' });

    // Veri Çekme
    const fetchGameData = useCallback(async () => {
        setGameState('loading');
        setIsSubmitted(false);
        setShowAnswers(false);
        setAssignments({});
        setSelectedTermId(null);
        setElapsedSeconds(0);
        setScore(0);
        setIsScoreSaved(false);
        setCurrentPage(1);

        const params = {
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: searchParams.get('topicId') || undefined,
        };

        const result = await getEslestirmeAction(params);

        if (result.error || !result.pairs || result.pairs.length === 0) {
            setError(result.error || "Bu konu için eşleştirme verisi bulunamadı.");
            setGameState('error');
        } else {
            const rawDefs = result.pairs.filter(p => p.type === 'definition');
            const rawTerms = result.pairs.filter(p => p.type === 'term');

            if (rawDefs.length === 0 || rawTerms.length === 0) {
                setError("Eşleştirme kavram veya tanım verileri eksik.");
                setGameState('error');
                return;
            }

            // Her bir çifte sabit zengin Wordwall rengi ata
            const defItems: PairItem[] = rawDefs.map((d, idx) => ({
                id: d.id,
                content: d.content,
                pairId: d.pairId,
                colorClass: WORD_COLORS[idx % WORD_COLORS.length]
            }));

            const termItems: PairItem[] = rawTerms.map((t) => {
                const matchingDefIdx = rawDefs.findIndex(d => d.pairId === t.pairId);
                const colorIdx = matchingDefIdx >= 0 ? matchingDefIdx : 0;
                return {
                    id: t.id,
                    content: t.content,
                    pairId: t.pairId,
                    colorClass: WORD_COLORS[colorIdx % WORD_COLORS.length]
                };
            });

            setAllDefinitions(defItems);
            // Kelimeleri karıştır
            setAllTerms([...termItems].sort(() => Math.random() - 0.5));
            setGameState('playing');
        }
    }, [searchParams]);

    useEffect(() => {
        fetchGameData();
    }, [fetchGameData]);

    // Süre Sayacı
    useEffect(() => {
        if (gameState === 'playing' && !isSubmitted) {
            timerRef.current = setInterval(() => {
                setElapsedSeconds(prev => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [gameState, isSubmitted]);

    // Sayfa hesaplaması
    const totalPages = Math.max(1, Math.ceil(allDefinitions.length / ITEMS_PER_PAGE));
    const currentDefs = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return allDefinitions.slice(start, start + ITEMS_PER_PAGE);
    }, [allDefinitions, currentPage]);

    // İki sütuna böl (Sol ve Sağ sütun)
    const leftDefs = useMemo(() => {
        const mid = Math.ceil(currentDefs.length / 2);
        return currentDefs.slice(0, mid);
    }, [currentDefs]);

    const rightDefs = useMemo(() => {
        const mid = Math.ceil(currentDefs.length / 2);
        return currentDefs.slice(mid);
    }, [currentDefs]);

    // İki sütundaki satırları tam hizada eşitlemek için satır sayısı
    const maxRows = useMemo(() => {
        return Math.max(leftDefs.length, rightDefs.length, 1);
    }, [leftDefs.length, rightDefs.length]);

    // Havuzdaki (henüz herhangi bir yuvaya yerleştirilmemiş) kelimeler
    const assignedTermIds = Object.values(assignments).filter(Boolean) as string[];
    const unassignedTerms = useMemo(() => {
        return allTerms.filter(t => !assignedTermIds.includes(t.id));
    }, [allTerms, assignedTermIds]);

    // Yerleştirme Sayaçları
    const placedCount = assignedTermIds.length;
    const totalCount = allDefinitions.length;

    // Oyun Başarıyla Bittiğinde (Tüm kavramlar doğru eşleştiğinde)
    const handleGameWin = useCallback((currentScore?: number) => {
        setIsSubmitted(true);
        const finalScore = currentScore ?? allDefinitions.length * 10;
        setScore(finalScore);
        if (!isMuted) playSound('win');
        confetti({
            particleCount: 150,
            spread: 90,
            origin: { y: 0.6 }
        });
        toast({
            title: "Tebrikler!",
            description: `${allDefinitions.length}/${allDefinitions.length} Tüm eşleştirmeler doğru tamamlandı!`,
            className: "bg-emerald-600 text-white font-bold"
        });
    }, [allDefinitions.length, isMuted, toast]);

    // Doğan / Denenen Eşleştirme Kontrolü (Doğru Olmayan Yerleşmesin!)
    const tryMatch = useCallback((termId: string, defId: string) => {
        if (isSubmitted) return;

        const term = allTerms.find(t => t.id === termId);
        const def = allDefinitions.find(d => d.id === defId);
        if (!term || !def) return;

        // DOĞRULUK KONTROLÜ
        if (term.pairId === def.pairId) {
            // DOĞRU: Yuvaya yerleşsin
            if (!isMuted) playSound('correct');
            setSelectedTermId(null);

            setAssignments(prev => {
                const next = { ...prev, [defId]: termId };
                const currentMatched = Object.values(next).filter(Boolean).length;
                if (currentMatched === allDefinitions.length) {
                    setTimeout(() => {
                        handleGameWin();
                    }, 200);
                }
                return next;
            });
        } else {
            // YANLIŞ: Yerleşmesin, hata sesi çal ve yuvayı salla
            if (!isMuted) playSound('incorrect');
            setShakeDefId(defId);
            setTimeout(() => setShakeDefId(null), 500);
            setSelectedTermId(null);
        }
    }, [allDefinitions, allTerms, handleGameWin, isMuted, isSubmitted]);

    // --- ETKİLEŞİM MANTIĞI ---

    // 1. Kelimeye tıklama (Havuzda)
    const handleTermClick = (termId: string) => {
        if (isSubmitted) return;

        // Havuzdaki kelimeye tıklandığında seç / seçimi kaldır
        if (!isMuted) playSound('click');
        if (selectedTermId === termId) {
            setSelectedTermId(null);
        } else {
            setSelectedTermId(termId);
        }
    };

    // 2. Yuvaya (Slot) tıklama
    const handleSlotClick = (defId: string) => {
        if (isSubmitted) return;
        // Eğer bu yuvaya zaten doğru kelime yerleşmişse tıklanmasın
        if (assignments[defId]) return;

        // Halihazırda bir kelime seçilmişse, eşleştirmeyi dene (Doğru olmayan yerleşmez)
        if (selectedTermId) {
            tryMatch(selectedTermId, defId);
        }
    };

    // 3. Sürükle ve Bırak (Drag & Drop)
    const handleDragStart = (e: React.DragEvent, termId: string) => {
        if (isSubmitted) return;
        e.dataTransfer.setData('text/plain', termId);
        setSelectedTermId(termId);
    };

    const handleDragOver = (e: React.DragEvent, defId: string) => {
        e.preventDefault();
        if (isSubmitted) return;
        setDragOverDefId(defId);
    };

    const handleDragLeave = () => {
        setDragOverDefId(null);
    };

    const handleDrop = (e: React.DragEvent, defId: string) => {
        e.preventDefault();
        setDragOverDefId(null);
        if (isSubmitted) return;
        if (assignments[defId]) return;

        const droppedTermId = e.dataTransfer.getData('text/plain') || selectedTermId;
        if (!droppedTermId) return;

        tryMatch(droppedTermId, defId);
    };

    // Skor Kaydetme
    const handleSaveScore = async () => {
        if (isSaving || isScoreSaved || !user || score <= 0) {
            router.push(isMission ? '/student/gorevler' : backUrl);
            return;
        }

        setIsSaving(true);
        try {
            const isAllCorrect = score === allDefinitions.length * 10;
            if (isMission && topicId) {
                const batch = writeBatch(db);
                const eventRef = doc(collection(db, 'scoreEvents'));
                batch.set(eventRef, {
                    userId: user.uid,
                    points: score,
                    context: topicId,
                    gameType: 'eslestirme',
                    timestamp: serverTimestamp(),
                    isMission: true,
                    completed: isAllCorrect
                });
                if (score > 0) {
                    const userRef = doc(db, 'users', user.uid);
                    batch.update(userRef, { score: increment(score) });
                }
                await batch.commit();
                toast({
                    title: isAllCorrect ? "Görev Başarılı!" : "Puan Kaydedildi",
                    description: isAllCorrect ? "Tüm eşleştirmeler doğru yapıldı." : "Puanınız profilinize işlendi.",
                    className: "bg-emerald-600 text-white"
                });
            } else {
                await submitEslestirmeScoreAction(user.uid, score, gameContext);
                toast({ title: 'Başarılı!', description: 'Puanınız kaydedildi.' });
            }
            setIsScoreSaved(true);
        } catch (err) {
            toast({ title: 'Hata', description: "Puan kaydedilemedi.", variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    // Yeniden Başlat
    const handleReset = () => {
        setAssignments({});
        setSelectedTermId(null);
        setIsSubmitted(false);
        setShowAnswers(false);
        setScore(0);
        setIsScoreSaved(false);
        setElapsedSeconds(0);
        setShakeDefId(null);
        setAllTerms(prev => [...prev].sort(() => Math.random() - 0.5));
    };

    // Zaman formatı: "0:13"
    const formatTime = (totalSeconds: number) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (gameState === 'loading') {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center bg-[#f3b538] gap-4">
                <Loader2 className="h-14 w-14 animate-spin text-slate-800" />
                <p className="text-slate-900 font-extrabold text-xl animate-pulse">Eşleştirme Yükleniyor...</p>
            </div>
        );
    }

    if (gameState === 'error') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#f3b538] p-6 text-center">
                <div className="max-w-md w-full p-8 rounded-3xl bg-white/95 border-2 border-amber-600 shadow-2xl space-y-5">
                    <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center mx-auto text-amber-700">
                        <XOctagon className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">Eşleştirme Verisi Bulunamadı</h2>
                    <p className="text-slate-700 text-sm leading-relaxed">
                        {error || "Bu konu için henüz eşleştirilebilir kavram veya tanım verisi eklenmemiş."}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button 
                            onClick={fetchGameData} 
                            className="flex-1 py-3 px-4 border-2 border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl font-bold"
                        >
                            Tekrar Dene
                        </button>
                        <button 
                            onClick={() => router.push(backUrl)} 
                            className="flex-1 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl"
                        >
                            Geri Dön
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div 
            ref={gameContainerRef} 
            className="h-screen w-screen overflow-hidden flex flex-col justify-between select-none relative font-sans"
            style={{
                // Wordwall Theme 2: Sıcak altın sarısı / kehribar karo gradyanı
                background: 'linear-gradient(135deg, #f9c748 0%, #eea129 50%, #df8b1a 100%)',
            }}
        >
            {/* Arka Plan Geometrik Elmas Deseni (Wordwall Diamond Grid) */}
            <div 
                className="absolute inset-0 pointer-events-none opacity-25"
                style={{
                    backgroundImage: `
                        linear-gradient(45deg, rgba(255,255,255,0.2) 25%, transparent 25%), 
                        linear-gradient(-45deg, rgba(255,255,255,0.2) 25%, transparent 25%), 
                        linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.2) 75%), 
                        linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.2) 75%)
                    `,
                    backgroundSize: '80px 80px',
                    backgroundPosition: '0 0, 0 40px, 40px -40px, -40px 0px'
                }}
            />

            {/* 1. ÜST BAR: SÜRE (SOL) & SAYFALAMA (ORTA) */}
            <div className="relative z-10 w-full px-4 sm:px-8 md:px-12 lg:px-16 pt-2 pb-1 flex items-center justify-between">
                {/* Sol: Süre (Örn: 0:13) */}
                <div className="font-sans font-bold text-slate-950 text-lg sm:text-xl md:text-2xl tracking-tight">
                    {formatTime(elapsedSeconds)}
                </div>

                {/* Orta: ◀ 1 / 1 ▶ */}
                <div className="flex items-center gap-2 text-slate-950 font-extrabold text-base sm:text-lg md:text-xl">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                        className="p-1 hover:opacity-75 disabled:opacity-30 cursor-pointer disabled:cursor-default"
                        title="Önceki Sayfa"
                    >
                        ◀
                    </button>
                    <span>{currentPage} / {totalPages}</span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                        className="p-1 hover:opacity-75 disabled:opacity-30 cursor-pointer disabled:cursor-default"
                        title="Sonraki Sayfa"
                    >
                        ▶
                    </button>
                </div>

                {/* Sağ: Boş tutucu (Dengeleme için) */}
                <div className="w-12 sm:w-16"></div>
            </div>

            {/* 2. ÜST KUTU: KELİME HAVUZU (WORD BANK BOX - SAĞA VE SOLA TAM YASLANMIŞ) */}
            <div className="relative z-10 w-full px-4 sm:px-8 md:px-12 lg:px-16 shrink-0 my-0.5 sm:my-1">
                <div className="border-2 border-[#b84a28] bg-[#eaab4c]/35 backdrop-blur-xs rounded-2xl p-2 sm:p-2.5 shadow-inner">
                    <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 min-h-[44px] sm:min-h-[50px]">
                        {unassignedTerms.length === 0 ? (
                            <div className="flex items-center justify-center gap-2 py-1 text-slate-900 font-black text-xs sm:text-sm md:text-base animate-pulse">
                                <Sparkles className="w-4 h-4 text-emerald-800" />
                                <span>Tebrikler! Tüm kavramlar başarıyla eşleştirildi.</span>
                                <Sparkles className="w-4 h-4 text-emerald-800" />
                            </div>
                        ) : (
                            unassignedTerms.map(term => {
                                const isSelected = selectedTermId === term.id;
                                return (
                                    <button
                                        key={term.id}
                                        draggable={!isSubmitted}
                                        onDragStart={(e) => handleDragStart(e, term.id)}
                                        onClick={() => handleTermClick(term.id)}
                                        className={cn(
                                            "relative rounded-xl font-extrabold text-white transition-all duration-150 select-none touch-manipulation cursor-grab active:cursor-grabbing shadow-md border-b-2 border-black/25 flex items-center justify-center shrink-0",
                                            term.colorClass,
                                            currentFont.termBtn,
                                            "hover:brightness-110 active:translate-y-0.5",
                                            isSelected && "ring-4 ring-yellow-200 scale-105 shadow-xl -translate-y-1"
                                        )}
                                    >
                                        <span>{term.content}</span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* 3. ANA ALAN: İKİ SÜTUN TANIMLAR VE YUVALAR (SAĞA VE SOLA TAM YASLANMIŞ) */}
            <div className="relative z-10 w-full px-4 sm:px-8 md:px-12 lg:px-16 flex-1 min-h-0 flex flex-col justify-center py-1 sm:py-2 overflow-y-auto">
                <div className="w-full h-full grid grid-cols-2 gap-x-8 sm:gap-x-14 md:gap-x-20 lg:gap-x-32 xl:gap-x-44">
                    
                    {/* SOL SÜTUN */}
                    <div 
                        className="h-full grid items-center w-full"
                        style={{ 
                            gridTemplateRows: `repeat(${maxRows}, minmax(0, 1fr))`,
                            rowGap: 'clamp(3px, 1vh, 12px)'
                        }}
                    >
                        {leftDefs.map((def) => {
                            const assignedTermId = assignments[def.id];
                            const assignedTerm = allTerms.find(t => t.id === assignedTermId);
                            const isDragOver = dragOverDefId === def.id;
                            const isShaking = shakeDefId === def.id;

                            return (
                                <div key={def.id} className="flex items-center gap-2.5 sm:gap-4 w-full min-h-0 group">
                                    {/* Yuva (Slot) */}
                                    <div
                                        onClick={() => handleSlotClick(def.id)}
                                        onDragOver={(e) => handleDragOver(e, def.id)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, def.id)}
                                        className={cn(
                                            currentFont.slotSize,
                                            "rounded-xl border flex-shrink-0 transition-all duration-150 flex items-center justify-center p-0.5 relative touch-manipulation select-none",
                                            // Yanlış eşleşme sallanma animasyonu
                                            isShaking && "animate-slot-shake border-rose-600 bg-rose-200/95 ring-4 ring-rose-400 scale-105",
                                            // Boş Yuva (Wordwall Ekran Görüntüsü ile birebir)
                                            !assignedTerm && !isShaking && (
                                                isDragOver
                                                    ? "border-amber-900 bg-amber-200/90 ring-2 ring-white scale-105"
                                                    : selectedTermId
                                                        ? "border-amber-700/80 bg-[#e7b660] ring-2 ring-yellow-300 animate-pulse cursor-pointer shadow-inner"
                                                        : "border-[#b87a2a] bg-[#eab35a]/85 shadow-[inset_0_2px_4px_rgba(0,0,0,0.22)] hover:border-amber-800 cursor-pointer"
                                            ),
                                            // Dolu Yuva (Doğru eşleştiğinde kilitlenir)
                                            assignedTerm && (
                                                "border-transparent p-0 overflow-hidden shadow-md cursor-default"
                                            )
                                        )}
                                    >
                                        {assignedTerm ? (
                                            <div className={cn(
                                                "w-full h-full rounded-xl flex items-center justify-center px-1 text-center text-white font-extrabold leading-tight relative shadow-sm border-b-2 border-black/25",
                                                assignedTerm.colorClass,
                                                currentFont.slotText
                                            )}>
                                                <span className="leading-tight break-words px-1 text-center select-none">{assignedTerm.content}</span>
                                                
                                                {/* Doğru Eşleşti Kontrol Rozeti */}
                                                <div className="absolute -top-1.5 -right-1.5 bg-white rounded-full p-0.5 shadow-md">
                                                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 stroke-[3]" />
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>

                                    {/* Tanım Metni (Label - Hiçbir metin gizlenmez / kesilmez) */}
                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                        <span className={cn(
                                            "font-extrabold text-slate-950 leading-snug sm:leading-tight break-words select-none",
                                            currentFont.defText
                                        )}>
                                            {def.content}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* SAĞ SÜTUN */}
                    <div 
                        className="h-full grid items-center w-full"
                        style={{ 
                            gridTemplateRows: `repeat(${maxRows}, minmax(0, 1fr))`,
                            rowGap: 'clamp(3px, 1vh, 12px)'
                        }}
                    >
                        {rightDefs.map((def) => {
                            const assignedTermId = assignments[def.id];
                            const assignedTerm = allTerms.find(t => t.id === assignedTermId);
                            const isDragOver = dragOverDefId === def.id;
                            const isShaking = shakeDefId === def.id;

                            return (
                                <div key={def.id} className="flex items-center gap-2.5 sm:gap-4 w-full min-h-0 group">
                                    {/* Yuva (Slot) */}
                                    <div
                                        onClick={() => handleSlotClick(def.id)}
                                        onDragOver={(e) => handleDragOver(e, def.id)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, def.id)}
                                        className={cn(
                                            currentFont.slotSize,
                                            "rounded-xl border flex-shrink-0 transition-all duration-150 flex items-center justify-center p-0.5 relative touch-manipulation select-none",
                                            // Yanlış eşleşme sallanma animasyonu
                                            isShaking && "animate-slot-shake border-rose-600 bg-rose-200/95 ring-4 ring-rose-400 scale-105",
                                            // Boş Yuva
                                            !assignedTerm && !isShaking && (
                                                isDragOver
                                                    ? "border-amber-900 bg-amber-200/90 ring-2 ring-white scale-105"
                                                    : selectedTermId
                                                        ? "border-amber-700/80 bg-[#e7b660] ring-2 ring-yellow-300 animate-pulse cursor-pointer shadow-inner"
                                                        : "border-[#b87a2a] bg-[#eab35a]/85 shadow-[inset_0_2px_4px_rgba(0,0,0,0.22)] hover:border-amber-800 cursor-pointer"
                                            ),
                                            // Dolu Yuva
                                            assignedTerm && (
                                                "border-transparent p-0 overflow-hidden shadow-md cursor-default"
                                            )
                                        )}
                                    >
                                        {assignedTerm ? (
                                            <div className={cn(
                                                "w-full h-full rounded-xl flex items-center justify-center px-1 text-center text-white font-extrabold leading-tight relative shadow-sm border-b-2 border-black/25",
                                                assignedTerm.colorClass,
                                                currentFont.slotText
                                            )}>
                                                <span className="leading-tight break-words px-1 text-center select-none">{assignedTerm.content}</span>
                                                
                                                {/* Doğru Eşleşti Kontrol Rozeti */}
                                                <div className="absolute -top-1.5 -right-1.5 bg-white rounded-full p-0.5 shadow-md">
                                                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 stroke-[3]" />
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>

                                    {/* Tanım Metni (Label - Hiçbir metin gizlenmez / kesilmez) */}
                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                        <span className={cn(
                                            "font-extrabold text-slate-950 leading-snug sm:leading-tight break-words select-none",
                                            currentFont.defText
                                        )}>
                                            {def.content}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                </div>
            </div>

            {/* 4. ALT ÇUBUK: MENÜ (SOL) | FONT & İLERLEME (ORTA) | SES & TAM EKRAN (SAĞ) */}
            <div className="relative z-20 w-full px-4 sm:px-8 md:px-12 lg:px-16 py-2 sm:py-2.5 flex items-center justify-between">
                {/* Sol: Menü Butonu (≡) */}
                <button
                    onClick={() => setShowMenuModal(true)}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#f5e6cb] hover:bg-[#ede0c2] border border-[#d2b896] text-slate-900 flex items-center justify-center shadow-xs cursor-pointer active:translate-y-0.5 transition-all"
                    title="Menü"
                >
                    <Menu className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
                </button>

                {/* Orta: YAZI BOYUTU (A- / A+) VE İLERLEME / TAMAMLANDI BİLGİSİ (Cevapları gönder kaldırıldı) */}
                {!isSubmitted ? (
                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Font Büyütme / Küçültme Kontrolü */}
                        <div className="flex items-center bg-[#f5e6cb] border border-[#d2b896] rounded-lg px-2 py-1 shadow-xs">
                            <span className="text-xs font-bold text-slate-800 hidden sm:inline mr-1">Yazı:</span>
                            <button
                                onClick={() => setFontScaleLevel(prev => Math.max(0, prev - 1))}
                                disabled={fontScaleLevel === 0}
                                className="w-7 h-7 rounded hover:bg-[#ede0c2] active:bg-[#e4d4b6] disabled:opacity-30 font-black text-sm flex items-center justify-center text-slate-900 cursor-pointer disabled:cursor-default transition-all"
                                title="Yazı Boyutunu Küçült"
                            >
                                A-
                            </button>
                            <span className="text-xs font-extrabold text-slate-900 min-w-8 text-center select-none">
                                {currentFont.name}
                            </span>
                            <button
                                onClick={() => setFontScaleLevel(prev => Math.min(FONT_LEVELS.length - 1, prev + 1))}
                                disabled={fontScaleLevel === FONT_LEVELS.length - 1}
                                className="w-7 h-7 rounded hover:bg-[#ede0c2] active:bg-[#e4d4b6] disabled:opacity-30 font-black text-sm flex items-center justify-center text-slate-900 cursor-pointer disabled:cursor-default transition-all"
                                title="Yazı Boyutunu Büyüt"
                            >
                                A+
                            </button>
                        </div>

                        {/* Eşleşen Kavram Sayacı */}
                        <div className="bg-[#f5e6cb] border border-[#d2b896] rounded-lg px-3 py-1.5 shadow-xs font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5 select-none">
                            <span>Eşleşen:</span>
                            <span className="text-emerald-700 font-black">{placedCount}</span>
                            <span>/</span>
                            <span>{totalCount}</span>
                        </div>

                        {/* Sıfırla Butonu */}
                        <button
                            onClick={handleReset}
                            className="bg-[#f5e6cb] hover:bg-[#ede0c2] active:bg-[#e4d4b6] border border-[#d2b896] rounded-lg px-2.5 sm:px-3 py-1.5 shadow-xs font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-1 cursor-pointer transition-all"
                            title="Yeniden Başlat"
                        >
                            <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                            <span className="hidden sm:inline">Sıfırla</span>
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="bg-emerald-600 text-white font-extrabold text-xs sm:text-sm px-4 py-2 rounded-lg shadow-sm flex items-center gap-1.5 animate-pulse">
                            <Check className="w-4 h-4 stroke-[3]" />
                            <span>Tebrikler! Tamamlandı!</span>
                        </div>

                        {/* Yeniden Başlat */}
                        <button
                            onClick={handleReset}
                            className="bg-[#f5e6cb] hover:bg-[#ede0c2] active:bg-[#e4d4b6] border border-[#d2b896] text-slate-900 font-extrabold text-xs sm:text-sm px-4 py-2 rounded-lg shadow-xs cursor-pointer transition-all"
                        >
                            Yeniden başlat
                        </button>

                        {/* Skoru Kaydet (Giriş yapılmışsa) */}
                        {user && score > 0 && !isScoreSaved && (
                            <button
                                onClick={handleSaveScore}
                                disabled={isSaving}
                                className="bg-emerald-700 hover:bg-emerald-600 border border-emerald-800 text-white font-extrabold text-xs sm:text-sm px-4 py-2 rounded-lg shadow-xs cursor-pointer transition-all"
                            >
                                {isSaving ? "Kaydediliyor..." : (isMission ? "Görevi kaydet" : "Skoru kaydet")}
                            </button>
                        )}
                    </div>
                )}

                {/* Sağ: Ses & Tam Ekran İkonları */}
                <div className="flex items-center gap-3 text-slate-900">
                    <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="hover:opacity-75 cursor-pointer"
                        title={isMuted ? "Sesi Aç" : "Sesi Kapat"}
                    >
                        {isMuted ? (
                            <VolumeX className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
                        ) : (
                            <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
                        )}
                    </button>

                    <button
                        onClick={toggleFullscreen}
                        className="hover:opacity-75 cursor-pointer"
                        title={isFullscreen ? "Tam Ekrandan Çık" : "Tam Ekran"}
                    >
                        {isFullscreen ? (
                            <Minimize2 className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
                        ) : (
                            <Maximize2 className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
                        )}
                    </button>
                </div>
            </div>

            {/* MENÜ MODALI */}
            {showMenuModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-[#f8eedc] border-2 border-[#d2b896] rounded-2xl p-6 max-w-xs w-full shadow-2xl text-center space-y-4">
                        <div className="flex items-center justify-between border-b border-[#d2b896] pb-2">
                            <h3 className="font-extrabold text-lg text-slate-900">Menü</h3>
                            <button onClick={() => setShowMenuModal(false)} className="text-slate-600 hover:text-slate-900">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex flex-col gap-2.5">
                            <button
                                onClick={() => {
                                    handleReset();
                                    setShowMenuModal(false);
                                }}
                                className="w-full py-2.5 px-4 rounded-xl bg-white border border-[#d2b896] text-slate-900 font-extrabold hover:bg-[#ede0c2] transition-all text-sm"
                            >
                                Oyunu Yeniden Başlat
                            </button>

                            <button
                                onClick={() => {
                                    setShowMenuModal(false);
                                    router.push(backUrl);
                                }}
                                className="w-full py-2.5 px-4 rounded-xl bg-white border border-[#d2b896] text-slate-900 font-extrabold hover:bg-[#ede0c2] transition-all text-sm"
                            >
                                Çıkış / Konu Değiştir
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Animasyon Stili (Hatalı eşleşmede sallanma) */}
            <style jsx global>{`
                @keyframes slotShake {
                    0%, 100% { transform: translateX(0); }
                    20%, 60% { transform: translateX(-7px); }
                    40%, 80% { transform: translateX(7px); }
                }
                .animate-slot-shake {
                    animation: slotShake 0.4s ease-in-out;
                }
            `}</style>
        </div>
    );
}

export default function EslestirmeOyunPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen w-full flex-col items-center justify-center bg-[#f3b538] gap-4">
                <Loader2 className="h-14 w-14 animate-spin text-slate-800" />
                <p className="text-slate-900 font-extrabold text-xl animate-pulse">Eşleştirme Yükleniyor...</p>
            </div>
        }>
            <WordwallClassicMatchUp />
        </Suspense>
    );
}