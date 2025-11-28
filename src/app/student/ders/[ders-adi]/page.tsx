

'use client';

import { Suspense, useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CourseSidebar } from "@/components/course-sidebar";
import { LessonContentViewer } from "@/components/lesson-content-viewer";
import { BookOpen, Loader2, ArrowLeft, Bug } from "lucide-react";
import type { Course, Topic, Unit, UserProgress } from "@/lib/types";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, orderBy, query, setDoc, updateDoc, increment, writeBatch, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { FullscreenToggle } from "@/components/fullscreen-toggle";
import { ErrorReportDialog } from "@/components/error-report-dialog";

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
    const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
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


    useEffect(() => {
        const fetchCourseData = async () => {
            if (!courseId || !user) return;
            setIsLoading(true);
            
            setView(startTopicIdFromUrl ? 'content' : 'map');
            setLocalProgressMap({});

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
        };

        fetchCourseData();
    }, [courseId, user, startTopicIdFromUrl]);
    
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
        mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
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
        let toastTitle = "Konu Tekrarı Tamamlandı!";
        let toastDescription = "Bu konuyu tekrar tamamladın, harika bir iş çıkardın!";
        let totalScore = 0;

        if (currentCompletionCount < 2) {
            completionBonus = score;
            totalScore = score + completionBonus;
            toastTitle = currentCompletionCount === 0 ? "Harika! Konuyu Bitirdin!" : "Konuyu Tekrar Ettin!";
            toastDescription = `Adımlardan ${score} puan ve tamamlama bonusu olarak ${completionBonus} puan kazandın. Toplam: ${totalScore} puan!`;
        } else {
            totalScore = 0;
            toastDescription = "Bu konuyu daha önce tamamladığın için tekrar puan kazanmadın, ama tekrar etmek en iyisidir!";
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
                    context: `${course.title} - ${activeTopicData.topic.title} (${newCompletionCount}. tamamlama)`,
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
            
            toast({ title: toastTitle, description: toastDescription, duration: 6000 });

        } catch(error) {
            console.error("Error saving progress and score:", error);
            toast({
                title: "Hata",
                description: "İlerleme ve puan kaydedilirken bir hata oluştu.",
                variant: "destructive"
            });
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

    const isTopicUnlocked = useCallback((topicId: string): boolean => {
        if (user?.role === 'teacher' || user?.role === 'superadmin') return true;
        if (!course) return false;
        
        const allTopics = course.units.flatMap(u => u.topics);
        const topicIndex = allTopics.findIndex(t => t.id === topicId);
        
        if (topicIndex <= 0) return true;
        
        const previousTopic = allTopics[topicIndex - 1];
        if (!previousTopic) return true;
        
        return (completedTopics[previousTopic.id]?.completionCount || 0) > 0;
    }, [course, completedTopics, user?.role]);
    
    const completedTopicsSet = useMemo(() => {
        const set = new Set<string>();
        Object.keys(completedTopics).forEach(topicId => {
            if (completedTopics[topicId].completionCount > 0) {
                set.add(topicId);
            }
        });
        return set;
    }, [completedTopics]);
    
    if (isLoading) {
         return (
            <div className="flex h-[calc(100vh-theme(height.16))] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Ders yükleniyor...</span>
            </div>
        )
    }

    if (!course) {
        return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Ders bulunamadı veya yüklenemedi.
            </div>
        )
    }
    
    return (
        <>
        <div className={cn("md:flex", isFullscreen ? "h-screen" : "min-h-[calc(100vh-theme(height.16))]")}>
            <div className={cn(
                "h-full w-full md:w-80", 
                view === 'content' ? 'hidden md:block' : 'block',
                isFullscreen && 'hidden'
            )}>
                <CourseSidebar
                    course={course}
                    activeTopic={activeTopic}
                    onSelectTopic={handleSelectTopic}
                    isTopicUnlocked={(topicIndex, unitIndex) => {
                        if (!course) return false;
                        const allTopics = course.units?.flatMap(u => u.topics || []) || [];
                        const globalIndex = course.units?.slice(0, unitIndex).reduce((acc, unit) => acc + (unit.topics?.length || 0), 0) + topicIndex;
                        if (globalIndex <= 0) return true;
                        const prevTopic = allTopics[globalIndex - 1];
                        if (!prevTopic) return true;
                        return (completedTopics[prevTopic.id]?.completionCount || 0) > 0;
                    }}
                    isTopicCompleted={(topicId) => completedTopicsSet.has(topicId)}
                    topicProgress={localProgressMap}
                    testCounts={{}} // Not needed here
                />
            </div>
            
            <main ref={mainContentRef} className={cn("flex-1 overflow-y-auto bg-muted/30", view === 'map' ? 'hidden md:block' : 'block')}>
                 <div className="h-full w-full">
                     {!isFullscreen && view === 'content' && (
                        <div className="md:hidden flex items-center justify-between p-4 bg-background border-b">
                            <Button variant="outline" onClick={() => setView('map')}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Ders Haritası
                            </Button>
                            <div className="flex items-center">
                                {activeTopicData && (
                                    <p className="font-semibold text-base truncate mr-2 text-right">{activeTopicData.topic.title}</p>
                                )}
                                 <FullscreenToggle elementRef={mainContentRef} />
                            </div>
                        </div>
                    )}
                    
                    <LessonContentViewer
                        topic={activeTopicData?.topic || null}
                        courseId={course.id}
                        unitId={activeTopicData?.unitId || ''}
                        courseTitle={course.title}
                        unitTitle={activeTopicData?.unitTitle || ''}
                        onTopicComplete={handleTopicComplete}
                        progress={activeTopic ? localProgressMap[activeTopic.id] : undefined}
                        onProgressUpdate={onProgressUpdate}
                        isFullscreen={isFullscreen}
                        user={user}
                    />
                </div>
            </main>
        </div>
        <ErrorReportDialog isOpen={isReportDialogOpen} onOpenChange={setIsReportDialogOpen} itemToReport={activeTopic} />
        </>
    )
}


export default function CoursePage() {
    return (
        <Suspense fallback={
            <div className="flex h-[calc(100vh-theme(height.16))] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <CoursePageContent />
        </Suspense>
    )
}

    