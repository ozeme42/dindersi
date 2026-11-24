'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import confetti from 'canvas-confetti';
import { 
    ADVENTURE_STAGES, 
    ADVENTURE_ISLANDS, 
    MASCOT_QUOTES,
    AdventureStage, 
    AdventureItem, 
    AdventurePlayerData,
    playAdventureTone,
    loadAdventurePlayerData,
    saveAdventurePlayerData
} from '@/lib/elifba-adventure-data';
import { 
    Home, 
    ArrowLeft, 
    Volume2, 
    VolumeX, 
    RotateCcw, 
    Award, 
    Trophy, 
    Star, 
    Check, 
    Sparkles, 
    Lock, 
    Unlock, 
    Printer, 
    ChevronRight, 
    ChevronLeft, 
    Play, 
    Heart, 
    BookOpen, 
    Gamepad2, 
    X,
    Smile,
    FastForward
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type ViewMode = 'map' | 'practice' | 'quiz';

interface QuizQuestion {
    target: AdventureItem;
    options: AdventureItem[];
}

export default function ElifbaMaceraPage() {
    // Oyuncu Durumu
    const [playerData, setPlayerData] = useState<AdventurePlayerData>({
        name: "Küçük Hafız",
        unlockedStage: 1,
        stageStars: {},
        stageScores: {},
        badges: []
    });

    const [isLoaded, setIsLoaded] = useState(false);
    const [activeIslandId, setActiveIslandId] = useState<number>(0); // 0 = Hepsi
    const [viewMode, setViewMode] = useState<ViewMode>('map');
    const [currentStageId, setCurrentStageId] = useState<number>(1);
    const [soundEnabled, setSoundEnabled] = useState(true);

    // Modallar
    const [isNameModalOpen, setIsNameModalOpen] = useState(false);
    const [nameInputValue, setNameInputValue] = useState("");
    const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
    const [isBadgesModalOpen, setIsBadgesModalOpen] = useState(false);
    const [isVictoryModalOpen, setIsVictoryModalOpen] = useState(false);
    const [victoryStars, setVictoryStars] = useState(3);
    const [victoryScoreGain, setVictoryScoreGain] = useState(500);

    // Maskot Hüdhüd State
    const [mascotQuote, setMascotQuote] = useState("Merhaba! Maceraya hazır mısın? İstasyonlara tıkla ve başla! 🐥");

    // Ses Oynatıcı Ref
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Egzersiz Modu State'leri
    const [practiceIndex, setPracticeIndex] = useState(0);
    const [practiceRepetitions, setPracticeRepetitions] = useState<Record<string, number>>({});
    const [playbackRate, setPlaybackRate] = useState<number>(1.0);

    // Soru Arenası (Quiz) State'leri
    const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [stageScore, setStageScore] = useState(0);
    const [stageMistakes, setStageMistakes] = useState(0);
    const [lives, setLives] = useState(3);
    const [selectedOptId, setSelectedOptId] = useState<string | null>(null);
    const [optFeedback, setOptFeedback] = useState<'correct' | 'wrong' | null>(null);

    // İlk Yüklemede LocalStorage'dan Oku
    useEffect(() => {
        const loaded = loadAdventurePlayerData();
        setPlayerData(loaded);
        setNameInputValue(loaded.name);
        setIsLoaded(true);

        // İsim varsayılansa açılışta sor
        if (typeof window !== 'undefined' && !localStorage.getItem('elifbam_adventure_player_name')) {
            setIsNameModalOpen(true);
        }
    }, []);

    // Toplam İstatistikler
    const totalStars = useMemo(() => {
        return Object.values(playerData.stageStars).reduce((acc, curr) => acc + curr, 0);
    }, [playerData.stageStars]);

    const totalScore = useMemo(() => {
        return Object.values(playerData.stageScores).reduce((acc, curr) => acc + curr, 0);
    }, [playerData.stageScores]);

    // Aktif Aşama Verisi
    const currentStage = useMemo(() => {
        return ADVENTURE_STAGES.find(s => s.id === currentStageId) || ADVENTURE_STAGES[0];
    }, [currentStageId]);

    // Filtrelenmiş Aşamalar
    const filteredStages = useMemo(() => {
        if (activeIslandId === 0) return ADVENTURE_STAGES;
        return ADVENTURE_STAGES.filter(s => s.islandId === activeIslandId);
    }, [activeIslandId]);

    // Ses Çalma Yardımcısı
    const playAudio = useCallback((audioUrl: string, customRate?: number) => {
        if (!soundEnabled) return;
        try {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
            const audio = new Audio(audioUrl);
            audio.playbackRate = customRate ?? playbackRate;
            audioRef.current = audio;
            audio.play().catch(e => console.log("Otomatik ses kısıtlandı:", e));
        } catch (e) {
            console.error("Audio error:", e);
        }
    }, [soundEnabled, playbackRate]);

    // Maskot Konuşma Fonksiyonu
    const mascotCheer = () => {
        if (soundEnabled) playAdventureTone('chirp');
        const randomQuote = MASCOT_QUOTES[Math.floor(Math.random() * MASCOT_QUOTES.length)];
        setMascotQuote(randomQuote);
    };

    // İsim Kaydetme
    const handleSavePlayerName = () => {
        if (soundEnabled) playAdventureTone('click');
        const trimmed = nameInputValue.trim();
        const newName = trimmed.length > 0 ? trimmed : "Küçük Hafız";
        const updated = { ...playerData, name: newName };
        setPlayerData(updated);
        saveAdventurePlayerData(updated);
        setIsNameModalOpen(false);
        setMascotQuote(`Harika! Maceraya hoş geldin ${newName}! 🌟`);
    };

    // Tüm Aşamaları Aç (Serbest Keşif)
    const handleUnlockAllStages = () => {
        if (soundEnabled) playAdventureTone('fanfare');
        confetti({ particleCount: 75, spread: 80, origin: { y: 0.6 } });
        const updated: AdventurePlayerData = {
            ...playerData,
            unlockedStage: 19
        };
        setPlayerData(updated);
        saveAdventurePlayerData(updated);
        setMascotQuote("Tüm 19 aşama açıldı! İstediğin adıma tıklayıp oynayabilirsin! 🌟");
    };

    // İlerlemeyi Sıfırla
    const handleResetProgress = () => {
        if (confirm("Tüm macera ilerlemenizi ve yıldızlarınızı sıfırlayıp 1. Aşamadan baştan başlamak istiyor musunuz?")) {
            const updated: AdventurePlayerData = {
                ...playerData,
                unlockedStage: 1,
                stageStars: {},
                stageScores: {},
                badges: []
            };
            setPlayerData(updated);
            saveAdventurePlayerData(updated);
            if (soundEnabled) playAdventureTone('click');
            setMascotQuote("İlerleme sıfırlandı. 1. Aşamadan yeniden başlayabilirsin! 🚀");
        }
    };

    // Aşamaya Tıklama -> Aşama Seçim Menüsü veya Doğrudan Başlatma
    const handleSelectStage = (stageId: number, mode: 'practice' | 'quiz') => {
        if (soundEnabled) playAdventureTone('click');
        setCurrentStageId(stageId);
        const stage = ADVENTURE_STAGES.find(s => s.id === stageId) || ADVENTURE_STAGES[0];

        if (mode === 'practice') {
            setPracticeIndex(0);
            setViewMode('practice');
            setMascotQuote(`${stage.title} alıştırması başladı! Her sesi dinle ve tekrar et! 🎧`);
        } else {
            startQuizMode(stage);
        }
    };

    // Soru Arenasını Başlatma
    const startQuizMode = (stage: AdventureStage) => {
        // 5 Soru Havuzu Oluştur
        const questions: QuizQuestion[] = [];
        const items = [...stage.items];

        for (let i = 0; i < 5; i++) {
            const target = items[Math.floor(Math.random() * items.length)];

            // Çeldiriciler
            let distractorPool = items.filter(it => it.id !== target.id);
            if (distractorPool.length < 3) {
                // Diğer aşamalardan rastgele öğeler ekle
                ADVENTURE_STAGES.forEach(st => {
                    st.items.forEach(it => {
                        if (it.id !== target.id && !distractorPool.some(d => d.id === it.id)) {
                            distractorPool.push(it);
                        }
                    });
                });
            }

            distractorPool.sort(() => Math.random() - 0.5);
            const options = [target, ...distractorPool.slice(0, 3)].sort(() => Math.random() - 0.5);

            questions.push({ target, options });
        }

        setQuizQuestions(questions);
        setCurrentQuestionIdx(0);
        setStageScore(0);
        setStageMistakes(0);
        setLives(3);
        setSelectedOptId(null);
        setOptFeedback(null);
        setViewMode('quiz');
        setMascotQuote(`${stage.title} Soru Arenası başladı! Sesi dinle ve doğru kartı seç! 🌟`);
    };

    // Soru Sesi Çalma
    const playCurrentQuestionAudio = () => {
        if (quizQuestions[currentQuestionIdx]) {
            playAudio(quizQuestions[currentQuestionIdx].target.audSrc);
        }
    };

    // Quiz Sorusu Değişince Sesi Otomatik Oynat
    useEffect(() => {
        if (viewMode === 'quiz' && quizQuestions[currentQuestionIdx]) {
            const timer = setTimeout(() => {
                playAudio(quizQuestions[currentQuestionIdx].target.audSrc);
            }, 250);
            return () => clearTimeout(timer);
        }
    }, [viewMode, currentQuestionIdx, quizQuestions, playAudio]);

    // Egzersiz Kartı Değişince Sesi Otomatik Oynat
    useEffect(() => {
        if (viewMode === 'practice' && currentStage.items[practiceIndex]) {
            const timer = setTimeout(() => {
                playAudio(currentStage.items[practiceIndex].audSrc);
            }, 250);
            return () => clearTimeout(timer);
        }
    }, [viewMode, practiceIndex, currentStage, playAudio]);

    // Quiz Seçenek Tıklaması
    const handleSelectOption = (opt: AdventureItem) => {
        if (selectedOptId !== null || optFeedback !== null) return; // Yanıt beklerken tıklama engeli

        const currentQ = quizQuestions[currentQuestionIdx];
        if (!currentQ) return;

        setSelectedOptId(opt.id);
        const isCorrect = String(opt.id) === String(currentQ.target.id);

        if (isCorrect) {
            setOptFeedback('correct');
            if (soundEnabled) playAdventureTone('correct');
            confetti({ particleCount: 35, spread: 60, origin: { y: 0.7 } });
            setStageScore(prev => prev + 100);
            setMascotQuote("Harika! Doğru bildin! Maşallah! 🌟");

            setTimeout(() => {
                setSelectedOptId(null);
                setOptFeedback(null);

                if (currentQuestionIdx + 1 < quizQuestions.length) {
                    setCurrentQuestionIdx(prev => prev + 1);
                } else {
                    finishQuizSuccess();
                }
            }, 950);
        } else {
            setOptFeedback('wrong');
            if (soundEnabled) playAdventureTone('wrong');
            setStageMistakes(prev => prev + 1);
            setLives(prev => Math.max(0, prev - 1));
            setMascotQuote("Küçük bir hata oldu. Sesi tekrar dinleyip dene! 🐥");

            setTimeout(() => {
                setSelectedOptId(null);
                setOptFeedback(null);
            }, 850);
        }
    };

    // Aşama Başarıyla Bittiğinde
    const finishQuizSuccess = () => {
        let stars = 3;
        if (stageMistakes >= 2) stars = 1;
        else if (stageMistakes === 1) stars = 2;

        setVictoryStars(stars);
        setVictoryScoreGain(stageScore);

        // İlerlemeyi Kaydet
        const prevStars = playerData.stageStars[currentStageId] || 0;
        const prevScore = playerData.stageScores[currentStageId] || 0;

        const updatedStars = { ...playerData.stageStars, [currentStageId]: Math.max(stars, prevStars) };
        const updatedScores = { ...playerData.stageScores, [currentStageId]: Math.max(stageScore, prevScore) };

        const updatedBadges = [...playerData.badges];
        if (currentStage.badgeId && !updatedBadges.includes(currentStage.badgeId)) {
            updatedBadges.push(currentStage.badgeId);
        }

        const nextUnlock = Math.min(19, Math.max(playerData.unlockedStage, currentStageId + 1));

        const updatedPlayer: AdventurePlayerData = {
            ...playerData,
            unlockedStage: nextUnlock,
            stageStars: updatedStars,
            stageScores: updatedScores,
            badges: updatedBadges
        };

        setPlayerData(updatedPlayer);
        saveAdventurePlayerData(updatedPlayer);

        if (soundEnabled) playAdventureTone('fanfare');
        confetti({ particleCount: 110, spread: 90, origin: { y: 0.5 } });
        setIsVictoryModalOpen(true);
        setMascotQuote(`Tebrikler ${playerData.name}! ${currentStage.title} başarıyla tamamlandı! 🏆`);
    };

    // Sonraki Aşamaya Geç
    const handleProceedNextStage = () => {
        setIsVictoryModalOpen(false);
        if (currentStageId < 19) {
            const nextId = currentStageId + 1;
            setCurrentStageId(nextId);
            const nextSt = ADVENTURE_STAGES.find(s => s.id === nextId);
            if (nextSt) {
                startQuizMode(nextSt);
            }
        } else {
            setIsCertificateModalOpen(true);
            setViewMode('map');
        }
    };

    if (!isLoaded) {
        return (
            <div className="min-h-screen bg-sky-50 flex items-center justify-center">
                <div className="text-center font-bold text-sky-800 text-lg animate-pulse">
                    🗺️ Elifba Macerası Yükleniyor...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-sky-100 via-emerald-50/50 to-amber-50 text-slate-800 font-sans selection:bg-amber-300 selection:text-amber-900 pb-24 relative select-none">
            
            {/* ══ ÜST GEZİNME VE OYUNCU PROFİL ÇUBUĞU ══ */}
            <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b-2 border-sky-200 shadow-sm px-4 py-3">
                <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-2">
                    
                    {/* Geri Butonları */}
                    <div className="flex items-center gap-2">
                        {viewMode !== 'map' ? (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => {
                                    if (soundEnabled) playAdventureTone('click');
                                    setViewMode('map');
                                }}
                                className="rounded-full border-sky-300 font-bold text-sky-800 hover:bg-sky-50 gap-1.5"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span>Haritaya Dön</span>
                            </Button>
                        ) : (
                            <Link href="/elifba">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="rounded-full border-slate-300 font-bold text-slate-700 hover:bg-slate-100 gap-1.5"
                                >
                                    <Home className="w-4 h-4 text-emerald-600" />
                                    <span>Elifba Portalı</span>
                                </Button>
                            </Link>
                        )}

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSoundEnabled(prev => !prev)}
                            className={cn(
                                "rounded-full w-9 h-9 border transition-all",
                                soundEnabled 
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" 
                                    : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                            )}
                            title={soundEnabled ? "Sesi Kapat" : "Sesi Aç"}
                        >
                            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                        </Button>
                    </div>

                    {/* Oyuncu Durum Kartı (Tıklanabilir İsim, Yıldızlar, Skor) */}
                    <div className="bg-white border-2 border-amber-300 shadow-sm shadow-amber-200/50 rounded-full px-4 py-1.5 flex items-center gap-3.5 sm:gap-5 text-sm font-extrabold">
                        
                        {/* Öğrenci İsmi */}
                        <button 
                            onClick={() => setIsNameModalOpen(true)}
                            className="flex items-center gap-1.5 text-sky-800 hover:text-sky-600 border-b-2 border-dashed border-sky-400 group transition-colors"
                            title="İsmini değiştirmek için tıkla"
                        >
                            <span className="text-base">👤</span>
                            <span className="truncate max-w-[110px] sm:max-w-[160px]">{playerData.name}</span>
                        </button>

                        {/* Toplam Yıldız */}
                        <div className="flex items-center gap-1 text-amber-500 font-black">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                            <span>{totalStars}</span>
                        </div>

                        {/* Toplam Skor */}
                        <div className="flex items-center gap-1 text-orange-600 font-black">
                            <Trophy className="w-4 h-4 text-orange-500" />
                            <span>{totalScore}</span>
                        </div>

                    </div>

                </div>
            </header>

            {/* ══ BAŞLIK VE MOTİVASYON ALANI ══ */}
            <div className="max-w-5xl mx-auto px-4 pt-6 pb-2 text-center">
                <div className="inline-flex items-center gap-2 bg-sky-100 text-sky-800 text-xs sm:text-sm font-extrabold px-3 py-1 rounded-full mb-2 border border-sky-300">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Diyanet Uyumlu 19 Aşamalı Büyük Macera</span>
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-sky-700 tracking-tight drop-shadow-sm mb-1.5">
                    🗺️ Büyük Elifba Macerası
                </h1>
                <p className="text-emerald-700 text-sm sm:text-base font-bold max-w-xl mx-auto">
                    Aşama aşama harfleri, harekeleri ve kelimeleri keşfet, yıldızları topla ve Kur'an şampiyonu ol!
                </p>
            </div>

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* 1. GÖRÜNÜM: MACERA HARİTASI (MAP VIEW)                         */}
            {/* ═════════════════════════════════════════════════════════════ */}
            {viewMode === 'map' && (
                <main className="max-w-5xl mx-auto px-4 py-4 space-y-6">
                    
                    {/* Ada Filtre Sekmeleri */}
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                        <button
                            onClick={() => {
                                if (soundEnabled) playAdventureTone('click');
                                setActiveIslandId(0);
                            }}
                            className={cn(
                                "px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-black transition-all border shadow-sm",
                                activeIslandId === 0
                                    ? "bg-sky-600 text-white border-sky-700 shadow-sky-300/50 scale-105"
                                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                            )}
                        >
                            🌟 Tüm Macera (1-19)
                        </button>
                        {ADVENTURE_ISLANDS.map(island => (
                            <button
                                key={island.id}
                                onClick={() => {
                                    if (soundEnabled) playAdventureTone('click');
                                    setActiveIslandId(island.id);
                                }}
                                className={cn(
                                    "px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-black transition-all border shadow-sm flex items-center gap-1.5",
                                    activeIslandId === island.id
                                        ? "bg-emerald-600 text-white border-emerald-700 shadow-emerald-300/50 scale-105"
                                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                                )}
                            >
                                <span>{island.icon}</span>
                                <span>{island.name.replace(/^\d+\.\s*Ada:\s*/, '')}</span>
                            </button>
                        ))}
                    </div>

                    {/* Harita İstasyonları Konteyneri */}
                    <div className="bg-white rounded-3xl border-4 border-sky-200 shadow-xl p-4 sm:p-7 relative">
                        
                        {/* Harita Banner */}
                        <div className="flex items-center justify-between flex-wrap gap-3 mb-6 pb-4 border-b-2 border-slate-100">
                            <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center text-xl shadow-md shadow-orange-300/40">
                                    ⭐
                                </div>
                                <div>
                                    <h2 className="text-lg sm:text-xl font-black text-slate-800">
                                        Macera İstasyonları
                                    </h2>
                                    <p className="text-xs sm:text-sm text-slate-500 font-bold">
                                        Aşama aşama ilerle, yıldız kazan ve rozetleri aç!
                                    </p>
                                </div>
                            </div>

                            {/* Hızlı İlerleme Rozeti */}
                            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3.5 py-1.5 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-1.5">
                                <span>Açılan:</span>
                                <span className="text-amber-600 text-base">{playerData.unlockedStage} / 19</span>
                            </div>
                        </div>

                        {/* İstasyon Kartları Izgarası */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                            {filteredStages.map(stage => {
                                const isUnlocked = stage.id <= playerData.unlockedStage;
                                const isCurrent = stage.id === playerData.unlockedStage;
                                const stars = playerData.stageStars[stage.id] || 0;

                                return (
                                    <div
                                        key={stage.id}
                                        className={cn(
                                            "relative rounded-2xl p-4 border-3 transition-all flex flex-col justify-between group",
                                            isUnlocked
                                                ? isCurrent
                                                    ? "bg-amber-50/80 border-amber-400 ring-4 ring-amber-300/60 shadow-lg shadow-amber-200/50 scale-[1.02]"
                                                    : "bg-white border-sky-200 hover:border-sky-400 hover:shadow-md hover:-translate-y-0.5"
                                                : "bg-slate-50/80 border-slate-200 opacity-60 cursor-not-allowed"
                                        )}
                                    >
                                        {/* Üst Satır: Aşama Numarası, Başlık ve Kilit İkonu */}
                                        <div className="flex items-start gap-3">
                                            
                                            {/* Aşama Numarası Rozeti */}
                                            <div className={cn(
                                                "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl flex-shrink-0 shadow-sm transition-transform group-hover:scale-105",
                                                isUnlocked
                                                    ? isCurrent
                                                        ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-amber-300/50"
                                                        : "bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-sky-300/40"
                                                    : "bg-slate-200 text-slate-500"
                                            )}>
                                                {stage.id}
                                            </div>

                                            {/* Başlık ve Açıklama */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-1">
                                                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 truncate">
                                                        {stage.title}
                                                    </h3>
                                                    {isUnlocked ? (
                                                        stars > 0 ? (
                                                            <span className="text-emerald-600 text-base">✅</span>
                                                        ) : (
                                                            <span className="text-sky-500 text-sm font-black">▶️</span>
                                                        )
                                                    ) : (
                                                        <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 font-semibold line-clamp-1 mt-0.5">
                                                    {stage.desc}
                                                </p>
                                                <div className="flex items-center gap-1 text-xs mt-1 font-bold text-amber-500">
                                                    {isUnlocked ? (
                                                        <span>
                                                            {stars === 3 ? '⭐⭐⭐' : stars === 2 ? '⭐⭐☆' : stars === 1 ? '⭐☆☆' : '☆☆☆'}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400">Kilitli</span>
                                                    )}
                                                    {playerData.stageScores[stage.id] ? (
                                                        <span className="text-slate-400 text-[10px] ml-1">
                                                            ({playerData.stageScores[stage.id]}p)
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Alt Butonlar (Alıştırma ve Oyun) */}
                                        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={!isUnlocked}
                                                onClick={() => handleSelectStage(stage.id, 'practice')}
                                                className="rounded-xl text-xs font-bold border-sky-300 text-sky-800 hover:bg-sky-50 h-8 gap-1"
                                            >
                                                <BookOpen className="w-3.5 h-3.5 text-sky-600" />
                                                <span>Alıştırma</span>
                                            </Button>

                                            <Button
                                                size="sm"
                                                disabled={!isUnlocked}
                                                onClick={() => handleSelectStage(stage.id, 'quiz')}
                                                className={cn(
                                                    "rounded-xl text-xs font-black h-8 gap-1 shadow-sm",
                                                    isCurrent
                                                        ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-300/40"
                                                        : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-300/30"
                                                )}
                                            >
                                                <Gamepad2 className="w-3.5 h-3.5" />
                                                <span>Oyna</span>
                                            </Button>
                                        </div>

                                    </div>
                                );
                            })}
                        </div>

                        {/* ══ ALT AKSİYON ÇUBUĞU (SERTİFİKA, ROZETLER, SERBEST KEŞİF, SIFIRLA) ══ */}
                        <div className="flex items-center justify-center gap-2.5 sm:gap-3 flex-wrap mt-8 pt-6 border-t-2 border-slate-100">
                            
                            {/* Başarı Sertifikamı Gör */}
                            <Button
                                onClick={() => {
                                    if (soundEnabled) playAdventureTone('fanfare');
                                    setIsCertificateModalOpen(true);
                                }}
                                className="rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs sm:text-sm px-4 sm:px-6 py-2.5 shadow-md shadow-orange-300/50 gap-2 active:scale-95 transition-all"
                            >
                                <GraduationCapIcon className="w-4 h-4" />
                                <span>Başarı Sertifikamı Gör</span>
                            </Button>

                            {/* Rozetler & Etiketler */}
                            <Button
                                onClick={() => {
                                    if (soundEnabled) playAdventureTone('click');
                                    setIsBadgesModalOpen(true);
                                }}
                                className="rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs sm:text-sm px-4 sm:px-5 py-2.5 shadow-md shadow-purple-300/50 gap-2 active:scale-95 transition-all"
                            >
                                <Award className="w-4 h-4" />
                                <span>Kazanılan Rozetler ({playerData.badges.length})</span>
                            </Button>

                            {/* Tüm Aşamaları Aç */}
                            <Button
                                variant="outline"
                                onClick={handleUnlockAllStages}
                                className="rounded-full border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold text-xs sm:text-sm px-4 py-2.5 gap-1.5 active:scale-95"
                            >
                                <Unlock className="w-4 h-4 text-emerald-600" />
                                <span>Tüm Aşamaları Aç</span>
                            </Button>

                            {/* İlerlemeyi Sıfırla */}
                            <Button
                                variant="ghost"
                                onClick={handleResetProgress}
                                className="rounded-full text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-bold px-3 py-2 gap-1"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Sıfırla</span>
                            </Button>

                        </div>

                    </div>
                </main>
            )}

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* 2. GÖRÜNÜM: ALIŞTIRMA & KEŞFET (PRACTICE FLASHCARD VIEW)        */}
            {/* ═════════════════════════════════════════════════════════════ */}
            {viewMode === 'practice' && (
                <main className="max-w-2xl mx-auto px-4 py-6">
                    <div className="bg-white rounded-3xl border-4 border-sky-300 shadow-2xl p-6 sm:p-8 text-center relative">
                        
                        {/* Üst Gezinme HUD */}
                        <div className="flex items-center justify-between gap-2 mb-6">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setViewMode('map')}
                                className="rounded-full text-slate-600 hover:bg-slate-100 font-bold gap-1 text-xs"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span>Harita</span>
                            </Button>

                            <div className="bg-sky-100 text-sky-800 font-black px-3.5 py-1 rounded-full text-xs sm:text-sm">
                                Kart: {practiceIndex + 1} / {currentStage.items.length}
                            </div>

                            {/* Yavaş Okuma (0.75x) Butonu */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    const nextRate = playbackRate === 1.0 ? 0.75 : 1.0;
                                    setPlaybackRate(nextRate);
                                    if (currentStage.items[practiceIndex]) {
                                        playAudio(currentStage.items[practiceIndex].audSrc, nextRate);
                                    }
                                }}
                                className={cn(
                                    "rounded-full text-xs font-bold px-3 py-1 h-8 gap-1",
                                    playbackRate === 0.75 ? "bg-amber-100 border-amber-300 text-amber-900" : "text-slate-600"
                                )}
                            >
                                <FastForward className="w-3.5 h-3.5" />
                                <span>{playbackRate === 0.75 ? '0.75x (Yavaş)' : '1.0x (Normal)'}</span>
                            </Button>
                        </div>

                        {/* Başlık */}
                        <div className="mb-4">
                            <Badge className="bg-sky-100 text-sky-800 border-sky-300 font-black text-xs mb-1">
                                {currentStage.title}
                            </Badge>
                            <h2 className="text-xl sm:text-2xl font-black text-slate-800">
                                Dinle, Gör ve Seslendir!
                            </h2>
                        </div>

                        {/* Büyük Kart Alanı */}
                        {currentStage.items[practiceIndex] && (
                            <div className="bg-gradient-to-b from-sky-50 to-white rounded-3xl border-3 border-sky-200 p-6 sm:p-8 my-4 shadow-inner flex flex-col items-center justify-center min-h-[220px]">
                                
                                {/* Resim veya Arapça Metin */}
                                <div className="h-32 sm:h-40 flex items-center justify-center mb-3">
                                    <img 
                                        src={currentStage.items[practiceIndex].imgSrc}
                                        alt={currentStage.items[practiceIndex].name}
                                        className="max-h-full max-w-[200px] object-contain drop-shadow-md select-none pointer-events-none"
                                        onError={(e) => {
                                            // Resim bulunamazsa büyük Arapça font fallback'i
                                            (e.target as HTMLElement).style.display = 'none';
                                        }}
                                    />
                                    {currentStage.items[practiceIndex].arabic && (
                                        <div className="text-6xl sm:text-7xl font-bold font-serif text-slate-900 drop-shadow-sm select-none" dir="rtl">
                                            {currentStage.items[practiceIndex].arabic}
                                        </div>
                                    )}
                                </div>

                                {/* Okunuş Adı */}
                                <div className="text-2xl sm:text-3xl font-black text-sky-800 tracking-wide">
                                    {currentStage.items[practiceIndex].name}
                                </div>

                                {/* Büyük Ses Dinleme Butonu */}
                                <Button
                                    onClick={() => playAudio(currentStage.items[practiceIndex].audSrc)}
                                    className="mt-4 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-extrabold px-6 py-3 shadow-lg shadow-sky-300/50 gap-2 transform active:scale-95 transition-all text-sm sm:text-base animate-pulse"
                                >
                                    <Volume2 className="w-5 h-5" />
                                    <span>Sesi Tekrar Dinle</span>
                                </Button>
                            </div>
                        )}

                        {/* İleri / Geri Kart Butonları */}
                        <div className="flex items-center justify-between gap-3 mt-6">
                            <Button
                                variant="outline"
                                disabled={practiceIndex === 0}
                                onClick={() => {
                                    if (soundEnabled) playAdventureTone('click');
                                    setPracticeIndex(prev => Math.max(0, prev - 1));
                                }}
                                className="rounded-2xl border-slate-300 font-bold px-4 py-2 h-11 gap-1 text-slate-700"
                            >
                                <ChevronLeft className="w-5 h-5" />
                                <span>Önceki Kart</span>
                            </Button>

                            {/* 3 Kez Tekrar Ettim Butonu */}
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    if (soundEnabled) playAdventureTone('correct');
                                    const currentId = currentStage.items[practiceIndex]?.id || String(practiceIndex);
                                    setPracticeRepetitions(prev => ({
                                        ...prev,
                                        [currentId]: (prev[currentId] || 0) + 1
                                    }));
                                    setMascotQuote("Harikasın! Tekrar ederek harfleri kalbine yazıyorsun! 🌟");
                                }}
                                className="rounded-2xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-extrabold text-xs sm:text-sm px-3 sm:px-4 h-11 border border-amber-300"
                            >
                                <span>👍 Tekrar Ettim</span>
                                {practiceRepetitions[currentStage.items[practiceIndex]?.id || String(practiceIndex)] ? (
                                    <span className="bg-amber-400 text-amber-950 px-1.5 py-0.5 rounded-full text-xs font-black ml-1">
                                        {practiceRepetitions[currentStage.items[practiceIndex]?.id || String(practiceIndex)]}x
                                    </span>
                                ) : null}
                            </Button>

                            <Button
                                disabled={practiceIndex >= currentStage.items.length - 1}
                                onClick={() => {
                                    if (soundEnabled) playAdventureTone('click');
                                    setPracticeIndex(prev => Math.min(currentStage.items.length - 1, prev + 1));
                                }}
                                className="rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold px-4 py-2 h-11 gap-1"
                            >
                                <span>Sonraki</span>
                                <ChevronRight className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Soru Arenasına Geçiş Butonu */}
                        <div className="mt-8 pt-6 border-t-2 border-slate-100">
                            <Button
                                onClick={() => startQuizMode(currentStage)}
                                className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-base sm:text-lg py-4 shadow-xl shadow-emerald-200/60 gap-2 transform active:scale-95 transition-all"
                            >
                                <Gamepad2 className="w-6 h-6" />
                                <span>🚀 Hazırım! Soru Arenasına Başla</span>
                            </Button>
                        </div>

                    </div>
                </main>
            )}

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* 3. GÖRÜNÜM: OYUN / SORU ARENASI (QUIZ ARENA VIEW)              */}
            {/* ═════════════════════════════════════════════════════════════ */}
            {viewMode === 'quiz' && (
                <main className="max-w-2xl mx-auto px-4 py-6">
                    <div className="bg-white rounded-3xl border-4 border-sky-300 shadow-2xl p-6 sm:p-8 text-center relative">
                        
                        {/* Üst HUD Çubuğu */}
                        <div className="flex items-center justify-between gap-2 mb-6">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setViewMode('map')}
                                className="rounded-full text-slate-600 hover:bg-slate-100 font-bold gap-1 text-xs"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span>Haritaya Dön</span>
                            </Button>

                            {/* İlerleme Rozeti */}
                            <div className="bg-sky-100 border border-sky-300 text-sky-800 font-black px-3.5 py-1 rounded-full text-xs sm:text-sm">
                                Soru: {currentQuestionIdx + 1} / {quizQuestions.length}
                            </div>

                            {/* Puan ve Canlar */}
                            <div className="flex items-center gap-2">
                                <div className="bg-amber-100 border border-amber-300 text-amber-900 font-black px-3 py-1 rounded-full text-xs sm:text-sm">
                                    Puan: <span className="text-orange-600 font-black">{stageScore}</span>
                                </div>
                                <div className="flex items-center text-rose-500 text-sm">
                                    {Array.from({ length: 3 }).map((_, i) => (
                                        <Heart 
                                            key={i} 
                                            className={cn(
                                                "w-4 h-4 transition-all",
                                                i < lives ? "fill-rose-500 text-rose-500" : "text-slate-300"
                                            )} 
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Soru Kutusu */}
                        {quizQuestions[currentQuestionIdx] && (
                            <div className="mb-6">
                                <Badge className="bg-sky-100 text-sky-800 border-sky-300 font-black text-xs mb-2">
                                    {currentStage.title}
                                </Badge>
                                <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-4">
                                    Sesi dinle ve doğru harfe dokun!
                                </h2>

                                {/* Büyük Ses Çalma Butonu */}
                                <button
                                    onClick={playCurrentQuestionAudio}
                                    className="inline-flex items-center gap-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-black text-base sm:text-lg px-8 py-3.5 rounded-full shadow-lg shadow-sky-300/50 transform active:scale-95 transition-all animate-bounce"
                                >
                                    <Volume2 className="w-6 h-6" />
                                    <span>Sesi Tekrar Dinle</span>
                                </button>
                            </div>
                        )}

                        {/* 4 Seçenek Kartı Grid */}
                        {quizQuestions[currentQuestionIdx] && (
                            <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-6">
                                {quizQuestions[currentQuestionIdx].options.map(opt => {
                                    const isSelected = selectedOptId === opt.id;
                                    const isTarget = String(opt.id) === String(quizQuestions[currentQuestionIdx].target.id);
                                    
                                    let cardStyle = "bg-slate-50 border-slate-200 hover:border-sky-400 hover:bg-white hover:scale-[1.02]";

                                    if (isSelected && optFeedback === 'correct') {
                                        cardStyle = "bg-emerald-100 border-emerald-500 ring-4 ring-emerald-300/70 scale-105 shadow-lg shadow-emerald-200/50 animate-pulse";
                                    } else if (isSelected && optFeedback === 'wrong') {
                                        cardStyle = "bg-rose-100 border-rose-500 ring-4 ring-rose-300/70 animate-shake";
                                    } else if (optFeedback === 'wrong' && isTarget) {
                                        // Yanlış yapınca doğru cevabı hafifçe vurgula
                                        cardStyle = "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200";
                                    }

                                    return (
                                        <button
                                            key={opt.id}
                                            disabled={selectedOptId !== null}
                                            onClick={() => handleSelectOption(opt)}
                                            className={cn(
                                                "rounded-2xl border-3 p-4 sm:p-5 flex flex-col items-center justify-center min-h-[130px] sm:min-h-[150px] transition-all cursor-pointer relative shadow-sm",
                                                cardStyle
                                            )}
                                        >
                                            {/* Resim veya Arapça Metin */}
                                            <div className="h-16 sm:h-20 flex items-center justify-center mb-1">
                                                <img 
                                                    src={opt.imgSrc} 
                                                    alt={opt.name} 
                                                    className="max-h-full max-w-[90px] object-contain drop-shadow select-none pointer-events-none"
                                                    onError={(e) => {
                                                        (e.target as HTMLElement).style.display = 'none';
                                                    }}
                                                />
                                                {opt.arabic && (
                                                    <div className="text-4xl sm:text-5xl font-bold font-serif text-slate-900 select-none" dir="rtl">
                                                        {opt.arabic}
                                                    </div>
                                                )}
                                            </div>

                                            {/* İsim Etiketi */}
                                            <div className="font-extrabold text-sm sm:text-base text-sky-900 mt-1">
                                                {opt.name}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                    </div>
                </main>
            )}

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* SEVİMLİ MASKOT HÜDHÜD (🐥)                                    */}
            {/* ═════════════════════════════════════════════════════════════ */}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end pointer-events-none">
                
                {/* Konuşma Balonu */}
                <div 
                    onClick={mascotCheer}
                    className="pointer-events-auto cursor-pointer bg-white border-3 border-amber-400 rounded-2xl px-3.5 py-2.5 max-w-[240px] shadow-xl text-xs sm:text-sm font-extrabold text-amber-950 mb-2 relative animate-fade-in transition-transform hover:scale-105"
                >
                    <div>{mascotQuote}</div>
                    <div className="absolute -bottom-2 right-6 w-3 h-3 bg-white border-r-3 border-b-3 border-amber-400 transform rotate-45" />
                </div>

                {/* Hüdhüd Kuşu SVG Maskotu */}
                <div 
                    onClick={mascotCheer}
                    title="Hüdhüd'e dokun, sana moral versin!"
                    className="pointer-events-auto cursor-pointer relative transform hover:scale-110 active:scale-95 transition-transform"
                >
                    <svg className="w-16 h-16 sm:w-20 sm:h-20 drop-shadow-lg" viewBox="0 0 100 100">
                        <ellipse cx="50" cy="94" rx="32" ry="6" fill="rgba(0,0,0,0.15)"/>
                        <ellipse cx="50" cy="56" rx="34" ry="34" fill="#fbbf24"/>
                        <ellipse cx="50" cy="62" rx="26" ry="24" fill="#fef3c7"/>
                        <path d="M48 24 C45 10 38 4 36 2 C44 4 52 14 50 24" fill="#f97316"/>
                        <path d="M52 24 C55 10 62 4 64 2 C56 4 48 14 50 24" fill="#f59e0b"/>
                        <path d="M50 22 C50 6 52 0 50 0 C48 0 50 6 50 22" fill="#fbbf24"/>
                        <circle cx="38" cy="46" r="7" fill="#ffffff"/>
                        <circle cx="39" cy="46" r="4.5" fill="#1e293b"/>
                        <circle cx="41" cy="44" r="2" fill="#ffffff"/>
                        <circle cx="62" cy="46" r="7" fill="#ffffff"/>
                        <circle cx="61" cy="46" r="4.5" fill="#1e293b"/>
                        <circle cx="63" cy="44" r="2" fill="#ffffff"/>
                        <circle cx="30" cy="56" r="4" fill="#f87171" opacity="0.6"/>
                        <circle cx="70" cy="56" r="4" fill="#f87171" opacity="0.6"/>
                        <polygon points="45,52 55,52 50,65" fill="#ea580c"/>
                        <path d="M18 52 Q10 65 20 74 Q24 64 24 55 Z" fill="#d97706"/>
                        <path d="M82 52 Q90 65 80 74 Q76 64 76 55 Z" fill="#d97706"/>
                        <ellipse cx="40" cy="88" rx="5" ry="3" fill="#ea580c"/>
                        <ellipse cx="60" cy="88" rx="5" ry="3" fill="#ea580c"/>
                    </svg>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-amber-900 text-amber-200 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-400 whitespace-nowrap shadow-sm">
                        Hüdhüd 🐥
                    </div>
                </div>

            </div>

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* MODAL 1: İSİM GİRİŞ VE DÜZENLEME PENCERESİ                     */}
            {/* ═════════════════════════════════════════════════════════════ */}
            {isNameModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl border-4 border-sky-300 shadow-2xl p-6 sm:p-8 max-w-md w-full text-center relative animate-in fade-in zoom-in-95">
                        <div className="text-5xl mb-2">🌟</div>
                        <h2 className="text-2xl font-black text-sky-700 mb-1">
                            Hoş Geldin Küçük Kaşif!
                        </h2>
                        <p className="text-slate-600 text-xs sm:text-sm font-bold mb-5">
                            Elifba Macerası başlamak üzere. Başarı belgende ve oyununda görünecek adını yazar mısın?
                        </p>

                        <input 
                            type="text" 
                            value={nameInputValue}
                            onChange={(e) => setNameInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSavePlayerName()}
                            placeholder="İsmini Buraya Yaz..."
                            maxLength={25}
                            autoFocus
                            className="w-full text-center text-lg sm:text-xl font-black text-slate-800 border-3 border-sky-300 focus:border-sky-500 rounded-2xl py-3 px-4 outline-none transition-colors mb-5 shadow-inner"
                        />

                        <Button
                            onClick={handleSavePlayerName}
                            className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-base py-3 shadow-lg shadow-amber-300/50"
                        >
                            <span>🚀 Maceraya Başla!</span>
                        </Button>
                    </div>
                </div>
            )}

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* MODAL 2: AŞAMA KUTLAMA VE TEBRİK PENCERESİ                     */}
            {/* ═════════════════════════════════════════════════════════════ */}
            {isVictoryModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl border-4 border-amber-300 shadow-2xl p-6 sm:p-8 max-w-md w-full text-center relative animate-in fade-in zoom-in-95">
                        <div className="text-6xl mb-2 animate-bounce">🏆</div>
                        <h2 className="text-2xl sm:text-3xl font-black text-emerald-600 mb-1">
                            Harika İş Çıkardın!
                        </h2>
                        <p className="text-slate-600 text-xs sm:text-sm font-bold mb-4">
                            {currentStage.title} başarıyla tamamlandı!
                        </p>

                        {/* Yıldızlar */}
                        <div className="text-4xl text-amber-500 mb-3 tracking-widest">
                            {victoryStars === 3 ? '⭐⭐⭐' : victoryStars === 2 ? '⭐⭐☆' : '⭐☆☆'}
                        </div>

                        {/* Kazanılan Puan ve Rozet */}
                        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-3 text-xs sm:text-sm font-extrabold text-amber-900 mb-6">
                            <div>Kazanılan Puan: <strong className="text-orange-600">+{victoryScoreGain}</strong></div>
                            {currentStage.badgeName && (
                                <div className="mt-1 text-emerald-700">
                                    Yeni Etiket: <strong>{currentStage.badgeIcon} {currentStage.badgeName}</strong>
                                </div>
                            )}
                        </div>

                        {/* Butonlar */}
                        <div className="space-y-2">
                            <Button
                                onClick={handleProceedNextStage}
                                className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-base py-3 shadow-lg shadow-emerald-200/50"
                            >
                                {currentStageId < 19 ? (
                                    <span>➡️ Sıradaki Aşamaya Geç</span>
                                ) : (
                                    <span>🎓 Şampiyonluk Sertifikasını Aç!</span>
                                )}
                            </Button>

                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsVictoryModalOpen(false);
                                    setViewMode('map');
                                }}
                                className="w-full rounded-2xl border-slate-300 text-slate-700 font-bold"
                            >
                                🗺️ Haritaya Dön
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* MODAL 3: KAZANILAN ETİKETLER & ROZETLER ÇEKMECESİ               */}
            {/* ═════════════════════════════════════════════════════════════ */}
            {isBadgesModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl border-4 border-purple-300 shadow-2xl p-6 max-w-xl w-full text-center relative max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95">
                        
                        <button
                            onClick={() => setIsBadgesModalOpen(false)}
                            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center text-slate-500 font-bold"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-4xl mb-1">🏅</div>
                        <h2 className="text-xl sm:text-2xl font-black text-purple-900 mb-1">
                            Kazanılan Etiketler & Rozetler
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-500 font-bold mb-4">
                            Aşamaları geçtikçe açılan başarı etiketlerin ({playerData.badges.length} / 19)
                        </p>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 overflow-y-auto pr-1 py-1 flex-1">
                            {ADVENTURE_STAGES.map(stage => {
                                const isEarned = playerData.badges.includes(stage.badgeId);
                                return (
                                    <div
                                        key={stage.id}
                                        className={cn(
                                            "rounded-2xl p-3 border-2 text-center transition-all flex flex-col items-center justify-center",
                                            isEarned 
                                                ? "bg-purple-50/80 border-purple-300 shadow-sm" 
                                                : "bg-slate-50 border-slate-200 opacity-50"
                                        )}
                                    >
                                        <div className="text-3xl mb-1">
                                            {isEarned ? stage.badgeIcon : '🔒'}
                                        </div>
                                        <div className="text-xs font-black text-purple-950 truncate max-w-full">
                                            {stage.badgeName}
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-bold mt-0.5">
                                            {isEarned ? 'Kazanıldı ✨' : `${stage.id}. Aşama`}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* MODAL 4: KİŞİYE ÖZEL ŞAMPİYONLUK SERTİFİKASI (BAŞARI BELGESİ)  */}
            {/* ═════════════════════════════════════════════════════════════ */}
            {isCertificateModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
                    <div className="max-w-3xl w-full my-auto">
                        
                        {/* Yazdırılabilir Sertifika Sayfası */}
                        <div 
                            id="printable-certificate-sheet"
                            className="bg-[#fffdf5] rounded-3xl border-[12px] border-double border-amber-700 shadow-2xl p-6 sm:p-10 text-center relative overflow-hidden"
                            style={{
                                backgroundImage: 'radial-gradient(#fef3c7 15%, transparent 16%), radial-gradient(#fffbeb 15%, transparent 16%)',
                                backgroundSize: '24px 24px',
                                backgroundPosition: '0 0, 12px 12px'
                            }}
                        >
                            {/* Kapat Butonu (Ekranda görünür, yazdırmada gizlenir) */}
                            <button
                                onClick={() => setIsCertificateModalOpen(false)}
                                className="print:hidden absolute top-4 right-4 w-9 h-9 rounded-full bg-amber-100 hover:bg-rose-100 text-amber-800 hover:text-rose-600 flex items-center justify-center font-bold"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {/* Hat / Besmele */}
                            <div className="text-xl sm:text-2xl font-serif text-amber-800 mb-2 font-bold" dir="rtl">
                                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                            </div>

                            {/* Başlık */}
                            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-amber-900 tracking-tight mb-1">
                                KUR'AN-I KERİM ELİFBASI
                            </h2>
                            <div className="text-sm sm:text-base font-extrabold text-amber-700 tracking-wider mb-5">
                                🌟 ÜSTÜN BAŞARI VE ŞAMPİYONLUK BELGESİ 🌟
                            </div>

                            <p className="text-xs sm:text-sm font-bold text-amber-900 max-w-lg mx-auto mb-4">
                                Bu belge, Kur'an Harfleri Macera Yolculuğunu üstün gayretle tamamlayan öğrencimiz:
                            </p>

                            {/* Öğrenci İsmi Kutusu */}
                            <div className="inline-block bg-white border-3 border-amber-400 rounded-3xl px-8 py-3 my-2 shadow-md shadow-amber-200/50">
                                <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-sky-800">
                                    {playerData.name}
                                </h3>
                            </div>

                            {/* Tebrik Metni */}
                            <div className="text-xs sm:text-sm md:text-base font-bold text-amber-950 max-w-xl mx-auto my-5 leading-relaxed">
                                Elifba'daki harfleri, üstün, esre ve ötre harekelerini ve kelimeleri başarıyla öğrenmiş, 
                                tüm aşamaları tamamlayarak <strong className="text-amber-800">"Elifba Şampiyonu"</strong> unvanını 
                                almaya hak kazanmıştır. Kendisini tebrik eder, Kur'an yolunda ömür boyu muvaffakiyetler dileriz.
                            </div>

                            {/* İstatistik Rozetleri */}
                            <div className="flex items-center justify-center gap-3 sm:gap-6 flex-wrap my-6">
                                <div className="bg-white border-2 border-amber-300 rounded-2xl px-4 py-1.5 text-xs sm:text-sm font-extrabold text-sky-900 shadow-sm">
                                    🏆 Toplam Skor: <strong>{totalScore}</strong> Puan
                                </div>
                                <div className="bg-white border-2 border-amber-300 rounded-2xl px-4 py-1.5 text-xs sm:text-sm font-extrabold text-sky-900 shadow-sm">
                                    ⭐ Toplam Yıldız: <strong>{totalStars}</strong> Yıldız
                                </div>
                                <div className="bg-white border-2 border-amber-300 rounded-2xl px-4 py-1.5 text-xs sm:text-sm font-extrabold text-sky-900 shadow-sm">
                                    📅 Tarih: <strong>{new Date().toLocaleDateString('tr-TR')}</strong>
                                </div>
                            </div>

                            {/* Alt İmza ve Mühür Satırı */}
                            <div className="flex items-center justify-between pt-6 border-t-2 border-amber-300/60 mt-4 text-left px-2 sm:px-6">
                                <div>
                                    <div className="font-extrabold text-amber-900 text-xs sm:text-sm">
                                        Din Dersi Atölyesi
                                    </div>
                                    <div className="text-[10px] sm:text-xs text-amber-700 font-semibold">
                                        Büyük Elifba Macerası Portalı
                                    </div>
                                </div>

                                {/* Resmi Mühür */}
                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 border-4 border-dashed border-white text-white flex flex-col items-center justify-center shadow-lg shadow-amber-900/30 font-black text-[10px] sm:text-xs text-center">
                                    <span className="text-lg sm:text-xl">🏆</span>
                                    <span>ŞAMPİYON</span>
                                </div>

                                <div className="text-right">
                                    <div className="font-extrabold text-amber-900 text-xs sm:text-sm">
                                        Maskot Hüdhüd
                                    </div>
                                    <div className="text-[10px] sm:text-xs text-amber-700 font-semibold">
                                        Onaylandı ✨
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* Aksiyon Butonları (Yazdırma ve Kapatma) */}
                        <div className="print:hidden flex items-center justify-center gap-3 mt-4">
                            <Button
                                onClick={() => window.print()}
                                className="rounded-full bg-amber-600 hover:bg-amber-500 text-white font-black px-6 py-3 shadow-lg gap-2"
                            >
                                <Printer className="w-4 h-4" />
                                <span>Sertifikayı Yazdır / PDF Kaydet</span>
                            </Button>

                            <Button
                                variant="outline"
                                onClick={() => setIsCertificateModalOpen(false)}
                                className="rounded-full bg-white text-slate-700 font-bold px-6 py-3"
                            >
                                Kapat
                            </Button>
                        </div>

                    </div>
                </div>
            )}

            {/* Sertifika Yazdırma CSS'i */}
            <style jsx global>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    20%, 60% { transform: translateX(-8px); }
                    40%, 80% { transform: translateX(8px); }
                }
                .animate-shake {
                    animation: shake 0.4s ease-in-out;
                }
                @media print {
                    body * {
                        visibility: hidden !important;
                    }
                    #printable-certificate-sheet, #printable-certificate-sheet * {
                        visibility: visible !important;
                    }
                    #printable-certificate-sheet {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                    }
                }
            `}</style>

        </div>
    );
}

function GraduationCapIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
            <path d="M22 10v6" />
            <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
        </svg>
    );
}
