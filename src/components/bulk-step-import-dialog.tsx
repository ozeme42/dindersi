
"use client";

import { useState } from 'react';
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
import { Loader2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { LessonStep } from '@/lib/types';
import { z } from 'zod';

type BulkStepImportDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (steps: LessonStep[]) => void;
};

// Simplified zod schema for validation. We can make it more robust later.
const LessonStepSchema = z.object({
    type: z.string(),
    title: z.string(),
}).passthrough(); // Allows other fields

const BulkStepsSchema = z.array(LessonStepSchema);

const jsonExamples = {
  content: [{
    type: "content",
    title: "Giriş Metni",
    content: "<h1>Konu Başlığı</h1><p>Bu konu hakkında detaylı bilgi...</p><ul><li>Madde 1</li><li>Madde 2</li></ul>"
  }],
  mcq: [{
    type: "mcq",
    title: "Kontrol Sorusu",
    question: "Türkiye'nin başkenti neresidir?",
    options: ["İstanbul", "Ankara", "İzmir", "Bursa"],
    correctAnswer: "Ankara"
  }],
  tf: [{
    type: "tf",
    title: "Doğru/Yanlış Sorusu",
    statement: "Dünya, Güneş sistemindeki en büyük gezegendir.",
    isTrue: false
  }],
  fitb: [{
    type: "fitb",
    title: "Boşluk Doldurma",
    sentenceWithBlank: "Türkiye'nin en kalabalık şehri ___'dur.",
    options: ["Ankara", "İzmir", "İstanbul", "Bursa"],
    correctAnswer: "İstanbul"
  }],
  flashcard: [{
    type: "flashcard",
    title: "Önemli Kavramlar",
    cards: [
      { term: "Hücre", definition: "Canlıların en küçük yapı birimi." },
      { term: "DNA", definition: "Genetik bilgiyi taşıyan molekül." }
    ]
  }],
  anagram: [{
    type: "anagram",
    title: "Anagram Sorusu",
    definition: "Bir başkent.",
    scrambledWord: "karnaa",
    correctAnswer: "Ankara"
  }],
  sentenceScramble: [{
    type: "sentenceScramble",
    title: "Cümle Düzeltme",
    scrambledSentence: "gitti okula Ali bugün",
    correctSentence: "Ali bugün okula gitti"
  }],
  visual: [{
    type: "visual",
    title: "Hücre Yapısı",
    imageUrl: "https://placehold.co/800x600.png"
  }],
  accordion: [{
      type: "accordion",
      title: "Konu Özeti",
      items: [
          { title: "Birinci Başlık", content: "Bu başlığın açıklaması." },
          { title: "İkinci Başlık", content: "Bu da ikinci başlığın içeriği." }
      ]
  }],
  iframe: [{
      type: "iframe",
      title: "İnteraktif Simülasyon",
      url: "https://phet.colorado.edu/tr/simulations/list"
  }]
};


export function BulkStepImportDialog({
  isOpen,
  onOpenChange,
  onImport
}: BulkStepImportDialogProps) {
  const [step, setStep] = useState<'paste' | 'saving'>('paste');
  const [jsonText, setJsonText] = useState('');
  const { toast } = useToast();
  
  const handleImport = () => {
    try {
      const parsed = JSON.parse(jsonText);
      const validation = BulkStepsSchema.safeParse(parsed);
      
      if (!validation.success) {
        toast({
          title: "JSON Format Hatası",
          description: `Veri doğrulanamadı: ${validation.error.issues.map(i => `${i.path.join('.')} - ${i.message}`).join(', ')}`,
          variant: "destructive"
        });
        return;
      }
      
      onImport(validation.data as LessonStep[]);
      toast({ title: "Başarılı!", description: `${validation.data.length} adım başarıyla eklendi.` });
      handleClose();

    } catch (e) {
      toast({ title: "Geçersiz JSON", description: "Lütfen yapıştırdığınız metnin geçerli bir JSON olduğundan emin olun.", variant: "destructive" });
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setJsonText('');
      setStep('paste');
    }, 300);
  };
  
  const renderContent = () => {
    if (step === 'saving') { // Not really used but good practice
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg text-muted-foreground">Kaydediliyor...</p>
            </div>
        );
    }
    
    return (
      <div className="space-y-4">
        <Label htmlFor="json-paste-area">Ders Adımlarını JSON Dizisi Olarak Yapıştırın</Label>
        <Textarea id="json-paste-area" value={jsonText} onChange={e => setJsonText(e.target.value)} className="min-h-[200px] font-mono" />
        
        <div className="pt-2">
            <p className="text-sm font-medium mb-2">Örnek şablon kullan:</p>
            <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setJsonText(JSON.stringify(jsonExamples.content, null, 2))}>Metin</Button>
                <Button variant="outline" size="sm" onClick={() => setJsonText(JSON.stringify(jsonExamples.accordion, null, 2))}>Akordiyon</Button>
                <Button variant="outline" size="sm" onClick={() => setJsonText(JSON.stringify(jsonExamples.mcq, null, 2))}>Çoktan Seçmeli</Button>
                <Button variant="outline" size="sm" onClick={() => setJsonText(JSON.stringify(jsonExamples.tf, null, 2))}>Doğru/Yanlış</Button>
                <Button variant="outline" size="sm" onClick={() => setJsonText(JSON.stringify(jsonExamples.fitb, null, 2))}>Boşluk Doldurma</Button>
                <Button variant="outline" size="sm" onClick={() => setJsonText(JSON.stringify(jsonExamples.flashcard, null, 2))}>Bilgi Kartları</Button>
                <Button variant="outline" size="sm" onClick={() => setJsonText(JSON.stringify(jsonExamples.anagram, null, 2))}>Anagram</Button>
                <Button variant="outline" size="sm" onClick={() => setJsonText(JSON.stringify(jsonExamples.sentenceScramble, null, 2))}>Cümle Düzeltme</Button>
                <Button variant="outline" size="sm" onClick={() => setJsonText(JSON.stringify(jsonExamples.visual, null, 2))}>Görsel</Button>
                <Button variant="outline" size="sm" onClick={() => setJsonText(JSON.stringify(jsonExamples.iframe, null, 2))}>Dış Sayfa</Button>
            </div>
        </div>

        <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose}>İptal</Button>
            <Button type="button" onClick={handleImport} disabled={!jsonText.trim()}>Adımları Ekle</Button>
        </DialogFooter>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Upload /> Toplu Ders Adımı Ekle</DialogTitle>
          <DialogDescription>JSON formatında hazırlanmış ders adımlarını doğrudan mevcut ders akışına ekleyin.</DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
