'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { LessonStep, Topic } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateTopicContent } from './actions';
import { setCachedSteps } from '@/lib/lesson-cache';
import { AiLessonStepGenerationDialog } from '@/components/ai-lesson-step-generation-dialog';
import { TopicEditor, type DraggableLessonStep } from './topic-editor';

function TopicEditorWrapper() {
    const searchParams = useSearchParams();
    const courseId = searchParams.get('courseId');
    const unitId = searchParams.get('unitId');
    const topicId = searchParams.get('topicId');
    const { toast } = useToast();
    
    const [title, setTitle] = useState('');
    const [steps, setSteps] = useState<DraggableLessonStep[]>([]);
    const [sourceText, setSourceText] = useState('');
    const [htmlContent, setHtmlContent] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const [isAIOpen, setIsAIOpen] = useState(false);
    const [aiTargetIndex, setAiTargetIndex] = useState<number | undefined>(undefined);
    
    const addIdToSteps = (stepsList: LessonStep[]): DraggableLessonStep[] => {
        return stepsList.map((step, index) => ({ 
            ...step, 
            id: (step as any).id || `step-${Date.now()}-${index}-${Math.random()}` 
        }));
    };

    useEffect(() => {
        let isMounted = true;
        if (!courseId || !unitId || !topicId) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const load = async () => {
            try {
                const topicRef = doc(db, 'courses', courseId, 'units', unitId, 'topics', topicId);
                const topicSnap = await getDoc(topicRef);
                if (isMounted) {
                    if (topicSnap.exists()) {
                        const topicData = { id: topicSnap.id, ...topicSnap.data() } as Topic;
                        setTitle(topicData.title || '');
                        setSteps(addIdToSteps(topicData.steps || []));
                        setSourceText(topicData.sourceText || '');
                        setHtmlContent(topicData.htmlContent || '');
                    } else {
                        toast({ title: "Hata", description: "Konu bulunamadı.", variant: "destructive" });
                    }
                }
            } catch (err: any) {
                if (isMounted) {
                    toast({ title: "Hata", description: "Konu yüklenirken sorun oluştu: " + err.message, variant: "destructive" });
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        load();

        return () => {
            isMounted = false;
        };
    }, [courseId, unitId, topicId]);

    const handleSaveFlow = async () => {
        if (!courseId || !unitId || !topicId) return;
        setIsSaving(true);
        const stepsToSave = steps.map(({ id, ...rest }) => rest);
        const result = await updateTopicContent({ courseId, unitId, topicId, steps: stepsToSave, sourceText, htmlContent });
        if (result.success) { 
            setCachedSteps(topicId, stepsToSave as any);
            toast({ title: "Başarılı", description: "Ders akışı başarıyla kaydedildi." });
        } else { 
            toast({ title: "Hata", description: result.error, variant: "destructive" }); 
        }
        setIsSaving(false);
    };
    
    const handleStepsGenerated = (newSteps: LessonStep[], targetIdx?: number) => {
        const newStepsWithIds = newSteps.map((step, index) => ({
            ...step,
            id: `step-${Date.now()}-${index}-${Math.random()}`
        }));
        setSteps(currentSteps => {
            if (targetIdx !== undefined && targetIdx >= 0 && targetIdx <= currentSteps.length) {
                const updated = [...currentSteps];
                updated.splice(targetIdx, 0, ...newStepsWithIds);
                return updated;
            }
            return [...currentSteps, ...newStepsWithIds];
        });
        toast({
            title: "Yapay Zeka İçeriği Eklendi! 🎉",
            description: `${newSteps.length} yeni adım eklendi. Kalıcı yapmak için 'Kaydet' butonuna basın.`
        });
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950">
                <Loader2 className="h-16 w-16 animate-spin text-purple-500" />
            </div>
        );
    }
    
    if (!courseId || !unitId || !topicId) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950 text-red-400 font-bold">
                Geçersiz URL. Lütfen içerik yönetimi sayfasından bir konu seçin.
            </div>
        );
    }
    
    return (
        <>
            <TopicEditor
                title={title} setTitle={setTitle}
                steps={steps} setSteps={setSteps}
                sourceText={sourceText} setSourceText={setSourceText}
                htmlContent={htmlContent} setHtmlContent={setHtmlContent}
                onSave={handleSaveFlow}
                isSaving={isSaving}
                onOpenAi={(idx) => {
                    setAiTargetIndex(idx);
                    setTimeout(() => setIsAIOpen(true), 10);
                }}
            />

            {isAIOpen && (
                <AiLessonStepGenerationDialog
                    isOpen={isAIOpen}
                    onOpenChange={setIsAIOpen}
                    topicTitle={title}
                    sourceText={sourceText}
                    targetIndex={aiTargetIndex}
                    onStepsGenerated={handleStepsGenerated}
                />
            )}
        </>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-purple-500" /></div>}>
            <TopicEditorWrapper />
        </Suspense>
    );
}
