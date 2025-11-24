'use client';

import { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, Download, Plus, Minus } from 'lucide-react';
import type { Topic, YazilacaklarContent, ActivityItem } from '@/lib/types';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
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
        console.error("Error fetching definitions for topic:", error);
        return [];
    }
}

function YazilacaklarDisplayPage() {
    const params = useParams();
    const [courseId, unitId, topicId] = params.slug as string[];

    const [topic, setTopic] = useState<Topic | null>(null);
    const [content, setContent] = useState<YazilacaklarContent | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const mainContentRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [fontSize, setFontSize] = useState(1); // Base font size in rem

    
    const colorClasses = [
        'bg-chart-1', 'bg-chart-2', 'bg-chart-3',
        'bg-chart-4', 'bg-chart-5', 'bg-accent'
    ];

     useEffect(() => {
        const handleFullscreenChange = () => {
            const isCurrentlyFullscreen = !!document.fullscreenElement;
            setIsFullscreen(isCurrentlyFullscreen);
             if (!isCurrentlyFullscreen) {
                setFontSize(1); // Reset font size when exiting fullscreen
            }
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
            const topicRef = doc(db, 'courses', courseId, 'units', unitId, 'topics', topicId);
            const topicSnap = await getDoc(topicRef);
            
            if (topicSnap.exists()) {
                const topicData = topicSnap.data() as Topic;
                setTopic(topicData);
                
                const definitions = await getDefinitionsForTopic(topicId);
                const notes = topicData.writingContent?.notes || [];

                if (definitions.length === 0 && notes.length === 0) {
                     setError('Bu konu için "Yazılacaklar" içeriği bulunamadı.');
                } else {
                    setContent({ conceptDefinitions: definitions, notes: notes });
                }

            } else {
                 setError('Konu bulunamadı.');
            }
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
                    <title>${topic.title} - Yazılacaklar</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; padding: 20px; }
                        h1 { color: #333; }
                        h2 { color: #555; border-bottom: 2px solid #eee; padding-bottom: 5px; }
                        .concept-block { margin-bottom: 15px; page-break-inside: avoid; }
                        .concept-term { font-weight: bold; }
                        .note-block { display: flex; align-items: flex-start; margin-bottom: 10px; page-break-inside: avoid; }
                        .note-bullet { margin-right: 10px; color: #007bff; }
                        @media print { body { padding: 10px; } }
                    </style>
                </head>
                <body>
                    <h1>${topic.title}</h1>
            `;

            if (content.conceptDefinitions.length > 0) {
                htmlContent += `<h2>Kavramlar ve Tanımları</h2>`;
                content.conceptDefinitions.forEach(item => {
                    htmlContent += `
                        <div class="concept-block">
                            <p><strong class="concept-term">${item.concept}:</strong> ${item.definition}</p>
                        </div>
                    `;
                });
            }

             if (content.notes.length > 0) {
                htmlContent += `<h2>Önemli Notlar</h2>`;
                content.notes.forEach(note => {
                    htmlContent += `
                        <div class="note-block">
                            <span class="note-bullet">•</span>
                            <p>${note}</p>
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
            }, 250);
        }
        
        setIsDownloading(false);
    };
    
    const backUrl = `/student/yazilacaklar`;
    
    const increaseFontSize = () => setFontSize(fs => Math.min(fs + 0.1, 3.0));
    const decreaseFontSize = () => setFontSize(fs => Math.max(0.5, fs - 0.1));

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary"/></div>;
    }

    if (error || !content) {
         return (
            <div className="flex h-screen items-center justify-center text-center p-8">
                <div>
                    <p className="text-destructive mb-4">{error || "Bu konu için içerik bulunmuyor."}</p>
                    <Button asChild variant="outline"><Link href={backUrl}>Geri Dön</Link></Button>
                </div>
            </div>
        );
    }
    
    const KavramlarContent = (
         <Card className="bg-background/80 flex flex-col h-full overflow-hidden border-0 rounded-none sm:rounded-lg">
            <CardHeader className="flex-shrink-0">
                <CardTitle className="text-primary text-2xl font-bold">{topic?.title || 'Kavramlar ve Tanımları'}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow p-0 sm:p-4 min-h-0">
                <ScrollArea className="h-full pr-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {content.conceptDefinitions.length > 0 ? content.conceptDefinitions.map((item, index) => (
                            <Card key={index} className={cn("text-foreground", colorClasses[index % colorClasses.length])}>
                                <CardHeader className="flex flex-row items-center gap-3 p-2 sm:p-3">
                                    <div className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-full bg-black/20 text-white font-bold">{index + 1}</div>
                                    <CardTitle style={{ fontSize: `${fontSize * 1.1}rem` }} className="text-lg text-foreground">{item.concept}</CardTitle>
                                </CardHeader>
                                <CardContent className="p-2 sm:p-3 pt-0">
                                    <p style={{ fontSize: `${fontSize}rem` }} className="text-sm opacity-90 text-foreground">{item.definition}</p>
                                </CardContent>
                            </Card>
                        )) : <p className="text-muted-foreground text-center py-4">Bu konu için kayıtlı tanım bulunamadı.</p>}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );

    const NotlarContent = (
        <Card className="bg-background/80 flex flex-col h-full overflow-hidden border-0 rounded-none sm:rounded-lg">
            <CardHeader className="flex-shrink-0">
                <CardTitle className="text-primary text-2xl font-bold">{topic?.title || 'Önemli Notlar'}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow p-0 sm:p-4 min-h-0">
                 <ScrollArea className="h-full pr-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {content.notes.length > 0 ? content.notes.map((note, index) => (
                            <div key={index} className={cn("flex items-start gap-3 p-3 rounded-lg text-foreground", colorClasses[index % colorClasses.length])}>
                                <div className="h-7 w-7 flex-shrink-0 flex items-center justify-center rounded-full bg-black/20 text-white font-bold text-sm">{index + 1}</div>
                                <p style={{ fontSize: `${fontSize}rem` }} className={cn("flex-1", isFullscreen ? "text-xl" : "text-lg")}>{note}</p>
                            </div>
                        )) : <p className="text-muted-foreground text-center py-4 col-span-2">Yapay zeka not üretemedi.</p>}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
    
    return (
        <div 
            ref={mainContentRef} 
            className={cn(
                "w-full h-full min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col sm:p-6 md:p-8"
            )}
        >
            <div className="container mx-auto max-w-7xl">
                 <div className="mb-6 md:mb-12 text-center flex flex-col items-center">
                    <h1 className="font-bold font-headline text-4xl">{topic?.title || 'Yazılacaklar'}</h1>
                     <div className="flex gap-2 justify-center mt-4 flex-wrap">
                        <div className="flex items-center gap-1">
                            <Button variant="outline" size="icon" onClick={decreaseFontSize} className="h-8 w-8"><Minus className="h-4 w-4"/></Button>
                            <Button variant="outline" size="icon" onClick={increaseFontSize} className="h-8 w-8"><Plus className="h-4 w-4"/></Button>
                        </div>
                        <Button variant="outline" asChild>
                            <Link href={backUrl}>
                                <ArrowLeft className="mr-2 h-4 w-4"/> Konu Seçimine Dön
                            </Link>
                        </Button>
                        <Button variant="secondary" onClick={handleDownloadPDF} disabled={isDownloading}>
                            {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4" />}
                            PDF Olarak İndir
                        </Button>
                        <FullscreenToggle elementRef={mainContentRef} />
                    </div>
                </div>

                <div className="flex-grow flex flex-col min-h-0">
                    <Tabs defaultValue="kavramlar" className="w-full flex-grow flex flex-col">
                        <TabsList className={cn("grid w-full grid-cols-2", isFullscreen && "hidden")}>
                            <TabsTrigger value="kavramlar">Kavramlar</TabsTrigger>
                            <TabsTrigger value="notlar">Önemli Notlar</TabsTrigger>
                        </TabsList>
                        <TabsContent value="kavramlar" className="flex-grow mt-4 min-h-0 p-0 sm:p-4">
                            {KavramlarContent}
                        </TabsContent>
                        <TabsContent value="notlar" className="flex-grow mt-4 min-h-0 p-0 sm:p-4">
                            {NotlarContent}
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}


export default function Page() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary"/></div>}>
            <YazilacaklarDisplayPage />
        </Suspense>
    )
}
