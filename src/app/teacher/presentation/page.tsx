'use client';

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, ArrowLeft, Presentation, Settings, Sun, Moon, LayoutList, Maximize2, X, Zap } from 'lucide-react';
import { doc, getDoc, collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Topic, Unit, LessonStep } from '@/lib/types';
import { LessonContentViewer } from '@/components/lesson-content-viewer';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from '@/context/theme-provider';
import { motion } from 'framer-motion';

function PresentationPageContent() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const courseId = searchParams.get('courseId');
    const unitId = searchParams.get('unitId');
    const topicId = searchParams.get('topicId');
    const courseName = searchParams.get('courseName');
    const unitName = searchParams.get('unitName');

    const [content, setContent] = useState<(Topic | Unit) & { steps?: LessonStep[] } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const mainContentRef = useRef<HTMLElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    // Settings state
    const [isSingleCardMode, setIsSingleCardMode] = useState(false);
    const [animationSpeed, setAnimationSpeed] = useState<'off' | 'slow' | 'normal' | 'fast'>('normal');
    const [savedStepIndex, setSavedStepIndex] = useState<number | null>(null);
    const { themeMode, setThemeMode } = useTheme();
    const isDarkMode = themeMode === 'dark';
    const setIsDarkMode = (checked: boolean) => setThemeMode(checked ? 'dark' : 'light');

     useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    const fetchContent = useCallback(async () => {
        setIsLoading(true);
        if (!courseId || !unitId) {
            setIsLoading(false);
            return;
        }

        try {
            let contentRef;
            if (topicId) {
                contentRef = doc(db, 'courses', courseId, 'units', unitId, 'topics', topicId);
            } else {
                contentRef = doc(db, 'courses', courseId, 'units', unitId);
            }

            const contentSnap = await getDoc(contentRef);
            
            if (contentSnap.exists()) {
                 const data = contentSnap.data();
                 const contentId = contentSnap.id;
                 let steps = data.steps || [];

                 // If it's a unit-level presentation without its own steps, aggregate from topics
                 if (!topicId && steps.length === 0) {
                     const topicsSnapshot = await getDocs(query(collection(db, `courses/${courseId}/units/${unitId}/topics`), orderBy("title")));
                     steps = topicsSnapshot.docs.flatMap(doc => (doc.data().steps || []));
                 }
                 
                 // Static flow fallback
                 try {
                     const flowRes = await fetch(`/curriculum/flows/${contentId}.json`);
                     if (flowRes.ok) {
                         const staticSteps = await flowRes.json();
                         if (staticSteps.length > 0 && steps.length === 0) {
                            steps = staticSteps;
                         }
                     }
                 } catch (e) {
                     // It's okay if flow file doesn't exist.
                 }
                
                let finalSteps = steps;
                // If user is not a teacher, filter out unpublished steps
                if (user?.role !== 'teacher' && user?.role !== 'superadmin') {
                    finalSteps = steps.filter((s: any) => s.isPublished ?? true);
                }

                 setContent({ id: contentId, title: data.title, steps: finalSteps });
            }
        } catch (error) {
            console.error("Error fetching content for presentation:", error);
        } finally {
            setIsLoading(false);
        }
    }, [courseId, unitId, topicId, user]);

    useEffect(() => {
        fetchContent();
    }, [fetchContent]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
            </div>
        );
    }
    
    if (!content) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500">
                <div className="text-center">
                    <p className="text-xl font-bold mb-4 text-slate-800">Sunum içeriği bulunamadı.</p>
                    <Button asChild variant="outline" className="border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-900">
                        <Link href="/teacher/ders-akisi">Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    // Teacher presentation doesn't track progress, so we provide dummy functions.
    const noOp = () => {};

    return (
        <div className={cn(
            "h-screen w-screen overflow-hidden flex flex-col font-sans relative transition-colors duration-500",
            isDarkMode ? "dark bg-[#020617] text-white" : "bg-slate-50 text-slate-900"
        )}>
            {/* Ambient Animated Background (Dark Mode Only) */}
            {isDarkMode && (
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    <motion.div 
                        animate={{ 
                            scale: [1, 1.2, 1],
                            opacity: [0.3, 0.5, 0.3],
                            rotate: [0, 90, 0]
                        }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-indigo-900/20 blur-[120px]" 
                    />
                    <motion.div 
                        animate={{ 
                            scale: [1, 1.5, 1],
                            opacity: [0.2, 0.4, 0.2],
                            x: [0, 100, 0]
                        }}
                        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-[20%] -right-[20%] w-[60vw] h-[60vw] rounded-full bg-purple-900/20 blur-[100px]" 
                    />
                    <motion.div 
                        animate={{ 
                            scale: [1, 1.3, 1],
                            opacity: [0.1, 0.3, 0.1],
                            y: [0, -50, 0]
                        }}
                        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -bottom-[30%] left-[20%] w-[80vw] h-[80vw] rounded-full bg-sky-900/20 blur-[150px]" 
                    />
                </div>
            )}
                    <>
                        <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-indigo-900/20 rounded-full blur-[150px] mix-blend-screen animate-pulse" style={{ animationDuration: '10s' }} />
                        <div className="absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vw] bg-purple-900/20 rounded-full blur-[150px] mix-blend-screen animate-pulse" style={{ animationDuration: '14s', animationDelay: '2s' }} />
                    </>
                ) : (
                    <>
                        <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-sky-200/40 rounded-full blur-[150px] mix-blend-multiply animate-pulse" style={{ animationDuration: '10s' }} />
                        <div className="absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vw] bg-indigo-200/40 rounded-full blur-[150px] mix-blend-multiply animate-pulse" style={{ animationDuration: '14s', animationDelay: '2s' }} />
                    </>
                )}
                <div className={cn("absolute inset-0 bg-[url('/grid-pattern.svg')]", isDarkMode ? "opacity-[0.05]" : "opacity-[0.1]")} />
            </div>

            {/* İçerik Alanı - Tam Ekran (Full-Bleed) */}
            <div className="flex-grow flex flex-col min-h-0 relative z-10 w-full h-full">
                <LessonContentViewer
                    topic={content as Topic}
                    courseId={courseId!}
                    unitId={unitId!}
                    courseTitle={courseName!}
                    unitTitle={unitName!}
                    onTopicComplete={noOp}
                    progress={undefined}
                    onProgressUpdate={noOp}
                    onMultiAnswer={noOp}
                    onAllTfAnswered={noOp}
                    isFullscreen={true} // Her zaman tam ekran gibi davran
                    isSingleCardMode={isSingleCardMode}
                    animationSpeed={animationSpeed}
                />
            </div>

            {/* Floating Dock / Araç Çubuğu (Apple macOS Style) */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 opacity-20 hover:opacity-100 focus-within:opacity-100 group">
                <div className="bg-slate-900/60 dark:bg-slate-900/60 backdrop-blur-3xl border border-white/10 p-3 rounded-[2rem] shadow-2xl flex items-center gap-4 hover:scale-105 transition-transform duration-300">
                    
                    <div className="flex items-center gap-3 px-3 pr-6 border-r border-white/10">
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl shadow-inner">
                            <Presentation className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-black text-white tracking-wide uppercase">{content.title}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{courseName}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 pl-2">
                        {/* Ayarlar Menüsü */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="bg-white/5 border border-white/10 text-white hover:bg-white hover:text-slate-900 h-12 w-12 rounded-xl transition-all">
                                    <Settings className="h-5 w-5" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent side="top" align="center" className="w-80 p-0 rounded-2xl border-white/10 shadow-2xl bg-slate-950/90 backdrop-blur-3xl mb-4 overflow-hidden">
                                <div className="p-4 border-b border-white/10 bg-white/5">
                                    <h4 className="font-bold text-white flex items-center gap-2">
                                        <Settings className="w-4 h-4 text-purple-400" /> Sunum Ayarları
                                    </h4>
                                </div>
                                <div className="p-4 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col gap-1">
                                            <Label className="text-white font-semibold flex items-center gap-2">
                                                {isDarkMode ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-400" />} 
                                                Koyu Tema
                                            </Label>
                                            <span className="text-xs text-slate-400">Akıllı tahta için önerilir.</span>
                                        </div>
                                        <Switch checked={isDarkMode} onCheckedChange={setIsDarkMode} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col gap-1">
                                            <Label className="text-white font-semibold flex items-center gap-2">
                                                {isSingleCardMode ? <Maximize2 className="w-4 h-4 text-emerald-400" /> : <LayoutList className="w-4 h-4 text-sky-400" />} 
                                                Tek Kart Modu
                                            </Label>
                                            <span className="text-xs text-slate-400">Konu anlatımında dev kart kullan.</span>
                                        </div>
                                        <Switch checked={isSingleCardMode} onCheckedChange={setIsSingleCardMode} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col gap-1">
                                            <Label className="text-white font-semibold flex items-center gap-2">
                                                <Zap className="w-4 h-4 text-amber-400" />
                                                Animasyon Hızı
                                            </Label>
                                            <span className="text-xs text-slate-400">Yazı efektlerinin hızını ayarlar.</span>
                                        </div>
                                        <Select value={animationSpeed} onValueChange={(v: any) => setAnimationSpeed(v)}>
                                            <SelectTrigger className="w-[100px] h-8 bg-white/10 border-white/20 text-white text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-white/20 text-white">
                                                <SelectItem value="off">Kapalı</SelectItem>
                                                <SelectItem value="slow">Yavaş</SelectItem>
                                                <SelectItem value="normal">Normal</SelectItem>
                                                <SelectItem value="fast">Hızlı</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>

                        <FullscreenToggle elementRef={mainContentRef} className="bg-white/5 border border-white/10 text-white hover:bg-white hover:text-slate-900 h-12 w-12 rounded-xl transition-all" />
                        
                        <Button asChild variant="ghost" size="icon" className="bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl h-12 w-12 transition-all">
                            <Link href="/teacher/ders-akisi"><ArrowLeft className="h-5 w-5" /></Link>
                        </Button>
                    </div>
                </div>
            </div>
        </main>
    );
}


export default function PresentationPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="h-12 w-12 animate-spin text-purple-600" /></div>}>
            <PresentationPageContent />
        </Suspense>
    )
}