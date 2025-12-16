
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
    const [sourceText, setSourceText] = useState('');
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
            setSourceText(unitData.sourceText || '');
        } else {
            toast({ title: "Hata", description: "Ünite bulunamadı.", variant: "destructive" });
        }
        setIsLoading(false);
    }, [courseId, unitId, toast, router]);
    
    useEffect(() => {
        fetchUnitData();
    }, [fetchUnitData]);


    const handleSave = async (newSteps: LessonStep[], newTitle?: string) => {
        if (!courseId || !unitId || !unit) return;
        setIsSaving(true);
        
        const dataToSave = {
            title: newTitle || unit.title,
            steps: newSteps,
            sourceText: sourceText,
            htmlContent: unit.htmlContent || ''
        };
        
        const result = await updateUnitContent(courseId, unitId, dataToSave);

        if (result.success) {
            toast({ title: "Başarılı", description: "Ünite içeriği kaydedildi." });
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

    // Re-using TopicEditor as a generic Lesson Flow editor.
    // It's fed with Unit data instead of Topic data.
    return (
        <div>
            {/* Source Text input is now managed at this level */}
            <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-4">
                 <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-xl overflow-hidden rounded-2xl p-6">
                    <Label htmlFor="source-text" className="text-slate-300 font-semibold mb-2 block">Ünite Kaynak Metni (Yapay Zeka için)</Label>
                    <Textarea 
                        id="source-text"
                        value={sourceText} 
                        onChange={(e) => setSourceText(e.target.value)}
                        placeholder="Üniteyle ilgili genel bilgileri, özet metni veya anahtar kelimeleri buraya girin..."
                        className="min-h-[120px] text-base bg-slate-950 border-white/10 text-white focus:border-indigo-500/50"
                    />
                 </div>
            </div>
            
            <TopicEditor
                initialTopic={{
                    id: unit.id,
                    title: title,
                    steps: unit.steps || [],
                    sourceText: sourceText
                }}
                courseId={courseId!}
                unitId={unitId}
                onSave={(newSteps, newTitle) => handleSave(newSteps, newTitle)}
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
