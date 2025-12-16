
'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { Unit, LessonStep } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Loader2, Save, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
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
    const { toast } = useToast();

    useEffect(() => {
        const fetchUnitData = async () => {
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
            } else {
                toast({ title: "Hata", description: "Ünite bulunamadı.", variant: "destructive" });
            }
            setIsLoading(false);
        };
        fetchUnitData();
    }, [courseId, unitId, toast, router]);

    const handleSave = async (newSteps: LessonStep[], newTitle?: string) => {
        if (!courseId || !unitId || !unit) return;
        setIsSaving(true);

        const dataToSave: { title: string, steps: LessonStep[], htmlContent?: string } = {
            title: newTitle || unit.title,
            steps: newSteps,
            htmlContent: unit.htmlContent || '' // Mevcut htmlContent'i koru
        };
        
        const result = await updateUnitContent(courseId, unitId, dataToSave);

        if (result.success) {
            toast({ title: "Başarılı", description: "Ünite akışı kaydedildi." });
            setUnit(prev => prev ? { ...prev, steps: newSteps, title: newTitle || prev.title } : null);
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

    // TopicEditor'ı bir şablon olarak yeniden kullanıyoruz.
    // Gerekli propları ünite verileriyle besliyoruz.
    return (
        <TopicEditor
            // TopicEditor normalde bir Topic bekler, biz ona Unit verilerini Topic gibi formatlayıp veriyoruz
            initialTopic={{
                id: unit.id,
                title: unit.title,
                steps: unit.steps || [],
            }}
            courseId={courseId!}
            unitId={unitId}
            onSave={(newSteps, newTitle) => handleSave(newSteps, newTitle)}
            isSaving={isSaving}
            isUnitFlow={true} // Bu prop, TopicEditor'ın bazı metinleri (örn: başlık) değiştirmesini sağlar
        />
    );
}

export default function EditUnitFlowPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-purple-500" /></div>}>
            <UnitFlowEditor />
        </Suspense>
    )
}
