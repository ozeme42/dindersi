
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { importBulkActivityData } from '@/app/teacher/activity-data/actions';
import type { AiActivityDataOutput } from "@/ai/flows/generate-activity-data-flow";


type BulkActivityImportDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
  context: {
    courseId: string;
    unitId: string;
    topicId: string;
    topicTitle: string;
  } | null;
};

type DataType = 'concepts' | 'definitions' | 'sentences';
type Step = 'paste' | 'saving';

export function BulkActivityImportDialog({
  isOpen,
  onOpenChange,
  onImported,
  context
}: BulkActivityImportDialogProps) {
  const [step, setStep] = useState<Step>('paste');
  const [activeTab, setActiveTab] = useState<DataType>('concepts');
  const [textInputs, setTextInputs] = useState({
      concepts: '',
      definitions: '',
      sentences: ''
  });
  const { toast } = useToast();
  
  const handleSaveToLibrary = async () => {
    if (!context) {
        toast({ title: "Hata", description: "Bir konu seçmelisiniz.", variant: "destructive"});
        return;
    }
    
    let payload: AiActivityDataOutput = {};
    
    const conceptLines = textInputs.concepts.split('\n').map(l => l.trim()).filter(Boolean);
    if(conceptLines.length > 0) {
        payload.concepts = conceptLines;
    }

    const sentenceLines = textInputs.sentences.split('\n').map(l => l.trim()).filter(Boolean);
    if(sentenceLines.length > 0) {
        payload.summarySentences = sentenceLines;
    }

    const definitionLines = textInputs.definitions.split('\n').map(l => l.trim()).filter(Boolean);
    if(definitionLines.length > 0) {
        const conceptDefinitions = definitionLines.map(line => {
            const parts = line.split(':');
            const concept = parts[0]?.trim();
            const definition = parts.slice(1).join(':').trim();
            return { concept, definition };
        }).filter(p => p.concept && p.definition);
        
        if (conceptDefinitions.length > 0) {
            payload.conceptDefinitions = conceptDefinitions;
        }
    }
    
    if (Object.keys(payload).length === 0) {
        toast({ title: "Boş Veri", description: "Lütfen en az bir alana veri girin.", variant: "default"});
        return;
    }

    setStep('saving');
    const result = await importBulkActivityData(payload, context);
    
    if(result.success) {
        toast({ title: 'Başarılı!', description: result.count === 0 ? "Eklenecek yeni veri bulunamadı." : `${result.count} yeni veri öğesi kütüphaneye eklendi.`});
        onImported();
        handleClose();
    } else {
        toast({ title: 'Hata', description: result.error, variant: 'destructive'});
        setStep('paste');
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setTextInputs({ concepts: '', definitions: '', sentences: '' });
      setActiveTab('concepts');
      setStep('paste');
    }, 300);
  };
  
  const renderContent = () => {
    if (step === 'saving') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg text-muted-foreground">Veriler kaydediliyor...</p>
            </div>
        );
    }
    
    return (
      <div className="space-y-4">
        <div className="rounded-md border bg-muted/50 p-3">
            <p className="text-sm font-semibold">Seçili Konu</p>
            <p className="text-lg text-primary">{context?.topicTitle || "Lütfen bir konu seçin."}</p>
        </div>
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DataType)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="concepts">Kavramlar</TabsTrigger>
                <TabsTrigger value="definitions">Tanımlar</TabsTrigger>
                <TabsTrigger value="sentences">Cümleler</TabsTrigger>
            </TabsList>
            <TabsContent value="concepts">
                <Label htmlFor="concepts-area">Kavramları her satıra bir tane gelecek şekilde yapıştırın.</Label>
                <Textarea id="concepts-area" value={textInputs.concepts} onChange={e => setTextInputs({...textInputs, concepts: e.target.value})} className="min-h-[200px] font-mono mt-2" />
            </TabsContent>
            <TabsContent value="definitions">
                 <Label htmlFor="definitions-area">Her satıra <code className="bg-amber-100 p-1 rounded-sm text-amber-900">Kavram : Tanım</code> formatında yapıştırın.</Label>
                 <Textarea id="definitions-area" value={textInputs.definitions} onChange={e => setTextInputs({...textInputs, definitions: e.target.value})} className="min-h-[200px] font-mono mt-2" />
            </TabsContent>
            <TabsContent value="sentences">
                 <Label htmlFor="sentences-area">Cümleleri her satıra bir tane gelecek şekilde yapıştırın.</Label>
                 <Textarea id="sentences-area" value={textInputs.sentences} onChange={e => setTextInputs({...textInputs, sentences: e.target.value})} className="min-h-[200px] font-mono mt-2" />
            </TabsContent>
        </Tabs>

        <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose}>İptal</Button>
            <Button type="button" onClick={handleSaveToLibrary} disabled={!context}>Verileri Kaydet</Button>
        </DialogFooter>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Upload /> Toplu Etkinlik Verisi Ekleme</DialogTitle>
          
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
