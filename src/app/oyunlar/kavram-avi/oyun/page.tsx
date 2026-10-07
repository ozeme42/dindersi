'use client';

import { useState, useEffect, Suspense, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getConceptHuntAction, submitConceptHuntScoreAction } from '../actions';
import type { Anagram } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { 
    Loader2, ArrowLeft, RotateCcw, Volume2, VolumeX, 
    Maximize2, Minimize2, Menu, X, Sparkles, Check, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { GameEndScreen } from '@/components/game-end-screen';
import { playSound } from '@/lib/audio-service';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, serverTimestamp, writeBatch, doc, increment } from 'firebase/firestore';
import confetti from 'canvas-confetti';
import { getGameBackUrl } from '@/lib/game-navigation';

// Boyut Ölçek Katmanları
const SCALE_LEVELS = [
    { name: '%85', factor: 0.85 },
    { name: '%100', factor: 1.0 },
    { name: '%115', factor: 1.15 },
    { name: '%130', factor: 1.30 },
];

interface LetterItem {
    id: string;
    char: string;
}

interface QuestionProgress {
    pool: LetterItem[];
    slots: (LetterItem | null)[];
    isSolved: boolean;
}

// Wordwall Klasik Tema Harf Karosu (Koyu Gri / Antrasit Kare Buton)
function WordwallLetterTile({ 
    char, 
    isCorrect, 
    isShaking, 
    onClick, 
    onDragStart, 
    draggable = false,
    size,
    fontSize,
    className
}: { 
    char: string; 
    isCorrect?: boolean; 
    isShaking?: boolean; 
    onClick?: () => void; 
    onDragStart?: (e: React.DragEvent) => void; 
    draggable?: boolean;
    size: number;
    fontSize: number;
    className?: string;
}) {
    return (
        <div 
            onClick={onClick}
            draggable={draggable}
            onDragStart={onDragStart}
            style={{
                width: `${size}px`,
                height: `${size}px`,
                fontSize: `${fontSize}px`,
            }}
            className={cn(
                "rounded-lg sm:rounded-xl flex items-center justify-center font-extrabold select-none cursor-pointer transition-all duration-150 touch-manipulation active:scale-95 shrink-0",
                isCorrect 
                    ? "bg-gradient-to-b from-emerald-500 to-emerald-600 border border-emerald-400 text-white shadow-md shadow-emerald-500/30 ring-2 ring-emerald-300"
                    : isShaking 
                        ? "bg-gradient-to-b from-rose-500 to-rose-600 border border-rose-400 text-white animate-slot-shake shadow-md shadow-rose-500/30 ring-2 ring-rose-400"
                        : "bg-gradient-to-b from-[#636363] via-[#525252] to-[#3f3f3f] border border-neutral-600/70 text-white shadow-md shadow-black/25 hover:brightness-110",
                className
            )}
            title={isCorrect ? undefined : "Kaldırmak veya yerleştirmek için dokunun"}
        >
            <span className="leading-none select-none tracking-wide drop-shadow-xs">
                {char.toLocaleUpperCase('tr-TR')}
            </span>
        </div>
    );
}

function KavramAviGame() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const gameContainerRef = useRef<HTMLDivElement>(null);
    const mainAreaRef = useRef<HTMLDivElement>(null);
    
    // Veri state'leri
    const [questions, setQuestions] = useState<Anagram[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Her soruya özel havuz ve yuva durumları
    const [progressMap, setProgressMap] = useState<Record<number, QuestionProgress>>({});
    
    // Hata / Başarı durumları (Yanlış harfin yerleşmesini engelleyen anlık sallantı)
    const [shakingLetterId, setShakingLetterId] = useState<string | null>(null);
    const [shakingSlotIdx, setShakingSlotIdx] = useState<number | null>(null);
    const [dragOverSlotIndex, setDragOverSlotIndex] = useState<number | null>(null);

    // Oyun ve Kontrol State'leri
    const [score, setScore] = useState(0);
    const [gameState, setGameState] = useState<'loading' | 'playing' | 'finished'>('loading');
    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);
    const [showMenuModal, setShowMenuModal] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Dinamik Ekran Ölçümü
    const [containerDimensions, setContainerDimensions] = useState({ 
        width: typeof window !== 'undefined' ? window.innerWidth : 1000, 
        height: typeof window !== 'undefined' ? window.innerHeight : 600 
    });

    // Kullanıcı ölçek seviyesi (0: %85, 1: %100, 2: %115, 3: %130)
    const [fontScaleLevel, setFontScaleLevel] = useState<number>(1);
    const currentScale = SCALE_LEVELS[fontScaleLevel] || SCALE_LEVELS[1];

    // Süre sayacı
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    const mode = searchParams.get('mode');
    const topicId = searchParams.get('topicId');
    const isMission = mode === 'mission';
    const gameContext = useMemo(() => `Kavram Avı - ${searchParams.get('courseName') || ''} > ${searchParams.get('topicName') || ''}`, [searchParams]);
    const backUrl = getGameBackUrl({ user, searchParams, defaultBackUrl: isMission ? '/student/gorevler' : '/oyunlar/kavram-avi' });

    // Dinamik Alan Ölçümü (ResizeObserver ile her ekrana sıfır taşma ile tam oturma)
    useEffect(() => {
        if (!mainAreaRef.current) return;

        const updateSize = () => {
            if (mainAreaRef.current) {
                const rect = mainAreaRef.current.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    setContainerDimensions({ width: rect.width, height: rect.height });
                }
            }
        };

        updateSize();

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0) {
                    setContainerDimensions({ width, height });
                }
            }
        });

        observer.observe(mainAreaRef.current);
        window.addEventListener('resize', updateSize);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateSize);
        };
    }, []);

    // Ses çalma yardımcısı
    const triggerSound = useCallback((soundName: 'pop' | 'correct' | 'incorrect' | 'win') => {
        if (!isMuted) {
            playSound(soundName);
        }
    }, [isMuted]);

    // Zamanlayıcı
    useEffect(() => {
        if (gameState !== 'playing' || showMenuModal) return;
        const timer = setInterval(() => {
            setElapsedSeconds(prev => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState, showMenuModal]);

    // Tam ekran dinleyicisi
    useEffect(() => {
        const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            gameContainerRef.current?.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    };

    // Soruları Sunucudan Çekme
    const fetchGameData = useCallback(async () => {
        setIsLoading(true);
        const params = {
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: searchParams.get('topicId') || undefined,
        };

        if (!params.topicId && !params.unitId) {
            setError("Geçerli bir konu veya ünite ID'si bulunamadı.");
            setGameState('loading');
            setIsLoading(false);
            return;
        }

        const result = await getConceptHuntAction(params);
        const validQuestions = (result.questions || []).filter(
            q => q && q.definition && q.definition.trim().length >= 5 && q.correctAnswer
        );

        if (result.error || validQuestions.length === 0) {
            setError(result.error || "Bu oyun için tanımı bulunan yeterli kavram bulunamadı.");
        } else {
            setQuestions(validQuestions);
            
            const initialMap: Record<number, QuestionProgress> = {};
            validQuestions.forEach((q, idx) => {
                const scrambledChars = q.scrambledWord.split('');
                const pool = scrambledChars.map((char, cIdx) => ({
                    id: `${idx}-${cIdx}-${char}`,
                    char: char.toLocaleUpperCase('tr-TR')
                }));
                const slots = new Array(q.correctAnswer.length).fill(null);
                initialMap[idx] = { pool, slots, isSolved: false };
            });

            setProgressMap(initialMap);
            setCurrentQuestionIndex(0);
            setGameState('playing');
        }
        setIsLoading(false);
    }, [searchParams]);

    useEffect(() => { 
        fetchGameData(); 
    }, [fetchGameData]);

    // Aktif soru ve durumu
    const currentQuestion = questions[currentQuestionIndex];
    const currentProgress = progressMap[currentQuestionIndex] || {
        pool: [],
        slots: [],
        isSolved: false
    };

    const targetWord = currentQuestion?.correctAnswer?.toLocaleUpperCase('tr-TR') || '';
    const wordLength = targetWord.length;

    // Wordwall Dinamik Boyutlandırma Motoru (Ekran genişliği ve kelime uzunluğuna göre tam oturan kare karolar)
    const dynamicLayout = useMemo(() => {
        const { width, height } = containerDimensions;
        const count = Math.max(wordLength, 3);
        const factor = currentScale.factor;

        const paddingX = width > 768 ? 64 : 24;
        const usableW = Math.max(width - paddingX, 280);
        const gap = count > 8 ? 8 : 12;

        // Üst sıradaki karolar ve alt kutu için tek sıra maksimum genişlik
        const maxTileW = (usableW - (count - 1) * gap - 32) / count;
        
        // Dikey kullanılabilir alan (üst sıra karolar + alt hedef kutusu)
        const usableH = Math.max(height * 0.58, 160);
        const maxTileH = (usableH - 24) / 2;

        // Kare karo boyutu (1:1 aspect ratio)
        let optimalSize = Math.min(maxTileW, maxTileH);
        optimalSize = optimalSize * factor;

        // Sınırlar: min 44px, max 120px (büyük akıllı tahtalarda son derece dolgun ve belirgin)
        const finalSize = Math.round(Math.min(Math.max(optimalSize, 44), 120));
        const fontSize = Math.round(finalSize * 0.56);

        return {
            tileSize: finalSize,
            fontSize,
            gap
        };
    }, [containerDimensions, wordLength, currentScale.factor]);

    // Soru / Tanım Metni Dinamik Punto Hesabı (Akıllı Tahtaya & Büyük Ekranlara Tam Uyumlu)
    const questionFontSize = useMemo(() => {
        const textLen = currentQuestion?.definition?.length || 0;
        const { width, height } = containerDimensions;
        const factor = currentScale.factor;

        let basePx = 36;
        if (width > 1200 && height > 750) {
            basePx = textLen > 120 ? 34 : textLen > 65 ? 42 : 52;
        } else if (width > 768) {
            basePx = textLen > 120 ? 26 : textLen > 65 ? 32 : 38;
        } else {
            basePx = textLen > 120 ? 20 : textLen > 65 ? 24 : 28;
        }

        return `${Math.round(basePx * factor)}px`;
    }, [currentQuestion?.definition, containerDimensions, currentScale.factor]);

    // Hatalı harf teşebbüsü geri bildirimi (Harf yerleşmez, kırmızı sallanır ve hata sesi çalar)
    const triggerWrongAttempt = useCallback((letterId?: string, slotIdx?: number) => {
        triggerSound('incorrect');
        if (letterId) setShakingLetterId(letterId);
        if (slotIdx !== undefined) setShakingSlotIdx(slotIdx);
        setTimeout(() => {
            setShakingLetterId(null);
            setShakingSlotIdx(null);
        }, 500);
    }, [triggerSound]);

    // Havuzdaki harfe tıklandığında -> SADECE DOĞRUYSA Hedef kutudaki ilk boş yuvaya aktar
    const handlePoolLetterClick = useCallback((letter: LetterItem) => {
        if (currentProgress.isSolved || shakingLetterId || !currentQuestion) return;

        const emptySlotIdx = currentProgress.slots.findIndex(s => s === null);
        if (emptySlotIdx === -1) return;

        // DOĞRU HARF KONTROLÜ: Yanlış harf asla yerleşmesin
        const expectedChar = targetWord[emptySlotIdx]?.toLocaleUpperCase('tr-TR');
        if (letter.char.toLocaleUpperCase('tr-TR') !== expectedChar) {
            triggerWrongAttempt(letter.id, emptySlotIdx);
            return;
        }

        // DOĞRU HARF: Yuvaya yerleştir
        triggerSound('pop');
        const newSlots = [...currentProgress.slots];
        newSlots[emptySlotIdx] = letter;

        const newPool = currentProgress.pool.filter(p => p.id !== letter.id);
        const isFilled = newSlots.every(s => s !== null);

        setProgressMap(prev => ({
            ...prev,
            [currentQuestionIndex]: {
                ...prev[currentQuestionIndex],
                pool: newPool,
                slots: newSlots,
                isSolved: isFilled
            }
        }));

        if (isFilled) {
            triggerSound('correct');
            confetti({
                particleCount: 65,
                spread: 80,
                origin: { y: 0.6 }
            });

            setScore(prev => prev + 10);

            // 1.2 saniye sonra sonraki soruya otomatik geç
            setTimeout(() => {
                if (currentQuestionIndex < questions.length - 1) {
                    setCurrentQuestionIndex(idx => idx + 1);
                } else {
                    triggerSound('win');
                    setGameState('finished');
                }
            }, 1200);
        }
    }, [currentProgress, shakingLetterId, currentQuestion, targetWord, triggerWrongAttempt, triggerSound, currentQuestionIndex, questions.length]);

    // Hedef kutudaki harfe tıklandığında -> Havuza geri gönder
    const handleSlotLetterClick = useCallback((slotIdx: number) => {
        if (currentProgress.isSolved) return;

        const letter = currentProgress.slots[slotIdx];
        if (!letter) return;

        triggerSound('pop');
        const newSlots = [...currentProgress.slots];
        newSlots[slotIdx] = null;

        const newPool = [...currentProgress.pool, letter];

        setProgressMap(prev => ({
            ...prev,
            [currentQuestionIndex]: {
                ...prev[currentQuestionIndex],
                pool: newPool,
                slots: newSlots
            }
        }));
    }, [currentProgress, currentQuestionIndex, triggerSound]);

    // Harfleri Sıfırla (Mevcut soru için)
    const handleResetCurrentWord = useCallback(() => {
        if (!currentQuestion || currentProgress.isSolved) return;
        const allLetters = [
            ...currentProgress.pool,
            ...currentProgress.slots.filter((s): s is LetterItem => s !== null)
        ];
        setProgressMap(prev => ({
            ...prev,
            [currentQuestionIndex]: {
                ...prev[currentQuestionIndex],
                pool: allLetters,
                slots: new Array(currentQuestion.correctAnswer.length).fill(null)
            }
        }));
        setShowMenuModal(false);
    }, [currentQuestion, currentProgress, currentQuestionIndex]);

    // Klavyeden Harf Yazma Desteği (Sadece doğru harf girilirse yerleştir)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (gameState !== 'playing' || currentProgress.isSolved || showMenuModal) return;

            // Backspace ile son harfi geri alma
            if (e.key === 'Backspace') {
                e.preventDefault();
                const lastFilledIdx = [...currentProgress.slots].map((s, idx) => ({ s, idx })).reverse().find(x => x.s !== null)?.idx;
                if (lastFilledIdx !== undefined) {
                    handleSlotLetterClick(lastFilledIdx);
                }
                return;
            }

            // Basılan tuş tek bir harf ise
            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                const emptySlotIdx = currentProgress.slots.findIndex(s => s === null);
                if (emptySlotIdx === -1) return;

                const pressedChar = e.key.toLocaleUpperCase('tr-TR');
                const expectedChar = targetWord[emptySlotIdx]?.toLocaleUpperCase('tr-TR');

                if (pressedChar === expectedChar) {
                    const matchingItem = currentProgress.pool.find(p => p.char.toLocaleUpperCase('tr-TR') === pressedChar);
                    if (matchingItem) {
                        e.preventDefault();
                        handlePoolLetterClick(matchingItem);
                    }
                } else {
                    // Yanlış harfe basıldı: Yerleşmesin, hata efekti ver
                    e.preventDefault();
                    triggerWrongAttempt(undefined, emptySlotIdx);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameState, currentProgress, showMenuModal, targetWord, handleSlotLetterClick, handlePoolLetterClick, triggerWrongAttempt]);

    // Drag & Drop İşleyicileri
    const handleDragStartFromPool = (e: React.DragEvent, letter: LetterItem) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ source: 'pool', id: letter.id }));
    };

    const handleDragStartFromSlot = (e: React.DragEvent, slotIdx: number) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ source: 'slot', slotIdx }));
    };

    const handleSlotDrop = (e: React.DragEvent, targetSlotIdx: number) => {
        e.preventDefault();
        setDragOverSlotIndex(null);
        if (currentProgress.isSolved) return;

        try {
            const raw = e.dataTransfer.getData('text/plain');
            if (!raw) return;
            const data = JSON.parse(raw);

            if (data.source === 'pool') {
                const poolItem = currentProgress.pool.find(p => p.id === data.id);
                if (!poolItem) return;

                // Hedef yuvadaki harf doğru mu kontrol et
                const expectedChar = targetWord[targetSlotIdx]?.toLocaleUpperCase('tr-TR');
                if (poolItem.char.toLocaleUpperCase('tr-TR') !== expectedChar) {
                    // YANLIŞ HARF: Kesinlikle yerleşmesin!
                    triggerWrongAttempt(poolItem.id, targetSlotIdx);
                    return;
                }

                // DOĞRU HARF:
                triggerSound('pop');
                const newSlots = [...currentProgress.slots];
                newSlots[targetSlotIdx] = poolItem;
                const newPool = currentProgress.pool.filter(p => p.id !== poolItem.id);
                const isFilled = newSlots.every(s => s !== null);

                setProgressMap(prev => ({
                    ...prev,
                    [currentQuestionIndex]: {
                        ...prev[currentQuestionIndex],
                        pool: newPool,
                        slots: newSlots,
                        isSolved: isFilled
                    }
                }));

                if (isFilled) {
                    triggerSound('correct');
                    confetti({
                        particleCount: 65,
                        spread: 80,
                        origin: { y: 0.6 }
                    });
                    setScore(prev => prev + 10);
                    setTimeout(() => {
                        if (currentQuestionIndex < questions.length - 1) {
                            setCurrentQuestionIndex(idx => idx + 1);
                        } else {
                            triggerSound('win');
                            setGameState('finished');
                        }
                    }, 1200);
                }
            }
        } catch (err) {
            console.error("Drop error:", err);
        }
    };

    // Tamamlanan / Çözülen Toplam Kelime Sayısı
    const solvedCount = useMemo(() => {
        return Object.values(progressMap).filter(p => p.isSolved).length;
    }, [progressMap]);

    const isAllCompleted = solvedCount === questions.length && questions.length > 0;

    // Kaydet ve Çık İşlemi (Firestore & Görev Uyumu)
    const handleSaveAndExit = async () => {
        if (!user) {
            router.push(isMission ? '/student/gorevler' : backUrl);
            return;
        }
        if (score === 0 || isSaving || isScoreSaved) {
            if (isMission && isAllCompleted && !isScoreSaved) {
                // devam et
            } else {
                router.push(isMission ? '/student/gorevler' : backUrl);
                return;
            }
        }
        
        setIsSaving(true);
        try {
            if (isMission && topicId) {
                const batch = writeBatch(db);
                const eventRef = doc(collection(db, 'scoreEvents'));
                batch.set(eventRef, {
                    userId: user.uid,
                    points: score,
                    context: topicId,
                    gameType: 'kavram-avi',
                    timestamp: serverTimestamp(),
                    isMission: true,
                    completed: isAllCompleted
                });

                const userRef = doc(db, 'users', user.uid);
                batch.update(userRef, {
                    score: increment(score)
                });

                await batch.commit();

                if (isAllCompleted) {
                    toast({ title: "Görev Başarılı!", description: "Tüm kavramları doğru bularak görevi tamamladın.", className: "bg-green-600 text-white" });
                } else {
                    toast({ title: "Puan Kaydedildi", description: "Puanın kaydedildi.", className: "bg-yellow-600 text-white" });
                }
            } else {
                const result = await submitConceptHuntScoreAction(user.uid, score, gameContext);
                if (result.success) {
                    toast({ title: "Başarılı!", description: "Puanın kaydedildi." });
                } else {
                    toast({ title: "Hata", description: result.error, variant: "destructive" });
                }
            }
            setIsScoreSaved(true);
        } catch (e) {
            console.error(e);
            toast({ title: "Hata", description: "Puan kaydedilemedi.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 text-neutral-800">
                <Loader2 className="h-12 w-12 animate-spin text-neutral-700" />
                <span className="font-extrabold text-lg sm:text-xl">Kavram Avı Yükleniyor...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
                <Alert variant="destructive" className="max-w-lg bg-neutral-50 border-red-300 text-slate-900 shadow-xl rounded-2xl">
                    <AlertTitle className="text-red-700 font-black text-lg">Oyun Başlatılamadı</AlertTitle>
                    <AlertDescription className="font-bold text-slate-700 mt-2">{error}</AlertDescription>
                    <Button asChild variant="outline" className="mt-4 border-slate-300 text-slate-800 hover:bg-slate-100 rounded-xl font-bold">
                        <Link href={isMission ? '/student/gorevler' : backUrl}>
                            <ArrowLeft className="mr-2 h-4 w-4"/> Geri Dön
                        </Link>
                    </Button>
                </Alert>
            </div>
        );
    }

    if (gameState === 'finished') {
        return (
            <GameEndScreen 
                score={score} 
                onSave={user ? handleSaveAndExit : undefined} 
                isSaving={isSaving} 
                scoreSaved={isScoreSaved} 
                onRestart={() => window.location.reload()} 
                backUrl={backUrl} 
                isSuccess={isAllCompleted}
                isMission={isMission}
                customMessage={
                    isMission 
                        ? (isAllCompleted 
                            ? "Tebrikler! Tüm kavramları doğru bularak görevi başarıyla tamamladın." 
                            : "Tüm kavramlar tamamlanamadı. Görevi geçmek için tüm kavramları bulmalısın.")
                        : undefined
                }
            />
        );
    }

    const timerFormatted = `${Math.floor(elapsedSeconds / 60)}:${(elapsedSeconds % 60).toString().padStart(2, '0')}`;

    return (
        <div 
            ref={gameContainerRef}
            className="h-screen w-full select-none overflow-hidden flex flex-col justify-between relative bg-white text-neutral-900 font-sans"
        >
            {/* 1. ÜST ÇUBUK: SÜRE (SOL) | SKOR (SAĞ) - WORDWALL MİNİMALİST HUD */}
            <div className="relative z-20 w-full px-4 sm:px-8 md:px-12 lg:px-16 pt-3 sm:pt-4 flex items-center justify-between shrink-0">
                {/* Sol: Sayaç (Wordwall Formatı: 0:14) */}
                <div className="flex items-center gap-2 font-mono font-bold text-2xl sm:text-3xl text-neutral-800">
                    <span>{timerFormatted}</span>
                </div>

                {/* Sağ: Skor (Wordwall Formatı: ✔ 0) */}
                <div className="flex items-center gap-2 font-bold text-2xl sm:text-3xl text-neutral-800">
                    <span className="text-emerald-600 font-black">✔</span>
                    <span>{solvedCount}</span>
                </div>
            </div>

            {/* 2. ANA OYUN ALANI (WORDWALL TEMPLATE 38: TANIM + KARIŞIK HARFLER + HEDEF KUTUSU) */}
            <main 
                ref={mainAreaRef}
                className="relative z-10 w-full px-4 sm:px-8 md:px-12 flex-1 min-h-0 flex flex-col items-center justify-between py-2 sm:py-4 overflow-hidden"
            >
                
                {/* SORU / TANIM METNİ (Wordwall: Siyah, ortalanmış, kalın sans-serif font) */}
                <div className="w-full max-w-5xl xl:max-w-6xl text-center px-4 shrink-0 my-auto">
                    <p 
                        style={{ fontSize: questionFontSize }}
                        className="font-bold text-neutral-900 leading-snug sm:leading-tight select-none transition-all duration-150 mx-auto"
                    >
                        {currentQuestion?.definition}
                    </p>
                </div>

                {/* HAVUZ: KARIŞIK HARFLER (Wordwall: Koyu gri kare butonlar) */}
                <div 
                    style={{ minHeight: `${dynamicLayout.tileSize}px` }}
                    className="w-full flex items-center justify-center shrink-0 my-auto"
                >
                    {currentProgress.pool.length === 0 ? (
                        <div 
                            style={{ height: `${dynamicLayout.tileSize}px` }}
                            className="flex items-center justify-center text-neutral-400 font-bold text-base sm:text-lg"
                        >
                            {currentProgress.isSolved ? (
                                <span className="flex items-center gap-2.5 text-emerald-600 font-extrabold text-lg sm:text-2xl animate-in zoom-in-95">
                                    <Sparkles className="w-6 h-6 text-emerald-500" />
                                    Tebrikler! Doğru Kelime Bulundu
                                    <Sparkles className="w-6 h-6 text-emerald-500" />
                                </span>
                            ) : (
                                <span>Harfler kutuya yerleştirildi</span>
                            )}
                        </div>
                    ) : (
                        <div 
                            style={{ gap: `${dynamicLayout.gap}px` }}
                            className="flex flex-wrap justify-center items-center w-full"
                        >
                            {currentProgress.pool.map((letter) => (
                                <WordwallLetterTile
                                    key={letter.id}
                                    char={letter.char}
                                    isShaking={shakingLetterId === letter.id}
                                    onClick={() => handlePoolLetterClick(letter)}
                                    draggable={!currentProgress.isSolved}
                                    onDragStart={(e) => handleDragStartFromPool(e, letter)}
                                    size={dynamicLayout.tileSize}
                                    fontSize={dynamicLayout.fontSize}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* HEDEF KUTUSU (Wordwall: Gri kenarlıklı beyaz dikdörtgen kutu + altındaki çizgiler) */}
                <div className="w-full flex justify-center items-center shrink-0 my-auto">
                    <div 
                        className="border-2 border-neutral-300 rounded-xl sm:rounded-2xl bg-white shadow-xs p-2 sm:p-3 inline-flex items-center justify-center transition-all duration-200"
                        style={{ gap: `${dynamicLayout.gap}px` }}
                    >
                        {currentProgress.slots.map((letter, slotIdx) => {
                            const isOver = dragOverSlotIndex === slotIdx;
                            const isSlotShaking = shakingSlotIdx === slotIdx;

                            if (letter) {
                                return (
                                    <WordwallLetterTile
                                        key={`slot-${slotIdx}-${letter.id}`}
                                        char={letter.char}
                                        isCorrect={currentProgress.isSolved}
                                        onClick={() => handleSlotLetterClick(slotIdx)}
                                        draggable={!currentProgress.isSolved}
                                        onDragStart={(e) => handleDragStartFromSlot(e, slotIdx)}
                                        size={dynamicLayout.tileSize}
                                        fontSize={dynamicLayout.fontSize}
                                    />
                                );
                            }

                            return (
                                <div
                                    key={`slot-empty-${slotIdx}`}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setDragOverSlotIndex(slotIdx);
                                    }}
                                    onDragLeave={() => setDragOverSlotIndex(null)}
                                    onDrop={(e) => handleSlotDrop(e, slotIdx)}
                                    style={{
                                        width: `${dynamicLayout.tileSize}px`,
                                        height: `${dynamicLayout.tileSize}px`,
                                    }}
                                    className={cn(
                                        "relative flex flex-col justify-end items-center transition-all duration-150 select-none shrink-0 rounded-lg",
                                        isOver && "bg-neutral-100 ring-2 ring-neutral-400",
                                        isSlotShaking && "animate-slot-shake bg-rose-50 ring-2 ring-rose-400"
                                    )}
                                >
                                    {/* Wordwall Alt Çizgisi: [ — ] */}
                                    <div 
                                        style={{ width: `${Math.round(dynamicLayout.tileSize * 0.72)}px` }}
                                        className={cn(
                                            "h-1.5 sm:h-2 rounded-full mb-2 pointer-events-none transition-colors",
                                            isSlotShaking ? "bg-rose-500" : "bg-neutral-300"
                                        )}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>

            </main>

            {/* 3. ALT ÇUBUK: MENÜ (SOL) | SAYFALAMA (ORTA) | BOYUT & SES & TAM EKRAN (SAĞ) */}
            <div className="relative z-20 w-full px-4 sm:px-8 md:px-12 lg:px-16 py-3 sm:py-4 flex items-center justify-between shrink-0 border-t border-neutral-100">
                
                {/* Sol: Menü Butonu [ ☰ ] */}
                <button
                    onClick={() => setShowMenuModal(true)}
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-neutral-800 flex items-center justify-center shadow-xs cursor-pointer active:scale-95 transition-all"
                    title="Menü"
                >
                    <Menu className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
                </button>

                {/* Orta: Wordwall Sayfa Değiştirici [ ◀ 1 of 5 ▶ ] */}
                <div className="flex items-center gap-2 sm:gap-3 bg-neutral-100 border border-neutral-300 px-3 sm:px-5 py-1.5 rounded-xl shadow-xs">
                    <button
                        onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentQuestionIndex === 0}
                        className="p-1 hover:opacity-100 disabled:opacity-30 cursor-pointer disabled:cursor-default text-neutral-800 font-bold text-lg transition-opacity"
                        title="Önceki Soru"
                    >
                        <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                    
                    <span className="font-bold text-sm sm:text-base text-neutral-800 select-none min-w-[70px] text-center">
                        {currentQuestionIndex + 1} of {questions.length}
                    </span>

                    <button
                        onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                        disabled={currentQuestionIndex >= questions.length - 1}
                        className="p-1 hover:opacity-100 disabled:opacity-30 cursor-pointer disabled:cursor-default text-neutral-800 font-bold text-lg transition-opacity"
                        title="Sonraki Soru"
                    >
                        <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                </div>

                {/* Sağ: Boyut [ A- %100 A+ ] | Ses [ 🔊 ] | Tam Ekran [ ⛶ ] */}
                <div className="flex items-center gap-2 sm:gap-3">
                    
                    {/* Boyut Ayarı (Akıllı Tahta Ölçeklendirici) */}
                    <div className="flex items-center bg-neutral-100 border border-neutral-300 rounded-xl px-2 py-1 shadow-xs">
                        <span className="text-xs font-bold text-neutral-600 hidden sm:inline mr-1">Boyut:</span>
                        <button
                            onClick={() => setFontScaleLevel(prev => Math.max(0, prev - 1))}
                            disabled={fontScaleLevel === 0}
                            className="w-7 h-7 rounded hover:bg-neutral-200 disabled:opacity-30 font-bold text-sm flex items-center justify-center text-neutral-800 cursor-pointer disabled:cursor-default transition-all"
                            title="Boyutu Küçült"
                        >
                            A-
                        </button>
                        <span className="text-xs font-bold text-neutral-800 min-w-8 text-center select-none">
                            {currentScale.name}
                        </span>
                        <button
                            onClick={() => setFontScaleLevel(prev => Math.min(SCALE_LEVELS.length - 1, prev + 1))}
                            disabled={fontScaleLevel === SCALE_LEVELS.length - 1}
                            className="w-7 h-7 rounded hover:bg-neutral-200 disabled:opacity-30 font-bold text-sm flex items-center justify-center text-neutral-800 cursor-pointer disabled:cursor-default transition-all"
                            title="Boyutu Büyüt"
                        >
                            A+
                        </button>
                    </div>

                    {/* Ses Aç / Kapat Butonu */}
                    <button
                        onClick={() => setIsMuted(prev => !prev)}
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-neutral-800 flex items-center justify-center shadow-xs cursor-pointer active:scale-95 transition-all"
                        title={isMuted ? "Sesi Aç" : "Sesi Kapat"}
                    >
                        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>

                    {/* Tam Ekran Butonu */}
                    <button
                        onClick={toggleFullscreen}
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-neutral-800 flex items-center justify-center shadow-xs cursor-pointer active:scale-95 transition-all"
                        title={isFullscreen ? "Tam Ekrandan Çık" : "Tam Ekran Yap"}
                    >
                        {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                    </button>

                </div>

            </div>

            {/* MENÜ MODAL */}
            {showMenuModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-neutral-900 shadow-2xl space-y-4 border border-neutral-200">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h3 className="font-extrabold text-xl text-neutral-900">Kavram Avı Menüsü</h3>
                            <button 
                                onClick={() => setShowMenuModal(false)}
                                className="w-8 h-8 rounded-full hover:bg-neutral-100 flex items-center justify-center text-neutral-600 cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-2.5">
                            <button
                                onClick={handleResetCurrentWord}
                                className="w-full py-3 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-bold flex items-center justify-between cursor-pointer transition-colors"
                            >
                                <span>Bu Kelimenin Harflerini Sıfırla</span>
                                <RotateCcw className="w-4 h-4 text-neutral-600" />
                            </button>

                            <button
                                onClick={() => {
                                    window.location.reload();
                                }}
                                className="w-full py-3 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-bold flex items-center justify-between cursor-pointer transition-colors"
                            >
                                <span>Oyunu Baştan Başlat</span>
                                <RotateCcw className="w-4 h-4 text-neutral-600" />
                            </button>

                            <button
                                onClick={() => {
                                    setIsMuted(prev => !prev);
                                    setShowMenuModal(false);
                                }}
                                className="w-full py-3 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-bold flex items-center justify-between cursor-pointer transition-colors"
                            >
                                <span>Ses: {isMuted ? 'Kapalı' : 'Açık'}</span>
                                {isMuted ? <VolumeX className="w-4 h-4 text-rose-600" /> : <Volume2 className="w-4 h-4 text-emerald-600" />}
                            </button>

                            <button
                                onClick={() => {
                                    setShowMenuModal(false);
                                    setGameState('finished');
                                }}
                                className="w-full py-3 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold flex items-center justify-between cursor-pointer transition-colors"
                            >
                                <span>Oyunu Bitir ve Puanı Kaydet</span>
                                <Check className="w-4 h-4 text-rose-600" />
                            </button>
                        </div>

                        <div className="pt-2">
                            <Button 
                                variant="outline" 
                                className="w-full font-bold rounded-xl"
                                onClick={() => setShowMenuModal(false)}
                            >
                                Oyuna Dön
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ANİMASYON STİLLERİ */}
            <style jsx global>{`
                @keyframes slotShake {
                    0%, 100% { transform: translateX(0); }
                    20% { transform: translateX(-8px); }
                    40% { transform: translateX(8px); }
                    60% { transform: translateX(-6px); }
                    80% { transform: translateX(6px); }
                }
                .animate-slot-shake {
                    animation: slotShake 0.45s cubic-bezier(.36,.07,.19,.97) both;
                }
            `}</style>

        </div>
    );
}

export default function KavramAviOyunPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen w-full items-center justify-center bg-white text-neutral-900">
                <Loader2 className="h-12 w-12 animate-spin text-neutral-600" />
            </div>
        }>
            <KavramAviGame />
        </Suspense>
    );
}