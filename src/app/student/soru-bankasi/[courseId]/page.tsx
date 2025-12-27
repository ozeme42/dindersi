

'use client';

import { Suspense, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCourseForSoruBankasi, getQuestionsForTest, getQuestionBankProgress, getQuestionCounts, updateTopicTestProgress, submitSoruBankasiScore, getCourseLeaderboard, getPreviousTestAttemptCount } from '../actions';
import type { Course, Topic, Unit, Question, QuestionBankProgress, TestResult, UserProfile, QuestionBankStats } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, ArrowLeft, ArrowRight, CheckCircle2, Circle, Lock, PlayCircle, Star, ShieldCheck, Shield, ShieldAlert, Check, Repeat, Home, PartyPopper, Activity, BookCopy, Target, CheckCheck, XCircle, Trophy, Bug, Menu } from "lucide-react";
import { addQuestionToReviewList } from '@/app/student/tekrar-et/actions';
import { playSound } from '@/lib/audio-service';
import { CourseSidebar } from '@/components/course-sidebar';
import { GameEndScreen } from '@/components/game-end-screen';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { Badge } from '@/components/ui/badge';

const difficultyMap = { 'Kolay': 'easy', 'Orta': 'medium', 'Zor': 'hard' } as const;

// --- SORU ÇÖZME EKRANI (TEST) ---
function QuestionTest({ 
    topic, 
    difficulty, 
    testIndex, 
    onComplete, 
    onBack,
}: {
    topic: Topic,
    difficulty: 'Kolay' | 'Orta' | 'Zor',
    testIndex: number,
    onComplete: (difficulty: 'Kolay' | 'Orta' | 'Zor', testIndex: number, score: number, passed: boolean, correctCount: number, totalQuestions: number) => void,
    onBack: () => void,
}) {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();
    const { user } = useAuth();
    const router = useRouter();

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<(string | null)[]>([]);
    const [isFinished, setIsFinished] = useState(false);
    
    const [score, setScore] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);

    const PASS_THRESHOLD = 0.7;

    useEffect(() => {
        async function fetchQuestions() {
            setIsLoading(true);
            const result = await getQuestionsForTest(topic.id, difficulty, testIndex);
            if (result.error) {
                setError(result.error);
                toast({ title: 'Hata', description: result.error, variant: 'destructive'});
            } else {
                setQuestions(result.questions);
            }
            setIsLoading(false);
        }
        fetchQuestions();
    }, [topic, difficulty, testIndex, toast]);

    const handleAnswer = (answer: string | boolean) => {
        if (answers[currentQuestionIndex] !== undefined && answers[currentQuestionIndex] !== null) return;

        const newAnswers = [...answers];
        newAnswers[currentQuestionIndex] = String(answer);
        setAnswers(newAnswers);

        const question = questions[currentQuestionIndex];
        let isCorrect = false;

        if (question.type === 'Doğru/Yanlış') {
            isCorrect = String(answer).toLowerCase() === String(question.correctAnswer).toLowerCase();
        } else {
            isCorrect = answer === question.correctAnswer;
        }

        if(isCorrect) {
            playSound('correct');
            setScore(s => s + 10);
            setCorrectCount(c => c + 1);
        } else {
            playSound('incorrect');
            if (user) {
              addQuestionToReviewList(user.uid, question);
            }
        }
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            playSound('win');
            setIsFinished(true);
        }
    };

    const finishTest = () => {
        const passed = (correctCount / questions.length) >= PASS_THRESHOLD;
        onComplete(difficulty, testIndex, score, passed, correctCount, questions.length);
    }
    
    if (isLoading) return <div className="flex h-full min-h-[50vh] items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-cyan-500" /></div>;
    if (error) return <div className="p-8 text-center text-red-500 bg-red-500/10 rounded-2xl border border-red-500/30">{error}</div>;
    
    // --- TEST BİTİŞ EKRANI ---
    if (isFinished) {
        const hasPassed = (correctCount / questions.length) >= PASS_THRESHOLD;
        const incorrectCount = questions.length - correctCount;
        const successPercentage = questions.length > 0 ? (correctCount / questions.length) * 100 : 0;

        return (
            <div className="w-full min-h-full flex items-center justify-center p-4 pb-32">
                <Card className="w-full max-w-lg text-center bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
                    <CardHeader className="items-center pb-2">
                         <div className={cn("p-4 rounded-full mb-2 shadow-lg", hasPassed ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400")}>
                             {hasPassed ? <PartyPopper className="h-12 w-12" /> : <Repeat className="h-12 w-12" />}
                         </div>
                         <CardTitle className="font-black text-3xl text-white">{hasPassed ? "Test Tamamlandı!" : "Tekrar Dene"}</CardTitle>
                         <CardDescription className="text-slate-400">{difficulty} Seviyesi</CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                             <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5">
                                 <p className="text-sm text-slate-500 font-bold uppercase">Doğru</p>
                                 <p className="text-3xl font-black text-green-400">{correctCount}</p>
                             </div>
                             <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5">
                                 <p className="text-sm text-slate-500 font-bold uppercase">Yanlış</p>
                                 <p className="text-3xl font-black text-red-400">{incorrectCount}</p>
                             </div>
                             <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5">
                                 <p className="text-sm text-slate-500 font-bold uppercase">Başarı</p>
                                 <p className={cn("text-3xl font-black", hasPassed ? "text-cyan-400" : "text-orange-400")}>%{successPercentage.toFixed(0)}</p>
                             </div>
                             <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5">
                                 <p className="text-sm text-slate-500 font-bold uppercase">Puan</p>
                                 <p className="text-3xl font-black text-yellow-400">{score}</p>
                             </div>
                        </div>

                        {hasPassed ?
                            <div className="bg-green-500/10 p-3 rounded-xl border border-green-500/20 text-green-400 font-medium text-sm">
                                Tebrikler! Bir sonraki aşamanın kilidi açıldı.
                            </div> :
                            <div className="bg-red-500/10 p-3 rounded-xl border border-red-500/20 text-red-400 font-medium text-sm">
                                Geçmek için en az %{(PASS_THRESHOLD * 100).toFixed(0)} başarı sağlamalısın.
                            </div>
                        }
                    </CardContent>

                    <CardFooter className="flex-col gap-3 pb-8">
                        <Button onClick={finishTest} className="w-full h-14 text-lg font-bold rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-900/20 transition-all hover:scale-[1.02]">
                            {hasPassed ? "Devam Et & Kaydet" : "Sonucu Kaydet"}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }
    
    // --- SORU KARTI ---
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return <div className="text-center text-slate-500 mt-10">Soru yüklenemedi.</div>;

    const currentAnswer = answers[currentQuestionIndex];
    const progressPercentage = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
        <div className="w-full min-h-full flex flex-col items-center justify-start md:justify-center p-4 pb-32 md:pb-8">
            
            <Card className="w-full max-w-3xl bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden relative flex flex-col">
                <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500" style={{ width: `${progressPercentage}%` }} />
                
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                     <div className="flex flex-col">
                        <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">{difficulty} Testi • {testIndex + 1}</span>
                        <span className="text-sm text-slate-400">Soru {currentQuestionIndex + 1} / {questions.length}</span>
                     </div>
                     <div className="flex items-center gap-3">
                         <div className="bg-slate-800 px-3 py-1 rounded-lg border border-white/5 text-yellow-400 font-bold font-mono text-sm">
                            {score} P
                         </div>
                         <Button variant="ghost" size="icon" onClick={onBack} className="text-slate-400 hover:text-white rounded-full">
                             <XCircle className="w-6 h-6" />
                         </Button>
                     </div>
                </CardHeader>
                
                <CardContent className="py-6 space-y-8 flex-grow">
                    {/* Soru Metni */}
                    <div className="text-center">
                        <h3 className="text-xl md:text-2xl font-bold text-white leading-relaxed">
                            {currentQuestion.text}
                        </h3>
                    </div>
                    
                    {/* Seçenekler */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(currentQuestion.type === 'Çoktan Seçmeli' || currentQuestion.type === 'Boşluk Doldurma') && currentQuestion.options?.map((option, index) => {
                            const isSelected = currentAnswer === option;
                            const isCorrect = option === currentQuestion.correctAnswer;
                            
                            let btnStyle = "h-auto py-5 px-6 text-base font-bold rounded-2xl border-2 transition-all duration-200 relative overflow-hidden group text-left justify-start ";
                            
                            if (currentAnswer) {
                                if (isCorrect) {
                                    btnStyle += "bg-green-500/20 border-green-500 text-green-100 shadow-[0_0_20px_rgba(34,197,94,0.3)] z-10";
                                } else if (isSelected) {
                                    btnStyle += "bg-red-500/20 border-red-500 text-red-100 opacity-80";
                                } else {
                                    btnStyle += "bg-slate-800/30 border-transparent text-slate-500 opacity-40";
                                }
                            } else {
                                btnStyle += "bg-slate-800/50 border-white/5 text-slate-300 hover:bg-slate-800 hover:border-cyan-500/50 hover:text-white hover:shadow-lg active:scale-95";
                            }

                            return (
                                <Button 
                                    key={option} 
                                    variant="ghost"
                                    className={btnStyle}
                                    onClick={() => handleAnswer(option)} 
                                    disabled={!!currentAnswer}
                                >
                                    <span className={cn("mr-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors", 
                                        currentAnswer && isCorrect ? "border-green-500 bg-green-500 text-white" : 
                                        currentAnswer && isSelected ? "border-red-500 bg-red-500 text-white" : 
                                        "border-white/10 bg-slate-900 text-slate-400 group-hover:border-cyan-500/50 group-hover:text-cyan-400"
                                    )}>
                                        {['A','B','C','D'][index]}
                                    </span>
                                    {option}
                                    {currentAnswer && isCorrect && <CheckCircle2 className="ml-auto h-5 w-5 text-green-400 animate-in zoom-in" />}
                                </Button>
                            );
                        })}
                        
                        {currentQuestion.type === 'Doğru/Yanlış' && ["Doğru", "Yanlış"].map((option) => {
                            const answerValue = option === 'Doğru' ? 'Doğru' : 'Yanlış';
                            const isCorrect = answerValue === currentQuestion.correctAnswer;
                            const isSelected = currentAnswer === answerValue;
                             
                            let btnStyle = "h-auto py-5 px-6 text-lg font-bold rounded-2xl border-2 transition-all duration-200 text-center justify-center ";
                             if (currentAnswer) {
                                if (isCorrect) {
                                     btnStyle += "bg-green-500/20 border-green-500 text-green-100";
                                } else if (isSelected) {
                                     btnStyle += "bg-red-500/20 border-red-500 text-red-100";
                                } else {
                                     btnStyle += "bg-slate-800/30 border-transparent text-slate-500 opacity-40";
                                }
                            } else {
                                btnStyle += "bg-slate-800/50 border-white/5 text-slate-300 hover:bg-slate-800 hover:border-cyan-500/50 hover:text-white";
                            }

                            return (
                                <Button 
                                    key={option} 
                                    variant="ghost"
                                    className={btnStyle}
                                    onClick={() => handleAnswer(option)} 
                                    disabled={!!currentAnswer}
                                >
                                    {option}
                                </Button>
                            );
                        })}
                    </div>
                </CardContent>
                
                <CardFooter className="flex justify-end pt-4 pb-6 px-6 border-t border-white/5 bg-slate-900/95 sticky bottom-0 z-20">
                    <Button 
                        onClick={handleNext} 
                        disabled={!currentAnswer}
                        className={cn(
                            "h-12 px-8 rounded-xl font-bold transition-all duration-300 w-full md:w-auto",
                            currentAnswer 
                                ? "bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/20 hover:scale-105" 
                                : "bg-slate-800 text-slate-500 cursor-not-allowed"
                        )}
                    >
                        {currentQuestionIndex === questions.length - 1 ? 'Testi Bitir' : 'Sonraki'} 
                        <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}


function QuestionBankCoursePageComponent() {
    const params = useParams();
    const { user } = useAuth();
    const courseId = params.courseId as string;
    const { toast } = useToast();
    const mainContentRef = useRef<HTMLDivElement>(null);

    const [course, setCourse] = useState<Course | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [topicProgress, setTopicProgress] = useState<QuestionBankProgress>({});
    const [testCounts, setTestCounts] = useState<{ [topicId: string]: { easy: number; medium: number; hard: number; } }>({});
    const [isCountsLoading, setIsCountsLoading] = useState(true);
    const [classRank, setClassRank] = useState<{rank: number; total: number} | null>(null);

    const [activeTopic, setActiveTopic] = useState<Topic | null>(null);
    const [activeTest, setActiveTest] = useState<{ topic: Topic, difficulty: 'Kolay' | 'Orta' | 'Zor', testIndex: number } | null>(null);
    
    const isTopicCompleted = useCallback((topicId: string) => {
        const progress = topicProgress[topicId];
        const counts = testCounts[topicId];
        if (!counts || (counts.easy === 0 && counts.medium === 0 && counts.hard === 0)) return true; 
        if (!progress) return false;

        const checkLevel = (key: 'easy' | 'medium' | 'hard') => {
            const total = Math.ceil((counts[key] || 0) / 10);
            if (total > 0) {
                 const passed = Object.values(progress[key] || {}).filter(res => res.status === 'passed').length;
                 return passed === total;
            }
            return false;
        }

        if (Math.ceil((counts.hard || 0)/10) > 0) return checkLevel('hard');
        if (Math.ceil((counts.medium || 0)/10) > 0) return checkLevel('medium');
        return checkLevel('easy');
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

                if (courseResult.error) throw new Error(courseResult.error);
                if (!courseResult.course) throw new Error("Ders bulunamadı.");
                
                const courseData = courseResult.course;
                setCourse(courseData);
                setTopicProgress(progressResult);
                if (rankResult && !rankResult.error) setClassRank({ rank: rankResult.rank, total: rankResult.total });
                
                const allTopics = courseData.units?.flatMap(u => u.topics || []) || [];
                if (allTopics.length > 0) {
                    const countsResults = await Promise.all(allTopics.map(t => getQuestionCounts(t.id)));
                    const newTestCounts: typeof testCounts = {};
                    allTopics.forEach((topic, index) => {
                        newTestCounts[topic.id] = countsResults[index] || { easy: 0, medium: 0, hard: 0 };
                    });
                    setTestCounts(newTestCounts);
                }
            } catch (e: any) {
                setError(e.message);
            } finally {
                setIsLoading(false);
                setIsCountsLoading(false);
            }
        };
        fetchInitialData();
    }, [user?.uid, user?.class, courseId]);

    const isTopicUnlocked = useCallback((topicIndex: number, unitIndex: number) => {
        if (!course) return false;
        const allTopics = course.units?.flatMap(u => u.topics || []) || [];
        const globalIndex = course.units?.slice(0, unitIndex).reduce((acc, unit) => acc + (unit.topics?.length || 0), 0) + topicIndex;
        if (globalIndex === 0) return true;
        const prevTopic = allTopics[globalIndex - 1];
        if (!prevTopic) return true; 
        return isTopicCompleted(prevTopic.id);
    }, [course, isTopicCompleted]);

    const handleTestComplete = useCallback(async (difficulty: 'Kolay' | 'Orta' | 'Zor', testIndex: number, score: number, passed: boolean, correctCount: number, totalQuestions: number) => {
        if (!user || !courseId || !activeTest?.topic.id) return;
        const { topic } = activeTest!;
        const difficultyKey = difficultyMap[difficulty];
        const result: TestResult = { status: passed ? 'passed' : 'failed', correct: correctCount, total: totalQuestions, score: score };
        
        // Optimistic update
        setTopicProgress(prev => ({
            ...prev,
            [topic.id]: {
                ...(prev[topic.id] || {}),
                [difficultyKey]: { ...(prev[topic.id]?.[difficultyKey] || {}), [testIndex]: result }
            }
        }));
        setActiveTest(null);

        try {
            await updateTopicTestProgress(user.uid, courseId, topic.id, difficultyKey, testIndex, result);
            if (score > 0) {
                const scoreContext = `${course?.title} - ${topic.title} (${difficulty} ${testIndex + 1})`;
                const attempts = await getPreviousTestAttemptCount(user.uid, scoreContext);
                if (attempts < 10) await submitSoruBankasiScore(user.uid, score, scoreContext);
            }
        } catch (e) {
            console.error("Failed to save progress:", e);
        }
    }, [user, courseId, activeTest, topicProgress, course?.title]);
    
     useEffect(() => {
        if (isLoading || isCountsLoading || !course || activeTopic) return;
        const allTopics = course.units?.flatMap(u => u.topics || []) || [];
        let targetTopic = allTopics.find(t => !isTopicCompleted(t.id)) || allTopics[0];
        setActiveTopic(targetTopic);
    }, [isLoading, isCountsLoading, course, isTopicCompleted, activeTopic]);

     const courseStats = useMemo(() => {
         if (isCountsLoading || !course) return { totalTests: 0, completedTests: 0, passedTests: 0, completionPercentage: 0, totalCorrect: 0, totalIncorrect: 0, totalScore: 0, classRank: 0, classTotal: 0 };
        
        let totalTests = 0;
        let completedTests = 0;
        let passedTests = 0;
        let totalCorrect = 0;
        let totalIncorrect = 0;
        let totalScore = 0;

        for (const topicId in testCounts) {
            const counts = testCounts[topicId];
            const progress = topicProgress[topicId];

            const easyTests = Math.ceil((counts?.easy || 0) / 10);
            const mediumTests = Math.ceil((counts?.medium || 0) / 10);
            const hardTests = Math.ceil((counts?.hard || 0) / 10);
            totalTests += easyTests + mediumTests + hardTests;

            if (progress) {
                const allTestResults = [
                    ...Object.values(progress.easy || {}),
                    ...Object.values(progress.medium || {}),
                    ...Object.values(progress.hard || {})
                ] as TestResult[];
                
                completedTests += allTestResults.length;
                passedTests += allTestResults.filter(res => res.status === 'passed').length;
                totalCorrect += allTestResults.reduce((sum, res) => sum + res.correct, 0);
                totalIncorrect += allTestResults.reduce((sum, res) => sum + (res.total - res.correct), 0);
                totalScore += allTestResults.reduce((sum, res) => sum + res.score, 0);
            }
        }
        
        const completionPercentage = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
        return { totalTests, completedTests, passedTests, completionPercentage, totalCorrect, totalIncorrect, totalScore, classRank: classRank?.rank || 0, classTotal: classRank?.total || 0 };

    }, [isCountsLoading, course, testCounts, topicProgress, classRank]);


    const mainContent = () => {
        if (activeTest) {
            return (
                <div className="flex flex-col h-[100dvh] md:h-full bg-slate-950 relative">
                     <div className="fixed inset-0 pointer-events-none z-0">
                         <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[120px]" />
                         <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-indigo-900/10 rounded-full blur-[120px]" />
                     </div>
                     <div className="relative z-10 flex-grow overflow-y-auto">
                        <QuestionTest
                            topic={activeTest.topic}
                            difficulty={activeTest.difficulty}
                            testIndex={activeTest.testIndex}
                            onComplete={handleTestComplete}
                            onBack={() => setActiveTest(null)}
                        />
                     </div>
                </div>
            );
        }

        if (activeTopic) {
            const difficultyLevels: ('Kolay' | 'Orta' | 'Zor')[] = ['Kolay', 'Orta', 'Zor'];
            const difficultyIcons = { 'Kolay': ShieldCheck, 'Orta': Shield, 'Zor': ShieldAlert };
            const difficultyColors = { 
                'Kolay': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40', 
                'Orta': 'text-amber-400 bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40', 
                'Zor': 'text-red-400 bg-red-500/10 border-red-500/20 hover:border-red-500/40' 
            };

             const isLevelLocked = (level: 'Kolay' | 'Orta' | 'Zor'): boolean => {
                if (level === 'Kolay') return false;
                const counts = testCounts[activeTopic.id];
                const progress = topicProgress[activeTopic.id];
                if (!counts) return true;
                
                const prevDifficultyKey = level === 'Orta' ? 'easy' : 'medium';
                const totalPrev = Math.ceil((counts[prevDifficultyKey] || 0) / 10);
                if (totalPrev === 0) {
                     if (level === 'Orta') {
                        const totalEasy = Math.ceil((counts.easy || 0) / 10);
                        if (totalEasy === 0) return false;
                     }
                     return false;
                }
                
                const passedPrev = Object.values(progress?.[prevDifficultyKey] || {}).filter(res => res.status === 'passed').length;
                return passedPrev < totalPrev;
            };

            return (
                <ScrollArea className="h-full bg-slate-950">
                    <div className="p-4 md:p-8 space-y-8 pb-24">
                        <div className="md:hidden mb-4">
                             <Button variant="ghost" size="sm" onClick={() => setActiveTopic(null)} className="text-slate-400 hover:text-white">
                                <ArrowLeft className="mr-2 h-4 w-4"/> Konulara Dön
                            </Button>
                        </div>

                        <div className="text-center space-y-2">
                            <h2 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">{activeTopic.title}</h2>
                            <p className="text-slate-400">Seviyeni seç ve kendini test et.</p>
                        </div>

                        <div className="grid gap-6">
                            {difficultyLevels.map(level => {
                                const levelKey = difficultyMap[level];
                                const counts = testCounts[activeTopic.id];
                                if (!counts || counts[levelKey] === 0) return null;
                                
                                const numTests = Math.ceil((counts[levelKey] || 0) / 10);
                                const progressForLevel = topicProgress[activeTopic.id]?.[levelKey];
                                const levelLocked = isLevelLocked(level);
                                const Icon = difficultyIcons[level];
                                const colorClass = difficultyColors[level];

                                return (
                                    <div key={level} className={cn(
                                        "relative overflow-hidden rounded-3xl border backdrop-blur-sm transition-all duration-300",
                                        levelLocked ? "opacity-50 grayscale border-white/5 bg-slate-900/30" : `bg-slate-900/60 ${colorClass}`
                                    )}>
                                        {levelLocked && (
                                            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
                                                <div className="bg-black/60 p-3 rounded-full border border-white/10">
                                                    <Lock className="h-6 w-6 text-slate-400" />
                                                </div>
                                            </div>
                                        )}

                                        <div className="p-6 md:p-8">
                                            <div className="flex items-center gap-4 mb-6">
                                                <div className={cn("p-3 rounded-2xl bg-black/20")}>
                                                    <Icon className="h-8 w-8" />
                                                </div>
                                                <div>
                                                    <h3 className="text-2xl font-bold text-white">{level} Seviye</h3>
                                                    <p className="text-slate-400 text-sm">{numTests} Test Mevcut</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                                {Array.from({ length: numTests }).map((_, i) => {
                                                    const testStatus = progressForLevel?.[i]?.status;
                                                    const testIsLocked = levelLocked || (i > 0 && progressForLevel?.[i-1]?.status !== 'passed');
                                                    
                                                    return (
                                                        <Button
                                                            key={i}
                                                            variant="outline"
                                                            disabled={testIsLocked}
                                                            onClick={() => setActiveTest({ topic: activeTopic, difficulty: level, testIndex: i })}
                                                            className={cn(
                                                                "h-14 rounded-xl border-2 font-bold text-base transition-all relative overflow-hidden group",
                                                                testIsLocked 
                                                                    ? "bg-slate-950 border-white/5 text-slate-600" 
                                                                    : testStatus === 'passed'
                                                                        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30"
                                                                        : "bg-slate-800 border-white/10 text-slate-300 hover:border-white/30 hover:bg-slate-700 hover:text-white"
                                                            )}
                                                        >
                                                            <span className="relative z-10 flex items-center gap-2">
                                                                {testIsLocked ? <Lock className="h-4 w-4"/> : testStatus === 'passed' ? <CheckCircle2 className="h-4 w-4"/> : <PlayCircle className="h-4 w-4"/>}
                                                                Test {i + 1}
                                                            </span>
                                                            {testStatus === 'passed' && <div className="absolute inset-0 bg-emerald-500/10 blur-xl" />}
                                                        </Button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </ScrollArea>
            )
        }
        return (
             <div className="hidden md:flex h-full items-center justify-center text-slate-500 bg-slate-900/20 rounded-3xl border border-dashed border-white/5 m-4">
                <div className="text-center">
                    <ArrowLeft className="mx-auto h-12 w-12 mb-4 opacity-50"/>
                    <p className="text-lg font-medium">Sol menüden bir konu seçerek başla.</p>
                </div>
            </div>
        );
    }
    
    if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-cyan-500" /></div>;
    if (error) return <div className="p-8 text-center text-red-400">{error}</div>;
    if (!course) return <div className="p-8 text-center text-slate-400">Ders bulunamadı.</div>;

    return (
        <div ref={mainContentRef} className="flex flex-col h-[100dvh] bg-slate-950 overflow-hidden relative">
            
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-violet-900/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-900/20 rounded-full blur-[120px]" />
            </div>

            {!activeTest && (
                <div className="flex-shrink-0 z-20 border-b border-white/5 bg-slate-900/80 backdrop-blur-md">
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="stats" className="border-b-0">
                            <div className="flex items-center justify-between px-4 py-3">
                                 <div className="flex items-center gap-3">
                                    <Button asChild variant="ghost" size="icon" className="text-slate-400 hover:text-white rounded-xl">
                                        <Link href="/student/soru-bankasi"><ArrowLeft className="h-5 w-5"/></Link>
                                    </Button>
                                    <h1 className="text-lg font-bold text-white truncate max-w-[200px] md:max-w-md">{course.title} <Badge variant="secondary" className="ml-2">Dosya</Badge></h1>
                                </div>
                                <div className="flex items-center gap-2">
                                     <AccordionTrigger className="py-0 hover:no-underline pr-2">
                                         <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider bg-cyan-500/10 px-3 py-1.5 rounded-lg border border-cyan-500/20">
                                            <Activity className="h-4 w-4" /> İstatistikler
                                         </div>
                                     </AccordionTrigger>
                                     <FullscreenToggle elementRef={mainContentRef} className="bg-slate-800 border-white/10 text-slate-300 hover:text-white h-9 w-9 rounded-lg" />
                                </div>
                            </div>
                            <AccordionContent className="px-4 pb-4">
                                {isCountsLoading ? (
                                    <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-slate-500" /></div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div className="bg-slate-800/50 p-3 rounded-xl border border-white/5 flex items-center gap-3">
                                            <div className="p-2 bg-yellow-500/10 rounded-lg"><Trophy className="h-5 w-5 text-yellow-500" /></div>
                                            <div><p className="text-lg font-bold text-white">{courseStats.totalScore}</p><p className="text-[10px] text-slate-400 uppercase">Puan</p></div>
                                        </div>
                                         <div className="bg-slate-800/50 p-3 rounded-xl border border-white/5 flex items-center gap-3">
                                            <div className="p-2 bg-green-500/10 rounded-lg"><CheckCheck className="h-5 w-5 text-green-500" /></div>
                                            <div><p className="text-lg font-bold text-white">{courseStats.passedTests}/{courseStats.totalTests}</p><p className="text-[10px] text-slate-400 uppercase">Başarılan</p></div>
                                        </div>
                                         <div className="bg-slate-800/50 p-3 rounded-xl border border-white/5 flex items-center gap-3">
                                            <div className="p-2 bg-violet-500/10 rounded-lg"><Star className="h-5 w-5 text-violet-500" /></div>
                                            <div><p className="text-lg font-bold text-white">#{courseStats.classRank}</p><p className="text-[10px] text-slate-400 uppercase">Sıralama</p></div>
                                        </div>
                                         <div className="bg-slate-800/50 p-3 rounded-xl border border-white/5 flex items-center gap-3">
                                            <div className="p-2 bg-cyan-500/10 rounded-lg"><Activity className="h-5 w-5 text-cyan-500" /></div>
                                            <div><p className="text-lg font-bold text-white">%{courseStats.completionPercentage}</p><p className="text-[10px] text-slate-400 uppercase">Tamamlama</p></div>
                                        </div>
                                    </div>
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            )}

            <div className="flex-grow flex flex-col md:flex-row overflow-hidden relative z-10">
                
                <div className={cn(
                    "w-full md:w-80 lg:w-96 bg-slate-900/50 border-r border-white/5 flex-shrink-0 transition-all duration-300",
                    activeTest ? "hidden md:flex" : (activeTopic ? "hidden md:flex" : "flex")
                )}>
                     <CourseSidebar
                        course={course}
                        activeTopic={activeTopic}
                        onSelectTopic={(topic) => { setActiveTopic(topic); setActiveTest(null); }}
                        isTopicUnlocked={(topicIndex, unitIndex) => isTopicUnlocked(topicIndex, unitIndex)}
                        isTopicCompleted={isTopicCompleted}
                        topicProgress={topicProgress}
                        testCounts={testCounts}
                    />
                </div>

                <main className={cn(
                    "flex-grow bg-slate-950/50 relative overflow-hidden",
                    !activeTest && !activeTopic ? "hidden md:block" : "block"
                )}>
                    {mainContent()}
                </main>
            </div>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-cyan-500" /></div>}>
            <QuestionBankCoursePageComponent />
        </Suspense>
    )
}

```