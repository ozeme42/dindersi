
'use client';

import { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getConceptHuntAction, submitConceptHuntScoreAction } from '../actions';
import type { Anagram } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { Loader2, ArrowLeft, Save, Trophy, Repeat, Home, Ghost, Zap, Crosshair, XOctagon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { playSound } from '@/lib/audio-service';
import { useToast } from '@/hooks/use-toast';

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
        <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-cyan-900/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
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

function ConceptHuntGame() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();
    
    // State
    const [questions, setQuestions] = useState<Anagram[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [userAnswer, setUserAnswer] = useState<{ char: string; originalIndex: number, colorClass: string }[]>([]);
    const [poolLetters, setPoolLetters] = useState<{ char: string; id: number, colorClass: string }[]>([]);
    
    const [score, setScore] = useState(0);
    const [gameState, setGameState] = useState<'loading' | 'playing' | 'finished' | 'error'>('loading');
    const [isSaving, setIsSaving] = useState(false);
    
    // Animasyon State'i
    const [isCorrect, setIsCorrect] = useState(false);
    const [shakeId, setShakeId] = useState<number | null>(null);
    const [gameShake, setGameShake] = useState(false);

    const gameContext = useMemo(() => `Kavram Avı - ${searchParams.get('courseName') || ''} > ${searchParams.get('topicName') || ''}`, [searchParams]);

    // Seviye Hazırlama
    const setupLevel = useCallback((question: Anagram) => {
        const letters = question.scrambledWord.split('').map((char, index) => ({ 
            char, 
            id: index,
            colorClass: LETTER_COLORS[index % LETTER_COLORS.length]
        }));
        setPoolLetters(letters); // Karışık halini API'den alıyoruz zaten
        setUserAnswer([]);
        setIsCorrect(false);
        setShakeId(null);
    }, []);

    // Veri Çekme
    useEffect(() => {
        const fetchQuestions = async () => {
            setIsLoading(true);
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
            };
            const result = await getConceptHuntAction(params);
            if (result.error) {
                setError(result.error);
                setGameState('error');
            } else if (result.questions && result.questions.length > 0) {
                setQuestions(result.questions);
                setupLevel(result.questions[0]);
                setGameState('playing');
            } else {
                setError("Bu konu için uygun soru bulunamadı.");
                setGameState('error');
            }
            setIsLoading(false);
        };
        fetchQuestions();
    }, [searchParams, setupLevel]);

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
        }
    };

    // Kaydet ve Çık
    const handleSaveAndExit = async () => {
        if (!user || score === 0 || isSaving) {
            router.push('/oyunlar/kavram-avi');
            return;
        }
        setIsSaving(true);
        const result = await submitConceptHuntScoreAction(user.uid, score, gameContext);
        if (result.success) {
            toast({ title: "Başarılı!", description: "Puanın kaydedildi." });
            router.push('/oyunlar/kavram-avi');
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
            setIsSaving(false);
        }
    }

    // --- RENDER ---

    if (gameState === 'loading') {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-950">
                <Loader2 className="h-16 w-16 animate-spin text-teal-500" />
            </div>
        );
    }

    if (error) {
        return (
             <div className="flex h-screen w-full items-center justify-center p-4 bg-slate-950">
                 <div className="text-center space-y-4 max-w-md bg-teal-950/50 p-6 rounded-3xl border border-teal-500/30">
                    <Ghost className="h-16 w-16 text-teal-500 mx-auto" />
                    <h3 className="text-xl font-bold text-teal-100">Oyun Başlatılamadı</h3>
                    <p className="text-teal-200/70">{error}</p>
                     <Button asChild variant="secondary" className="w-full">
                        <Link href="/oyunlar/kavram-avi">Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    if (gameState === 'finished') {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 pb-24 md:pb-4 relative overflow-hidden">
                <GameBackground />
                <div className="relative z-10 w-full max-w-md text-center space-y-8 animate-in zoom-in-95 duration-500">
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-teal-500/20 rounded-full blur-2xl animate-pulse" />
                        <Trophy className="w-32 h-32 text-teal-400 mx-auto drop-shadow-[0_0_15px_rgba(45,212,191,0.5)]" />
                    </div>
                    <div>
                        <h1 className="text-4xl lg:text-5xl font-black text-white mb-2 tracking-tight">KAVRAM USTASI!</h1>
                        <p className="text-slate-400 text-lg">Toplam Skorun</p>
                    </div>
                    <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
                        <div className="text-6xl lg:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-500">
                            {score}
                        </div>
                    </div>
                    <div className="space-y-3">
                        <Button 
                            onClick={handleSaveAndExit} 
                            size="lg" 
                            disabled={isSaving}
                            className="w-full h-16 text-xl font-bold rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 shadow-xl shadow-teal-500/20 transition-all hover:scale-105"
                        >
                            {isSaving ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Save className="mr-3 h-6 w-6" />}
                            PUANI KAYDET VE ÇIK
                        </Button>
                    </div>
                </div>
            </div>
        );
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
                                            ? cn("bg-slate-800 border-teal-500 text-teal-400 shadow-[0_0_15px_rgba(45,212,191,0.3)] animate-in zoom-in-50", isCorrect && "bg-green-500/20 border-green-500 text-green-400")
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
export default function ConceptHuntPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-teal-500" /></div>}>
            <ConceptHuntGame />
        </Suspense>
    );
}

