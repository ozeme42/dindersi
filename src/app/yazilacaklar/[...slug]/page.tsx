'use client';

import { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Download, Plus, Minus, BookOpen, StickyNote } from 'lucide-react';
import type { YazilacaklarContent, Topic } from '@/lib/types';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { getCurriculumForSelection } from '@/components/actions/get-curriculum-for-selection';

export function YazilacaklarDisplayPage() {
    const params = useParams();
    const slug = params.slug as string[];
    const topicId = slug ? slug[slug.length - 1] : undefined;

    const [content, setContent] = useState<YazilacaklarContent | null>(null);
    const [topicTitle, setTopicTitle] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const mainContentRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [fontSize, setFontSize] = useState(1);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
             if (!document.fullscreenElement) {
                setFontSize(1);
            }
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const fetchContent = useCallback(async () => {
        if (!topicId) {
            setError("Eksik konu bilgisi.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            // Hiyerarşik başlık bilgisini statik manifestten çek
            const { classGroups, error: fetchError } = await getCurriculumForSelection('yazilacaklar', true);
            if (fetchError) throw new Error(fetchError);
            
            let foundTopic = null;
            for (const group of classGroups) {
                for (const course of group.courses) {
                    for (const unit of course.units) {
                        const topic = unit.topics.find((t: any) => t.id === topicId);
                        if(topic) {
                            foundTopic = topic;
                            break;
                        }
                    }
                    if(foundTopic) break;
                }
                if(foundTopic) break;
            }
            
            if (foundTopic) {
                setTopicTitle((foundTopic as any).title);
            }

            // İçerik verisini statik dosyadan çek (Dosyadan gelmesi istendi)
            const res = await fetch(`/curriculum/yazilacaklar/${topicId}.json`);
            if (!res.ok) {
                throw new Error('Bu konu için yazılacak notlar bulunamadı.');
            }
            const data: YazilacaklarContent = await res.json();

            if ((data.notes?.length || 0) === 0 && (data.conceptDefinitions?.length || 0) === 0) {
                 throw new Error('Yazılacak içerik boş.');
            }
            
            setContent(data);
        } catch (e: any) {
            setError(e.message || 'İçerik alınırken bir hata oluştu.');
        } finally {
            setIsLoading(false);
        }
    }, [topicId]);

    useEffect(() => {
        fetchContent();
    }, [fetchContent]);

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
    
    const KavramlarContent = (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-20">
            {content.conceptDefinitions.length > 0 ? content.conceptDefinitions.map((item, index) => (
                <div key={index} className="group relative bg-slate-900/60 border border-white/5 rounded-2xl p-5 backdrop-blur-md hover:border-cyan-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-900/10 flex flex-col">
                    <div className="flex items-center gap-3 mb-3 border-b border-white/5 pb-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-sm">{index + 1}</div>
                        <h3 style={{ fontSize: `${fontSize * 1.1}rem` }} className="font-bold text-slate-100 leading-tight">{item.concept}</h3>
                    </div>
                    <p style={{ fontSize: `${fontSize}rem` }} className="text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">{item.definition}</p>
                </div>
            )) : <div className="col-span-full text-center py-12 text-slate-500 bg-slate-900/30 rounded-2xl border border-dashed border-white/5">Bu konu için kayıtlı tanım bulunamadı.</div>}
        </div>
    );

    const NotlarContent = (
        <div className="space-y-3 pb-20">
             {content.notes.length > 0 ? content.notes.map((note, index) => (
                <div key={index} className="flex gap-4 p-5 rounded-2xl bg-slate-900/60 border border-white/5 hover:bg-slate-900/80 transition-colors backdrop-blur-md items-start">
                    <div className="flex-shrink-0 mt-0.5"><div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-bold text-sm">{index + 1}</div></div>
                    <p style={{ fontSize: `${fontSize}rem` }} className="text-slate-300 leading-relaxed pt-1">{note}</p>
                </div>
            )) : <div className="text-center py-12 text-slate-500 bg-slate-900/30 rounded-2xl border border-dashed border-white/5">Bu konu için not bulunmuyor.</div>}
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
                    <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-cyan-600/5 rounded-full blur-[100px]" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-violet-600/5 rounded-full blur-[100px]" />
                </div>
            )}
            <div className="sticky top-0 z-30 w-full border-b border-white/5 bg-slate-950/80 backdrop-blur-xl transition-all pt-4">
                <div className="container mx-auto px-4 pb-4">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                             <Button variant="ghost" size="icon" asChild className="h-10 w-10 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl flex-shrink-0">
                                <Link href={backUrl}><ArrowLeft className="h-5 w-5"/></Link>
                             </Button>
                             <h1 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 truncate">{topicTitle || 'Yazılacaklar'}</h1>
                        </div>
                        <div className="w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
                            <div className="flex items-center gap-2 min-w-max px-1">
                                <div className="flex items-center bg-slate-900/80 border border-white/10 rounded-xl p-1">
                                    <Button variant="ghost" size="icon" onClick={decreaseFontSize} className="h-8 w-8 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg"><Minus className="h-4 w-4"/></Button>
                                    <span className="text-xs font-mono text-slate-500 w-8 text-center">{Math.round(fontSize * 100)}%</span>
                                    <Button variant="ghost" size="icon" onClick={increaseFontSize} className="h-8 w-8 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg"><Plus className="h-4 w-4"/></Button>
                                </div>
                                <div className="w-px h-6 bg-white/10 mx-1" />
                                <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={isDownloading} className="bg-slate-900/80 border-white/10 text-slate-300 hover:text-white hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-colors h-10 px-4 rounded-xl gap-2">{isDownloading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Download className="h-4 w-4" />}<span className="hidden sm:inline">PDF İndir</span></Button>
                                <FullscreenToggle elementRef={mainContentRef} className="bg-slate-900/80 border-white/10 text-slate-300 hover:text-white hover:bg-white/10 h-10 w-10 rounded-xl" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <main className="flex-grow container mx-auto px-4 pt-6 relative z-10 overflow-y-auto">
                <Tabs defaultValue="kavramlar" className="w-full h-full flex flex-col items-center">
                    <div className="flex justify-center mb-6 w-full"><TabsList className="grid grid-cols-2 w-full max-w-lg bg-slate-900/80 border border-white/20 p-1.5 rounded-full h-16 shadow-2xl backdrop-blur-xl"><TabsTrigger value="kavramlar" className="rounded-full text-lg font-bold data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-slate-400 transition-all"><BookOpen className="w-5 h-5 mr-2" />Kavramlar</TabsTrigger><TabsTrigger value="notlar" className="rounded-full text-lg font-bold data-[state=active]:bg-amber-600 data-[state=active]:text-white text-slate-400 transition-all"><StickyNote className="w-5 h-5 mr-2" />Notlar</TabsTrigger></TabsList></div>
                    <TabsContent value="kavramlar" className="w-full mt-0 data-[state=inactive]:hidden animate-in fade-in zoom-in-95 duration-300 focus:outline-none">{KavramlarContent}</TabsContent>
                    <TabsContent value="notlar" className="w-full mt-0 data-[state=inactive]:hidden animate-in fade-in zoom-in-95 duration-300 focus:outline-none">{NotlarContent}</TabsContent>
                </Tabs>
            </main>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-950 flex justify-center items-center"><Loader2 className="h-12 w-12 animate-spin text-cyan-500"/></div>}>
            <YazilacaklarDisplayPage />
        </Suspense>
    )
}
