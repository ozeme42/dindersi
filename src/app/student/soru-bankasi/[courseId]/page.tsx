'use client';

import { Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

import { getQuestionsFromBank } from '@/lib/quiz-actions';
import { 
  getCourseForSoruBankasi, 
  getQuestionBankProgress, 
  getQuestionCounts, 
  updateTopicTestProgress, 
  getCourseLeaderboard 
} from '@/app/student/soru-bankasi/actions';
import { addQuestionToReviewList } from '@/app/student/tekrar-et/actions';

import type { Course, Topic, Question, QuestionBankProgress, TestResult } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { playSound } from '@/lib/audio-service';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
    Loader2, CheckCircle2, Lock, PlayCircle, Trophy, 
    ShieldCheck, Shield, ShieldAlert, CheckCheck,
    BookOpen, ChevronLeft, Star, Bug, X, Zap, Target, 
    ArrowRight, Check, Sparkles, Flame, XCircle
} from 'lucide-react';

const difficultyMap = { 'Kolay': 'easy', 'Orta': 'medium', 'Zor': 'hard' } as const;
const TOPIC_REWARD = 10000;
const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'];

// =================================================================
// 1. TEST ÇÖZME EKRANI (OVERLAY) — Premium Mobil Tasarım
// =================================================================
function QuestionTestOverlay({ topic, difficulty, testIndex, onComplete, onBack }: any) {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();
    
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<(string | boolean | null)[]>([]);
    const [isFinished, setIsFinished] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    const [score, setScore] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [streak, setStreak] = useState(0);
    const [maxStreak, setMaxStreak] = useState(0);

    const PASS_THRESHOLD = 0.7;
    const QUESTION_POINT = 50;

    useEffect(() => {
        let isMounted = true;
        async function fetchQuestions() {
            setIsLoading(true);
            try {
                const result = await getQuestionsFromBank({ 
                    topicId: topic.id, difficulty: [], questionCount: 500, isStatic: true 
                });
                if (!isMounted) return;
                if (result.error || !result.questions) {
                    setError(result.error || "Sorular yüklenemedi.");
                } else {
                    const allRawQuestions = result.questions as Question[];
                    const targetDifficultyEng = difficultyMap[difficulty as keyof typeof difficultyMap];
                    const filteredQuestions = allRawQuestions.filter(q => {
                        const qDiff = q.difficulty ? q.difficulty.toLowerCase().trim() : '';
                        return qDiff === difficulty.toLowerCase() || qDiff === targetDifficultyEng.toLowerCase();
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
            const newStreak = streak + 1;
            setStreak(newStreak);
            setMaxStreak(m => Math.max(m, newStreak));
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

    // LOADING
    if (isLoading) return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-[#09071a]">
            <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-indigo-400" />
            </div>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Sorular Yükleniyor...</p>
        </div>
    );
    
    // ERROR
    if (error) return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-[#09071a] text-center gap-4">
            <div className="p-5 bg-rose-500/10 rounded-3xl border border-rose-500/20">
                <Bug className="w-10 h-10 text-rose-400" />
            </div>
            <p className="text-white font-bold">{error}</p>
            <Button onClick={onBack} className="mt-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-2xl px-8">
                Geri Dön
            </Button>
        </div>
    );

    const currentQuestion = questions[currentIndex];
    const isAnswered = answers[currentIndex] !== null && answers[currentIndex] !== undefined;
    const progress = ((currentIndex + (isAnswered ? 1 : 0)) / questions.length) * 100;

    // RESULTS SCREEN
    if (isFinished) {
        const hasPassed = (correctCount / questions.length) >= PASS_THRESHOLD;
        const successRate = Math.round((correctCount / questions.length) * 100);
        const grade = successRate >= 90 ? { label: 'Mükemmel!', emoji: '🏆', color: 'from-yellow-400 to-amber-500', glow: 'shadow-[0_0_60px_rgba(251,191,36,0.25)]' }
            : successRate >= 70 ? { label: 'Geçtin!', emoji: '⭐', color: 'from-emerald-400 to-teal-500', glow: 'shadow-[0_0_60px_rgba(16,185,129,0.25)]' }
            : { label: 'Tekrar Dene', emoji: '💪', color: 'from-rose-400 to-pink-500', glow: 'shadow-[0_0_40px_rgba(244,63,94,0.2)]' };

        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#09071a] overflow-y-auto">
                <div className="absolute inset-0 pointer-events-none">
                    <div className={cn("absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full blur-3xl opacity-20 bg-gradient-to-r", grade.color)} />
                </div>

                <div className="relative w-full max-w-sm flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500 py-6">
                    {/* Score card */}
                    <div className={cn("w-full rounded-[2rem] p-7 text-center bg-[#161233] border border-white/10 relative overflow-hidden", grade.glow)}>
                        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r" style={{ backgroundImage: `linear-gradient(to right, transparent, ${hasPassed ? '#10b981' : '#f43f5e'}, transparent)` }} />
                        <div className="text-5xl mb-3">{grade.emoji}</div>
                        <h2 className={cn("text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r mb-1", grade.color)}>{grade.label}</h2>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-5">{topic.title} · {difficulty}</p>
                        <div className="flex items-end justify-center gap-1 mb-1">
                            <span className={cn("text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r", grade.color)}>{successRate}</span>
                            <span className="text-2xl font-black text-slate-500 mb-2">%</span>
                        </div>
                        <p className="text-slate-500 text-sm">{correctCount} doğru · {questions.length - correctCount} yanlış</p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2.5">
                        <div className="bg-[#161233] border border-white/8 rounded-2xl p-3.5 text-center">
                            <Zap className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                            <p className="text-lg font-black text-white">+{score}</p>
                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Puan</p>
                        </div>
                        <div className="bg-[#161233] border border-white/8 rounded-2xl p-3.5 text-center">
                            <Flame className="w-4 h-4 text-orange-400 mx-auto mb-1" />
                            <p className="text-lg font-black text-white">{maxStreak}</p>
                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Seri</p>
                        </div>
                        <div className="bg-[#161233] border border-white/8 rounded-2xl p-3.5 text-center">
                            <Trophy className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                            <p className="text-lg font-black text-white">{hasPassed ? '✓' : '✗'}</p>
                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{hasPassed ? 'Geçti' : 'Kaldı'}</p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2.5 mt-1">
                        {hasPassed && (
                            <button
                                onClick={() => handleFinish('next')}
                                disabled={isSaving}
                                className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black rounded-2xl shadow-[0_8px_25px_rgba(99,102,241,0.35)] transition-all active:scale-95 disabled:opacity-50 text-sm uppercase tracking-wider"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                                {isSaving ? 'Kaydediliyor...' : 'Sonraki Test'}
                            </button>
                        )}
                        <button
                            onClick={() => handleFinish('close')}
                            disabled={isSaving}
                            className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#1a1638] border border-white/8 hover:bg-[#201b45] text-slate-300 font-bold rounded-2xl transition-all active:scale-95 disabled:opacity-50 text-sm"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                            {hasPassed ? 'Listeye Dön' : 'Sonucu Kaydet & Çık'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // QUIZ SCREEN
    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-[#09071a] text-white overflow-hidden">
            {/* BG glow */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[250px] bg-indigo-600/10 rounded-full blur-3xl" />
            </div>

            {/* TOP BAR */}
            <div className="relative z-10 flex-shrink-0 px-4 pt-5 pb-3">
                <div className="flex items-center justify-between mb-3">
                    <button onClick={onBack} className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors group p-1">
                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                        <span className="text-sm font-bold">Çık</span>
                    </button>

                    <div className="flex items-center gap-2">
                        {streak >= 3 && (
                            <div className="flex items-center gap-1 bg-orange-500/10 border border-orange-500/20 rounded-full px-2.5 py-1">
                                <Flame className="w-3 h-3 text-orange-400" />
                                <span className="text-xs font-black text-orange-400">{streak}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
                            <Zap className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-sm font-black text-white">{score}</span>
                        </div>
                        <div className={cn("px-3 py-1.5 rounded-full border text-xs font-bold",
                            difficulty === 'Kolay' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                            difficulty === 'Orta' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                            'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        )}>
                            {difficulty}
                        </div>
                    </div>
                </div>

                {/* Progress */}
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="text-xs font-bold text-slate-500 flex-shrink-0 tabular-nums">
                        {currentIndex + 1}/{questions.length}
                    </span>
                </div>
            </div>

            {/* QUESTION AREA */}
            <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-6 pt-3 flex flex-col gap-4">
                {/* Question number */}
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-black text-indigo-400">{currentIndex + 1}</span>
                    </div>
                    <div className="h-px flex-1 bg-white/5" />
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{topic.title}</span>
                </div>

                {/* Question text */}
                <div className="bg-[#161233]/80 border border-white/8 rounded-3xl p-5 backdrop-blur-sm shadow-xl">
                    <p className="text-base md:text-xl font-bold text-white leading-relaxed">
                        {currentQuestion?.text}
                    </p>
                </div>

                {/* Options */}
                <div className="flex flex-col gap-2.5">
                    {(currentQuestion?.type === 'Doğru/Yanlış'
                        ? ["Doğru", "Yanlış"]
                        : currentQuestion?.options || []
                    ).map((opt, idx) => {
                        const answerVal = currentQuestion?.type === 'Doğru/Yanlış' ? opt === 'Doğru' : opt;
                        const isSelected = answers[currentIndex] === answerVal;
                        let isCorrect = false;
                        if (currentQuestion?.type === 'Doğru/Yanlış') {
                            isCorrect = (opt === 'Doğru') === (currentQuestion.correctAnswer === 'Doğru');
                        } else {
                            isCorrect = opt === currentQuestion?.correctAnswer;
                        }

                        let style = 'border-white/8 bg-[#161233]/60 text-slate-200 hover:bg-[#1e1a45] hover:border-indigo-500/30 active:scale-[0.98] cursor-pointer';
                        let letterStyle = 'bg-white/5 border-white/10 text-slate-400';
                        let icon = null;

                        if (isAnswered) {
                            if (isCorrect) {
                                style = 'border-emerald-500/50 bg-emerald-950/50 text-white shadow-[0_0_20px_rgba(16,185,129,0.15)] cursor-default';
                                letterStyle = 'bg-emerald-500 border-emerald-400 text-white';
                                icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />;
                            } else if (isSelected) {
                                style = 'border-rose-500/50 bg-rose-950/50 text-white shadow-[0_0_20px_rgba(244,63,94,0.1)] cursor-default';
                                letterStyle = 'bg-rose-500 border-rose-400 text-white';
                                icon = <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />;
                            } else {
                                style = 'border-white/4 bg-white/3 text-slate-600 cursor-default';
                                letterStyle = 'bg-white/3 border-white/5 text-slate-700';
                            }
                        }

                        return (
                            <button
                                key={idx}
                                disabled={isAnswered}
                                onClick={() => handleAnswer(answerVal)}
                                className={cn(
                                    'w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border-2 text-left transition-all duration-250 font-semibold',
                                    style
                                )}
                            >
                                <span className={cn('flex-shrink-0 w-8 h-8 rounded-xl border-2 flex items-center justify-center text-xs font-black transition-all', letterStyle)}>
                                    {currentQuestion?.type === 'Doğru/Yanlış' ? (opt === 'Doğru' ? '✓' : '✗') : OPTION_LETTERS[idx]}
                                </span>
                                <span className="flex-1 text-sm md:text-base leading-snug">{opt.toString()}</span>
                                {icon}
                            </button>
                        );
                    })}
                </div>

                {/* Next button */}
                <div className="mt-auto pt-2">
                    <button
                        onClick={() => currentIndex < questions.length - 1 ? setCurrentIndex(prev => prev + 1) : setIsFinished(true)}
                        disabled={!isAnswered}
                        className={cn(
                            'w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all duration-300',
                            isAnswered
                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-[0_8px_25px_rgba(99,102,241,0.35)] active:scale-[0.98]'
                                : 'bg-white/4 border border-white/5 text-slate-600 cursor-not-allowed'
                        )}
                    >
                        {currentIndex === questions.length - 1
                            ? <><Trophy className="w-4 h-4" /> Sonucu Gör</>
                            : <>Sonraki Soru <ArrowRight className="w-4 h-4" /></>
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}

// =================================================================
// 2. KONU LİSTESİ — Premium Mobil Tasarım
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
                    newCounts[t.id] = (counts[i] && (counts[i].easy > 0 || counts[i].medium > 0 || counts[i].hard > 0))
                        ? counts[i]
                        : { easy: 50, medium: 50, hard: 50 };
                });
                setTestCounts(newCounts);
            } catch (e: any) { console.error(e); } finally { setIsLoading(false); }
        };
        fetchInitialData();
    }, [user, courseId]);

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

    const isTopicCompleted = useCallback((topicId: string) => {
        const progress = topicProgress[topicId];
        const counts = testCounts[topicId];
        if (!counts) return false;
        const checkLevel = (key: 'easy' | 'medium' | 'hard') => {
            const total = Math.ceil((counts[key] || 0) / 10);
            if (total === 0) return true;
            return Object.values(progress?.[key] || {}).filter(res => res.status === 'passed').length >= total;
        };
        return checkLevel('easy') && checkLevel('medium') && checkLevel('hard');
    }, [topicProgress, testCounts]);

    const isTopicUnlocked = useCallback((topicId: string): boolean => {
        const idx = allSortedTopics.findIndex(t => t.id === topicId);
        if (idx <= 0) return true;
        return isTopicCompleted(allSortedTopics[idx - 1].id);
    }, [isTopicCompleted, allSortedTopics]);

    const handleTestComplete = async (
        difficulty: 'Kolay' | 'Orta' | 'Zor', testIndex: number, score: number,
        passed: boolean, correctCount: number, totalQuestions: number, action: 'next' | 'close' = 'close'
    ) => {
        if (!user || !activeTest) return;
        let finalScore = score;
        if (passed) {
            const counts = testCounts[activeTest.topic.id];
            const totalTestsNeeded = Math.ceil((counts?.easy || 0) / 10) + Math.ceil((counts?.medium || 0) / 10) + Math.ceil((counts?.hard || 0) / 10);
            let passedCountSoFar = 0;
            const currentProgress = topicProgress[activeTest.topic.id];
            if (currentProgress) {
                ['easy', 'medium', 'hard'].forEach(d => {
                    const diffKey = d as 'easy' | 'medium' | 'hard';
                    passedCountSoFar += Object.values(currentProgress[diffKey] || {}).filter(r => r.status === 'passed').length;
                });
            }
            const wasAlreadyPassed = currentProgress?.[difficultyMap[difficulty]]?.[testIndex]?.status === 'passed';
            if (!wasAlreadyPassed && (passedCountSoFar + 1) >= totalTestsNeeded) {
                finalScore += TOPIC_REWARD;
                playSound('level-up'); 
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
            setActiveTest({ topic: activeTest.topic, difficulty, testIndex: testIndex + 1 });
        } else {
            setActiveTest(null);
        }
    };

    if (isLoading) return (
        <div className="flex h-screen items-center justify-center bg-[#09071a]">
            <div className="relative">
                <div className="w-14 h-14 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                <BookOpen className="absolute inset-0 m-auto w-5 h-5 text-indigo-400" />
            </div>
        </div>
    );

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
        <div className="min-h-screen bg-[#09071a] text-slate-100 relative font-sans overflow-x-hidden">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-15%] left-[10%] w-[500px] h-[500px] bg-indigo-600/8 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-purple-600/8 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10">
                {/* HEADER */}
                <div className="sticky top-0 z-30 bg-[#09071a]/90 backdrop-blur-xl border-b border-white/5 px-4 pt-5 pb-4">
                    <div className="flex items-center gap-3 max-w-2xl mx-auto">
                        <Link href="/student/soru-bankasi" className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors group flex-shrink-0">
                            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                        </Link>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-lg font-black text-white truncate">
                                {course?.title || 'Yükleniyor...'}
                            </h1>
                            {classRank && (
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <Trophy className="w-3 h-3 text-amber-400" />
                                    <span className="text-xs font-bold text-amber-400">Sınıf Sıralaması: #{classRank.rank}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full px-3 py-1.5 flex-shrink-0">
                            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                            <span className="text-xs font-black text-yellow-400">{TOPIC_REWARD.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* CONTENT */}
                <div className="px-4 pb-32 pt-6 max-w-2xl mx-auto space-y-10">
                    {sortedUnits.map((unit) => (
                        <div key={unit.id}>
                            {/* Unit header */}
                            <div className="flex items-center gap-3 mb-4 px-1">
                                <div className="h-5 w-1 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full flex-shrink-0" />
                                <h2 className="text-sm font-black text-white uppercase tracking-widest">{unit.title}</h2>
                            </div>

                            {/* Topics */}
                            <div className="flex flex-col gap-3">
                                {unit.topics.map((topic, topicIdx) => {
                                    const unlocked = isTopicUnlocked(topic.id);
                                    const completed = isTopicCompleted(topic.id);
                                    const counts = testCounts[topic.id];
                                    const totalQ = counts ? (counts.easy + counts.medium + counts.hard) : 150;

                                    // Calculate overall progress
                                    const totalTests = counts
                                        ? Math.ceil(counts.easy / 10) + Math.ceil(counts.medium / 10) + Math.ceil(counts.hard / 10)
                                        : 15;
                                    let passedTests = 0;
                                    const prog = topicProgress[topic.id];
                                    if (prog) {
                                        ['easy', 'medium', 'hard'].forEach(d => {
                                            passedTests += Object.values(prog[d as 'easy'|'medium'|'hard'] || {}).filter(r => r.status === 'passed').length;
                                        });
                                    }
                                    const progressPct = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

                                    return (
                                        <button
                                            key={topic.id}
                                            onClick={() => unlocked && setSelectedTopic(topic)}
                                            disabled={!unlocked}
                                            className={cn(
                                                "w-full text-left rounded-3xl border-2 p-4 transition-all duration-300 relative overflow-hidden",
                                                completed
                                                    ? "border-emerald-500/30 bg-emerald-950/20 active:scale-[0.99]"
                                                    : unlocked
                                                    ? "border-white/8 bg-[#161233]/60 hover:border-indigo-500/30 hover:bg-[#1e1a45]/60 active:scale-[0.99]"
                                                    : "border-white/4 bg-[#161233]/30 opacity-50 cursor-not-allowed grayscale"
                                            )}
                                        >
                                            {/* Shimmer on completed */}
                                            {completed && (
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/5 to-transparent pointer-events-none" />
                                            )}

                                            <div className="flex items-center gap-3.5">
                                                {/* Icon */}
                                                <div className={cn(
                                                    "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 border",
                                                    completed ? "bg-emerald-500/15 border-emerald-500/30" :
                                                    unlocked ? "bg-indigo-500/10 border-indigo-500/20" :
                                                    "bg-white/3 border-white/8"
                                                )}>
                                                    {completed ? (
                                                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                                                    ) : unlocked ? (
                                                        <BookOpen className="w-6 h-6 text-indigo-400" />
                                                    ) : (
                                                        <Lock className="w-5 h-5 text-slate-600" />
                                                    )}
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <p className={cn("text-base font-black truncate",
                                                            completed ? "text-emerald-300" :
                                                            unlocked ? "text-white" : "text-slate-600"
                                                        )}>
                                                            {topic.title}
                                                        </p>
                                                    </div>
                                                    <p className="text-xs text-slate-600 font-medium">
                                                        {totalQ} soru · {passedTests}/{totalTests} test
                                                    </p>
                                                    {/* Mini progress bar */}
                                                    {unlocked && totalTests > 0 && (
                                                        <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
                                                            <div
                                                                className={cn("h-full rounded-full transition-all duration-500",
                                                                    completed ? "bg-emerald-500" : "bg-gradient-to-r from-indigo-500 to-purple-500"
                                                                )}
                                                                style={{ width: `${progressPct}%` }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Right arrow / lock */}
                                                <div className="flex-shrink-0">
                                                    {unlocked ? (
                                                        <div className={cn(
                                                            "w-9 h-9 rounded-2xl flex items-center justify-center",
                                                            completed ? "bg-emerald-500/15 text-emerald-400" : "bg-indigo-500/10 text-indigo-400"
                                                        )}>
                                                            <ArrowRight className="w-4 h-4" />
                                                        </div>
                                                    ) : (
                                                        <Lock className="w-4 h-4 text-slate-700" />
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* TOPIC DETAIL DIALOG */}
            <Dialog open={!!selectedTopic} onOpenChange={(open) => !open && setSelectedTopic(null)}>
                <DialogContent className="bg-[#09071a]/98 backdrop-blur-xl border border-white/8 text-white max-w-lg max-h-[85dvh] w-[95vw] overflow-hidden flex flex-col p-0 shadow-2xl rounded-3xl">
                    <DialogHeader className="px-5 pt-5 pb-4 border-b border-white/5 relative overflow-hidden shrink-0">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/10 to-purple-900/10 pointer-events-none" />
                        <DialogTitle className="text-lg font-black text-white relative z-10 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                                <BookOpen className="h-4 w-4 text-indigo-400" />
                            </div>
                            <span className="truncate">{selectedTopic?.title}</span>
                        </DialogTitle>
                        <p className="relative z-10 text-slate-500 text-xs mt-1 pl-12">Seviyeleri sırasıyla tamamla</p>
                    </DialogHeader>
                    
                    <div className="flex-1 overflow-y-auto w-full p-4 space-y-3 pb-6">
                        {selectedTopic && (['Kolay', 'Orta', 'Zor'] as const).map(level => {
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
                            };
                            const levelLocked = !isLevelUnlocked();

                            const levelConfig = {
                                'Kolay': { icon: <ShieldCheck className="w-5 h-5" />, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', pillColor: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
                                'Orta':  { icon: <Shield className="w-5 h-5" />, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', pillColor: 'bg-amber-500/10 border-amber-500/20 text-amber-400' },
                                'Zor':   { icon: <ShieldAlert className="w-5 h-5" />, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', pillColor: 'bg-rose-500/10 border-rose-500/20 text-rose-400' },
                            }[level];

                            return (
                                <div key={level} className={cn(
                                    "rounded-2xl border p-4 transition-all duration-300",
                                    levelLocked ? "bg-white/2 border-white/4 opacity-50" : "bg-[#161233]/60 border-white/8"
                                )}>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", levelConfig.bg, levelConfig.color)}>
                                            {levelLocked ? <Lock className="w-4 h-4" /> : levelConfig.icon}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-black text-sm text-white">{level} Seviye</p>
                                            <p className="text-[11px] text-slate-500">{levelLocked ? 'Önceki seviyeyi tamamla' : `${numTests} test mevcut`}</p>
                                        </div>
                                        {!levelLocked && (
                                            <div className={cn("px-2.5 py-1 rounded-full border text-[10px] font-bold", levelConfig.pillColor)}>
                                                {level}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                                        {Array.from({ length: numTests }).map((_, i) => {
                                            const res = topicProgress[selectedTopic.id]?.[levelKey]?.[i];
                                            const tLocked = levelLocked || (i > 0 && topicProgress[selectedTopic.id]?.[levelKey]?.[i-1]?.status !== 'passed');
                                            
                                            return (
                                                <button
                                                    key={i}
                                                    disabled={tLocked}
                                                    onClick={() => { setActiveTest({ topic: selectedTopic, difficulty: level, testIndex: i }); setSelectedTopic(null); }}
                                                    className={cn(
                                                        "h-12 rounded-xl border-2 font-bold text-sm transition-all active:scale-95",
                                                        res?.status === 'passed'
                                                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                                            : tLocked
                                                            ? "bg-white/2 border-white/5 text-slate-700 cursor-not-allowed"
                                                            : "bg-[#1a1638] border-white/10 text-white hover:border-indigo-500/50 hover:bg-indigo-500/10"
                                                    )}
                                                >
                                                    {tLocked ? <Lock className="w-3.5 h-3.5 mx-auto text-slate-700" /> :
                                                     res?.status === 'passed' ? <CheckCheck className="w-4 h-4 mx-auto" /> :
                                                     i + 1}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center bg-[#09071a]">
                <Loader2 className="animate-spin text-indigo-500 w-8 h-8" />
            </div>
        }>
            <QuestionBankCoursePageComponent />
        </Suspense>
    );
}