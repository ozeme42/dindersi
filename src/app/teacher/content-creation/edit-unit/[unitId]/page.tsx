

'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { Unit, LessonStep } from '@/lib/types';
import { Loader2, FileText, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateUnitContent, getUnitSourceText } from './actions';
import { TopicEditor } from '@/app/teacher/content-creation/edit/topic-editor'; 
import { AiLessonStepGenerationDialog } from '@/components/ai-lesson-step-generation-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';

// Adımlara benzersiz ve istikrarlı ID'ler atayan yardımcı fonksiyon
const addStableIdsToSteps = (steps: LessonStep[]): (LessonStep & { id: string })[] => {
    return steps.map((step, index) => {
        // Eğer adımda zaten bir ID varsa onu kullan, yoksa yeni bir tane oluştur.
        const existingId = (step as any).id;
        return {
            ...step,
            isPublished: step.isPublished ?? true,
            id: existingId || `step-${Date.now()}-${index}-${Math.random()}`
        };
    });
};


function UnitFlowEditor() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();

    const unitId = (params?.unitId as string) || searchParams.get('unitId') || '';
    const courseId = searchParams.get('courseId');

    const [unit, setUnit] = useState<Unit | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isRefreshingSource, setIsRefreshingSource] = useState(false);
    
    const [isAiOpen, setIsAiOpen] = useState(false);
    const [aiGenerationType, setAiGenerationType] = useState<'anlatim' | 'degerlendirme' | null>(null);
    
    const { toast } = useToast();
    
    const [title, setTitle] = useState('');
    const [steps, setSteps] = useState<(LessonStep & { id: string })[]>([]);
    const [sourceText, setSourceText] = useState('');
    const [htmlContent, setHtmlContent] = useState('');

    const fetchUnitData = useCallback(async () => {
        if (!courseId || !unitId) {
            toast({ title: "Hata", description: "Geçersiz ders veya ünite yolu.", variant: "destructive" });
            return;
        }

        setIsLoading(true);
        try {
            const unitRef = doc(db, 'courses', courseId, 'units', unitId);
            const unitSnap = await getDoc(unitRef);

            if (unitSnap.exists()) {
                const unitData = { id: unitSnap.id, ...unitSnap.data() } as Unit;
                
                setTitle(unitData.title);
                setSteps(addStableIdsToSteps(unitData.steps || []));
                setHtmlContent(unitData.htmlContent || '');
                setUnit(unitData);

                // Kaynak metin: Eğer ünitede doğrudan metin yoksa tüm konu metinlerini topla
                let loadedSourceText = (unitData.sourceText || '').trim();
                if (!loadedSourceText) {
                    try {
                        const srcRes = await getUnitSourceText(courseId, unitId);
                        if (srcRes.success && srcRes.sourceText) {
                            loadedSourceText = srcRes.sourceText;
                        }
                    } catch (e) {
                        console.warn("Otomatik konu metinleri birleştirme uyarısı:", e);
                    }
                }
                setSourceText(loadedSourceText);

            } else {
                toast({ title: "Hata", description: "Ünite bulunamadı.", variant: "destructive" });
                router.back();
            }
        } catch (error) {
            console.error("Ünite getirme hatası:", error);
            toast({ title: "Hata", description: "Veri yüklenirken bir sorun oluştu.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [courseId, unitId, toast, router]);
    
    useEffect(() => {
        fetchUnitData();
    }, [fetchUnitData]);

    const handleRefreshSourceFromTopics = async () => {
        if (!courseId || !unitId) return;
        setIsRefreshingSource(true);
        try {
            const res = await getUnitSourceText(courseId, unitId, true);
            if (res.success && res.sourceText) {
                setSourceText(res.sourceText);
                toast({
                    title: "Kaynak Metin Güncellendi",
                    description: `${res.topicCount} konunun metinleri birleştirilerek aktarıldı.`
                });
            } else {
                toast({
                    title: "Bilgi",
                    description: "Bu üniteye ait konularda kaynak metin bulunamadı.",
                    variant: "destructive"
                });
            }
        } catch (e) {
            toast({
                title: "Hata",
                description: "Konu metinleri çekilirken bir hata oluştu.",
                variant: "destructive"
            });
        } finally {
            setIsRefreshingSource(false);
        }
    };

    const handleSave = async () => {
        if (!courseId || !unitId || !unit) return;
        
        setIsSaving(true);
        
        const dataToSave = {
            title: title,
            steps: steps.map(({ id, ...rest }) => rest),
            sourceText: sourceText,
            htmlContent: htmlContent,
        };

        try {
            const result = await updateUnitContent(courseId, unitId, dataToSave);

            if (result.success) {
                toast({ title: "Başarılı", description: "Ünite akışı kaydedildi." });
                await fetchUnitData();
            } else {
                toast({ title: "Hata", description: result.error, variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Hata", description: "Kaydetme sırasında beklenmedik hata.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleAiStepsGenerated = (newSteps: LessonStep[]) => {
        const stepsWithIds = addStableIdsToSteps(newSteps);
        setSteps(prev => [...prev, ...stepsWithIds]);
        toast({
            title: "Başarılı",
            description: `${newSteps.length} yeni adım taslağa eklendi. Değişiklikleri kaydetmeyi unutmayın.`
        });
    };

    if (isLoading || !unit) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950">
                <Loader2 className="h-16 w-16 animate-spin text-purple-500" />
            </div>
        );
    }
    
    return (
        <>
            <TopicEditor
                title={title}
                setTitle={setTitle}
                steps={steps}
                setSteps={setSteps as any}
                sourceText={sourceText}
                setSourceText={setSourceText}
                onSave={handleSave}
                isSaving={isSaving}
                isUnitFlow={true}
                onOpenAi={() => {
                    setIsAiOpen(true);
                }}
                onOpenAIGeneration={(type) => {
                    setAiGenerationType(type);
                    setIsAiOpen(true);
                }}
            >
                <div className="space-y-4">
                    {/* Ünite Kaynak Metni Alanı */}
                    <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-xl overflow-hidden rounded-2xl">
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="unit-source-content" className="border-b-0">
                                <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-white/5 transition-colors">
                                    <div className="flex items-center justify-between w-full pr-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                                <FileText className="h-5 w-5" />
                                            </div>
                                            <div className="flex flex-col items-start text-left">
                                                <span className="text-lg font-bold text-white">Ünite Kaynak Metni</span>
                                                <span className="text-xs text-slate-400 font-normal">
                                                    {sourceText 
                                                        ? `${sourceText.trim().split(/\s+/).filter(Boolean).length} kelime yüklendi. AI tüm akışı bu metinden türetir.` 
                                                        : 'Konu metinlerinden otomatik sentezlenebilir.'}
                                                </span>
                                            </div>
                                        </div>
                                        {sourceText && (
                                            <Badge variant="outline" className="hidden sm:inline-flex bg-indigo-950/60 text-indigo-300 border-indigo-500/30 text-xs">
                                                {sourceText.trim().split(/\s+/).filter(Boolean).length} kelime
                                            </Badge>
                                        )}
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-6 pb-6 pt-2 space-y-4 bg-slate-950/30">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <p className="text-xs text-slate-400">
                                            💡 Bu metin bu üniteye ait tüm konuların kaynak metinlerini kapsar. AI Stüdyosu içerik üretirken bu metni baz alır.
                                        </p>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={handleRefreshSourceFromTopics}
                                            disabled={isRefreshingSource}
                                            className="text-xs font-bold border-indigo-500/30 bg-indigo-950/40 text-indigo-300 hover:bg-indigo-600 hover:text-white rounded-xl h-8 shrink-0 cursor-pointer"
                                        >
                                            {isRefreshingSource ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
                                            Konu Metinlerinden Yeniden Çek
                                        </Button>
                                    </div>
                                    <Textarea 
                                        id="sourceText"
                                        value={sourceText} 
                                        onChange={(e) => setSourceText(e.target.value)}
                                        placeholder="Ünite kaynak metnini buraya yapıştırın veya 'Konu Metinlerinden Yeniden Çek' butonuna tıklayın..."
                                        className="min-h-[200px] max-h-[450px] font-sans text-xs bg-slate-950 border-white/10 text-slate-200 focus:border-indigo-500/50 leading-relaxed resize-y"
                                    />
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </Card>

                    {/* HTML İçerik alanı */}
                    <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-xl overflow-hidden rounded-2xl">
                        <Accordion type="single" collapsible className="w-full" defaultValue="html-content">
                            <AccordionItem value="html-content" className="border-b-0">
                                <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <div className="flex flex-col items-start">
                                            <span className="text-lg font-bold text-white">İnteraktif HTML İçeriği</span>
                                            <span className="text-xs text-slate-400 font-normal">Ünite geneli için tam sayfa HTML özeti.</span>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-6 pb-6 pt-2 space-y-6 bg-slate-950/30">
                                    <div>
                                        <Textarea 
                                            id="htmlContent"
                                            value={htmlContent} 
                                            onChange={(e) => setHtmlContent(e.target.value)}
                                            placeholder="Konu detay sayfasında gösterilecek tam HTML kodunu buraya yapıştırın..."
                                            className="min-h-[250px] font-mono text-xs bg-slate-950 border-white/10 text-slate-300 focus:border-indigo-500/50"
                                        />
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </Card>
                </div>
            </TopicEditor>
             <AiLessonStepGenerationDialog
                isOpen={isAiOpen}
                onOpenChange={setIsAiOpen}
                topicTitle={title || unit.title}
                sourceText={sourceText}
                context={{ 
                    unitId: unit.id,
                    topicId: unit.id,
                    topicTitle: title || unit.title, 
                    sourceText: sourceText
                }}
                onStepsGenerated={handleAiStepsGenerated}
                generationType={aiGenerationType}
            />
        </>
    );
}

export default function EditUnitFlowPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-purple-500" /></div>}>
            <UnitFlowEditor />
        </Suspense>
    )
}
