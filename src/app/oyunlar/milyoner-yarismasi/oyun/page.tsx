'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Phone, Users, X, Loader2, Star, LifeBuoy, Heart, Ghost, Trophy, CheckCircle, RotateCcw, Home, Save, XOctagon } from 'lucide-react';
import { playSound, stopSound } from '@/lib/audio-service';
import { cn } from '@/lib/utils';
import Confetti from 'react-dom-confetti';
import { checkAndAwardMillionaireBadge, getMillionaireQuestions, checkGamePlayLimitAction, addScore } from '../actions';
import type { Question } from '@/lib/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, serverTimestamp, writeBatch, doc, increment } from 'firebase/firestore';
import { GameEndScreen } from '@/components/game-end-screen';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { useToast } from '@/hooks/use-toast';

const MONEY_LEVELS = [
    "100", "200", "300", "400", "500", "600", "700", "800", "900", "1.000"
];

const confettiConfig = {
    angle: 90,
    spread: 360,
    startVelocity: 40,
    elementCount: 70,
    dragFriction: 0.12,
    duration: 3000,
    stagger: 3,
    width: "10px",
    height: "10px",
    perspective: "500px",
    colors: ["#a864fd", "#29cdff", "#78ff44", "#ff718d", "#fdff6a"]
};

function MilyonerGame() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading: userLoading } = useAuth();
    const { toast } = useToast(); 
    
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string|null>(null);

    const [qIndex, setQIndex] = useState(0);
    const [gameState, setGameState] = useState<'playing' | 'won' | 'lost' | 'withdraw'>('playing');
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [revealState, setRevealState] = useState('none');
    const [lifelines, setLifelines] = useState({ fifty: true, phone: true, audience: true });
    const [eliminatedOptions, setEliminatedOptions] = useState<string[]>([]);
    const [modalContent, setModalContent] = useState<any>(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);
    
    // GÖREV MODU PARAMETRELERİ
    const mode = searchParams.get('mode');
    const topicId = searchParams.get('topicId');
    const isMission = mode === 'mission';

    const gameContext = `Kim 1000 Puan İster? - ${searchParams.get('courseName') || 'Genel'} > ${searchParams.get('topicName') || 'Genel'}`;
    const backUrl = isMission ? '/student/gorevler' : '/oyunlar/milyoner-yarismasi';

    const mainContainerRef = React.useRef<HTMLDivElement>(null);

    const fetchGameData = useCallback(async () => {
        setIsLoading(true);
        const params = {
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: searchParams.get('topicId') || undefined,
        };
        const result = await getMillionaireQuestions(params);
        if (result.error || result.questions.length === 0) {
            setError(result.error || "Bu konu için oyun verisi bulunamadı.");
        } else {
            const shuffledQuestions = result.questions
                .map(q => ({
                    ...q,
                    options: q.options ? [...q.options].sort(() => Math.random() - 0.5) : []
                }))
                .slice(0, 10);
            setQuestions(shuffledQuestions);
        }
        setIsLoading(false);
    }, [searchParams]);

    useEffect(() => {
        fetchGameData();
    }, [fetchGameData]);

    const resetGame = useCallback(() => {
        setQIndex(0);
        setGameState('playing');
        setSelectedOption(null);
        setRevealState('none');
        setEliminatedOptions([]);
        setModalContent(null);
        setLifelines({ fifty: true, phone: true, audience: true });
        setShowConfetti(false);
        setIsScoreSaved(false);
        fetchGameData();
    }, [fetchGameData]);

    const resetQuestion = useCallback(() => {
        setSelectedOption(null);
        setRevealState('none');
        setEliminatedOptions([]);
        setModalContent(null);
    }, []);

    const handleEndGame = useCallback(async (endState: 'lost' | 'withdraw' | 'won', prize: number) => {
        setGameState(endState);
        if(endState === 'won') setShowConfetti(true);
    }, []);

    const handleSaveAndExit = async () => {
        // Puan hesapla
        let prize = 0;
        if (gameState === 'won') prize = 1000;
        else if (gameState === 'withdraw') prize = qIndex > 0 ? parseInt(MONEY_LEVELS[qIndex - 1].replace(/\./g, '')) : 0;
        else prize = 0; // Kaybedince 0

        // GÖREV MODU İÇİN BAŞARI ŞARTI: TAM 1000 PUAN
        const isSuccess = gameState === 'won' && prize === 1000;

        if (!user || isSaving || isScoreSaved) {
             router.push(backUrl);
             return;
        }

        // Puan yoksa kaydetmeye gerek yok (Normal modda)
        if (prize <= 0 && !isMission) {
             router.push(backUrl);
             return;
        }

        setIsSaving(true);
        try {
             // PUAN KISITLAMASI KONTROLÜ (Sadece Normal Mod İçin)
             let finalPrize = prize;
             if (!isMission) {
                 const canEarnPoints = await checkGamePlayLimitAction(user.uid, gameContext);
                 if (!canEarnPoints) {
                     finalPrize = 0;
                     toast({ title: "Bilgi", description: "Bu konudan daha fazla puan kazanamazsınız (Max 2 kez).", variant: "default" });
                 }
             }

            if (isMission && topicId) {
                // --- GÖREV MODU KAYDI (LİDERLİK TABLOSU İÇİN GÜNCELLENDİ) ---
                const batch = writeBatch(db);

                // 1. Etkinlik Kaydı (scoreEvents)
                const eventRef = doc(collection(db, 'scoreEvents'));
                batch.set(eventRef, {
                    userId: user.uid,
                    points: finalPrize, // Gerekirse kısıtlanmış puan
                    context: topicId,
                    gameType: 'milyoner-yarismasi',
                    timestamp: serverTimestamp(),
                    isMission: true,
                    completed: isSuccess
                });

                // 2. Kullanıcı Profilini Güncelleme (users -> score)
                const userRef = doc(db, 'users', user.uid);
                batch.update(userRef, {
                    score: increment(finalPrize)
                });

                // İşlemleri Kaydet
                await batch.commit();

                if (isSuccess) {
                    toast({ title: "Görev Başarılı!", description: `Tebrikler! Konuyu tamamladın ve ${finalPrize} puan eklendi.`, className: "bg-green-600 text-white" });
                } else {
                    toast({ title: "Görev Tamamlanamadı", description: "Büyük ödülü (1.000 puan) kazanmalısın.", variant: "destructive" });
                }
            } else {
                // --- NORMAL MOD KAYDI ---
                if (finalPrize > 0) {
                     const result = await addScore(user.uid, finalPrize, gameContext);
                     if (result.success) {
                         toast({ title: 'Başarılı!', description: `Kazanılan: ${finalPrize} Puan.` });
                         if(isSuccess) await checkAndAwardMillionaireBadge(user.uid);
                     } else {
                         toast({ title: 'Hata', description: "Puan kaydedilemedi.", variant: 'destructive' });
                     }
                }
            }
            setIsScoreSaved(true);
            
            // Kullanıcıyı bekletmeden yönlendir
            setTimeout(() => {
                router.push(backUrl);
            }, 1000);

        } catch (e) {
            console.error(e);
            toast({ title: 'Hata', description: "Bir hata oluştu.", variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    const checkAnswer = useCallback((answer: string) => {
        const currentQ = questions[qIndex];
        if (!currentQ) return;
        
        if (answer === currentQ.correctAnswer) {
            playSound('correct');
            setTimeout(async () => {
                if (qIndex < questions.length - 1) {
                    setQIndex(prev => prev + 1);
                    resetQuestion();
                } else {
                    // KAZANDI (SON SORU)
                    const finalPrize = 1000;
                    handleEndGame('won', finalPrize);
                }
            }, 2000);
        } else {
            playSound('incorrect');
            setTimeout(() => {
                const prize = 0; 
                handleEndGame('lost', prize);
            }, 2000);
        }
    }, [qIndex, questions, resetQuestion, handleEndGame]);

    const handleOptionSelect = useCallback((option: string) => {
        if (revealState !== 'none' || eliminatedOptions.includes(option)) return;
        
        setSelectedOption(option);
        setRevealState('selected');
        playSound('timer');
        
        setTimeout(() => {
            stopSound('timer');
            setRevealState('revealed');
            checkAnswer(option);
        }, 3000);
    }, [revealState, eliminatedOptions, checkAnswer]);
    
    const withdraw = useCallback(() => {
        const currentPrize = qIndex > 0 ? parseInt(MONEY_LEVELS[qIndex - 1].replace(/\./g, '')) : 0;
        handleEndGame('withdraw', currentPrize);
    }, [qIndex, handleEndGame]);

    const useFiftyFifty = () => {
        if (!lifelines.fifty || !questions[qIndex]) return;
        
        const currentQ = questions[qIndex];
        let wrongOptions = (currentQ.options || []).filter(opt => opt !== currentQ.correctAnswer);
        
        wrongOptions = wrongOptions.sort(() => Math.random() - 0.5).slice(0, 2);
        
        setEliminatedOptions(wrongOptions);
        setLifelines(prev => ({ ...prev, fifty: false }));
    };

    const usePhone = () => {
        if (!lifelines.phone || !questions[qIndex]) return;
        const currentQ = questions[qIndex];
        const suggestion = Math.random() < 0.8 ? currentQ.correctAnswer : currentQ.options?.[Math.floor(Math.random() * 4)];

        setModalContent({
            title: "Telefon Jokeri",
            icon: <Phone size={32} className="text-yellow-500" />,
            text: `Arkadaşın Abdullah düşünüyor...\n\n"Bence cevap kesinlikle ${suggestion}. Ama son karar senin."`
        });
        setLifelines(prev => ({ ...prev, phone: false }));
    };

    const useAudience = () => {
        if (!lifelines.audience || !questions[qIndex]) return;
        const currentQ = questions[qIndex];
        const correct = currentQ.correctAnswer;
        const options = currentQ.options || [];
        const percentages: { [key: string]: number } = {};
        let remaining = 100;
        
        percentages[correct!] = Math.floor(Math.random() * 30) + 40;
        remaining -= percentages[correct!];
        
        const wrongOptions = options.filter(opt => opt !== correct);
        const firstWrongShare = Math.floor(Math.random() * remaining);
        percentages[wrongOptions[0]] = firstWrongShare;
        remaining -= firstWrongShare;
        
        const secondWrongShare = Math.floor(Math.random() * remaining);
        percentages[wrongOptions[1]] = secondWrongShare;
        remaining -= secondWrongShare;
        
        if (wrongOptions[2]) {
            percentages[wrongOptions[2]] = remaining;
        }

        setModalContent({
            title: "Seyirci Jokeri",
            icon: <Users size={32} className="text-yellow-500" />,
            chartData: options.map(opt => ({ name: opt, value: percentages[opt] || 0 }))
        });
        setLifelines(prev => ({ ...prev, audience: false }));
    };

    if (isLoading || userLoading) {
        return <div className="flex h-screen items-center justify-center bg-[#000022]"><Loader2 className="h-12 w-12 animate-spin text-white"/></div>;
    }
    
    if (error) {
        return (
            <div className="flex h-screen w-full items-center justify-center p-4 bg-[#000022]">
                 <div className="text-center space-y-4 max-w-md bg-red-950/50 p-6 rounded-3xl border border-red-500/30">
                    <Ghost className="h-16 w-16 text-red-500 mx-auto" />
                    <h3 className="text-xl font-bold text-red-100">Oyun Başlatılamadı</h3>
                    <p className="text-red-200/70">{error}</p>
                     <Button asChild variant="secondary" className="w-full">
                        <Link href={backUrl}>Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    // --- BİTİŞ EKRANI (GameEndScreen Entegrasyonu) ---
    if (gameState !== 'playing') {
        let prize = 0;
        if (gameState === 'won') prize = 1000;
        else if (gameState === 'withdraw') prize = qIndex > 0 ? parseInt(MONEY_LEVELS[qIndex - 1].replace(/\./g, '')) : 0;
        else prize = 0;

        // GÖREV MODU İÇİN ÖZEL BİTİŞ
        if (isMission) {
            const isSuccess = prize === 1000;
             return (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in">
                        <Confetti active={showConfetti} config={confettiConfig} />
                        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border-4 border-white/20 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-white -z-10"></div>
                            
                            <div className="mb-6 flex justify-center">
                                {isSuccess ? (
                                    <div className="p-4 bg-green-100 rounded-full border-4 border-green-200 shadow-xl animate-bounce">
                                        <Trophy className="h-16 w-16 text-green-600" />
                                    </div>
                                ) : (
                                    <div className="p-4 bg-red-100 rounded-full border-4 border-red-200 shadow-xl">
                                        <XOctagon className="h-16 w-16 text-red-500" />
                                    </div>
                                )}
                            </div>

                            <h2 className="text-3xl font-black text-slate-800 mb-2">
                                {isSuccess ? "GÖREV BAŞARILI!" : "GÖREV BAŞARISIZ"}
                            </h2>
                            <p className="text-slate-500 mb-6 font-medium">
                                {isSuccess 
                                    ? "Tebrikler! 1.000 puanlık büyük ödülü kazandın." 
                                    : `Maalesef ${prize} puan kazandın. Görevi tamamlamak için 1.000 puan gerekli.`}
                            </p>
                            
                            <p className="text-2xl font-black text-emerald-600 mb-6">{prize} PUAN</p>

                            <div className="space-y-3">
                                {/* Eğer başarılıysa veya puan varsa ve henüz kaydedilmediyse */}
                                {!isScoreSaved && (
                                    <Button onClick={handleSaveAndExit} disabled={isSaving} className="w-full h-12 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200">
                                        {isSaving ? <Loader2 className="animate-spin mr-2"/> : "Kaydet ve Devam Et"}
                                    </Button>
                                )}
                                
                                {isScoreSaved && (
                                    <Button onClick={() => router.push('/student/gorevler')} className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200">
                                        <CheckCircle className="mr-2 h-5 w-5"/> Görevlere Dön
                                    </Button>
                                )}
                                
                                {(!isSuccess || isScoreSaved) && (
                                    <Button onClick={resetGame} variant="outline" className="w-full h-12 font-bold">
                                        <RotateCcw className="mr-2 h-4 w-4"/> Tekrar Dene
                                    </Button>
                                )}

                                <Button onClick={() => router.push('/student')} variant="ghost" className="w-full text-slate-400 hover:text-slate-600">
                                    <Home className="mr-2 h-4 w-4"/> Ana Menü
                                </Button>
                            </div>
                        </div>
                    </div>
            );
        }

        // NORMAL MOD İÇİN
        return (
            <GameEndScreen 
                score={prize} 
                onSave={handleSaveAndExit} 
                isSaving={isSaving} 
                scoreSaved={isScoreSaved} 
                onRestart={resetGame} 
                backUrl={backUrl} 
            />
        );
    }

    const currentQ = questions[qIndex];
    if (!currentQ) return null;

    return (
        <div ref={mainContainerRef} className="min-h-screen flex flex-col md:flex-row text-white overflow-hidden bg-[#000022] font-sans relative">
            <div className="absolute inset-0 bg-gradient-to-b from-[#020617] to-[#0f172a] -z-10"></div>
            {/* HAREKETLİ ARKA PLAN (Oyunlar Sayfası Estetiği) */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" style={{ opacity: 0.03 }}/>
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse-slow" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse-slow delay-1000" />
            </div>
            
            <style>{`
                .answer-correct { animation: blink 0.5s 3; }
                @keyframes blink { 0%, 100% { background-color: #10b981; } 50% { background-color: #34d399; } }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
            
            {/* TAM EKRAN BUTONU */}
            <div className="absolute top-4 right-4 z-50">
                 <FullscreenToggle elementRef={mainContainerRef} className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2 backdrop-blur-md" />
            </div>

            {/* ANA OYUN ALANI */}
            <div className="flex-1 flex flex-col justify-between p-4 pt-16 md:p-8 relative z-10 flex-grow overflow-y-auto">
                
                {/* ÜST BAR: JOKERLER VE ÇEKİL */}
                <div className="flex justify-between items-start mb-6">
                    {revealState === 'none' && (
                        <button onClick={withdraw} className="px-4 py-2 border-2 border-rose-500/50 bg-rose-500/10 text-rose-300 rounded-2xl hover:bg-rose-500/20 hover:border-rose-500 hover:text-white transition-all text-xs md:text-sm font-black shadow-[0_0_15px_rgba(244,63,94,0.2)]">
                            ÇEKİL
                        </button>
                    )}
                    
                    {isMission && <span className="px-4 py-1.5 bg-indigo-900/60 border border-indigo-500/50 rounded-full text-xs font-black text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.3)]">GÖREV MODU</span>}

                    <div className="flex gap-2 md:gap-3 ml-auto">
                        <button onClick={useFiftyFifty} disabled={!lifelines.fifty} className="w-12 h-12 md:w-14 md:h-14 rounded-2xl border-b-[4px] border-yellow-600 bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center font-black text-yellow-950 hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(234,179,8,0.4)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all relative" title="%50">
                            <span className="text-sm md:text-base">50:50</span>
                            {!lifelines.fifty && <X className="absolute text-red-700 w-8 h-8 drop-shadow-md" />}
                        </button>
                        <button onClick={usePhone} disabled={!lifelines.phone} className="w-12 h-12 md:w-14 md:h-14 rounded-2xl border-b-[4px] border-cyan-600 bg-gradient-to-br from-cyan-400 to-cyan-500 flex items-center justify-center font-black text-cyan-950 hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(6,182,212,0.4)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all relative" title="Telefon">
                            <Phone className="w-6 h-6 md:w-7 md:h-7" />
                            {!lifelines.phone && <X className="absolute text-red-700 w-8 h-8 drop-shadow-md" />}
                        </button>
                        <button onClick={useAudience} disabled={!lifelines.audience} className="w-12 h-12 md:w-14 md:h-14 rounded-2xl border-b-[4px] border-fuchsia-600 bg-gradient-to-br from-fuchsia-400 to-fuchsia-500 flex items-center justify-center font-black text-fuchsia-950 hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(217,70,239,0.4)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all relative" title="Seyirci">
                            <Users className="w-6 h-6 md:w-7 md:h-7" />
                            {!lifelines.audience && <X className="absolute text-red-700 w-8 h-8 drop-shadow-md" />}
                        </button>
                    </div>
                </div>

                {/* SORU KUTUSU */}
                <div className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl mx-auto z-10">
                    <div className="w-full min-h-[140px] px-6 py-8 md:px-10 md:py-10 mb-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] flex items-center justify-center text-center shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative">
                        {/* İç Işıltı */}
                        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent rounded-[2.5rem]"></div>
                        {/* Numara */}
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-black text-sm md:text-base px-6 py-1.5 rounded-full shadow-lg border border-white/20">
                            SORU {qIndex + 1}
                        </div>
                        <h2 className="text-xl md:text-2xl lg:text-3xl font-black text-white leading-relaxed drop-shadow-md z-10">
                            {currentQ.text}
                        </h2>
                    </div>
                </div>

                {/* CEVAP SEÇENEKLERİ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 w-full max-w-4xl mx-auto z-10">
                    {(currentQ.options || []).map((opt, idx) => {
                        let bgClass = "bg-white/5 hover:bg-white/10";
                        let borderClass = "border-white/10 border-b-white/20";
                        let textClass = "text-slate-200 hover:text-white";
                        let badgeClass = "text-indigo-400 bg-indigo-500/10";

                        if (revealState === 'selected' && selectedOption === opt) { 
                            bgClass = "bg-amber-500"; 
                            borderClass = "border-amber-400 border-b-amber-700";
                            textClass = "text-white";
                            badgeClass = "text-amber-900 bg-white/20";
                        }
                        if (revealState === 'revealed') {
                            if (opt === currentQ.correctAnswer) { 
                                bgClass = "bg-emerald-500 answer-correct"; 
                                borderClass = "border-emerald-400 border-b-emerald-700"; 
                                textClass = "text-white";
                                badgeClass = "text-emerald-900 bg-white/20";
                            } else if (opt === selectedOption) { 
                                bgClass = "bg-rose-500"; 
                                borderClass = "border-rose-400 border-b-rose-700";
                                textClass = "text-white";
                                badgeClass = "text-rose-900 bg-white/20";
                            }
                        }

                        if (eliminatedOptions.includes(opt)) { return <div key={idx} className="h-[64px] md:h-[76px]"></div>; }
                        
                        return (
                            <button 
                                key={idx} 
                                onClick={() => handleOptionSelect(opt)} 
                                disabled={revealState !== 'none'} 
                                className={cn(
                                    "relative px-4 py-4 md:px-6 md:py-5 text-left flex items-center rounded-2xl border-2 transition-all duration-300 w-full outline-none",
                                    "border-b-[6px] active:border-b-2 active:translate-y-1 shadow-lg",
                                    bgClass, borderClass, textClass
                                )}
                            >
                                <div className={cn("flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center font-black mr-3 md:mr-4 transition-colors", badgeClass)}>
                                    {String.fromCharCode(65 + idx)}
                                </div>
                                <span className="flex-1 font-bold text-sm md:text-lg leading-tight">{opt}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ÖDÜL MERDİVENİ */}
            <div className="w-full md:w-72 bg-black/40 backdrop-blur-xl border-b md:border-b-0 md:border-l border-white/10 p-4 flex flex-col justify-center order-first md:order-last z-20 shadow-2xl">
                <div className="flex md:flex-col-reverse gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-hide snap-x">
                    {MONEY_LEVELS.slice(0, questions.length).map((money, idx) => (
                        <div key={idx} className={cn(
                            "flex-shrink-0 snap-center flex justify-center items-center px-4 py-2 md:py-3 rounded-xl transition-all duration-300 font-black",
                            idx === qIndex 
                                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-yellow-950 scale-105 shadow-[0_0_20px_rgba(245,158,11,0.5)] border border-yellow-200 md:-ml-4' 
                                : (idx < qIndex ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-slate-400 border border-white/5')
                        )}>
                            <div className="flex items-center gap-2">
                                <span className={cn("text-xs opacity-60 hidden md:inline-block", idx === qIndex && "text-yellow-800")}>{idx + 1}.</span>
                                <span className="text-sm md:text-lg">{money} Puan</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {modalContent && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-md" onClick={() => setModalContent(null)}>
                    <div className="bg-slate-900 border-2 border-indigo-500/50 p-6 rounded-3xl max-w-sm w-full shadow-[0_0_40px_rgba(99,102,241,0.3)] relative overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent -z-10"></div>
                        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-white/10">
                            <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-500/30">
                                {modalContent.icon}
                            </div>
                            <h3 className="text-xl font-black text-white">{modalContent.title}</h3>
                        </div>
                        {modalContent.text && <p className="text-slate-300 whitespace-pre-line text-lg leading-relaxed font-medium">{modalContent.text}</p>}
                        {modalContent.chartData && (
                            <div className="flex justify-around items-end h-48 gap-3 pt-4 bg-black/30 rounded-2xl p-5 border border-white/5">
                                {modalContent.chartData.map((data: {name: string, value: number}, i: number) => (
                                    <div key={i} className="flex flex-col items-center w-1/4 h-full justify-end group">
                                        <div className="text-sm text-yellow-400 mb-2 font-black">{data.value}%</div>
                                        <div className="w-full bg-gradient-to-t from-yellow-600 to-yellow-400 rounded-t-xl transition-all duration-1000 ease-out border-t-2 border-yellow-300" style={{ height: `${data.value}%` }}></div>
                                        <div className="text-xs font-black mt-3 text-white truncate w-full text-center">{String.fromCharCode(65 + i)}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button onClick={() => setModalContent(null)} className="mt-8 w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-base font-black transition-all active:scale-95 shadow-lg shadow-indigo-600/30">
                            TAMAM
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function MilyonerOyunPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#000022]"><Loader2 className="h-12 w-12 animate-spin text-white"/></div>}>
            <MilyonerGame />
        </Suspense>
    )
}

export default MilyonerOyunPage;