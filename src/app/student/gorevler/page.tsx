'use client';

import React, { Suspense, useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { LessonContentViewer } from "@/components/lesson-content-viewer";
import { BookOpen, Loader2, ArrowLeft, Menu, Map, ChevronLeft, GraduationCap, Gift, Trophy, CheckCircle2, Sparkles } from "lucide-react";
import type { Course, Topic, Unit, UserProgress, LessonStep } from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { FullscreenToggle } from "@/components/fullscreen-toggle";
import { doc, getDoc, collection, onSnapshot, writeBatch, serverTimestamp, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CourseSidebar } from "@/components/course-sidebar";
import { Badge } from "@/components/ui/badge";

type LocalProgress = {
    answers: { [stepIndex: number]: any };
    score: number;
}

const EMPTY_TEST_COUNTS = {};
const MemoizedSidebar = React.memo(CourseSidebar);

// --- SABİTLER ---
const TOPIC_REWARD = 10000; // Konu Başı Ödül

// --- ARKA PLAN EFEKTLERİ ---
const MissionBackground = () => (
    <div className="fixed inset-0 pointer-events-none z-0 bg-[#020617] overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" style={{ opacity: 0.05 }}/>
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[120px] animate-pulse-slow delay-1000" />
        <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[100px] mix-blend-screen" />
    </div>
);

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
    
    const isTeacher = user?.role === 'teacher' || user?.role === 'superadmin';

    // --- Sıralı ve Düzleştirilmiş Konu Listesi ---
    const allTopicsInOrder = useMemo(() => {
        if (!course) return [];
        return (course.units || [])
            .sort((a, b) => (a.title || '').localeCompare(b.title || '', 'tr', { numeric: true }))
            .flatMap(unit => 
                (unit.topics || [])
                    .sort((a, b) => (a.title || '').localeCompare(b.title || '', 'tr', { numeric: true }))
                    .map(topic => ({ ...topic, unitId: unit.id, unitTitle: unit.title }))
            );
    }, [course]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);
    
    const fetchStepsForContent = async (contentId: string): Promise<LessonStep[]> => {
        try {
            const cacheBuster = `?v=${Date.now()}`;
            const res = await fetch(`/curriculum/flows/${contentId}.json${cacheBuster}`);
            if (res.ok) {
                return await res.json();
            }
        } catch (e) {
            console.warn(`Could not fetch static flow for ${contentId}:`, e);
        }
        return [];
    };

    const fetchCourseData = useCallback(async () => {
        if (!courseId) return;
        setIsLoading(true);
        setView(startTopicIdFromUrl || unitIdFromUrl ? 'content' : 'map');

        try {
            const [progressSnap, manifestRes] = await Promise.all([
                user ? getDoc(doc(db, 'users', user.uid, 'progress', courseId)) : Promise.resolve(null),
                fetch('/curriculum/manifest.json')
            ]);
            
            if (progressSnap?.exists()) {
                setCompletedTopics(progressSnap.data() as UserProgress);
            }
            
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

            // Düzgün sıralama için üniteleri ve konuları sırala
            courseData.units?.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'tr', { numeric: true }));
            courseData.units?.forEach(unit => {
                unit.topics?.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'tr', { numeric: true }));
            });

            setCourse(courseData);

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

    const isTopicCompleted = useCallback((topicId: string) => {
        return (completedTopics[topicId]?.completionCount || 0) > 0;
    }, [completedTopics]);

    // --- Kilit Açma Mantığı ---
    const isTopicUnlocked = useCallback((topicId: string): boolean => {
        if (isTeacher) return true;
        if (allTopicsInOrder.length === 0) return false;

        const topicIndex = allTopicsInOrder.findIndex(t => t.id === topicId);
        
        if (topicIndex === -1) return false; 
        if (topicIndex === 0) return true; 

        const previousTopic = allTopicsInOrder[topicIndex - 1];
        if (!previousTopic) return true; 

        return isTopicCompleted(previousTopic.id);
    }, [allTopicsInOrder, isTopicCompleted, isTeacher]);

     // --- Aktif Konuyu Belirleme Mantığı ---
    useEffect(() => {
        if (isLoading || allTopicsInOrder.length === 0 || activeContent) return;

        const selectAndFetchContent = async (content: Topic | Unit) => {
            const steps = await fetchStepsForContent(content.id);
            setActiveContent({ ...content, steps });
        };
        
        if (startTopicIdFromUrl) {
            const initialTopic = allTopicsInOrder.find(t => t.id === startTopicIdFromUrl);
            if (initialTopic) {
                selectAndFetchContent(initialTopic);
                return;
            }
        }
        
        // Kaldığı yerden devam et
        const firstUncompletedUnlockedTopic = allTopicsInOrder.find(t => isTopicUnlocked(t.id) && !isTopicCompleted(t.id));

        if (firstUncompletedUnlockedTopic) {
            selectAndFetchContent(firstUncompletedUnlockedTopic);
        } else {
            selectAndFetchContent(allTopicsInOrder[allTopicsInOrder.length - 1]);
        }
        
    }, [isLoading, allTopicsInOrder, activeContent, isTopicUnlocked, isTopicCompleted, startTopicIdFromUrl]);

    
    const activeContentData = useMemo(() => {
        if (!course || !activeContent) return null;
        const isUnit = 'topics' in activeContent;
        let unitId = isUnit ? activeContent.id : (activeContent as any).unitId || '';
        let unitTitle = isUnit ? activeContent.title : (activeContent as any).unitTitle || '';
        
        return { 
            type: isUnit ? 'unit' : 'topic', 
            data: activeContent, 
            unitId: unitId, 
            courseTitle: course.title, 
            unitTitle: unitTitle 
        } as const;

    }, [course, activeContent]);


    const handleSelectContent = useCallback(async (content: Topic | Unit) => {
        setIsLoading(true);
        const steps = await fetchStepsForContent(content.id);
        setActiveContent({ ...content, steps });
        setView('content');
        if (window.innerWidth < 768) {
             window.scrollTo(0,0);
        }
        setIsLoading(false);
    }, []);

    const onProgressUpdate = useCallback((topicId: string, newProgress: LocalProgress) => {
        setLocalProgressMap(prev => ({ ...prev, [topicId]: newProgress }));
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
    
        // İLK DEFA MI TAMAMLANIYOR?
        if (currentCompletionCount === 0) {
            completionBonus = TOPIC_REWARD; // 10.000 Puan
            totalScore = score + completionBonus;
            toastTitle = "BÖLÜM ÖDÜLÜ!";
            toastDescription = `Tebrikler! ${TOPIC_REWARD.toLocaleString()} XP Bölüm ödülünü ve ${score} aktivite puanını kazandın.`;
        } else if (currentCompletionCount < 5) { // Tekrarlar için küçük teşvik
            totalScore = score;
            toastDescription = `Bölümü tekrar ederek ${score} puan kazandın.`;
        } else {
            totalScore = 0;
            toastDescription = "Bu bölümü çok kez tamamladın, artık puan kazandırmıyor.";
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
    
        const currentIndex = allTopicsInOrder.findIndex(t => t.id === (isUnitFlow ? null : contentId));
        
        if (currentIndex !== -1 && currentIndex < allTopicsInOrder.length - 1) {
             const nextTopic = allTopicsInOrder[currentIndex + 1];
             if (isTopicUnlocked(nextTopic.id)) {
                 handleSelectContent(nextTopic);
                 return; 
             }
        }
        setView('map');
    };
    
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
            <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-16 w-16 animate-spin text-cyan-500" />
                    <span className="text-lg font-medium text-slate-400 animate-pulse">Ders Yükleniyor...</span>
                </div>
            </div>
        )
    }

    if (!course) {
        return <div className="flex h-screen items-center justify-center text-slate-400 bg-slate-950">Ders bulunamadı.</div>
    }
    
    return (
        <div className="flex flex-col h-[100dvh] bg-slate-950 overflow-hidden relative selection:bg-cyan-500/30">
             
             <MissionBackground />

            <div className={cn("flex flex-col md:flex-row flex-grow overflow-hidden relative z-10", isFullscreen ? "h-screen" : "")}>
                
                {/* --- SIDEBAR (Sol Menü) --- */}
                <div className={cn(
                    "md:w-80 lg:w-96 flex-shrink-0 border-r border-white/5 bg-slate-900/50 backdrop-blur-md flex flex-col relative overflow-hidden transition-all duration-300",
                    view === 'content' ? 'hidden md:flex h-full' : 'flex h-full w-full',
                    isFullscreen && 'hidden'
                )}>
                    <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
                        <h2 className="font-bold text-white text-lg flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-indigo-400" />
                            {course.title}
                        </h2>
                        <Button asChild variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                            <a href="/student"><ArrowLeft className="w-5 h-5" /></a>
                        </Button>
                    </div>
                    
                    <MemoizedSidebar
                        course={course}
                        activeTopic={activeContentData?.type === 'topic' ? activeContent : null}
                        onSelectTopic={(topic) => handleSelectContent(topic)}
                        onSelectUnitFlow={(unit) => handleSelectContent(unit)}
                        isTopicUnlocked={(topicIndex, unitIndex) => {
                             const unit = (course.units || [])[unitIndex];
                             const topic = unit?.topics?.[topicIndex];
                             return topic ? isTopicUnlocked(topic.id) : false;
                        }}
                        isTopicCompleted={isTopicCompleted}
                        topicProgress={localProgressMap}
                        testCounts={EMPTY_TEST_COUNTS} 
                    />
                </div>
                
                {/* --- MAIN CONTENT (Sağ Alan) --- */}
                <main ref={mainContentRef} className={cn(
                    "flex-1 overflow-hidden relative flex flex-col bg-slate-950/30 backdrop-blur-sm",
                    view === 'map' ? 'hidden md:flex' : 'flex'
                )}>
                    
                    {/* MOBİL BAŞLIK ÇUBUĞU */}
                    {!isFullscreen && view === 'content' && (
                        <div className="md:hidden flex items-center justify-between p-3 bg-slate-900/90 backdrop-blur-xl border-b border-white/10 z-20 shrink-0 shadow-lg">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setView('map')}
                                className="text-indigo-300 hover:text-white hover:bg-indigo-500/20 gap-1"
                            >
                                <ChevronLeft className="h-5 w-5" />
                                <span className="font-bold">Dersler</span>
                            </Button>
                            
                            <div className="flex items-center gap-2 overflow-hidden px-2">
                                <GraduationCap className="w-4 h-4 text-cyan-400 shrink-0" />
                                <p className="font-bold text-sm text-white truncate max-w-[120px]">
                                    {activeContentData?.data.title}
                                </p>
                                {/* Mobil Ödül Rozeti */}
                                {activeContentData && !isTopicCompleted(activeContentData.data.id) && (
                                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px] px-1 h-5 animate-pulse">
                                        <Gift className="w-3 h-3 mr-0.5" /> 10K
                                    </Badge>
                                )}
                            </div>
                            
                            <FullscreenToggle elementRef={mainContentRef} className="bg-slate-800/50 text-slate-300 h-9 w-9 rounded-lg hover:bg-slate-700 hover:text-white transition-colors" />
                        </div>
                    )}
                    
                    {/* DESKTOP/TABLET ÖDÜL BANNER'I (İçerik alanının üstünde sabit) */}
                    {activeContentData && !isTopicCompleted(activeContentData.data.id) && (
                        <div className="w-full bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border-b border-amber-500/30 p-3 flex justify-center items-center gap-3 text-amber-300 font-bold animate-in slide-in-from-top-2 shrink-0 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
                            <div className="bg-amber-500/20 p-1.5 rounded-full animate-bounce">
                                <Gift className="w-5 h-5 text-amber-400" />
                            </div>
                            <span className="tracking-wide text-sm md:text-base">
                                Bu bölümü tamamla, <span className="text-white bg-amber-500/40 px-2 py-0.5 rounded-md border border-amber-500/50 shadow-sm mx-1">{TOPIC_REWARD.toLocaleString()} XP</span> kazan!
                            </span>
                            <div className="bg-amber-500/20 p-1.5 rounded-full animate-bounce delay-75">
                                <Sparkles className="w-5 h-5 text-amber-400" />
                            </div>
                        </div>
                    )}

                    <div className="flex-grow overflow-y-auto relative h-full scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                        {activeContentData ? (
                            <div className="w-full h-full">
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
                            </div>
                        ) : (
                            <div className="flex h-full items-center justify-center text-slate-500 flex-col gap-6 p-8 text-center animate-in fade-in zoom-in duration-500">
                                <div className="p-8 bg-slate-900/50 rounded-full border border-white/5 shadow-[0_0_50px_rgba(79,70,229,0.1)]">
                                    <BookOpen className="h-24 w-24 text-indigo-500/50" />
                                </div>
                                <div className="max-w-md space-y-2">
                                    <h3 className="text-2xl font-bold text-white">Derse Başla</h3>
                                    <p className="text-slate-400">Soldaki menüden bir konu seçerek öğrenmeye başlayabilirsin.</p>
                                </div>
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