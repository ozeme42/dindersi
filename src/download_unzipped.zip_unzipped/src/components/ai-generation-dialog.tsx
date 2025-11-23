

"use client";

import { useState, useMemo, useEffect } from 'react';
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
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import type { Question } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { generateQuestionsWithAI } from '@/app/teacher/questions/actions';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import type { AIGeneratedQuestions } from '@/ai/flows/generate-questions-flow';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { DIFFICULTY_LEVELS } from '@/lib/game-config';

const questionTypeOptions = [
  { id: 'mcq', label: 'Çoktan Seçmeli' },
  { id: 'tf', label: 'Doğru/Yanlış' },
  { id: 'fitb', label: 'Boşluk Doldurma' },
] as const;

const DifficultyEnum = z.enum(DIFFICULTY_LEVELS);

const formSchema = z.object({
  contextText: z.string().min(10, 'Lütfen en az 10 karakterlik bir metin girin.'),
  questionTypes: z.array(z.string()).min(1, 'Lütfen en az bir soru tipi seçin.'),
  difficulty: z.array(DifficultyEnum).min(1, 'Lütfen en az bir zorluk seviyesi seçin.'),
  questionCountPerType: z.coerce.number({ invalid_type_error: 'Lütfen bir sayı girin.' }).min(1, { message: 'Her tür için en az 1 soru üretilmelidir.' }).max(50, { message: 'Her tür için en fazla 50 soru üretilebilir.' }),
});

type AIGenerationDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onQuestionsGenerated: () => void;
  context: {
    selection: { classId: string; courseId: string; unitId: string; topicId: string };
    selectionNames: { className: string; courseName: string; unitName: string; topicName: string };
    sourceText?: string;
  } | null;
  onSave: (data: { questions: any[] }, context: any) => Promise<{ success: boolean; error?: string, count?: number }>;
};

type Step = 'setup' | 'generating' | 'review';

// This will be the internal state for reviewed questions before saving
type ReviewedQuestion = Omit<Question, 'id'> & { tempId: number };

export function AIGenerationDialog({
  isOpen,
  onOpenChange,
  onQuestionsGenerated,
  context,
  onSave
}: AIGenerationDialogProps) {
  const [step, setStep] = useState<Step>('setup');
  const [generatedQuestions, setGeneratedQuestions] = useState<ReviewedQuestion[]>([]);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contextText: '',
      questionTypes: ['mcq'],
      difficulty: ['Kolay', 'Orta'],
      questionCountPerType: 3,
    },
  });

  useEffect(() => {
    if (context) {
        form.setValue('contextText', context.sourceText || '');
    }
  }, [context, form]);

  
  const mapAIToReviewed = (aiQuestions: AIGeneratedQuestions): ReviewedQuestion[] => {
    if (!context) return [];
    const { selection, selectionNames } = context;
    
    let tempIdCounter = 0;
    const allQuestions: ReviewedQuestion[] = [];
    
    const mapQuestion = (q: any, type: Question['type']): ReviewedQuestion => ({
        tempId: tempIdCounter++,
        text: q.question || q.statement || q.sentenceWithBlank || '',
        type,
        options: q.options || [],
        correctAnswer: q.correctAnswer || (q.isTrue !== undefined ? (q.isTrue ? 'Doğru' : 'Yanlış') : ''),
        difficulty: q.difficulty || 'Orta',
        classId: selection.classId || '',
        className: selectionNames.className || '',
        courseId: selection.courseId || '',
        unitId: selection.unitId || '',
        topicId: selection.topicId || '',
        topic: selectionNames.topicName || ''
    });

    if (aiQuestions.multipleChoiceQuestions) {
        aiQuestions.multipleChoiceQuestions.forEach(q => allQuestions.push(mapQuestion(q, 'Çoktan Seçmeli')));
    }
    if (aiQuestions.trueFalseQuestions) {
        aiQuestions.trueFalseQuestions.forEach(q => allQuestions.push(mapQuestion(q, 'Doğru/Yanlış')));
    }
    if (aiQuestions.fillInTheBlankQuestions) {
        aiQuestions.fillInTheBlankQuestions.forEach(q => allQuestions.push(mapQuestion(q, 'Boşluk Doldurma')));
    }

    return allQuestions;
  }

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!context || !context.selection.topicId) {
      toast({ title: "Hata", description: "Soru üretmek için ana menüden bir konu seçilmelidir.", variant: "destructive" });
      return;
    }

    setStep('generating');
    const result = await generateQuestionsWithAI({
        contextText: data.contextText,
        questionTypes: data.questionTypes,
        difficulty: data.difficulty,
        questionCountPerType: data.questionCountPerType,
        topicName: context.selectionNames.topicName,
    });
    
    if ('error' in result) {
      toast({ title: "Hata", description: result.error, variant: "destructive" });
      setStep('setup');
    } else {
      const mappedQuestions = mapAIToReviewed(result);
      setGeneratedQuestions(mappedQuestions);
      setStep('review');
    }
  };
  
  const handleSaveToLibrary = async () => {
    if (!context) return;
    setStep('generating'); // Show loading state while saving
    // Omit tempId before saving
    const questionsToSave = generatedQuestions.map(({ tempId, ...rest }) => rest);
    const result = await onSave({ questions: questionsToSave }, {
        classId: context.selection.classId,
        className: context.selectionNames.className,
        courseId: context.selection.courseId,
        unitId: context.selection.unitId,
        topicId: context.selection.topicId,
        topicName: context.selectionNames.topicName
    });
    
    if(result.success) {
        toast({ title: 'Başarılı!', description: `${result.count} soru kütüphaneye eklendi.`});
        onQuestionsGenerated();
        handleClose();
    } else {
        toast({ title: 'Hata', description: result.error, variant: 'destructive'});
        setStep('review'); // Return to review step on failure
    }
  }

  const updateQuestion = (tempId: number, updatedField: Partial<ReviewedQuestion>) => {
    setGeneratedQuestions(prev => prev.map(q => q.tempId === tempId ? {...q, ...updatedField} : q));
  }

  const deleteQuestion = (tempId: number) => {
    setGeneratedQuestions(prev => prev.filter(q => q.tempId !== tempId));
  }

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
        form.reset({ questionTypes: ['mcq'], difficulty: ['Kolay', 'Orta'], questionCountPerType: 3, contextText: '' });
        setGeneratedQuestions([]);
        setStep('setup');
    }, 300);
  }
  
  const renderContent = () => {
    switch(step) {
      case 'setup':
        return (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <div className="rounded-md border bg-muted/50 p-3">
                <p className="text-sm font-semibold">Seçili Konu</p>
                <p className="text-sm text-muted-foreground">
                    {context?.selectionNames?.className || ''}
                    {context?.selectionNames?.courseName && ` > ${context.selectionNames.courseName}`}
                    {context?.selectionNames?.unitName && ` > ${context.selectionNames.unitName}`}
                    {context?.selectionNames?.topicName && ` > ${context.selectionNames.topicName}`}
                </p>
             </div>
             <Controller name="contextText" control={form.control} render={({ field, fieldState }) => (
                <div>
                  <Label htmlFor='contextText'>Anahtar Bilgiler / Kısa Metin</Label>
                  <Textarea id="contextText" {...field} className="mt-1 min-h-[120px]" placeholder="Yapay zekanın soru üretmesi için konuyla ilgili temel bilgileri, öğrenme hedeflerini veya kısa bir metni buraya girin."/>
                   {fieldState.error && <p className="text-sm text-destructive mt-1">{fieldState.error.message}</p>}
                </div>
             )}/>
             <div className="grid grid-cols-3 gap-4">
                <div>
                    <Label>Soru Tipleri</Label>
                    <div className="space-y-2 mt-2">
                        {questionTypeOptions.map(item => (
                            <Controller key={item.id} name="questionTypes" control={form.control} render={({field}) => (
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id={item.id}
                                        checked={field.value?.includes(item.id)}
                                        onCheckedChange={(checked) => {
                                            return checked
                                                ? field.onChange([...(field.value || []), item.id])
                                                : field.onChange(field.value?.filter(value => value !== item.id))
                                        }}
                                    />
                                    <Label htmlFor={item.id} className="font-normal">{item.label}</Label>
                                </div>
                            )}/>
                        ))}
                         {form.formState.errors.questionTypes && <p className="text-sm text-destructive mt-1">{form.formState.errors.questionTypes.message}</p>}
                    </div>
                </div>
                <div>
                    <Label>Zorluk Seviyeleri</Label>
                    <div className="space-y-2 mt-2">
                        {DIFFICULTY_LEVELS.map(level => (
                            <Controller key={level} name="difficulty" control={form.control} render={({field}) => (
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id={level}
                                        checked={field.value?.includes(level)}
                                        onCheckedChange={(checked) => {
                                            return checked
                                                ? field.onChange([...(field.value || []), level])
                                                : field.onChange(field.value?.filter(value => value !== level))
                                        }}
                                    />
                                    <Label htmlFor={level} className="font-normal">{level}</Label>
                                </div>
                            )}/>
                        ))}
                         {form.formState.errors.difficulty && <p className="text-sm text-destructive mt-1">{form.formState.errors.difficulty.message}</p>}
                    </div>
                </div>
                <div>
                     <Controller name="questionCountPerType" control={form.control} render={({ field, fieldState }) => (
                        <div>
                            <Label htmlFor='questionCount'>Her Tür İçin Soru Sayısı</Label>
                            <Input type="number" min="1" max="50" id="questionCount" {...field} className="mt-1"/>
                            {fieldState.error && <p className="text-sm text-destructive mt-1">{fieldState.error.message}</p>}
                        </div>
                    )}/>
                </div>
             </div>
              <DialogFooter>
                  <DialogClose asChild><Button type="button" variant="ghost">İptal</Button></DialogClose>
                  <Button type="submit">Soruları Üret</Button>
              </DialogFooter>
          </form>
        )
      case 'generating':
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg text-muted-foreground">Sorularınız hazırlanıyor...</p>
            </div>
        )
       case 'review':
        return (
            <div className="space-y-4">
                <ScrollArea className="h-[60vh] p-4 border rounded-md">
                    <div className="space-y-4">
                    {generatedQuestions.map((q, index) => (
                        <Card key={q.tempId} className="p-4 space-y-3">
                            <div className="flex justify-between items-start gap-2">
                                <Textarea
                                    value={q.text}
                                    onChange={(e) => updateQuestion(q.tempId, { text: e.target.value })}
                                    className="flex-1"
                                    placeholder="Soru metni..."
                                    rows={3}
                                />
                                <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-destructive" onClick={() => deleteQuestion(q.tempId)}><Trash2 className="h-4 w-4"/></Button>
                            </div>

                            {(q.type === 'Çoktan Seçmeli' || q.type === 'Boşluk Doldurma') && (
                                <div className="space-y-2">
                                    <Label>Seçenekler ve Doğru Cevap</Label>
                                    <RadioGroup value={q.correctAnswer} onValueChange={(val) => updateQuestion(q.tempId, { correctAnswer: val })} className="space-y-2">
                                        {(q.options || []).map((opt, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <RadioGroupItem value={opt} id={`q-${q.tempId}-opt-${i}`} />
                                                <Label htmlFor={`q-${q.tempId}-opt-${i}`} className="font-normal flex-1">
                                                    <Input value={opt} onChange={e => {
                                                        const newOptions = [...(q.options || [])];
                                                        newOptions[i] = e.target.value;
                                                        updateQuestion(q.tempId, {options: newOptions})
                                                    }} />
                                                </Label>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                </div>
                            )}

                            {q.type === 'Doğru/Yanlış' && (
                                <RadioGroup value={q.correctAnswer} onValueChange={(val) => updateQuestion(q.tempId, { correctAnswer: val })} className="flex space-x-4">
                                     <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="Doğru" id={`q-${q.tempId}-true`} />
                                        <Label htmlFor={`q-${q.tempId}-true`}>Doğru</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="Yanlış" id={`q-${q.tempId}-false`} />
                                        <Label htmlFor={`q-${q.tempId}-false`}>Yanlış</Label>
                                    </div>
                                </RadioGroup>
                            )}

                            <div className="flex justify-between items-center mt-4">
                                <Badge variant="outline">{q.type}</Badge>
                                <div className="w-40">
                                    <Select value={q.difficulty} onValueChange={(val) => updateQuestion(q.tempId, { difficulty: val as Question['difficulty'] })}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Kolay">Kolay</SelectItem>
                                            <SelectItem value="Orta">Orta</SelectItem>
                                            <SelectItem value="Zor">Zor</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </Card>
                    ))}
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setStep('setup')}>Geri</Button>
                    <Button onClick={handleSaveToLibrary}>Kütüphaneye Ekle</Button>
                </DialogFooter>
            </div>
        )
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles /> Yapay Zeka ile Soru Üretimi</DialogTitle>
          <DialogDescription>
            {step === 'setup' && "Soru üretmek için aşağıdaki alanları doldurun."}
            {step === 'review' && "Üretilen soruları gözden geçirin, düzenleyin ve kütüphaneye ekleyin."}
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
