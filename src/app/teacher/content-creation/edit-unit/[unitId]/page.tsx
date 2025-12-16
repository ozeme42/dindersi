
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

function UnitFlowEditor() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();

    const unitId = params.unitId as string;
    const courseId = searchParams.get('courseId');

    const [unit, setUnit] = useState<Unit | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // We use this version state to force a re-render of the editor 
    // when new data is fetched, ensuring it gets the latest props.
    const [dataVersion, setDataVersion] = useState(0); 

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
                setDataVersion(prev => prev + 1); // Increment version on new data
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

    const handleSave = async (newSteps: LessonStep[], newTitle?: string, newSourceText?: string) => {
        if (!courseId || !unitId || !unit) return;
        
        setIsSaving(true);
        
        const dataToSave = {
            title: newTitle || unit.title,
            steps: newSteps,
            sourceText: newSourceText || unit.sourceText || '',
        };

        try {
            const result = await updateUnitContent(courseId, unitId, dataToSave);

            if (result.success) {
                toast({ title: "Başarılı", description: "Ünite akışı kaydedildi." });
                // Optimistically update the local state to reflect the save without a full refetch
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

    if (isLoading || !unit) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950">
                <Loader2 className="h-16 w-16 animate-spin text-purple-500" />
            </div>
        );
    }
    
    return (
        <div>
            {/* The key is crucial here. It forces React to create a new instance of TopicEditor 
                when the unit data changes, ensuring the editor's internal state is always fresh. */}
            <TopicEditor
                key={`editor-${unit.id}-${dataVersion}`}
                initialTopic={{
                    id: unit.id,
                    title: unit.title,
                    steps: unit.steps || [],
                    sourceText: unit.sourceText
                } as Topic}
                courseId={courseId!}
                unitId={unitId}
                onSave={handleSave}
                isSaving={isSaving}
                isUnitFlow={true} 
            />
        </div>
    );
}

export default function EditUnitFlowPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-purple-500" /></div>}>
            <UnitFlowEditor />
        </Suspense>
    )
}
