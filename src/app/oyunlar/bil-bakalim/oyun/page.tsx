'use client';

import { useState, useEffect, useCallback, Suspense, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getBilBakalimAction, submitBilBakalimScoreAction } from '@/app/oyunlar/bil-bakalim/actions';
import type { Question } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { 
    Loader2, CheckCircle2, Flame, Trophy, XOctagon, Lightbulb, 
    RotateCcw, Sparkles, X, Target, HelpCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { playSound } from '@/lib/audio-service';
import { GameEndScreen } from '@/components/game-end-screen';
import { WordwallShell, useWordwall } from '@/components/wordwall/wordwall-shell';
import { db } from '@/lib/firebase';
import { collection, serverTimestamp, writeBatch, doc, increment } from 'firebase/firestore';
import Confetti from 'react-dom-confetti';
import { getGameBackUrl } from '@/lib/game-navigation';

// Wordwall Primary Renk Paleti (Find the Match renkleri)
const WORD_COLORS = [
    { bg: "bg-[#258146]", border: "border-[#196132]", shadow: "shadow-[#258146]/30", hover: "hover:bg-[#2e9a54]" }, // Orman Yeşili
    { bg: "bg-[#504bb5]", border: "border-[#3b378c]", shadow: "shadow-[#504bb5]/30", hover: "hover:bg-[#605ac8]" }, // Mor / İndigo
    { bg: "bg-[#b23b25]", border: "border-[#852716]", shadow: "shadow-[#b23b25]/30", hover: "hover:bg-[#cf472f]" }, // Pas Kırmızısı
    { bg: "bg-[#1b76b2]", border: "border-[#13547f]", shadow: "shadow-[#1b76b2]/30", hover: "hover:bg-[#208ccc]" }, // Okyanus Mavisi
    { bg: "bg-[#583f2e]", border: "border-[#3f2c20]", shadow: "shadow-[#583f2e]/30", hover: "hover:bg-[#6c4e3a]" }, // Koyu Kahve
    { bg: "bg-[#254d82]", border: "border-[#183459]", shadow: "shadow-[#254d82]/30", hover: "hover:bg-[#2e5d9c]" }, // Gece Laciverti
    { bg: "bg-[#8e5837]", border: "border-[#683f25]", shadow: "shadow-[#8e5837]/30", hover: "hover:bg-[#a86a44]" }, // Sıcak Bronz
    { bg: "bg-[#2d8b4e]", border: "border-[#206738]", shadow: "shadow-[#2d8b4e]/30", hover: "hover:bg-[#37a55e]" }, // Açık Orman Yeşili
    { bg: "bg-[#5c49b6]", border: "border-[#423389]", shadow: "shadow-[#5c49b6]/30", hover: "hover:bg-[#6f59d4]" }, // Koyu Lavanta
    { bg: "bg-[#bf3921]", border: "border-[#8e2815]", shadow: "shadow-[#bf3921]/30", hover: "hover:bg-[#dc4428]" }, // Kiremit Kırmızısı
    { bg: "bg-[#156ea9]", border: "border-[#0e4e79]", shadow: "shadow-[#156ea9]/30", hover: "hover:bg-[#1a85cb]" }, // Gölet Mavisi
    { bg: "bg-[#684b39]", border: "border-[#4b3527]", shadow: "shadow-[#684b39]/30", hover: "hover:bg-[#7d5b46]" }, // Fındık Kabuğu
];

interface CardItem {
    id: string;
    term: string;
    color: typeof WORD_COLORS[0];
}

function BilBakalimInnerGame() {
    const { user } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { theme, soundEnabled } = useWordwall();

    // Veri ve Soru Kuyruğu State'leri
    const [questions, setQuestions] = useState<Partial<Question>[]>([]);
    const [allCards, setAllCards] = useState<CardItem[]>([]);
    const [eliminatedTerms, setEliminatedTerms] = useState<Set<string>>(new Set());
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

    const [gameState, setGameState] = useState<'loading' | 'playing' | 'won' | 'error' | 'finished'>('loading');
    const [error, setError] = useState<string | null>(null);

    // Skor ve Kombo
    const [score, setScore] = useState(0);
    const [correctStreak, setCorrectStreak] = useState(0);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    // Tıklanan kart durumları (Animasyon için)
    const [animatingTerm, setAnimatingTerm] = useState<string | null>(null);
    const [wrongTerm, setWrongTerm] = useState<string | null>(null);
    const [gameShake, setGameShake] = useState(false);

    const mode = searchParams.get('mode');
    const topicId = searchParams.get('topicId');
    const isMission = mode === 'mission';
    const topicName = searchParams.get('topicName') || searchParams.get('courseName') || 'Kelimeler';
    const gameContext = `Bil Bakalım - ${searchParams.get('courseName')} > ${searchParams.get('topicName')}`;
    const backUrl = getGameBackUrl({ user, searchParams, defaultBackUrl: isMission ? '/student/gorevler' : '/oyunlar/bil-bakalim' });

    // Süre Sayacı
    useEffect(() => {
        if (gameState !== 'playing') return;
        const interval = setInterval(() => {
            setElapsedSeconds(prev => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [gameState]);

    // Veri Çekme
    const fetchGameData = useCallback(async () => {
        setGameState('loading');
        setEliminatedTerms(new Set());
        setCurrentQuestionIndex(0);
        setScore(0);
        setCorrectStreak(0);
        setElapsedSeconds(0);
        setIsScoreSaved(false);

        const params = {
            topicId: searchParams.get('topicId') || undefined,
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
        };
        const result = await getBilBakalimAction(params);

        if (result.error || !result.questions || result.questions.length === 0) {
            setError(result.error || "Bu konu için uygun soru bulunamadı.");
            setGameState('error');
        } else {
            const rawQuestions = result.questions;
            setQuestions(rawQuestions);

            // Tüm kavram kartlarını oluştur ve renk ata
            const cards: CardItem[] = rawQuestions.map((q, idx) => ({
                id: q.id || `card-${idx}`,
                term: q.correctAnswer || '',
                color: WORD_COLORS[idx % WORD_COLORS.length]
            }));

            // Kartları tahtada rastgele karıştır
            setAllCards([...cards].sort(() => Math.random() - 0.5));
            setGameState('playing');
        }
    }, [searchParams]);

    useEffect(() => { 
        fetchGameData(); 
    }, [fetchGameData]);

    const currentQuestion = useMemo(() => {
        return questions[currentQuestionIndex] || null;
    }, [questions, currentQuestionIndex]);

    const remainingCardsCount = useMemo(() => {
        return allCards.length - eliminatedTerms.size;
    }, [allCards.length, eliminatedTerms.size]);

    // Karta Tıklama / Cevap Verme (Wordwall Find the Match Mantığı)
    const handleCardClick = (term: string) => {
        if (gameState !== 'playing' || animatingTerm || wrongTerm || !currentQuestion) return;
        if (eliminatedTerms.has(term)) return;

        const isCorrect = term.toLocaleLowerCase('tr-TR') === (currentQuestion.correctAnswer || '').toLocaleLowerCase('tr-TR');

        if (isCorrect) {
            // DOĞRU CEVAP: Kart elenir (Eliminate it!)
            if (soundEnabled) playSound('correct');
            setAnimatingTerm(term);

            const newStreak = correctStreak + 1;
            setCorrectStreak(newStreak);
            // 10 taban puan + kombo bonusu
            const streakBonus = Math.min(newStreak * 2, 10);
            setScore(prev => prev + 10 + streakBonus);

            setTimeout(() => {
                // Kartı elenenler listesine ekle
                setEliminatedTerms(prev => {
                    const next = new Set(prev).add(term);
                    // Tüm kartlar elendi mi?
                    if (next.size === allCards.length) {
                        setGameState('won');
                        if (soundEnabled) playSound('win');
                        setShowConfetti(true);
                    }
                    return next;
                });

                // Sıradaki soruya geç
                setCurrentQuestionIndex(prev => prev + 1);
                setAnimatingTerm(null);
            }, 350);
        } else {
            // YANLIŞ CEVAP: Kart sallanır, kırmızı olur, elenmez
            if (soundEnabled) playSound('incorrect');
            setWrongTerm(term);
            setCorrectStreak(0);
            setScore(prev => Math.max(0, prev - 2));
            setGameShake(true);

            setTimeout(() => {
                setWrongTerm(null);
                setGameShake(false);
            }, 550);
        }
    };

    const isAllSolved = gameState === 'won';

    // Skor Kaydetme
    const handleSaveAndExit = async () => {
        if (!user || isSaving || isScoreSaved) {
            router.push(isMission ? '/student/gorevler' : backUrl);
            return;
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
                    gameType: 'bil-bakalim',
                    timestamp: serverTimestamp(),
                    isMission: true,
                    completed: isAllSolved
                });

                const userRef = doc(db, 'users', user.uid);
                batch.update(userRef, {
                    score: increment(score)
                });

                await batch.commit();

                if (isAllSolved) {
                    toast({ title: "Görev Başarılı!", description: "Tüm kavramları doğru eşleştirip eledin ve puanın eklendi.", className: "bg-green-600 text-white" });
                } else {
                    toast({ title: "Puan Kaydedildi", description: "Tüm kartları tamamlamalısın.", className: "bg-yellow-600 text-white" });
                }
            } else {
                const result = await submitBilBakalimScoreAction(user.uid, score, gameContext);
                if (result.success) {
                    toast({ title: "Başarılı", description: "Puanınız kaydedildi." });
                } else {
                    toast({ title: "Hata", description: result.error, variant: "destructive" });
                }
            }
            setIsScoreSaved(true);
        } catch (e) {
            toast({ title: "Hata", description: "Puan kaydedilemedi.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleRestart = () => {
        setShowConfetti(false);
        fetchGameData();
    };

    if (gameState === 'loading') {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-white gap-4">
                <Loader2 className="animate-spin h-12 w-12 text-indigo-500" />
                <p className="text-lg font-bold tracking-wider animate-pulse">Bil Bakalım Yükleniyor...</p>
            </div>
        );
    }

    if (gameState === 'error') {
        return (
            <div className="h-screen w-screen bg-slate-950 flex items-center justify-center text-center p-4">
                <div className="bg-slate-900/90 backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-2xl max-w-md w-full text-white">
                    <XOctagon className="h-16 w-16 text-rose-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-black mb-2">Soru Bulunamadı</h2>
                    <p className="text-slate-400 mb-6 text-sm">{error || "Bu konu için henüz uygun kavram tanımı eklenmemiş."}</p>
                    <Button onClick={() => router.push(backUrl)} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold">
                        Geri Dön
                    </Button>
                </div>
            </div>
        );
    }

    // Grid sütun hesaplaması (Kart sayısına göre dinamik)
    const getGridColsClass = () => {
        const total = allCards.length;
        if (total <= 6) return "grid-cols-2 sm:grid-cols-3";
        if (total <= 8) return "grid-cols-2 sm:grid-cols-4";
        if (total <= 10) return "grid-cols-2 sm:grid-cols-3 md:grid-cols-5";
        return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6";
    };

    return (
        <WordwallShell
            title="Bil Bakalım"
            subtitle={topicName}
            currentQuestionIndex={allCards.length - remainingCardsCount + 1}
            totalQuestions={allCards.length}
            score={score}
            timeLeft={elapsedSeconds}
            backUrl={backUrl}
            isFinished={gameState === 'won' || gameState === 'finished'}
            fitToScreen={true}
            contentClassName="w-full h-full min-h-0 flex flex-col justify-between overflow-hidden p-2 sm:p-4 select-none"
        >
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50">
                <Confetti active={showConfetti} config={{ elementCount: 160, spread: 130, startVelocity: 40 }} />
            </div>

            {gameState === 'won' || gameState === 'finished' ? (
                <div className="w-full max-w-xl mx-auto my-auto animate-in zoom-in-95 duration-300">
                    <GameEndScreen 
                        score={score}
                        onSave={user ? handleSaveAndExit : undefined}
                        isSaving={isSaving}
                        scoreSaved={isScoreSaved}
                        onRestart={handleRestart}
                        backUrl={backUrl}
                        isSuccess={isAllSolved}
                        isMission={isMission}
                        customMessage={
                            isMission 
                                ? (isAllSolved 
                                    ? "Tebrikler! Tüm kavramları doğru eşleştirip eleyerek görevi tamamladın." 
                                    : "Tüm kartları eleyemedin. Görevi geçmek için tüm soruları tamamlamalısın.")
                                : undefined
                        }
                    />
                </div>
            ) : (
                <div className={cn(
                    "w-full h-full max-w-6xl mx-auto flex flex-col justify-between gap-3 sm:gap-4 transition-all",
                    gameShake && "animate-shake"
                )}>
                    {/* 1. ÜST İPUCU & SORU KARTI (WORDWALL BANNER) */}
                    <div className={cn(
                        "w-full rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 transition-all text-center relative shrink-0",
                        theme.cardBg,
                        theme.cardBorder,
                        theme.cardShadow
                    )}>
                        <div className="flex items-center justify-between gap-2 mb-1.5 sm:mb-2">
                            <span className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider",
                                theme.scoreBadge
                            )}>
                                <Target className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                                Eşleşmeyi Bul
                            </span>

                            <div className="flex items-center gap-2">
                                {correctStreak > 1 && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                                        <Flame className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                                        x{correctStreak} Kombo!
                                    </span>
                                )}

                                <span className="text-[11px] sm:text-xs font-bold text-slate-400 tracking-wide">
                                    Kalan Kart: {remainingCardsCount} / {allCards.length}
                                </span>
                            </div>
                        </div>

                        {/* Soru / Tanım Metni */}
                        <p className={cn(
                            "text-base sm:text-xl md:text-2xl font-black leading-snug drop-shadow-sm px-2",
                            theme.questionText
                        )}>
                            {currentQuestion?.text}
                        </p>

                        <div className="mt-1 text-[11px] sm:text-xs font-semibold text-slate-400/80">
                            Doğru cevaba dokun ve onu tahtadan ele!
                        </div>
                    </div>

                    {/* 2. ANA ALAN: CEVAP KAROLARI (WORDWALL FIND THE MATCH GRID) */}
                    <div className="flex-1 min-h-0 flex items-center justify-center p-1 sm:p-2">
                        <div className={cn(
                            "w-full h-full max-h-full grid gap-2.5 sm:gap-3.5 md:gap-4 items-center justify-center",
                            getGridColsClass()
                        )}>
                            {allCards.map(card => {
                                const isEliminated = eliminatedTerms.has(card.term);
                                const isAnimating = animatingTerm === card.term;
                                const isWrong = wrongTerm === card.term;

                                return (
                                    <button
                                        key={card.id}
                                        onClick={() => handleCardClick(card.term)}
                                        disabled={isEliminated || animatingTerm !== null}
                                        className={cn(
                                            "relative w-full h-full min-h-[58px] sm:min-h-[72px] md:min-h-[85px] lg:min-h-[96px]",
                                            "rounded-xl sm:rounded-2xl font-black select-none flex items-center justify-center text-center p-2 sm:p-3",
                                            "text-sm sm:text-base md:text-lg lg:text-xl text-white transition-all duration-300",
                                            "border-2 border-b-[6px] shadow-lg",
                                            // 1. NORMAL AKTİF KART (3D Dokunsal Buton)
                                            !isEliminated && !isAnimating && !isWrong && cn(
                                                card.color.bg,
                                                card.color.border,
                                                card.color.hover,
                                                "active:translate-y-1 active:border-b-2 cursor-pointer hover:scale-[1.02] hover:brightness-110"
                                            ),
                                            // 2. DOĞRU BİLİNEN KART (Yeşil Işıltı & Büyüme)
                                            isAnimating && "bg-gradient-to-b from-emerald-500 to-emerald-700 border-emerald-300 border-b-emerald-950 scale-105 z-20 shadow-[0_0_25px_rgba(16,185,129,0.7)] animate-bounce",
                                            // 3. YANLIŞ BİLİNEN KART (Kırmızı Titreme)
                                            isWrong && "bg-gradient-to-b from-rose-600 to-rose-800 border-rose-300 border-b-rose-950 scale-105 z-20 shadow-[0_0_25px_rgba(244,63,94,0.7)] animate-shake",
                                            // 4. ELENEN KART (Tahtadan silinir / yok olur)
                                            isEliminated && "scale-0 opacity-0 pointer-events-none"
                                        )}
                                    >
                                        <span className="leading-tight break-words drop-shadow-sm select-none">
                                            {card.term}
                                        </span>

                                        {/* Doğru Eşleşti Rozeti */}
                                        {isAnimating && (
                                            <div className="absolute -top-2 -right-2 bg-white text-emerald-600 rounded-full p-1 shadow-md animate-in zoom-in">
                                                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
                                            </div>
                                        )}

                                        {/* Yanlış Rozeti */}
                                        {isWrong && (
                                            <div className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full p-1 shadow-md animate-in zoom-in">
                                                <X className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 3. ALT BİLGİ & İLERLEME ÇUBUĞU */}
                    <div className="shrink-0 w-full px-2 py-1 flex items-center justify-between text-xs font-bold text-slate-400">
                        <span>Hedef: Tüm kartları eleyerek tahtayı temizle</span>
                        <span>{allCards.length - remainingCardsCount} / {allCards.length} Tamamlandı</span>
                    </div>
                </div>
            )}

            {/* Titreme Animasyonu */}
            <style jsx global>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    20% { transform: translateX(-8px); }
                    40% { transform: translateX(8px); }
                    60% { transform: translateX(-6px); }
                    80% { transform: translateX(6px); }
                }
                .animate-shake {
                    animation: shake 0.4s ease-in-out;
                }
            `}</style>
        </WordwallShell>
    );
}

export default function BilBakalimPage() {
    return (
        <Suspense fallback={
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-white gap-3">
                <Loader2 className="animate-spin h-10 w-10 text-indigo-500" />
                <span className="font-bold tracking-widest text-slate-400 uppercase text-xs">Yükleniyor...</span>
            </div>
        }>
            <BilBakalimInnerGame />
        </Suspense>
    );
}
