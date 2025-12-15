
'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import type { Topic, Unit } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ArrowLeft, Save, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

async function updateUnitContent(courseId: string, unitId: string, data: { title: string, htmlContent: string }): Promise<{ success: boolean, error?: string }> {
    try {
        const unitRef = doc(db, `courses/${courseId}/units/${unitId}`);
        await updateDoc(unitRef, data);
        return { success: true };
    } catch (e: any) {
        console.error("Error updating unit content:", e);
        return { success: false, error: "Ünite içeriği güncellenemedi." };
    }
}

function UnitEditor() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();

    const unitId = params.unitId as string;
    const courseId = searchParams.get('courseId');

    const [unit, setUnit] = useState<Unit | null>(null);
    const [title, setTitle] = useState('');
    const [htmlContent, setHtmlContent] = useState('');
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
                setHtmlContent(unitData.htmlContent || '');
            } else {
                toast({ title: "Hata", description: "Ünite bulunamadı.", variant: "destructive" });
            }
            setIsLoading(false);
        };
        fetchUnitData();
    }, [courseId, unitId, toast, router]);

    const handleSave = async () => {
        if (!courseId || !unitId) return;
        setIsSaving(true);
        const result = await updateUnitContent(courseId, unitId, { title, htmlContent });
        if (result.success) {
            toast({ title: "Başarılı", description: "Ünite özeti kaydedildi." });
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
             {/* Arka Plan Efektleri */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-purple-900/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-indigo-900/10 rounded-full blur-[150px]" />
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                     <div>
                        <Button asChild variant="ghost" size="sm" className="mb-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg">
                            <Link href="/teacher/content-creation">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                İçerik Yönetimine Dön
                            </Link>
                        </Button>
                        <h1 className="text-3xl font-black text-white tracking-tight uppercase drop-shadow-md">Ünite Özeti Düzenle</h1>
                        <p className="text-slate-400 font-medium">{unit?.title}</p>
                    </div>
                     <Button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20 h-12 px-6 rounded-xl text-lg">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                        Değişiklikleri Kaydet
                    </Button>
                </div>

                <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-xl overflow-hidden rounded-2xl">
                    <CardHeader>
                        <CardTitle className="text-white">Ünite Bilgileri</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                         <div>
                            <Label htmlFor="unit-title" className="text-slate-300 font-semibold mb-2 block">Ünite Başlığı</Label>
                            <Input id="unit-title" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-slate-900 border-white/10 text-white h-11 focus:border-indigo-500/50" />
                        </div>
                        <div>
                            <Label htmlFor="htmlContent" className="text-slate-300 font-semibold mb-2 block">HTML İçeriği</Label>
                            <Textarea 
                                id="htmlContent"
                                value={htmlContent} 
                                onChange={(e) => setHtmlContent(e.target.value)}
                                placeholder="Ünite özeti için HTML kodunu buraya yapıştırın..."
                                className="min-h-[400px] font-mono text-xs bg-slate-950 border-white/10 text-slate-300 focus:border-indigo-500/50"
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default function EditUnitPageWrapper() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-purple-500" /></div>}>
            <UnitEditor />
        </Suspense>
    )
}
