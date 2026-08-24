'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, Wand2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateLessonContent, type GenerateLessonContentInput, type GenerateLessonContentOutput } from '@/ai/flows/generate-lesson-content';
import { generateConceptMap } from '@/ai/flows/generate-concept-map-flow';
import { generateHtmlSlide } from '@/ai/flows/generate-html-slide-flow';
import type { LessonStep } from '@/lib/types';
import { Checkbox } from './ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const allActivityOptions = {
    anlatim: [
        { id: 'summary', label: 'Özet (Akordiyon)' },
        { id: 'learningObjectives', label: 'Öğrenme Hedefleri' },
        { id: 'conceptExplanations', label: 'Kavram Açıklamaları' },
        { id: 'flashcards', label: 'Bilgi Kartları' },
        { id: 'keyTakeaways', label: 'Anahtar Çıkarımlar' },
        { id: 'htmlSlide', label: 'İnteraktif HTML Slayt' },
        { id: 'conceptMap', label: 'Kavram Haritası (Görsel Şema)' },
    ],
    degerlendirme: [
        { id: 'multipleChoiceQuestions', label: 'Çoktan Seçmeli Sorular' },
        { id: 'trueFalseQuestions', label: 'Doğru/Yanlış Listesi' },
        { id: 'fillInTheBlankQuestions', label: 'Boşluk Doldurma Soruları' },
        { id: 'sentenceScrambleQuestions', label: 'Cümle Düzeltme Soruları' },
        { id: 'anagramQuestions', label: 'Anagram / Kelime Soruları' },
    ]
} as const;

const formSchema = z.object({
  sourceText: z.string().min(5, 'Kaynak metin veya konu başlığı en az 5 karakter olmalıdır.'),
  modules: z.record(z.boolean().optional()).refine(val => Object.values(val).some(v => v), {
    message: "En az bir içerik türü seçmelisiniz."
  })
});

type AiLessonStepGenerationDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  context: {
    topicId: string;
    topicTitle: string;
    sourceText?: string;
  } | null;
  onStepsGenerated: (steps: LessonStep[]) => void;
  generationType: 'anlatim' | 'degerlendirme' | null;
};

export function AiLessonStepGenerationDialog({
  isOpen,
  onOpenChange,
  context,
  onStepsGenerated,
  generationType,
}: AiLessonStepGenerationDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sourceText: '',
      modules: {},
    },
  });
  
  const activityOptions = generationType ? allActivityOptions[generationType] : [];

  useEffect(() => {
    if (context && isOpen) {
      form.setValue('sourceText', context.sourceText || context.topicTitle || '');
      
      const defaultModules: { [key: string]: boolean } = {};
      if (generationType === 'anlatim') {
        defaultModules['summary'] = true;
        defaultModules['conceptExplanations'] = true;
        defaultModules['flashcards'] = true;
      } else if (generationType === 'degerlendirme') {
        defaultModules['multipleChoiceQuestions'] = true;
        defaultModules['trueFalseQuestions'] = true;
        defaultModules['fillInTheBlankQuestions'] = true;
      }
      form.setValue('modules', defaultModules);
    }
  }, [context, isOpen, form, generationType]);

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!context) {
      toast({ title: "Hata", description: "Geçersiz bağlam.", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    
    let generatedSteps: LessonStep[] = [];
    let hasError = false;

    try {
        const inputModules = data.modules as GenerateLessonContentInput['modules'];
        
        // Handle special AI flows first
        if (inputModules.conceptMap) {
            try {
                const mapData = await generateConceptMap({ topicSummary: data.sourceText });
                if (mapData && mapData.nodes && mapData.nodes.length > 0) {
                    generatedSteps.push({ type: 'conceptMap', title: 'Kavram Haritası', mapData: mapData });
                }
            } catch (e) {
                console.error("Concept map generation error:", e);
            }
        }
        if (inputModules.htmlSlide) {
            try {
                const result = await generateHtmlSlide({ topicSummary: data.sourceText });
                if (result && result.htmlContent) {
                    generatedSteps.push({ type: 'htmlSlide', title: 'İnteraktif HTML Slaytı', htmlContent: result.htmlContent });
                }
            } catch (e) {
                console.error("HTML slide generation error:", e);
            }
        }
        
        const standardModules: GenerateLessonContentInput['modules'] = {};
        let needsStandardCall = false;
        for (const key in inputModules) {
            if (key !== 'conceptMap' && key !== 'htmlSlide' && inputModules[key as keyof typeof inputModules]) {
                standardModules[key as keyof typeof standardModules] = true;
                needsStandardCall = true;
            }
        }

        if (needsStandardCall) {
            const input: GenerateLessonContentInput = {
                topicSummary: data.sourceText,
                modules: standardModules,
            };
            const result = await generateLessonContent(input);
            if (result && Object.keys(result).length > 1) {
                generatedSteps.push(...mapAIOutputToSteps(result));
            }
        }

        if (generatedSteps.length > 0) {
            onStepsGenerated(generatedSteps);
            handleClose();
        } else {
             toast({ title: "Sonuç Yok", description: "Yapay zeka bu modüller için içerik üretemedi.", variant: "default" });
        }

    } catch (error: any) {
      console.error("Error generating lesson step:", error);
      toast({ title: "Hata", description: "İçerik üretilirken bir hata oluştu: " + error.message, variant: "destructive" });
      hasError = true;
    } finally {
      setIsGenerating(false);
      if (hasError) onOpenChange(true);
    }
  };
  
  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
        form.reset({
            sourceText: '',
            modules: {},
        });
    }, 300);
  };

  const mapAIOutputToSteps = (output: GenerateLessonContentOutput): LessonStep[] => {
        const newSteps: LessonStep[] = [];
        if (output.summary && output.summary.length > 0) {
            newSteps.push({ type: 'accordion', title: 'Konu Özeti', items: output.summary.map(s => ({ title: s.title, content: `<ul>${s.content}</ul>` })) });
        }
        if (output.learningObjectives && output.learningObjectives.length > 0) {
            newSteps.push({ type: 'objectiveList', title: 'Öğrenme Hedefleri', items: output.learningObjectives });
        }
        if (output.keyTakeaways && output.keyTakeaways.length > 0) {
            newSteps.push({ type: 'content', title: 'Anahtar Çıkarımlar', content: `<ul>${output.keyTakeaways.map(item => `<li>${item}</li>`).join('')}</ul>` });
        }
        if (output.conceptExplanations && output.conceptExplanations.length > 0) {
            newSteps.push({ type: 'conceptExplanation', title: 'Kavram Açıklamaları', items: output.conceptExplanations });
        }
        if (output.flashcards && output.flashcards.length > 0) {
            newSteps.push({ type: 'flashcard', title: 'Bilgi Kartları', cards: output.flashcards });
        }
        if (output.multipleChoiceQuestions && output.multipleChoiceQuestions.length > 0) {
            output.multipleChoiceQuestions.forEach((q, idx) => newSteps.push({ type: 'mcq', title: `Kontrol Sorusu ${idx + 1}`, ...q }));
        }
        if (output.trueFalseQuestions && output.trueFalseQuestions.length > 0) {
            newSteps.push({
                type: 'trueFalseList',
                title: 'Doğru / Yanlış Alıştırması',
                questions: output.trueFalseQuestions.map((q: any) => ({
                    statement: q.statement || q.question || q.text || '',
                    isTrue: q.isTrue !== undefined ? q.isTrue : true
                }))
            });
        }
        if (output.fillInTheBlankQuestions && output.fillInTheBlankQuestions.length > 0) {
            output.fillInTheBlankQuestions.forEach(q => newSteps.push({ type: 'fitb', title: 'Boşluk Doldurma', ...q }));
        }
        if (output.anagramQuestions && output.anagramQuestions.length > 0) {
            output.anagramQuestions.forEach(q => newSteps.push({ type: 'anagram', title: 'Anagram', ...q }));
        }
        if (output.sentenceScrambleQuestions && output.sentenceScrambleQuestions.length > 0) {
            output.sentenceScrambleQuestions.forEach(q => newSteps.push({ type: 'sentenceScramble', title: 'Cümle Düzeltme', ...q }));
        }
        if (output.generatedImageDataUri) {
            newSteps.push({ type: 'visual', title: 'Konu Görseli', imageUrl: output.generatedImageDataUri, prompt: `educational illustration for ${context?.topicTitle}` });
        }
        return newSteps;
    };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl flex flex-col h-auto max-h-[90vh] bg-slate-950 border border-white/10 text-slate-100 shadow-2xl p-0 overflow-hidden rounded-3xl">
        <DialogHeader className="p-6 pb-4 border-b border-white/10 bg-slate-900/60 backdrop-blur-md">
          <DialogTitle className="flex items-center gap-3 text-xl font-black uppercase tracking-tight text-white">
            <div className="p-2 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-2xl border border-purple-500/30 text-purple-400">
                <Sparkles className="h-5 w-5" />
            </div>
            Yapay Zeka ile Sunum & İçerik Üretimi
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            {generationType === 'anlatim' ? 'Konu anlatımı, kavramlar ve bilgi kartları ' : 'Değerlendirme soruları ve alıştırmalar '}
            otomatik olarak oluşturulup taslağa eklenecektir.
          </DialogDescription>
        </DialogHeader>

        {isGenerating ? (
            <div className="flex flex-col items-center justify-center min-h-[360px] gap-5 text-center p-8">
                <div className="relative">
                    <div className="absolute inset-0 bg-purple-500 blur-2xl opacity-30 animate-pulse rounded-full"></div>
                    <Loader2 className="h-14 w-14 animate-spin text-purple-400 relative z-10" />
                </div>
                <div>
                    <h3 className="text-lg font-black text-white mb-1.5">Yapay Zeka İçeriği Üretiyor</h3>
                    <p className="text-xs text-slate-400 max-w-sm">
                        Kaynak metin taranıyor, pedagojik içerik ve akıllı tahta slaytları hazırlanıyor...
                    </p>
                </div>
            </div>
        ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
                 <div className="px-6 py-4 flex-grow overflow-y-auto space-y-5">
                    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-3.5 flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-bold uppercase text-purple-400 tracking-wider">Hedef Konu</span>
                            <p className="text-sm font-black text-white">{context?.topicTitle || 'Konu Seçilmedi'}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] text-indigo-300 border-indigo-500/30 bg-indigo-500/10">
                            {generationType === 'anlatim' ? 'Anlatım Paketi' : 'Değerlendirme Paketi'}
                        </Badge>
                    </div>

                    <Controller
                        name="sourceText"
                        control={form.control}
                        render={({ field, fieldState }) => (
                            <div className="space-y-1.5">
                                <Label htmlFor='contextText' className="text-xs font-bold text-slate-300 uppercase tracking-wider">Kaynak Metin / Anahtar Bilgiler</Label>
                                <Textarea 
                                    id="contextText" 
                                    {...field} 
                                    className="min-h-[110px] bg-slate-950 border-white/10 text-white focus-visible:ring-purple-500 placeholder:text-slate-600 text-xs leading-relaxed rounded-2xl" 
                                    placeholder="Yapay zekanın veri üretmesi için metin veya anahtar kelimeler girin..."
                                />
                                {fieldState.error && <p className="text-xs text-rose-400 mt-1">{fieldState.error.message}</p>}
                            </div>
                        )}
                    />
                    
                    <Controller
                        name="modules"
                        control={form.control}
                        render={({ field, fieldState }) => (
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Üretilecek İçerik Türleri</Label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {activityOptions.map(item => (
                                    <div 
                                        key={item.id} 
                                        onClick={() => field.onChange({ ...field.value, [item.id]: !field.value?.[item.id] })}
                                        className={cn(
                                            "flex items-center space-x-3 p-3 rounded-2xl border transition-all cursor-pointer",
                                            field.value?.[item.id] 
                                                ? "bg-purple-950/40 border-purple-500/50 shadow-md text-white" 
                                                : "bg-slate-900/40 border-white/5 text-slate-400 hover:bg-slate-900/70"
                                        )}
                                    >
                                        <Checkbox
                                            id={item.id}
                                            checked={field.value?.[item.id] || false}
                                            onCheckedChange={(checked) => {
                                                field.onChange({ ...field.value, [item.id]: checked });
                                            }}
                                            className="border-white/20 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-500"
                                        />
                                        <Label htmlFor={item.id} className="text-xs font-bold leading-none cursor-pointer flex-1">
                                            {item.label}
                                        </Label>
                                    </div>
                                ))}
                                </div>
                                {fieldState.error && <p className="text-xs text-rose-400 mt-1">{fieldState.error.message}</p>}
                            </div>
                        )}
                    />
                 </div>

                 <DialogFooter className="p-4 px-6 border-t border-white/10 bg-slate-900/80 backdrop-blur-md flex items-center justify-between sm:justify-between">
                    <Button type="button" variant="ghost" onClick={handleClose} className="text-slate-400 hover:text-white rounded-xl">
                        İptal
                    </Button>
                    <Button 
                        type="submit" 
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black rounded-xl shadow-lg shadow-purple-950/50 px-6 cursor-pointer text-xs"
                    >
                        <Wand2 className="mr-2 h-4 w-4 text-yellow-300" /> Üretimi Başlat
                    </Button>
                </DialogFooter>
            </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
