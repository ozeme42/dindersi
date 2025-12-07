import { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Download, Plus, Minus, BookOpen, StickyNote, AlertTriangle } from 'lucide-react';
import type { Topic, YazilacaklarContent, ActivityItem } from '@/lib/types';
import Link from 'next/link';
import { useParams, notFound } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FullscreenToggle } from '@/components/fullscreen-toggle';

async function getTopicYazilacaklar(topicId: string): Promise<YazilacaklarContent | null> {
    if (!topicId) return null;
    try {
        const definitionsQuery = query(
            collection(db, "activityItems"), 
            where("topicId", "==", topicId), 
            where("type", "==", "definition")
        );
        const definitionsSnapshot = await getDocs(definitionsQuery);
        const conceptDefinitions = definitionsSnapshot.docs.map(doc => {
            const item = doc.data() as ActivityItem;
            return {
                concept: item.content.term || '',
                definition: item.content.definition || ''
            };
        }).filter(item => item.concept && item.definition);

        // Fetching notes from the topic document itself
        let notes: string[] = [];
        const allCourses = await getDocs(collection(db, 'courses'));
        let topicDocSnap;
        for (const courseDoc of allCourses.docs) {
            const allUnits = await getDocs(collection(db, `courses/${courseDoc.id}/units`));
            for (const unitDoc of allUnits.docs) {
                const topicRef = doc(db, `courses/${courseDoc.id}/units/${unitDoc.id}/topics`, topicId);
                const tempSnap = await getDoc(topicRef);
                if (tempSnap.exists()) {
                    topicDocSnap = tempSnap;
                    break;
                }
            }
            if (topicDocSnap) break;
        }

        if (topicDocSnap && topicDocSnap.exists()) {
             notes = (topicDocSnap.data() as Topic).writingContent?.notes || [];
        }

        if (conceptDefinitions.length === 0 && notes.length === 0) {
            return null;
        }
        
        return { conceptDefinitions, notes };
    } catch (error) {
        console.error("Error fetching yazilacaklar content:", error);
        return null;
    }
}

async function getTopicTitle(topicId: string): Promise<string | null> {
    try {
         const allCourses = await getDocs(collection(db, 'courses'));
        for (const courseDoc of allCourses.docs) {
            const allUnits = await getDocs(collection(db, `courses/${courseDoc.id}/units`));
            for (const unitDoc of allUnits.docs) {
                const topicRef = doc(db, `courses/${courseDoc.id}/units/${unitDoc.id}/topics`, topicId);
                const tempSnap = await getDoc(topicRef);
                if (tempSnap.exists()) {
                    return (tempSnap.data() as Topic).title;
                }
            }
        }
        return null;
    } catch (e) {
        return null;
    }
}


function YazilacaklarDisplayPage({ content, topicTitle }: { content: YazilacaklarContent | null, topicTitle: string | null }) {
    'use client';
    const [isDownloading, setIsDownloading] = useState(false);
    const mainContentRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [fontSize, setFontSize] = useState(1);

    useEffect(() => {
        const handleFullscreenChange = () => {
            const isCurrentlyFullscreen = !!document.fullscreenElement;
            setIsFullscreen(isCurrentlyFullscreen);
             if (!isCurrentlyFullscreen) {
                setFontSize(1);
            }
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);
    
    const handleDownloadPDF = async () => {
        if (!content || !topicTitle) return;
        setIsDownloading(true);

        try {
            const html2pdf = (await import('html2pdf.js')).default;
            const element = document.createElement('div');
            element.style.padding = '20px';
            element.style.fontFamily = 'Arial, sans-serif';
            element.style.color = '#000';

            let htmlContent = `<h1 style="color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px;">${topicTitle}</h1>`;

            if (content.conceptDefinitions.length > 0) {
                htmlContent += `<h3 style="color: #0056b3; margin-top: 20px; background: #f0f0f0; padding: 8px;">Kavramlar ve Tanımları</h3>`;
                content.conceptDefinitions.forEach((item, i) => {
                    htmlContent += `<div style="margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px;"><strong style="color: #000; font-size: 14px;">${i + 1}. ${item.concept}</strong><div style="color: #444; font-size: 12px; margin-top: 4px;">${item.definition}</div></div>`;
                });
            }

            if (content.notes.length > 0) {
                htmlContent += `<h3 style="color: #d97706; margin-top: 20px; background: #fff7ed; padding: 8px;">Önemli Notlar</h3>`;
                content.notes.forEach((note, i) => {
                    htmlContent += `<div style="margin-bottom: 10px; display: flex;"><span style="font-weight: bold; color: #d97706; margin-right: 10px;">${i + 1}.</span><div style="color: #333; font-size: 12px;">${note}</div></div>`;
                });
            }
            
            htmlContent += `<div style="margin-top: 40px; font-size: 10px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 10px;">Bu döküman Değerler Oyunu platformundan oluşturulmuştur.</div>`;
            element.innerHTML = htmlContent;

            const opt = { margin: 10, filename: `${topicTitle.replace(/\s+/g, '_')}_Yazilacaklar.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas:  { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
            await html2pdf().set(opt).from(element).save();

        } catch (err) {
            console.error("PDF Oluşturma Hatası:", err);
            alert("PDF oluşturulurken bir hata meydana geldi.");
        } finally {
            setIsDownloading(false);
        }
    };
    
    const backUrl = `/`;
    const increaseFontSize = () => setFontSize(fs => Math.min(fs + 0.1, 2.5));
    const decreaseFontSize = () => setFontSize(fs => Math.max(0.8, fs - 0.1));

    if (!content) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
                <div className="bg-slate-900/50 p-8 rounded-3xl border border-red-500/20 max-w-md w-full backdrop-blur-sm">
                    <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                    <p className="text-red-400 mb-6 font-medium text-lg">Bu konu için "Yazılacaklar" içeriği bulunamadı.</p>
                    <Button asChild className="bg-white/10 hover:bg-white/20 text-white border border-white/10 w-full">
                        <Link href={backUrl}><ArrowLeft className="mr-2 h-4 w-4"/> Ana Sayfaya Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }
    
    const KavramlarContent = (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-20">
            {content.conceptDefinitions.length > 0 ? content.conceptDefinitions.map((item, index) => (
                <div 
                    key={index} 
                    className="group relative bg-slate-900/60 border border-white/5 rounded-2xl p-5 backdrop-blur-md hover:border-cyan-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-900/10 flex flex-col"
                >
                    <div className="flex items-center gap-3 mb-3 border-b border-white/5 pb-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-sm">
                            {index + 1}
                        </div>
                        <h3 
                            style={{ fontSize: `${fontSize * 1.1}rem` }} 
                            className="font-bold text-slate-100 leading-tight"
                        >
                            {item.concept}
                        </h3>
                    </div>
                    <p 
                        style={{ fontSize: `${fontSize}rem` }} 
                        className="text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors"
                    >
                        {item.definition}
                    </p>
                </div>
            )) : (
                <div className="col-span-full text-center py-12 text-slate-500 bg-slate-900/30 rounded-2xl border border-dashed border-white/5">
                    Bu konu için kayıtlı tanım bulunamadı.
                </div>
            )}
        </div>
    );

    const NotlarContent = (
        <div className="space-y-3 pb-20">
             {content.notes.length > 0 ? content.notes.map((note, index) => (
                <div 
                    key={index} 
                    className="flex gap-4 p-5 rounded-2xl bg-slate-900/60 border border-white/5 hover:bg-slate-900/80 transition-colors backdrop-blur-md items-start"
                >
                    <div className="flex-shrink-0 mt-0.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-bold text-sm">
                            {index + 1}
                        </div>
                    </div>
                    
                    <p 
                        style={{ fontSize: `${fontSize}rem` }} 
                        className={cn("text-slate-300 leading-relaxed pt-1", isFullscreen && "text-lg")}
                    >
                        {note}
                    </p>
                </div>
            )) : (
                <div className="text-center py-12 text-slate-500 bg-slate-900/30 rounded-2xl border border-dashed border-white/5">
                    Bu konu için önemli not bulunamadı.
                </div>
            )}
        </div>
    );
    
    return (
        <div 
            ref={mainContentRef} 
            className={cn(
                "w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden",
                isFullscreen ? "p-4" : "pb-12"
            )}
        >
             {!isFullscreen && (
                <div className="fixed inset-0 pointer-events-none z-0">
                    <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-sky-600/5 rounded-full blur-[100px]" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-violet-600/5 rounded-full blur-[100px]" />
                </div>
            )}

            <div className={cn(
                "sticky top-0 z-30 w-full border-b border-white/5 bg-slate-950/80 backdrop-blur-xl transition-all",
                !isFullscreen && "pt-4"
            )}>
                <div className="container mx-auto px-4 pb-4">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            {!isFullscreen && (
                                <Button asChild variant="ghost" size="icon" className="shrink-0 hover:bg-white/5 text-slate-400 hover:text-white rounded-xl">
                                    <Link href={backUrl}><ArrowLeft className="h-5 w-5"/></Link>
                                </Button>
                            )}
                            <h1 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 truncate">
                                {topicTitle || 'Yazılacaklar'}
                            </h1>
                        </div>
                        <div className="w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
                            <div className="flex items-center gap-2 min-w-max px-1">
                                <div className="flex items-center bg-slate-900/80 border border-white/10 rounded-xl p-1">
                                    <Button variant="ghost" size="icon" onClick={decreaseFontSize} className="h-8 w-8 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg"><Minus className="h-4 w-4"/></Button>
                                    <span className="text-xs font-mono text-slate-500 w-8 text-center">{Math.round(fontSize * 100)}%</span>
                                    <Button variant="ghost" size="icon" onClick={increaseFontSize} className="h-8 w-8 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg"><Plus className="h-4 w-4"/></Button>
                                </div>
                                <div className="w-px h-6 bg-white/10 mx-1" />
                                <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={isDownloading} className="bg-slate-900/80 border-white/10 text-slate-300 hover:text-white hover:bg-sky-500/10 hover:border-sky-500/30 transition-colors h-10 px-4 rounded-xl gap-2">
                                    {isDownloading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Download className="h-4 w-4" />}
                                    <span className="hidden sm:inline">PDF İndir</span>
                                </Button>
                                <FullscreenToggle elementRef={mainContentRef} className="bg-slate-900/80 border-white/10 text-slate-300 hover:text-white hover:bg-white/10 h-10 w-10 rounded-xl" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-grow container mx-auto px-4 pt-6 relative z-10">
                <Tabs defaultValue="kavramlar" className="w-full h-full flex flex-col">
                    <div className="flex justify-center mb-6">
                        <TabsList className="bg-slate-900/80 border border-white/10 p-1 rounded-xl h-auto">
                            <TabsTrigger value="kavramlar" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 text-slate-400 px-6 py-2 rounded-lg transition-all duration-300 flex items-center gap-2">
                                <BookOpen className="h-4 w-4" /> Kavramlar
                            </TabsTrigger>
                            <TabsTrigger value="notlar" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400 text-slate-400 px-6 py-2 rounded-lg transition-all duration-300 flex items-center gap-2">
                                <StickyNote className="h-4 w-4" /> Notlar
                            </TabsTrigger>
                        </TabsList>
                    </div>
                    <TabsContent value="kavramlar" className="flex-grow outline-none data-[state=inactive]:hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {KavramlarContent}
                    </TabsContent>
                    <TabsContent value="notlar" className="flex-grow outline-none data-[state=inactive]:hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {NotlarContent}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

async function Page({ params }: { params: { courseId: string; unitId: string; topicId: string; } }) {
    const { topicId } = params;
    
    if (!topicId) {
        notFound();
    }
    
    const [content, topicTitle] = await Promise.all([
        getTopicYazilacaklar(topicId),
        getTopicTitle(topicId)
    ]);
    
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-950 flex justify-center items-center"><Loader2 className="h-12 w-12 animate-spin text-cyan-500"/></div>}>
            <YazilacaklarDisplayPage content={content} topicTitle={topicTitle} />
        </Suspense>
    );
}

export default Page;
