'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
    Loader2, Sparkles, Key, Eye, EyeOff, Save, CheckCircle2, 
    Settings2, Brain, Layers, Check, X,
    Flame, Wand2, BookOpen, Puzzle, HelpCircle, FileText, Shuffle, Target,
    ChevronDown, ChevronUp, CheckCircle, Clock
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
        id: 'gemini-3.6-flash',
        name: 'Gemini 3.6 Flash',
        tag: '⚡ En Kararlı & Hızlı (Önerilen)',
        desc: 'Yüksek yanıt hızı, kesintisiz kararlılık ve zengin ders tasarımı.',
        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    },
    {
        id: 'gemini-3.7-flash',
        name: 'Gemini 3.7 Flash',
        tag: '🚀 En Yeni Nesil (2026)',
        desc: 'Google’ın en gelişmiş hibrit akıl yürütme modeli.',
        badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40'
    },
    {
        id: 'gemini-3.5-flash',
        name: 'Gemini 3.5 Flash',
        tag: '💡 Yüksek Performans',
        desc: 'Pedagojik içerik, kavram ve soru üretimi için dengeli model.',
        badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40'
    },
    {
        id: 'gemini-3.5-flash-lite',
        name: 'Gemini 3.5 Flash-Lite',
        tag: '⚡ Ultra Düşük Gecikme',
        desc: 'Hızlı soru ve kavram üretimi için optimize edilmiş hafif model.',
        badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
    },
    {
        id: 'gemini-flash-latest',
        name: 'Gemini Flash Latest',
        tag: '🔄 Otomatik Güncel',
        desc: 'Her zaman en son kararlı Flash sürümünü otomatik çalıştırır.',
        badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
    },
    {
        id: 'gemini-3.1-pro-preview',
        name: 'Gemini 3.1 Pro',
        tag: '🧠 Derin Muhakeme & Analiz',
        desc: 'Akademik düzeyde zengin konu anlatımı ve zorlu test soruları için.',
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
    // 📖 Anlatım Modülleri (Presentation)
    { id: 'hookQuestion', label: '🤔 Merak & Giriş Sorusu', description: 'Derse başlarken öğrencilerin dikkatini çeken açık uçlu soru', icon: <HelpCircle className="w-4 h-4 text-amber-400" />, category: 'anlatim' },
    { id: 'notebookNote', label: '✏️ Defterimize Yazalım', description: 'Deftere yazılacak en kritik 3-5 kural maddesi ve zamanlayıcı', icon: <FileText className="w-4 h-4 text-emerald-400" />, category: 'anlatim' },
    { id: 'categoryTable', label: '📊 Kategori & Sınıflandırma Tablosu', description: 'Konuyu Farz, Vacip, Sünnet gibi sütunlu gruplara ayıran şık tablo', icon: <Layers className="w-4 h-4 text-emerald-400" />, category: 'anlatim' },
    { id: 'processFlow', label: '🪜 Adım Adım Yol Haritası & Süreç', description: 'Konunun basamaklarını ve sırasını gösteren etkileşimli akış', icon: <Layers className="w-4 h-4 text-blue-400" />, category: 'anlatim' },
    { id: 'conceptMatrix', label: '🔲 4 Boyutta Konu Analizi', description: 'Tanım, Amaç, Pratik ve Fayda boyutlarıyla 4’lü matris analiz', icon: <Brain className="w-4 h-4 text-purple-400" />, category: 'anlatim' },
    { id: 'conceptExplanations', label: '📌 Temel Kavram Kartları', description: 'Konunun anahtar kavramları ve sadeleştirilmiş tanımları', icon: <Brain className="w-4 h-4 text-indigo-400" />, category: 'anlatim' },
    { id: 'flashcards', label: '🎴 3D Bilgi Kartları (Flashcards)', description: 'Dokunup 3D çevrilen etkileşimli terim-tanım hafıza kartları', icon: <BookOpen className="w-4 h-4 text-emerald-400" />, category: 'anlatim' },
    { id: 'keyTakeaways', label: '💡 Anahtar Çıkarımlar & İpuçları', description: 'Dersin en önemli hap bilgileri ve sınav tüyoları', icon: <Sparkles className="w-4 h-4 text-rose-400" />, category: 'anlatim' },
    { id: 'htmlSlide', label: '💻 İnteraktif Zengin HTML Slayt', description: 'Modern Gamma/NotebookLM kalitesinde görsel slayt', icon: <FileText className="w-4 h-4 text-sky-400" />, category: 'anlatim' },
    { id: 'summary', label: '📑 Konu Özeti Başlıkları', description: 'Konu ana başlıkları ve maddeler halinde slayt özeti', icon: <Layers className="w-4 h-4 text-yellow-400" />, category: 'anlatim' },
    { id: 'learningObjectives', label: '🎯 Öğrenme Hedefleri', description: 'Dersin başında hedeflenen kazanımlar listesi', icon: <Target className="w-4 h-4 text-amber-400" />, category: 'anlatim' },
    { id: 'infographicTable', label: '📊 Karşılaştırma İnfografiği', description: 'Hükümleri ve türleri karşılaştıran renkli infografik tablo', icon: <Layers className="w-4 h-4 text-cyan-400" />, category: 'anlatim' },
    { id: 'visualInfographics', label: '🔄 Akış & Süreç İnfografiği', description: 'Görsel diyagramlı aşamalı süreç infografiği', icon: <Sparkles className="w-4 h-4 text-emerald-400" />, category: 'anlatim' },
    { id: 'conceptMap', label: '🧠 Kavram Haritası Şeması', description: 'Kavramlar arası ilişkileri gösteren etkileşimli görsel ağ', icon: <Brain className="w-4 h-4 text-purple-400" />, category: 'anlatim' },

    // 🎯 Değerlendirme & Oyun Modülleri (Assessment)
    { id: 'multipleChoiceQuestions', label: '❓ Çoktan Seçmeli Test (MCQ)', description: '4 seçenekli, açıklamalı test ve kontrol soruları', icon: <HelpCircle className="w-4 h-4 text-violet-400" />, category: 'degerlendirme' },
    { id: 'trueFalseQuestions', label: '✓/✗ Doğru - Yanlış Listesi', description: 'Tek ekranda çözülen etkileşimli D/Y alıştırması', icon: <CheckCircle2 className="w-4 h-4 text-purple-400" />, category: 'degerlendirme' },
    { id: 'fillInTheBlankQuestions', label: '✍️ Boşluk Doldurma Soruları', description: 'Kilit kavramları pekiştiren seçenekli boşluk doldurma', icon: <HelpCircle className="w-4 h-4 text-amber-400" />, category: 'degerlendirme' },
    { id: 'anagramQuestions', label: '🔤 Anagram / Kelime Oyunu', description: 'Harfleri karışık verilen kelimeleri bulma bulmacası', icon: <Puzzle className="w-4 h-4 text-fuchsia-400" />, category: 'degerlendirme' },
    { id: 'sentenceScrambleQuestions', label: '🧩 Cümle Kurma / Düzeltme', description: 'Karışık verilen kelimeleri sıraya dizerek cümle kurma', icon: <Shuffle className="w-4 h-4 text-cyan-400" />, category: 'degerlendirme' },
];

const DEFAULT_MODULES: { [key: string]: boolean } = {};

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
  const [selectedModules, setSelectedModules] = useState<{ [key: string]: boolean }>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'anlatim' | 'degerlendirme'>('anlatim');
  const [isSourceTextOpen, setIsSourceTextOpen] = useState(false);
  
  const [apiKey, setApiKey] = useState(() => {
      if (typeof window !== 'undefined') {
          return localStorage.getItem('custom_gemini_api_key') || '';
      }
      return '';
  });
  
  const [selectedModel, setSelectedModel] = useState(() => {
      if (typeof window !== 'undefined') {
          return localStorage.getItem('custom_gemini_model') || 'gemini-3.6-flash';
      }
      return 'gemini-3.6-flash';
  });

  const [customModelInput, setCustomModelInput] = useState('');
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [showApiKeyText, setShowApiKeyText] = useState(false);
  const [isSavingSystemKey, setIsSavingSystemKey] = useState(false);
  const [isKeySaved, setIsKeySaved] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setLocalSourceText(sourceText || topicTitle || '');
      setSelectedModules({}); // Başlangıçta temiz gelsin
      setIsSourceTextOpen(!sourceText || sourceText.length < 50);
    }
  }, [isOpen, sourceText, topicTitle]);

  if (!isOpen) return null;

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

  const anlatimOptions = ALL_ACTIVITY_OPTIONS.filter(opt => opt.category === 'anlatim');
  const degerlendirmeOptions = ALL_ACTIVITY_OPTIONS.filter(opt => opt.category === 'degerlendirme');

  const selectedAnlatimCount = anlatimOptions.filter(opt => selectedModules[opt.id]).length;
  const selectedDegerlendirmeCount = degerlendirmeOptions.filter(opt => selectedModules[opt.id]).length;
  const totalSelectedCount = Object.values(selectedModules).filter(Boolean).length;

  const selectAllInCategory = (category: 'anlatim' | 'degerlendirme') => {
    setSelectedModules(prev => {
        const next = { ...prev };
        ALL_ACTIVITY_OPTIONS.filter(o => o.category === category).forEach(o => {
            next[o.id] = true;
        });
        return next;
    });
  };

  const clearCategory = (category: 'anlatim' | 'degerlendirme') => {
    setSelectedModules(prev => {
        const next = { ...prev };
        ALL_ACTIVITY_OPTIONS.filter(o => o.category === category).forEach(o => {
            delete next[o.id];
        });
        return next;
    });
  };

  // Hızlı Hazır Paketler
  const applyPreset = (preset: 'tamDers' | 'anlatim' | 'sorular' | 'defter' | 'all' | 'clear') => {
    const modules: { [key: string]: boolean } = {};
    if (preset === 'all') {
        ALL_ACTIVITY_OPTIONS.forEach(opt => modules[opt.id] = true);
    } else if (preset === 'clear') {
        // Boş bırak
    } else if (preset === 'tamDers') {
        modules['hookQuestion'] = true;
        modules['notebookNote'] = true;
        modules['categoryTable'] = true;
        modules['conceptExplanations'] = true;
        modules['trueFalseQuestions'] = true;
        modules['multipleChoiceQuestions'] = true;
        setActiveTab('anlatim');
    } else if (preset === 'anlatim') {
        modules['hookQuestion'] = true;
        modules['notebookNote'] = true;
        modules['categoryTable'] = true;
        modules['processFlow'] = true;
        modules['conceptExplanations'] = true;
        modules['keyTakeaways'] = true;
        setActiveTab('anlatim');
    } else if (preset === 'sorular') {
        modules['multipleChoiceQuestions'] = true;
        modules['trueFalseQuestions'] = true;
        modules['fillInTheBlankQuestions'] = true;
        modules['anagramQuestions'] = true;
        modules['sentenceScrambleQuestions'] = true;
        setActiveTab('degerlendirme');
    } else if (preset === 'defter') {
        modules['notebookNote'] = true;
        modules['categoryTable'] = true;
        modules['conceptExplanations'] = true;
        modules['flashcards'] = true;
        setActiveTab('anlatim');
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

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

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
        const activeModel = activeModelId || 'gemini-3.6-flash';
        
        // 1. Zengin HTML Slayt Üretimi
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

        // 2. Kavram Haritası
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
                generatedSteps.push(...mapAIOutputToSteps(result, selectedModules));
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

  const mapAIOutputToSteps = (
      output: GenerateLessonContentOutput,
      activeModules: { [key: string]: boolean } = {}
  ): LessonStep[] => {
        const newSteps: LessonStep[] = [];
        
        // 0. Merak & Giriş Sorusu (Dikkat Çekme - En Başta Gösterilir)
        if (activeModules.hookQuestion && output.hookQuestion && output.hookQuestion.question) {
            newSteps.push({
                type: 'hookQuestion',
                title: output.hookQuestion.title || '🤔 Derse Başlarken: Bir Düşünelim!',
                question: output.hookQuestion.question,
                thoughtStarter: output.hookQuestion.thoughtStarter,
                tag: output.hookQuestion.tag || 'Merak & Düşünce Sorusu',
                isPublished: true
            });
        }

        // 1. Öğrenme Hedefleri
        if (activeModules.learningObjectives && output.learningObjectives && output.learningObjectives.length > 0) {
            newSteps.push({ 
                type: 'objectiveList', 
                title: '🎯 Öğrenme Hedefleri', 
                items: output.learningObjectives,
                isPublished: true 
            });
        }

        // 1b. 4 Boyutta Konu Matrisi
        if (activeModules.conceptMatrix && output.conceptMatrix && output.conceptMatrix.quadrants && output.conceptMatrix.quadrants.length > 0) {
            newSteps.push({
                type: 'conceptMatrix',
                title: output.conceptMatrix.title || '🔲 4 Boyutta Konu Analizi',
                topicName: output.conceptMatrix.topicName || '',
                quadrants: output.conceptMatrix.quadrants,
                isPublished: true
            });
        }

        // 1c. Adım Adım Yol Haritası & Süreç
        if (activeModules.processFlow && output.processFlow && output.processFlow.steps && output.processFlow.steps.length > 0) {
            newSteps.push({
                type: 'processFlow',
                title: output.processFlow.title || '🪜 Adım Adım Yol Haritası & Süreç',
                steps: output.processFlow.steps,
                isPublished: true
            });
        }

        // 1d. Kategori & Sınıflandırma Tablosu (Örn: Farz, Vacip, Sünnet)
        if (activeModules.categoryTable && output.categoryTable && output.categoryTable.categories && output.categoryTable.categories.length > 0) {
            newSteps.push({
                type: 'categoryTable',
                title: output.categoryTable.title || '📊 Konu Sınıflandırma Tablosu',
                tableTitle: output.categoryTable.tableTitle || output.categoryTable.title,
                description: output.categoryTable.description,
                categories: output.categoryTable.categories,
                isPublished: true
            });
        }

        // 2. Konu Özeti (Her Başlık Ayrı Bir Sayfa / Adım Olarak - Cümleler Sunumda Sırayla Ekrana Gelir)
        if (activeModules.summary && output.summary && output.summary.length > 0) {
            output.summary.forEach((section, idx) => {
                let sentenceList: string[] = [];
                if (Array.isArray(section.sentences) && section.sentences.length > 0) {
                    sentenceList = section.sentences;
                } else if (typeof section.content === 'string') {
                    const doc = new DOMParser().parseFromString(`<div>${section.content}</div>`, 'text/html');
                    const lis = doc.querySelectorAll('li');
                    if (lis.length > 0) {
                        sentenceList = Array.from(lis).map(l => l.textContent?.trim() || l.innerHTML.trim());
                    } else {
                        sentenceList = section.content.split('\n').map(s => s.trim()).filter(Boolean);
                    }
                }

                if (sentenceList.length === 0 && section.title) {
                    sentenceList = [section.title];
                }

                const htmlList = `<ul>${sentenceList.map(s => `<li>${s.replace(/^<li>|<\/li>$/g, '')}</li>`).join('')}</ul>`;

                newSteps.push({ 
                    type: 'content', 
                    title: section.title || `📖 Konu Başlığı ${idx + 1}`, 
                    content: htmlList,
                    isPublished: true
                });
            });
        }

        // 2b. İnfografik Karşılaştırma Tablosu
        if (activeModules.infographicTable && output.infographicTable && output.infographicTable.columns && output.infographicTable.rows) {
            const table = output.infographicTable;
            const tableHtml = `
            <div class="w-full max-w-5xl mx-auto p-4 sm:p-8 space-y-6">
                <div class="text-center space-y-2">
                    <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-black uppercase tracking-wider">
                        <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                        📊 Karşılaştırmalı İnfografik Tablo
                    </div>
                    <h2 class="text-2xl sm:text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-indigo-200 to-fuchsia-300">
                        ${table.title}
                    </h2>
                    ${table.description ? `<p class="text-slate-300 text-sm max-w-2xl mx-auto font-medium">${table.description}</p>` : ''}
                </div>

                <div class="overflow-x-auto rounded-3xl border border-white/10 bg-slate-900/90 backdrop-blur-xl shadow-2xl">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="border-b border-white/10 bg-slate-950/80">
                                ${table.columns.map((col, cIdx) => `
                                    <th class="p-4 sm:p-5 font-black text-xs sm:text-sm uppercase tracking-wider ${['text-cyan-300', 'text-indigo-300', 'text-emerald-300', 'text-amber-300', 'text-rose-300'][cIdx % 5]}">
                                        ${col}
                                    </th>
                                `).join('')}
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-white/5 text-xs sm:text-sm text-slate-200">
                            ${table.rows.map((row) => `
                                <tr class="transition-colors hover:bg-slate-800/50">
                                    ${row.map((cell, cIdx) => `
                                        <td class="p-4 sm:p-5 ${cIdx === 0 ? 'font-black text-white' : 'font-medium'}">
                                            ${cell}
                                        </td>
                                    `).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`;

            newSteps.push({
                type: 'htmlSlide',
                title: `📊 ${table.title || 'İnfografik Tablo'}`,
                htmlContent: tableHtml,
                isPublished: true
            });
        }

        // 2c. Süreç & Akış İnfografiği
        if (activeModules.visualInfographics && output.visualInfographics && output.visualInfographics.items && output.visualInfographics.items.length > 0) {
            const info = output.visualInfographics;
            const cardGradients = [
                { bg: 'from-sky-950/60 to-slate-900', border: 'border-sky-500/40', text: 'text-sky-300', numBg: 'bg-sky-500/20 text-sky-300 border-sky-400/40' },
                { bg: 'from-emerald-950/60 to-slate-900', border: 'border-emerald-500/40', text: 'text-emerald-300', numBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40' },
                { bg: 'from-amber-950/60 to-slate-900', border: 'border-amber-500/40', text: 'text-amber-300', numBg: 'bg-amber-500/20 text-amber-300 border-amber-400/40' },
                { bg: 'from-violet-950/60 to-slate-900', border: 'border-violet-500/40', text: 'text-violet-300', numBg: 'bg-violet-500/20 text-violet-300 border-violet-400/40' },
                { bg: 'from-rose-950/60 to-slate-900', border: 'border-rose-500/40', text: 'text-rose-300', numBg: 'bg-rose-500/20 text-rose-300 border-rose-400/40' },
            ];

            const infoHtml = `
            <div class="w-full max-w-5xl mx-auto p-4 sm:p-8 space-y-8">
                <div class="text-center space-y-2">
                    <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-emerald-500/10 to-indigo-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-black uppercase tracking-wider">
                        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        🔄 Süreç & Akış İnfografiği
                    </div>
                    <h2 class="text-2xl sm:text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-sky-200 to-indigo-300">
                        ${info.title}
                    </h2>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-${Math.min(info.items.length, 3)} gap-5 relative">
                    ${info.items.map((item, idx) => {
                        const style = cardGradients[idx % cardGradients.length];
                        return `
                        <div class="relative group rounded-3xl bg-gradient-to-b ${style.bg} border ${style.border} p-6 shadow-xl hover:scale-[1.03] transition-all duration-300 flex flex-col justify-between">
                            <div class="space-y-4">
                                <div class="flex items-center justify-between pb-3 border-b border-white/10">
                                    <div class="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm border ${style.numBg}">
                                        ${idx + 1}
                                    </div>
                                    <span class="text-2xl">${item.icon || '✨'}</span>
                                </div>
                                <div>
                                    <h3 class="text-lg font-black text-white">${item.title}</h3>
                                    ${item.subtitle ? `<div class="text-xs ${style.text} font-bold uppercase tracking-wider mt-0.5">${item.subtitle}</div>` : ''}
                                </div>
                                <p class="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                                    ${item.description}
                                </p>
                            </div>
                            ${item.badge ? `
                            <div class="mt-4 pt-3 border-t border-white/10">
                                <span class="text-[11px] font-bold ${style.text} bg-black/30 px-2.5 py-1 rounded-full border border-white/10">
                                    ${item.badge}
                                </span>
                            </div>` : ''}
                        </div>
                        `;
                    }).join('')}
                </div>

                ${info.summaryNote ? `
                <div class="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center gap-3 text-xs sm:text-sm text-indigo-200">
                    <span class="text-lg">💡</span>
                    <span>${info.summaryNote}</span>
                </div>` : ''}
            </div>`;

            newSteps.push({
                type: 'htmlSlide',
                title: `🔄 ${info.title || 'Süreç İnfografiği'}`,
                htmlContent: infoHtml,
                isPublished: true
            });
        }

        // 3. Anahtar Çıkarımlar
        if (activeModules.keyTakeaways && output.keyTakeaways && output.keyTakeaways.length > 0) {
            newSteps.push({ 
                type: 'content', 
                title: '💡 Anahtar Çıkarımlar & İpuçları', 
                content: `<ul>${output.keyTakeaways.map(item => `<li>${item}</li>`).join('')}</ul>`,
                isPublished: true 
            });
        }

        // 4. Kavram Açıklamaları (Kavram Kartları)
        if (activeModules.conceptExplanations && output.conceptExplanations && output.conceptExplanations.length > 0) {
            newSteps.push({ 
                type: 'conceptExplanation', 
                title: '📌 Temel Kavramlar & Açıklamaları', 
                items: output.conceptExplanations,
                isPublished: true 
            });
        }

        // 5. Bilgi Kartları (Flashcards)
        if (activeModules.flashcards && output.flashcards && output.flashcards.length > 0) {
            newSteps.push({ 
                type: 'flashcard', 
                title: '💡 Bilgi & Hafıza Kartları', 
                cards: output.flashcards,
                isPublished: true 
            });
        }

        // 5b. Defterimize Yazalım (Özet Defter Notu)
        if (activeModules.notebookNote && output.notebookNote && output.notebookNote.notes && output.notebookNote.notes.length > 0) {
            newSteps.push({
                type: 'notebookNote',
                title: output.notebookNote.title || '✏️ Defterimize Yazalım',
                noteTitle: output.notebookNote.noteTitle || 'Dersin En Önemli Özet Maddeleri',
                notes: output.notebookNote.notes,
                suggestedMinutes: output.notebookNote.suggestedMinutes || 3,
                isPublished: true
            });
        }

        // 6. Anagram / Kelime Oyunu Kartları
        if (activeModules.anagramQuestions && output.anagramQuestions && output.anagramQuestions.length > 0) {
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
        if (activeModules.sentenceScrambleQuestions && output.sentenceScrambleQuestions && output.sentenceScrambleQuestions.length > 0) {
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
        if (activeModules.trueFalseQuestions && output.trueFalseQuestions && output.trueFalseQuestions.length > 0) {
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
        if (activeModules.multipleChoiceQuestions && output.multipleChoiceQuestions && output.multipleChoiceQuestions.length > 0) {
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
        if (activeModules.fillInTheBlankQuestions && output.fillInTheBlankQuestions && output.fillInTheBlankQuestions.length > 0) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in-0 duration-200">
      <div 
        className="relative w-full max-w-4xl max-h-[94vh] flex flex-col bg-slate-950 border border-white/15 text-slate-100 shadow-2xl rounded-3xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ══ 1. ÜST BAŞLIK & AYARLAR ÇUBUĞU ══ */}
        <div className="p-3.5 sm:p-4.5 px-4 sm:px-6 border-b border-white/10 bg-slate-900/90 backdrop-blur-md flex flex-row items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl border border-purple-500/30 text-purple-400 shadow-md flex-shrink-0">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-300 animate-pulse" />
            </div>
            <div>
                <h3 className="text-sm sm:text-base md:text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                    ✨ Yapay Zekâ Stüdyosu
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate max-w-[220px] sm:max-w-md">
                    {topicTitle ? `"${topicTitle}" konusu için akıllı slayt ve alıştırmalar üretin.` : 'Ders için akıllı sunum ve alıştırma adımları üretin.'}
                </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
              <Button 
                type="button"
                variant="outline" 
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className={cn(
                    "border-white/10 text-xs font-bold rounded-xl transition-all h-8",
                    showSettings ? "bg-indigo-600 text-white border-indigo-500 shadow-md" : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                )}
              >
                <Settings2 className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
                <span className="hidden sm:inline">Model & API</span>
              </Button>

              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
          </div>
        </div>

        {/* ══ 2. MODEL & API AYARLARI ÇEKMECESİ ══ */}
        {showSettings && (
            <div className="bg-slate-900/95 border-b border-white/10 p-4 sm:p-5 space-y-4 animate-in slide-in-from-top-2 duration-200 flex-shrink-0">
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

        {/* ══ 3. KOMPAKT KAYNAK METİN ALANI ══ */}
        <div className="bg-slate-900/60 border-b border-white/10 p-3 sm:px-6 flex flex-col gap-2 flex-shrink-0">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="p-1 bg-indigo-500/20 rounded-lg text-indigo-300 border border-indigo-500/30">
                        <FileText className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-xs font-bold text-slate-300">Kaynak Metin & Konu</span>
                    <span className="text-[10px] font-bold text-indigo-300 bg-indigo-950/70 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                        {localSourceText.length.toLocaleString('tr-TR')} karakter • {localSourceText.trim().split(/\s+/).filter(Boolean).length} kelime
                    </span>
                </div>

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsSourceTextOpen(!isSourceTextOpen)}
                    className="h-7 px-2.5 text-xs text-indigo-300 hover:text-white hover:bg-white/10 font-bold rounded-lg"
                >
                    {isSourceTextOpen ? (
                        <><ChevronUp className="w-3.5 h-3.5 mr-1" /> Metin Kutusunu Kapat</>
                    ) : (
                        <><ChevronDown className="w-3.5 h-3.5 mr-1" /> Metni Düzenle / Gör 📝</>
                    )}
                </Button>
            </div>

            {/* Genişletilmiş Textarea */}
            {isSourceTextOpen && (
                <div className="mt-1 animate-in fade-in-50 duration-200">
                    <Textarea 
                        value={localSourceText}
                        onChange={(e) => setLocalSourceText(e.target.value)}
                        placeholder="Konu başlığını veya ders kitabı metnini buraya yapıştırın (Uzunluk kısıtlaması yoktur)..."
                        className="min-h-[100px] max-h-[200px] bg-slate-950 border-white/15 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 font-sans leading-relaxed"
                    />
                </div>
            )}
        </div>

        {/* ══ 4. HIZLI HAZIR PAKETLER (TEK TIKLA SEÇİM) ══ */}
        <div className="p-3 sm:px-6 pt-3 bg-slate-950 flex-shrink-0 space-y-1.5 border-b border-white/5">
            <div className="flex items-center justify-between">
                <Label className="text-[11px] sm:text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Wand2 className="w-3.5 h-3.5 text-yellow-400" /> ⚡ Hızlı Hazır Paketler (Tek Tıkla Seç)
                </Label>
                <div className="flex items-center gap-1.5">
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => applyPreset('all')}
                        className="h-6 px-2 text-[11px] text-amber-400 hover:text-amber-300 font-bold"
                    >
                        Tümünü Seç
                    </Button>
                    <span className="text-slate-600">•</span>
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => applyPreset('clear')}
                        className="h-6 px-2 text-[11px] text-rose-400 hover:text-rose-300 font-bold"
                    >
                        Temizle
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {/* 1. Tam Ders Paketi */}
                <button
                    type="button"
                    onClick={() => applyPreset('tamDers')}
                    className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-950/60 to-purple-950/60 border border-indigo-500/40 hover:border-indigo-400 text-left transition-all hover:scale-[1.02] shadow-sm group cursor-pointer"
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black text-white group-hover:text-indigo-300">🌟 Tam Ders</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">6 Adım</span>
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-1 leading-tight">
                        Giriş, Not, Kategori, Kavram, Test, D/Y
                    </p>
                </button>

                {/* 2. Konu Anlatımı Paketi */}
                <button
                    type="button"
                    onClick={() => applyPreset('anlatim')}
                    className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-950/60 to-cyan-950/60 border border-blue-500/40 hover:border-blue-400 text-left transition-all hover:scale-[1.02] shadow-sm group cursor-pointer"
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black text-white group-hover:text-cyan-300">📖 Konu Anlatımı</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">5 Adım</span>
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-1 leading-tight">
                        Giriş, Not, Kategori, Süreç, Kavramlar
                    </p>
                </button>

                {/* 3. Soru & Alıştırma Paketi */}
                <button
                    type="button"
                    onClick={() => applyPreset('sorular')}
                    className="p-2.5 rounded-2xl bg-gradient-to-br from-purple-950/60 to-pink-950/60 border border-purple-500/40 hover:border-purple-400 text-left transition-all hover:scale-[1.02] shadow-sm group cursor-pointer"
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black text-white group-hover:text-purple-300">🎯 Soru & Oyunlar</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">5 Adım</span>
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-1 leading-tight">
                        Test (MCQ), D/Y, Boşluk, Anagram, Cümle
                    </p>
                </button>

                {/* 4. Defter & Kavram Paketi */}
                <button
                    type="button"
                    onClick={() => applyPreset('defter')}
                    className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-950/60 to-teal-950/60 border border-emerald-500/40 hover:border-emerald-400 text-left transition-all hover:scale-[1.02] shadow-sm group cursor-pointer"
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black text-white group-hover:text-emerald-300">✏️ Defter & Kavram</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">4 Adım</span>
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-1 leading-tight">
                        Defter Notu, Kategori, Kavram & 3D Kart
                    </p>
                </button>
            </div>
        </div>

        {/* ══ 5. SEKME GEZİNTİSİ & MODÜL SEÇİM KARTLARI ══ */}
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-slate-950">
            {/* Sekme Başlıkları */}
            <div className="px-3 sm:px-6 pt-3 pb-2 border-b border-white/10 flex items-center justify-between gap-2 flex-shrink-0 bg-slate-950">
                <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-2xl border border-white/10">
                    <button
                        type="button"
                        onClick={() => setActiveTab('anlatim')}
                        className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer",
                            activeTab === 'anlatim'
                                ? "bg-blue-600 text-white shadow-md shadow-blue-950/50"
                                : "text-slate-400 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>1. Konu Anlatımı Slaytları</span>
                        <span className={cn(
                            "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                            activeTab === 'anlatim' ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
                        )}>
                            {selectedAnlatimCount}/{anlatimOptions.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('degerlendirme')}
                        className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer",
                            activeTab === 'degerlendirme'
                                ? "bg-purple-600 text-white shadow-md shadow-purple-950/50"
                                : "text-slate-400 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <Brain className="w-3.5 h-3.5" />
                        <span>2. Soru, Test & Oyunlar</span>
                        <span className={cn(
                            "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                            activeTab === 'degerlendirme' ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
                        )}>
                            {selectedDegerlendirmeCount}/{degerlendirmeOptions.length}
                        </span>
                    </button>
                </div>

                {/* Sekmeye Özel Hızlı Seçim Butonları */}
                <div className="flex items-center gap-1">
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => selectAllInCategory(activeTab)}
                        className="h-7 px-2 text-[11px] text-indigo-400 hover:text-indigo-300 font-bold"
                    >
                        Tümünü Seç
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => clearCategory(activeTab)}
                        className="h-7 px-2 text-[11px] text-slate-400 hover:text-rose-400 font-bold"
                    >
                        Temizle
                    </Button>
                </div>
            </div>

            {/* Modül Kartları Izgarası (Kaydırılabilir) */}
            <div className="p-3 sm:p-6 overflow-y-auto flex-1 min-h-0 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {(activeTab === 'anlatim' ? anlatimOptions : degerlendirmeOptions).map(opt => {
                        const isChecked = !!selectedModules[opt.id];
                        return (
                            <div 
                                key={opt.id}
                                onClick={() => toggleModule(opt.id)}
                                className={cn(
                                    "p-3 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between select-none group",
                                    isChecked 
                                        ? "bg-indigo-950/80 border-indigo-400 shadow-md shadow-indigo-950/50 scale-[1.01]" 
                                        : "bg-slate-900/50 border-white/5 hover:border-white/20 hover:bg-slate-900/80 opacity-75 hover:opacity-100"
                                )}
                            >
                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                    <div className="flex items-center gap-2">
                                        <div className={cn(
                                            "p-1.5 rounded-xl border flex items-center justify-center transition-colors flex-shrink-0",
                                            isChecked ? "bg-indigo-600/30 border-indigo-400/50" : "bg-slate-950 border-white/10"
                                        )}>
                                            {opt.icon}
                                        </div>
                                        <h5 className="font-bold text-xs text-white leading-tight">{opt.label}</h5>
                                    </div>
                                    <div className={cn(
                                        "w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors mt-0.5",
                                        isChecked ? "bg-indigo-500 border-indigo-400 text-white" : "border-white/20 bg-slate-950"
                                    )}>
                                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-400 group-hover:text-slate-300 leading-snug line-clamp-2">
                                    {opt.description}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>

        {/* ══ 6. STICKY ALT AKSİYON ÇUBUĞU ══ */}
        <div className="p-3 sm:px-6 border-t border-white/10 bg-slate-900/90 backdrop-blur-md flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-white bg-indigo-950 border border-indigo-500/40 px-3 py-1 rounded-xl">
                    ✨ <span className="text-indigo-300 font-black">{totalSelectedCount}</span> Modül Seçildi
                </span>
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                    Model: <span className="font-bold text-indigo-400">{activeModelId}</span>
                </span>
            </div>

            <div className="flex items-center gap-2">
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
                    type="button"
                    onClick={handleGenerate}
                    disabled={isGenerating || totalSelectedCount === 0}
                    className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs px-5 sm:px-6 rounded-xl shadow-xl shadow-purple-950/50 disabled:opacity-40 cursor-pointer"
                >
                    {isGenerating ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> İçerikler Üretiliyor...</>
                    ) : (
                        <><Sparkles className="w-4 h-4 mr-2 text-yellow-300" /> {totalSelectedCount > 0 ? `Seçilen ${totalSelectedCount} Adımı Üret` : 'Modül Seçin'}</>
                    )}
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
}
