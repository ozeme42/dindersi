'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    Loader2, Sparkles, Wand2, KeyRound, Settings2, ExternalLink, 
    Check, Eye, EyeOff, ShieldCheck, Zap, Flame, Save, Server
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateLessonContent, type GenerateLessonContentInput, type GenerateLessonContentOutput } from '@/ai/flows/generate-lesson-content';
import { generateConceptMap } from '@/ai/flows/generate-concept-map-flow';
import { generateHtmlSlide } from '@/ai/flows/generate-html-slide-flow';
import { saveSystemAiConfigAction, getSystemAiConfigAction } from '@/ai/ai-config-service';
import type { LessonStep } from '@/lib/types';
import { Checkbox } from './ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ══ GÜNCEL ÜCRETSİZ GEMİNİ MODELLERİ LİSTESİ (2026 GÜNCEL) ══
export const FREE_GEMINI_MODELS = [
    { 
        id: 'gemini-3.7-flash', 
        name: 'Gemini 3.7 Flash', 
        tag: '🔥 En Yeni Amiral Gemisi (Ağustos 2026)', 
        desc: 'Google\'ın en gelişmiş, hibrit akıl yürütme (thinking) yeteneğine sahip en yeni Flash modeli.',
        badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40'
    },
    { 
        id: 'gemini-2.0-flash', 
        name: 'Gemini 2.0 Flash', 
        tag: '⚡ Yüksek Hız & Kararlı', 
        desc: 'Oldukça hızlı yanıt süresi ve dengeli pedagojik Türkçe üretimi.',
        badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40'
    },
    { 
        id: 'gemini-2.0-flash-lite', 
        name: 'Gemini 2.0 Flash-Lite', 
        tag: '🚀 Ultra Hızlı & Hafif', 
        desc: 'Saniyeler içinde hızlı soru ve kart üretmek için optimize edilmiştir.',
        badge: 'bg-teal-500/20 text-teal-300 border-teal-500/40'
    },
    { 
        id: 'gemini-2.0-flash-thinking-exp-01-21', 
        name: 'Gemini 2.0 Flash Thinking', 
        tag: '🧠 Düşünerek Akıl Yürütme', 
        desc: 'Yanıt vermeden önce adım adım akıl yürüten (Chain-of-Thought) gelişmiş model.',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
    },
    { 
        id: 'gemini-1.5-flash', 
        name: 'Gemini 1.5 Flash', 
        tag: '✨ Geniş Bağlam', 
        desc: 'Çok uzun metinleri tek seferde analiz edebilen kararlı model.',
        badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
    },
    { 
        id: 'gemini-1.5-pro', 
        name: 'Gemini 1.5 Pro', 
        tag: '💎 Derin Analiz & Detay', 
        desc: 'Kapsamlı ve zengin içerikler için yüksek kapasiteli model.',
        badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40'
    },
];

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
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-3.7-flash');
  const [customModelInput, setCustomModelInput] = useState('');
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [showApiKeyText, setShowApiKeyText] = useState(false);
  const [isKeySaved, setIsKeySaved] = useState(false);
  const [isSavingSystemKey, setIsSavingSystemKey] = useState(false);
  const [isSystemPersisted, setIsSystemPersisted] = useState(false);

  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sourceText: '',
      modules: {},
    },
  });
  
  const activityOptions = generationType ? allActivityOptions[generationType] : [];

  // Sistemden ve tarayıcıdan kayıtlı API Anahtarı ve Modeli yükle
  useEffect(() => {
    async function loadConfig() {
        if (typeof window !== 'undefined') {
            const localKey = localStorage.getItem('custom_gemini_api_key') || '';
            const localModel = localStorage.getItem('custom_gemini_model') || '';

            if (localKey) {
                setApiKey(localKey);
            }
            if (localModel) {
                const isKnown = FREE_GEMINI_MODELS.some(m => m.id === localModel);
                if (isKnown) {
                    setSelectedModel(localModel);
                    setIsCustomModel(false);
                } else {
                    setSelectedModel('custom');
                    setCustomModelInput(localModel);
                    setIsCustomModel(true);
                }
            }
        }

        try {
            const sysConfig = await getSystemAiConfigAction();
            if (sysConfig.apiKey) {
                setIsSystemPersisted(true);
                if (!apiKey) {
                    setApiKey(sysConfig.apiKey);
                }
            }
            if (sysConfig.modelName && !selectedModel) {
                const isKnown = FREE_GEMINI_MODELS.some(m => m.id === sysConfig.modelName);
                if (isKnown) {
                    setSelectedModel(sysConfig.modelName);
                    setIsCustomModel(false);
                } else {
                    setSelectedModel('custom');
                    setCustomModelInput(sysConfig.modelName);
                    setIsCustomModel(true);
                }
            }
        } catch (e) {
            console.warn("Could not fetch system AI config:", e);
        }
    }

    if (isOpen) {
        loadConfig();
    }
  }, [isOpen]);

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

  const activeModelId = isCustomModel ? (customModelInput.trim() || 'gemini-3.7-flash') : selectedModel;

  // Anahtarı hem tarayıcıya hem de doğrudan Firebase/Sisteme kalıcı olarak kaydet
  const handleSaveApiKeyToSystem = async () => {
    setIsSavingSystemKey(true);
    try {
        const trimmedKey = apiKey.trim();
        const trimmedModel = activeModelId;

        // Tarayıcıya kaydet
        if (typeof window !== 'undefined') {
            localStorage.setItem('custom_gemini_api_key', trimmedKey);
            localStorage.setItem('custom_gemini_model', trimmedModel);
        }

        // Sisteme / Firestore'a kalıcı kaydet
        const result = await saveSystemAiConfigAction({
            apiKey: trimmedKey,
            modelName: trimmedModel,
        });

        setIsKeySaved(true);
        setIsSystemPersisted(!!trimmedKey);
        setTimeout(() => setIsKeySaved(false), 3000);

        toast({
            title: "Sisteme Kaydedildi",
            description: result.message,
        });
    } catch (error: any) {
        toast({
            title: "Hata",
            description: "Kayıt sırasında bir hata oluştu: " + error.message,
            variant: "destructive",
        });
    } finally {
        setIsSavingSystemKey(false);
    }
  };

  const handleSelectModel = (modelId: string) => {
    if (modelId === 'custom') {
        setIsCustomModel(true);
        setSelectedModel('custom');
    } else {
        setIsCustomModel(false);
        setSelectedModel(modelId);
        if (typeof window !== 'undefined') {
            localStorage.setItem('custom_gemini_model', modelId);
        }
    }
  };

  const handleSaveCustomModel = (customId: string) => {
    setCustomModelInput(customId);
    if (typeof window !== 'undefined' && customId.trim()) {
        localStorage.setItem('custom_gemini_model', customId.trim());
    }
  };

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
        const activeKey = apiKey.trim() || undefined;
        const activeModel = activeModelId || 'gemini-3.7-flash';
        
        // Özel akışlar (Kavram Haritası & HTML Slayt)
        if (inputModules.conceptMap) {
            try {
                const mapData = await generateConceptMap({ 
                    topicSummary: data.sourceText,
                    apiKey: activeKey,
                    modelName: activeModel
                });
                if (mapData && mapData.nodes && mapData.nodes.length > 0) {
                    generatedSteps.push({ type: 'conceptMap', title: 'Kavram Haritası', mapData: mapData });
                }
            } catch (e) {
                console.error("Concept map error:", e);
            }
        }

        if (inputModules.htmlSlide) {
            try {
                const result = await generateHtmlSlide({ 
                    topicSummary: data.sourceText,
                    apiKey: activeKey,
                    modelName: activeModel
                });
                if (result && result.htmlContent) {
                    generatedSteps.push({ type: 'htmlSlide', title: 'İnteraktif Sunum Slaytı', htmlContent: result.htmlContent });
                }
            } catch (e) {
                console.error("HTML slide error:", e);
            }
        }
        
        // Standart Modüller
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
                apiKey: activeKey,
                modelName: activeModel,
            };
            const result = await generateLessonContent(input);
            if (result && Object.keys(result).length > 0) {
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
      toast({ 
          title: "Hata", 
          description: error.message || "İçerik üretilirken bir sorun oluştu.", 
          variant: "destructive" 
      });
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

  const currentModelMeta = FREE_GEMINI_MODELS.find(m => m.id === activeModelId) || {
      id: activeModelId,
      name: activeModelId,
      tag: 'Özel Model',
      desc: 'Kullanıcı tarafından belirlenen model.',
      badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl flex flex-col h-auto max-h-[92vh] bg-slate-950 border border-white/10 text-slate-100 shadow-2xl p-0 overflow-hidden rounded-3xl">
        {/* Header */}
        <DialogHeader className="p-5 pb-4 border-b border-white/10 bg-slate-900/60 backdrop-blur-md flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-purple-500/20 to-rose-500/20 rounded-2xl border border-purple-500/30 text-purple-400">
                <Flame className="h-5 w-5 text-rose-400 animate-pulse" />
            </div>
            <div>
                <DialogTitle className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                    Yapay Zeka Stüdyosu
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                    {generationType === 'anlatim' ? 'Konu Anlatımı, Kavramlar & Bilgi Kartları' : 'Değerlendirme Soruları & Alıştırmalar'}
                </DialogDescription>
            </div>
          </div>

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
                "border-white/10 text-xs font-bold rounded-xl transition-all mr-6",
                showSettings ? "bg-indigo-600 text-white border-indigo-500 shadow-md" : "bg-slate-900 text-slate-300 hover:bg-slate-800"
            )}
          >
            <Settings2 className="w-3.5 h-3.5 mr-1.5" /> Model & API Ayarları
          </Button>
        </DialogHeader>

        {isGenerating ? (
            <div className="flex flex-col items-center justify-center min-h-[360px] gap-5 text-center p-8">
                <div className="relative">
                    <div className="absolute inset-0 bg-purple-500 blur-2xl opacity-30 animate-pulse rounded-full"></div>
                    <Loader2 className="h-14 w-14 animate-spin text-purple-400 relative z-10" />
                </div>
                <div>
                    <h3 className="text-lg font-black text-white mb-1.5">
                        {currentModelMeta.name} ile Üretiliyor...
                    </h3>
                    <p className="text-xs text-slate-400 max-w-sm">
                        Kaynak metin analiz ediliyor, pedagojik ders adımları ve slaytlar hazırlanıyor...
                    </p>
                </div>
            </div>
        ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
                 <div className="px-6 py-4 flex-grow overflow-y-auto space-y-4">
                    
                    {/* ⚙️ MODEL & API AYARLARI PANELİ */}
                    {showSettings && (
                        <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <KeyRound className="w-4 h-4 text-indigo-400" />
                                    <span className="text-xs font-black uppercase text-indigo-200 tracking-wider">
                                        Google AI Studio API & Model Ayarları
                                    </span>
                                </div>
                                <a 
                                    href="https://aistudio.google.com/app/apikey" 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 hover:underline"
                                >
                                    Ücretsiz API Anahtarı Al <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>

                            {/* API Key Input + Sisteme Kaydet Butonu */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs text-slate-300 font-bold">Google Gemini API Anahtarınız</Label>
                                    {isSystemPersisted && (
                                        <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30 flex items-center gap-1">
                                            <Server className="w-2.5 h-2.5" /> Sistem Anahtarı Aktif
                                        </Badge>
                                    )}
                                </div>
                                
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <div className="relative flex-1">
                                        <Input 
                                            type={showApiKeyText ? "text" : "password"}
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            placeholder="AIzaSy... (Boş bırakılırsa sistem varsayılanı kullanılır)"
                                            className="bg-slate-950 border-white/10 text-xs font-mono pr-10 rounded-xl"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowApiKeyText(!showApiKeyText)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                        >
                                            {showApiKeyText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    
                                    <Button
                                        type="button"
                                        onClick={handleSaveApiKeyToSystem}
                                        disabled={isSavingSystemKey}
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl flex items-center gap-1.5 px-4 cursor-pointer"
                                    >
                                        {isSavingSystemKey ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : isKeySaved ? (
                                            <Check className="w-3.5 h-3.5 text-emerald-300" />
                                        ) : (
                                            <Save className="w-3.5 h-3.5" />
                                        )}
                                        {isKeySaved ? "Kaydedildi!" : "Sisteme Kaydet"}
                                    </Button>
                                </div>
                                <p className="text-[10px] text-slate-400">
                                    * "Sisteme Kaydet" butonuna tıkladığınızda bu anahtar sunucu ve veritabanına kalıcı olarak işlenir ve tüm sistemin aktif anahtarı haline gelir.
                                </p>
                            </div>

                            {/* Model Seçimi */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs text-slate-300 font-bold">Kullanılacak Gemini Modeli</Label>
                                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                                        <ShieldCheck className="w-3 h-3" /> Ücretsiz Kota Destekli
                                    </span>
                                </div>
                                <Select value={isCustomModel ? 'custom' : selectedModel} onValueChange={handleSelectModel}>
                                    <SelectTrigger className="bg-slate-950 border-white/10 text-xs rounded-xl h-10">
                                        <SelectValue placeholder="Model Seçin" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-950 border-white/15 text-white">
                                        {FREE_GEMINI_MODELS.map(m => (
                                            <SelectItem key={m.id} value={m.id} className="py-2 focus:bg-indigo-600">
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-black text-xs text-white">{m.name}</span>
                                                        <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 border", m.badge)}>
                                                            {m.tag}
                                                        </Badge>
                                                    </div>
                                                    <span className="text-[10px] text-slate-400">{m.desc}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                        <SelectItem value="custom" className="py-2 focus:bg-indigo-600 border-t border-white/10">
                                            <div className="flex items-center gap-2">
                                                <span className="font-black text-xs text-amber-300">✍️ Özel Model Adı Girin...</span>
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>

                                {isCustomModel && (
                                    <div className="pt-2 animate-in fade-in">
                                        <Label className="text-[11px] text-amber-300 font-bold">Özel Model Tanımlayıcısı (ID):</Label>
                                        <Input 
                                            value={customModelInput}
                                            onChange={(e) => handleSaveCustomModel(e.target.value)}
                                            placeholder="Örn: gemini-3.7-flash, gemini-2.0-pro-exp-02-05..."
                                            className="mt-1 bg-slate-950 border-amber-500/40 text-xs text-amber-200 rounded-xl"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Hedef Bilgisi & Aktif Model Rozeti */}
                    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-3 flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-bold uppercase text-purple-400 tracking-wider">Hedef Konu</span>
                            <p className="text-sm font-black text-white">{context?.topicTitle || 'Konu Başlığı'}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px] bg-slate-950 border-rose-500/30 text-rose-300 font-black">
                                <Flame className="w-3 h-3 mr-1 text-rose-400" /> {currentModelMeta.name}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] text-indigo-300 border-indigo-500/30 bg-indigo-500/10">
                                {generationType === 'anlatim' ? 'Anlatım' : 'Değerlendirme'}
                            </Badge>
                        </div>
                    </div>

                    {/* Kaynak Metin */}
                    <Controller
                        name="sourceText"
                        control={form.control}
                        render={({ field, fieldState }) => (
                            <div className="space-y-1.5">
                                <Label htmlFor='contextText' className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                                    Kaynak Metin / Konu Özeti
                                </Label>
                                <Textarea 
                                    id="contextText" 
                                    {...field} 
                                    className="min-h-[100px] bg-slate-950 border-white/10 text-white focus-visible:ring-purple-500 placeholder:text-slate-600 text-xs leading-relaxed rounded-2xl" 
                                    placeholder="Yapay zekanın veri üretmesi için konuyla ilgili metin, özet veya anahtar kavramlar..."
                                />
                                {fieldState.error && <p className="text-xs text-rose-400 mt-1">{fieldState.error.message}</p>}
                            </div>
                        )}
                    />
                    
                    {/* Modül Seçimleri */}
                    <Controller
                        name="modules"
                        control={form.control}
                        render={({ field, fieldState }) => (
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                                    Üretilecek Modüller
                                </Label>
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

                 {/* Footer */}
                 <DialogFooter className="p-4 px-6 border-t border-white/10 bg-slate-900/80 backdrop-blur-md flex items-center justify-between sm:justify-between">
                    <Button type="button" variant="ghost" onClick={handleClose} className="text-slate-400 hover:text-white rounded-xl">
                        İptal
                    </Button>
                    <Button 
                        type="submit" 
                        className="bg-gradient-to-r from-purple-600 via-indigo-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white font-black rounded-xl shadow-lg shadow-purple-950/50 px-6 cursor-pointer text-xs"
                    >
                        <Wand2 className="mr-2 h-4 w-4 text-yellow-300" /> Üretimi Başlat ({currentModelMeta.name})
                    </Button>
                </DialogFooter>
            </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
