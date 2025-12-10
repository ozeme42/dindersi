
'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Sparkles, Wand2, Trash2, CheckCircle2, FileText, Database } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { generateActivityData } from '@/ai/flows/generate-activity-data-flow';
import type { AiActivityDataOutput } from '@/ai/flows/generate-activity-data-flow';
import { saveGeneratedActivityItems } from '@/app/teacher/activity-data/actions';
import { Card, CardContent, CardHeader } from './ui/card';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';

const activityOptions = [
    { id: 'generateConcepts', label: 'Anahtar Kavramlar', description: 'Konuyla ilgili temel terimler ve kavramlar.' },
    { id: 'generateDefinitions', label: 'Kavram-Tanım Eşleştirmeleri', description: 'Kavramların açıklamalarıyla birlikte eşleştirilmesi.' },
    { id: 'generateSentences', label: 'Özet Cümleleri', description: 'Konuyu özetleyen önemli cümleler.' },
] as const;

const formSchema = z.object({
    activities: z.array(z.string()).min(1, 'Lütfen en az bir içerik türü seçin.'),
    contextText: z.string().optional(),
});

type AiActivityGenerationPanelProps = {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    context: {
        courseId: string;
        unitId: string;
        topicId: string;
        topicTitle: string;
        sourceText?: string;
    } | null;
    onDataGenerated: () => void;
};

type Step = 'setup' | 'generating' | 'review';

export function AiActivityGenerationPanel({
    isOpen,
    onOpenChange,
    context,
    onDataGenerated,
}: AiActivityGenerationPanelProps) {
    const [step, setStep] = useState<Step>('setup');
    const [reviewedData, setReviewedData] = useState<AiActivityDataOutput>({});
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            activities: ['generateConcepts', 'generateDefinitions', 'generateSentences'],
            contextText: context?.sourceText || '',
        },
    });
    
    useEffect(() => {
        if (context) {
            form.setValue('contextText', context.sourceText || '');
        }
    }, [context, form]);

    const onSubmit = async (data: z.infer<typeof formSchema>) => {
        if (!context) {
            toast({ title: "Hata", description: "Veri üretmek için bir konu seçmelisiniz.", variant: "destructive" });
            return;
        }
        setStep('generating');
        try {
            const input = {
                topicTitle: context.topicTitle,
                contextText: data.contextText,
                generateConcepts: data.activities.includes('generateConcepts'),
                generateDefinitions: data.activities.includes('generateDefinitions'),
                generateSentences: data.activities.includes('generateSentences'),
            };
            
            const result = await generateActivityData(input);
            setReviewedData(result);
            setStep('review');

        } catch (error) {
            console.error("Error generating activity data:", error);
            toast({ title: "Hata", description: "Veri üretilirken bir hata oluştu.", variant: "destructive" });
            setStep('setup');
        }
    };

    const handleSaveToDatabase = async () => {
        if (!reviewedData || !context) return;
        setIsSaving(true);
        const result = await saveGeneratedActivityItems({
            courseId: context.courseId,
            unitId: context.unitId,
            topicId: context.topicId,
            content: reviewedData
        });

        if (result.success) {
            toast({ title: 'Başarılı!', description: `${result.count} yeni veri öğesi kaydedildi.` });
            onDataGenerated();
            handleClose();
        } else {
            toast({ title: 'Hata', description: result.error, variant: 'destructive' });
        }
        setIsSaving(false);
    };

    const handleClose = () => {
        onOpenChange(false);
        setTimeout(() => {
            form.reset();
            setStep('setup');
            setReviewedData({});
        }, 300);
    };

    const handleFieldChange = (type: keyof AiActivityDataOutput, index: number, field: 'concept' | 'definition' | 'text', value: string) => {
        setReviewedData(prev => {
            if (!prev) return prev;
            const newData = { ...prev };
            if (type === 'concepts' && newData.concepts) {
                newData.concepts[index] = value;
            }
            if (type === 'summarySentences' && newData.summarySentences) {
                newData.summarySentences[index] = value;
            }
            if (type === 'conceptDefinitions' && newData.conceptDefinitions) {
                if (field === 'concept') newData.conceptDefinitions[index].concept = value;
                if (field === 'definition') newData.conceptDefinitions[index].definition = value;
            }
            return newData;
        });
    }
    
    const handleDeleteItem = (type: keyof AiActivityDataOutput, index: number) => {
         setReviewedData(prev => {
            if (!prev) return prev;
            const newData = { ...prev };
            if (type === 'concepts' && newData.concepts) {
                newData.concepts.splice(index, 1);
            }
            if (type === 'summarySentences' && newData.summarySentences) {
                newData.summarySentences.splice(index, 1);
            }
            if (type === 'conceptDefinitions' && newData.conceptDefinitions) {
                newData.conceptDefinitions.splice(index, 1);
            }
            return newData;
        });
    }

    const renderReviewContent = () => {
        if (!reviewedData) return null;
        return (
            <div className='space-y-6'>
                {reviewedData.concepts && reviewedData.concepts.length > 0 && (
                    <Card className="bg-slate-900 border-white/10">
                        <CardHeader className="pb-3 border-b border-white/5">
                             <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-blue-500/20 rounded border border-blue-500/30"><Database className="h-4 w-4 text-blue-400"/></div>
                                <h4 className="font-bold text-white">Anahtar Kavramlar ({reviewedData.concepts.length})</h4>
                             </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-2">
                            {reviewedData.concepts.map((concept, i) => (
                                <div key={i} className="flex gap-2 items-center group">
                                    <Input 
                                        value={concept} 
                                        onChange={(e) => handleFieldChange('concepts', i, 'text', e.target.value)} 
                                        className="bg-slate-950 border-white/10 text-white focus-visible:ring-blue-500/50"
                                    />
                                    <Button size="icon" variant="ghost" onClick={() => handleDeleteItem('concepts', i)} className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 className="h-4 w-4"/>
                                    </Button>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}
                 {reviewedData.conceptDefinitions && reviewedData.conceptDefinitions.length > 0 && (
                    <Card className="bg-slate-900 border-white/10">
                        <CardHeader className="pb-3 border-b border-white/5">
                             <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-purple-500/20 rounded border border-purple-500/30"><FileText className="h-4 w-4 text-purple-400"/></div>
                                <h4 className="font-bold text-white">Kavram-Tanım Eşleştirmeleri ({reviewedData.conceptDefinitions.length})</h4>
                             </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            {reviewedData.conceptDefinitions.map((pair, i) => (
                                <div key={i} className="space-y-2 p-3 border border-white/5 rounded-lg bg-slate-950/30 group relative">
                                    <Button size="icon" variant="ghost" onClick={() => handleDeleteItem('conceptDefinitions', i)} className="absolute top-2 right-2 h-6 w-6 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 className="h-3 w-3"/>
                                    </Button>
                                    <div className="flex gap-2 items-center">
                                        <Input 
                                            value={pair.concept} 
                                            onChange={(e) => handleFieldChange('conceptDefinitions', i, 'concept', e.target.value)} 
                                            placeholder="Kavram"
                                            className="bg-slate-950 border-white/10 text-white font-bold text-purple-300 focus-visible:ring-purple-500/50"
                                        />
                                    </div>
                                    <Textarea 
                                        value={pair.definition} 
                                        onChange={(e) => handleFieldChange('conceptDefinitions', i, 'definition', e.target.value)} 
                                        placeholder="Tanım"
                                        className="bg-slate-950 border-white/10 text-white min-h-[60px] text-sm focus-visible:ring-purple-500/50"
                                    />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}
                {reviewedData.summarySentences && reviewedData.summarySentences.length > 0 && (
                    <Card className="bg-slate-900 border-white/10">
                        <CardHeader className="pb-3 border-b border-white/5">
                             <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-emerald-500/20 rounded border border-emerald-500/30"><CheckCircle2 className="h-4 w-4 text-emerald-400"/></div>
                                <h4 className="font-bold text-white">Özet Cümleleri ({reviewedData.summarySentences.length})</h4>
                             </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-2">
                            {reviewedData.summarySentences.map((sentence, i) => (
                                <div key={i} className="flex gap-2 items-start group">
                                    <Textarea 
                                        value={sentence} 
                                        onChange={(e) => handleFieldChange('summarySentences', i, 'text', e.target.value)} 
                                        className="bg-slate-950 border-white/10 text-white min-h-[60px] text-sm focus-visible:ring-emerald-500/50"
                                    />
                                    <Button size="icon" variant="ghost" onClick={() => handleDeleteItem('summarySentences', i)} className="text-slate-500 hover:text-red-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 className="h-4 w-4"/>
                                    </Button>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}
            </div>
        );
    };

    const renderContent = () => {
        switch (step) {
            case 'generating':
                return (
                    <div className="flex flex-col items-center justify-center min-h-[300px] gap-6 text-center p-8">
                        <div className="relative">
                            <div className="absolute inset-0 bg-purple-500 blur-xl opacity-20 animate-pulse rounded-full"></div>
                            <Loader2 className="h-16 w-16 animate-spin text-purple-400 relative z-10" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white mb-2">Yapay Zeka Çalışıyor</h3>
                            <p className="text-slate-400">İçerik analiz ediliyor ve etkinlik verileri oluşturuluyor...</p>
                        </div>
                    </div>
                );
            case 'review':
                return (
                    <>
                        <ScrollArea className="h-[60vh] -mx-6 px-6">
                            {renderReviewContent()}
                        </ScrollArea>
                        <DialogFooter className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center w-full">
                            <div className="text-xs text-slate-500">
                                Toplam {
                                    (reviewedData.concepts?.length || 0) + 
                                    (reviewedData.conceptDefinitions?.length || 0) + 
                                    (reviewedData.summarySentences?.length || 0)
                                } öğe bulundu.
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" onClick={() => setStep('setup')} className="text-slate-400 hover:text-white hover:bg-white/5">Geri Dön</Button>
                                <Button onClick={handleSaveToDatabase} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20">
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Verileri Kaydet
                                </Button>
                            </div>
                        </DialogFooter>
                    </>
                );
            case 'setup':
            default:
                return (
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="rounded-xl border border-purple-500/30 bg-purple-900/10 p-4 flex items-start gap-3">
                            <Sparkles className="h-5 w-5 text-purple-400 mt-0.5" />
                            <div>
                                <p className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-1">HEDEF KONU</p>
                                <p className="text-lg font-medium text-white">{context?.topicTitle}</p>
                            </div>
                        </div>

                        <Controller
                            name="contextText"
                            control={form.control}
                            render={({ field }) => (
                                <div className="space-y-2">
                                    <Label htmlFor='contextText' className="text-slate-300">Kaynak Metin (İsteğe Bağlı)</Label>
                                    <Textarea 
                                        id="contextText" 
                                        {...field} 
                                        className="min-h-[120px] bg-slate-900 border-white/10 text-white focus-visible:ring-purple-500 placeholder:text-slate-600 text-sm leading-relaxed" 
                                        placeholder="Yapay zekanın veri üretmesi için konuyla ilgili bir metin veya anahtar kelimeler girebilirsiniz. Boş bırakırsanız, sadece konu başlığını kullanacaktır."
                                    />
                                </div>
                            )}
                        />

                        <Controller
                            name="activities"
                            control={form.control}
                            render={({ field }) => (
                                <div className="space-y-3">
                                    <Label className="text-slate-300">Üretilecek İçerik Türleri</Label>
                                    <div className="grid gap-3">
                                        {activityOptions.map((item) => (
                                            <div key={item.id} className="flex items-start space-x-3 p-3 rounded-lg border border-white/5 bg-slate-900/50 hover:bg-slate-900 transition-colors cursor-pointer" onClick={() => {
                                                 const newValue = field.value?.includes(item.id)
                                                    ? field.value?.filter((value) => value !== item.id)
                                                    : [...(field.value || []), item.id];
                                                field.onChange(newValue);
                                            }}>
                                                <Checkbox
                                                    id={`activity-${item.id}`}
                                                    checked={field.value?.includes(item.id)}
                                                    onCheckedChange={(checked) => {
                                                        const newValue = checked
                                                            ? [...(field.value || []), item.id]
                                                            : field.value?.filter((value) => value !== item.id);
                                                        field.onChange(newValue);
                                                    }}
                                                    className="mt-1 border-white/20 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
                                                />
                                                <div className="grid gap-1.5 leading-none">
                                                    <Label htmlFor={`activity-${item.id}`} className="font-bold text-white cursor-pointer">{item.label}</Label>
                                                    <p className="text-xs text-slate-500">{item.description}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {form.formState.errors.activities && <p className="text-sm text-red-400 mt-1">{form.formState.errors.activities.message}</p>}
                                </div>
                            )}
                        />
                        <DialogFooter className="pt-4 border-t border-white/10">
                            <Button type="button" variant="ghost" onClick={handleClose} className="text-slate-400 hover:text-white hover:bg-white/5">İptal</Button>
                            <Button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg shadow-purple-900/20">
                                <Wand2 className="mr-2 h-4 w-4" /> Üretimi Başlat
                            </Button>
                        </DialogFooter>
                    </form>
                );
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-2xl flex flex-col h-auto max-h-[90vh] bg-slate-950 border-white/10 text-slate-100 shadow-2xl p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-4 border-b border-white/5 bg-slate-900/50">
                    <DialogTitle className="flex items-center gap-3 text-2xl font-black uppercase tracking-tight text-white">
                        <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/30">
                            <Sparkles className="h-6 w-6 text-purple-400" />
                        </div>
                        AI Veri Üretici
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Yapay zeka desteğiyle etkinlikleriniz için hızlıca içerik oluşturun.
                    </DialogDescription>
                </DialogHeader>
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {renderContent()}
                </div>
            </DialogContent>
        </Dialog>
    );
}
