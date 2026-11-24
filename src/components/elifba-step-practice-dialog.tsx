'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import confetti from 'canvas-confetti';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { 
    DIYANET_ELIFBA_STAGES, 
    getStageItemAssetUrls, 
    getStageItemMeta,
    getNextDiyanetStage,
    ElifbaStage
} from '@/lib/elifba-curriculum';
import { 
    Volume2, 
    VolumeX,
    Play, 
    Pause, 
    RotateCcw, 
    CheckCircle2, 
    XCircle, 
    Award, 
    Sparkles, 
    Gamepad2, 
    Star, 
    Heart, 
    Trophy, 
    ArrowRight, 
    ArrowLeft, 
    Shuffle, 
    HelpCircle, 
    Flame, 
    BookOpen, 
    GraduationCap,
    Check,
    ChevronRight,
    ChevronLeft,
    Lightbulb,
    FastForward
} from 'lucide-react';

// Web Audio API Sentezleyicisi (Sıfır gecikmeli ses efektleri)
const playToneSound = (type: 'correct' | 'wrong' | 'celebrate' | 'click') => {
    try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();

        if (type === 'correct') {
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();

            osc1.type = 'triangle';
            osc2.type = 'sine';

            osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
            osc1.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.12); // G5

            osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.05); // E5
            osc2.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.22); // C6

            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);

            osc1.start();
            osc2.start(ctx.currentTime + 0.04);
            osc1.stop(ctx.currentTime + 0.32);
            osc2.stop(ctx.currentTime + 0.32);
        } else if (type === 'wrong') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(260, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.25);

            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.28);
        } else if (type === 'celebrate') {
            const notes = [523.25, 659.25, 783.99, 1046.50];
            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
                gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.3);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + idx * 0.1);
                osc.stop(ctx.currentTime + idx * 0.1 + 0.3);
            });
        } else if (type === 'click') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.05);
        }
    } catch (e) {
        // Ses sentezi desteklenmiyorsa sessizce geç
    }
};

export type ElifbaStepPracticeDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialStageId?: string;
    onSelectNextStage?: (nextStageId: string) => void;
};

// Soru Tipi Tanımı
type QuizQuestion = {
    id: string;
    type: 'audio_to_card' | 'card_to_name' | 'true_false';
    targetIndex: number;
    promptText: string;
    audioUrl?: string;
    options: {
        index: number;
        img: string;
        name: string;
        isCorrect: boolean;
    }[];
    // True/False soruları için
    tfData?: {
        displayedName: string;
        isMatch: boolean;
    };
};

export function ElifbaStepPracticeDialog({
    open,
    onOpenChange,
    initialStageId = 'cuz1',
    onSelectNextStage
}: ElifbaStepPracticeDialogProps) {
    const [currentStageId, setCurrentStageId] = useState<string>(initialStageId);
    const [activeTab, setActiveTab] = useState<'exercise' | 'quiz' | 'result'>('exercise');
    
    // Ses Kontrolleri
    const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
    const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
    const [playbackRate, setPlaybackRate] = useState<number>(1.0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Egzersiz Modu State'leri
    const [exerciseIndex, setExerciseIndex] = useState<number>(1);
    const [completedItems, setCompletedItems] = useState<Record<number, boolean>>({});

    // Soru Arenası (Quiz) State'leri
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
    const [score, setScore] = useState<number>(0);
    const [streak, setStreak] = useState<number>(0);
    const [maxStreak, setMaxStreak] = useState<number>(0);
    const [lives, setLives] = useState<number>(3);
    const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
    const [answerFeedback, setAnswerFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [mistakes, setMistakes] = useState<number[]>([]); // Yanlış yapılan kart index'leri

    // Aşama Bilgileri
    const currentStage: ElifbaStage = useMemo(() => {
        return (
            DIYANET_ELIFBA_STAGES.find(s => s.id === currentStageId) ||
            DIYANET_ELIFBA_STAGES.find(s => String(s.stepNumber) === currentStageId) ||
            DIYANET_ELIFBA_STAGES[0]
        );
    }, [currentStageId]);

    const nextStage = useMemo(() => {
        return getNextDiyanetStage(currentStage.id);
    }, [currentStage.id]);

    // Initial Stage değişince güncelle
    useEffect(() => {
        if (initialStageId) {
            setCurrentStageId(initialStageId);
            setExerciseIndex(1);
            setCompletedItems({});
            setActiveTab('exercise');
        }
    }, [initialStageId]);

    // Aktif Kart Varlığı (Egzersiz)
    const currentAsset = useMemo(() => {
        return getStageItemAssetUrls(currentStage.id, exerciseIndex);
    }, [currentStage.id, exerciseIndex]);

    const currentMeta = useMemo(() => {
        return getStageItemMeta(currentStage.id, exerciseIndex);
    }, [currentStage.id, exerciseIndex]);

    // Orijinal Sesi Çal
    const playStageAudio = useCallback((customAudioUrl?: string, customRate?: number) => {
        if (!soundEnabled) return;
        const targetUrl = customAudioUrl || currentAsset?.audio;
        if (!targetUrl) return;

        try {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
            const audio = new Audio(targetUrl);
            audio.playbackRate = customRate ?? playbackRate;
            audioRef.current = audio;

            setIsPlayingAudio(true);
            audio.play().catch(e => console.log("Ses oynatma uyarısı:", e));

            audio.onended = () => setIsPlayingAudio(false);
            audio.onerror = () => setIsPlayingAudio(false);
        } catch (e) {
            console.error("Audio error:", e);
            setIsPlayingAudio(false);
        }
    }, [soundEnabled, currentAsset?.audio, playbackRate]);

    // Egzersizde kart değiştikçe sesi otomatik çal
    useEffect(() => {
        if (open && activeTab === 'exercise' && currentAsset?.audio) {
            const timer = setTimeout(() => {
                playStageAudio();
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [open, activeTab, exerciseIndex, currentAsset?.audio, playStageAudio]);

    // Egzersiz Tamamlama Yüzdesi
    const exercisePercent = useMemo(() => {
        const total = currentStage.itemCount;
        if (total === 0) return 0;
        const done = Object.keys(completedItems).length;
        return Math.round((done / total) * 100);
    }, [currentStage.itemCount, completedItems]);

    // Kartı "Okudum / Tekrar Ettim" Olarak İşaretle
    const handleMarkItemDone = () => {
        if (soundEnabled) playToneSound('click');
        setCompletedItems(prev => ({ ...prev, [exerciseIndex]: true }));
        
        // Eğer son kart değilse bir sonrakine geç
        if (exerciseIndex < currentStage.itemCount) {
            setExerciseIndex(prev => prev + 1);
        }
    };

    // Dinamik Soru Üretici (Her oynayışta rastgele ve taze)
    const generateQuizQuestions = useCallback(() => {
        const totalItems = currentStage.itemCount;
        if (totalItems <= 1) return [];

        const indices = Array.from({ length: totalItems }, (_, i) => i + 1);
        // Karıştır
        const shuffledIndices = [...indices].sort(() => 0.5 - Math.random());
        // 6 ila 10 soru seç
        const questionCount = Math.min(Math.max(6, Math.floor(totalItems * 0.5)), 10);
        const selectedTargets = shuffledIndices.slice(0, questionCount);

        const newQuestions: QuizQuestion[] = selectedTargets.map((targetIdx, qNum) => {
            const targetAsset = getStageItemAssetUrls(currentStage.id, targetIdx);
            const otherIndices = indices.filter(idx => idx !== targetIdx).sort(() => 0.5 - Math.random());
            const distractorIndices = otherIndices.slice(0, 3);
            
            // Seçenekler
            const allOptionIndices = [targetIdx, ...distractorIndices].sort(() => 0.5 - Math.random());
            const options = allOptionIndices.map(optIdx => {
                const a = getStageItemAssetUrls(currentStage.id, optIdx);
                return {
                    index: optIdx,
                    img: a?.img || '',
                    name: a?.name || `Örnek ${optIdx}`,
                    isCorrect: optIdx === targetIdx
                };
            });

            // Soru Tiplerini Dönüşümlü Ver (Sesli Bulmaca, Harf Tanıma, Doğru/Yanlış)
            const typeModulo = qNum % 3;
            let qType: QuizQuestion['type'] = 'audio_to_card';
            let promptText = 'Dinlediğiniz ses hangi harf veya kelimeye aittir?';

            if (typeModulo === 1) {
                qType = 'card_to_name';
                promptText = 'Bu görseldeki harf veya kelimenin doğru okunuşu hangisidir?';
            } else if (typeModulo === 2) {
                qType = 'true_false';
                // %50 ihtimalle doğru eşleşme, %50 yanlış eşleşme
                const isMatch = Math.random() > 0.5;
                const displayedName = isMatch 
                    ? (targetAsset?.name || 'Harf')
                    : (getStageItemAssetUrls(currentStage.id, otherIndices[0])?.name || 'Harf');

                return {
                    id: `q-${qNum + 1}`,
                    type: qType,
                    targetIndex: targetIdx,
                    promptText: `Bu ses ile harfin okunuşu doğru mu eşleşiyor?`,
                    audioUrl: targetAsset?.audio,
                    options: [],
                    tfData: {
                        displayedName,
                        isMatch: isMatch
                    }
                };
            }

            return {
                id: `q-${qNum + 1}`,
                type: qType,
                targetIndex: targetIdx,
                promptText,
                audioUrl: targetAsset?.audio,
                options
            };
        });

        return newQuestions;
    }, [currentStage.id, currentStage.itemCount]);

    // Sorularla Pekiştirme Modunu Başlat
    const handleStartQuiz = () => {
        const generated = generateQuizQuestions();
        setQuestions(generated);
        setCurrentQuestionIndex(0);
        setScore(0);
        setStreak(0);
        setMaxStreak(0);
        setLives(3);
        setMistakes([]);
        setSelectedOptionIndex(null);
        setAnswerFeedback(null);
        setActiveTab('quiz');

        // İlk sorunun sesini çal (eğer sesli soruysa)
        if (generated.length > 0 && generated[0].audioUrl) {
            setTimeout(() => {
                playStageAudio(generated[0].audioUrl);
            }, 300);
        }
    };

    // Mevcut Soru
    const currentQuestion = questions[currentQuestionIndex];

    // Sorunun Sesini Çal
    const playCurrentQuestionAudio = () => {
        if (currentQuestion?.audioUrl) {
            playStageAudio(currentQuestion.audioUrl);
        }
    };

    // Çoktan Seçmeli Seçenek Tıklama
    const handleSelectOption = (optIndex: number) => {
        if (selectedOptionIndex !== null || !currentQuestion) return; // Zaten tıklandıysa engelle

        setSelectedOptionIndex(optIndex);
        const selected = currentQuestion.options.find(o => o.index === optIndex);
        const isRight = selected?.isCorrect ?? false;

        if (isRight) {
            if (soundEnabled) playToneSound('correct');
            setAnswerFeedback('correct');
            const newStreak = streak + 1;
            setStreak(newStreak);
            if (newStreak > maxStreak) setMaxStreak(newStreak);
            setScore(prev => prev + 100 + (newStreak > 1 ? newStreak * 20 : 0));
        } else {
            if (soundEnabled) playToneSound('wrong');
            setAnswerFeedback('wrong');
            setStreak(0);
            setLives(prev => Math.max(0, prev - 1));
            setMistakes(prev => Array.from(new Set([...prev, currentQuestion.targetIndex])));
            // Doğru cevabın sesini öğretici olarak dinlet
            if (currentQuestion.audioUrl) {
                setTimeout(() => playStageAudio(currentQuestion.audioUrl), 500);
            }
        }

        // 1.4 saniye sonra sonraki soruya geç
        setTimeout(() => {
            advanceQuestion();
        }, 1400);
    };

    // Doğru / Yanlış (True/False) Seçeneği Tıklama
    const handleSelectTF = (userChoice: boolean) => {
        if (selectedOptionIndex !== null || !currentQuestion || !currentQuestion.tfData) return;

        const isRight = userChoice === currentQuestion.tfData.isMatch;
        setSelectedOptionIndex(userChoice ? 1 : 0);

        if (isRight) {
            if (soundEnabled) playToneSound('correct');
            setAnswerFeedback('correct');
            const newStreak = streak + 1;
            setStreak(newStreak);
            if (newStreak > maxStreak) setMaxStreak(newStreak);
            setScore(prev => prev + 100 + (newStreak > 1 ? newStreak * 20 : 0));
        } else {
            if (soundEnabled) playToneSound('wrong');
            setAnswerFeedback('wrong');
            setStreak(0);
            setLives(prev => Math.max(0, prev - 1));
            setMistakes(prev => Array.from(new Set([...prev, currentQuestion.targetIndex])));
            if (currentQuestion.audioUrl) {
                setTimeout(() => playStageAudio(currentQuestion.audioUrl), 500);
            }
        }

        setTimeout(() => {
            advanceQuestion();
        }, 1400);
    };

    // Sonraki Soruya Geç veya Sonuç Ekranına Ulaş
    const advanceQuestion = () => {
        setSelectedOptionIndex(null);
        setAnswerFeedback(null);

        if (currentQuestionIndex + 1 < questions.length && lives > 0) {
            const nextIdx = currentQuestionIndex + 1;
            setCurrentQuestionIndex(nextIdx);
            const nextQ = questions[nextIdx];
            if (nextQ?.audioUrl) {
                setTimeout(() => playStageAudio(nextQ.audioUrl), 200);
            }
        } else {
            // Test Bitti -> Sonuç Ekranı
            setActiveTab('result');
            if (soundEnabled) playToneSound('celebrate');
            confetti({
                particleCount: 150,
                spread: 80,
                origin: { y: 0.6 }
            });

            // LocalStorage'a ilerlemeyi kaydet
            try {
                const storageKey = `elifba_practice_${currentStage.id}`;
                const prevBest = localStorage.getItem(storageKey);
                const currentFinalScore = score;
                if (!prevBest || Number(prevBest) < currentFinalScore) {
                    localStorage.setItem(storageKey, String(currentFinalScore));
                }
            } catch {}
        }
    };

    // Canlar Bittiğinde Yeniden Dene
    const handleRetryQuiz = () => {
        handleStartQuiz();
    };

    // Sonraki Diyanet Adımına Geç
    const handleGoToNextStage = () => {
        if (!nextStage) return;
        setCurrentStageId(nextStage.id);
        setExerciseIndex(1);
        setCompletedItems({});
        setActiveTab('exercise');
        onSelectNextStage?.(nextStage.id);
    };

    // Yıldız Hesabı
    const starsCount = useMemo(() => {
        if (questions.length === 0) return 3;
        const totalPossibleScore = questions.length * 100;
        const ratio = score / totalPossibleScore;
        if (ratio >= 0.8) return 3;
        if (ratio >= 0.5) return 2;
        return 1;
    }, [score, questions.length]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[98vw] sm:w-[96vw] max-w-4xl h-[95dvh] max-h-[95dvh] p-0 rounded-3xl bg-slate-950 text-slate-100 border border-white/15 shadow-2xl overflow-hidden flex flex-col touch-manipulation">
                
                {/* ══ 1. ÜST HEADER (Aşama Başlığı, Sekmeler ve Ses Aç/Kapa) ══ */}
                <DialogHeader className="p-3 sm:p-5 border-b border-white/10 bg-slate-900/90 backdrop-blur-md flex flex-row items-center justify-between gap-2 sm:gap-3 space-y-0 shrink-0">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 flex items-center justify-center text-white shadow-md shadow-amber-900/40 shrink-0">
                            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-100" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-1.5 py-0">
                                    Adım {currentStage.stepNumber}
                                </Badge>
                                <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate hidden xs:inline">
                                    {currentStage.shortTitle || currentStage.sectionTitle}
                                </span>
                            </div>
                            <DialogTitle className="text-xs sm:text-base md:text-lg font-black text-white truncate drop-shadow-sm mt-0.5">
                                {currentStage.title}
                            </DialogTitle>
                        </div>
                    </div>

                    {/* Mod Değiştirici Hap Sekmeler */}
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <div className="flex items-center p-0.5 sm:p-1 rounded-2xl bg-slate-950 border border-white/10 text-xs">
                            <button
                                type="button"
                                onClick={() => setActiveTab('exercise')}
                                className={cn(
                                    "px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 text-[11px] sm:text-xs",
                                    activeTab === 'exercise'
                                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm"
                                        : "text-slate-400 hover:text-white"
                                )}
                            >
                                <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                <span className="hidden sm:inline">1. Egzersiz</span>
                                <span className="sm:hidden">Egzersiz</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleStartQuiz}
                                className={cn(
                                    "px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 text-[11px] sm:text-xs",
                                    activeTab === 'quiz'
                                        ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-sm"
                                        : "text-slate-400 hover:text-white"
                                )}
                            >
                                <Gamepad2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                <span className="hidden sm:inline">2. Oyun &amp; Test</span>
                                <span className="sm:hidden">Oyun</span>
                            </button>
                            {activeTab === 'result' && (
                                <button
                                    type="button"
                                    className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm flex items-center gap-1 text-[11px] sm:text-xs"
                                >
                                    <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                    <span className="hidden sm:inline">3. Başarı</span>
                                    <span className="sm:hidden">Başarı</span>
                                </button>
                            )}
                        </div>

                        {/* 🗺️ Büyük Macera Haritası */}
                        <Link 
                            href="/elifba/macera"
                            onClick={() => onOpenChange(false)}
                            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-xs shadow-sm transition-all active:scale-95"
                            title="Büyük Elifba Macerası: 19 Aşamalı Harita ve Rozetler"
                        >
                            <span>🗺️ Macera</span>
                        </Link>

                        {/* Ses Aç / Kapat */}
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setSoundEnabled(prev => !prev)}
                            className={cn(
                                "w-8 h-8 sm:w-9 sm:h-9 rounded-xl border transition-all cursor-pointer shrink-0",
                                soundEnabled 
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20" 
                                    : "bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20"
                            )}
                            title={soundEnabled ? "Sesi Kapat" : "Sesi Aç"}
                        >
                            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                        </Button>
                    </div>
                </DialogHeader>

                {/* ══ 2. İÇERİK ALANI (TAB BAZLI) ══ */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-6 flex flex-col justify-between min-h-0">
                    
                    {/* ───────────────────────────────────────────────────────────── */}
                    {/* AŞAMA 1: 🎧 SESLİ EGZERSİZ & KEŞİF (ANTRENMAN MODU) */}
                    {/* ───────────────────────────────────────────────────────────── */}
                    {activeTab === 'exercise' && (
                        <div className="flex flex-col items-center justify-between h-full space-y-4 max-w-2xl mx-auto w-full">
                            
                            {/* İlerleme ve Bilgi Çubuğu */}
                            <div className="w-full flex items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-300">
                                        Kart {exerciseIndex} / {currentStage.itemCount}
                                    </span>
                                    {completedItems[exerciseIndex] && (
                                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                                            ✓ Çalışıldı
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-slate-400 font-mono">
                                        %{exercisePercent} Hazır
                                    </span>
                                    <div className="w-24 sm:w-32 h-2 rounded-full bg-white/10 overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                                            style={{ width: `${exercisePercent}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Büyük İnteraktif Harf / Kelime Kartı */}
                            <div 
                                onClick={() => playStageAudio()}
                                className={cn(
                                    "w-full p-6 sm:p-8 rounded-3xl border-2 transition-all duration-300 flex flex-col items-center justify-center cursor-pointer relative group overflow-hidden shadow-2xl",
                                    isPlayingAudio 
                                        ? "border-amber-400 bg-gradient-to-b from-amber-500/15 via-slate-900 to-slate-950 shadow-amber-500/20 scale-[1.01]" 
                                        : "border-white/15 bg-gradient-to-b from-slate-900 to-slate-950 hover:border-emerald-400/60 hover:shadow-emerald-500/15"
                                )}
                            >
                                {/* Kart Köşesi Numara */}
                                <div className="absolute top-4 left-4 w-7 h-7 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-xs font-mono font-bold text-slate-300">
                                    {exerciseIndex}
                                </div>

                                {/* Ses Dalgalanma Göstergesi */}
                                <div className="absolute top-4 right-4 flex items-center gap-1">
                                    <div className={cn("p-1.5 rounded-xl border transition-all", isPlayingAudio ? "bg-amber-500 text-slate-950 border-amber-400 animate-pulse" : "bg-white/5 border-white/10 text-slate-400")}>
                                        <Volume2 className="w-4 h-4" />
                                    </div>
                                </div>

                                {/* Arapça Görsel veya Karakter */}
                                <div className="my-3 flex items-center justify-center min-h-[160px] sm:min-h-[200px]">
                                    {currentAsset?.img ? (
                                        <div className="relative w-48 h-32 sm:w-64 sm:h-40 flex items-center justify-center transition-transform group-hover:scale-105 duration-300">
                                            <Image 
                                                src={currentAsset.img}
                                                alt={currentAsset.name || 'Elifba Kartı'}
                                                fill
                                                className="object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] filter brightness-110"
                                                priority
                                            />
                                        </div>
                                    ) : (
                                        <div className="font-arabic text-6xl sm:text-7xl font-bold text-amber-300 drop-shadow-md">
                                            {currentMeta?.arabic || '؟'}
                                        </div>
                                    )}
                                </div>

                                {/* Harf / Kelime Okunuşu & Mahreç Bilgisi */}
                                <div className="text-center space-y-1.5 mt-2 z-10">
                                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                                        {currentAsset?.name || currentMeta?.name || `Örnek #${exerciseIndex}`}
                                    </h3>
                                    {currentMeta?.desc && (
                                        <p className="text-xs sm:text-sm text-amber-300/90 font-medium max-w-md mx-auto">
                                            💡 {currentMeta.desc}
                                        </p>
                                    )}
                                    <div className="text-[11px] text-slate-400 pt-1 flex items-center justify-center gap-1.5 opacity-80">
                                        <span>(Dinlemek için karta dokunun)</span>
                                    </div>
                                </div>

                                {/* Kartın Alt Hızlı Ses Kontrolleri */}
                                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/10 w-full justify-center" onClick={(e) => e.stopPropagation()}>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => playStageAudio()}
                                        className="h-8 rounded-xl border-amber-500/40 text-amber-300 hover:bg-amber-500/20 text-xs font-bold gap-1.5 cursor-pointer"
                                    >
                                        <Play className="w-3.5 h-3.5 fill-current" /> Tekrar Dinle
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            const newRate = playbackRate === 1.0 ? 0.75 : 1.0;
                                            setPlaybackRate(newRate);
                                            playStageAudio(undefined, newRate);
                                        }}
                                        className={cn(
                                            "h-8 rounded-xl text-xs font-bold gap-1 cursor-pointer border",
                                            playbackRate < 1.0 
                                                ? "bg-purple-600 text-white border-purple-500" 
                                                : "border-white/15 text-slate-300 hover:bg-white/10"
                                        )}
                                        title="Ağır çekimde mahreci daha net dinleyin"
                                    >
                                        🐢 {playbackRate < 1.0 ? '0.75x (Ağır)' : 'Yavaş Dinle'}
                                    </Button>
                                </div>
                            </div>

                            {/* İlerleme & Navigasyon Butonları */}
                            <div className="w-full flex items-center justify-between gap-2 sm:gap-3 pt-1">
                                <Button
                                    variant="outline"
                                    disabled={exerciseIndex <= 1}
                                    onClick={() => setExerciseIndex(prev => Math.max(1, prev - 1))}
                                    className="rounded-2xl border-white/15 text-slate-300 hover:bg-white/10 h-10 px-2.5 sm:px-4 text-xs font-bold gap-1 cursor-pointer shrink-0"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    <span className="hidden sm:inline">Önceki</span>
                                </Button>

                                <Button
                                    onClick={handleMarkItemDone}
                                    className="flex-1 max-w-xs h-10 rounded-2xl font-black text-xs sm:text-sm bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-lg shadow-emerald-900/40 gap-1.5 sm:gap-2 cursor-pointer active:scale-95 px-2"
                                >
                                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    <span className="truncate">Okudum &amp; Tekrar Ettim</span>
                                </Button>

                                <Button
                                    variant="outline"
                                    disabled={exerciseIndex >= currentStage.itemCount}
                                    onClick={() => setExerciseIndex(prev => Math.min(currentStage.itemCount, prev + 1))}
                                    className="rounded-2xl border-white/15 text-slate-300 hover:bg-white/10 h-10 px-2.5 sm:px-4 text-xs font-bold gap-1 cursor-pointer shrink-0"
                                >
                                    <span className="hidden sm:inline">Sonraki</span>
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>

                            {/* Mini Thumbnail / Numara Şeridi */}
                            <div className="w-full pt-2">
                                <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar p-1.5 rounded-2xl bg-slate-900/60 border border-white/10">
                                    {Array.from({ length: currentStage.itemCount }, (_, i) => i + 1).map(num => {
                                        const isCurrent = num === exerciseIndex;
                                        const isDone = completedItems[num];
                                        return (
                                            <button
                                                key={num}
                                                type="button"
                                                onClick={() => setExerciseIndex(num)}
                                                className={cn(
                                                    "w-7 h-7 sm:w-8 sm:h-8 rounded-xl font-mono text-xs font-bold flex items-center justify-center shrink-0 transition-all cursor-pointer border",
                                                    isCurrent 
                                                        ? "bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md ring-2 ring-amber-400/50 scale-105" 
                                                        : isDone 
                                                        ? "bg-emerald-600/30 text-emerald-300 border-emerald-500/50 hover:bg-emerald-600/50" 
                                                        : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white"
                                                )}
                                                title={`Kart ${num} ${isDone ? '(Çalışıldı ✓)' : ''}`}
                                            >
                                                {num}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 🎮 ŞİMDİ SORULARLA PEKİŞTİR BUTONU */}
                            <div className="w-full pt-2">
                                <Button
                                    onClick={handleStartQuiz}
                                    className="w-full h-12 rounded-2xl font-black text-sm sm:text-base bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white shadow-xl shadow-amber-900/30 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-95"
                                >
                                    <Gamepad2 className="w-5 h-5 text-amber-200" />
                                    <span>Hazırım! Sorularla Pekiştirme Oyununu Başlat ➔</span>
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* ───────────────────────────────────────────────────────────── */}
                    {/* AŞAMA 2: 🎯 SORULARLA PEKİŞTİR (EĞLENCELİ OYUN & TEST MODU) */}
                    {/* ───────────────────────────────────────────────────────────── */}
                    {activeTab === 'quiz' && currentQuestion && (
                        <div className="flex flex-col justify-between h-full space-y-4 max-w-2xl mx-auto w-full">
                            
                            {/* Oyun Durum Çubuğu (Canlar, Puan, Combo & Soru İlerlemesi) */}
                            <div className="w-full p-3 rounded-2xl bg-slate-900/80 border border-white/10 flex items-center justify-between gap-3 text-xs">
                                {/* Canlar */}
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: 3 }).map((_, i) => (
                                        <Heart 
                                            key={i} 
                                            className={cn(
                                                "w-5 h-5 transition-transform",
                                                i < lives ? "fill-rose-500 text-rose-500 scale-100" : "text-slate-600 scale-90"
                                            )} 
                                        />
                                    ))}
                                </div>

                                {/* Soru Numarası */}
                                <div className="font-bold text-slate-300">
                                    Soru {currentQuestionIndex + 1} / {questions.length}
                                </div>

                                {/* Skor & Combo */}
                                <div className="flex items-center gap-2">
                                    {streak > 1 && (
                                        <Badge className="bg-amber-500 text-slate-950 font-black animate-bounce text-[10px]">
                                            🔥 Combo x{streak}
                                        </Badge>
                                    )}
                                    <span className="font-mono font-black text-emerald-400 text-sm">
                                        ⭐ {score} Puan
                                    </span>
                                </div>
                            </div>

                            {/* Soru Gövdesi */}
                            <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-2">
                                
                                {/* Soru Yönergesi */}
                                <div className="text-center space-y-1">
                                    <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-[10px] font-bold uppercase">
                                        {currentQuestion.type === 'audio_to_card' ? '🎧 Dinle & Kartı Bul' : 
                                         currentQuestion.type === 'card_to_name' ? '👁️ Görseli Tanı' : '⚡ Doğru mu / Yanlış mı?'}
                                    </Badge>
                                    <h4 className="text-base sm:text-lg font-black text-white max-w-lg mx-auto">
                                        {currentQuestion.promptText}
                                    </h4>
                                </div>

                                {/* Tip 1: Sesli Soru Butonu */}
                                {currentQuestion.type === 'audio_to_card' && (
                                    <div className="my-2">
                                        <button
                                            type="button"
                                            onClick={playCurrentQuestionAudio}
                                            className={cn(
                                                "w-20 h-20 sm:w-24 sm:h-24 rounded-full flex flex-col items-center justify-center border-4 transition-all cursor-pointer shadow-xl",
                                                isPlayingAudio 
                                                    ? "bg-amber-500 border-amber-300 text-slate-950 scale-105 shadow-amber-500/40 animate-pulse" 
                                                    : "bg-gradient-to-br from-violet-600 to-indigo-700 border-violet-400/50 text-white hover:scale-105"
                                            )}
                                        >
                                            <Volume2 className="w-8 h-8 sm:w-10 sm:h-10" />
                                            <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">
                                                {isPlayingAudio ? 'Dinleniyor' : 'Dinle'}
                                            </span>
                                        </button>
                                    </div>
                                )}

                                {/* Tip 2: Görsel Soru (Büyük Kart Ekranda) */}
                                {currentQuestion.type === 'card_to_name' && (
                                    <div className="my-2 p-4 rounded-3xl bg-slate-900 border border-white/10 flex items-center justify-center min-w-[160px] min-h-[140px] shadow-lg">
                                        {(() => {
                                            const asset = getStageItemAssetUrls(currentStage.id, currentQuestion.targetIndex);
                                            return asset?.img ? (
                                                <div className="relative w-40 h-28">
                                                    <Image 
                                                        src={asset.img}
                                                        alt="Soru Kartı"
                                                        fill
                                                        className="object-contain filter brightness-110 drop-shadow-md"
                                                    />
                                                </div>
                                            ) : (
                                                <span className="text-4xl font-bold font-arabic text-amber-300">
                                                    {getStageItemMeta(currentStage.id, currentQuestion.targetIndex)?.arabic || '؟'}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                )}

                                {/* Tip 3: Doğru mu / Yanlış mı? Gösterimi */}
                                {currentQuestion.type === 'true_false' && currentQuestion.tfData && (
                                    <div className="my-2 p-5 rounded-3xl bg-slate-900 border border-white/10 flex flex-col items-center justify-center space-y-3 min-w-[200px] shadow-lg">
                                        {(() => {
                                            const asset = getStageItemAssetUrls(currentStage.id, currentQuestion.targetIndex);
                                            return (
                                                <>
                                                    {asset?.img ? (
                                                        <div className="relative w-36 h-24">
                                                            <Image 
                                                                src={asset.img}
                                                                alt="TF Kartı"
                                                                fill
                                                                className="object-contain filter brightness-110"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <span className="text-4xl font-arabic text-amber-300">
                                                            {getStageItemMeta(currentStage.id, currentQuestion.targetIndex)?.arabic || '؟'}
                                                        </span>
                                                    )}
                                                    <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                                                        <span className="text-xs text-slate-400">Okunuşu:</span>
                                                        <span className="text-lg font-black text-amber-400">
                                                            &ldquo;{currentQuestion.tfData.displayedName}&rdquo;
                                                        </span>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                )}

                                {/* Çoktan Seçmeli Seçenekler (Tip 1 & Tip 2) */}
                                {(currentQuestion.type === 'audio_to_card' || currentQuestion.type === 'card_to_name') && (
                                    <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full max-w-lg">
                                        {currentQuestion.options.map((opt) => {
                                            const isSelected = selectedOptionIndex === opt.index;
                                            const isCorrect = opt.isCorrect;
                                            const showStatus = selectedOptionIndex !== null;

                                            return (
                                                <button
                                                    key={opt.index}
                                                    type="button"
                                                    disabled={selectedOptionIndex !== null}
                                                    onClick={() => handleSelectOption(opt.index)}
                                                    className={cn(
                                                        "p-2.5 sm:p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center min-h-[80px] sm:min-h-[92px] cursor-pointer shadow-md touch-manipulation",
                                                        showStatus && isCorrect
                                                            ? "bg-emerald-600/30 border-emerald-400 text-white font-black shadow-emerald-500/20 scale-[1.02] ring-2 ring-emerald-400"
                                                            : showStatus && isSelected && !isCorrect
                                                            ? "bg-rose-600/30 border-rose-500 text-white shadow-rose-500/20 ring-2 ring-rose-400"
                                                            : "bg-slate-900 border-white/15 text-slate-200 hover:border-amber-400/60 hover:bg-slate-850 hover:scale-[1.01]"
                                                    )}
                                                >
                                                    {currentQuestion.type === 'audio_to_card' ? (
                                                        opt.img ? (
                                                            <div className="relative w-full max-w-[110px] sm:max-w-[130px] h-13 sm:h-16 flex items-center justify-center">
                                                                <Image 
                                                                    src={opt.img}
                                                                    alt={opt.name}
                                                                    fill
                                                                    className="object-contain filter brightness-110"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <span className="text-xl sm:text-2xl font-bold font-arabic">{opt.name}</span>
                                                        )
                                                    ) : (
                                                        <span className="text-sm sm:text-base md:text-lg font-black tracking-wide text-center">
                                                            {opt.name}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Doğru / Yanlış Butonları (Tip 3) */}
                                {currentQuestion.type === 'true_false' && (
                                    <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full max-w-md pt-2">
                                        <button
                                            type="button"
                                            disabled={selectedOptionIndex !== null}
                                            onClick={() => handleSelectTF(true)}
                                            className={cn(
                                                "p-3 sm:p-4 rounded-2xl border-2 font-black text-xs sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md touch-manipulation",
                                                selectedOptionIndex !== null && currentQuestion.tfData?.isMatch
                                                    ? "bg-emerald-600 text-white border-emerald-400 ring-2 ring-emerald-400"
                                                    : selectedOptionIndex === 1 && !currentQuestion.tfData?.isMatch
                                                    ? "bg-rose-600 text-white border-rose-400"
                                                    : "bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-600 hover:text-white"
                                            )}
                                        >
                                            <Check className="w-4 h-4 sm:w-5 sm:h-5" /> DOĞRU
                                        </button>
                                        <button
                                            type="button"
                                            disabled={selectedOptionIndex !== null}
                                            onClick={() => handleSelectTF(false)}
                                            className={cn(
                                                "p-3 sm:p-4 rounded-2xl border-2 font-black text-xs sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md touch-manipulation",
                                                selectedOptionIndex !== null && !currentQuestion.tfData?.isMatch
                                                    ? "bg-emerald-600 text-white border-emerald-400 ring-2 ring-emerald-400"
                                                    : selectedOptionIndex === 0 && currentQuestion.tfData?.isMatch
                                                    ? "bg-rose-600 text-white border-rose-400"
                                                    : "bg-rose-950/40 border-rose-500/40 text-rose-300 hover:bg-rose-600 hover:text-white"
                                            )}
                                        >
                                            <XCircle className="w-4 h-4 sm:w-5 sm:h-5" /> YANLIŞ
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Cevap Geri Bildirim Şeridi */}
                            {answerFeedback && (
                                <div className={cn(
                                    "p-3 rounded-2xl text-center font-bold text-xs sm:text-sm animate-in fade-in zoom-in-95 duration-200 border",
                                    answerFeedback === 'correct' 
                                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" 
                                        : "bg-rose-500/20 border-rose-500/40 text-rose-300"
                                )}>
                                    {answerFeedback === 'correct' 
                                        ? "Harika! Doğru Cevap 🎉 (+100 Puan)" 
                                        : "Bir dahaki sefere! Doğrusu sesli olarak tekrar çalınıyor..."}
                                </div>
                            )}

                            {/* Canlar bittiğinde uyarı */}
                            {lives === 0 && (
                                <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-center space-y-2">
                                    <div className="text-sm font-black text-rose-300">
                                        Canların Bitti! Ama Sorun Değil 🤗
                                    </div>
                                    <p className="text-xs text-slate-300">
                                        Birkaç tekrar yaparak harika sonuçlar alabilirsin.
                                    </p>
                                    <div className="flex items-center justify-center gap-2 pt-2">
                                        <Button
                                            size="sm"
                                            onClick={handleRetryQuiz}
                                            className="rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Tekrar Oyna
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setActiveTab('exercise')}
                                            className="rounded-xl border-white/15 text-slate-300 hover:bg-white/10 text-xs cursor-pointer"
                                        >
                                            Egzersize Dön
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ───────────────────────────────────────────────────────────── */}
                    {/* AŞAMA 3: 🏆 SINIF OKUMASINA HAZIRIM (BAŞARI & ROZET EKRANI) */}
                    {/* ───────────────────────────────────────────────────────────── */}
                    {activeTab === 'result' && (
                        <div className="flex flex-col items-center justify-center space-y-5 max-w-lg mx-auto w-full py-4 text-center">
                            
                            {/* Kupa & Rozet İkonu */}
                            <div className="relative">
                                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-orange-500 flex items-center justify-center text-slate-950 shadow-2xl shadow-amber-500/40 border-4 border-yellow-200 animate-bounce">
                                    <Trophy className="w-12 h-12 sm:w-14 sm:h-14 fill-current drop-shadow-md" />
                                </div>
                                <div className="absolute -bottom-2 -right-2 px-2.5 py-1 rounded-full bg-emerald-600 text-white font-mono font-black text-xs border-2 border-slate-950 shadow-md">
                                    ✓ Hazır
                                </div>
                            </div>

                            {/* Yıldızlar */}
                            <div className="flex items-center gap-1.5">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <Star 
                                        key={i} 
                                        className={cn(
                                            "w-7 h-7 sm:w-8 sm:h-8 transition-transform",
                                            i < starsCount ? "fill-amber-400 text-amber-400 scale-110 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]" : "text-slate-700 scale-90"
                                        )} 
                                    />
                                ))}
                            </div>

                            {/* Tebrik Mesajı */}
                            <div className="space-y-1.5">
                                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-md">
                                    Tebrikler! Sınıf Okumasına Hazırsın 🌟
                                </h3>
                                <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                                    <strong>{currentStage.title}</strong> adımını egzersiz ve oyunla başarıyla tamamladın. Artık sınıfta öğretmenine ve arkadaşlarına bu adımı güvenle okuyabilirsin!
                                </p>
                            </div>

                            {/* Skor ve İstatistikler Kutusu */}
                            <div className="grid grid-cols-3 gap-2 w-full p-4 rounded-3xl bg-slate-900 border border-white/10 shadow-xl">
                                <div className="p-2 rounded-2xl bg-white/5 border border-white/5">
                                    <div className="text-[10px] text-slate-400 font-bold uppercase">Toplam Puan</div>
                                    <div className="text-lg font-black text-amber-400 font-mono mt-0.5">
                                        {score}
                                    </div>
                                </div>
                                <div className="p-2 rounded-2xl bg-white/5 border border-white/5">
                                    <div className="text-[10px] text-slate-400 font-bold uppercase">Maks Combo</div>
                                    <div className="text-lg font-black text-rose-400 font-mono mt-0.5">
                                        🔥 x{maxStreak || 1}
                                    </div>
                                </div>
                                <div className="p-2 rounded-2xl bg-white/5 border border-white/5">
                                    <div className="text-[10px] text-slate-400 font-bold uppercase">Egzersiz</div>
                                    <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">
                                        %{exercisePercent}
                                    </div>
                                </div>
                            </div>

                            {/* Eğer Yanlış Yapılan Kartlar Varsa Tekrar Önerisi */}
                            {mistakes.length > 0 && (
                                <div className="w-full p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-left space-y-2">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                                        <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
                                        <span>Sınıfta okumadan önce şu kartlara bir kez daha göz atabilirsin:</span>
                                    </div>
                                    <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
                                        {mistakes.map(mIdx => {
                                            const asset = getStageItemAssetUrls(currentStage.id, mIdx);
                                            return (
                                                <button
                                                    key={mIdx}
                                                    type="button"
                                                    onClick={() => playStageAudio(asset?.audio)}
                                                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-amber-500/40 text-xs font-bold text-white hover:bg-amber-500/20 flex items-center gap-1.5 shrink-0 cursor-pointer"
                                                    title={`${asset?.name || `Kart ${mIdx}`} (Dinle)`}
                                                >
                                                    <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                                                    <span>{asset?.name || `Kart #${mIdx}`}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Aksiyon Butonları */}
                            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full pt-2">
                                <Link 
                                    href="/elifba/macera"
                                    onClick={() => onOpenChange(false)}
                                    className="w-full sm:w-auto h-11 px-4 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                    <span>🗺️ Macera Haritası</span>
                                </Link>

                                <Button
                                    variant="outline"
                                    onClick={handleRetryQuiz}
                                    className="w-full sm:flex-1 h-11 rounded-2xl border-white/15 text-slate-200 hover:bg-white/10 text-xs sm:text-sm font-bold gap-2 cursor-pointer"
                                >
                                    <RotateCcw className="w-4 h-4" /> Yeniden Oyna
                                </Button>

                                {nextStage ? (
                                    <Button
                                        onClick={handleGoToNextStage}
                                        className="w-full sm:flex-1 h-11 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-900/40 gap-2 cursor-pointer"
                                    >
                                        <span>Sonraki Adıma Geç (Adım {nextStage.stepNumber})</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={() => onOpenChange(false)}
                                        className="w-full sm:flex-1 h-11 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-xs sm:text-sm shadow-lg gap-2 cursor-pointer"
                                    >
                                        <Check className="w-4 h-4" />
                                        <span>Tamamla &amp; Kapat</span>
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* ══ 3. ALT BİLGİ VE HIZLI GEÇİŞ ÇUBUĞU ══ */}
                <div className="p-3 border-t border-white/10 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400 px-4 sm:px-6 shrink-0">
                    <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-emerald-400" />
                        <span className="text-[11px] font-medium hidden sm:inline">
                            Diyanet İşleri Başkanlığı Elifba Müfredatı ile %100 Uyumlu
                        </span>
                        <span className="text-[11px] font-medium sm:hidden">
                            Diyanet Elifba Müfredatı
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {activeTab === 'exercise' && (
                            <button
                                type="button"
                                onClick={handleStartQuiz}
                                className="text-amber-400 hover:text-amber-300 font-bold text-xs flex items-center gap-1 cursor-pointer"
                            >
                                <span>Pekiştirme Oyununa Geç</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        )}
                        {activeTab === 'quiz' && (
                            <button
                                type="button"
                                onClick={() => setActiveTab('exercise')}
                                className="text-slate-400 hover:text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                <span>Egzersize Dön</span>
                            </button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
