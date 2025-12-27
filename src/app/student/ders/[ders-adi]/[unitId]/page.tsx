

'use client';

import React, { Suspense, useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { LessonContentViewer } from "@/components/lesson-content-viewer";
import { BookOpen, Loader2, ArrowLeft, Menu, Map } from "lucide-react";
import type { Course, Topic, Unit, UserProgress, LessonStep } from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { FullscreenToggle } from "@/components/fullscreen-toggle";
import { doc, getDoc, collection, onSnapshot, writeBatch, serverTimestamp, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CourseSidebar } from "@/components/course-sidebar";

type LocalProgress = {
    answers: { [stepIndex: number]: any };
    score: number;
}

// SABİT OBJELER
const EMPTY_TEST_COUNTS = {};
const MemoizedSidebar = React.memo(CourseSidebar);

function PageContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const courseId = params['ders-adi'] as string;
    const unitIdFromUrl = params.unitId as string;
    const { toast } = useToast();

    const [course, setCourse] = useState<Course | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const [activeContent, setActiveContent] = useState<Topic | Unit | null>(null);

    const [completedTopics, setCompletedTopics] = useState<UserProgress>({});
    const [view, setView] = useState<'map' | 'content'>('map');
    
    const [localProgressMap, setLocalProgressMap] = useState<{ [topicId: string]: LocalProgress }>({});
    const mainContentRef = useRef<HTMLElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

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
        if (!courseId) return;
        setIsLoading(true);
        setView(startTopicIdFromUrl || unitIdFromUrl ? 'content' : 'map');

        try {
            if (user) {
                // We use getDoc for initial load and then rely on onTopicComplete to update state.
                // This prevents re-fetching on every progress update which might be too frequent.
                // For a more real-time experience, an onSnapshot could be used here.
                const progressRef = doc(db, 'users', user.uid, 'progress', courseId);
                const progressSnap = await getDoc(progressRef);
                if (progressSnap.exists()) {
                    setCompletedTopics(progressSnap.data() as UserProgress);
                }
            }
            
            const manifestRes = await fetch('/curriculum/manifest.json');
            if (!manifestRes.ok) throw new Error("Müfredat manifestosu bulunamadı.");
            const manifest = await manifestRes.json();

            let courseData: Course | undefined;
            for (const group of manifest.classGroups) {
                const foundCourse = group.courses.find((c: Course) => c.id === courseId);
                if (foundCourse) {
                    courseData = foundCourse;
                    break;
                }
            }

            if (!courseData) {
                console.error("Ders manifest dosyası içinde bulunamadı!");
                setIsLoading(false);
                return;
            }
            
            const enrichedUnits = await Promise.all((courseData.units || []).map(async (unit: any) => {
                let unitSteps: LessonStep[] = [];
                // Check for both direct flow content and existence in the flows directory
                if (unit.hasFlowContent) {
                     try {
                        const unitFlowRes = await fetch(`/curriculum/flows/${unit.id}.json`);
                        if (unitFlowRes.ok) unitSteps = await unitFlowRes.json();
                     } catch (e) { console.warn(`No flow file for unit ${unit.id}`) }
                }
                const enrichedTopics = await Promise.all((unit.topics || []).map(async (topic: any) => {
                    let topicSteps: LessonStep[] = [];
                    if (topic.hasFlowContent) {
                         try {
                            const topicFlowRes = await fetch(`/curriculum/flows/${topic.id}.json`);
                            if (topicFlowRes.ok) topicSteps = await topicFlowRes.json();
                         } catch(e) { console.warn(`No flow file for topic ${topic.id}`) }
                    }
                    return { ...topic, steps: topicSteps };
                }));
                return { ...unit, steps: unitSteps, topics: enrichedTopics };
            }));

            courseData.units = enrichedUnits;
            setCourse(courseData);

            // Determine active content
            if (startTopicIdFromUrl) {
                const topic = courseData.units?.flatMap(u => u.topics).find(t => t.id === startTopicIdFromUrl);
                setActiveContent(topic || null);
            } else if (unitIdFromUrl) {
                const unit = courseData.units?.find(u => u.id === unitIdFromUrl);
                if (unit) {
                    // If the unit itself has steps, show it. Otherwise, find the first topic.
                    if (unit.steps && unit.steps.length > 0) {
                         setActiveContent(unit);
                    } else {
                         const firstUncompletedTopicInUnit = unit.topics.find((t: Topic) => !(completedTopics[t.id]?.completionCount > 0));
                         setActiveContent(firstUncompletedTopicInUnit || unit.topics[0] || null);
                    }
                }
            } else {
                const allTopics = courseData.units.flatMap((u: Unit) => u.topics || []);
                const firstUncompletedTopic = allTopics.find((t: Topic) => !(completedTopics[t.id]?.completionCount > 0));
                setActiveContent(firstUncompletedTopic || allTopics[0] || null);
            }

        } catch (error: any) {
            console.error("Ders verisi alınırken hata:", error);
            toast({ title: "Veri Hatası", description: error.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [courseId, user, startTopicIdFromUrl, unitIdFromUrl, toast]);


    useEffect(() => {
        fetchCourseData();
    }, [fetchCourseData]);
    
    const activeContentData = useMemo(() => {
        if (!course || !activeContent) return null;
        
        const isUnit = 'topics' in activeContent;
        
        let unitId: string;
        let unitTitle: string;

        if (isUnit) {
            unitId = activeContent.id;
            unitTitle = activeContent.title;
        } else {
             const parentUnit = course.units?.find(u => u.topics?.some(t => t.id === activeContent.id));
             unitId = parentUnit?.id || '';
             unitTitle = parentUnit?.title || '';
        }

        return { 
            type: isUnit ? 'unit' : 'topic', 
            data: activeContent, 
            unitId: unitId, 
            courseTitle: course.title, 
            unitTitle: unitTitle 
        } as const;

    }, [course, activeContent]);


    const handleSelectTopic = useCallback((topic: Topic) => {
        setActiveContent(topic);
        setView('content');
        if (window.innerWidth < 768) {
             window.scrollTo(0,0);
        }
    }, []);
    
     const handleSelectUnitFlow = (unit: Unit) => {
        setActiveContent(unit);
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

    const handleTopicComplete = async (contentId: string, score: number) => {
        if (!user || !course || !activeContentData || isSaving) return;
        setIsSaving(true);
    
        const isUnitFlow = activeContentData.type === 'unit';
        const currentCompletionData = completedTopics[contentId];
        const currentCompletionCount = currentCompletionData ? (currentCompletionData.completionCount || 0) : 0;
        
        let completionBonus = 0;
        let toastTitle = "İçerik Tamamlandı!";
        let toastDescription = "Tebrikler, bu bölümü başarıyla bitirdin!";
        let totalScore = 0;
    
        if (currentCompletionCount < 2) {
            completionBonus = isUnitFlow ? score + 50 : score;
            totalScore = score + completionBonus;
            toastTitle = currentCompletionCount === 0 ? "Harika! Bölüm Bitti!" : "Bölüm Tekrarı!";
            toastDescription = `Adımlardan ${score} ve bonustan ${completionBonus} puan kazandın. Toplam: ${totalScore} Puan!`;
        } else {
            totalScore = 0;
            toastDescription = "Bu bölümü daha önce tamamladığın için tekrar puan kazanmadın.";
        }
    
        if (user.role !== 'student') {
            setView('map');
            toast({ title: "Bölüm Tamamlandı (Öğretmen Modu)", description: "Puanlar sadece öğrenciler için kaydedilir." });
            setIsSaving(false);
            return;
        }
        
        try {
            const batch = writeBatch(db);
            const progressRef = doc(db, 'users', user.uid, 'progress', course.id);
            const newCompletionCount = currentCompletionCount + 1;
            
            batch.set(progressRef, { 
                [contentId]: {
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
                    gameType: isUnitFlow ? 'Ünite Tamamlama' : 'Ders Tamamlama',
                    context: `${course.title} - ${activeContentData.data.title} (${newCompletionCount}. kez)`,
                });
            }
            
            await batch.commit();
            
            // Optimistically update local state
             setCompletedTopics(prev => ({
                ...prev,
                [contentId]: {
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
            delete newLocalProgress[contentId];
            return newLocalProgress;
        });
    
        const allTopics = course.units.flatMap(u => u.topics || []);
        const currentIndex = allTopics.findIndex(t => t.id === (isUnitFlow ? null : contentId));
        
        if (currentIndex !== -1 && currentIndex < allTopics.length - 1) {
             const nextTopic = allTopics[currentIndex + 1];
             if (isTopicUnlocked(nextTopic.id)) {
                 setActiveContent(nextTopic);
                 return; 
             }
        }
        setView('map');
    };
    
    const isTopicCompleted = useCallback((topicId: string) => {
        return (completedTopics[topicId]?.completionCount || 0) > 0;
    }, [completedTopics]);
    
    const isTopicUnlocked = useCallback((topicId: string): boolean => {
        if (!user || user.role === 'teacher' || user.role === 'superadmin') return true;
        if (!course?.units) return false;
        const allTopics = course.units.flatMap(u => u.topics || []);
        if (allTopics.length === 0) return true;
        const topicIndex = allTopics.findIndex(t => t.id === topicId);
        if (topicIndex <= 0) return true;
        const previousTopic = allTopics[topicIndex - 1];
        if (!previousTopic) return true;
        return isTopicCompleted(previousTopic.id);
    }, [course?.units, isTopicCompleted, user?.role]);
    
    const handleLocalMultiAnswer = useCallback((stepIndex: number, questionIndex: number, selectedAnswer: boolean) => {
        if (!activeContentData) return;
        const contentId = activeContentData.data.id;

        setLocalProgressMap(prevMap => {
            const prevProgress = prevMap[contentId] || { answers: {}, score: 0 };
            const currentAnswers = prevProgress.answers[stepIndex] || {};
            if (currentAnswers[questionIndex] !== undefined) return prevMap;
            
            const step = activeContentData.data.steps?.[stepIndex];
            if (!step || step.type !== 'trueFalseList') return prevMap;

            const question = step.questions[questionIndex];
            const isCorrect = selectedAnswer === question.isTrue;
            if (isCorrect) playSound('correct'); else playSound('incorrect');

            const newAnswersForStep = { ...currentAnswers, [questionIndex]: { answer: selectedAnswer, isCorrect } };
            const newAnswers = { ...prevProgress.answers, [stepIndex]: newAnswersForStep };

            return {
                ...prevMap,
                [contentId]: { ...prevProgress, answers: newAnswers }
            };
        });
    }, [activeContentData]);
     
    const handleLocalAllTfAnswered = useCallback((stepIndex?: number) => {
        if (!activeContentData) return;
        const contentId = activeContentData.data.id;

        setLocalProgressMap(prevMap => {
            const prevProgress = prevMap[contentId];
            if (!prevProgress) return prevMap;

            const targetStepIndex = stepIndex ?? (activeContentData.data.steps || []).findIndex(s => s.type === 'trueFalseList');
            if (targetStepIndex === -1) return prevMap;
            
            const answersForStep = prevProgress.answers[targetStepIndex];
            
            if (!answersForStep || answersForStep.completed) return prevMap;

            const correctCount = Object.values(answersForStep).filter((a: any) => a.isCorrect).length;
            const points = correctCount * 20;

            const newAnswers = { ...prevProgress.answers, [targetStepIndex]: { ...answersForStep, completed: true } };
            
            return {
                ...prevMap,
                [contentId]: { score: prevProgress.score + points, answers: newAnswers }
            };
        });
    }, [activeContentData]);


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
                    "md:w-80 lg:w-96 flex-shrink-0 border-r border-white/5 bg-slate-900/50 backdrop-blur-sm flex flex-col relative overflow-hidden",
                    view === 'content' ? 'hidden md:flex h-full' : 'flex h-full',
                    isFullscreen && 'hidden'
                )}>
                    <MemoizedSidebar
                        course={course}
                        activeTopic={activeContentData?.type === 'topic' ? activeContent : null}
                        onSelectTopic={handleSelectTopic}
                        onSelectUnitFlow={handleSelectUnitFlow}
                        isTopicUnlocked={(topicIndex, unitIndex) => {
                            const allTopics = course.units?.flatMap(u => u.topics || []) || [];
                            const globalIndex = course.units?.slice(0, unitIndex).reduce((acc, unit) => acc + (unit.topics?.length || 0), 0) + topicIndex;
                            if (globalIndex <= 0) return true;
                            const prevTopic = allTopics[globalIndex - 1];
                            return prevTopic ? isTopicCompleted(prevTopic.id) : true;
                        }}
                        isTopicCompleted={isTopicCompleted}
                        topicProgress={localProgressMap}
                        testCounts={EMPTY_TEST_COUNTS} 
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
                                {activeContentData?.data.title}
                            </p>
                            
                            <FullscreenToggle elementRef={mainContentRef} className="bg-slate-800 text-slate-300 h-8 w-8" />
                        </div>
                    )}
                    
                    <div className="flex-grow overflow-y-auto relative h-full">
                        {activeContentData ? (
                            <LessonContentViewer
                                topic={activeContentData.data}
                                courseId={course.id}
                                unitId={activeContentData.unitId}
                                courseTitle={activeContentData.courseTitle}
                                unitTitle={activeContentData.unitTitle}
                                onTopicComplete={handleTopicComplete}
                                progress={localProgressMap[activeContentData.data.id]}
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
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-cyan-500" /></div>}>
            <PageContent />
        </Suspense>
    );
}


