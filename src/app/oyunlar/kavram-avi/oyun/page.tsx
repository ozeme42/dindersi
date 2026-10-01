'use client';

import { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getConceptHuntAction, submitConceptHuntScoreAction } from '../actions';
import type { Anagram } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { Loader2, ArrowLeft, Trophy, Zap, Crosshair, XOctagon, CheckCircle, Home, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { GameEndScreen } from '@/components/game-end-screen';
import { playSound } from '@/lib/audio-service';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, serverTimestamp, writeBatch, doc, increment } from 'firebase/firestore';
import Confetti from 'react-dom-confetti';

import { getGameBackUrl } from '@/lib/game-navigation';

// --- RENK PALETİ (Akıllı Tahta Uyumlu 3D Butonlar) ---
const LETTER_COLORS = [
    "bg-teal-500 hover:bg-teal-400 border-t border-x border-teal-300/40 border-b-teal-800 shadow-teal-500/40",
    "bg-cyan-500 hover:bg-cyan-400 border-t border-x border-cyan-300/40 border-b-cyan-800 shadow-cyan-500/40",
    "bg-sky-500 hover:bg-sky-400 border-t border-x border-sky-300/40 border-b-sky-800 shadow-sky-500/40",
    "bg-blue-500 hover:bg-blue-400 border-t border-x border-blue-300/40 border-b-blue-800 shadow-blue-500/40",
    "bg-indigo-500 hover:bg-indigo-400 border-t border-x border-indigo-300/40 border-b-indigo-800 shadow-indigo-500/40",
    "bg-emerald-500 hover:bg-emerald-400 border-t border-x border-emerald-300/40 border-b-emerald-800 shadow-emerald-500/40",
    "bg-violet-500 hover:bg-violet-400 border-t border-x border-violet-300/40 border-b-violet-800 shadow-violet-500/40",
];

// --- GÖRSEL BİLEŞENLER ---

const GameBackground = () => (
    <div className="fixed inset-0 pointer-events-none z-0 bg-slate-950 overflow-hidden">
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-teal-900/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-cyan-900/10 rounded-full blur-[120px]" style={{ animationDelay: '2s' }} />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(20,184,166,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(20,184,166,0.05)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_70%,transparent_100%)]" />
    </div>
);

const GameHUD = ({ score, current, total, onFinish, backUrl }: { score: number, current: number, total: number, onFinish: () => void, backUrl?: string }) => {
    const progress = total > 0 ? ((current + 1) / total) * 100 : 0;
    return (
        <div className="fixed top-0 left-0 right-0 z-50 p-3 sm:p-4 lg:p-6">
            <div className="max-w-6xl xl:max-w-7xl mx-auto flex items-center gap-3 sm:gap-4">
                {backUrl && (
                    <Link href={backUrl}>
                        <Button size="sm" variant="ghost" className="rounded-full font-bold h-10 w-10 md:h-12 md:w-12 p-0 text-slate-400 hover:text-white hover:bg-white/10" title="Geri Dön">
                            <ArrowLeft className="h-5 w-5 md:h-6 md:w-6" />
                        </Button>
                    </Link>
                )}
                <div className="flex-grow h-3.5 sm:h-4 md:h-5 bg-slate-900/60 backdrop-blur-md rounded-full border border-white/10 relative overflow-hidden">
                    <div 
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-teal-500 to-cyan-400 transition-all duration-700 ease-out shadow-[0_0_15px_rgba(45,212,191,0.5)]"
                        style={{ width: `${progress}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] sm:text-xs md:text-sm font-black text-slate-200 drop-shadow-md">{current + 1} / {total}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-teal-500/30 px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-full shadow-lg shadow-teal-500/10 min-w-[90px] sm:min-w-[120px] justify-center">
                        <Trophy className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-teal-400 animate-bounce" />
                        <span className="text-base sm:text-xl md:text-2xl font-black text-teal-100 font-mono tracking-widest">{score}</span>
                    </div>
                    <Button size="sm" variant="destructive" className="rounded-full font-bold h-10 w-10 md:h-12 md:w-12 p-0 shadow-lg" onClick={onFinish} title="Oyunu Bitir">
                        <XOctagon className="h-5 w-5 md:h-6 md:w-6" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

function KavramAviGame() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    
    const [questions, setQuestions] = useState<Anagram[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [userAnswer, setUserAnswer] = useState<{ char: string; id: number, colorClass: string }[]>([]);
    const [poolLetters, setPoolLetters] = useState<{ char: string; id: number, colorClass: string }[]>([]);
    
    const [score, setScore] = useState(0);
    const [gameState, setGameState] = useState<'loading' | 'playing' | 'finished'>('loading');
    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    
    const [isCorrect, setIsCorrect] = useState(false);
    const [shakeId, setShakeId] = useState<number | null>(null);
    const [gameShake, setGameShake] = useState(false);

    const mode = searchParams.get('mode');
    const topicId = searchParams.get('topicId');
    const isMission = mode === 'mission';

    const gameContext = useMemo(() => `Kavram Avı - ${searchParams.get('courseName') || ''} > ${searchParams.get('topicName') || ''}`, [searchParams]);
    const backUrl = getGameBackUrl({ user, searchParams, defaultBackUrl: isMission ? '/student/gorevler' : '/oyunlar/kavram-avi' });

    const currentQuestion = questions[currentQuestionIndex];
    const wordLength = currentQuestion?.correctAnswer.length || 0;

    // Soru / İpucu metninin uzunluğuna göre akıllı tahtada dev puntolar
    const questionTextSize = useMemo(() => {
        const len = currentQuestion?.definition?.length || 0;
        if (len > 140) {
            return "text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl";
        }
        if (len > 75) {
            return "text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl";
        }
        return "text-2xl sm:text-3xl md:text-5xl lg:text-6xl xl:text-7xl";
    }, [currentQuestion?.definition]);

    // Harf sayısına göre cevap yuvası ve harf büyüklüğü (Akıllı tahta odaklı)
    const slotSizeClass = useMemo(() => {
        if (wordLength <= 7) {
            return "w-14 h-16 sm:w-16 sm:h-20 md:w-20 md:h-24 lg:w-24 lg:h-32 xl:w-28 xl:h-36 text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl";
        }
        if (wordLength <= 10) {
            return "w-12 h-14 sm:w-14 sm:h-18 md:w-16 md:h-20 lg:w-20 lg:h-28 xl:w-24 xl:h-32 text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl";
        }
        return "w-10 h-12 sm:w-12 sm:h-16 md:w-14 md:h-18 lg:w-16 lg:h-24 xl:w-20 xl:h-28 text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl";
    }, [wordLength]);

    // Havuzdaki tıklanacak harf butonlarının boyutu
    const poolSizeClass = useMemo(() => {
        if (wordLength <= 7) {
            return "w-14 h-16 sm:w-16 sm:h-20 md:w-20 md:h-24 lg:w-24 lg:h-32 xl:w-28 xl:h-36 text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl";
        }
        if (wordLength <= 10) {
            return "w-12 h-14 sm:w-14 sm:h-18 md:w-16 md:h-20 lg:w-20 lg:h-28 xl:w-24 xl:h-32 text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl";
        }
        return "w-10 h-12 sm:w-12 sm:h-16 md:w-14 md:h-18 lg:w-16 lg:h-24 xl:w-20 xl:h-28 text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl";
    }, [wordLength]);

    const setupLevel = useCallback((question: Anagram) => {
        if (!question || !question.definition || question.definition.trim().length < 8) return;
        const letters = question.scrambledWord.split('').map((char, index) => ({ 
            char, id: index, colorClass: LETTER_COLORS[index % LETTER_COLORS.length]
        }));
        setPoolLetters(letters);
        setUserAnswer([]);
        setIsCorrect(false);
        setShakeId(null);
    }, []);

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
            q => q && q.definition && q.definition.trim().length >= 8 && q.correctAnswer
        );
        if (result.error || validQuestions.length === 0) {
            setError(result.error || "Bu oyun için tanımı bulunan yeterli kavram bulunamadı.");
        } else {
            setQuestions(validQuestions);
            setupLevel(validQuestions[0]);
            setGameState('playing');
        }
        setIsLoading(false);
    }, [searchParams, setupLevel]);

    useEffect(() => { fetchGameData(); }, [fetchGameData]);

    const handlePoolClick = (letter: { char: string; id: number, colorClass: string }) => {
        if (isCorrect || !currentQuestion) return;

        const nextCharIndex = userAnswer.length;
        const correctChar = currentQuestion.correctAnswer[nextCharIndex];

        if (letter.char.toLowerCase() === correctChar.toLowerCase()) {
            playSound('pop');
            setUserAnswer(prev => [...prev, letter]);
            setPoolLetters(prev => prev.filter(l => l.id !== letter.id));
            
            // --- PUANLAMA DEĞİŞİKLİĞİ ---
            // Her doğru harf için 2 puan
            setScore(prev => prev + 2);

        } else {
            playSound('incorrect');
            setShakeId(letter.id);
            setGameShake(true);
            setTimeout(() => {
                setShakeId(null);
                setGameShake(false);
            }, 500);
        }
    };

    const handleUndo = () => {
        if (isCorrect || userAnswer.length === 0) return;
        const lastLetter = userAnswer[userAnswer.length - 1];
        setUserAnswer(prev => prev.slice(0, -1));
        setPoolLetters(prev => [...prev, lastLetter].sort((a,b) => a.id - b.id));
        
        // Harf geri alınınca puan silinmesi istenirse:
        setScore(prev => Math.max(0, prev - 2)); 
    };

    useEffect(() => {
        if (gameState === 'playing' && currentQuestion && userAnswer.length === currentQuestion.correctAnswer.length) {
            setIsCorrect(true);
            playSound('correct');
        }
    }, [userAnswer, currentQuestion, gameState]);

    const nextLevel = () => {
        if (currentQuestionIndex < questions.length - 1) {
            const nextIndex = currentQuestionIndex + 1;
            const nextQ = questions[nextIndex];
            if (nextQ && nextQ.definition && nextQ.definition.trim().length >= 8) {
                setCurrentQuestionIndex(nextIndex);
                setupLevel(nextQ);
            } else {
                setGameState('finished');
                playSound('win');
                setShowConfetti(true);
            }
        } else {
            setGameState('finished');
            playSound('win');
            setShowConfetti(true);
        }
    };

    // --- BAŞARI KONTROLÜ DÜZELTİLDİ ---
    // Sadece 'finished' olması yetmez.
    // 1. Oyun bitmiş olmalı.
    // 2. Son soruda olunmalı (currentQuestionIndex === length - 1)
    // 3. Son soru doğru cevaplanmış olmalı (isCorrect === true)
    const isAllConceptsFound = gameState === 'finished' && 
                               currentQuestionIndex === questions.length - 1 && 
                               isCorrect;

    const handleSaveAndExit = async () => {
        if (!user) {
            router.push(isMission ? '/student/gorevler' : backUrl);
            return;
        }
        if (score === 0 || isSaving || isScoreSaved) {
             if(isMission && isAllConceptsFound && !isScoreSaved) {
                 // devam et
            } else {
                router.push(isMission ? '/student/gorevler' : backUrl);
                return;
            }
        }
        
        setIsSaving(true);
        try {
            if (isMission && topicId) {
                // --- GÖREV MODU KAYDI (LİDERLİK TABLOSU DÜZELTİLDİ) ---
                const batch = writeBatch(db);

                // 1. Etkinlik Kaydı (scoreEvents)
                const eventRef = doc(collection(db, 'scoreEvents'));
                batch.set(eventRef, {
                    userId: user.uid,
                    points: score, // Kazanılan puan
                    context: topicId,
                    gameType: 'kavram-avi',
                    timestamp: serverTimestamp(),
                    isMission: true,
                    completed: isAllConceptsFound // SIKI KONTROL BURADA KULLANILIYOR
                });

                // 2. Kullanıcı Profilini Güncelleme (users -> score)
                const userRef = doc(db, 'users', user.uid);
                batch.update(userRef, {
                    score: increment(score)
                });

                // İşlemleri Kaydet
                await batch.commit();

                if (isAllConceptsFound) {
                    toast({ title: "Görev Başarılı!", description: "Tüm kavramları buldun ve puanın eklendi.", className: "bg-green-600 text-white" });
                } else {
                    toast({ title: "Puan Kaydedildi", description: "Ancak görev tamamlanmadı.", className: "bg-yellow-600 text-white" });
                }
            } else {
                // --- NORMAL MOD KAYDI ---
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
    }

    if (isLoading) return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4"><Loader2 className="h-12 w-12 animate-spin text-cyan-500" /><span className="text-slate-400 font-medium">Oyun Yükleniyor...</span></div>;

    if (error) return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
            <Alert variant="destructive" className="max-w-lg bg-red-950/30 border-red-900 text-red-200">
                <AlertTitle className="text-red-400">Oyun Başlatılamadı</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
                <Button asChild variant="outline" className="mt-4 border-red-800 text-red-300 hover:bg-red-900/50">
                    <Link href={isMission ? '/student/gorevler' : backUrl}><ArrowLeft className="mr-2 h-4 w-4"/> Geri Dön</Link>
                </Button>
            </Alert>
        </div>
    );

    if (gameState === 'finished') {
        return (
            <GameEndScreen 
                score={score} 
                onSave={user ? handleSaveAndExit : undefined} 
                isSaving={isSaving} 
                scoreSaved={isScoreSaved} 
                onRestart={() => window.location.reload()} 
                backUrl={backUrl} 
                isSuccess={isAllConceptsFound}
                isMission={isMission}
                customMessage={
                    isMission 
                        ? (isAllConceptsFound 
                            ? "Tebrikler! Tüm kavramları doğru bularak görevi başarıyla tamamladın." 
                            : "Maalesef tüm kavramları bulamadın. Görevi geçmek için tüm kavramları tamamlamalısın.")
                        : undefined
                }
            />
        );
    }

    return (
        <div className={cn("min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden flex flex-col", gameShake && "animate-shake")}>
            <GameBackground />
            <GameHUD score={score} current={currentQuestionIndex} total={questions.length} onFinish={() => setGameState('finished')} backUrl={backUrl} />

            <main className="flex-grow flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8 relative z-10 mt-20 lg:mt-24 pb-8 lg:pb-12">
                <div className="w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl space-y-8 md:space-y-10 lg:space-y-12">
                    
                    {/* Soru / İpucu Kartı (Akıllı Tahta Boyutu) */}
                    <div className="text-center bg-slate-900/80 backdrop-blur-2xl border-2 border-teal-500/30 p-6 sm:p-8 md:p-10 lg:p-12 rounded-3xl md:rounded-[2.5rem] shadow-2xl relative">
                        <div className="absolute -top-4 sm:-top-5 left-1/2 -translate-x-1/2">
                            <div className="bg-slate-900 border-2 border-teal-400 text-teal-300 px-5 py-1.5 md:px-7 md:py-2 rounded-full text-xs sm:text-sm md:text-base font-black uppercase tracking-widest shadow-xl flex items-center gap-2.5">
                                <Crosshair className="w-4 h-4 md:w-5 md:h-5 text-teal-400 animate-pulse" />
                                <span>SORU / İPUCU</span>
                            </div>
                        </div>
                        <p className={cn(
                            "font-black text-white leading-snug md:leading-tight tracking-wide mt-2 md:mt-3 drop-shadow-lg",
                            questionTextSize
                        )}>
                            "{currentQuestion?.definition}"
                        </p>
                    </div>

                    {/* Cevap Yuvaları (Harf Kutuları) */}
                    <div className="flex flex-col items-center gap-3 md:gap-4">
                        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-4 lg:gap-5 min-h-[4.5rem] md:min-h-[6rem] lg:min-h-[8rem]">
                            {Array.from({ length: currentQuestion?.correctAnswer.length || 0 }).map((_, index) => {
                                const letterObj = userAnswer[index];
                                return (
                                    <div 
                                        key={index}
                                        onClick={handleUndo} 
                                        className={cn(
                                            slotSizeClass,
                                            "rounded-2xl md:rounded-3xl border-2 md:border-4 flex items-center justify-center font-black transition-all duration-300 select-none",
                                            letterObj 
                                                ? "bg-slate-900/95 border-teal-400 text-teal-300 shadow-[0_0_25px_rgba(45,212,191,0.5)] animate-in zoom-in-75 cursor-pointer hover:border-red-400 hover:text-red-300"
                                                : "bg-white/5 border-dashed border-white/20 text-transparent"
                                        )}
                                        title={letterObj ? "Geri almak için dokun" : undefined}
                                    >
                                        {letterObj?.char}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Harf Geri Alma Butonu */}
                        {userAnswer.length > 0 && !isCorrect && (
                            <button
                                onClick={handleUndo}
                                className="flex items-center gap-2 text-xs sm:text-sm md:text-base font-bold text-slate-400 hover:text-teal-300 bg-slate-900/80 hover:bg-slate-900 px-4 py-2 md:px-6 md:py-2.5 rounded-full border border-white/10 transition-all cursor-pointer shadow-md active:scale-95 mt-1"
                            >
                                <RotateCcw className="w-4 h-4 md:w-5 md:h-5 text-teal-400" />
                                <span>Son Harfi Geri Al</span>
                            </button>
                        )}
                    </div>

                    {/* Harf Havuzu */}
                    {!isCorrect ? (
                        <div className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-5 lg:gap-6">
                            {poolLetters.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handlePoolClick(item)}
                                    className={cn(
                                        poolSizeClass,
                                        "rounded-2xl md:rounded-3xl font-black text-white shadow-xl border-b-4 md:border-b-8 active:border-b-0 active:translate-y-2 transition-all touch-manipulation relative group select-none cursor-pointer",
                                        item.colorClass,
                                        shakeId === item.id && "animate-shake bg-red-600 border-b-red-900 shadow-red-500/50"
                                    )}
                                >
                                    {item.char}
                                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl md:rounded-3xl" />
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-4 py-4 animate-in zoom-in fade-in duration-300">
                            <div className="flex items-center gap-2 text-emerald-400 font-black text-xl md:text-3xl drop-shadow-md">
                                <CheckCircle className="w-7 h-7 md:w-9 md:h-9" />
                                <span>HARİKA! DOĞRU CEVAP</span>
                            </div>
                            <Button 
                                onClick={nextLevel} 
                                size="lg" 
                                className="h-16 md:h-20 lg:h-24 px-10 md:px-16 lg:px-20 text-xl md:text-3xl lg:text-4xl font-black rounded-2xl md:rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-[0_0_35px_rgba(16,185,129,0.5)] border-b-6 border-emerald-700 active:border-b-0 active:translate-y-2 transition-all hover:scale-105 cursor-pointer"
                            >
                                {currentQuestionIndex === questions.length - 1 ? 'SONUÇLARI GÖR' : 'SONRAKİ KAVRAM'} <Zap className="ml-3 w-6 h-6 md:w-8 md:h-8 fill-white" />
                            </Button>
                        </div>
                    )}

                </div>
            </main>
            <style jsx global>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-8px); }
                    75% { transform: translateX(8px); }
                }
                .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
            `}</style>
        </div>
    );
}

// --- WRAPPER ---
function KavramAviOyunPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-teal-500" /></div>}>
            <KavramAviGame />
        </Suspense>
    );
}

export default KavramAviOyunPage;