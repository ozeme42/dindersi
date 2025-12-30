
'use client';

import { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Wand2, ArrowLeft, Download, Plus, Minus, Maximize, Minimize, Columns, Save, PlusCircle, Trash2 } from 'lucide-react';
import type { Topic, YazilacaklarContent, ActivityItem } from '@/lib/types';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { generateTopicSummary } from '@/ai/flows/generate-topic-summary-flow';
import { saveGeneratedActivityItems, deleteBulkActivityItems, saveActivityItem } from '@/app/teacher/activity-data/actions';
import { updateTopicContent } from '@/app/teacher/content-creation/edit/actions';

async function getDefinitionsForTopic(topicId: string): Promise<ActivityItem[]> {
    if (!topicId) return [];
    try {
        const q = query(collection(db, "activityItems"), where("topicId", "==", topicId), where("type", "==", "definition"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as ActivityItem));
    } catch (error) {
        console.error("Error fetching definitions for topic:", error);
        return [];
    }
}

function OzetPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const params = useParams();
    const topicId = params.topicId as string;
    const courseId = searchParams.get('courseId');
    const unitId = searchParams.get('unitId');
    const { toast } = useToast();

    const [topic, setTopic] = useState<Topic | null>(null);
    const [definitions, setDefinitions] = useState<ActivityItem[]>([]);
    const [notes, setNotes] = useState<string[]>([]);
    const [originalDefinitionIds, setOriginalDefinitionIds] = useState<Set<string>>(new Set());

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mainContentRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [fontSize, setFontSize] = useState(1.5); 

    const colorClasses = [
        'bg-chart-1', 'bg-chart-2', 'bg-chart-3',
        'bg-chart-4', 'bg-chart-5', 'bg-accent'
    ];

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const fetchContent = useCallback(async () => {
        if (!topicId || !courseId || !unitId) {
            setError("Eksik bilgi: Gerekli konu detayları bulunamadı.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const topicRef = doc(db, 'courses', courseId, 'units', unitId, 'topics', topicId);
            const topicSnap = await getDoc(topicRef);
            
            if (topicSnap.exists()) {
                const topicData = topicSnap.data() as Topic;
                setTopic(topicData);
                
                const fetchedDefinitions = await getDefinitionsForTopic(topicId);
                setDefinitions(fetchedDefinitions);
                setOriginalDefinitionIds(new Set(fetchedDefinitions.map(d => d.id)));

                setNotes(topicData.writingContent?.notes || []);

            } else {
                 setError('Konu bulunamadı.');
            }
        } catch (e: any) {
            setError('İçerik alınırken bir hata oluştu.');
        } finally {
            setIsLoading(false);
        }
    }, [topicId, courseId, unitId]);

    useEffect(() => {
        fetchContent();
    }, [fetchContent]);

     const handleGenerate = async () => {
        if (!topic?.sourceText && !topic?.title) {
            toast({ title: 'Kaynak Metin Eksik', description: 'Yapay zekanın içerik üretebilmesi için lütfen önce konu düzenleme ekranından bir kaynak metin girin.', variant: 'destructive' });
            return;
        }
        setIsGenerating(true);
        try {
            const result = await generateTopicSummary({ sourceText: topic.sourceText || topic.title });
            setNotes(result.notes || []);
            toast({ title: 'Başarılı!', description: 'Notlar yapay zeka tarafından başarıyla oluşturuldu. Kaydetmeyi unutmayın.' });
        } catch (e: any) {
            toast({ title: 'Hata', description: e.message || 'Yapay zeka ile notlar üretilemedi.', variant: 'destructive' });
        } finally {
            setIsGenerating(false);
        }
    }

    const handleSave = async () => {
        if (!courseId || !unitId || !topicId || !topic) return;
        setIsSaving(true);
        
        const newDefinitions = definitions.filter(d => d.id.startsWith('new-'));
        const updatedDefinitions = definitions.filter(d => !d.id.startsWith('new-'));
        const currentDefinitionIds = new Set(updatedDefinitions.map(d => d.id));
        const idsToDelete = [...originalDefinitionIds].filter(id => !currentDefinitionIds.has(id));

        const serializeItem = (item: Partial<ActivityItem>) => {
            const { createdAt, ...rest } = item;
            return rest;
        };

        const savePromises = [
            ...newDefinitions.map(d => saveActivityItem(serializeItem({ ...d, id: undefined }))), // Let Firestore generate ID
            ...updatedDefinitions.map(d => saveActivityItem(serializeItem(d))),
            idsToDelete.length > 0 ? deleteBulkActivityItems(idsToDelete) : Promise.resolve(),
            updateTopicContent({ courseId, unitId, topicId, steps: topic.steps || [], writingContent: { notes, conceptDefinitions: [] } } as any)
        ];

        try {
            await Promise.all(savePromises);
            toast({ title: "Kaydedildi", description: "Oluşturulan içerik konuya başarıyla kaydedildi." });
            router.push(`/teacher/smartboard/yazilacaklar/oyun?courseId=${courseId}&unitId=${unitId}&topicId=${topicId}`);
        } catch (e) {
            toast({ title: "Hata", description: "Kaydederken bir hata oluştu.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleNoteChange = (index: number, value: string) => {
        const newNotes = [...notes];
        newNotes[index] = value;
        setNotes(newNotes);
    };
    const addNote = () => setNotes([...notes, '']);
    const removeNote = (index: number) => setNotes(notes.filter((_, i) => i !== index));

    const handleDefinitionChange = (index: number, field: 'term' | 'definition', value: string) => {
        const newDefinitions = [...definitions];
        newDefinitions[index].content[field] = value;
        setDefinitions(newDefinitions);
    };
    const addDefinition = () => {
        if (!courseId || !unitId || !topicId) return;
        setDefinitions([...definitions, {
            id: `new-${Date.now()}`,
            type: 'definition',
            content: { term: '', definition: '' },
            courseId, unitId, topicId
        }]);
    };
    const removeDefinition = (index: number) => setDefinitions(definitions.filter((_, i) => i !== index));
    
    const handleDownload = () => {
        const dataToDownload = {
            kavramlar: definitions.map(d => ({ kavram: d.content.term, tanim: d.content.definition })),
            notlar: notes,
        };
        const dataStr = JSON.stringify(dataToDownload, null, 2);
        const blob = new Blob([dataStr], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `yazilacaklar_${topic?.title.replace(/\s+/g, '_').toLowerCase()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const backUrl = `/teacher/ders-akisi`;
    
    const increaseFontSize = () => setFontSize(fs => Math.min(fs + 0.2, 5.0));
    const decreaseFontSize = () => setFontSize(fs => Math.max(1.0, fs - 0.2));

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary"/></div>;
    }
     if (error) {
         return (
            <div className="flex h-screen items-center justify-center text-center p-8">
                <div>
                    <p className="text-destructive mb-4">{error}</p>
                    <Button asChild variant="outline"><Link href={backUrl}>Geri Dön</Link></Button>
                </div>
            </div>
        );
    }
    if (!topic) {
        return <div className="text-center p-8">Konu yüklenemedi.</div>;
    }
    
    return (
        <div className="container mx-auto p-4 sm:p-6 md:p-8">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                    <Columns className="h-16 w-16 text-primary mx-auto mb-4" />
                    <h1 className="text-4xl font-bold font-headline">{topic?.title || 'Yazılacaklar'}</h1>
                    <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
                        Konuyla ilgili anahtar kavramları, tanımları ve önemli notları oluşturun, kaydedin ve akıllı tahtada gösterin.
                    </p>
                    <div className="flex gap-2 justify-center mt-4">
                        <Button variant="outline" asChild>
                            <Link href={backUrl}>
                                <ArrowLeft className="mr-2 h-4 w-4"/> Akışa Geri Dön
                            </Link>
                        </Button>
                        <Button onClick={handleGenerate} disabled={isGenerating || isLoading}>
                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wand2 className="mr-2 h-4 w-4"/>}
                            Notları Yapay Zeka ile Doldur
                        </Button>
                        <Button variant="outline" onClick={handleDownload} disabled={definitions.length === 0 && notes.length === 0}>
                            <Download className="mr-2 h-4 w-4"/> JSON İndir
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                            İçeriği Kaydet ve Görüntüle
                        </Button>
                    </div>
                </div>
                
                <div className="mt-8 w-full">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <Card>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-2xl text-primary">Kavramlar ve Tanımları</CardTitle>
                                    <Button size="sm" variant="outline" onClick={addDefinition}><PlusCircle className="mr-2 h-4 w-4"/> Ekle</Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {definitions.length > 0 ? definitions.map((item, index) => (
                                <div key={item.id} className="space-y-2 border-b pb-3">
                                    <div className="flex items-center gap-2">
                                        <Input className="font-semibold" placeholder="Kavram..." value={item.content.term || ''} onChange={e => handleDefinitionChange(index, 'term', e.target.value)} />
                                        <Button size="icon" variant="ghost" className="shrink-0" onClick={() => removeDefinition(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                    </div>
                                    <Textarea placeholder="Tanım..." value={item.content.definition || ''} onChange={e => handleDefinitionChange(index, 'definition', e.target.value)}/>
                                </div>
                                )) : <p className="text-muted-foreground text-center py-4">Bu konu için tanım bulunamadı.</p>}
                            </CardContent>
                        </Card>
                        <Card>
                             <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-2xl text-primary">Önemli Notlar</CardTitle>
                                    <Button size="sm" variant="outline" onClick={addNote}><PlusCircle className="mr-2 h-4 w-4"/> Ekle</Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {notes.length > 0 ? notes.map((note, index) => (
                                    <div key={index} className="flex items-start gap-2">
                                        <Textarea value={note} onChange={(e) => handleNoteChange(index, e.target.value)} rows={2} />
                                        <Button size="icon" variant="ghost" className="shrink-0" onClick={() => removeNote(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                    </div>
                                )) : <p className="text-muted-foreground text-center py-4">Not bulunmuyor.</p>}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary"/></div>}>
            <OzetPageContent />
        </Suspense>
    )
}
