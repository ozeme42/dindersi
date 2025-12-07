

'use client';

import { Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
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
import { Loader2, ArrowLeft, ArrowRight, CheckCircle2, Circle, Lock, PlayCircle, Star, ShieldCheck, Shield, ShieldAlert, Check, Repeat, Home, PartyPopper, Activity, BookCopy, Target, CheckCheck, XCircle, Trophy, Bug } from "lucide-react";
import { addQuestionToReviewList } from '@/app/student/tekrar-et/actions';
import { playSound } from '@/lib/audio-service';
import { CourseSidebar } from '@/components/course-sidebar';

const difficultyMap = { 'Kolay': 'easy', 'Orta': 'medium', 'Zor': 'hard' } as const;

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
            isCorrect = (answer === 'Doğru') === (question.isTrue ?? (question.correctAnswer === 'Doğru'));
        } else {
            isCorrect = answer === question.correctAnswer;
        }

        if (isCorrect) {
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
            setIsFinished(true);
        }
    };

    const finishTest = () => {
        const passed = (correctCount / questions.length) >= PASS_THRESHOLD;
        onComplete(difficulty, testIndex, score, passed, correctCount, questions.length);
    }
    
    if (isLoading) return <div className="flex h-full min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    if (error) return <Alert variant="destructive"><AlertTitle>Hata!</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
    
    if (isFinished) {
        const hasPassed = (correctCount / questions.length) >= PASS_THRESHOLD;
        const incorrectCount = questions.length - correctCount;
        const successPercentage = questions.length > 0 ? (correctCount / questions.length) * 100 : 0;
        return (
            <div className="w-full min-h-full flex items-center justify-center p-4">
                <Card className="w-full max-w-lg text-center bg-card/70 backdrop-blur-sm">
                    <CardHeader className="items-center">
                         <CardTitle className="font-headline text-3xl mt-4">{difficulty} Testi Tamamlandı!</CardTitle>
                        <div className="grid grid-cols-2 gap-4 text-left p-4 rounded-md bg-muted/50 w-full mt-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Doğru Cevap</p>
                                <p className="text-2xl font-bold text-green-600">{correctCount}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Yanlış Cevap</p>
                                <p className="text-2xl font-bold text-red-600">{incorrectCount}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Başarı Yüzdesi</p>
                                <p className="text-2xl font-bold">{successPercentage.toFixed(0)}%</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Kazanılan Puan</p>
                                <p className="text-2xl font-bold text-primary">{score}</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {hasPassed ?
                            <p className="text-green-600 font-semibold text-center pt-2">Tebrikler, bu testi geçtin!</p> :
                            <p className="text-red-600 font-semibold text-center pt-2">Geçmek için en az %{(PASS_THRESHOLD * 100).toFixed(0)} başarı sağlamalısın.</p>
                        }
                    </CardContent>
                    <CardFooter className="flex-col sm:flex-row gap-2">
                        <Button onClick={finishTest} className="w-full">Puanı Kaydet ve Konuya Dön</Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }
    
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return <div className="text-center text-muted-foreground">Bu test için soru bulunamadı.</div>;

    const buttonColorClasses = [
        "bg-chart-1 hover:bg-chart-1/90",
        "bg-chart-2 hover:bg-chart-2/90",
        "bg-chart-3 hover:bg-chart-3/90",
        "bg-chart-4 hover:bg-chart-4/90",
    ];
    const currentAnswer = answers[currentQuestionIndex];
    
    let isCurrentAnswerCorrect: boolean | null = null;
    if (currentAnswer !== null && currentAnswer !== undefined) {
      if (currentQuestion.type === 'Doğru/Yanlış') {
          isCurrentAnswerCorrect = (currentAnswer === 'Doğru') === (currentQuestion.isTrue ?? (currentQuestion.correctAnswer === 'Doğru'));
      } else {
          isCurrentAnswerCorrect = currentAnswer === currentQuestion.correctAnswer;
      }
    }


    return (
        <>
        <div className="w-full min-h-full flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl bg-card/70 backdrop-blur-sm">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline text-2xl">{difficulty} Testi - {testIndex + 1}</CardTitle>
                        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4"/>Geri</Button>
                    </div>
                    <div className="flex items-center gap-4 pt-2">
                        <span className="text-sm text-muted-foreground">Soru {currentQuestionIndex + 1} / {questions.length}</span>
                        <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="w-full" />
                        <span className="text-sm font-semibold text-primary">Puan: {score}</span>
                    </div>
                </CardHeader>
                <CardContent className="py-6 min-h-[250px]">
                    <div className="text-center bg-background/50 p-6 rounded-lg shadow-inner border-2 border-primary/20">
                        <p className="text-xl font-semibold">{currentQuestion.text}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                        {(currentQuestion.type === 'Çoktan Seçmeli' || currentQuestion.type === 'Boşluk Doldurma') && currentQuestion.options?.map((option, index) => {
                            const isCorrect = option === currentQuestion.correctAnswer;
                            const isSelected = currentAnswer === option;
                            return (
                                <Button 
                                    key={option} 
                                    variant="default"
                                    className={cn(
                                        "h-auto py-4 whitespace-normal justify-center text-lg text-primary-foreground transition-all duration-300", 
                                        !currentAnswer && buttonColorClasses[index % buttonColorClasses.length],
                                        currentAnswer && isCorrect && "bg-green-600 hover:bg-green-700 ring-4 ring-white",
                                        currentAnswer && isSelected && !isCorrect && "bg-red-600 hover:bg-red-700 ring-4 ring-white animate-shake",
                                        currentAnswer && !isSelected && !isCorrect && "opacity-50"
                                    )} 
                                    onClick={() => handleAnswer(option)} 
                                    disabled={!!currentAnswer}
                                >
                                    {option}
                                </Button>
                            );
                        })}
                        {currentQuestion.type === 'Doğru/Yanlış' && ["Doğru", "Yanlış"].map((option) => {
                            const isCorrect = (option === 'Doğru') === (currentQuestion.isTrue ?? (currentQuestion.correctAnswer === 'Doğru'));
                            const isSelected = currentAnswer === option;
                            return (
                                <Button 
                                    key={option} 
                                    variant="default"
                                    className={cn(
                                        "h-auto py-4 text-lg", 
                                        !currentAnswer && (option === 'Doğru' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'),
                                        currentAnswer && isCorrect && "bg-green-600 hover:bg-green-700 ring-4 ring-white",
                                        currentAnswer && isSelected && !isCorrect && "bg-red-600 hover:bg-red-700 ring-4 ring-white animate-shake",
                                        currentAnswer && !isSelected && !isCorrect && "opacity-50"
                                    )} 
                                    onClick={() => handleAnswer(option)} 
                                    disabled={!!currentAnswer}
                                >
                                    {option}
                                </Button>
                            );
                        })}
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end items-center">
                    <Button onClick={handleNext} disabled={!answers[currentQuestionIndex]}>
                        {currentQuestionIndex === questions.length - 1 ? 'Testi Bitir' : 'Sonraki Soru'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </CardFooter>
            </Card>
        </div>
        </>
    );
}


function QuestionBankCoursePageComponent() {
    const params = useParams();
    const { user } = useAuth();
    const courseId = params.courseId as string;
    const { toast } = useToast();

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
        if (!counts || (counts.easy === 0 && counts.medium === 0 && counts.hard === 0)) {
            return true; 
        } 
        
        if (!progress) return false;

        const totalHardTests = Math.ceil((counts.hard || 0) / 10);
        if (totalHardTests > 0) {
            const passedHardTests = Object.values(progress.hard || {}).filter(res => res.status === 'passed').length;
            return passedHardTests === totalHardTests;
        }
        
        const totalMediumTests = Math.ceil((counts.medium || 0) / 10);
        if (totalMediumTests > 0) {
             const passedMedium = Object.values(progress.medium || {}).filter(res => res.status === 'passed').length;
             return passedMedium === totalMediumTests;
        }

        const totalEasyTests = Math.ceil((counts.easy || 0) / 10);
        if (totalEasyTests > 0) {
            const passedEasy = Object.values(progress.easy || {}).filter(res => res.status === 'passed').length;
            return passedEasy === totalEasyTests;
        }

        return true;
    }, [topicProgress, testCounts]);

    
    useEffect(() => {
        if (!user?.uid || !courseId) return;

        const fetchInitialData = async () => {
            setIsLoading(true);
            try {
                const promises: Promise<any>[] = [
                    getCourseForSoruBankasi(courseId),
                    getQuestionBankProgress(courseId, user.uid),
                ];
                
                if (user.class) {
                    promises.push(getCourseLeaderboard(courseId, user.class, user.uid));
                }

                const [courseResult, progressResult, rankResult] = await Promise.all(promises);

                if (courseResult.error) throw new Error(courseResult.error);
                if (!courseResult.course) throw new Error("Ders bulunamadı.");
                
                const courseData = courseResult.course;
                setCourse(courseData);
                setTopicProgress(progressResult);

                if (rankResult && !rankResult.error) {
                    setClassRank({ rank: rankResult.rank, total: rankResult.total });
                } else if (rankResult?.error) {
                    console.error(rankResult.error);
                }
                
                const allTopics = courseData.units?.flatMap(u => u.topics || []) || [];
                if (allTopics.length > 0) {
                    const countsPromises = allTopics.map(t => getQuestionCounts(t.id));
                    const countsResults = await Promise.all(countsPromises);
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
        const result: TestResult = {
            status: passed ? 'passed' : 'failed',
            correct: correctCount,
            total: totalQuestions,
            score: score,
        };
        
        // Optimistic update
        const newProgressForTopic = {
            ...(topicProgress[topic.id] || {}),
            [difficultyKey]: {
                ...(topicProgress[topic.id]?.[difficultyKey] || {}),
                [testIndex]: result
            }
        };
        const newTopicProgress = { ...topicProgress, [topic.id]: newProgressForTopic };
        setTopicProgress(newTopicProgress);
        setActiveTest(null);

        toast({
            title: passed ? "Test Başarılı!" : "Tekrar Gerekli",
            description: `İlerlemeniz kaydedildi.`,
            variant: passed ? 'default' : 'destructive'
        });

        try {
            await updateTopicTestProgress(user.uid, courseId, topic.id, difficultyKey, testIndex, result);
            if (score > 0) {
                const scoreContext = `${course?.title} - ${topic.title} (${difficulty} ${testIndex + 1})`;
                 const attempts = await getPreviousTestAttemptCount(user.uid, scoreContext);
                 if (attempts >= 10) {
                    toast({
                        title: "Puan Limiti Aşıldı",
                        description: "Bu testi zaten 10 defa tamamlayarak puan kazandınız. Daha fazla deneme puan getirmeyecektir.",
                        variant: "default",
                        duration: 5000,
                    });
                 } else {
                    await submitSoruBankasiScore(user.uid, score, scoreContext);
                 }
            }
        } catch (e) {
            console.error("Failed to save progress:", e);
            toast({ title: "Hata", description: "İlerleme kaydedilirken bir sorun oluştu. Sayfayı yenileyin.", variant: "destructive"});
            if (user?.uid) {
                const revertedProgress = await getQuestionBankProgress(courseId, user.uid);
                setTopicProgress(revertedProgress);
            }
        }
    }, [user, courseId, activeTest, toast, topicProgress, course?.title]);
    
     useEffect(() => {
        if (isLoading || isCountsLoading || !course) return;

        const allTopics = course.units?.flatMap(u => u.topics || []) || [];
        let firstIncompleteTopic: Topic | null = null;
        
        for (let unitIndex = 0; unitIndex < (course.units || []).length; unitIndex++) {
            const unit = course.units![unitIndex];
            for (let topicIndex = 0; topicIndex < (unit.topics || []).length; topicIndex++) {
                const topic = unit.topics[topicIndex];
                if (isTopicUnlocked(topicIndex, unitIndex) && !isTopicCompleted(topic.id)) {
                    firstIncompleteTopic = topic;
                    break;
                }
            }
            if (firstIncompleteTopic) break;
        }
        
        if (!firstIncompleteTopic && allTopics.length > 0) {
            firstIncompleteTopic = allTopics[0];
        }

        setActiveTopic(firstIncompleteTopic);

    }, [isLoading, isCountsLoading, course, isTopicUnlocked, isTopicCompleted]);
    
    const courseStats = useMemo(() => {
        if (isCountsLoading || !course) {
            return { totalTests: 0, completedTests: 0, passedTests: 0, completionPercentage: 0, totalCorrect: 0, totalIncorrect: 0, totalScore: 0, classRank: 0, classTotal: 0 };
        }

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
                <div className="flex-grow min-h-0 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-slate-800 dark:to-purple-950">
                    <QuestionTest
                        topic={activeTest.topic}
                        difficulty={activeTest.difficulty}
                        testIndex={activeTest.testIndex}
                        onComplete={handleTestComplete}
                        onBack={() => setActiveTest(null)}
                    />
                </div>
            );
        }
        if (activeTopic) {
            const difficultyLevels: ('Kolay' | 'Orta' | 'Zor')[] = ['Kolay', 'Orta', 'Zor'];
            const difficultyIcons = { 'Kolay': ShieldCheck, 'Orta': Shield, 'Zor': ShieldAlert };
            const difficultyColors = { 'Kolay': 'border-green-500', 'Orta': 'border-yellow-500', 'Zor': 'border-red-500' };

             const isLevelLocked = (level: 'Kolay' | 'Orta' | 'Zor'): boolean => {
                if (level === 'Kolay') {
                    return false;
                }
                const counts = testCounts[activeTopic.id];
                const progress = topicProgress[activeTopic.id];
                if (!counts) {
                    return true;
                }
                
                const prevDifficultyKey = level === 'Orta' ? 'easy' : 'medium';
                const prevLevel = level === 'Orta' ? 'Kolay' : 'Orta';

                const totalPrevLevelTests = Math.ceil((counts[prevDifficultyKey] || 0) / 10);
                
                if (totalPrevLevelTests === 0) {
                     if (prevLevel === 'Orta') {
                        const totalEasyTests = Math.ceil((counts.easy || 0) / 10);
                         if (totalEasyTests === 0) return false;
                         const passedEasy = Object.values(progress?.easy || {}).filter(res => res.status === 'passed').length;
                         return passedEasy < totalEasyTests;
                    }
                    return false;
                }
                
                const passedPrevLevelTests = Object.values(progress?.[prevDifficultyKey] || {}).filter(res => res.status === 'passed').length;
                
                return passedPrevLevelTests < totalPrevLevelTests;
            };

            return (
                <ScrollArea className="h-full">
                    <div className="p-4 md:p-6 lg:p-8 space-y-6">
                        <Button variant="outline" size="sm" className="mb-4 md:hidden" onClick={() => setActiveTopic(null)}>
                            <ArrowLeft className="mr-2 h-4 w-4"/>Konu Listesi
                        </Button>
                        <div className="space-y-6">
                            <div className="text-center">
                                <h2 className="text-3xl font-bold font-headline">{activeTopic.title}</h2>
                                <p className="text-muted-foreground">Bir zorluk seviyesi seçerek testlere başla.</p>
                            </div>
                            {difficultyLevels.map(level => {
                                const levelKey = difficultyMap[level];
                                const counts = testCounts[activeTopic.id];
                                if (!counts || counts[levelKey] === 0) return null;
                                
                                const numTests = Math.ceil((counts[levelKey] || 0) / 10);
                                const progressForLevel = topicProgress[activeTopic.id]?.[levelKey];
                                const levelLocked = isLevelLocked(level);
                                const Icon = difficultyIcons[level];

                                return (
                                    <Card key={level} className={cn("overflow-hidden", levelLocked && "bg-muted/50 opacity-70")}>
                                        <CardHeader className={cn("flex-row items-center justify-between", difficultyColors[level].replace('border-', 'bg-').concat('/10'))}>
                                            <div className="flex items-center gap-3">
                                                <Icon className={cn("h-8 w-8", difficultyColors[level].replace('border-', 'text-'))} />
                                                <div>
                                                    <CardTitle className="text-xl">{level}</CardTitle>
                                                </div>
                                            </div>
                                            {levelLocked && <Lock className="h-5 w-5 text-muted-foreground" />}
                                        </CardHeader>
                                        <CardContent className="p-4">
                                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                                {Array.from({ length: numTests }).map((_, i) => {
                                                    const testStatus = progressForLevel?.[i]?.status;
                                                    const testIsLocked = levelLocked || (i > 0 && progressForLevel?.[i-1]?.status !== 'passed');
                                                    return (
                                                        <Button
                                                            key={i}
                                                            variant={testStatus === 'passed' ? 'default' : 'outline'}
                                                            disabled={testIsLocked}
                                                            onClick={() => setActiveTest({ topic: activeTopic, difficulty: level, testIndex: i })}
                                                            className={cn("h-16 text-lg font-semibold", testStatus === 'passed' && 'bg-green-600 hover:bg-green-700')}
                                                        >
                                                            {testIsLocked ? <Lock className="h-5 w-5"/> : testStatus === 'passed' ? <CheckCircle2 className="h-5 w-5"/> : <PlayCircle className="h-5 w-5"/>}
                                                            <span className="ml-2">T.{i + 1}</span>
                                                        </Button>
                                                    )
                                                })}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    </div>
                </ScrollArea>
            )
        }
        return (
             <div className="hidden md:flex h-full items-center justify-center text-muted-foreground bg-muted/30">
                <div className="text-center">
                    <ArrowLeft className="mx-auto h-12 w-12 mb-4"/>
                    <p className="text-lg">Başlamak için soldaki menüden bir konu seçin.</p>
                </div>
            </div>
        );
    }
    
    if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
    if (!course) return <div className="p-8 text-center">Ders bulunamadı.</div>;

    const showContent = !!(activeTest || activeTopic);

    return (
        <div className="flex flex-col h-[calc(100vh-theme(height.16))]">
            {!activeTest && (
                <div className="flex-shrink-0 border-b p-4 bg-background">
                    <Card>
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="item-1" className="border-b-0">
                                <AccordionTrigger className="p-4 hover:no-underline [&_svg]:data-[state=open]:text-primary">
                                    <div className="flex-1 text-left">
                                        <CardTitle className="text-xl">{course.title} - Genel İstatistikler</CardTitle>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-4 pb-4">
                                    {isCountsLoading ? (
                                        <div className="flex justify-center items-center h-16">
                                            <Loader2 className="h-6 w-6 animate-spin" />
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="flex items-center gap-3">
                                                <Star className="h-8 w-8 text-amber-400" />
                                                <div>
                                                    <p className="text-2xl font-bold">{courseStats.totalScore}</p>
                                                    <p className="text-xs text-muted-foreground">Toplam Puan</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Trophy className="h-8 w-8 text-violet-500" />
                                                <div>
                                                    <p className="text-2xl font-bold">{courseStats.classRank > 0 ? `${courseStats.classRank}.` : '-'}</p>
                                                    <p className="text-xs text-muted-foreground">Sınıf Sıralaması ({courseStats.classTotal} kişi)</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Activity className="h-8 w-8 text-primary" />
                                                <div>
                                                    <p className="text-2xl font-bold">{courseStats.completionPercentage}%</p>
                                                    <p className="text-xs text-muted-foreground">Tamamlama Oranı</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <CheckCheck className="h-8 w-8 text-green-500" />
                                                <div>
                                                    <p className="text-2xl font-bold">{courseStats.totalCorrect}</p>
                                                    <p className="text-xs text-muted-foreground">Toplam Doğru</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <XCircle className="h-8 w-8 text-red-500" />
                                                <div>
                                                    <p className="text-2xl font-bold">{courseStats.totalIncorrect}</p>
                                                    <p className="text-xs text-muted-foreground">Toplam Yanlış</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <CheckCircle2 className="h-8 w-8 text-green-500" />
                                                <div>
                                                    <p className="text-2xl font-bold">{courseStats.passedTests}</p>
                                                    <p className="text-xs text-muted-foreground">Başarılan Test</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Target className="h-8 w-8 text-yellow-500" />
                                                <div>
                                                    <p className="text-2xl font-bold">{courseStats.completedTests}</p>
                                                    <p className="text-xs text-muted-foreground">Çözülen Test</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <BookCopy className="h-8 w-8 text-muted-foreground" />
                                                <div>
                                                    <p className="text-2xl font-bold">{courseStats.totalTests}</p>
                                                    <p className="text-xs text-muted-foreground">Toplam Test</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </Card>
                </div>
            )}
            
            <div className="flex-grow overflow-hidden md:flex">
                {/* Mobile View */}
                <div className="h-full md:hidden">
                    {showContent ? (
                        <main className="h-full overflow-y-auto">
                            {mainContent()}
                        </main>
                    ) : (
                         <CourseSidebar
                            course={course}
                            activeTopic={activeTopic}
                            onSelectTopic={(topic) => { setActiveTopic(topic); setActiveTest(null); }}
                            isTopicUnlocked={(topicIndex, unitIndex) => isTopicUnlocked(topicIndex, unitIndex)}
                            isTopicCompleted={isTopicCompleted}
                            topicProgress={topicProgress}
                            testCounts={testCounts}
                        />
                    )}
                </div>

                {/* Desktop View */}
                <div className="hidden h-full md:flex w-full">
                    <div className="w-96 flex-shrink-0 border-r">
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
                    <main className="flex-1 overflow-y-auto">
                        {mainContent()}
                    </main>
                </div>
            </div>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <QuestionBankCoursePageComponent />
        </Suspense>
    )
}
