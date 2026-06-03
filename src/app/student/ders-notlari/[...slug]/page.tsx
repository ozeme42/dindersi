'use client';

import { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, BookOpen, StickyNote, LayoutTemplate, Plus, Minus } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ConceptExplanationPlayer, ContentListPlayer, FlashcardItem, FLASHCARD_THEMES } from '@/components/lesson-content-viewer';

// Helper to fetch definitions directly from Firestore
async function getDefinitionsForTopic(topicId: string) {
    if (!topicId) return [];
    try {
        const q = query(collection(db, "activityItems"), where("topicId", "==", topicId), where("type", "==", "definition"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const item = doc.data();
            return {
                concept: item.content.term || '',
                definition: item.content.definition || ''
            };
        }).filter(item => item.concept && item.definition);
    } catch (error) {
        console.error("Error fetching definitions for topic:", error);
        return [];
    }
}

interface TopicContent {
    title: string;
    courseName: string;
    conceptDefinitions: { concept: string, definition: string }[];
    notes: string[];
    htmlContent: string;
}

export function DersNotlariDisplayPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string[];
    const [courseId, unitId, topicId] = slug || [];

    const [content, setContent] = useState<TopicContent | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const mainContentRef = useRef<HTMLDivElement>(null);
    const ozetContainerRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1.0);
    const [flippedCards, setFlippedCards] = useState<boolean[]>([]);

    const backUrl = `/student/ders-notlari`;

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const fetchContent = useCallback(async () => {
        if (!topicId || !courseId || !unitId) {
            setError("Geçersiz URL.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            let courseData: any = null;
            if (courseId) {
                const courseSnap = await getDoc(doc(db, 'courses', courseId));
                if (courseSnap.exists()) courseData = courseSnap.data();
            }

            if (topicId === 'unit-summary') {
                const unitRef = doc(db, 'courses', courseId, 'units', unitId);
                const unitSnap = await getDoc(unitRef);
                if (unitSnap.exists()) {
                    const unitData = unitSnap.data() as any;
                    
                    const topicsSnap = await getDocs(query(collection(db, 'courses', courseId, 'units', unitId, 'topics')));
                    
                    const sortedTopics = topicsSnap.docs
                        .map(d => ({ id: d.id, ...d.data() as any }))
                        .sort((a, b) => (a.title || '').localeCompare(b.title || '', 'tr', { numeric: true }));

                    let allDefinitions: { concept: string; definition: string }[] = [];
                    let allNotes: string[] = [];

                    for (const tData of sortedTopics) {
                        const tTitle = tData.title || 'Konu';
                        
                        const defs = await getDefinitionsForTopic(tData.id);
                        if (defs.length > 0) {
                            allDefinitions.push({ concept: '[BAŞLIK]', definition: tTitle });
                            allDefinitions = [...allDefinitions, ...defs];
                        }
                        
                        if (tData.writingContent?.notes && tData.writingContent.notes.length > 0) {
                            allNotes.push(`[BAŞLIK] ${tTitle.toUpperCase()}`);
                            allNotes = [...allNotes, ...tData.writingContent.notes];
                        }
                    }

                    setContent({
                        title: `${unitData.title || 'Ünite'} Özeti`,
                        courseName: courseData?.title || 'Ders',
                        conceptDefinitions: allDefinitions,
                        notes: allNotes,
                        htmlContent: unitData.htmlContent || ''
                    });
                    setFlippedCards(new Array(allDefinitions.length).fill(false));

                } else {
                    throw new Error('Ünite veritabanında bulunamadı.');
                }
            } else {
                const topicRef = doc(db, 'courses', courseId, 'units', unitId, 'topics', topicId);
                const topicSnap = await getDoc(topicRef);
                
                if (topicSnap.exists()) {
                    const topicData = topicSnap.data() as any;
                    
                    const definitions = await getDefinitionsForTopic(topicId);
                    const notes = topicData.writingContent?.notes || [];
                    const htmlContent = topicData.htmlContent || '';

                    if (definitions.length === 0 && notes.length === 0 && !htmlContent) {
                         throw new Error('Bu konu için hiçbir içerik bulunamadı.');
                    }
                    
                    setContent({ 
                        title: topicData.title,
                        courseName: courseData?.title || 'Ders',
                        conceptDefinitions: definitions, 
                        notes: notes,
                        htmlContent: htmlContent
                    });
                    setFlippedCards(new Array(definitions.length).fill(false));

                } else {
                     throw new Error('Konu veritabanında bulunamadı.');
                }
            }

        } catch (e: any) {
            setError(e.message || 'İçerik alınırken bir hata oluştu.');
        } finally {
            setIsLoading(false);
        }
    }, [topicId, courseId, unitId]);

    useEffect(() => {
        fetchContent();
    }, [fetchContent]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-cyan-500"/>
                <p className="text-slate-400 animate-pulse">İçerik Yükleniyor...</p>
            </div>
        );
    }

    if (error || !content) {
         return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
                <div className="bg-slate-900/50 p-8 rounded-3xl border border-red-500/20 max-w-md w-full backdrop-blur-sm">
                    <p className="text-red-400 mb-6 font-medium text-lg">{error || "Bu konu için içerik bulunmuyor."}</p>
                    <Button asChild className="bg-white/10 hover:bg-white/20 text-white border border-white/10 w-full">
                        <Link href={backUrl}><ArrowLeft className="mr-2 h-4 w-4"/> Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }
    
    // Hangi tabların gösterileceğini belirleyelim
    const hasKavramlar = content.conceptDefinitions.length > 0;
    const hasNotlar = content.notes.length > 0;
    const hasOzet = !!content.htmlContent;
    
    // İlk dolu tabı varsayılan yap
    const defaultTab = hasOzet ? 'ozet' : (hasKavramlar ? 'kavramlar' : 'notlar');
    
    return (
        <div 
            ref={mainContentRef} 
            className={cn(
                "w-full min-h-screen bg-slate-950 flex flex-col relative overflow-hidden transition-all", 
                !isFullscreen ? "pb-24 md:pb-8" : "pb-0"
            )}
        >
             {!isFullscreen && (
                <div className="fixed inset-0 pointer-events-none z-0 opacity-50">
                    <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-cyan-400/10 rounded-full blur-[120px]" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-violet-400/10 rounded-full blur-[120px]" />
                </div>
            )}

            <div className={cn(
                "sticky top-0 z-30 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur-xl transition-all shadow-md",
                !isFullscreen && "pt-4"
            )}>
                 <div className="container mx-auto px-4 pb-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 overflow-hidden">
                            {!isFullscreen && (
                                <Button asChild size="sm" className="shrink-0 bg-white/10 text-white hover:bg-white/20 font-extrabold rounded-xl h-10 px-4 transition-all">
                                    <Link href={backUrl} className="flex items-center gap-2">
                                        <ArrowLeft className="h-5 w-5 stroke-[2px]"/>
                                        <span className="hidden sm:inline">Geri</span>
                                    </Link>
                                </Button>
                            )}
                            <h1 className="text-lg md:text-xl font-black text-white truncate drop-shadow-md tracking-wide">
                                {content?.title || 'Ders Notu'}
                            </h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="[&_button]:!bg-white/10 [&_button]:!text-white [&_button]:!border [&_button]:!border-white/20 [&_button]:!h-10 [&_button]:!w-10 [&_button]:!rounded-xl [&_button:hover]:!bg-white/20">
                                <FullscreenToggle elementRef={mainContentRef} />
                            </div>
                        </div>
                    </div>
                 </div>
            </div>
            
            <main className={cn(
                "flex-grow flex flex-col min-h-0 relative z-10 transition-all duration-300",
                !isFullscreen ? "container mx-auto px-4 pt-6" : "p-0"
            )}>
                <Tabs defaultValue={defaultTab} className="w-full h-full flex flex-col items-center">
                    <div className="flex justify-center mb-6 w-full px-2">
                        <TabsList className="flex flex-wrap w-full max-w-2xl bg-slate-900/80 border border-white/20 p-1.5 rounded-[2rem] h-auto min-h-[4rem] shadow-2xl backdrop-blur-xl gap-1">
                            {hasOzet && (
                                <TabsTrigger value="ozet" className="flex-1 rounded-full text-sm md:text-base font-bold data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-slate-400 transition-all min-h-[3rem]">
                                    <LayoutTemplate className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                                    <span>Özet</span>
                                </TabsTrigger>
                            )}
                            {hasKavramlar && (
                                <TabsTrigger value="kavramlar" className="flex-1 rounded-full text-sm md:text-base font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400 transition-all min-h-[3rem]">
                                    <BookOpen className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                                    <span>Kavramlar</span>
                                </TabsTrigger>
                            )}
                            {hasNotlar && (
                                <TabsTrigger value="notlar" className="flex-1 rounded-full text-sm md:text-base font-bold data-[state=active]:bg-amber-600 data-[state=active]:text-white text-slate-400 transition-all min-h-[3rem]">
                                    <StickyNote className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                                    <span>Notlar</span>
                                </TabsTrigger>
                            )}
                        </TabsList>
                    </div>

                    {hasOzet && (
                        <TabsContent value="ozet" className="w-full mt-0 h-full flex-grow flex flex-col data-[state=inactive]:hidden animate-in fade-in zoom-in-95 duration-300 focus:outline-none">
                            <div 
                                ref={ozetContainerRef} 
                                className={cn(
                                    "flex flex-col flex-grow transition-all duration-300",
                                    isFullscreen ? "fixed inset-0 z-[100] bg-slate-950 p-4" : "w-full"
                                )}
                            >
                                <div className={cn("flex justify-between mb-2 w-full mx-auto px-2", !isFullscreen ? "max-w-[98%]" : "")}>
                                    <div className="text-cyan-400 font-black text-sm flex items-center">
                                        <LayoutTemplate className="w-4 h-4 mr-1.5" />
                                        Etkileşimli Özet
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center bg-slate-800/80 rounded-lg p-1 border border-white/10">
                                            <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="h-8 w-8 text-white hover:bg-white/10 rounded-md"><Minus className="h-4 w-4"/></Button>
                                            <span className="text-[10px] font-bold text-slate-300 w-10 text-center">ZOOM</span>
                                            <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.1))} className="h-8 w-8 text-white hover:bg-white/10 rounded-md"><Plus className="h-4 w-4"/></Button>
                                        </div>
                                        <div className="[&_button]:!bg-cyan-600 [&_button]:!text-white [&_button]:!border [&_button]:!border-cyan-400 [&_button]:!h-10 [&_button]:!px-3 [&_button]:!w-auto [&_button]:!rounded-lg [&_button:hover]:!bg-cyan-500 shadow-lg">
                                            <FullscreenToggle elementRef={ozetContainerRef} />
                                        </div>
                                    </div>
                                </div>
                                <div className={cn(
                                    "mx-auto flex-grow flex flex-col bg-white overflow-hidden",
                                    !isFullscreen ? "w-full max-w-[98%] rounded-2xl border-4 border-slate-700 shadow-2xl mb-12 min-h-[75vh]" : "w-full h-full rounded-xl border-0 shadow-none"
                                )}>
                                    <iframe
                                        srcDoc={content.htmlContent + `<style>body { zoom: ${zoomLevel}; transform-origin: top center; padding: 20px; font-family: sans-serif; }</style>`}
                                        className="w-full h-full flex-grow border-0 bg-white"
                                        title={content.title}
                                        sandbox="allow-scripts allow-same-origin"
                                    />
                                </div>
                            </div>
                        </TabsContent>
                    )}

                    {hasKavramlar && (
                        <TabsContent value="kavramlar" className="w-full mt-0 flex-grow data-[state=inactive]:hidden animate-in fade-in zoom-in-95 duration-300 focus:outline-none">
                            <ConceptExplanationPlayer 
                                title="Kavramlar ve Tanımları" 
                                items={content.conceptDefinitions} 
                                isFullscreen={isFullscreen} 
                            />
                        </TabsContent>
                    )}

                    {hasNotlar && (
                        <TabsContent value="notlar" className="w-full mt-0 flex-grow data-[state=inactive]:hidden animate-in fade-in zoom-in-95 duration-300 focus:outline-none">
                            <div className="w-full max-w-6xl mx-auto px-2 mt-4 pb-20">
                                <div className="relative p-4 rounded-2xl border border-white/10 bg-[#161233] flex-shrink-0 mb-8 w-full text-center overflow-hidden shadow-lg">
                                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
                                    <h2 className="font-black text-white text-xl md:text-3xl uppercase tracking-wide">Önemli Notlar</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 p-2">
                                    {content.notes.length > 0 ? (() => {
                                        let noteIndex = 1;
                                        return content.notes.map((note, index) => {
                                            if (note.startsWith('[BAŞLIK]')) {
                                                const title = note.replace('[BAŞLIK]', '').trim();
                                                return (
                                                    <div key={index} className="col-span-1 md:col-span-2 mt-8 mb-2 flex items-center gap-4 w-full">
                                                        <div className="h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent flex-1" />
                                                        <h3 className="text-lg md:text-2xl font-black text-amber-400 tracking-wider uppercase drop-shadow-md text-center px-2">{title}</h3>
                                                        <div className="h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent flex-1" />
                                                    </div>
                                                );
                                            }

                                            const cardStyles = [
                                                { bg: 'bg-sky-950/50 hover:bg-sky-900/60', border: 'border-sky-500/30', circle: 'bg-gradient-to-br from-sky-500 to-blue-600 border-sky-400/30 shadow-[0_0_15px_rgba(14,165,233,0.4)]' },
                                                { bg: 'bg-rose-950/50 hover:bg-rose-900/60', border: 'border-rose-500/30', circle: 'bg-gradient-to-br from-rose-500 to-pink-600 border-rose-400/30 shadow-[0_0_15px_rgba(244,63,94,0.4)]' },
                                                { bg: 'bg-amber-950/50 hover:bg-amber-900/60', border: 'border-amber-500/30', circle: 'bg-gradient-to-br from-amber-500 to-orange-600 border-amber-400/30 shadow-[0_0_15px_rgba(245,158,11,0.4)]' },
                                                { bg: 'bg-emerald-950/50 hover:bg-emerald-900/60', border: 'border-emerald-500/30', circle: 'bg-gradient-to-br from-emerald-500 to-green-600 border-emerald-400/30 shadow-[0_0_15px_rgba(16,185,129,0.4)]' },
                                                { bg: 'bg-violet-950/50 hover:bg-violet-900/60', border: 'border-violet-500/30', circle: 'bg-gradient-to-br from-violet-500 to-purple-600 border-violet-400/30 shadow-[0_0_15px_rgba(139,92,246,0.4)]' },
                                                { bg: 'bg-cyan-950/50 hover:bg-cyan-900/60', border: 'border-cyan-500/30', circle: 'bg-gradient-to-br from-cyan-500 to-teal-600 border-cyan-400/30 shadow-[0_0_15px_rgba(6,182,212,0.4)]' },
                                            ];
                                            const style = cardStyles[(noteIndex - 1) % cardStyles.length];
                                            const currentNoteNum = noteIndex++;

                                            return (
                                                <div key={index} className={cn("flex items-start gap-4 md:gap-5 p-5 md:p-6 rounded-3xl border-2 shadow-xl backdrop-blur-sm transition-all duration-300 hover:scale-[1.01]", style.bg, style.border)}>
                                                    <div className={cn("flex-shrink-0 flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-2xl text-white font-black text-2xl md:text-3xl border mt-1", style.circle)}>
                                                        {currentNoteNum}
                                                    </div>
                                                    <p className="font-medium text-slate-200 leading-snug pt-1 text-base md:text-lg">
                                                        {note}
                                                    </p>
                                                </div>
                                            );
                                        });
                                    })() : (
                                        <div className="col-span-full flex items-center justify-center h-64 text-slate-500 text-lg md:text-xl">
                                            Bu konu için not bulunamadı.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </TabsContent>
                    )}
                </Tabs>
            </main>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-950 flex justify-center items-center"><Loader2 className="h-12 w-12 animate-spin text-cyan-500"/></div>}>
            <DersNotlariDisplayPage />
        </Suspense>
    )
}
