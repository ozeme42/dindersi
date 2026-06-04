'use client';

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, BookOpen, Wand2, LayoutTemplate, Sparkles, StickyNote, Minus, Plus } from 'lucide-react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Unit, Topic, ActivityItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import Link from 'next/link';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

async function getDefinitionsForTopic(topicId: string): Promise<{ concept: string; definition: string; }[]> {
    if (!topicId) return [];
    try {
        const q = query(collection(db, "activityItems"), where("topicId", "==", topicId), where("type", "==", "definition"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const item = doc.data() as ActivityItem;
            return {
                concept: item.content?.term || '',
                definition: item.content?.definition || ''
            };
        }).filter(item => item.concept && item.definition);
    } catch (error) {
        console.error("Error fetching definitions for topic:", error);
        return [];
    }
}

type ContentType = {
    title: string;
    htmlContent: string;
    conceptDefinitions: { concept: string; definition: string }[];
    notes: string[];
};

async function getContent(courseId: string, unitId: string, topicId?: string): Promise<ContentType | null> {
    try {
        let title = '';
        let htmlContent = '';
        let conceptDefinitions: { concept: string; definition: string }[] = [];
        let notes: string[] = [];

        if (topicId) {
            const docRef = doc(db, 'courses', courseId, 'units', unitId, 'topics', topicId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data() as Topic;
                title = data.title || 'Konu Özeti';
                htmlContent = data.htmlContent || '';
                conceptDefinitions = await getDefinitionsForTopic(topicId);
                notes = data.writingContent?.notes || [];
            }
        } else {
            const unitRef = doc(db, 'courses', courseId, 'units', unitId);
            const unitSnap = await getDoc(unitRef);
            if (unitSnap.exists()) {
                const data = unitSnap.data() as Unit;
                title = data.title || 'Ünite Özeti';
                htmlContent = data.htmlContent || '';

                const topicsSnap = await getDocs(query(collection(db, 'courses', courseId, 'units', unitId, 'topics')));
                const sortedTopics = topicsSnap.docs
                    .map(d => ({ id: d.id, ...d.data() as Topic }))
                    .sort((a, b) => (a.title || '').localeCompare(b.title || '', 'tr', { numeric: true }));

                for (const tData of sortedTopics) {
                    const tTitle = tData.title || 'Konu';
                    
                    const defs = await getDefinitionsForTopic(tData.id);
                    if (defs.length > 0) {
                        conceptDefinitions.push({ concept: '[BAŞLIK]', definition: tTitle });
                        conceptDefinitions = [...conceptDefinitions, ...defs];
                    }
                    
                    if (tData.writingContent?.notes && tData.writingContent.notes.length > 0) {
                        notes.push(`[BAŞLIK] ${tTitle.toUpperCase()}`);
                        notes = [...notes, ...tData.writingContent.notes];
                    }
                }
            }
        }
        
        if (!htmlContent && conceptDefinitions.length === 0 && notes.length === 0) return null;
        
        return { title, htmlContent, conceptDefinitions, notes };
    } catch (e) {
        console.error("Error fetching content:", e);
        return null;
    }
}


function UnitOzetDisplayPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const courseId = searchParams.get('courseId');
    const unitId = searchParams.get('unitId');
    const topicId = searchParams.get('topicId');

    const [content, setContent] = useState<ContentType | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const mainContentRef = useRef<HTMLDivElement>(null);
    const ozetContainerRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [fontSize, setFontSize] = useState(1.5); 
    const [zoomLevel, setZoomLevel] = useState(1.0);

    const colorClasses = [
        'bg-indigo-900/40 border-indigo-500/50 text-indigo-100', 
        'bg-emerald-900/40 border-emerald-500/50 text-emerald-100', 
        'bg-rose-900/40 border-rose-500/50 text-rose-100', 
        'bg-amber-900/40 border-amber-500/50 text-amber-100', 
        'bg-cyan-900/40 border-cyan-500/50 text-cyan-100',
        'bg-fuchsia-900/40 border-fuchsia-500/50 text-fuchsia-100'
    ];

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    useEffect(() => {
        if (!courseId || !unitId) {
            setError("Eksik URL parametreleri.");
            setIsLoading(false);
            return;
        }
        const fetchUnit = async () => {
            setIsLoading(true);
            const fetchedContent = await getContent(courseId, unitId, topicId || undefined);
            if (fetchedContent) {
                setContent(fetchedContent);
            } else {
                setError('Bu içerik için kayıtlı özet bulunamadı.');
            }
            setIsLoading(false);
        };
        fetchUnit();
    }, [courseId, unitId, topicId]);

    const backUrl = `/teacher/smartboard/ozetler?courseId=${courseId}`;

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-rose-500"/></div>;
    }

    if (error || !content) {
        return (
            <div className="flex h-screen items-center justify-center text-center p-8 bg-slate-950 text-white">
                 <Alert variant="destructive" className="max-w-md bg-red-950/50 border-red-900 text-red-200">
                    <AlertTitle>İçerik Yüklenemedi</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                    <div className="mt-4">
                        <Button asChild variant="outline" className="border-red-800 text-red-300 hover:bg-red-900/50">
                            <Link href={backUrl}><ArrowLeft className="mr-2 h-4 w-4"/> Geri Dön</Link>
                        </Button>
                    </div>
                </Alert>
            </div>
        )
    }

    const hasKavramlar = content.conceptDefinitions.length > 0;
    const hasNotlar = content.notes.length > 0;
    const hasOzet = !!content.htmlContent;
    
    const defaultTab = hasOzet ? 'ozet' : (hasKavramlar ? 'kavramlar' : 'notlar');
    
    return (
        <div 
            ref={mainContentRef} 
            className="w-full h-screen bg-slate-950 text-white flex flex-col overflow-hidden relative font-sans"
        >
            {/* Arkaplan Efekti */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[150px]" />
            </div>

            {/* Üst Menü (Fullscreen değilken görünür) */}
            <header className={cn(
                "flex-shrink-0 p-4 border-b border-white/10 bg-slate-900/80 backdrop-blur-md z-20 transition-all duration-300",
                isFullscreen ? "h-0 p-0 overflow-hidden border-0 opacity-0 pointer-events-none" : "h-auto opacity-100 mb-6"
            )}>
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 max-w-7xl mx-auto w-full">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-xl shadow-lg bg-gradient-to-br from-rose-500 to-indigo-600">
                            <BookOpen className="text-white h-6 w-6"/>
                        </div>
                        <h1 className="font-bold text-2xl text-slate-200 tracking-tight uppercase">
                            {content?.title || 'Özet'}
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" asChild size="sm" className="hidden md:flex border-white/10 text-slate-300 hover:text-white hover:bg-white/5 h-10">
                            <Link href={`/teacher/content-creation/edit-unit/${unitId}?courseId=${courseId}`}>
                                <Wand2 className="mr-2 h-4 w-4" /> Düzenle
                            </Link>
                        </Button>
                        <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-white/10 mr-4">
                            <Button variant="ghost" size="icon" onClick={() => setFontSize(fs => Math.max(1.0, fs - 0.2))} className="h-8 w-8 text-white hover:bg-white/10 rounded-md"><Minus className="h-4 w-4"/></Button>
                            <span className="text-[10px] font-bold text-slate-300 w-10 text-center">YAZI</span>
                            <Button variant="ghost" size="icon" onClick={() => setFontSize(fs => Math.min(fs + 0.2, 5.0))} className="h-8 w-8 text-white hover:bg-white/10 rounded-md"><Plus className="h-4 w-4"/></Button>
                        </div>
                        <FullscreenToggle elementRef={mainContentRef} className="bg-slate-800 text-slate-300 hover:text-white border-0 h-10 w-10 rounded-lg" />
                        <Button variant="ghost" asChild size="icon" className="text-slate-400 hover:text-white hover:bg-white/10 rounded-lg h-10 w-10">
                            <Link href={backUrl}><ArrowLeft className="h-5 w-5"/></Link>
                        </Button>
                    </div>
                </div>
            </header>
            
            <main className="flex-grow flex flex-col min-h-0 relative z-10 w-full max-w-7xl mx-auto px-4 overflow-y-auto pb-20">
                <Tabs defaultValue={defaultTab} className="w-full flex flex-col items-center">
                    <div className="flex justify-center mb-8 w-full">
                        <TabsList className="flex flex-wrap w-full max-w-2xl bg-slate-900/80 border border-white/20 p-1.5 rounded-[2rem] h-auto min-h-[4rem] shadow-2xl backdrop-blur-xl gap-1">
                            {hasOzet && (
                                <TabsTrigger value="ozet" className="flex-1 rounded-full text-base font-bold data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-slate-400 transition-all min-h-[3rem]">
                                    <LayoutTemplate className="w-5 h-5 mr-2" />
                                    <span>Özet</span>
                                </TabsTrigger>
                            )}
                            {hasKavramlar && (
                                <TabsTrigger value="kavramlar" className="flex-1 rounded-full text-base font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400 transition-all min-h-[3rem]">
                                    <Sparkles className="w-5 h-5 mr-2" />
                                    <span>Kavramlar</span>
                                </TabsTrigger>
                            )}
                            {hasNotlar && (
                                <TabsTrigger value="notlar" className="flex-1 rounded-full text-base font-bold data-[state=active]:bg-amber-600 data-[state=active]:text-white text-slate-400 transition-all min-h-[3rem]">
                                    <StickyNote className="w-5 h-5 mr-2" />
                                    <span>Notlar</span>
                                </TabsTrigger>
                            )}
                        </TabsList>
                    </div>

                    {hasOzet && (
                        <TabsContent value="ozet" className="w-full mt-0 focus:outline-none">
                            <div 
                                ref={ozetContainerRef} 
                                className={cn(
                                    "flex flex-col transition-all duration-300 mx-auto",
                                    isFullscreen ? "fixed inset-0 z-[100] bg-slate-950 p-4" : "w-full min-h-[75vh]"
                                )}
                            >
                                <div className={cn("flex justify-between mb-4 w-full mx-auto", !isFullscreen ? "max-w-[98%]" : "")}>
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
                                    !isFullscreen ? "w-full max-w-[98%] rounded-2xl border-4 border-slate-700 shadow-2xl min-h-[75vh]" : "w-full h-full rounded-xl border-0 shadow-none"
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
                        <TabsContent value="kavramlar" className="w-full mt-0 focus:outline-none">
                            <div className="flex flex-col w-full">
                                <h2 className="text-center font-black text-4xl md:text-5xl text-cyan-400 mb-8 drop-shadow-lg tracking-wide uppercase">
                                    {content.title || 'Kavramlar'}
                                </h2>
                                <div className="grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-6 p-2">
                                    {(() => {
                                        let conceptIndex = 1;
                                        return content.conceptDefinitions.map((item, index) => {
                                            if (item.concept === '[BAŞLIK]') {
                                                return (
                                                    <div key={index} className="col-span-full mt-6 mb-1 flex items-center gap-4 w-full">
                                                        <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent flex-1" />
                                                        <h3 className="text-xl md:text-3xl font-black text-cyan-400 tracking-wider uppercase drop-shadow-md text-center px-4">{item.definition}</h3>
                                                        <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent flex-1" />
                                                    </div>
                                                );
                                            }
                                            
                                            const style = colorClasses[(conceptIndex - 1) % colorClasses.length];
                                            const currentNum = conceptIndex++;
                                            
                                            return (
                                                <div key={index} className={cn(
                                                    "relative overflow-hidden rounded-3xl border-2 transition-all duration-300 hover:scale-[1.02] shadow-2xl flex flex-col",
                                                    style
                                                )}>
                                                    <div className="absolute top-0 right-0 bg-black/30 text-white/50 font-black text-6xl p-2 leading-none pointer-events-none select-none -mr-2 -mt-2 opacity-30">
                                                        {currentNum}
                                                    </div>
                                                    
                                                    <div className="p-6 flex flex-col h-full z-10 relative">
                                                        <h3 
                                                            className="font-black text-white mb-4 border-b border-white/10 pb-3 uppercase tracking-tight leading-tight"
                                                            style={{ fontSize: `${fontSize * 1.2}rem` }}
                                                        >
                                                            {item.concept}
                                                        </h3>
                                                        <div className="flex-grow">
                                                            <p 
                                                                className="font-medium text-white/90 leading-snug"
                                                                style={{ fontSize: `${fontSize}rem` }}
                                                            >
                                                                {item.definition}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    })()}
                                </div>
                            </div>
                        </TabsContent>
                    )}

                    {hasNotlar && (
                        <TabsContent value="notlar" className="w-full mt-0 focus:outline-none">
                            <div className="flex flex-col w-full">
                                <h2 className="text-center font-black text-4xl md:text-5xl text-amber-400 mb-8 drop-shadow-lg tracking-wide uppercase">
                                    Önemli Notlar
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-2">
                                    {(() => {
                                        let noteIndex = 1;
                                        return content.notes.map((note, index) => {
                                            if (note.startsWith('[BAŞLIK]')) {
                                                const title = note.replace('[BAŞLIK]', '').trim();
                                                return (
                                                    <div key={index} className="col-span-full mt-8 mb-2 flex items-center gap-4 w-full">
                                                        <div className="h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent flex-1" />
                                                        <h3 className="text-xl md:text-3xl font-black text-amber-400 tracking-wider uppercase drop-shadow-md text-center px-4">{title}</h3>
                                                        <div className="h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent flex-1" />
                                                    </div>
                                                );
                                            }

                                            const currentNoteNum = noteIndex++;

                                            return (
                                                <div key={index} className={cn(
                                                    "flex items-start gap-5 p-6 rounded-3xl border-2 shadow-xl bg-slate-900/60 border-slate-700/50 backdrop-blur-sm transition-all hover:bg-slate-800/60",
                                                )}>
                                                    <div className="flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-black text-3xl shadow-lg border border-amber-400/30 mt-1">
                                                        {currentNoteNum}
                                                    </div>
                                                    <p 
                                                        className="font-medium text-slate-200 leading-snug pt-1"
                                                        style={{ fontSize: `${fontSize}rem` }}
                                                    >
                                                        {note}
                                                    </p>
                                                </div>
                                            );
                                        });
                                    })()}
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
        <Suspense fallback={<div className="flex justify-center items-center h-screen bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-rose-500"/></div>}>
            <UnitOzetDisplayPage />
        </Suspense>
    )
}
