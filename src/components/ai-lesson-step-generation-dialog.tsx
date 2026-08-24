'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
    Loader2, Sparkles, Key, Eye, EyeOff, Save, CheckCircle2, 
    Settings2, Brain, Layers, Check, 
    Flame, Wand2, BookOpen, Puzzle, HelpCircle, FileText, Shuffle, Target
} from 'lucide-react';
import { generateLessonContent, type GenerateLessonContentInput, type GenerateLessonContentOutput } from '@/ai/flows/generate-lesson-content';
import { generateHtmlSlide } from '@/ai/flows/generate-html-slide-flow';
import { generateConceptMap } from '@/ai/flows/generate-concept-map-flow';
import { saveSystemAiConfigAction } from '@/ai/ai-config-service';
import type { LessonStep, AnagramGameStep, TrueFalseListStep } from '@/lib/types';
import { cn } from '@/lib/utils';

// Güncel Gemini Modelleri
export const FREE_GEMINI_MODELS = [
    {
        id: 'gemini-3.7-flash',
        name: 'Gemini 3.7 Flash',
        tag: 'Önerilen • En Yeni & Hızlı',
        desc: 'Google’ın en güncel hibrit zeka ve ders tasarımı modeli.',
        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    },
    {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        tag: 'Yüksek Hız & Çoklu İçerik',
        desc: 'Geniş bağlam ve anında JSON üretimi için optimize.',
        badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40'
    },
    {
        id: 'gemini-2.0-flash-lite',
        name: 'Gemini 2.0 Flash Lite',
        tag: 'Ultra Hızlı & Hafif',
        desc: 'Hızlı soru ve kavram üretimi için düşük gecikmeli model.',
        badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
    },
    {
        id: 'gemini-2.0-flash-thinking-exp-01-21',
        name: 'Gemini 2.0 Thinking (Akıl Yürütme)',
        tag: 'Düşünce Zinciri (CoT)',
        desc: 'Karmaşık mantık ve muhakeme soruları için derin düşünme modeli.',
        badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40'
    },
    {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        tag: 'Kararlı Klasik',
        desc: 'Geniş doküman okuma ve metinden soru çıkarma modeli.',
        badge: 'bg-slate-500/20 text-slate-300 border-slate-500/40'
    },
    {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        tag: 'Derin Analiz & Kalite',
        desc: 'Akademik düzeyde detaylı ve zengin konu anlatımları için.',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
    }
];

export type ActivityOption = {
    id: string;
    label: string;
    description: string;
    icon: React.ReactNode;
    category: 'anlatim' | 'degerlendirme';
};

export const ALL_ACTIVITY_OPTIONS: ActivityOption[] = [
    // Anlatım Modülleri
    { id: 'htmlSlide', label: 'İnteraktif Zengin HTML Slayt', description: 'Gamma / NotebookLM kalitesinde görsel kartlı modern slayt', icon: <FileText className="w-4 h-4 text-sky-400" />, category: 'anlatim' },
    { id: 'conceptExplanations', label: 'Kavram Açıklamaları (Kartlar)', description: 'Konunun 3-5 temel kavramı ve detaylı pedagojik tanımları', icon: <Brain className="w-4 h-4 text-indigo-400" />, category: 'anlatim' },
    { id: 'flashcards', label: '3D Bilgi Kartları (Flashcards)', description: 'Dokunup 3D çevrilen etkileşimli terim-tanım hafıza kartları', icon: <BookOpen className="w-4 h-4 text-emerald-400" />, category: 'anlatim' },
    { id: 'summary', label: 'Konu Özeti (Akordiyon)', description: '3 ana başlık altında toplanmış detaylı konu özeti maddeleri', icon: <Layers className="w-4 h-4 text-yellow-400" />, category: 'anlatim' },
    { id: 'learningObjectives', label: 'Öğrenme Hedefleri', description: 'Öğrencinin dersten kazanacağı temel kazanım cümleleri', icon: <Target className="w-4 h-4 text-amber-400" />, category: 'anlatim' },
    { id: 'keyTakeaways', label: 'Anahtar Çıkarımlar & İpuçları', description: 'Dersin en kritik hap bilgileri ve sınav tüyoları', icon: <Sparkles className="w-4 h-4 text-rose-400" />, category: 'anlatim' },
    { id: 'conceptMap', label: 'Kavram Haritası Şeması', description: 'Kavramlar arası ilişkileri gösteren etkileşimli görsel şema', icon: <Brain className="w-4 h-4 text-purple-400" />, category: 'anlatim' },

    // Değerlendirme & Oyun Modülleri
    { id: 'multipleChoiceQuestions', label: 'Çoktan Seçmeli Sorular (MCQ)', description: '4 seçenekli, açıklamalı test ve kontrol soruları', icon: <HelpCircle className="w-4 h-4 text-violet-400" />, category: 'degerlendirme' },
    { id: 'trueFalseQuestions', label: 'Doğru / Yanlış Listesi', description: 'Tek ekranda çözülen etkileşimli D/Y ifadeleri', icon: <CheckCircle2 className="w-4 h-4 text-purple-400" />, category: 'degerlendirme' },
    { id: 'fillInTheBlankQuestions', label: 'Boşluk Doldurma Soruları', description: 'Kilit kavramları pekiştiren seçenekli boşluk doldurma', icon: <HelpCircle className="w-4 h-4 text-amber-400" />, category: 'degerlendirme' },
    { id: 'anagramQuestions', label: 'Anagram / Kelime Oyunu', description: 'Harfleri karışık verilen kelimeleri bulma bulmacası', icon: <Puzzle className="w-4 h-4 text-fuchsia-400" />, category: 'degerlendirme' },
    { id: 'sentenceScrambleQuestions', label: 'Cümle Kurma / Düzeltme', description: 'Karışık verilen kelimeleri sıraya dizerek cümle kurma', icon: <Shuffle className="w-4 h-4 text-cyan-400" />, category: 'degerlendirme' },
];

const DEFAULT_MODULES = {
    htmlSlide: true,
    conceptExplanations: true,
    flashcards: true,
    summary: true,
    trueFalseQuestions: true,
    multipleChoiceQuestions: true,
    fillInTheBlankQuestions: true,
    anagramQuestions: true,
};

type AiLessonStepGenerationDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  topicTitle: string;
  sourceText: string;
  targetIndex?: number;
  onStepsGenerated: (steps: LessonStep[], targetIndex?: number) => void;
};

export function AiLessonStepGenerationDialog({
  isOpen,
  onOpenChange,
  topicTitle,
  sourceText,
  targetIndex,
  onStepsGenerated,
}: AiLessonStepGenerationDialogProps) {
  const [localSourceText, setLocalSourceText] = useState(sourceText || topicTitle || '');
  const [selectedModules, setSelectedModules] = useState<{ [key: string]: boolean }>(DEFAULT_MODULES);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [apiKey, setApiKey] = useState(() => {
      if (typeof window !== 'undefined') {
          return localStorage.getItem('custom_gemini_api_key') || '';
      }
      return '';
  });
  
  const [selectedModel, setSelectedModel] = useState(() => {
      if (typeof window !== 'undefined') {
          return localStorage.getItem('custom_gemini_model') || 'gemini-3.7-flash';
      }
      return 'gemini-3.7-flash';
  });

  const [customModelInput, setCustomModelInput] = useState('');
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [showApiKeyText, setShowApiKeyText] = useState(false);
  const [isKeySaved, setIsKeySaved] = useState(false);
  const [isSavingSystemKey, setIsSavingSystemKey] = useState(false);

  const { toast } = useToast();

  const handleClose = () => {
    onOpenChange(false);
  };

  const activeModelId = isCustomModel ? (customModelInput.trim() || 'gemini-3.7-flash') : selectedModel;

  const toggleModule = (id: string) => {
    setSelectedModules(prev => ({
        ...prev,
        [id]: !prev[id]
    }));
  };

  // Hazır Şablon Presetleri
  const applyPreset = (preset: 'full' | 'presentation' | 'cards' | 'games' | 'assessment') => {
    const modules: { [key: string]: boolean } = {};
    if (preset === 'full') {
        ALL_ACTIVITY_OPTIONS.forEach(opt => modules[opt.id] = true);
    } else if (preset === 'presentation') {
        modules['htmlSlide'] = true;
        modules['summary'] = true;
        modules['learningObjectives'] = true;
        modules['conceptMap'] = true;
    } else if (preset === 'cards') {
        modules['conceptExplanations'] = true;
        modules['flashcards'] = true;
        modules['keyTakeaways'] = true;
    } else if (preset === 'games') {
        modules['anagramQuestions'] = true;
        modules['sentenceScrambleQuestions'] = true;
    } else if (preset === 'assessment') {
        modules['multipleChoiceQuestions'] = true;
        modules['trueFalseQuestions'] = true;
        modules['fillInTheBlankQuestions'] = true;
    }
    setSelectedModules(modules);
  };

  const handleSaveApiKeyToSystem = async () => {
    setIsSavingSystemKey(true);
    try {
        const trimmedKey = apiKey.trim();
        const trimmedModel = activeModelId;

        if (typeof window !== 'undefined') {
            localStorage.setItem('custom_gemini_api_key', trimmedKey);
            localStorage.setItem('custom_gemini_model', trimmedModel);
        }

        const result = await saveSystemAiConfigAction({
            apiKey: trimmedKey,
            modelName: trimmedModel,
        });

        setIsKeySaved(true);
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

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedText = localSourceText.trim();
    if (trimmedText.length < 3) {
      toast({ title: "Uyarı", description: "Lütfen bir konu başlığı veya kaynak metin girin." });
      return;
    }

    const hasAnyModule = Object.values(selectedModules).some(v => v);
    if (!hasAnyModule) {
      toast({ title: "Uyarı", description: "Lütfen en az bir içerik türü seçin." });
      return;
    }

    setIsGenerating(true);
    let generatedSteps: LessonStep[] = [];

    try {
        const activeKey = apiKey.trim() || undefined;
        const activeModel = activeModelId || 'gemini-3.7-flash';
        
        // 1. Zengin HTML Slayt Üretimi (Ayrı uzman prompt)
        if (selectedModules.htmlSlide) {
            try {
                const result = await generateHtmlSlide({ 
                    topicSummary: trimmedText,
                    apiKey: activeKey,
                    modelName: activeModel
                });
                if (result && result.htmlContent) {
                    generatedSteps.push({ 
                        type: 'htmlSlide', 
                        title: `💻 ${topicTitle || 'Ders'} İnteraktif Slaytı`, 
                        htmlContent: result.htmlContent,
                        isPublished: true
                    });
                }
            } catch (e: any) {
                console.warn("HTML slide generation warning:", e);
            }
        }

        // 2. Kavram Haritası (Ayrı şema promptu)
        if (selectedModules.conceptMap) {
            try {
                const mapData = await generateConceptMap({ 
                    topicSummary: trimmedText,
                    apiKey: activeKey,
                    modelName: activeModel
                });
                if (mapData && mapData.nodes && mapData.nodes.length > 0) {
                    generatedSteps.push({ 
                        type: 'conceptMap', 
                        title: `🧠 ${topicTitle || 'Ders'} Kavram Haritası`, 
                        mapData: mapData,
                        isPublished: true 
                    });
                }
            } catch (e: any) {
                console.warn("Concept map warning:", e);
            }
        }
        
        // 3. Standart Yapılandırılmış Modüller
        const standardModules: GenerateLessonContentInput['modules'] = {};
        let needsStandardCall = false;
        for (const key in selectedModules) {
            if (key !== 'conceptMap' && key !== 'htmlSlide' && selectedModules[key]) {
                standardModules[key as keyof typeof standardModules] = true;
                needsStandardCall = true;
            }
        }

        if (needsStandardCall) {
            const input: GenerateLessonContentInput = {
                topicSummary: trimmedText,
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
            onStepsGenerated(generatedSteps, targetIndex);
            handleClose();
            toast({
                title: "İçerikler Başarıyla Üretildi! 🎉",
                description: `${generatedSteps.length} adet zengin slayt sunum akışınıza eklendi.`,
            });
        } else {
             toast({ 
                 title: "Sonuç Yok", 
                 description: "Yapay zeka bu modüller için içerik üretemedi. Lütfen konu metnini biraz detaylandırın.", 
                 variant: "default" 
             });
        }

    } catch (error: any) {
      console.error("Error generating lesson steps:", error);
      toast({ 
          title: "Hata", 
          description: error.message || "İçerik üretilirken bir sorun oluştu.", 
          variant: "destructive" 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const mapAIOutputToSteps = (output: GenerateLessonContentOutput): LessonStep[] => {
        const newSteps: LessonStep[] = [];
        
        // 1. Öğrenme Hedefleri
        if (output.learningObjectives && output.learningObjectives.length > 0) {
            newSteps.push({ 
                type: 'objectiveList', 
                title: '🎯 Öğrenme Hedefleri', 
                items: output.learningObjectives,
                isPublished: true 
            });
        }

        // 2. Konu Özeti (Akordiyon)
        if (output.summary && output.summary.length > 0) {
            newSteps.push({ 
                type: 'accordion', 
                title: '📖 Konu Özeti & Başlıklar', 
                items: output.summary.map((s, idx) => ({ 
                    id: `acc_${idx}_${Date.now()}`,
                    title: s.title, 
                    content: s.content.startsWith('<li>') ? `<ul>${s.content}</ul>` : s.content 
                })),
                isPublished: true
            });
        }

        // 3. Anahtar Çıkarımlar
        if (output.keyTakeaways && output.keyTakeaways.length > 0) {
            newSteps.push({ 
                type: 'content', 
                title: '💡 Anahtar Çıkarımlar & İpuçları', 
                content: `<ul>${output.keyTakeaways.map(item => `<li>${item}</li>`).join('')}</ul>`,
                isPublished: true 
            });
        }

        // 4. Kavram Açıklamaları (Kavram Kartları)
        if (output.conceptExplanations && output.conceptExplanations.length > 0) {
            newSteps.push({ 
                type: 'conceptExplanation', 
                title: '📌 Temel Kavramlar & Açıklamaları', 
                items: output.conceptExplanations,
                isPublished: true 
            });
        }

        // 5. Bilgi Kartları (Flashcards)
        if (output.flashcards && output.flashcards.length > 0) {
            newSteps.push({ 
                type: 'flashcard', 
                title: '💡 Bilgi & Hafıza Kartları', 
                cards: output.flashcards,
                isPublished: true 
            });
        }

        // 6. Anagram / Kelime Oyunu Kartları
        if (output.anagramQuestions && output.anagramQuestions.length > 0) {
            newSteps.push({ 
                type: 'anagramGame', 
                title: '🔤 Kelime Dehası (Anagram)', 
                cards: output.anagramQuestions.map(q => ({
                    definition: q.definition,
                    scrambledWord: q.scrambledWord,
                    correctAnswer: q.correctAnswer
                })),
                isPublished: true 
            } as AnagramGameStep);
        }

        // 7. Cümle Kurma / Düzeltme
        if (output.sentenceScrambleQuestions && output.sentenceScrambleQuestions.length > 0) {
            output.sentenceScrambleQuestions.forEach((q, idx) => {
                newSteps.push({ 
                    type: 'sentenceScramble', 
                    title: `🧩 Cümle Kurma ${idx + 1}`, 
                    scrambledSentence: q.scrambledSentence,
                    correctSentence: q.correctSentence,
                    isPublished: true 
                });
            });
        }

        // 8. Doğru / Yanlış Listesi
        if (output.trueFalseQuestions && output.trueFalseQuestions.length > 0) {
            newSteps.push({
                type: 'trueFalseList',
                title: '✓/✗ Doğru - Yanlış Alıştırması',
                questions: output.trueFalseQuestions.map((q: any) => ({
                    statement: q.statement || q.question || q.text || '',
                    isTrue: q.isTrue !== undefined ? q.isTrue : true
                })),
                isPublished: true
            } as TrueFalseListStep);
        }

        // 9. Çoktan Seçmeli Test Soruları
        if (output.multipleChoiceQuestions && output.multipleChoiceQuestions.length > 0) {
            output.multipleChoiceQuestions.forEach((q, idx) => {
                newSteps.push({ 
                    type: 'mcq', 
                    title: `❓ Kontrol Sorusu ${idx + 1}`, 
                    question: q.question,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    isPublished: true 
                });
            });
        }

        // 10. Boşluk Doldurma Soruları
        if (output.fillInTheBlankQuestions && output.fillInTheBlankQuestions.length > 0) {
            output.fillInTheBlankQuestions.forEach((q, idx) => {
                newSteps.push({ 
                    type: 'fitb', 
                    title: `✍️ Boşluk Doldurma ${idx + 1}`, 
                    sentenceWithBlank: q.sentenceWithBlank,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    isPublished: true 
                });
            });
        }

        return newSteps;
    };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl flex flex-col h-auto max-h-[92vh] bg-slate-950 border border-white/10 text-slate-100 shadow-2xl p-0 overflow-hidden rounded-3xl">
        {/* Header */}
        <DialogHeader className="p-5 pb-4 border-b border-white/10 bg-slate-900/60 backdrop-blur-md flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-purple-500/20 to-rose-500/20 rounded-2xl border border-purple-500/30 text-purple-400">
                <Flame className="h-5 w-5 text-rose-400 animate-pulse" />
            </div>
            <div>
                <DialogTitle className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                    Yapay Zeka Stüdyosu & İçerik Fabrikası
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                    {topicTitle ? `"${topicTitle}" konusu için zengin interaktif içerikler üretin.` : 'Konu için zengin sunum ve değerlendirme slaytları üretin.'}
                </DialogDescription>
            </div>
          </div>

          <Button 
            type="button"
            variant="outline" 
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
                "border-white/10 text-xs font-bold rounded-xl transition-all mr-6",
                showSettings ? "bg-indigo-600 text-white border-indigo-500 shadow-md" : "bg-slate-900 text-slate-300 hover:bg-slate-800"
            )}
          >
            <Settings2 className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
            Model & API
          </Button>
        </DialogHeader>

        {/* Ayarlar Akordiyonu */}
        {showSettings && (
            <div className="bg-slate-900/90 border-b border-white/10 p-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5" /> Google AI Studio API Anahtarı & Model Seçimi
                    </h4>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400">Google AI Studio API Anahtarı</Label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <input 
                                type={showApiKeyText ? "text" : "password"}
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="AIzaSy... (API anahtarınızı yapıştırın)"
                                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                            />
                            <button
                                type="button"
                                onClick={() => setShowApiKeyText(!showApiKeyText)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                            >
                                {showApiKeyText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                        <Button 
                            type="button"
                            size="sm"
                            onClick={handleSaveApiKeyToSystem}
                            disabled={isSavingSystemKey || !apiKey.trim()}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl px-4"
                        >
                            {isSavingSystemKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isKeySaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                            {isKeySaved ? 'Kaydedildi' : 'Sisteme Kaydet'}
                        </Button>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400">Aktif Gemini Modeli</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {FREE_GEMINI_MODELS.map(m => (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                    setSelectedModel(m.id);
                                    setIsCustomModel(false);
                                }}
                                className={cn(
                                    "p-2 rounded-xl border text-left transition-all",
                                    selectedModel === m.id && !isCustomModel
                                        ? "bg-indigo-600/30 border-indigo-500 text-white shadow-md"
                                        : "bg-slate-950 border-white/5 text-slate-400 hover:text-slate-200"
                                )}
                            >
                                <div className="font-bold text-[11px] truncate text-white">{m.name}</div>
                                <div className="text-[9px] text-slate-500 truncate">{m.tag}</div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* Ana Form Alanı */}
        <form onSubmit={handleGenerate} className="p-5 overflow-y-auto max-h-[60vh] space-y-5">
            {/* Kaynak Metin */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-300">Konu Başlığı / Kaynak Metin</Label>
                    <span className="text-[10px] text-slate-500">Bu metin AI içeriğinin temelini oluşturur.</span>
                </div>
                <Textarea 
                    value={localSourceText}
                    onChange={(e) => setLocalSourceText(e.target.value)}
                    placeholder="Konu başlığını veya ders kitabı metnini buraya yapıştırın..."
                    className="min-h-[85px] bg-slate-900 border-white/10 rounded-2xl text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 leading-relaxed"
                />
            </div>

            {/* ⚡ Hızlı Şablon Butonları */}
            <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Wand2 className="w-3.5 h-3.5 text-yellow-400" /> Hızlı Zengin İçerik Paketleri
                </Label>
                <div className="flex flex-wrap gap-1.5">
                    <Button 
                        type="button" 
                        size="sm" 
                        onClick={() => applyPreset('full')}
                        className="bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white font-black text-xs rounded-xl h-8 px-3"
                    >
                        🚀 Tüm Zengin Modülleri Seç
                    </Button>
                    <Button 
                        type="button" 
                        size="sm" 
                        variant="outline"
                        onClick={() => applyPreset('presentation')}
                        className="border-sky-500/40 text-sky-300 hover:bg-sky-500/20 bg-sky-950/30 text-xs rounded-xl h-8 px-3"
                    >
                        💻 İnteraktif Slayt & Özet
                    </Button>
                    <Button 
                        type="button" 
                        size="sm" 
                        variant="outline"
                        onClick={() => applyPreset('cards')}
                        className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20 bg-emerald-950/30 text-xs rounded-xl h-8 px-3"
                    >
                        💡 Kavram & Bilgi Kartları
                    </Button>
                    <Button 
                        type="button" 
                        size="sm" 
                        variant="outline"
                        onClick={() => applyPreset('games')}
                        className="border-fuchsia-500/40 text-fuchsia-300 hover:bg-fuchsia-500/20 bg-fuchsia-950/30 text-xs rounded-xl h-8 px-3"
                    >
                        🔤 Anagram & Cümle Oyunları
                    </Button>
                    <Button 
                        type="button" 
                        size="sm" 
                        variant="outline"
                        onClick={() => applyPreset('assessment')}
                        className="border-purple-500/40 text-purple-300 hover:bg-purple-500/20 bg-purple-950/30 text-xs rounded-xl h-8 px-3"
                    >
                        🎯 Sınav & Değerlendirme
                    </Button>
                </div>
            </div>

            {/* Modül Seçim Kartları */}
            <div className="space-y-3 pt-2">
                <Label className="text-xs font-bold text-slate-300">Üretilecek Slayt ve Etkinlik Türleri</Label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {ALL_ACTIVITY_OPTIONS.map(opt => {
                        const isChecked = !!selectedModules[opt.id];
                        return (
                            <div 
                                key={opt.id}
                                onClick={() => toggleModule(opt.id)}
                                className={cn(
                                    "p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none",
                                    isChecked 
                                        ? "bg-indigo-950/40 border-indigo-500/50 shadow-md shadow-indigo-950/40" 
                                        : "bg-slate-900/40 border-white/5 hover:border-white/20 opacity-70 hover:opacity-100"
                                )}
                            >
                                <div className="mt-0.5 pointer-events-none">
                                    <Checkbox 
                                        checked={isChecked}
                                        className="border-white/20 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-500"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        {opt.icon}
                                        <h5 className="font-bold text-xs text-white truncate">{opt.label}</h5>
                                    </div>
                                    <p className="text-[10px] text-slate-400 leading-snug line-clamp-2">
                                        {opt.description}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <DialogFooter className="p-0 pt-4 flex items-center justify-between sm:justify-between border-t border-white/10">
                <span className="text-[11px] text-slate-400">
                    Aktif Model: <span className="font-bold text-indigo-400">{activeModelId}</span>
                </span>

                <div className="flex gap-2">
                    <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={handleClose} 
                        disabled={isGenerating}
                        className="text-slate-400 hover:text-white text-xs rounded-xl"
                    >
                        Vazgeç
                    </Button>
                    <Button 
                        type="submit" 
                        disabled={isGenerating}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs px-6 rounded-xl shadow-xl shadow-purple-950/50"
                    >
                        {isGenerating ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> İçerikler Üretiliyor...</>
                        ) : (
                            <><Sparkles className="w-4 h-4 mr-2 text-yellow-300" /> Seçilenleri Üret & Akışa Ekle</>
                        )}
                    </Button>
                </div>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
