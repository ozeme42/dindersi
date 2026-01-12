'use client';

import { Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

// --- ACTION IMPORTS ---
import { getQuestionsFromBank } from '@/lib/quiz-actions';
import { 
  getCourseForSoruBankasi, 
  getQuestionBankProgress, 
  getQuestionCounts, 
  updateTopicTestProgress, 
  getCourseLeaderboard 
} from '@/app/student/soru-bankasi/actions';
import { addQuestionToReviewList } from '@/app/student/tekrar-et/actions';

// --- TYPES & UTILS ---
import type { Course, Topic, Question, QuestionBankProgress, TestResult } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { playSound } from '@/lib/audio-service';

// --- UI COMPONENTS ---
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Loader2, ArrowLeft, CheckCircle2, Lock, PlayCircle, Trophy, 
  ShieldCheck, Shield, ShieldAlert, CheckCheck, XCircle, 
  BookOpen, ChevronLeft, Star, Bug, X, Zap, Target, ArrowRight, Check, Sparkles
} from 'lucide-react';

// --- SABİTLER ---
const difficultyMap = { 'Kolay': 'easy', 'Orta': 'medium', 'Zor': 'hard' } as const;
const TOPIC_REWARD = 30000; 

// --- ARKA PLAN EFEKTİ ---
const MissionBackground = () => (
    <div className="fixed inset-0 pointer-events-none z-0 bg-[#020617] overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" style={{ opacity: 0.05 }}/>
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[120px] animate-pulse-slow delay-1000" />
    </div>
);

// =================================================================
// 1. SORU ÇÖZME EKRANI (OVERLAY)
// =================================================================
function QuestionTestOverlay({ topic, difficulty, testIndex, onComplete, onBack }: any) {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();
    
    // Oyun Durumu
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<(string | boolean | null)[]>([]);
    const [isFinished, setIsFinished] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Puanlama & Efektler
    const [score, setScore] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [streak, setStreak] = useState(0); 

    const PASS_THRESHOLD = 0.7;
    const QUESTION_POINT = 50;

    useEffect(() => {
        let isMounted = true;
        async function fetchQuestions() {
            setIsLoading(true);
            try {
                const result = await getQuestionsFromBank({ 
                    topicId: topic.id, 
                    difficulty: [], 
                    questionCount: 500, 
                    isStatic: true 
                });
                
                if (!isMounted) return;

                if (result.error || !result.questions) {
                    setError(result.error || "Sorular yüklenemedi.");
                } else {
                    const allRawQuestions = result.questions as Question[];
                    const targetDifficulty = difficulty; 
                    const targetDifficultyEng = difficultyMap[difficulty as keyof typeof difficultyMap]; 

                    const filteredQuestions = allRawQuestions.filter(q => {
                        const qDiff = q.difficulty ? q.difficulty.toLowerCase().trim() : '';
                        return qDiff === targetDifficulty.toLowerCase() || 
                               qDiff === targetDifficultyEng.toLowerCase();
                    });

                    const sortedQuestions = filteredQuestions.sort((a,b) => (a.text || '').localeCompare(b.text || '', 'tr'));
                    const startIndex = testIndex * 10;
                    const selectedQuestions = sortedQuestions.slice(startIndex, startIndex + 10);
                    
                    if (selectedQuestions.length === 0) {
                        setError(`Bu seviyede (${difficulty}) yeterli soru bulunamadı.`);
                    } else {
                        setQuestions(selectedQuestions);
                        setAnswers(new Array(selectedQuestions.length).fill(null));
                    }
                }
            } catch (err: any) {
                if (isMounted) setError("Bir hata oluştu: " + err.message);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }
        fetchQuestions();
        return () => { isMounted = false; };
    }, [topic, difficulty, testIndex]);

    const handleAnswer = (answer: any) => {
        if (answers[currentIndex] !== null && answers[currentIndex] !== undefined) return;
        const newAnswers = [...answers];
        newAnswers[currentIndex] = answer;
        setAnswers(newAnswers);
        
        const q = questions[currentIndex];
        let isCorrect = false;
        if (q.type === 'Doğru/Yanlış') {
            isCorrect = answer === (q.correctAnswer === 'Doğru');
        } else {
            isCorrect = answer === q.correctAnswer;
        }

        if (isCorrect) {
            playSound('correct');
            const bonus = (streak + 1) % 3 === 0 ? 10 : 0;
            setScore(s => s + QUESTION_POINT + bonus);
            setCorrectCount(c => c + 1);
            setStreak(s => s + 1);
        } else {
            playSound('incorrect');
            setStreak(0);
            if (user?.uid) addQuestionToReviewList(user.uid, q);
        }
    };

    const handleFinish = async (action: 'next' | 'close') => {
        if (isSaving) return;
        setIsSaving(true);
        const hasPassed = (correctCount / questions.length) >= PASS_THRESHOLD;
        await onComplete(difficulty, testIndex, score, hasPassed, correctCount, questions.length, action);
    };

    if (isLoading) return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 backdrop-blur-sm"><Loader2 className="h-12 w-12 animate-spin text-cyan-500" /></div>;
    
    if (error) return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-8 bg-slate-950 text-center gap-4">
            <div className="p-4 bg-red-500/10 rounded-full"><Bug className="w-12 h-12 text-red-500" /></div>
            <p className="text-white text-lg font-medium">{error}</p>
            <Button onClick={onBack} variant="outline" className="mt-4">Geri Dön</Button>
        </div>
    );

    const currentQuestion = questions[currentIndex];
    const progressPercent = ((currentIndex + (answers[currentIndex] !== null ? 1 : 0)) / questions.length) * 100;

    if (isFinished) {
        const hasPassed = (correctCount / questions.length) >= PASS_THRESHOLD;
        const successRate = (correctCount / questions.length) * 100;

        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#020617] animate-in fade-in duration-300">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/20 rounded-full blur-[120px]" />
                </div>

                <Card className="w-full max-w-md bg-slate-900/90 border-white/10 shadow-2xl relative z-10 backdrop-blur-xl">
                    <CardContent className="pt-10 pb-8 px-8 text-center flex flex-col items-center gap-6">
                        <div className={cn("w-24 h-24 rounded-full flex items-center justify-center mb-2 shadow-2xl ring-4 transition-all duration-500", 
                            hasPassed ? "bg-gradient-to-br from-yellow-400 to-orange-500 ring-yellow-500/20" : "bg-slate-800 ring-slate-700"
                        )}>
                            {hasPassed ? <Trophy className="w-12 h-12 text-white animate-bounce" /> : <Target className="w-12 h-12 text-slate-400" />}
                        </div>

                        <div>
                            <h2 className="text-3xl font-black text-white mb-2">{hasPassed ? "TEBRİKLER!" : "TEST TAMAMLANDI"}</h2>
                            <p className={cn("text-lg font-medium", hasPassed ? "text-yellow-400" : "text-slate-400")}>
                                {hasPassed ? "Harika bir iş çıkardın!" : "Biraz daha çalışmalısın."}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 w-full">
                            <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5 flex flex-col items-center">
                                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Başarı</span>
                                <span className={cn("text-2xl font-black", hasPassed ? "text-green-400" : "text-red-400")}>%{successRate.toFixed(0)}</span>
                            </div>
                            <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5 flex flex-col items-center">
                                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Puan</span>
                                <span className="text-2xl font-black text-cyan-400">{score}</span>
                            </div>
                        </div>

                        <div className="w-full space-y-3 mt-2">
                            {hasPassed && (
                                <Button 
                                    onClick={() => handleFinish('next')} 
                                    disabled={isSaving} 
                                    className="w-full h-14 text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg shadow-green-900/30 rounded-xl transition-all hover:scale-[1.02]"
                                >
                                    {isSaving ? <Loader2 className="animate-spin" /> : <span className="flex items-center gap-2">Sıradaki Test <ArrowRight className="w-5 h-5"/></span>}
                                </Button>
                            )}
                            
                            <Button 
                                onClick={() => handleFinish('close')} 
                                disabled={isSaving} 
                                variant="outline" 
                                className="w-full h-14 text-lg font-bold border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-xl"
                            >
                                {isSaving ? <Loader2 className="animate-spin" /> : (hasPassed ? "Listeye Dön" : "Sonucu Kaydet ve Çık")}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-[#020617] text-white overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 px-4 py-4 md:py-6 bg-slate-900/50 backdrop-blur-md border-b border-white/5 relative z-20">
                <div className="max-w-4xl mx-auto w-full flex items-center justify-between gap-4">
                    <Button onClick={onBack} size="icon" variant="ghost" className="h-10 w-10 rounded-full bg-white/5 hover:bg-white/10 text-slate-300">
                        <X className="w-5 h-5" />
                    </Button>

                    <div className="flex-1 flex flex-col gap-2 max-w-md">
                        <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <span>Soru {currentIndex + 1} / {questions.length}</span>
                            <span className="text-cyan-400 flex items-center gap-1"><Zap className="w-3 h-3 fill-current"/> {score} XP</span>
                        </div>
                        <Progress value={progressPercent} className="h-2 bg-slate-800" indicatorClassName="bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-500" />
                    </div>

                    <div className="hidden md:flex items-center justify-center h-10 px-4 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold text-sm">
                        {difficulty}
                    </div>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-grow overflow-y-auto relative p-4 flex flex-col items-center">
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-[10%] left-[50%] -translate-x-1/2 w-[800px] h-[800px] bg-blue-600/5 rounded-full blur-[100px]" />
                </div>

                <div className="w-full max-w-3xl relative z-10 flex flex-col gap-8 justify-start md:justify-center min-h-[50vh] pt-12 md:pt-0 pb-32">
                    
                    <div className="text-center space-y-6">
                        <Badge variant="outline" className="border-indigo-500/30 bg-indigo-500/10 text-indigo-300 py-1.5 px-4 rounded-full text-xs tracking-widest shadow-[0_0_15px_-3px_rgba(99,102,241,0.4)]">
                            <Sparkles className="w-3 h-3 mr-2 inline-block"/> {topic.title}
                        </Badge>
                        <h2 className="text-xl md:text-3xl font-bold leading-relaxed text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-indigo-300 drop-shadow-2xl">
                            {currentQuestion?.text}
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                        {(currentQuestion?.type === 'Doğru/Yanlış' ? ["Doğru", "Yanlış"] : currentQuestion?.options || []).map((opt, idx) => {
                            const isSelected = answers[currentIndex] === (currentQuestion?.type === 'Doğru/Yanlış' ? opt === 'Doğru' : opt);
                            const isAnswered = answers[currentIndex] !== null && answers[currentIndex] !== undefined;
                            
                            let statusClass = "bg-slate-800/40 border-white/5 hover:border-indigo-500/30 hover:bg-slate-800/80 text-slate-300";
                            let iconStyle = "border-white/10 text-slate-500 bg-white/5";
                            let iconContent = <span className="text-sm font-bold">{String.fromCharCode(65 + idx)}</span>;

                            if (isAnswered) {
                                let isCorrect = false;
                                if(currentQuestion.type === 'Doğru/Yanlış') isCorrect = (opt === 'Doğru') === (currentQuestion.correctAnswer === 'Doğru');
                                else isCorrect = opt === currentQuestion.correctAnswer;

                                if (isCorrect) {
                                    statusClass = "bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_30px_-10px_rgba(16,185,129,0.3)] ring-1 ring-emerald-500/50";
                                    iconStyle = "bg-emerald-500 border-emerald-500 text-black";
                                    iconContent = <Check className="w-4 h-4" />;
                                } else if (isSelected && !isCorrect) {
                                    statusClass = "bg-rose-500/10 border-rose-500 text-rose-400 opacity-90";
                                    iconStyle = "bg-rose-500 border-rose-500 text-white";
                                    iconContent = <X className="w-4 h-4" />;
                                } else {
                                    statusClass = "opacity-40 grayscale bg-slate-900 border-transparent";
                                }
                            } else if (isSelected) {
                                statusClass = "bg-indigo-600/20 border-indigo-500 text-indigo-300";
                            }

                            return (
                                <button
                                    key={idx}
                                    disabled={isAnswered}
                                    onClick={() => handleAnswer(currentQuestion?.type === 'Doğru/Yanlış' ? opt === 'Doğru' : opt)}
                                    className={cn(
                                        "relative group flex items-center gap-4 p-4 md:p-5 w-full text-left rounded-2xl border-2 transition-all duration-300 active:scale-[0.98]",
                                        statusClass
                                    )}
                                >
                                    <div className={cn("w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors", iconStyle)}>
                                        {iconContent}
                                    </div>
                                    <span className="text-base md:text-lg font-medium leading-tight">{opt.toString()}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 p-4 bg-slate-900/80 backdrop-blur-xl border-t border-white/5 relative z-20 safe-area-bottom">
                <div className="max-w-3xl mx-auto flex justify-end">
                    <Button 
                        onClick={() => currentIndex < questions.length - 1 ? setCurrentIndex(prev => prev + 1) : setIsFinished(true)} 
                        disabled={answers[currentIndex] === null}
                        size="lg"
                        className={cn(
                            "rounded-xl px-8 font-bold text-lg h-14 shadow-lg transition-all w-full md:w-auto",
                            answers[currentIndex] !== null 
                                ? "bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-500/25 hover:scale-105" 
                                : "bg-slate-800 text-slate-500"
                        )}
                    >
                        {currentIndex === questions.length - 1 ? "Sonucu Gör" : "Sonraki Soru"}
                        <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

// =================================================================
// 2. ANA SAYFA BİLEŞENİ
// =================================================================
function QuestionBankCoursePageComponent() {
    const params = useParams();
    const { user } = useAuth();
    const courseId = params.courseId as string;

    const [course, setCourse] = useState<Course | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [topicProgress, setTopicProgress] = useState<QuestionBankProgress>({});
    const [testCounts, setTestCounts] = useState<{ [topicId: string]: { easy: number; medium: number; hard: number; } }>({});
    const [classRank, setClassRank] = useState<{rank: number; total: number} | null>(null);

    const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
    const [activeTest, setActiveTest] = useState<{ topic: Topic, difficulty: 'Kolay' | 'Orta' | 'Zor', testIndex: number } | null>(null);

    // --- VERİ ÇEKME ---
    useEffect(() => {
        if (!user?.uid || !courseId) return;
        const fetchInitialData = async () => {
            setIsLoading(true);
            try {
                const [courseResult, progressResult, rankResult] = await Promise.all([
                    getCourseForSoruBankasi(courseId),
                    getQuestionBankProgress(courseId, user.uid),
                    user.class ? getCourseLeaderboard(courseId, user.class, user.uid) : Promise.resolve(null)
                ]);
                if (courseResult.course) setCourse(courseResult.course);
                setTopicProgress(progressResult);
                if (rankResult) setClassRank({ rank: rankResult.rank, total: rankResult.total });
                
                const allTopics = courseResult.course?.units?.flatMap(u => u.topics || []) || [];
                const counts = await Promise.all(allTopics.map(t => getQuestionCounts(t.id)));
                
                const newCounts: any = {};
                allTopics.forEach((t, i) => {
                    if (counts[i] && (counts[i].easy > 0 || counts[i].medium > 0 || counts[i].hard > 0)) {
                         newCounts[t.id] = counts[i];
                    } else {
                         newCounts[t.id] = { easy: 50, medium: 50, hard: 50 };
                    }
                });
                
                setTestCounts(newCounts);
            } catch (e: any) { console.error(e); } finally { setIsLoading(false); }
        };
        fetchInitialData();
    }, [user, courseId]);

    // --- SIRALAMA ---
    const sortedUnits = useMemo(() => {
        if (!course?.units) return [];
        const getOrderValue = (item: any) => {
            if (typeof item.order === 'number' && item.order !== 0) return item.order;
            if (item.order && !isNaN(Number(item.order)) && Number(item.order) !== 0) return Number(item.order);
            const match = item.title?.match(/^(\d+)/); 
            if (match) return parseInt(match[1], 10);
            return 9999;
        };
        const unitsCopy = [...course.units];
        unitsCopy.sort((a, b) => getOrderValue(a) - getOrderValue(b));
        return unitsCopy.map(unit => {
            const topicsCopy = [...(unit.topics || [])];
            topicsCopy.sort((a, b) => getOrderValue(a) - getOrderValue(b));
            return { ...unit, topics: topicsCopy };
        });
    }, [course]);

    const allSortedTopics = useMemo(() => sortedUnits.flatMap(u => u.topics || []), [sortedUnits]);

    // --- KİLİT MANTIKLARI ---
    const isTopicCompleted = useCallback((topicId: string) => {
        const progress = topicProgress[topicId];
        const counts = testCounts[topicId];
        if (!counts) return false;
        const checkLevel = (key: 'easy' | 'medium' | 'hard') => {
            const total = Math.ceil((counts[key] || 0) / 10);
            if (total === 0) return true;
            return Object.values(progress?.[key] || {}).filter(res => res.status === 'passed').length >= total;
        }
        return checkLevel('easy') && checkLevel('medium') && checkLevel('hard');
    }, [topicProgress, testCounts]);

    const isTopicUnlocked = useCallback((topicId: string): boolean => {
        const idx = allSortedTopics.findIndex(t => t.id === topicId);
        if (idx <= 0) return true; 
        return isTopicCompleted(allSortedTopics[idx - 1].id);
    }, [isTopicCompleted, allSortedTopics]);

    // --- TEST TAMAMLAMA ---
    const handleTestComplete = async (
        difficulty: 'Kolay' | 'Orta' | 'Zor', 
        testIndex: number, 
        score: number, 
        passed: boolean, 
        correctCount: number, 
        totalQuestions: number,
        action: 'next' | 'close' = 'close'
    ) => {
        if (!user || !activeTest) return;
        
        let finalScore = score;

        // --- KONU BİTİRME ÖDÜLÜ MANTIĞI ---
        if (passed) {
            const counts = testCounts[activeTest.topic.id];
            const totalTestsNeeded = 
                Math.ceil((counts?.easy || 0) / 10) + 
                Math.ceil((counts?.medium || 0) / 10) + 
                Math.ceil((counts?.hard || 0) / 10);

            let passedCountSoFar = 0;
            const currentProgress = topicProgress[activeTest.topic.id];
            if (currentProgress) {
                ['easy', 'medium', 'hard'].forEach(d => {
                    const diffKey = d as 'easy' | 'medium' | 'hard';
                    passedCountSoFar += Object.values(currentProgress[diffKey] || {}).filter(r => r.status === 'passed').length;
                });
            }

            // Bu test daha önce geçilmemişse ve bu son test ise
            const wasAlreadyPassed = currentProgress?.[difficultyMap[difficulty]]?.[testIndex]?.status === 'passed';
            if (!wasAlreadyPassed && (passedCountSoFar + 1) >= totalTestsNeeded) {
                finalScore += TOPIC_REWARD;
                playSound('level-up'); // Ödül sesi
            }
        }

        const result: TestResult = { status: passed ? 'passed' : 'failed', correct: correctCount, total: totalQuestions, score: finalScore };
        
        setTopicProgress(prev => ({ 
            ...prev, 
            [activeTest.topic.id]: { 
                ...(prev[activeTest.topic.id] || {}), 
                [difficultyMap[difficulty]]: { 
                    ...(prev[activeTest.topic.id]?.[difficultyMap[difficulty]] || {}), 
                    [testIndex]: result 
                } 
            } 
        }));
        
        await updateTopicTestProgress(user.uid, courseId, activeTest.topic.id, difficultyMap[difficulty], testIndex, result);

        if (action === 'next' && passed) {
            setActiveTest({
                topic: activeTest.topic,
                difficulty: difficulty,
                testIndex: testIndex + 1
            });
        } else {
            setActiveTest(null);
        }
    };

    if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-950 text-white"><Loader2 className="h-12 w-12 animate-spin text-cyan-500" /></div>;

    if (activeTest) {
        return (
            <QuestionTestOverlay
                key={`${activeTest.topic.id}-${activeTest.difficulty}-${activeTest.testIndex}`}
                topic={activeTest.topic} 
                difficulty={activeTest.difficulty} 
                testIndex={activeTest.testIndex} 
                onComplete={handleTestComplete} 
                onBack={() => setActiveTest(null)} 
            />
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 relative font-sans overflow-x-hidden">
            <MissionBackground />
            
            <div className="relative z-10 max-w-6xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Button variant="ghost" asChild className="hover:bg-white/10 text-slate-300">
                        <Link href="/student/soru-bankasi"><ChevronLeft className="mr-2 h-5 w-5"/> Derslere Dön</Link>
                    </Button>
                    <div className="flex-1">
                        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-tight">
                             {course?.title || "Ders Yükleniyor"}
                        </h2>
                        {classRank && (
                             <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="border-yellow-500/30 text-yellow-400 bg-yellow-500/10 text-[10px] tracking-widest uppercase">
                                    <Trophy className="w-3 h-3 mr-1" /> Sınıf Sıralaması: #{classRank.rank}
                                </Badge>
                             </div>
                        )}
                    </div>
                </div>

                {/* --- UNITS & TOPICS GRID --- */}
                <div className="space-y-16 pb-40">
                    {sortedUnits.map((unit) => (
                        <div key={unit.id} className="relative">
                            <div className="flex items-center gap-3 mb-8 pl-2">
                                <div className="h-8 w-1.5 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"/>
                                <h3 className="text-2xl font-black text-white uppercase tracking-wider">{unit.title}</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {unit.topics.map((topic) => {
                                    const unlocked = isTopicUnlocked(topic.id);
                                    const completed = isTopicCompleted(topic.id);
                                    const counts = testCounts[topic.id];
                                    const totalQuestions = counts ? (counts.easy + counts.medium + counts.hard) : 150; 
                                    const unitTopicIndex = unit.topics.indexOf(topic) + 1;

                                    return (
                                        <button 
                                            key={topic.id}
                                            onClick={() => unlocked && setSelectedTopic(topic)}
                                            disabled={!unlocked}
                                            className={cn(
                                                "group relative text-left h-full transition-all duration-300",
                                                unlocked ? "opacity-100 hover:-translate-y-2" : "opacity-60 cursor-not-allowed grayscale"
                                            )}
                                        >
                                            {!unlocked && (
                                                <div className="absolute inset-0 z-20 bg-slate-950/50 backdrop-blur-[1px] rounded-[1.8rem] flex items-center justify-center border-2 border-slate-800">
                                                    <div className="bg-slate-900/90 p-3 rounded-full border border-slate-700 shadow-xl">
                                                        <Lock className="w-6 h-6 text-slate-500" />
                                                    </div>
                                                </div>
                                            )}
                                            {unlocked && <div className="absolute -inset-0.5 bg-gradient-to-br from-indigo-500/40 to-purple-600/40 rounded-[2rem] opacity-0 group-hover:opacity-100 blur transition duration-500" />}

                                            <Card className={cn(
                                                "relative h-full border-slate-800 transition-all duration-300 rounded-[1.8rem] overflow-hidden flex flex-col",
                                                unlocked ? "bg-[#0f172a]/90 backdrop-blur-sm hover:border-indigo-500/50" : "bg-slate-900"
                                            )}>
                                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                    <BookOpen className="w-24 h-24 text-white -rotate-12" />
                                                </div>

                                                <CardContent className="p-6 flex flex-col h-full relative z-10">
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className={cn(
                                                            "h-8 px-3 rounded-lg flex items-center justify-center font-bold text-xs transition-colors border",
                                                            completed 
                                                                ? "bg-green-500/20 text-green-400 border-green-500/30" 
                                                                : "bg-slate-800 text-slate-400 border-slate-700"
                                                        )}>
                                                                {completed ? <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> TAMAMLANDI</span> : `KONU ${unitTopicIndex}`}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 px-2 py-1 rounded text-[10px] font-bold text-yellow-400">
                                                             <Star className="w-3 h-3 fill-current" />
                                                             <span>{TOPIC_REWARD.toLocaleString()} XP</span>
                                                        </div>
                                                    </div>

                                                    <h4 className={cn("font-black text-xl mb-3 line-clamp-2 leading-tight transition-colors", unlocked ? "text-white group-hover:text-indigo-300" : "text-slate-500")}>
                                                        {topic.title}
                                                    </h4>
                                                    
                                                    <p className="text-xs text-slate-500 font-medium mb-4">
                                                        Toplam {totalQuestions} Soru
                                                    </p>

                                                    <div className="mt-auto pt-4">
                                                        <div className={cn(
                                                            "w-full h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all",
                                                            unlocked 
                                                                ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg group-hover:shadow-indigo-500/25" 
                                                                : "bg-slate-800 text-slate-600"
                                                        )}>
                                                                {unlocked ? (
                                                                    <span className="flex items-center gap-2">
                                                                        {completed ? "Tekrar Çöz" : "Teste Başla"} <PlayCircle className="w-3.5 h-3.5" />
                                                                    </span>
                                                                ) : (
                                                                    <span className="flex items-center gap-2">
                                                                        <Lock className="w-3.5 h-3.5" /> Kilitli
                                                                    </span>
                                                                )}
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* --- DETAY MODALI --- */}
            <Dialog open={!!selectedTopic} onOpenChange={(open) => !open && setSelectedTopic(null)}>
                <DialogContent className="bg-[#020617]/95 backdrop-blur-xl border-slate-800 text-white max-w-4xl max-h-[85dvh] w-[95vw] overflow-hidden flex flex-col p-0 shadow-2xl rounded-3xl">
                    <DialogHeader className="p-6 pb-4 border-b border-white/5 bg-gradient-to-r from-indigo-900/20 to-purple-900/20 relative overflow-hidden shrink-0">
                         <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
                         <DialogTitle className="text-2xl font-black flex items-center gap-3 text-white relative z-10">
                            <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
                                <BookOpen className="h-6 w-6 text-indigo-400"/>
                            </div>
                            {selectedTopic?.title}
                         </DialogTitle>
                         <p className="relative z-10 text-slate-400 text-sm mt-1">Seviyeleri sırasıyla tamamla.</p>
                    </DialogHeader>
                    
                    <div className="flex-1 overflow-y-auto w-full p-6 pb-40">
                        {selectedTopic && (
                            <div className="grid grid-cols-1 gap-6">
                                {(['Kolay', 'Orta', 'Zor'] as const).map(level => {
                                    const levelKey = difficultyMap[level];
                                    const counts = testCounts[selectedTopic.id]?.[levelKey] || 0;
                                    const safeCounts = counts > 0 ? counts : 50;
                                    const numTests = Math.ceil(safeCounts / 10);
                                    
                                    const isLevelUnlocked = () => {
                                        if (level === 'Kolay') return true;
                                        const prevDiff = level === 'Orta' ? 'easy' : 'medium';
                                        
                                        const prevCounts = testCounts[selectedTopic.id]?.[prevDiff] || 0;
                                        const safePrevCounts = prevCounts > 0 ? prevCounts : 50;
                                        const totalPrev = Math.ceil(safePrevCounts / 10);
                                        
                                        const passedPrev = Object.values(topicProgress[selectedTopic.id]?.[prevDiff] || {}).filter(r => r.status === 'passed').length;
                                        return passedPrev >= totalPrev;
                                    }
                                    const levelLocked = !isLevelUnlocked();

                                    return (
                                        <div key={level} className={cn(
                                            "rounded-[2rem] border p-6 transition-all duration-500 relative overflow-hidden",
                                            levelLocked ? "bg-slate-900/30 border-white/5 grayscale opacity-60" : "bg-slate-900/60 border-white/10"
                                        )}>
                                            <div className="flex items-center gap-4 mb-6 relative z-10">
                                                <div className={cn("p-3 rounded-xl shadow-lg", 
                                                    level === 'Kolay' ? "bg-emerald-500/20 text-emerald-400" : 
                                                    level === 'Orta' ? "bg-amber-500/20 text-amber-400" : 
                                                    "bg-red-500/20 text-red-400"
                                                )}>
                                                    {level === 'Kolay' ? <ShieldCheck className="w-6 h-6"/> : level === 'Orta' ? <Shield className="w-6 h-6"/> : <ShieldAlert className="w-6 h-6"/>}
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-black text-white">{level} Seviye</h3>
                                                    <p className="text-xs text-slate-400 font-medium">{levelLocked ? "Önceki seviyeyi tamamla" : `${numTests} Test Mevcut`}</p>
                                                </div>
                                                {levelLocked && <Lock className="ml-auto w-6 h-6 text-slate-600" />}
                                            </div>
                                            
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 relative z-10">
                                                {Array.from({ length: numTests }).map((_, i) => {
                                                    const res = topicProgress[selectedTopic.id]?.[levelKey]?.[i];
                                                    const tLocked = levelLocked || (i > 0 && topicProgress[selectedTopic.id]?.[levelKey]?.[i-1]?.status !== 'passed');
                                                    
                                                    return (
                                                        <Button 
                                                            key={i} 
                                                            disabled={tLocked} 
                                                            onClick={() => {
                                                                setActiveTest({ topic: selectedTopic, difficulty: level, testIndex: i });
                                                            }}
                                                            className={cn(
                                                                "h-14 rounded-xl border-2 font-bold relative overflow-hidden transition-all",
                                                                res?.status === 'passed' 
                                                                    ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20" 
                                                                    : tLocked 
                                                                        ? "bg-slate-950 border-white/5 text-slate-700" 
                                                                        : "bg-slate-800 border-white/10 text-white hover:border-cyan-500 hover:bg-slate-700"
                                                            )}
                                                        >
                                                                {tLocked ? <Lock className="w-4 h-4" /> : res?.status === 'passed' ? <span className="flex items-center gap-1"><CheckCheck className="w-4 h-4"/> #{i+1}</span> : `Test ${i+1}`}
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-cyan-500" /></div>}>
            <QuestionBankCoursePageComponent />
        </Suspense>
    );
}