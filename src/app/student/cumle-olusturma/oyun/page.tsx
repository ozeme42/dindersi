'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getSentenceScrambleAction, submitSentenceScrambleScoreAction } from '../actions';
import type { SentenceScramble } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Save, Home, Repeat, Trophy, Quote, Check, X, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { playSound } from '@/lib/audio-service';
import { useToast } from '@/hooks/use-toast';

// --- RENK PALETİ ---
const WORD_COLORS = [
    "bg-blue-500 hover:bg-blue-400 border-blue-700 text-white",
    "bg-emerald-500 hover:bg-emerald-400 border-emerald-700 text-white",
    "bg-violet-500 hover:bg-violet-400 border-violet-700 text-white",
    "bg-rose-500 hover:bg-rose-400 border-rose-700 text-white",
    "bg-amber-500 hover:bg-amber-400 border-amber-700 text-white",
    "bg-cyan-500 hover:bg-cyan-400 border-cyan-700 text-white",
    "bg-fuchsia-500 hover:bg-fuchsia-400 border-fuchsia-700 text-white",
    "bg-indigo-500 hover:bg-indigo-400 border-indigo-700 text-white",
];

// --- GÖRSEL BİLEŞENLER ---

const GameBackground = () => (
    <div className="fixed inset-0 pointer-events-none z-0 bg-slate-950 overflow-hidden">
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-orange-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-amber-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[40%] right-[30%] w-[30%] h-[30%] bg-yellow-500/5 rounded-full blur-[100px]" />
    </div>
);

const GameHUD = ({ score, current, total }: { score: number, current: number, total: number }) => {
    const progress = total > 0 ? ((current + 1) / total) * 100 : 0;
    return (
        <div className="fixed top-0 left-0 right-0 z-50 p-4 lg:p-6">
            <div className="max-w-5xl mx-auto flex items-center gap-4">
                <div className="flex-grow h-3 lg:h-4 bg-slate-900/50 backdrop-blur-md rounded-full border border-white/10 relative overflow-hidden">
                    <div 
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-700 ease-out shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-orange-500/30 px-4 py-2 rounded-full shadow-lg shadow-orange-500/10 min-w-[100px] justify-center">
                    <Trophy className="w-4 h-4 lg:w-5 lg:h-5 text-orange-400 fill-orange-400 animate-bounce" />
                    <span className="text-lg lg:text-xl font-black text-orange-100 font-mono tracking-widest">
                        {score}
                    </span>
                </div>
            </div>
        </div>
    );
};

// --- ANA OYUN MANTIĞI ---

function SentenceScrambleGame() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    
    // State
    const [questions, setQuestions] = useState<SentenceScramble[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    
    const [shuffledWords, setShuffledWords] = useState<{ id: number, word: string, colorClass: string }[]>([]);
    const [constructedSentence, setConstructedSentence] = useState<{ id: number, word: string, colorClass: string }[]>([]);
    
    const [isSentenceComplete, setIsSentenceComplete] = useState(false); // Cümle bitti mi?
    const [score, setScore] = useState(0);
    const [gameState, setGameState] = useState<'playing' | 'finished'>('playing');
    const [isSaving, setIsSaving] = useState(false);
    
    // Hatalı tıklama efekti için
    const [shakeWordId, setShakeWordId] = useState<number | null>(null);

    const gameContext = `Cümle Ustası - ${searchParams.get('topicName')}`;
    
    // Kelimeleri Hazırla
    const setupLevel = useCallback((question: SentenceScramble) => {
        const words = question.scrambledSentence.split(' ').map((word, index) => ({ 
            id: index, 
            word,
            // Rastgele ama sabit bir renk ata
            colorClass: WORD_COLORS[index % WORD_COLORS.length]
        }));
        
        // Kelimeleri karıştır
        const shuffled = [...words].sort(() => Math.random() - 0.5);
        setShuffledWords(shuffled);
        setConstructedSentence([]);
        setIsSentenceComplete(false);
    }, []);

    // Veri Çekme
    useEffect(() => {
        const fetchQuestions = async () => {
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
            };
            const result = await getSentenceScrambleAction(params);
            
            if (result.error) {
                setError(result.error);
            } else if (result.questions && result.questions.length > 0) {
                setQuestions(result.questions);
                setupLevel(result.questions[0]);
            } else {
                setError("Bu konu için uygun soru bulunamadı.");
            }
            setIsLoading(false);
        };
        fetchQuestions();
    }, [searchParams, setupLevel]);
    
    const currentQuestion = questions[currentQuestionIndex];

    // Kelime Seçimi (Doğrulama burada yapılıyor)
    const handleWordSelect = (wordObj: { id: number, word: string, colorClass: string }) => {
        if (isSentenceComplete) return;

        // Doğru cümlenin sıradaki kelimesini bul
        const correctWordsArray = currentQuestion.correctSentence.split(' ');
        const targetWordIndex = constructedSentence.length;
        const targetWord = correctWordsArray[targetWordIndex];

        // Seçilen kelime, beklenen kelime mi?
        // Not: Basit eşitlik kontrolü. İhtiyaç olursa noktalama işaretleri temizlenebilir.
        if (wordObj.word === targetWord) {
            // DOĞRU
            playSound('pop'); 
            setConstructedSentence(prev => [...prev, wordObj]);
            setShuffledWords(prev => prev.filter(w => w.id !== wordObj.id));

            // Cümle bitti mi?
            if (targetWordIndex + 1 === correctWordsArray.length) {
                setIsSentenceComplete(true);
                playSound('correct');
                setScore(prev => prev + 20);
            }
        } else {
            // YANLIŞ
            playSound('incorrect');
            setShakeWordId(wordObj.id);
            setTimeout(() => setShakeWordId(null), 500); // Shake animasyonu süresi
        }
    };

    // Sonraki Soru
    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            const nextIndex = currentQuestionIndex + 1;
            setCurrentQuestionIndex(nextIndex);
            setupLevel(questions[nextIndex]);
        } else {
            setGameState('finished');
        }
    };
    
    // Kaydet ve Çık
    const handleSaveAndExit = async () => {
        if (!user || score === 0 || isSaving) {
            router.push('/student/activities');
            return;
        }
        setIsSaving(true);
        const result = await submitSentenceScrambleScoreAction(user.uid, score, gameContext);
        if (result.success) {
            toast({ title: "Başarılı!", description: "Puanın kaydedildi." });
            router.push('/student/activities');
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
            setIsSaving(false);
        }
    }

    // --- RENDER ---

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-950">
                <Loader2 className="h-16 w-16 animate-spin text-orange-500" />
            </div>
        );
    }
    
    if (error) {
        return (
             <div className="flex h-screen w-full items-center justify-center p-4 bg-slate-950">
                 <div className="text-center space-y-4 max-w-md bg-orange-950/50 p-6 rounded-3xl border border-orange-500/30">
                    <X className="h-16 w-16 text-orange-500 mx-auto" />
                    <h3 className="text-xl font-bold text-orange-100">Oyun Başlatılamadı</h3>
                    <p className="text-orange-200/70">{error}</p>
                     <Button asChild variant="secondary" className="w-full">
                        <Link href="/student/cumle-olusturma">Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    // Bitiş Ekranı
    if (gameState === 'finished') {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
                <GameBackground />
                <div className="relative z-10 w-full max-w-md text-center space-y-8 animate-in zoom-in-95 duration-500">
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-orange-500/20 rounded-full blur-2xl animate-pulse" />
                        <Trophy className="w-32 h-32 text-orange-400 mx-auto drop-shadow-[0_0_15px_rgba(249,115,22,0.5)]" />
                    </div>
                    <div>
                        <h1 className="text-4xl lg:text-5xl font-black text-white mb-2 tracking-tight">HARİKA İŞ!</h1>
                        <p className="text-slate-400 text-lg">Tüm cümleleri tamamladın.</p>
                    </div>
                    <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
                        <div className="text-6xl lg:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">
                            {score}
                        </div>
                    </div>
                    <div className="space-y-3">
                        <Button 
                            onClick={handleSaveAndExit} 
                            size="lg" 
                            disabled={isSaving}
                            className="w-full h-16 text-xl font-bold rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 shadow-xl shadow-orange-500/20 transition-all"
                        >
                            {isSaving ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Save className="mr-3 h-6 w-6" />}
                            PUANI KAYDET VE ÇIK
                        </Button>
                        <div className="grid grid-cols-2 gap-3">
                            <Button onClick={() => window.location.reload()} variant="secondary" className="h-14 bg-slate-800 text-slate-200 hover:bg-slate-700 rounded-2xl border border-white/5">
                                <Repeat className="mr-2 h-5 w-5" /> Tekrar
                            </Button>
                            <Button asChild variant="secondary" className="h-14 bg-slate-800 text-slate-200 hover:bg-slate-700 rounded-2xl border border-white/5">
                                <Link href="/student/activities"><Home className="mr-2 h-5 w-5" /> Menü</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden flex flex-col">
            <GameBackground />
            <GameHUD score={score} current={currentQuestionIndex} total={questions.length} />

            <main className="flex-grow flex flex-col items-center justify-center p-4 lg:p-8 relative z-10 mt-16 lg:mt-12">
                <div className="w-full max-w-4xl space-y-8 lg:space-y-10">
                    
                    {/* Soru Başlığı */}
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 mb-4 bg-slate-800/50 px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
                            <Quote className="w-4 h-4 text-orange-400" />
                            <span className="text-xs lg:text-sm font-bold tracking-widest uppercase text-slate-300">Cümleyi Oluştur</span>
                        </div>
                    </div>

                    {/* Hedef Alan (Oluşturulan Cümle) */}
                    <div className={cn(
                        "min-h-[120px] lg:min-h-[160px] bg-slate-900/60 backdrop-blur-xl border-2 rounded-3xl p-4 lg:p-6 flex flex-wrap content-center justify-center gap-2 lg:gap-3 transition-all duration-300",
                        isSentenceComplete 
                            ? "border-green-500/50 bg-green-900/20 shadow-[0_0_30px_rgba(34,197,94,0.2)]" 
                            : "border-white/10 border-dashed"
                    )}>
                        {constructedSentence.length === 0 && !isSentenceComplete && (
                            <span className="text-slate-500 text-base lg:text-xl font-medium animate-pulse select-none">
                                Aşağıdaki kelimelere sırasıyla tıkla...
                            </span>
                        )}
                        
                        {constructedSentence.map((wordObj) => (
                            <div
                                key={wordObj.id}
                                className={cn(
                                    "relative px-4 py-2 lg:px-6 lg:py-3 rounded-xl font-bold text-lg lg:text-2xl shadow-lg border-b-4 select-none animate-in zoom-in-50 duration-200",
                                    wordObj.colorClass
                                )}
                            >
                                {wordObj.word}
                            </div>
                        ))}
                        
                        {isSentenceComplete && (
                            <div className="w-full text-center mt-2 animate-in fade-in slide-in-from-bottom-2">
                                <Sparkles className="w-6 h-6 text-green-400 mx-auto animate-bounce" />
                            </div>
                        )}
                    </div>

                    {/* Kaynak Alan (Karışık Kelimeler) */}
                    {!isSentenceComplete ? (
                        <div className="flex flex-wrap justify-center gap-2 lg:gap-4 min-h-[100px]">
                            {shuffledWords.map((wordObj) => (
                                <button
                                    key={wordObj.id}
                                    onClick={() => handleWordSelect(wordObj)}
                                    className={cn(
                                        "group relative transition-transform active:scale-95 touch-manipulation",
                                        shakeWordId === wordObj.id && "animate-shake"
                                    )}
                                >
                                    {/* 3D Gölge Katmanı */}
                                    <div className={cn("absolute inset-0 rounded-xl translate-y-1.5 transition-colors opacity-50 bg-slate-800")} />
                                    
                                    {/* Ön Yüz */}
                                    <div className={cn(
                                        "relative px-4 py-3 lg:px-6 lg:py-4 rounded-xl font-bold text-lg lg:text-2xl shadow-lg border-b-4 active:border-b-0 active:translate-y-1.5 transition-all",
                                        wordObj.colorClass,
                                        shakeWordId === wordObj.id && "bg-red-500 border-red-700" // Hata durumunda kırmızı
                                    )}>
                                        {wordObj.word}
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        // Cümle Tamamlandığında Çıkan Buton
                        <div className="h-24 flex items-center justify-center animate-in zoom-in fade-in">
                            <Button 
                                onClick={handleNext} 
                                size="lg" 
                                className="h-14 lg:h-16 px-8 lg:px-12 text-xl font-bold rounded-2xl bg-green-600 hover:bg-green-500 shadow-xl shadow-green-500/30 transition-all hover:scale-105"
                            >
                                {currentQuestionIndex === questions.length - 1 ? 'SONUÇLARI GÖR' : 'SONRAKİ CÜMLE'} <ArrowLeft className="ml-2 w-5 h-5 rotate-180" />
                            </Button>
                        </div>
                    )}

                </div>
            </main>
        </div>
    );
}

// --- WRAPPER ---
export default function SentenceScramblePage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-orange-500" /></div>}>
            <SentenceScrambleGame />
        </Suspense>
    );
}