'use client';

import { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getBilBakalimAction, submitBilBakalimScoreAction } from '../actions';
import type { Question } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Save, Home, Repeat, Lightbulb, BrainCircuit, Zap, Trophy, Ghost, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { playSound } from '@/lib/audio-service';

// --- GÖRSEL BİLEŞENLER ---

const GameBackground = () => (
    <div className="fixed inset-0 pointer-events-none z-0 bg-slate-950 overflow-hidden">
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-amber-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-orange-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[40%] right-[30%] w-[30%] h-[30%] bg-yellow-500/5 rounded-full blur-[100px]" />
    </div>
);

const GameHUD = ({ score, remaining }: { score: number, remaining: number }) => {
    return (
        <div className="fixed top-0 left-0 right-0 z-50 p-4 lg:p-6">
            <div className="max-w-6xl mx-auto flex justify-between items-start">
                <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-amber-500/30 px-4 py-2 rounded-full shadow-lg shadow-amber-500/10">
                    <Trophy className="w-5 h-5 lg:w-6 lg:h-6 text-amber-400 animate-bounce" />
                    <span className="text-xl lg:text-2xl font-black text-amber-100 font-mono">
                        {score}
                    </span>
                </div>
                
                <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-slate-700 px-4 py-2 rounded-full">
                    <span className="text-sm lg:text-base text-slate-400 font-bold uppercase tracking-wider">Kalan</span>
                    <span className="text-xl lg:text-2xl font-black text-white font-mono">
                        {remaining}
                    </span>
                </div>
            </div>
        </div>
    );
};

// --- ANA OYUN ---

function BilBakalimGame() {
    const { user } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();

    // State
    const [queue, setQueue] = useState<Question[]>([]); 
    const [allTerms, setAllTerms] = useState<string[]>([]);
    
    const [gameState, setGameState] = useState<'loading' | 'playing' | 'won' | 'error'>('loading');
    const [score, setScore] = useState(0);
    const [mistakeCount, setMistakeCount] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    // Animasyon State'leri
    const [feedbackState, setFeedbackState] = useState<'idle' | 'correct' | 'wrong'>('idle');
    const [shakeScreen, setShakeScreen] = useState(false);
    const [activeTermId, setActiveTermId] = useState<string | null>(null); 

    const gameContext = `Bil Bakalım - ${searchParams.get('courseName')} > ${searchParams.get('topicName')}`;

    // Veri Çekme
    const fetchGameData = useCallback(async () => {
        setGameState('loading');
        const params = {
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: searchParams.get('topicId') || undefined,
        };
        const result = await getBilBakalimAction(params);
        
        if (result.error || !result.questions || result.questions.length === 0) {
            setError(result.error || "Bu konu için uygun soru bulunamadı.");
            setGameState('error');
        } else {
            const shuffled = [...result.questions].sort(() => Math.random() - 0.5);
            const terms = [...new Set(result.questions.map(q => q.correctAnswer))].sort((a, b) => a.localeCompare(b, 'tr'));
            
            setQueue(shuffled as Question[]);
            setAllTerms(terms as string[]);
            setGameState('playing');
        }
    }, [searchParams]);

    useEffect(() => {
        fetchGameData();
    }, [fetchGameData]);

    const currentQuestion = queue.length > 0 ? queue[0] : null;

    // Cevap Kontrolü
    const handleAnswer = (selectedTerm: string) => {
        if (feedbackState !== 'idle' || !currentQuestion) return;

        setActiveTermId(selectedTerm);

        if (selectedTerm === currentQuestion.correctAnswer) {
            // DOĞRU
            setFeedbackState('correct');
            playSound('correct');
            setScore(prev => prev + 20);

            setTimeout(() => {
                setQueue(prev => prev.slice(1)); // Kuyruktan çıkar
                setFeedbackState('idle');
                setActiveTermId(null);
                
                // Oyun bitti mi?
                if (queue.length <= 1) { 
                    setGameState('won');
                }
            }, 800);

        } else {
            // YANLIŞ
            setFeedbackState('wrong');
            playSound('incorrect');
            setScore(prev => Math.max(0, prev - 10));
            setMistakeCount(prev => prev + 1);
            setShakeScreen(true);

            setTimeout(() => {
                setShakeScreen(false);
                setQueue(prev => {
                    const wrongQ = prev[0];
                    const rest = prev.slice(1);
                    return [...rest, wrongQ];
                });
                setFeedbackState('idle');
                setActiveTermId(null);
            }, 800);
        }
    };

    // Kaydet ve Çık
    const handleSaveAndExit = async () => {
        if (!user || score <= 0) {
            router.push('/oyunlar/bil-bakalim');
            return;
        }
        setIsSaving(true);
        const result = await submitBilBakalimScoreAction(user.uid, score, gameContext);
        if(result.success) {
            toast({ title: "Başarılı", description: "Puanın kaydedildi." });
            router.push('/student'); // Dashboard'a dön
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
            setIsSaving(false);
        }
    };

    // --- RENDER ---

    if (gameState === 'loading') {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-950">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-16 w-16 animate-spin text-amber-500" />
                    <p className="text-amber-400 font-mono animate-pulse">Beyin Fırtınası Başlıyor...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
             <div className="flex h-screen w-full items-center justify-center p-4 bg-slate-950">
                 <div className="text-center space-y-4 max-w-md bg-amber-950/50 p-6 rounded-3xl border border-amber-500/30">
                    <Ghost className="h-16 w-16 text-amber-500 mx-auto" />
                    <h3 className="text-xl font-bold text-amber-100">Oyun Başlatılamadı</h3>
                    <p className="text-amber-200/70">{error}</p>
                     <Button asChild variant="secondary" className="w-full">
                        <Link href="/oyunlar/bil-bakalim">Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    if (gameState === 'won') {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
                <GameBackground />
                <div className="relative z-10 w-full max-w-lg text-center space-y-8 animate-in zoom-in-95 duration-500">
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-3xl animate-pulse" />
                        <Trophy className="w-32 h-32 text-amber-400 mx-auto drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
                    </div>
                    <div>
                        <h1 className="text-4xl lg:text-6xl font-black text-white mb-2 tracking-tight">MUHTEŞEM!</h1>
                        <p className="text-slate-400 text-lg">Tüm kavramları eşleştirdin.</p>
                    </div>
                    <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-8 backdrop-blur-xl space-y-2">
                        <p className="text-amber-400 text-sm uppercase font-bold tracking-widest">Toplam Puan</p>
                        <div className="text-7xl lg:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
                            {score}
                        </div>
                        {mistakeCount > 0 && (
                            <p className="text-slate-500 text-sm">{mistakeCount} kez yanlış yaptın.</p>
                        )}
                    </div>
                    
                    {/* TEK VE BÜYÜK BUTON */}
                    <div className="pt-4">
                        <Button 
                            onClick={handleSaveAndExit} 
                            size="lg" 
                            disabled={isSaving}
                            className="w-full h-20 text-xl lg:text-2xl font-black rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-xl shadow-amber-500/25 transition-all transform hover:scale-105"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="mr-3 h-8 w-8 animate-spin" /> KAYDEDİLİYOR...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-3 h-8 w-8" /> PUANI KAYDET VE ÇIK
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={cn("min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden flex flex-col", shakeScreen && "animate-shake")}>
            <GameBackground />
            <GameHUD score={score} remaining={queue.length} />

            <main className="flex-grow flex flex-col items-center justify-start p-4 lg:p-8 relative z-10 mt-20 lg:mt-24 max-w-7xl mx-auto w-full">
                
                {/* SORU KARTI */}
                <div className="w-full max-w-4xl mb-8 lg:mb-12">
                     <div className={cn(
                        "relative bg-slate-900/60 backdrop-blur-xl border-2 rounded-[2rem] p-6 lg:p-12 text-center shadow-2xl transition-all duration-300 transform",
                        feedbackState === 'correct' ? "border-green-500/50 bg-green-900/20 scale-105" :
                        feedbackState === 'wrong' ? "border-red-500/50 bg-red-900/20 scale-95" :
                        "border-white/10 hover:border-amber-500/30"
                     )}>
                         <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-amber-500/20 w-32 h-32 rounded-full blur-[50px]" />
                         
                         <div className="relative z-10">
                            <div className="inline-flex items-center justify-center gap-2 mb-4 text-amber-400 font-bold tracking-widest text-xs lg:text-sm uppercase">
                                <Zap className="w-4 h-4 fill-amber-400" /> Soru
                            </div>
                            
                            <h2 className={cn(
                                "text-2xl md:text-4xl lg:text-5xl font-bold leading-tight drop-shadow-lg transition-colors duration-300",
                                feedbackState === 'correct' ? "text-green-400" :
                                feedbackState === 'wrong' ? "text-red-400" :
                                "text-white"
                            )}>
                                {currentQuestion?.text}
                            </h2>

                            {feedbackState === 'wrong' && (
                                <p className="mt-4 text-red-400 font-medium animate-in fade-in slide-in-from-top-2">
                                    Yanlış! Bu soru sona eklendi.
                                </p>
                            )}
                            {feedbackState === 'correct' && (
                                <p className="mt-4 text-green-400 font-medium animate-in fade-in slide-in-from-bottom-2">
                                    Doğru! Harika gidiyorsun.
                                </p>
                            )}
                         </div>
                     </div>
                </div>

                {/* CEVAP GRİDİ */}
                <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4 pb-10">
                    {allTerms.map((term) => {
                        const isActive = activeTermId === term;
                        const isWrong = isActive && feedbackState === 'wrong';
                        const isCorrect = isActive && feedbackState === 'correct';
                        
                        return (
                            <button
                                key={term}
                                onClick={() => handleAnswer(term)}
                                disabled={feedbackState !== 'idle'}
                                className={cn(
                                    "relative h-16 lg:h-24 rounded-xl lg:rounded-2xl font-bold text-sm lg:text-xl transition-all duration-200 select-none touch-manipulation active:scale-95 shadow-lg flex items-center justify-center p-2 text-center leading-tight",
                                    // Normal Durum
                                    !isActive && "bg-slate-800 hover:bg-slate-700 text-slate-200 border-b-4 border-slate-950 active:border-b-0 active:translate-y-1",
                                    // Doğru Durum
                                    isCorrect && "bg-green-600 border-green-800 text-white z-20 scale-105 shadow-green-500/50",
                                    // Yanlış Durum
                                    isWrong && "bg-red-600 border-red-800 text-white z-20 animate-shake shadow-red-500/50",
                                    // Pasif Durum (Diğerleri)
                                    feedbackState !== 'idle' && !isActive && "opacity-50 blur-[1px] scale-95"
                                )}
                            >
                                {term}
                                {isCorrect && <CheckCircle2 className="absolute top-1 right-1 w-4 h-4 lg:w-6 lg:h-6 text-white/50" />}
                            </button>
                        );
                    })}
                </div>

            </main>
        </div>
    );
}

// --- SUSPENSE WRAPPER ---
export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-amber-500" /></div>}>
            <BilBakalimGame />
        </Suspense>
    );
}
