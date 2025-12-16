
'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { Unit, LessonStep, Topic } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateUnitContent } from '../actions';
import { TopicEditor } from '@/app/teacher/content-creation/edit/page'; 
import { AiLessonStepGenerationDialog } from '@/components/ai-lesson-step-generation-dialog';

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
                if (!unitData.steps) unitData.steps = [];
                
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

    const handleSave = async (data: { steps: LessonStep[], title: string, sourceText: string }) => {
        if (!courseId || !unitId || !unit) return;
        
        setIsSaving(true);
        
        const dataToSave = {
            title: data.title,
            steps: data.steps,
            sourceText: data.sourceText,
        };

        try {
            const result = await updateUnitContent(courseId, unitId, dataToSave);

            if (result.success) {
                toast({ title: "Başarılı", description: "Ünite akışı kaydedildi." });
                setUnit(prev => prev ? { ...prev, ...dataToSave } : null);
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
        if (!unit) return;
        
        const updatedUnit = { ...unit, steps: [...(unit.steps || []), ...newSteps] };
        setUnit(updatedUnit);

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
                key={`editor-${unit.id}-${unit.steps?.length}`}
                initialTopic={unit as Topic} // Cast Unit to Topic for props compatibility
                courseId={courseId!}
                unitId={unitId}
                onSave={handleSave}
                isSaving={isSaving}
                isUnitFlow={true}
                onOpenAIGeneration={(type) => { setAiGenerationType(type); setIsAiOpen(true); }}
            />
             <AiLessonStepGenerationDialog
                isOpen={isAiOpen}
                onOpenChange={setIsAiOpen}
                context={{ 
                    topicId: unit.id,
                    topicTitle: unit.title, 
                    sourceText: unit.sourceText 
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
