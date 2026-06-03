'use client';

import React, { Suspense, useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { LessonContentViewer } from "@/components/lesson-content-viewer";
import { BookOpen, Loader2, ArrowLeft, Menu, Map, ChevronLeft, GraduationCap } from "lucide-react";
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

const EMPTY_TEST_COUNTS = {};
const MemoizedSidebar = React.memo(CourseSidebar);

// --- BURASI PUAN AYARI ---
// Her doğru soru için kaç puan verileceğini buradan değiştirebilirsin.
const POINTS_PER_QUESTION = 100; 

// --- ARKA PLAN EFEKTLERİ ---
const MissionBackground = () => (
    <div className="fixed inset-0 pointer-events-none z-0 bg-[#09071a] overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-indigo-900/30 rounded-full blur-[150px]" />
        <div className="absolute top-1/2 -right-20 w-[400px] h-[400px] bg-violet-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 -left-20 w-[350px] h-[350px] bg-cyan-900/15 rounded-full blur-[110px]" />
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
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

    // --- YENİ: Sıralı ve Düzleştirilmiş Konu Listesi ---
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
        setView('map');

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

    useEffect(() => {
        if (isLoading || allTopicsInOrder.length === 0 || activeContent) return;

        // Mobilde sadece içeriği preload et, view'i değiştirme.
        // URL'den gelen bir konu varsa hem içeriği yükle hem de content view'e geç.
        const preloadContent = async (content: Topic | Unit) => {
            const steps = await fetchStepsForContent(content.id);
            setActiveContent({ ...content, steps });
            // Sadece URL'den gelen konu varsa otomatik content view aç
            if (startTopicIdFromUrl) {
                setView('content');
            }
        };
        
        if (startTopicIdFromUrl) {
            const initialTopic = allTopicsInOrder.find(t => t.id === startTopicIdFromUrl);
            if (initialTopic) {
                preloadContent(initialTopic);
                return;
            }
        }
        
        // Otomatik konu seçimi — sadece preload, view değişmez
        const firstUncompletedUnlockedTopic = allTopicsInOrder.find(t => isTopicUnlocked(t.id) && !isTopicCompleted(t.id));
        const targetTopic = firstUncompletedUnlockedTopic || allTopicsInOrder[allTopicsInOrder.length - 1];
        if (targetTopic) {
            fetchStepsForContent(targetTopic.id).then(steps => {
                setActiveContent({ ...targetTopic, steps });
                // View 'map' kalır — kullanıcı tıklayınca açılır
            });
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
    
        // --- PUANLAMA MANTIĞI: SKOR + BONUS (2 KATI) ---
        if (currentCompletionCount < 2) {
            completionBonus = score; // Bonusu ham puan kadar yapıyoruz (x2 olması için)
            totalScore = score + completionBonus;
            
            toastTitle = currentCompletionCount === 0 ? "Harika! Bölüm Bitti!" : "Bölüm Tekrarı!";
            toastDescription = `Sorulardan ${score} ve Bonustan ${completionBonus} puan kazandın. Toplam: ${totalScore} Puan!`;
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
    
    // --- ÇOKTAN SEÇMELİ / TEK SORULAR İÇİN PUANLAMA (DÜZELTİLDİ: 100 PUAN) ---
    const handleLocalMultiAnswer = useCallback((stepIndex: number, questionIndex: number, selectedAnswer: boolean) => {
        if (!activeContentData) return;
        const contentId = activeContentData.data.id;

        setLocalProgressMap(prevMap => {
            const prevProgress = prevMap[contentId] || { answers: {}, score: 0 };
            const currentAnswers = prevProgress.answers[stepIndex] || {};
            
            if (currentAnswers[questionIndex] !== undefined) return prevMap;
            
            const step = activeContentData.data.steps?.[stepIndex];
            if (!step) return prevMap;

            const question = step.questions?.[questionIndex];
            // Doğru cevap kontrolü
            const isCorrect = question ? (selectedAnswer === question.isTrue) : (selectedAnswer === true);
            
            // BURADA HER DOĞRU CEVAP İÇİN 100 PUAN EKLENİYOR
            const scoreToAdd = isCorrect ? POINTS_PER_QUESTION : 0;

            const newAnswersForStep = { ...currentAnswers, [questionIndex]: { answer: selectedAnswer, isCorrect } };
            const newAnswers = { ...prevProgress.answers, [stepIndex]: newAnswersForStep };

            return {
                ...prevMap,
                [contentId]: { 
                    ...prevProgress, 
                    score: prevProgress.score + scoreToAdd, // Puan eklendi
                    answers: newAnswers 
                }
            };
        });
    }, [activeContentData]);
     
    // --- TRUE/FALSE LİSTE SORULARI İÇİN PUANLAMA (DÜZELTİLDİ: 100 PUAN) ---
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
            
            // BURADA HER DOĞRU İÇİN 100 PUAN HESAPLANIYOR
            const points = correctCount * POINTS_PER_QUESTION;

            const newAnswers = { ...prevProgress.answers, [targetStepIndex]: { ...answersForStep, completed: true } };
            
            return {
                ...prevMap,
                [contentId]: { score: prevProgress.score + points, answers: newAnswers }
            };
        });
    }, [activeContentData]);


    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#09071a] text-white">
                <div className="fixed inset-0 pointer-events-none">
                    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-900/30 rounded-full blur-[130px]" />
                </div>
                <div className="relative flex flex-col items-center gap-5">
                    <div className="relative w-20 h-20">
                        <div className="absolute inset-0 rounded-2xl bg-indigo-600/20 blur-xl animate-pulse" />
                        <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-900/60 to-purple-900/60 border border-indigo-500/30 flex items-center justify-center shadow-2xl">
                            <BookOpen className="h-9 w-9 text-indigo-400" />
                        </div>
                    </div>
                    <p className="text-indigo-300/60 font-black text-xs tracking-[0.3em] uppercase animate-pulse">Ders Yükleniyor</p>
                </div>
            </div>
        );
    }

    if (!course) {
        return <div className="flex h-screen items-center justify-center text-slate-500 bg-[#09071a] font-bold">Ders bulunamadı.</div>;
    }
    
    return (
        <div className="flex flex-col h-[100dvh] bg-[#09071a] overflow-hidden relative selection:bg-indigo-500/30">
             
             <MissionBackground />

            <div className={cn("flex flex-col md:flex-row flex-grow overflow-hidden relative z-10", isFullscreen ? "h-screen" : "")}>
                
                {/* --- SIDEBAR --- */}
                <div className={cn(
                    "md:w-80 lg:w-96 flex-shrink-0 border-r border-white/8 bg-[#0d0b22]/80 backdrop-blur-xl flex flex-col relative overflow-hidden transition-all duration-300",
                    view === 'content' ? 'hidden md:flex h-full' : 'flex h-full w-full',
                    isFullscreen && 'hidden'
                )}>
                    {/* Sidebar header */}
                    <div className="relative p-4 border-b border-white/8 flex items-center gap-3 bg-[#09071a]/60 backdrop-blur-xl shrink-0">
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
                        <Button asChild variant="ghost" size="icon" className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all shrink-0">
                            <a href="/student/soru-bankasi"><ArrowLeft className="w-4 h-4" /></a>
                        </Button>
                        <div className="flex-1 min-w-0">
                            <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] leading-none mb-0.5">Ders</p>
                            <h2 className="font-black text-white text-sm truncate leading-none flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                {course.title}
                            </h2>
                        </div>
                    </div>
                    
                    <MemoizedSidebar
                        course={course}
                        activeTopic={activeContentData?.type === 'topic' ? activeContent : null}
                        onSelectTopic={(topic) => handleSelectContent(topic)}
                        onSelectUnitFlow={(unit) => handleSelectContent(unit)}
                        isTopicUnlocked={isTopicUnlocked}
                        isTopicCompleted={isTopicCompleted}
                        topicProgress={localProgressMap}
                        testCounts={EMPTY_TEST_COUNTS} 
                    />
                </div>
                
                {/* --- MAIN CONTENT --- */}
                <main ref={mainContentRef} className={cn(
                    "flex-1 overflow-hidden relative flex flex-col bg-slate-950/30 backdrop-blur-sm",
                    view === 'map' ? 'hidden md:flex' : 'flex'
                )}>
                    
                    {/* MOBİL BAŞLIK */}
                    {!isFullscreen && view === 'content' && (
                        <div className="md:hidden relative flex items-center justify-between px-3 py-2.5 bg-[#09071a]/80 backdrop-blur-2xl border-b border-white/8 z-20 shrink-0">
                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setView('map')}
                                className="h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-indigo-300 hover:text-white hover:bg-indigo-500/15 gap-1.5 font-black text-xs"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Dersler
                            </Button>
                            
                            <div className="flex items-center gap-1.5 overflow-hidden px-2">
                                <GraduationCap className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                <p className="font-black text-xs text-white truncate">
                                    {activeContentData?.data.title}
                                </p>
                            </div>
                            
                            <FullscreenToggle elementRef={mainContentRef} className="bg-white/5 border border-white/10 text-slate-400 h-9 w-9 rounded-xl hover:bg-white/10 hover:text-white transition-colors" />
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
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center bg-[#09071a]">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-2xl bg-indigo-600/20 blur-xl animate-pulse" />
                    <div className="relative w-16 h-16 rounded-2xl bg-indigo-900/30 border border-indigo-500/20 flex items-center justify-center">
                        <BookOpen className="h-7 w-7 text-indigo-400" />
                    </div>
                </div>
            </div>
        }>
            <PageContent />
        </Suspense>
    );
}