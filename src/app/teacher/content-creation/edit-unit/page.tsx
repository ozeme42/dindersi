
'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import type { Topic, Unit, LessonStep } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ArrowLeft, Save, FileText, Sparkles, BookOpen, LayersIcon, HelpCircle, Gamepad2, Brain, FilePenLine } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { updateUnitContent } from './actions';
import { LessonContentViewer } from '@/components/lesson-content-viewer';
import { TopicEditor } from '@/app/teacher/content-creation/edit/page'; // Re-use the editor component logic


function UnitFlowEditor() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();

    const unitId = params.unitId as string;
    const courseId = searchParams.get('courseId');

    const [unit, setUnit] = useState<Unit | null>(null);
    const [title, setTitle] = useState('');
    const [steps, setSteps] = useState<LessonStep[]>([]);
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
                setTitle(unitData.title);
                // Ünitenin kendi adımlarını yüklüyoruz
                setSteps(unitData.steps || []);
            } else {
                toast({ title: "Hata", description: "Ünite bulunamadı.", variant: "destructive" });
            }
            setIsLoading(false);
        };
        fetchUnitData();
    }, [courseId, unitId, toast, router]);

    const handleSave = async (newSteps: LessonStep[]) => {
        if (!courseId || !unitId) return;
        setIsSaving(true);
        const result = await updateUnitContent(courseId, unitId, { title, steps: newSteps });
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
    
    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-4 sm:p-6 md:p-8 relative overflow-hidden">
            {/* The TopicEditor component is re-used. It's a generic lesson step editor now. */}
            {/* We just need to feed it the right data and save handlers. */}
            <TopicEditor
                 initialTopic={{ id: unitId, title: title, steps: steps }}
                 courseId={courseId!}
                 unitId={unitId}
                 onSave={(newSteps) => handleSave(newSteps)}
                 isUnitFlow={true} // A prop to slightly change behavior/text if needed
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
