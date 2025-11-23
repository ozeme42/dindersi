
"use client"

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateLessonContent, type GenerateLessonContentInput, type GenerateLessonContentOutput } from '@/ai/flows/generate-lesson-content';
import { generateConceptMap } from '@/ai/flows/generate-concept-map-flow';
import { generateHtmlSlide } from '@/ai/flows/generate-html-slide-flow';
import type { LessonStep } from '@/lib/types';

const formSchema = z.object({
  sourceText: z.string().min(10, 'Kaynak metin en az 10 karakter olmalıdır.'),
});

type AiLessonStepGenerationDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  context: {
    topicId: string;
    topicTitle: string;
    sourceText?: string;
  } | null;
  moduleToGenerate: keyof GenerateLessonContentInput['modules'] | 'conceptMap' | 'htmlSlide' | null;
  onStepsGenerated: (steps: LessonStep[]) => void;
  mapAIOutputToSteps: (output: GenerateLessonContentOutput) => LessonStep[];
};

export function AiLessonStepGenerationDialog({
  isOpen,
  onOpenChange,
  context,
  moduleToGenerate,
  onStepsGenerated,
  mapAIOutputToSteps,
}: AiLessonStepGenerationDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sourceText: context?.sourceText || context?.topicTitle || '',
    },
  });
  
  useEffect(() => {
    if (context) {
      form.setValue('sourceText', context.sourceText || context.topicTitle || '');
    }
  }, [context, form, isOpen]);

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!context || !moduleToGenerate) {
      toast({ title: "Hata", description: "Geçersiz bağlam veya modül.", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    
    try {
      if (moduleToGenerate === 'conceptMap') {
          const mapData = await generateConceptMap({ topicSummary: data.sourceText });
          if (mapData && mapData.nodes && mapData.nodes.length > 0) {
              const conceptMapStep: LessonStep = {
                  type: 'conceptMap',
                  title: 'Kavram Haritası',
                  mapData: mapData,
              };
              onStepsGenerated([conceptMapStep]);
              handleClose();
          } else {
              toast({ title: "Hata", description: "Yapay zeka bir kavram haritası döndürmedi.", variant: "destructive" });
          }
      } else if (moduleToGenerate === 'htmlSlide') {
          const result = await generateHtmlSlide({ topicSummary: data.sourceText });
          if (result && result.htmlContent) {
              const htmlStep: LessonStep = {
                  type: 'content',
                  title: 'Yapay Zeka Slaytı',
                  content: result.htmlContent,
              };
              onStepsGenerated([htmlStep]);
              handleClose();
          } else {
             toast({ title: "Hata", description: "Yapay zeka bir HTML içeriği döndürmedi.", variant: "destructive" });
          }
      } else {
          const allModuleKeys: (keyof GenerateLessonContentInput['modules'])[] = [
            'summary', 'learningObjectives', 'conceptExplanations', 'keyConcepts', 
            'flashcards', 'multipleChoiceQuestions', 'trueFalseQuestions', 
            'fillInTheBlankQuestions', 'anagramQuestions', 'sentenceScrambleQuestions', 
            'visuals', 'infographicIdeas', 'videos', 'documents'
          ];
          
          const modules: GenerateLessonContentInput['modules'] = {};
          allModuleKeys.forEach(key => {
              modules[key] = key === moduleToGenerate;
          });

          const input: GenerateLessonContentInput = {
              topicSummary: data.sourceText,
              modules: modules,
          };
          
          const result = await generateLessonContent(input);
          
          if (result && Object.keys(result).length > 1) { // Check if more than just 'progress' key exists
              const newSteps = mapAIOutputToSteps(result);
              if (newSteps.length > 0) {
                  onStepsGenerated(newSteps);
                  handleClose();
              } else {
                  toast({ title: "Sonuç Yok", description: "Yapay zeka bu modül için bir içerik üretemedi.", variant: "default" });
              }
          } else {
              toast({ title: "Hata", description: "Yapay zeka bir sonuç döndürmedi veya boş bir sonuç üretti.", variant: "destructive" });
          }
      }
    } catch (error) {
      console.error("Error generating lesson step:", error);
      toast({ title: "Hata", description: "İçerik üretilirken bir hata oluştu.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
        form.reset();
    }, 300);
  }

  const moduleLabels: Record<string, string> = {
    summary: 'Özet (Akordiyon)',
    learningObjectives: 'Öğrenme Hedefleri',
    conceptExplanations: 'Kavram Açıklamaları',
    keyConcepts: 'Anahtar Kavramlar',
    flashcards: 'Bilgi Kartları',
    visuals: 'AI ile Görsel Oluştur',
    multipleChoiceQuestions: 'Çoktan Seçmeli Sorular',
    trueFalseQuestions: 'Doğru/Yanlış Soruları',
    fillInTheBlankQuestions: 'Boşluk Doldurma Soruları',
    anagramQuestions: 'Anagram Soruları',
    sentenceScrambleQuestions: 'Cümle Düzeltme Soruları',
    conceptMap: 'Kavram Haritası',
    htmlSlide: 'Slayt Sayfası'
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Yapay Zeka ile "{moduleLabels[moduleToGenerate || ''] || ''}" Oluştur</DialogTitle>
          <DialogDescription>
            Yapay zekanın içerik üretmesi için aşağıdaki kaynak metni kullanın veya düzenleyin.
          </DialogDescription>
        </DialogHeader>
        {isGenerating ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg text-muted-foreground">İçerik üretiliyor...</p>
            </div>
        ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <Controller
                    name="sourceText"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <div>
                        <Label htmlFor='sourceText'>Kaynak Metin</Label>
                        <Textarea id="sourceText" {...field} className="mt-1 min-h-[200px]" placeholder="Yapay zekanın veri üretmesi için konuyla ilgili bir metin veya anahtar kelimeler girebilirsiniz."/>
                        {fieldState.error && <p className="text-sm text-destructive mt-1">{fieldState.error.message}</p>}
                        </div>
                    )}
                />
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={handleClose}>İptal</Button>
                    <Button type="submit" disabled={isGenerating}>
                        <Wand2 className="mr-2 h-4 w-4" /> Üret
                    </Button>
                </DialogFooter>
            </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
