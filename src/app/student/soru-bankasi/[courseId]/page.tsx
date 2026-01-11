'use client';

import { Suspense, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getQuestionsFromBank } from '@/lib/quiz-actions';
import { submitSoruBankasiScore, getCourseForSoruBankasi, getQuestionBankProgress, getQuestionCounts, updateTopicTestProgress, getCourseLeaderboard } from '@/app/student/soru-bankasi/actions';
import type { Course, Topic, Question, QuestionBankProgress, TestResult } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Loader2, ArrowLeft, ArrowRight, CheckCircle2, Lock, PlayCircle, Star, ShieldCheck, Shield, ShieldAlert, Repeat, Trophy, Bug, GraduationCap, Gift, Sparkles, CheckCheck, XCircle, Activity, Menu, Map as MapIcon } from 'lucide-react';
import { addQuestionToReviewList } from '@/app/student/tekrar-et/actions';
import { playSound } from '@/lib/audio-service';
import { CourseSidebar } from '@/components/course-sidebar';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { Badge } from '@/components/ui/badge';

const difficultyMap = { 'Kolay': 'easy', 'Orta': 'medium', 'Zor': 'hard' } as const;
const TOPIC_REWARD = 30000; 

const MissionBackground = () => (
    <div className="fixed inset-0 pointer-events-none z-0 bg-[#020617] overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" style={{ opacity: 0.05 }}/>
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[120px] animate-pulse-slow delay-1000" />
        <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[100px] mix-blend-screen" />
    </div>
);

// --- SORU ÇÖZME EKRANI ---
function QuestionTest({ topic, difficulty, testIndex, onComplete, onBack }: any) {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<(string | boolean | null)[]>([]);
    const [isFinished, setIsFinished] = useState(false);
    const [score, setScore] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);

    const PASS_THRESHOLD = 0.7;

    useEffect(() => {
        async function fetchQuestions() {
            setIsLoading(true);
            try {
                const result = await getQuestionsFromBank({ topicId: topic.id, difficulty: [], questionCount: 500, isStatic: true });
                if (result.error || !result.questions) throw new Error("Yüklenemedi");
                const targetDiff = difficultyMap[difficulty as keyof typeof difficultyMap];
                const filtered = (result.questions as Question[]).filter(q => q.difficulty?.toLowerCase() === targetDiff);
                const sliced = filtered.slice(testIndex * 10, (testIndex * 10) + 10);
                if (sliced.length === 0) setError("Bu zorluk seviyesinde soru bulunamadı.");
                else setQuestions(sliced);
            } catch (e) { setError("Sorular yüklenirken bir hata oluştu."); } finally { setIsLoading(false); }
        }
        fetchQuestions();
    }, [topic.id, difficulty, testIndex]);

    const handleAnswer = (answer: any) => {
        if (answers[currentQuestionIndex] !== null && answers[currentQuestionIndex] !== undefined) return;
        const newAnswers = [...answers];
        newAnswers[currentQuestionIndex] = answer;
        setAnswers(newAnswers);
        const q = questions[currentQuestionIndex];
        const isCorrect = q.type === 'Doğru/Yanlış' ? answer === (q.correctAnswer === 'Doğru') : answer === q.correctAnswer;
        if (isCorrect) {
            playSound('correct');
            setScore(s => s + 150);
            setCorrectCount(c => c + 1);
        } else {
            playSound('incorrect');
            if (user?.uid) addQuestionToReviewList(user.uid, q);
        }
    };

    if (isLoading) return <div className="flex h-full items-center justify-center min-h-[400px]"><Loader2 className="h-12 w-12 animate-spin text-cyan-500" /></div>;
    
    if (error) return (
        <div className="flex flex-col items-center justify-center p-8 text-center gap-4 min-h-[400px]">
            <XCircle className="w-16 h-16 text-red-500 opacity-50" />
            <p className="text-white text-lg font-medium">{error}</p>
            <Button onClick={onBack} variant="outline">Geri Dön</Button>
        </div>
    );

    // Kritik düzeltme: Sorular henüz yüklenmediyse veya index dışındaysa hata vermemesi için
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion && !isFinished) return null;

    if (isFinished) {
        const hasPassed = (correctCount / questions.length) >= PASS_THRESHOLD;
        return (
            <div className="flex flex-col items-center justify-center h-full p-4 animate-in zoom-in-95">
                <Card className="w-full max-w-md bg-slate-900/90 border-white/10 rounded-[2.5rem] shadow-2xl p-8 text-center border-t-indigo-500">
                    <Trophy className={cn("w-20 h-20 mx-auto mb-4", hasPassed ? "text-yellow-400" : "text-slate-600")} />
                    <h2 className="text-3xl font-black text-white">{hasPassed ? "BAŞARILI!" : "TEKRAR DENE"}</h2>
                    <p className="text-slate-400 mb-6">{correctCount} Doğru / {questions.length} Soru</p>
                    <div className="bg-black/40 rounded-2xl p-4 mb-6">
                        <span className="text-xs font-bold text-slate-500 block uppercase">Kazanılan Puan</span>
                        <span className="text-4xl font-black text-cyan-400">{hasPassed ? score : 0} XP</span>
                    </div>
                    <Button onClick={() => onComplete(difficulty, testIndex, score, hasPassed, correctCount, questions.length)} className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-lg font-bold">Sonucu Kaydet</Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-start p-4 pt-10 h-full">
            <Card className="w-full max-w-3xl bg-slate-900/80 backdrop-blur-xl border-white/10 rounded-[2rem] shadow-2xl overflow-hidden relative">
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <Button onClick={onBack} variant="ghost" size="sm" className="text-slate-400 hover:text-white"><ArrowLeft className="mr-2 h-4 w-4" /> Vazgeç</Button>
                    <div className="text-white font-black text-lg">{score} XP</div>
                </div>
                <CardContent className="py-10 text-center">
                    <p className="text-xl md:text-2xl font-bold text-white mb-10 px-4">{currentQuestion?.text}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(currentQuestion?.type === 'Doğru/Yanlış' ? ["Doğru", "Yanlış"] : currentQuestion?.options || []).map((opt) => (
                            <Button
                                key={opt.toString()}
                                variant="outline"
                                onClick={() => handleAnswer(currentQuestion?.type === 'Doğru/Yanlış' ? opt === 'Doğru' : opt)}
                                disabled={answers[currentQuestionIndex] !== null}
                                className={cn(
                                    "h-16 rounded-2xl border-2 font-bold text-lg transition-all",
                                    answers[currentQuestionIndex] !== null ? 
                                    (opt === currentQuestion?.correctAnswer || (currentQuestion?.type === 'Doğru/Yanlış' && (opt === 'Doğru') === (currentQuestion?.correctAnswer === 'Doğru'))
                                        ? "bg-green-500/20 border-green-500 text-green-400" 
                                        : (answers[currentQuestionIndex] === (currentQuestion?.type === 'Doğru/Yanlış' ? opt === 'Doğru' : opt) ? "bg-red-500/20 border-red-500 text-red-400" : "opacity-50"))
                                    : "bg-slate-800/50 border-white/5 hover:border-cyan-500/50"
                                )}
                            >
                                {opt.toString()}
                            </Button>
                        ))}
                    </div>
                </CardContent>
                <CardFooter className="bg-slate-900/60 p-4 flex justify-end">
                    <Button 
                        onClick={() => currentQuestionIndex < questions.length - 1 ? setCurrentQuestionIndex(prev => prev + 1) : setIsFinished(true)} 
                        disabled={answers[currentQuestionIndex] === null || answers[currentQuestionIndex] === undefined} 
                        className="bg-cyan-600 hover:bg-cyan-500 rounded-xl px-8 h-12 font-bold"
                    >
                        {currentQuestionIndex === questions.length - 1 ? "Testi Bitir" : "Sıradaki"}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

// --- ANA BİLEŞEN ---
function QuestionBankCoursePageComponent() {
    const params = useParams();
    const { user } = useAuth();
    const courseId = params.courseId as string;
    const mainContentRef = useRef<HTMLDivElement>(null);

    const [course, setCourse] = useState<Course | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCountsLoading, setIsCountsLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const [topicProgress, setTopicProgress] = useState<QuestionBankProgress>({});
    const [testCounts, setTestCounts] = useState<{ [topicId: string]: { easy: number; medium: number; hard: number; } }>({});
    const [classRank, setClassRank] = useState<{rank: number; total: number} | null>(null);

    const [activeTopic, setActiveTopic] = useState<Topic | null>(null);
    const [activeTest, setActiveTest] = useState<{ topic: Topic, difficulty: 'Kolay' | 'Orta' | 'Zor', testIndex: number } | null>(null);

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
                allTopics.forEach((t, i) => newCounts[t.id] = counts[i]);
                setTestCounts(newCounts);
            } catch (e: any) { console.error(e); } finally { setIsLoading(false); setIsCountsLoading(false); }
        };
        fetchInitialData();
    }, [user, courseId]);

    useEffect(() => {
        if (isLoading || isCountsLoading || !course || activeTopic) return;
        const allTopics = course.units?.flatMap(u => u.topics || []) || [];
        const nextTopic = allTopics.find(t => {
            const currentIndex = allTopics.findIndex(x => x.id === t.id);
            const prevTopic = currentIndex > 0 ? allTopics[currentIndex - 1] : null;
            const isUnlocked = !prevTopic || isTopicCompleted(prevTopic.id);
            return isUnlocked && !isTopicCompleted(t.id);
        });
        setActiveTopic(nextTopic || allTopics[0] || null);
    }, [isLoading, isCountsLoading, course, isTopicCompleted, activeTopic]);

    const isTopicUnlocked = useCallback((topicId: string): boolean => {
        if (!user || user.role !== 'student') return true;
        const allTopics = (course?.units || []).flatMap(u => u.topics || []);
        const idx = allTopics.findIndex(t => t.id === topicId);
        if (idx <= 0) return true;
        return isTopicCompleted(allTopics[idx - 1].id);
    }, [course, isTopicCompleted, user]);

    const handleTestComplete = useCallback(async (difficulty: 'Kolay' | 'Orta' | 'Zor', testIndex: number, score: number, passed: boolean, correctCount: number, totalQuestions: number) => {
        if (!user || !activeTest) return;
        const result: TestResult = { status: passed ? 'passed' : 'failed', correct: correctCount, total: totalQuestions, score };
        setTopicProgress(prev => ({ ...prev, [activeTest.topic.id]: { ...(prev[activeTest.topic.id] || {}), [difficultyMap[difficulty]]: { ...(prev[activeTest.topic.id]?.[difficultyMap[difficulty]] || {}), [testIndex]: result } } }));
        setActiveTest(null);
        await updateTopicTestProgress(user.uid, courseId, activeTest.topic.id, difficultyMap[difficulty], testIndex, result);
        if (score > 0) await submitSoruBankasiScore(user.uid, score, `${course?.title} - ${activeTest.topic.title}`);
    }, [user, courseId, activeTest, course?.title]);

    const courseStats = useMemo(() => {
        let score = 0, passed = 0, total = 0;
        Object.keys(testCounts).forEach(id => {
            const c = testCounts[id]; total += Math.ceil((c.easy||0)/10) + Math.ceil((c.medium||0)/10) + Math.ceil((c.hard||0)/10);
            const p = topicProgress[id]; if(p) ['easy','medium','hard'].forEach(k => Object.values((p as any)[k] || {}).forEach((r: any) => { if(r.status==='passed') passed++; score += r.score; }));
        });
        return { score, passed, total, percent: total > 0 ? Math.round((passed/total)*100) : 0 };
    }, [testCounts, topicProgress]);

    const mainContent = () => {
        if (activeTest) return <QuestionTest topic={activeTest.topic} difficulty={activeTest.difficulty} testIndex={activeTest.testIndex} onComplete={handleTestComplete} onBack={() => setActiveTest(null)} />;
        if (!activeTopic) return <div className="h-full flex items-center justify-center text-slate-500">Konu yükleniyor...</div>;

        return (
            <ScrollArea className="h-full">
                <div className="p-4 md:p-10 space-y-8 pb-40">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-slate-900/60 p-8 rounded-[3rem] border border-white/10 backdrop-blur-xl relative overflow-hidden group">
                        <div className="text-center md:text-left relative z-10">
                            <h2 className="text-2xl md:text-4xl font-black text-white mb-2 tracking-tight">{activeTopic.title}</h2>
                            <p className="text-slate-400 font-medium">Bölüm ödülü: <span className="text-yellow-400">{TOPIC_REWARD.toLocaleString()} XP</span></p>
                        </div>
                        <div className="bg-yellow-500/20 text-yellow-400 px-6 py-3 rounded-2xl border border-yellow-500/30 font-black text-xl shadow-lg">
                            <Trophy className="w-6 h-6 inline mr-2" /> {TOPIC_REWARD.toLocaleString()} XP
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-8">
                        {(['Kolay', 'Orta', 'Zor'] as const).map(level => {
                            const levelKey = difficultyMap[level];
                            const counts = testCounts[activeTopic.id]?.[levelKey] || 0;
                            if (counts === 0) return null;
                            const numTests = Math.ceil(counts / 10);
                            
                            const isLevelUnlocked = () => {
                                if (level === 'Kolay') return true;
                                const prevDiff = level === 'Orta' ? 'easy' : 'medium';
                                const totalPrev = Math.ceil((testCounts[activeTopic.id]?.[prevDiff] || 0) / 10);
                                const passedPrev = Object.values(topicProgress[activeTopic.id]?.[prevDiff] || {}).filter(r => r.status === 'passed').length;
                                return passedPrev >= totalPrev;
                            }
                            const levelLocked = !isLevelUnlocked();

                            return (
                                <div key={level} className={cn("rounded-[2.5rem] border p-6 transition-all duration-500", levelLocked ? "bg-slate-900/30 border-white/5 grayscale opacity-50" : "bg-slate-900/80 border-white/10 shadow-2xl")}>
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className={cn("p-3 rounded-xl", level === 'Kolay' ? "bg-emerald-500/20 text-emerald-400" : level === 'Orta' ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400")}>
                                            {level === 'Kolay' ? <ShieldCheck /> : level === 'Orta' ? <Shield /> : <ShieldAlert />}
                                        </div>
                                        <h3 className="text-xl font-black text-white">{level} Seviye</h3>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                                        {Array.from({ length: numTests }).map((_, i) => {
                                            const res = topicProgress[activeTopic.id]?.[levelKey]?.[i];
                                            const tLocked = levelLocked || (i > 0 && topicProgress[activeTopic.id]?.[levelKey]?.[i-1]?.status !== 'passed');
                                            return (
                                                <Button key={i} disabled={tLocked} onClick={() => setActiveTest({ topic: activeTopic, difficulty: level, testIndex: i })} className={cn("h-14 rounded-2xl border-2 font-bold relative overflow-hidden transition-all", res?.status === 'passed' ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : tLocked ? "bg-slate-950 border-white/5 text-slate-700" : "bg-slate-800 border-white/10 text-white hover:border-cyan-500")}>
                                                    {tLocked ? <Lock className="w-4 h-4" /> : res?.status === 'passed' ? <CheckCheck className="w-5 h-5" /> : `Test ${i+1}`}
                                                </Button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </ScrollArea>
        );
    };

    if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-950 text-white"><Loader2 className="h-12 w-12 animate-spin text-cyan-500" /></div>;

    return (
        <div ref={mainContentRef} className="flex flex-col h-[100dvh] bg-slate-950 overflow-hidden relative selection:bg-cyan-500/30">
            <MissionBackground />
            
            <div className="z-50 border-b border-white/5 bg-slate-900/60 backdrop-blur-xl p-3 md:p-4 shrink-0">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-white bg-white/5 rounded-lg">
                                    <Menu className="h-6 w-6" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="p-0 bg-slate-950 border-white/5 w-80">
                                <SheetHeader className="p-4 border-b border-white/5 text-left">
                                    <SheetTitle className="text-white flex items-center gap-2 font-black uppercase text-sm tracking-widest"><MapIcon className="text-indigo-400 w-4 h-4" /> Görev Haritası</SheetTitle>
                                </SheetHeader>
                                <CourseSidebar course={course as Course} activeTopic={activeTopic} onSelectTopic={(t) => { setActiveTopic(t); setIsSidebarOpen(false); }} isTopicUnlocked={isTopicUnlocked} isTopicCompleted={isTopicCompleted} topicProgress={topicProgress} testCounts={testCounts} />
                            </SheetContent>
                        </Sheet>
                        <div className="min-w-0">
                            <h1 className="text-sm md:text-xl font-black text-white truncate leading-tight uppercase tracking-tight">{course?.title}</h1>
                            <span className="text-slate-500 text-[9px] font-bold uppercase tracking-widest block md:inline">SIRALAMA #{classRank?.rank || 0}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Ders Puanı</span>
                            <span className="text-base md:text-xl font-black text-yellow-400 leading-none">{courseStats.score.toLocaleString()} XP</span>
                        </div>
                        <FullscreenToggle elementRef={mainContentRef} className="bg-white/5 border-white/10 text-slate-300 h-9 w-9 rounded-lg" />
                    </div>
                </div>
            </div>

            <div className="flex-grow flex overflow-hidden relative z-10">
                <aside className="hidden lg:block w-80 lg:w-96 border-r border-white/5 bg-slate-900/40 backdrop-blur-md">
                    <CourseSidebar course={course as Course} activeTopic={activeTopic} onSelectTopic={setActiveTopic} isTopicUnlocked={isTopicUnlocked} isTopicCompleted={isTopicCompleted} topicProgress={topicProgress} testCounts={testCounts} />
                </aside>
                <main className="flex-1 overflow-hidden relative">{mainContent()}</main>
            </div>
        </div>
    );
}

export default function Page() {
    return <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-cyan-500" /></div>}><QuestionBankCoursePageComponent /></Suspense>;
}