
'use client';

import { Suspense, useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CourseSidebar } from "@/components/course-sidebar";
import { LessonContentViewer } from "@/components/lesson-content-viewer";
import { BookOpen, Loader2, ArrowLeft, Menu, Map } from "lucide-react";
import type { Course, Topic, Unit, UserProgress } from "@/lib/types";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, orderBy, query, setDoc, updateDoc, increment, writeBatch, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { FullscreenToggle } from "@/components/fullscreen-toggle";

type LocalProgress = {
    answers: { [stepIndex: number]: any };
    score: number;
}

function CoursePageContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const courseId = params['ders-adi'] as string;
    const { toast } = useToast();

    const [course, setCourse] = useState<Course | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const [activeTopic, setActiveTopic] = useState<Topic | null>(null);
    const [completedTopics, setCompletedTopics] = useState<UserProgress>({});
    const [view, setView] = useState<'map' | 'content'>('map');
    
    const [localProgressMap, setLocalProgressMap] = useState<{ [topicId: string]: LocalProgress }>({});
    const mainContentRef = useRef<HTMLElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Get a stable reference to topicId from searchParams
    const startTopicIdFromUrl = useMemo(() => searchParams.get('topicId'), [searchParams]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    const fetchCourseData = useCallback(async () => {
        if (!courseId || !user) return;
        setIsLoading(true);
        
        setView(startTopicIdFromUrl ? 'content' : 'map');

        try {
            const progressRef = doc(db, 'users', user.uid, 'progress', courseId);
            const progressSnap = await getDoc(progressRef);
            const currentProgress = progressSnap.exists() ? progressSnap.data() as UserProgress : {};
            setCompletedTopics(currentProgress);

            const courseRef = doc(db, 'courses', courseId);
            const courseSnap = await getDoc(courseRef);

            if (!courseSnap.exists()) {
                console.error("Course not found!");
                setIsLoading(false);
                return;
            }

            const courseData: Course = { id: courseSnap.id, ...courseSnap.data() } as Course;
            
            const unitsRef = collection(db, 'courses', courseId, 'units');
            const unitsQuery = query(unitsRef, orderBy("title"));
            const unitsSnap = await getDocs(unitsQuery);
            const units: Unit[] = [];

            for (const unitDoc of unitsSnap.docs) {
                const unitData: Unit = { id: unitDoc.id, ...unitDoc.data(), topics: [] } as Unit;
                
                const topicsRef = collection(db, 'courses', courseId, 'units', unitDoc.id, 'topics');
                const topicsQuery = query(topicsRef, orderBy("title"));
                const topicsSnap = await getDocs(topicsQuery);
                unitData.topics = topicsSnap.docs.map(topicDoc => ({ id: topicDoc.id, ...topicDoc.data() } as Topic));
                
                units.push(unitData);
            }

            courseData.units = units;
            setCourse(courseData);

            if (startTopicIdFromUrl) {
                const topic = courseData.units?.flatMap(u => u.topics).find(t => t.id === startTopicIdFromUrl);
                setActiveTopic(topic || null);
            } else {
                const allTopics = units.flatMap(u => u.topics);
                const firstUncompletedTopic = allTopics.find(t => !currentProgress[t.id] || currentProgress[t.id].completionCount < 1);
                
                if (firstUncompletedTopic) {
                    setActiveTopic(firstUncompletedTopic);
                } else if (allTopics.length > 0) {
                    setActiveTopic(allTopics[allTopics.length-1] || null);
                }
            }

        } catch (error) {
            console.error("Failed to fetch course data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [courseId, user, startTopicIdFromUrl]);

    useEffect(() => {
        fetchCourseData();
    }, [fetchCourseData]);
    
    const activeTopicData = useMemo(() => {
        if (!course || !activeTopic) return null;
        for (const unit of course.units ?? []) {
            if (unit.topics?.find(t => t.id === activeTopic.id)) {
                return { topic: activeTopic, unitId: unit.id, courseTitle: course.title, unitTitle: unit.title };
            }
        }
        return null;
    }, [course, activeTopic]);

    const handleSelectTopic = (topic: Topic) => {
        setActiveTopic(topic);
        setView('content');
        if (window.innerWidth < 768) {
             window.scrollTo(0,0);
        }
    };

    const onProgressUpdate = useCallback((topicId: string, newProgress: LocalProgress) => {
        setLocalProgressMap(prev => ({
            ...prev,
            [topicId]: newProgress
        }));
    }, []);

    const handleTopicComplete = async (topicId: string, score: number) => {
        if (!user || !course || !activeTopicData || isSaving) return;
        setIsSaving(true);

        const currentCompletionCount = completedTopics[topicId]?.completionCount || 0;
        
        let completionBonus = 0;
        let toastTitle = "Konu Tamamlandı!";
        let toastDescription = "Tebrikler, bu konuyu başarıyla bitirdin!";
        let totalScore = 0;

        if (currentCompletionCount < 2) {
            completionBonus = score;
            totalScore = score + completionBonus;
            toastTitle = currentCompletionCount === 0 ? "Harika! Konu Bitti!" : "Konu Tekrarı!";
            toastDescription = `Adımlardan ${score} ve bonustan ${completionBonus} puan kazandın. Toplam: ${totalScore} Puan!`;
        } else {
            totalScore = 0;
            toastDescription = "Bu konuyu daha önce tamamladığın için tekrar puan kazanmadın.";
        }

        if (user.role !== 'student') {
            setView('map');
            toast({
                title: "Konu Tamamlandı (Öğretmen Modu)",
                description: "Puanlar sadece öğrenciler için kaydedilir.",
            });
            setIsSaving(false);
            return;
        }
        
        try {
            const batch = writeBatch(db);
            const progressRef = doc(db, 'users', user.uid, 'progress', course.id);
            const newCompletionCount = currentCompletionCount + 1;
            
            batch.set(progressRef, { 
                [topicId]: {
                    completionCount: newCompletionCount,
                    lastCompleted: serverTimestamp()
                }
            }, { merge: true });

            if (totalScore > 0) {
                const userRef = doc(db, 'users', user.uid);
                batch.update(userRef, { score: increment(totalScore) });
                
                const eventRef = doc(collection(db, 'scoreEvents'));
                batch.set(eventRef, {
                    userId: user.uid,
                    points: totalScore,
                    timestamp: serverTimestamp(),
                    gameType: 'Ders Tamamlama',
                    context: `${course.title} - ${activeTopicData.topic.title} (${newCompletionCount}. kez)`,
                });
            }
            
            await batch.commit();

            setCompletedTopics(prev => ({
                ...prev,
                [topicId]: {
                    completionCount: newCompletionCount,
                    lastCompleted: new Date().toISOString()
                }
            }));
            
            toast({ title: toastTitle, description: toastDescription, duration: 5000 });

        } catch(error) {
            console.error("Error saving progress:", error);
            toast({ title: "Hata", description: "İlerleme kaydedilemedi.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
        
        setLocalProgressMap(prev => {
            const newLocalProgress = {...prev};
            delete newLocalProgress[topicId];
            return newLocalProgress;
        });

        const allTopics = course.units.flatMap(u => u.topics);
        const currentIndex = allTopics.findIndex(t => t.id === topicId);
        
        if (currentIndex !== -1 && currentIndex < allTopics.length - 1) {
             const nextTopic = allTopics[currentIndex + 1];
             if (isTopicUnlocked(nextTopic.id)) {
                 setActiveTopic(nextTopic);
                 return; 
             }
        }
        
        setView('map');
    };
    
    const isTopicCompleted = useCallback((topicId: string) => {
        return (completedTopics[topicId]?.completionCount || 0) > 0;
    }, [completedTopics]);
    
    const isTopicUnlocked = useCallback((topicId: string): boolean => {
        if (user?.role === 'teacher' || user?.role === 'superadmin') return true;
        if (!course?.units) return false;
        
        const allTopics = course.units.flatMap(u => u.topics || []) || [];
        const topicIndex = allTopics.findIndex(t => t.id === topicId);
        
        if (topicIndex <= 0) return true;
        
        const previousTopic = allTopics[topicIndex - 1];
        if (!previousTopic) return true; 
        
        return isTopicCompleted(previousTopic.id);
    }, [course?.units, isTopicCompleted, user?.role]);
    
    const handleLocalMultiAnswer = (stepIndex: number, questionIndex: number, selectedAnswer: boolean) => {
        if (!activeTopicData || !activeTopic) return;
        const topicId = activeTopic.id;

        setLocalProgressMap(prevMap => {
            const prevProgress = prevMap[topicId] || { answers: {}, score: 0 };
            const currentAnswers = prevProgress.answers[stepIndex] || {};
            if (currentAnswers[questionIndex] !== undefined) return prevMap;

            const step = activeTopicData.topic.steps?.[stepIndex];
            if (!step || step.type !== 'trueFalseList') return prevMap;

            const question = step.questions[questionIndex];
            const isCorrect = selectedAnswer === question.isTrue;
            if (isCorrect) playSound('correct'); else playSound('incorrect');

            const newAnswersForStep = { ...currentAnswers, [questionIndex]: { answer: selectedAnswer, isCorrect } };
            const newAnswers = { ...prevProgress.answers, [stepIndex]: newAnswersForStep };

            return {
                ...prevMap,
                [topicId]: { ...prevProgress, answers: newAnswers }
            };
        });
    };
    
    const handleLocalAllTfAnswered = () => {
        if (!activeTopicData || !activeTopic) return;
        const topicId = activeTopic.id;

        setLocalProgressMap(prevMap => {
            const prevProgress = prevMap[topicId];
            if (!prevProgress) return prevMap;

            const stepIndex = (activeTopicData.topic.steps || []).findIndex(s => s.type === 'trueFalseList');
            const answersForStep = prevProgress.answers[stepIndex];
            if (!answersForStep || (answersForStep as any).completed) return prevMap;

            const correctCount = Object.values(answersForStep).filter((a: any) => a.isCorrect).length;
            const points = correctCount * 20;

            const newAnswers = { ...prevProgress.answers, [stepIndex]: { ...answersForStep, completed: true } };
            
            return {
                ...prevMap,
                [topicId]: { score: prevProgress.score + points, answers: newAnswers }
            };
        });
    };


    if (isLoading) {
         return (
            <div className="flex h-screen items-center justify-center bg-slate-950">
                <Loader2 className="h-12 w-12 animate-spin text-cyan-500" />
                <span className="ml-4 text-slate-400 animate-pulse">Ders Yükleniyor...</span>
            </div>
        )
    }

    if (!course) {
        return <div className="flex h-screen items-center justify-center text-slate-400">Ders bulunamadı.</div>
    }
    
    return (
        <div className="flex flex-col h-[100dvh] bg-slate-950 overflow-hidden relative selection:bg-cyan-500/30">
             
             <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-violet-900/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-900/10 rounded-full blur-[120px]" />
            </div>

            <div className={cn("flex flex-col md:flex-row flex-grow overflow-hidden relative z-10", isFullscreen ? "h-screen" : "")}>
                
                <div className={cn(
                    "md:w-80 lg:w-96 flex-shrink-0 border-r border-white/5 bg-slate-900/50 backdrop-blur-sm transition-all duration-300 flex flex-col",
                    view === 'content' ? 'hidden md:flex' : 'flex h-full',
                    isFullscreen && 'hidden'
                )}>
                    <CourseSidebar
                        course={course}
                        activeTopic={activeTopic}
                        onSelectTopic={handleSelectTopic}
                        isTopicUnlocked={isTopicUnlocked}
                        isTopicCompleted={isTopicCompleted}
                        topicProgress={localProgressMap}
                        testCounts={{}} 
                    />
                </div>
                
                <main ref={mainContentRef} className={cn(
                    "flex-1 overflow-hidden relative flex flex-col bg-slate-950/50",
                    view === 'map' ? 'hidden md:flex' : 'flex'
                )}>
                    
                    {!isFullscreen && view === 'content' && (
                        <div className="md:hidden flex items-center justify-between p-3 bg-slate-900/90 backdrop-blur-md border-b border-white/5 z-20 shrink-0">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setView('map')}
                                className="text-slate-400 hover:text-white"
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Harita
                            </Button>
                            
                            <p className="font-semibold text-sm text-white truncate max-w-[150px]">
                                {activeTopicData?.topic.title}
                            </p>
                            
                            <FullscreenToggle elementRef={mainContentRef} className="bg-slate-800 text-slate-300 h-8 w-8" />
                        </div>
                    )}
                    
                    <div className="flex-grow overflow-y-auto relative h-full">
                        {activeTopicData ? (
                            <LessonContentViewer
                                topic={activeTopicData.topic}
                                courseId={course.id}
                                unitId={activeTopicData.unitId}
                                courseTitle={course.title}
                                unitTitle={activeTopicData.unitTitle}
                                onTopicComplete={handleTopicComplete}
                                progress={activeTopic ? localProgressMap[activeTopic.id] : undefined}
                                onProgressUpdate={onProgressUpdate}
                                isFullscreen={isFullscreen}
                                onMultiAnswer={handleLocalMultiAnswer}
                                onAllTfAnswered={handleLocalAllTfAnswered}
                            />
                        ) : (
                            <div className="flex h-full items-center justify-center text-slate-500 flex-col gap-4 p-8 text-center">
                                <div className="p-4 bg-slate-900/50 rounded-full border border-white/5">
                                    <BookOpen className="h-12 w-12 opacity-50" />
                                </div>
                                <p>Başlamak için soldaki menüden bir konu seçin.</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    )
}

export default function CoursePage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-cyan-500" /></div>}>
            <CoursePageContent />
        </Suspense>
    )
}

    