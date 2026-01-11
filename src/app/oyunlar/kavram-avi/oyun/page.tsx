'use client';

import { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getConceptHuntAction, submitConceptHuntScoreAction } from '../actions';
import type { Anagram } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { Loader2, ArrowLeft, Save, Trophy, Repeat, Home, Ghost, Zap, Crosshair, XOctagon, CheckCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { GameEndScreen } from '@/components/game-end-screen';
import { playSound } from '@/lib/audio-service';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import Confetti from 'react-dom-confetti';

// --- RENK PALETİ ---
const LETTER_COLORS = [
    "bg-teal-500 border-teal-400 shadow-teal-500/50",
    "bg-cyan-500 border-cyan-400 shadow-cyan-500/50",
    "bg-sky-500 border-sky-400 shadow-sky-500/50",
    "bg-blue-500 border-blue-400 shadow-blue-500/50",
    "bg-indigo-500 border-indigo-400 shadow-indigo-500/50",
];

// --- GÖRSEL BİLEŞENLER ---

const GameBackground = () => (
    <div className="fixed inset-0 pointer-events-none z-0 bg-slate-950 overflow-hidden">
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-teal-900/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-cyan-900/10 rounded-full blur-[120px]" style={{ animationDelay: '2s' }} />
        {/* Izgara Efekti */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(20,184,166,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(20,184,166,0.05)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_70%,transparent_100%)]" />
    </div>
);

const GameHUD = ({ score, current, total, onFinish }: { score: number, current: number, total: number, onFinish: () => void }) => {
    const progress = total > 0 ? ((current + 1) / total) * 100 : 0;
    return (
        <div className="fixed top-0 left-0 right-0 z-50 p-4 lg:p-6">
            <div className="max-w-5xl mx-auto flex items-center gap-4">
                <div className="flex-grow h-3 lg:h-4 bg-slate-900/50 backdrop-blur-md rounded-full border border-white/10 relative overflow-hidden">
                    <div 
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-teal-500 to-cyan-400 transition-all duration-700 ease-out shadow-[0_0_15px_rgba(45,212,191,0.5)]"
                        style={{ width: `${progress}%` }}
                    />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-slate-300 drop-shadow-md">{current + 1} / {total}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-teal-500/30 px-4 py-2 rounded-full shadow-lg shadow-teal-500/10 min-w-[100px] justify-center">
                        <Trophy className="w-4 h-4 lg:w-5 lg:h-5 text-teal-400 animate-bounce" />
                        <span className="text-lg lg:text-xl font-black text-teal-100 font-mono tracking-widest">
                            {score}
                        </span>
                    </div>
                      <Button size="sm" variant="destructive" className="rounded-full font-bold h-10 w-10 p-0" onClick={onFinish} title="Oyunu Bitir">
                        <XOctagon className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

// --- ANA OYUN ---

function KavramAviGame() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    
    // State
    const [questions, setQuestions] = useState<Anagram[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [userAnswer, setUserAnswer] = useState<{ char: string; originalIndex: number, colorClass: string }[]>([]);
    const [poolLetters, setPoolLetters] = useState<{ char: string; id: number, colorClass: string }[]>([]);
    
    const [score, setScore] = useState(0);
    const [gameState, setGameState] = useState<'loading' | 'playing' | 'finished'>('loading');
    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    
    // Animasyon State'i
    const [isCorrect, setIsCorrect] = useState(false);
    const [shakeId, setShakeId] = useState<number | null>(null);
    const [gameShake, setGameShake] = useState(false);

    // GÖREV MODU PARAMETRELERİ
    const mode = searchParams.get('mode');
    const topicId = searchParams.get('topicId');
    const isMission = mode === 'mission';

    const gameContext = useMemo(() => `Kavram Avı - ${searchParams.get('courseName') || ''} > ${searchParams.get('topicName') || ''}`, [searchParams]);

    const backUrl = useMemo(() => {
        const { courseId, unitId, topicId, courseName, unitName, topicName } = Object.fromEntries(searchParams.entries());
        if (courseId && unitId && topicId) {
            return `/konu/${courseId}/${unitId}/${topicId}?courseName=${encodeURIComponent(courseName || '')}&unitName=${encodeURIComponent(unitName || '')}&topicName=${encodeURIComponent(topicName || '')}`;
        }
        return '/oyunlar/kavram-avi';
    }, [searchParams]);

    // Seviye Hazırlama
    const setupLevel = useCallback((question: Anagram) => {
        const letters = question.scrambledWord.split('').map((char, index) => ({ 
            char, 
            id: index,
            colorClass: LETTER_COLORS[index % LETTER_COLORS.length]
        }));
        setPoolLetters(letters);
        setUserAnswer([]);
        setIsCorrect(false);
        setShakeId(null);
    }, []);

    // Veri Çekme
    const fetchGameData = useCallback(async () => {
        setIsLoading(true);
        const params = {
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: searchParams.get('topicId') || undefined,
        };

        if (!params.topicId && !params.unitId) {
            setError("Geçerli bir konu veya ünite ID'si bulunamadı.");
            setGameState('error');
            setIsLoading(false);
            return;
        }

        const result = await getConceptHuntAction(params);
        if (result.error || !result.questions || result.questions.length === 0) {
            setError(result.error || "Bu oyun için yeterli kelime bulunamadı.");
            setGameState('error');
        } else {
            setQuestions(result.questions);
            setupLevel(result.questions[0]);
            setGameState('playing');
        }
        setIsLoading(false);
    }, [searchParams, setupLevel]);


    useEffect(() => {
        fetchGameData();
    }, [fetchGameData]);

    const currentQuestion = questions[currentQuestionIndex];

    // Harf Seçimi (Havuzdan -> Cevaba)
    const handlePoolClick = (letter: { char: string; id: number, colorClass: string }) => {
        if (isCorrect) return;

        const nextCharIndex = userAnswer.length;
        const correctChar = questions[currentQuestionIndex].correctAnswer[nextCharIndex];

        if (letter.char.toLowerCase() === correctChar.toLowerCase()) {
            playSound('pop');
            setUserAnswer(prev => [...prev, letter]);
            setPoolLetters(prev => prev.filter(l => l.id !== letter.id));
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

    // Harf İadesi (Cevaptan -> Havuza)
    const handleUndo = () => {
        if (isCorrect || userAnswer.length === 0) return;
        
        const lastLetter = userAnswer[userAnswer.length - 1];
        setUserAnswer(prev => prev.slice(0, -1));
        setPoolLetters(prev => [...prev, lastLetter].sort((a,b) => a.id - b.id));
    };

    // Bölüm Tamamlama Kontrolü
    useEffect(() => {
        if (gameState === 'playing' && questions.length > 0 && userAnswer.length === questions[currentQuestionIndex].correctAnswer.length) {
            setIsCorrect(true);
            playSound('correct');
            setScore(prev => prev + 25);
        }
    }, [userAnswer, questions, currentQuestionIndex, gameState]);

    // Sonraki Soru
    const nextLevel = () => {
        if (currentQuestionIndex < questions.length - 1) {
            const nextIndex = currentQuestionIndex + 1;
            setCurrentQuestionIndex(nextIndex);
            setupLevel(questions[nextIndex]);
        } else {
            setGameState('finished');
            playSound('win');
            setShowConfetti(true);
        }
    };

    // GÖREV BAŞARILI MI? (Oyun 'finished' state'ine geldiyse tüm kelimeler bitmiştir)
    const isAllConceptsFound = gameState === 'finished';

    // Kaydet ve Çık
    const handleSaveAndExit = async () => {
        if (!user || score === 0 || isSaving || isScoreSaved) {
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
                // --- GÖREV MODU KAYDI ---
                await addDoc(collection(db, 'scoreEvents'), {
                    userId: user.uid,
                    points: score,
                    context: topicId,
                    gameType: 'kavram-avi', // GÖREV TİPİ
                    timestamp: serverTimestamp(),
                    isMission: true,
                    completed: isAllConceptsFound
                });

                if (isAllConceptsFound) {
                    toast({ title: "Görev Başarılı!", description: "Tüm kavramları buldun.", className: "bg-green-600 text-white" });
                } else {
                    toast({ title: "Görev Tamamlanamadı", description: "Tüm kavramları bitirmelisin.", variant: "destructive" });
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

    // --- RENDER ---

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
        if(isMission) {
             return (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in">
                        <Confetti active={showConfetti} config={{ angle: 90, spread: 360, startVelocity: 40, elementCount: 100, decay: 0.9 }} />
                        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border-4 border-white/20 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-white -z-10"></div>
                            
                            <div className="mb-6 flex justify-center">
                                <div className="p-4 bg-green-100 rounded-full border-4 border-green-200 shadow-xl animate-bounce">
                                    <Trophy className="h-16 w-16 text-green-600" />
                                </div>
                            </div>

                            <h2 className="text-3xl font-black text-slate-800 mb-2">GÖREV BAŞARILI!</h2>
                            <p className="text-slate-500 mb-6 font-medium">Tebrikler! Tüm kavramları doğru buldun.</p>

                            <div className="space-y-3">
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
                                
                                <Button onClick={() => router.push('/student')} variant="ghost" className="w-full text-slate-400 hover:text-slate-600">
                                    <Home className="mr-2 h-4 w-4"/> Ana Menü
                                </Button>
                            </div>
                        </div>
                    </div>
            );
        }

        return <GameEndScreen score={score} onSave={handleSaveAndExit} isSaving={isSaving} scoreSaved={isScoreSaved} onRestart={() => window.location.reload()} backUrl={backUrl} />;
    }

    return (
        <div className={cn("min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden flex flex-col", gameShake && "animate-shake")}>
            <GameBackground />
            <GameHUD score={score} current={currentQuestionIndex} total={questions.length} onFinish={() => setGameState('finished')} />

            <main className="flex-grow flex flex-col items-center justify-center p-4 lg:p-8 relative z-10 mt-16 lg:mt-12">
                <div className="w-full max-w-4xl space-y-8 lg:space-y-12">
                    
                    {/* Soru / Tanım */}
                    <div className="text-center bg-slate-900/60 backdrop-blur-xl border border-teal-500/20 p-6 rounded-3xl shadow-2xl relative">
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                            <div className="bg-slate-900 border border-teal-500/50 text-teal-400 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg flex items-center gap-2">
                                <Crosshair className="w-3 h-3" /> İpucu
                            </div>
                        </div>
                        <p className="text-xl lg:text-3xl font-bold text-white leading-relaxed mt-2">
                            "{currentQuestion?.definition}"
                        </p>
                    </div>

                    {/* Hedef Alan (Cevap Kutuları) */}
                    <div className="flex flex-wrap justify-center gap-2 lg:gap-4 min-h-[4rem]">
                        {Array.from({ length: currentQuestion?.correctAnswer.length || 0 }).map((_, index) => {
                            const letterObj = userAnswer[index];
                            return (
                                <div 
                                    key={index}
                                    onClick={handleUndo} // Son harfi silmek için tıklanabilir
                                    className={cn(
                                        "w-10 h-12 lg:w-14 lg:h-16 rounded-xl border-2 flex items-center justify-center text-2xl lg:text-4xl font-black transition-all duration-300 select-none",
                                        letterObj 
                                            ? cn("bg-slate-800 border-teal-500 text-teal-400 shadow-[0_0_15px_rgba(45,212,191,0.3)] animate-in zoom-in-50 cursor-pointer")
                                            : "bg-white/5 border-white/10 text-transparent"
                                    )}
                                >
                                    {letterObj?.char}
                                </div>
                            );
                        })}
                    </div>

                    {/* Harf Havuzu */}
                    {!isCorrect ? (
                        <div className="flex flex-wrap justify-center gap-3 lg:gap-5">
                            {poolLetters.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handlePoolClick(item)}
                                    className={cn(
                                        "w-12 h-14 lg:w-16 lg:h-20 rounded-xl text-xl lg:text-3xl font-black text-white shadow-lg border-b-4 active:border-b-0 active:translate-y-1 transition-all touch-manipulation relative group",
                                        item.colorClass,
                                        shakeId === item.id && "animate-shake bg-red-500 border-red-700"
                                    )}
                                >
                                    {item.char}
                                    {/* Hover Efekti */}
                                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                                </button>
                            ))}
                        </div>
                    ) : (
                        // Doğru Cevap Sonrası Buton
                        <div className="h-24 flex items-center justify-center animate-in zoom-in fade-in">
                            <Button 
                                onClick={nextLevel} 
                                size="lg" 
                                className="h-14 lg:h-16 px-8 lg:px-12 text-xl font-bold rounded-2xl bg-green-600 hover:bg-green-500 shadow-xl shadow-green-500/30 transition-all hover:scale-105"
                            >
                                {currentQuestionIndex === questions.length - 1 ? 'SONUÇLARI GÖR' : 'SONRAKİ KAVRAM'} <Zap className="ml-2 w-5 h-5 fill-white" />
                            </Button>
                        </div>
                    )}

                </div>
            </main>
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