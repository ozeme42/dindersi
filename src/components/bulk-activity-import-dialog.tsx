'use client';

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
import { Loader2, Upload, Database, FileText, AlignLeft, Info } from 'lucide-react';
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
                <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 text-center p-8">
                    <div className="relative">
                        <div className="absolute inset-0 bg-teal-500 blur-xl opacity-20 animate-pulse rounded-full"></div>
                        <Loader2 className="h-16 w-16 animate-spin text-teal-400 relative z-10" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white mb-2">Veriler İşleniyor</h3>
                        <p className="text-slate-400">Veri bankasına kayıt yapılıyor, lütfen bekleyin...</p>
                    </div>
                </div>
            );
        }
        
        return (
            <div className="space-y-6 p-6">
                <div className="rounded-xl border border-teal-500/30 bg-teal-900/20 p-4 flex items-start gap-3">
                    <Database className="h-5 w-5 text-teal-400 mt-0.5" />
                    <div>
                        <p className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-1">HEDEF KONU</p>
                        <p className="text-lg font-medium text-white">{context?.topicTitle || "Lütfen bir konu seçin."}</p>
                    </div>
                </div>
                
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DataType)} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-slate-900/50 p-1 rounded-xl border border-white/5 h-auto">
                        <TabsTrigger value="concepts" className="py-3 data-[state=active]:bg-teal-600 data-[state=active]:text-white text-slate-400 font-bold rounded-lg transition-all">
                            Kavramlar
                        </TabsTrigger>
                        <TabsTrigger value="definitions" className="py-3 data-[state=active]:bg-purple-600 data-[state=active]:text-white text-slate-400 font-bold rounded-lg transition-all">
                            Tanımlar
                        </TabsTrigger>
                        <TabsTrigger value="sentences" className="py-3 data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400 font-bold rounded-lg transition-all">
                            Cümleler
                        </TabsTrigger>
                    </TabsList>

                    <div className="mt-6">
                        <TabsContent value="concepts" className="space-y-4 mt-0">
                            <div className="flex items-center gap-2 text-slate-400 text-sm bg-slate-900/50 p-3 rounded-lg border border-white/5">
                                <AlignLeft className="h-4 w-4 text-teal-400" />
                                <span>Her satıra bir <strong>kavram</strong> gelecek şekilde yapıştırın.</span>
                            </div>
                            <Textarea 
                                id="concepts-area" 
                                value={textInputs.concepts} 
                                onChange={e => setTextInputs({...textInputs, concepts: e.target.value})} 
                                className="min-h-[300px] font-mono bg-slate-900 border-white/10 text-white focus-visible:ring-teal-500 resize-none p-4 rounded-xl text-sm leading-relaxed" 
                                placeholder={`Örnek:\nAtom\nMolekül\nElement`}
                            />
                        </TabsContent>
                        
                        <TabsContent value="definitions" className="space-y-4 mt-0">
                             <div className="flex items-start gap-3 text-slate-300 text-sm bg-purple-900/20 p-4 rounded-lg border border-purple-500/20">
                                <Info className="h-5 w-5 text-purple-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold text-purple-400 mb-1">Format Önemli!</p>
                                    <p>Her satıra <code className="bg-black/40 px-1.5 py-0.5 rounded text-purple-300 font-mono text-xs">Kavram : Tanım</code> formatında veri giriniz.</p>
                                </div>
                            </div>
                            <Textarea 
                                id="definitions-area" 
                                value={textInputs.definitions} 
                                onChange={e => setTextInputs({...textInputs, definitions: e.target.value})} 
                                className="min-h-[300px] font-mono bg-slate-900 border-white/10 text-white focus-visible:ring-purple-500 resize-none p-4 rounded-xl text-sm leading-relaxed" 
                                placeholder={`Örnek:\nAtom : Maddenin en küçük yapı taşıdır.\nMolekül : Elementlerin kimyasal bağlarla bağlanması.`}
                            />
                        </TabsContent>
                        
                        <TabsContent value="sentences" className="space-y-4 mt-0">
                             <div className="flex items-center gap-2 text-slate-400 text-sm bg-slate-900/50 p-3 rounded-lg border border-white/5">
                                <FileText className="h-4 w-4 text-indigo-400" />
                                <span>Her satıra bir <strong>cümle</strong> gelecek şekilde yapıştırın.</span>
                            </div>
                            <Textarea 
                                id="sentences-area" 
                                value={textInputs.sentences} 
                                onChange={e => setTextInputs({...textInputs, sentences: e.target.value})} 
                                className="min-h-[300px] font-mono bg-slate-900 border-white/10 text-white focus-visible:ring-indigo-500 resize-none p-4 rounded-xl text-sm leading-relaxed" 
                                placeholder={`Örnek:\nSu, iki hidrojen ve bir oksijen atomundan oluşur.\nDünya Güneş etrafında döner.`}
                            />
                        </TabsContent>
                    </div>
                </Tabs>

                <DialogFooter className="pt-4 border-t border-white/10">
                    <Button type="button" variant="ghost" onClick={handleClose} className="text-slate-400 hover:text-white hover:bg-white/5">İptal</Button>
                    <Button type="button" onClick={handleSaveToLibrary} disabled={!context} className="bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-lg shadow-teal-900/20">
                        <Upload className="mr-2 h-4 w-4" /> Verileri Kaydet
                    </Button>
                </DialogFooter>
            </div>
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-3xl p-0 bg-slate-950 border-white/10 text-slate-100 shadow-2xl overflow-hidden">
                <DialogHeader className="p-6 pb-4 border-b border-white/5 bg-slate-900/50">
                    <DialogTitle className="flex items-center gap-3 text-2xl font-black uppercase tracking-tight text-white">
                        <div className="p-2 bg-teal-500/20 rounded-lg border border-teal-500/30">
                            <Upload className="h-6 w-6 text-teal-400" />
                        </div>
                        Toplu Veri Ekleme
                    </DialogTitle>
                </DialogHeader>
                {renderContent()}
            </DialogContent>
        </Dialog>
    );
}