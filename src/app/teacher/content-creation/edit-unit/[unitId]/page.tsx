
'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { Unit, LessonStep } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ArrowLeft, Save, FileText, Sparkles, BookOpen, LayersIcon, HelpCircle, Gamepad2, Brain, FilePenLine } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { updateUnitContent } from '../actions';
import { LessonContentViewer } from '@/components/lesson-content-viewer'; // Assuming this might be used for preview
import { TopicEditor } from '@/app/teacher/content-creation/edit/page'; // Re-use the editor component logic


function UnitFlowEditor() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();

    const unitId = params.unitId as string;
    const courseId = searchParams.get('courseId');

    const [unit, setUnit] = useState<Unit | null>(null);
    const [title, setTitle] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const fetchUnitData = useCallback(async () => {
        if (!courseId || !unitId) {
            toast({ title: "Hata", description: "Geçersiz yol.", variant: "destructive" });
            router.back();
            return;
        }
        setIsLoading(true);
        const unitRef = doc(db, 'courses', courseId, 'units', unitId);
        const unitSnap = await getDoc(unitRef);
        if (unitSnap.exists()) {
            const unitData = { id: unitSnap.id, ...unitSnap.data() } as Unit;
            setUnit(unitData);
            setTitle(unitData.title);
        } else {
            toast({ title: "Hata", description: "Ünite bulunamadı.", variant: "destructive" });
        }
        setIsLoading(false);
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
            // htmlContent is intentionally omitted to prevent overwriting it with old logic
        };
        
        const result = await updateUnitContent(courseId, unitId, dataToSave);

        if (result.success) {
            toast({ title: "Başarılı", description: "Ünite akışı kaydedildi." });
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950">
                <Loader2 className="h-16 w-16 animate-spin text-purple-500" />
            </div>
        );
    }
    
    if (!unit) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950 text-red-500">
                Ünite bilgileri yüklenemedi. Lütfen geri dönüp tekrar deneyin.
            </div>
        )
    }

    return (
        <div>
            <TopicEditor
                initialTopic={{
                    id: unit.id,
                    title: title,
                    steps: unit.steps || [],
                    sourceText: unit.sourceText
                }}
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
