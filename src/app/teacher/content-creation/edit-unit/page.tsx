

'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { Unit, LessonStep, Topic } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateUnitContent } from './actions';
import { TopicEditor } from '@/app/teacher/content-creation/edit/page'; 
import { AiLessonStepGenerationDialog } from '@/components/ai-lesson-step-generation-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { FileText } from 'lucide-react';

// Adımlara benzersiz ve istikrarlı ID'ler atayan yardımcı fonksiyon
const addStableIdsToSteps = (steps: LessonStep[]): (LessonStep & { id: string })[] => {
    return steps.map((step, index) => {
        // Eğer adımda zaten bir ID varsa onu kullan, yoksa yeni bir tane oluştur.
        const existingId = (step as any).id;
        return {
            ...step,
            isPublished: step.isPublished ?? true, // YENİ: Varsayılan olarak true ata
            id: existingId || `step-${Date.now()}-${index}-${Math.random()}`
        };
    });
};


function UnitFlowEditor() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();

    const unitId = params.unitId as string;
    const courseId = searchParams.get('courseId');

    const [unit, setUnit] = useState<Unit | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const [isAiOpen, setIsAiOpen] = useState(false);
    const [aiGenerationType, setAiGenerationType] = useState<'anlatim' | 'degerlendirme' | null>(null);
    
    const { toast } = useToast();
    
    const [title, setTitle] = useState('');
    const [steps, setSteps] = useState<(LessonStep & { id: string })[]>([]); // Adım state'i artık ID içerecek
    const [sourceText, setSourceText] = useState('');
    const [htmlContent, setHtmlContent] = useState(''); // YENİ: HTML içeriği için state

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
                setSourceText(unitData.sourceText || '');
                setHtmlContent(unitData.htmlContent || ''); // YENİ: State'i doldur
                setUnit(unitData);

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

    const handleSave = async () => {
        if (!courseId || !unitId || !unit) return;
        
        setIsSaving(true);
        
        const dataToSave = {
            title: title,
            steps: steps.map(({ id, ...rest }) => rest), // Kaydederken geçici ID'leri kaldır
            sourceText: sourceText,
            htmlContent: htmlContent, // YENİ: Kaydedilecek veriye ekle
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
        // AI'dan gelen yeni adımlara da ID ata
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
                onOpenAIGeneration={(type) => { setAiGenerationType(type); setIsAiOpen(true); }}
            >
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
                                        className="min-h-[300px] font-mono text-xs bg-slate-950 border-white/10 text-slate-300 focus:border-indigo-500/50"
                                    />
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </Card>
            </TopicEditor>
             <AiLessonStepGenerationDialog
                isOpen={isAiOpen}
                onOpenChange={setIsAiOpen}
                context={{ 
                    topicId: unit.id, // Pass unitId as topicId for context
                    topicTitle: unit.title, 
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
