'use client';

import { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Wand2, ArrowLeft, Download, Plus, Minus } from 'lucide-react';
import type { Topic, YazilacaklarContent, ActivityItem } from '@/lib/types';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FullscreenToggle } from '@/components/fullscreen-toggle';

async function getDefinitionsForTopic(topicId: string): Promise<{ concept: string; definition: string; }[]> {
    if (!topicId) return [];
    try {
        const q = query(collection(db, "activityItems"), where("topicId", "==", topicId), where("type", "==", "definition"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const item = doc.data() as ActivityItem;
            return {
                concept: item.content.term || '',
                definition: item.content.definition || ''
            };
        }).filter(item => item.concept && item.definition);
    } catch (error) {
        console.warn("Error fetching definitions from Firestore:", error);
        return [];
    }
}

function YazilacaklarDisplayPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const topicId = searchParams.get('topicId');
    const courseId = searchParams.get('courseId');
    const unitId = searchParams.get('unitId');
    const isEmbedded = searchParams.get('embedded') === 'true';

    const [topic, setTopic] = useState<Topic | null>(null);
    const [content, setContent] = useState<YazilacaklarContent | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const mainContentRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [fontSize, setFontSize] = useState(1.5); 

    const colorClasses = [
        'bg-indigo-900/40 border-indigo-500/50 text-indigo-100', 
        'bg-emerald-900/40 border-emerald-500/50 text-emerald-100', 
        'bg-rose-900/40 border-rose-500/50 text-rose-100', 
        'bg-amber-900/40 border-amber-500/50 text-amber-100', 
        'bg-cyan-900/40 border-cyan-500/50 text-cyan-100',
        'bg-fuchsia-900/40 border-fuchsia-500/50 text-fuchsia-100'
    ];

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const fetchContent = useCallback(async () => {
        if (!topicId || !courseId || !unitId) {
            setError("Eksik bilgi: Gerekli konu detayları bulunamadı.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            let topicData: Topic | null = null;
            let definitions: { concept: string; definition: string }[] = [];
            let notes: string[] = [];

            // 1. Try Firestore
            try {
                const topicRef = doc(db, 'courses', courseId, 'units', unitId, 'topics', topicId);
                const topicSnap = await getDoc(topicRef);
                if (topicSnap.exists()) {
                    topicData = topicSnap.data() as Topic;
                    definitions = await getDefinitionsForTopic(topicId);
                    notes = topicData.writingContent?.notes || [];
                    if (definitions.length === 0 && topicData.writingContent?.conceptDefinitions) {
                        definitions = topicData.writingContent.conceptDefinitions;
                    }
                }
            } catch (fsErr) {
                console.warn("Firestore fetch error, falling back to static:", fsErr);
            }

            // 2. Static JSON fallback (/curriculum/yazilacaklar/${topicId}.json)
            if (definitions.length === 0 && notes.length === 0) {
                try {
                    const staticRes = await fetch(`/curriculum/yazilacaklar/${topicId}.json`);
                    if (staticRes.ok) {
                        const staticJson = await staticRes.json();
                        if (Array.isArray(staticJson.conceptDefinitions)) {
                            definitions = staticJson.conceptDefinitions;
                        }
                        if (Array.isArray(staticJson.notes)) {
                            notes = staticJson.notes;
                        }
                    }
                } catch (staticErr) {
                    console.warn("Static json fetch error:", staticErr);
                }
            }

            // 3. Fallback for Topic Title if topicData wasn't found in Firestore
            if (!topicData) {
                let foundTitle = '';
                try {
                    const mRes = await fetch('/curriculum/manifest.json');
                    if (mRes.ok) {
                        const mData = await mRes.json();
                        for (const cg of mData.classGroups || []) {
                            for (const c of cg.courses || []) {
                                for (const u of c.units || []) {
                                    for (const t of u.topics || []) {
                                        if (t.id === topicId) {
                                            foundTitle = t.title;
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }
                } catch (mErr) {}
                topicData = {
                    id: topicId,
                    title: foundTitle || 'Konu Kavram Panosu',
                    courseId,
                    unitId,
                } as Topic;
            }

            setTopic(topicData);
            setContent({ conceptDefinitions: definitions, notes: notes });
        } catch (e: any) {
            setError('İçerik alınırken bir hata oluştu.');
        } finally {
            setIsLoading(false);
        }
    }, [topicId, courseId, unitId]);

    useEffect(() => {
        fetchContent();
    }, [fetchContent]);

    const handleDownloadPDF = () => {
        if (!content || !topic) return;
        setIsDownloading(true);

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            let htmlContent = `
                <html>
                <head>
                    <title>${topic.title} - Yazılacaklar & Kavramlar</title>
                    <style>
                        body { font-family: sans-serif; padding: 40px; font-size: 18px; color: #1e293b; }
                        h1 { text-align: center; font-size: 32px; margin-bottom: 30px; color: #0f172a; }
                        h2 { border-bottom: 2px solid #000; padding-bottom: 10px; margin-top: 30px; color: #334155; }
                        .concept-item { margin-bottom: 15px; page-break-inside: avoid; }
                        .concept-term { font-weight: bold; font-size: 20px; color: #0f172a; }
                        .note-item { margin-bottom: 15px; page-break-inside: avoid; display: flex; }
                        .bullet { margin-right: 10px; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <h1>${topic.title}</h1>
            `;

            if (content.conceptDefinitions.length > 0) {
                htmlContent += `<h2>Kavramlar</h2>`;
                content.conceptDefinitions.forEach(item => {
                    htmlContent += `
                        <div class="concept-item">
                            <span class="concept-term">${item.concept}:</span> ${item.definition}
                        </div>
                    `;
                });
            }

            if (content.notes.length > 0) {
                htmlContent += `<h2>Önemli Notlar</h2>`;
                content.notes.forEach(note => {
                    htmlContent += `
                        <div class="note-item">
                            <span class="bullet">•</span>
                            <span>${note}</span>
                        </div>
                    `;
                });
            }

            htmlContent += `</body></html>`;

            printWindow.document.write(htmlContent);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                 printWindow.print();
                 printWindow.close();
            }, 500);
        }
        
        setIsDownloading(false);
    };
    
    const studioUrl = `/teacher/smartboard/yazilacaklar?courseId=${courseId || ''}&unitId=${unitId || ''}&topicId=${topicId || ''}`;
    const backUrl = studioUrl;
    
    const increaseFontSize = () => setFontSize(fs => Math.min(fs + 0.2, 5.0));
    const decreaseFontSize = () => setFontSize(fs => Math.max(1.0, fs - 0.2));

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-cyan-500"/></div>;
    }
    if (error) {
         return (
            <div className="flex h-screen items-center justify-center text-center p-8 bg-slate-950 text-white">
                <div>
                    <p className="text-red-400 text-2xl mb-8 font-bold">{error}</p>
                    <Button asChild size="lg" className="text-xl px-8 py-6 bg-slate-800 hover:bg-slate-700 border border-slate-600"><Link href={backUrl}>Geri Dön</Link></Button>
                </div>
            </div>
        );
    }
    if (!content || (content.conceptDefinitions.length === 0 && content.notes.length === 0)) {
        return (
             <div className="flex h-screen items-center justify-center text-center p-8 bg-slate-950 text-white">
                <div className="max-w-md space-y-4">
                    <h2 className="text-2xl font-bold text-slate-200">{topic?.title || 'Kavram Panosu'}</h2>
                    <p className="text-slate-400 text-base">Bu konu için henüz kayıtlı kavram veya özet not bulunamadı.</p>
                    <div className="flex justify-center gap-3 pt-2">
                        <Button asChild variant="outline" className="border-white/10 text-slate-300">
                            <Link href={backUrl}><ArrowLeft className="mr-2 h-4 w-4" /> Geri</Link>
                        </Button>
                        <Button asChild className="bg-purple-600 hover:bg-purple-500 text-white font-bold">
                            <Link href={studioUrl}><Wand2 className="mr-2 h-4 w-4" /> Stüdyoda Oluştur</Link>
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // --- KAVRAMLAR İÇERİĞİ ---
    const KavramlarContent = (
        <div className="flex flex-col">
            <h2 className="text-center font-black text-4xl md:text-5xl text-cyan-400 mb-8 drop-shadow-lg tracking-wide uppercase">
                {topic?.title || 'Kavramlar'}
            </h2>
            {/* Dinamik Grid (Auto-fill) */}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-6 p-2">
                {content.conceptDefinitions.length > 0 ? content.conceptDefinitions.map((item, index) => (
                    <div key={index} className={cn(
                        "relative overflow-hidden rounded-3xl border-2 transition-all duration-300 hover:scale-[1.02] shadow-2xl flex flex-col",
                        colorClasses[index % colorClasses.length]
                    )}>
                        {/* Numara Rozeti */}
                        <div className="absolute top-0 right-0 bg-black/30 text-white/50 font-black text-6xl p-2 leading-none pointer-events-none select-none -mr-2 -mt-2 opacity-30">
                            {index + 1}
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
                )) : (
                    <div className="col-span-full flex items-center justify-center h-64 text-slate-500 text-2xl">
                        Bu konu için kayıtlı tanım bulunamadı.
                    </div>
                )}
            </div>
             {/* KAYDIRMA BOŞLUĞU: %85 ekran boyu boşluk */}
             <div className="h-[85vh]"></div>
        </div>
    );

    // --- NOTLAR İÇERİĞİ ---
    const NotlarContent = (
         <div className="flex flex-col">
            <h2 className="text-center font-black text-4xl md:text-5xl text-amber-400 mb-8 drop-shadow-lg tracking-wide uppercase">
                Önemli Notlar
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-2">
                {content.notes.length > 0 ? content.notes.map((note, index) => (
                    <div key={index} className={cn(
                        "flex items-start gap-5 p-6 rounded-3xl border-2 shadow-xl bg-slate-900/60 border-slate-700/50 backdrop-blur-sm transition-all hover:bg-slate-800/60",
                    )}>
                        <div className="flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-black text-3xl shadow-lg border border-amber-400/30 mt-1">
                            {index + 1}
                        </div>
                        <p 
                            className="font-medium text-slate-200 leading-snug pt-1"
                            style={{ fontSize: `${fontSize}rem` }}
                        >
                            {note}
                        </p>
                    </div>
                )) : (
                     <div className="col-span-full flex items-center justify-center h-64 text-slate-500 text-2xl">
                        Kayıtlı özet not bulunamadı.
                    </div>
                )}
            </div>
             {/* KAYDIRMA BOŞLUĞU: %85 ekran boyu boşluk */}
             <div className="h-[85vh]"></div>
        </div>
    );
    
    return (
        <div 
            ref={mainContentRef} 
            className="w-full h-screen bg-slate-950 text-white flex flex-col overflow-hidden relative"
        >
             {/* Arkaplan Efekti */}
             <div className="absolute inset-0 z-0 pointer-events-none">
                 <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[150px]" />
                 <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[150px]" />
             </div>

             {/* Üst Menü */}
             <header className={cn(
                 "flex-shrink-0 p-4 border-b border-white/10 bg-slate-900/80 backdrop-blur-md z-20 transition-all duration-300",
                 (isFullscreen || isEmbedded) ? "h-0 p-0 overflow-hidden border-0 opacity-0 pointer-events-none" : "h-auto opacity-100"
             )}>
                 <div className="flex flex-col md:flex-row items-center justify-between gap-4 max-w-7xl mx-auto w-full">
                     <h1 className="font-bold text-2xl text-slate-200 hidden md:block">Akıllı Tahta Modu</h1>
                     
                      <div className="flex items-center gap-3">
                        <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-white/10 mr-4">
                            <Button variant="ghost" size="icon" onClick={decreaseFontSize} className="h-10 w-10 text-slate-300 hover:text-white hover:bg-white/10"><Minus className="h-6 w-6"/></Button>
                            <span className="text-xs font-bold text-slate-500 w-12 text-center uppercase">Boyut</span>
                            <Button variant="ghost" size="icon" onClick={increaseFontSize} className="h-10 w-10 text-slate-300 hover:text-white hover:bg-white/10"><Plus className="h-6 w-6"/></Button>
                        </div>

                        <Button variant="outline" asChild className="border-white/10 hover:bg-white/10 hover:text-white text-slate-300">
                            <Link href={backUrl}>
                                <ArrowLeft className="mr-2 h-5 w-5"/> Geri
                            </Link>
                        </Button>
                         <Button variant="outline" asChild className="border-white/10 hover:bg-white/10 hover:text-white text-slate-300 hidden sm:flex">
                            <Link href={studioUrl}>
                                <Wand2 className="mr-2 h-5 w-5" /> Stüdyoda Düzenle
                            </Link>
                        </Button>
                        <Button variant="secondary" onClick={handleDownloadPDF} disabled={isDownloading} className="hidden sm:flex">
                            {isDownloading ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Download className="mr-2 h-5 w-5" />}
                            PDF
                        </Button>
                        <FullscreenToggle elementRef={mainContentRef} className="h-11 w-11 bg-indigo-600 hover:bg-indigo-500 text-white border-0 shadow-lg shadow-indigo-900/50" />
                    </div>
                </div>
            </header>
            
            {/* Ana İçerik */}
            <main className="flex-grow overflow-y-auto relative z-10 p-4 md:p-8 scroll-smooth pb-0">
                <Tabs defaultValue="kavramlar" className="w-full flex flex-col items-center">
                    
                    {/* Sekme Butonları */}
                    <div className="flex justify-center mb-8 w-full">
                         <TabsList className="grid grid-cols-2 w-full max-w-lg bg-slate-900/90 border border-white/20 p-1.5 rounded-full h-16 shadow-2xl backdrop-blur-xl">
                            <TabsTrigger value="kavramlar" className="rounded-full text-lg font-bold data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-slate-400 transition-all">
                                KAVRAMLAR ({content.conceptDefinitions.length})
                            </TabsTrigger>
                            <TabsTrigger value="notlar" className="rounded-full text-lg font-bold data-[state=active]:bg-amber-600 data-[state=active]:text-white text-slate-400 transition-all">
                                ÖNEMLİ NOTLAR ({content.notes.length})
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="kavramlar" className="w-full mt-0 data-[state=inactive]:hidden animate-in fade-in zoom-in-95 duration-300 focus:outline-none">
                        {KavramlarContent}
                    </TabsContent>
                    <TabsContent value="notlar" className="w-full mt-0 data-[state=inactive]:hidden animate-in fade-in zoom-in-95 duration-300 focus:outline-none">
                        {NotlarContent}
                    </TabsContent>
                </Tabs>
            </main>

            {/* FLOATING ACTION BAR */}
            <div className={cn(
                "fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-500",
                (isFullscreen || isEmbedded) ? "translate-y-0 opacity-100" : "translate-y-32 opacity-0 pointer-events-none"
            )}>
                 <div className="flex items-center gap-2 p-2 rounded-full bg-black/40 border border-white/10 shadow-2xl backdrop-blur-md transition-all hover:bg-black/60">
                    <Button variant="ghost" size="icon" onClick={decreaseFontSize} className="h-10 w-10 md:h-12 md:w-12 rounded-full text-white hover:bg-white/10">
                        <Minus className="h-5 w-5 md:h-6 md:w-6"/>
                    </Button>
                    <div className="w-px h-6 bg-white/20 mx-1"></div>
                    <span className="text-xs font-bold text-slate-300 uppercase px-2 shadow-black drop-shadow-md">Boyut</span>
                    <div className="w-px h-6 bg-white/20 mx-1"></div>
                    <Button variant="ghost" size="icon" onClick={increaseFontSize} className="h-10 w-10 md:h-12 md:w-12 rounded-full text-white hover:bg-white/10">
                        <Plus className="h-5 w-5 md:h-6 md:w-6"/>
                    </Button>
                    {!isEmbedded && (
                        <>
                            <div className="w-px h-8 bg-white/30 mx-2"></div>
                            <FullscreenToggle elementRef={mainContentRef} className="h-12 w-12 rounded-full bg-red-600/80 hover:bg-red-500 text-white border border-red-400/30 shadow-lg" />
                        </>
                    )}
                 </div>
            </div>

        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-cyan-500"/></div>}>
            <YazilacaklarDisplayPage />
        </Suspense>
    );
}
