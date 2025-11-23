

"use client"

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
import { Loader2, Sparkles, Wand2, Trash2 } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { generateActivityData } from '@/ai/flows/generate-activity-data-flow';
import type { AiActivityDataOutput } from '@/ai/flows/generate-activity-data-flow';
import { saveGeneratedActivityItems } from '@/app/teacher/activity-data/actions';
import { Card, CardContent } from './ui/card';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';

const activityOptions = [
  { id: 'generateConcepts', label: 'Anahtar Kavramlar' },
  { id: 'generateDefinitions', label: 'Kavram-Tanım Eşleştirmeleri' },
  { id: 'generateSentences', label: 'Özet Cümleleri' },
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
      <div className='space-y-4'>
        {reviewedData.concepts && (
          <Card><CardContent className="p-4 space-y-2">
            <h4 className="font-semibold mb-2">Anahtar Kavramlar</h4>
            {reviewedData.concepts.map((concept, i) => (
                <div key={i} className="flex gap-2 items-center"><Input value={concept} onChange={(e) => handleFieldChange('concepts', i, 'text', e.target.value)} /><Button size="icon" variant="ghost" onClick={() => handleDeleteItem('concepts', i)}><Trash2 className="h-4 w-4 text-destructive"/></Button></div>
            ))}
          </CardContent></Card>
        )}
         {reviewedData.conceptDefinitions && (
          <Card><CardContent className="p-4 space-y-2">
              <h4 className="font-semibold mb-2">Kavram-Tanım Eşleştirmeleri</h4>
              {reviewedData.conceptDefinitions.map((pair, i) => (
                  <div key={i} className="space-y-1 p-2 border rounded-md"><div className="flex gap-2 items-center"><Input value={pair.concept} onChange={(e) => handleFieldChange('conceptDefinitions', i, 'concept', e.target.value)} placeholder="Kavram"/><Button size="icon" variant="ghost" onClick={() => handleDeleteItem('conceptDefinitions', i)}><Trash2 className="h-4 w-4 text-destructive"/></Button></div><Textarea value={pair.definition} onChange={(e) => handleFieldChange('conceptDefinitions', i, 'definition', e.target.value)} placeholder="Tanım"/></div>
              ))}
          </CardContent></Card>
        )}
        {reviewedData.summarySentences && (
          <Card><CardContent className="p-4 space-y-2">
            <h4 className="font-semibold mb-2">Özet Cümleleri</h4>
            {reviewedData.summarySentences.map((sentence, i) => (
                <div key={i} className="flex gap-2 items-center"><Textarea value={sentence} onChange={(e) => handleFieldChange('summarySentences', i, 'text', e.target.value)} /><Button size="icon" variant="ghost" onClick={() => handleDeleteItem('summarySentences', i)}><Trash2 className="h-4 w-4 text-destructive"/></Button></div>
            ))}
          </CardContent></Card>
        )}
      </div>
    );
  };

  const renderContent = () => {
    switch (step) {
      case 'generating':
        return (
          <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">Etkinlik verileri üretiliyor...</p>
          </div>
        );
      case 'review':
        return (
          <>
            <ScrollArea className="h-[60vh] -mx-6">
              <div className="px-6 py-4">{renderReviewContent()}</div>
            </ScrollArea>
            <DialogFooter className="mt-4">
              <Button variant="ghost" onClick={() => setStep('setup')}>Geri</Button>
              <Button onClick={handleSaveToDatabase} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verileri Kaydet
              </Button>
            </DialogFooter>
          </>
        );
      case 'setup':
      default:
        return (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="rounded-md border bg-muted/50 p-3">
              <p className="text-sm font-semibold">Konu Başlığı</p>
              <p className="text-lg text-primary">{context?.topicTitle}</p>
            </div>
             <Controller
              name="contextText"
              control={form.control}
              render={({ field }) => (
                <div>
                  <Label htmlFor='contextText'>Kaynak Metin (İsteğe Bağlı)</Label>
                  <Textarea id="contextText" {...field} className="mt-1 min-h-[120px]" placeholder="Yapay zekanın veri üretmesi için konuyla ilgili bir metin veya anahtar kelimeler girebilirsiniz. Boş bırakırsanız, sadece konu başlığını kullanacaktır."/>
                </div>
              )}
            />
            <Controller
              name="activities"
              control={form.control}
              render={({ field }) => (
                <div className="space-y-2">
                  <Label>Üretilecek İçerik Türleri</Label>
                  <div className="space-y-1">
                    {activityOptions.map((item) => (
                      <div key={item.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`activity-${item.id}`}
                          checked={field.value?.includes(item.id)}
                          onCheckedChange={(checked) => {
                            const newValue = checked
                              ? [...(field.value || []), item.id]
                              : field.value?.filter((value) => value !== item.id);
                            field.onChange(newValue);
                          }}
                        />
                        <Label htmlFor={`activity-${item.id}`} className="font-normal">{item.label}</Label>
                      </div>
                    ))}
                  </div>
                   {form.formState.errors.activities && <p className="text-sm text-destructive mt-1">{form.formState.errors.activities.message}</p>}
                </div>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={handleClose}>İptal</Button>
              <Button type="submit">
                <Wand2 className="mr-2 h-4 w-4" /> Verileri Üret
              </Button>
            </DialogFooter>
          </form>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl flex flex-col h-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles /> Yapay Zeka ile Etkinlik Verisi Üret</DialogTitle>
          <DialogDescription>
            Konu için etkinliklerde kullanılacak ham verileri (kavramlar, cümleler vb.) otomatik olarak üretin.
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
