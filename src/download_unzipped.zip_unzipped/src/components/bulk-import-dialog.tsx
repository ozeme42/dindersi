

"use client";

import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Upload, FileQuestion, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from './ui/scroll-area';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';

const stepperSteps = [
  { id: 'paste', name: 'İçeriği Yapıştır' },
  { id: 'review', name: 'Gözden Geçir' },
];

const QuestionSchemaForImport = z.object({
    text: z.string(),
    type: z.enum(['Çoktan Seçmeli', 'Doğru/Yanlış', 'Boşluk Doldurma']),
    difficulty: z.enum(['Kolay', 'Orta', 'Zor']),
    options: z.array(z.string()).optional(),
    correctAnswer: z.string().optional(),
});
const bulkJsonSchema = z.object({ questions: z.array(QuestionSchemaForImport) });

type BulkImportDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onQuestionsImported: () => void;
  context: {
    selection: { classId: string; courseId: string; unitId: string; topicId: string; };
    selectionNames: { className: string; courseName: string; unitName: string; topicName: string; };
  } | null;
  onSave: (data: { questions: any[] }, context: any) => Promise<{ success: boolean; error?: string, count?: number }>;
};

type Step = 'paste' | 'review' | 'saving';

const jsonExamples = {
  mcq: [
    {
      text: "Türkiye'nin başkenti neresidir?",
      type: "Çoktan Seçmeli",
      difficulty: "Kolay",
      options: ["İstanbul", "Ankara", "İzmir", "Bursa"],
      correctAnswer: "Ankara"
    },
    {
      text: "Fotosentez hangi organelde gerçekleşir?",
      type: "Çoktan Seçmeli",
      difficulty: "Orta",
      options: ["Mitokondri", "Ribozom", "Kloroplast", "Lizozom"],
      correctAnswer: "Kloroplast"
    }
  ],
  tf: [
    {
      text: "Dünya, Güneş etrafında döner.",
      type: "Doğru/Yanlış",
      difficulty: "Kolay",
      correctAnswer: "Doğru"
    }
  ],
  fitb: [
    {
      text: "Atatürk, ___ yılında Samsun'a çıkmıştır.",
      type: "Boşluk Doldurma",
      difficulty: "Orta",
      options: ["1918", "1919", "1920", "1923"],
      correctAnswer: "1919"
    }
  ]
};

export function BulkImportDialog({
  isOpen,
  onOpenChange,
  onQuestionsImported,
  context,
  onSave
}: BulkImportDialogProps) {
  const [step, setStep] = useState<Step>('paste');
  const [jsonText, setJsonText] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<z.infer<typeof bulkJsonSchema>['questions']>([]);
  const { toast } = useToast();
  
  const handleParseAndReview = () => {
    try {
      const parsed = JSON.parse(jsonText);
      const validation = bulkJsonSchema.safeParse({ questions: parsed });
      if (!validation.success) {
        toast({
          title: "JSON Format Hatası",
          description: `Veri doğrulanamadı: ${validation.error.issues.map(i => `${i.path.join('.')} - ${i.message}`).join(', ')}`,
          variant: "destructive"
        });
        return;
      }
      setParsedQuestions(validation.data.questions);
      setStep('review');
    } catch (e) {
      toast({ title: "Geçersiz JSON", description: "Lütfen yapıştırdığınız metnin geçerli bir JSON dizisi olduğundan emin olun.", variant: "destructive" });
    }
  };

  const handleSaveToLibrary = async () => {
    if (!context || !context.selection.topicId) {
        toast({ title: "Hata", description: "Soruları kaydetmek için ana menüden bir konu seçilmelidir.", variant: "destructive" });
        return;
    }
    setStep('saving');
    const { selection, selectionNames } = context;

    const questionsToSave = parsedQuestions.map(q => ({
      ...q,
      classId: selection.classId,
      className: selectionNames.className,
      courseId: selection.courseId,
      unitId: selection.unitId,
      topicId: selection.topicId,
      topic: selectionNames.topicName,
    }));
    
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
        onQuestionsImported();
        handleClose();
    } else {
        toast({ title: 'Hata', description: result.error, variant: 'destructive'});
        setStep('review'); // Return to review step on failure
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setJsonText('');
      setParsedQuestions([]);
      setStep('paste');
    }, 300);
  };
  
  const currentStepIndex = stepperSteps.findIndex(s => s.id === step);

  const renderContent = () => {
    switch (step) {
      case 'paste':
        return (
          <div className="space-y-4">
             <div className="rounded-md border bg-muted/50 p-3">
                <p className="text-sm font-semibold">Seçili Konu</p>
                <p className="text-sm text-muted-foreground">
                    {context?.selectionNames?.className || ''}
                    {context?.selectionNames?.courseName && ` > ${context.selectionNames.courseName}`}
                    {context?.selectionNames?.unitName && ` > ${context.selectionNames.unitName}`}
                    {context?.selectionNames?.topicName && ` > ${context.selectionNames.topicName}`}
                </p>
             </div>
            <Label htmlFor="json-paste-area">Soruları JSON Formatında Yapıştırın</Label>
            <Textarea id="json-paste-area" value={jsonText} onChange={e => setJsonText(e.target.value)} className="min-h-[200px] font-mono" />
            
            <div className="pt-2">
                <p className="text-sm font-medium mb-2">Veya örnek bir şablon kullanın:</p>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setJsonText(JSON.stringify(jsonExamples.mcq, null, 2))}>Çoktan Seçmeli</Button>
                    <Button variant="outline" size="sm" onClick={() => setJsonText(JSON.stringify(jsonExamples.tf, null, 2))}>Doğru/Yanlış</Button>
                    <Button variant="outline" size="sm" onClick={() => setJsonText(JSON.stringify(jsonExamples.fitb, null, 2))}>Boşluk Doldurma</Button>
                </div>
            </div>

            <DialogFooter>
                <Button type="button" variant="ghost" onClick={handleClose}>İptal</Button>
                <Button type="button" onClick={handleParseAndReview} disabled={!jsonText.trim() || !context}>Soruları Kontrol Et</Button>
            </DialogFooter>
          </div>
        );
      case 'review':
        return (
             <div className="space-y-4">
                <p className='text-sm text-muted-foreground'>{parsedQuestions.length} soru bulundu. Lütfen kontrol edip kaydedin.</p>
                <ScrollArea className="h-[50vh] p-4 border rounded-md">
                    <div className="space-y-4">
                    {parsedQuestions.map((q, index) => (
                        <Card key={index} className="p-4">
                            <p className="font-semibold mb-2 pr-8">{q.text}</p>
                            <div className="flex justify-between items-center mt-2">
                                <Badge variant="outline">{q.type}</Badge>
                                <Badge variant="secondary">{q.difficulty}</Badge>
                            </div>
                        </Card>
                    ))}
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setStep('paste')}>Geri</Button>
                    <Button onClick={handleSaveToLibrary}>Kütüphaneye Ekle</Button>
                </DialogFooter>
            </div>
        );
        case 'saving':
            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-lg text-muted-foreground">Sorularınız kaydediliyor...</p>
                </div>
            );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Upload /> Toplu Soru Ekleme Sihirbazı</DialogTitle>
          <DialogDescription>{stepperSteps.find(s => s.id === step)?.name || 'İçeriği Yapıştır'}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-4 my-4">
          {stepperSteps.map((s, index) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center text-white",
                currentStepIndex >= index ? 'bg-primary' : 'bg-muted-foreground'
              )}>
                {currentStepIndex > index ? <Check /> : <FileQuestion className='h-4 w-4'/>}
              </div>
              <span className={cn(currentStepIndex >= index ? 'font-semibold text-primary' : 'text-muted-foreground')}>{s.name}</span>
              {index < stepperSteps.length -1 && <div className="h-0.5 w-8 bg-border"/>}
            </div>
          ))}
        </div>
        <div className="min-h-[400px] flex flex-col justify-center">
        {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
