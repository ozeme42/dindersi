

"use client";

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateLessonContent, type GenerateLessonContentInput, type GenerateLessonContentOutput } from '@/ai/flows/generate-lesson-content';
import { generateConceptMap } from '@/ai/flows/generate-concept-map-flow';
import { generateHtmlSlide } from '@/ai/flows/generate-html-slide-flow';
import type { LessonStep } from '@/lib/types';
import { Checkbox } from './ui/checkbox';

const activityOptions = [
    { id: 'summary', label: 'Özet (Akordiyon)' },
    { id: 'learningObjectives', label: 'Öğrenme Hedefleri' },
    { id: 'keyTakeaways', label: 'Anahtar Çıkarımlar' },
    { id: 'conceptExplanations', label: 'Kavram Açıklamaları' },
    { id: 'keyConcepts', label: 'Anahtar Kavramlar (Liste)' },
    { id: 'flashcards', label: 'Bilgi Kartları' },
    { id: 'multipleChoiceQuestions', label: 'Çoktan Seçmeli Sorular' },
    { id: 'trueFalseQuestions', label: 'Doğru/Yanlış Soruları' },
    { id: 'fillInTheBlankQuestions', label: 'Boşluk Doldurma Soruları' },
    { id: 'anagramQuestions', label: 'Anagram Soruları' },
    { id: 'sentenceScrambleQuestions', label: 'Cümle Düzeltme Soruları' },
    { id: 'visuals', label: 'Görsel/Diyagram (AI ile)' },
    { id: 'conceptMap', label: 'Kavram Haritası (AI ile)' },
    { id: 'htmlSlide', label: 'HTML Slayt (AI ile)' },
] as const;

const formSchema = z.object({
  sourceText: z.string().min(10, 'Kaynak metin en az 10 karakter olmalıdır.'),
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
};

export function AiLessonStepGenerationDialog({
  isOpen,
  onOpenChange,
  context,
  onStepsGenerated,
}: AiLessonStepGenerationDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sourceText: '',
      modules: { summary: true, multipleChoiceQuestions: true },
    },
  });
  
  useEffect(() => {
    if (context && isOpen) {
      form.setValue('sourceText', context.sourceText || context.topicTitle || '');
    }
  }, [context, isOpen, form]);

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
            const mapData = await generateConceptMap({ topicSummary: data.sourceText });
            if (mapData && mapData.nodes && mapData.nodes.length > 0) {
                generatedSteps.push({ type: 'conceptMap', title: 'Kavram Haritası', mapData: mapData });
            }
        }
        if (inputModules.htmlSlide) {
            const result = await generateHtmlSlide({ topicSummary: data.sourceText });
             if (result && result.htmlContent) {
                generatedSteps.push({ type: 'content', title: 'Yapay Zeka Slaytı', content: result.htmlContent });
            }
        }
        
        // Handle standard content generation
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
            if (result && Object.keys(result).length > 1) { // More than just 'progress'
                generatedSteps.push(...mapAIOutputToSteps(result));
            }
        }

        if (generatedSteps.length > 0) {
            onStepsGenerated(generatedSteps);
            handleClose();
        } else {
             toast({ title: "Sonuç Yok", description: "Yapay zeka bu modüller için bir içerik üretemedi.", variant: "default" });
        }

    } catch (error) {
      console.error("Error generating lesson step:", error);
      toast({ title: "Hata", description: "İçerik üretilirken bir hata oluştu.", variant: "destructive" });
      hasError = true;
    } finally {
      setIsGenerating(false);
      if (hasError) onOpenChange(true); // Re-open on error
    }
  };
  
  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
        form.reset({
            sourceText: '',
            modules: { summary: true, multipleChoiceQuestions: true },
        });
    }, 300);
  }

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
        if (output.keyConcepts && output.keyConcepts.length > 0) {
             newSteps.push({ type: 'content', title: 'Anahtar Kavramlar', content: `<ul>${output.keyConcepts.map(item => `<li>${item}</li>`).join('')}</ul>` });
        }
        if (output.flashcards && output.flashcards.length > 0) {
            newSteps.push({ type: 'flashcard', title: 'Bilgi Kartları', cards: output.flashcards });
        }
        if (output.multipleChoiceQuestions && output.multipleChoiceQuestions.length > 0) {
            output.multipleChoiceQuestions.forEach(q => newSteps.push({ type: 'mcq', title: `Kontrol Sorusu`, ...q }));
        }
        if (output.trueFalseQuestions && output.trueFalseQuestions.length > 0) {
            output.trueFalseQuestions.forEach(q => newSteps.push({ type: 'tf', title: 'Doğru/Yanlış', ...q }));
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
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <Sparkles className="text-purple-400"/> AI ile İçerik Üretimi
          </DialogTitle>
          <DialogDescription>
            Yapay zeka desteğiyle ders akışınız için hızlıca çeşitli içerik türleri oluşturun.
          </DialogDescription>
        </DialogHeader>
        {isGenerating ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
                <p className="text-lg text-muted-foreground">İçerikleriniz üretiliyor...</p>
            </div>
        ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
                 <div className="px-6 py-4 flex-grow overflow-y-auto space-y-6">
                    <div className="rounded-md border bg-muted/50 p-3">
                        <p className="text-sm font-semibold">Hedef Konu</p>
                        <p className="text-sm text-muted-foreground">{context?.topicTitle}</p>
                    </div>

                    <Controller
                        name="sourceText"
                        control={form.control}
                        render={({ field, fieldState }) => (
                            <div>
                                <Label htmlFor='sourceText'>Kaynak Metin</Label>
                                <Textarea id="sourceText" {...field} className="mt-1 min-h-[120px] bg-background" placeholder="Yapay zekanın veri üretmesi için konuyla ilgili bir metin veya anahtar kelimeler girebilirsiniz."/>
                                {fieldState.error && <p className="text-sm text-destructive mt-1">{fieldState.error.message}</p>}
                            </div>
                        )}
                    />
                    
                    <Controller
                        name="modules"
                        control={form.control}
                        render={({ field, fieldState }) => (
                            <div>
                                <Label>Üretilecek İçerik Türleri</Label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                                {activityOptions.map(item => (
                                    <div key={item.id} className="flex items-center space-x-2 p-2 rounded-md bg-muted/30">
                                        <Checkbox
                                            id={item.id}
                                            checked={field.value?.[item.id] || false}
                                            onCheckedChange={(checked) => {
                                                field.onChange({ ...field.value, [item.id]: checked });
                                            }}
                                        />
                                        <Label htmlFor={item.id} className="text-xs font-medium leading-none cursor-pointer">
                                            {item.label}
                                        </Label>
                                    </div>
                                ))}
                                </div>
                                {fieldState.error && <p className="text-sm text-destructive mt-1">{fieldState.error.message}</p>}
                            </div>
                        )}
                    />
                 </div>
                 <DialogFooter className="p-6 border-t bg-muted/20">
                    <Button type="button" variant="ghost" onClick={handleClose}>İptal</Button>
                    <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                        <Wand2 className="mr-2 h-4 w-4" /> Üretimi Başlat
                    </Button>
                </DialogFooter>
            </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

