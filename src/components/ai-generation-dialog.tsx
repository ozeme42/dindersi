

"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Sparkles, Settings2, Key, Eye, EyeOff, Save, Check, 
  ChevronUp, ChevronDown, FileText, Loader2, X, Trash2, 
  ArrowLeft, BookOpen, CheckCircle2, HelpCircle, 
  Flame, Wand2
} from 'lucide-react';
import type { Question } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { generateQuestionsWithAI } from '@/app/teacher/questions/actions';
import { saveSystemAiConfigAction } from '@/ai/ai-config-service';
import type { AIGeneratedQuestions } from '@/ai/flows/generate-questions-flow';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

// ══ GEMINI MODELLERİ ══
const FREE_GEMINI_MODELS = [
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
    desc: 'Pedagojik içerik ve kaliteli soru üretimi için dengeli model.',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40'
  },
  {
    id: 'gemini-3.5-flash-lite',
    name: 'Gemini 3.5 Flash-Lite',
    tag: '⚡ Ultra Düşük Gecikme',
    desc: 'Hızlı soru üretimi için optimize edilmiş hafif model.',
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
    desc: 'Akademik ve LGS düzeyinde derinlikli yeni nesil sorular için.',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  }
];

const QUESTION_TYPE_OPTIONS = [
  { 
    id: 'mcq', 
    label: 'Çoktan Seçmeli', 
    desc: '4 seçenekli standart test sorusu',
    icon: HelpCircle,
    color: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-400'
  },
  { 
    id: 'tf', 
    label: 'Doğru / Yanlış', 
    desc: 'Öğrencinin bilgiyi doğruladığı önerme sorusu',
    icon: CheckCircle2,
    color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400'
  },
  { 
    id: 'fitb', 
    label: 'Boşluk Doldurma', 
    desc: 'Cümledeki eksik kavramı tamamlama sorusu',
    icon: BookOpen,
    color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400'
  },
] as const;

type AIGenerationDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onQuestionsGenerated: () => void;
  context: {
    selection: { classId: string; courseId: string; unitId: string; topicId: string };
    selectionNames: { className: string; courseName: string; unitName: string; topicName: string };
    sourceText?: string;
    isLoadingSourceText?: boolean;
  } | null;
  onSave: (data: { questions: any[] }, context: any) => Promise<{ success: boolean; error?: string, count?: number }>;
};

type Step = 'setup' | 'generating' | 'review';

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
  const [isSavingQuestions, setIsSavingQuestions] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'Çoktan Seçmeli' | 'Doğru/Yanlış' | 'Boşluk Doldurma'>('all');
  const { toast } = useToast();

  // ══ KAYNAK METİN STATE'LERİ ══
  const [localSourceText, setLocalSourceText] = useState('');
  const [isFetchingRemoteText, setIsFetchingRemoteText] = useState(false);
  const [isSourceTextOpen, setIsSourceTextOpen] = useState(false);

  // ══ MODEL VE API AYARLARI ══
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
  const [isSavingSystemKey, setIsSavingSystemKey] = useState(false);
  const [isKeySaved, setIsKeySaved] = useState(false);

  // ══ SORU ÜRETİM KONFİGÜRASYONU ══
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['mcq']);
  const [selectedDifficulties, setSelectedDifficulties] = useState<('Kolay' | 'Orta' | 'Zor')[]>(['Kolay', 'Orta']);
  const [countPerType, setCountPerType] = useState<number>(3);
  const [customPrompt, setCustomPrompt] = useState<string>('');

  const activeModelId = isCustomModel ? (customModelInput.trim() || 'gemini-3.7-flash') : selectedModel;

  // ══ KAYITLI KAYNAK METNİ OTOMATİK DOLDURMA ══
  useEffect(() => {
    if (!isOpen) return;

    // Eğer context içinde sourceText zaten geldiyse doğrudan kullan
    if (context?.sourceText && context.sourceText.trim().length > 0) {
      setLocalSourceText(context.sourceText);
      setIsSourceTextOpen(context.sourceText.length < 150);
      return;
    }

    // Context içinde yoksa Firestore'dan canlı olarak çek
    if (context?.selection?.courseId && context?.selection?.unitId && context?.selection?.topicId && context.selection.topicId !== 'all') {
      let isMounted = true;
      setIsFetchingRemoteText(true);
      const fetchTopic = async () => {
        try {
          const topicRef = doc(db, 'courses', context.selection.courseId, 'units', context.selection.unitId, 'topics', context.selection.topicId);
          const snap = await getDoc(topicRef);
          if (isMounted && snap.exists()) {
            const data = snap.data();
            const text = data.sourceText || '';
            setLocalSourceText(text);
            setIsSourceTextOpen(text.length < 150);
          }
        } catch (err) {
          console.warn("Could not fetch topic source text in AI dialog:", err);
        } finally {
          if (isMounted) setIsFetchingRemoteText(false);
        }
      };
      fetchTopic();
      return () => { isMounted = false; };
    }
  }, [isOpen, context]);

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep('setup');
      setGeneratedQuestions([]);
      setShowSettings(false);
    }, 250);
  };

  // ══ HIZLI HAZIR SINAV PAKETLERİ (PRESETS) ══
  const applyPreset = (preset: 'balanced' | 'mcqOnly' | 'quickScan' | 'lgs') => {
    if (preset === 'balanced') {
      setSelectedTypes(['mcq', 'tf', 'fitb']);
      setSelectedDifficulties(['Kolay', 'Orta', 'Zor']);
      setCountPerType(3);
      setCustomPrompt('Konunun temel kazanımlarını dengeli şekilde ölçen sınav paketi.');
    } else if (preset === 'mcqOnly') {
      setSelectedTypes(['mcq']);
      setSelectedDifficulties(['Orta', 'Zor']);
      setCountPerType(5);
      setCustomPrompt('Tamamı çoktan seçmeli, şıkları çeldirici ve nitelikli test soruları.');
    } else if (preset === 'quickScan') {
      setSelectedTypes(['tf', 'fitb']);
      setSelectedDifficulties(['Kolay', 'Orta']);
      setCountPerType(4);
      setCustomPrompt('Ders başında veya sonunda hızlı tarama ve kavram pekiştirme soruları.');
    } else if (preset === 'lgs') {
      setSelectedTypes(['mcq']);
      setSelectedDifficulties(['Zor']);
      setCountPerType(5);
      setCustomPrompt('LGS formatında; metin, tablo veya olay yorumlatmaya dayalı yeni nesil beceri temelli sorular.');
    }
  };

  // ══ MODEL & API AYARLARINI SİSTEME KAYDETME ══
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

  // ══ SORU TİPİ & ZORLUK TOGGLE FONKSİYONLARI ══
  const toggleType = (typeId: string) => {
    setSelectedTypes(prev => {
      if (prev.includes(typeId)) {
        if (prev.length === 1) {
          toast({ title: "Uyarı", description: "En az bir soru tipi seçilmelidir." });
          return prev;
        }
        return prev.filter(t => t !== typeId);
      }
      return [...prev, typeId];
    });
  };

  const toggleDifficulty = (level: 'Kolay' | 'Orta' | 'Zor') => {
    setSelectedDifficulties(prev => {
      if (prev.includes(level)) {
        if (prev.length === 1) {
          toast({ title: "Uyarı", description: "En az bir zorluk seviyesi seçilmelidir." });
          return prev;
        }
        return prev.filter(d => d !== level);
      }
      return [...prev, level];
    });
  };

  // ══ AI ÇIKTISINI İNCELEME LİSTESİNE DÖNÜŞTÜRME ══
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
  };

  // ══ ÜRETİMİ BAŞLAT ══
  const handleGenerate = async () => {
    const trimmedContext = localSourceText.trim();
    if (!trimmedContext) {
      toast({ 
        title: "Kaynak Metin Eksik", 
        description: "Yapay zekânın soru üretebilmesi için lütfen kaynak konu metnini girin veya veritabanından çekilmesini bekleyin.", 
        variant: "destructive" 
      });
      return;
    }

    if (selectedTypes.length === 0) {
      toast({ title: "Uyarı", description: "Lütfen en az bir soru tipi seçin.", variant: "destructive" });
      return;
    }

    setStep('generating');
    try {
      const activeKey = apiKey.trim() || undefined;
      const activeModel = activeModelId || 'gemini-3.7-flash';

      const result = await generateQuestionsWithAI({
        contextText: trimmedContext,
        questionTypes: selectedTypes,
        difficulty: selectedDifficulties,
        questionCountPerType: countPerType,
        topicName: context?.selectionNames?.topicName || 'Din Kültürü ve Ahlak Bilgisi',
        apiKey: activeKey,
        modelName: activeModel,
        customPrompt: customPrompt.trim() || undefined,
      });

      if ('error' in result && result.error) {
        toast({ title: "Üretim Hatası", description: result.error, variant: "destructive" });
        setStep('setup');
      } else {
        const mapped = mapAIToReviewed(result as AIGeneratedQuestions);
        if (mapped.length === 0) {
          toast({ 
            title: "Soru Üretilemedi", 
            description: "Yapay zekâ verilen metinden soru çıkaramadı. Metni biraz detaylandırıp tekrar deneyin.", 
            variant: "destructive" 
          });
          setStep('setup');
        } else {
          setGeneratedQuestions(mapped);
          setStep('review');
          toast({
            title: "Sorular Hazırlandı! 🎉",
            description: `${mapped.length} adet soru başarıyla üretildi. Şimdi inceleyebilir veya düzenleyebilirsiniz.`,
          });
        }
      }
    } catch (err: any) {
      console.error("AI Generation failed:", err);
      toast({ title: "Hata", description: err.message || "Soru üretimi sırasında bir hata oluştu.", variant: "destructive" });
      setStep('setup');
    }
  };

  // ══ İNCELEMEDEKİ SORUYU GÜNCELLE / SİL ══
  const updateQuestion = (tempId: number, updatedField: Partial<ReviewedQuestion>) => {
    setGeneratedQuestions(prev => prev.map(q => q.tempId === tempId ? { ...q, ...updatedField } : q));
  };

  const deleteQuestion = (tempId: number) => {
    setGeneratedQuestions(prev => prev.filter(q => q.tempId !== tempId));
  };

  // ══ TÜM SORULARI VERİTABANINA KAYDET ══
  const handleSaveToLibrary = async () => {
    if (!context || generatedQuestions.length === 0) return;
    setIsSavingQuestions(true);
    try {
      const questionsToSave = generatedQuestions.map(({ tempId, ...rest }) => rest);
      const result = await onSave({ questions: questionsToSave }, {
        classId: context.selection.classId,
        className: context.selectionNames.className,
        courseId: context.selection.courseId,
        unitId: context.selection.unitId,
        topicId: context.selection.topicId,
        topicName: context.selectionNames.topicName
      });
      
      if (result.success) {
        toast({ title: 'Tebrikler! 🎉', description: `${result.count || questionsToSave.length} soru başarıyla soru bankasına eklendi.` });
        onQuestionsGenerated();
        handleClose();
      } else {
        toast({ title: 'Hata', description: result.error || 'Sorular kaydedilirken bir hata oluştu.', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Hata', description: err.message || 'Kayıt sırasında bir hata oluştu.', variant: 'destructive' });
    } finally {
      setIsSavingQuestions(false);
    }
  };

  const wordCount = useMemo(() => {
    return localSourceText.trim().split(/\s+/).filter(Boolean).length;
  }, [localSourceText]);

  const estimatedTotalQuestions = selectedTypes.length * countPerType;

  const filteredReviewedQuestions = useMemo(() => {
    if (reviewFilter === 'all') return generatedQuestions;
    return generatedQuestions.filter(q => q.type === reviewFilter);
  }, [generatedQuestions, reviewFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in-0 duration-200">
      <div 
        className="relative w-full max-w-4xl max-h-[94vh] flex flex-col bg-slate-950 border border-white/15 text-slate-100 shadow-2xl rounded-3xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ══ 1. ÜST BAŞLIK & AYARLAR ÇUBUĞU ══ */}
        <div className="p-3.5 sm:p-4 px-4 sm:px-6 border-b border-white/10 bg-slate-900/90 backdrop-blur-md flex flex-row items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl border border-purple-500/30 text-purple-400 shadow-md flex-shrink-0">
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-300 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base md:text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                ✨ Yapay Zekâ Soru Stüdyosu
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate max-w-[240px] sm:max-w-md">
                {context?.selectionNames?.topicName 
                  ? `${context.selectionNames.className || ''} > ${context.selectionNames.courseName || ''} > ${context.selectionNames.unitName || ''} > ${context.selectionNames.topicName}`
                  : 'Soru Bankası için akıllı soru üretim sihirbazı.'}
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

        {/* ══ 3. DOĞRUDAN KAYITLI KAYNAK KONU METNİ ÇUBUĞU ══ */}
        <div className="bg-slate-900/60 border-b border-white/10 p-3 sm:px-6 flex flex-col gap-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1 bg-indigo-500/20 rounded-lg text-indigo-300 border border-indigo-500/30">
                <FileText className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-bold text-slate-200">Kayıtlı Kaynak Konu Metni</span>

              {isFetchingRemoteText || context?.isLoadingSourceText ? (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-amber-300 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  <Loader2 className="w-3 h-3 animate-spin" /> Veritabanından Getiriliyor...
                </span>
              ) : (
                <span className="text-[10px] font-bold text-indigo-300 bg-indigo-950/70 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                  {localSourceText.length.toLocaleString('tr-TR')} karakter • {wordCount.toLocaleString('tr-TR')} kelime
                </span>
              )}
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

          {/* Genişletilmiş Kaynak Metin Alanı */}
          {isSourceTextOpen && (
            <div className="mt-1 animate-in fade-in-50 duration-200">
              <Textarea 
                value={localSourceText}
                onChange={(e) => setLocalSourceText(e.target.value)}
                placeholder="Bu konu için sistemde kayıtlı kaynak ders metni burada yer alır. Gerekirse metne ekleme yapabilir veya düzenleyebilirsiniz..."
                className="min-h-[110px] max-h-[220px] bg-slate-950 border-white/15 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 font-sans leading-relaxed"
              />
            </div>
          )}
        </div>

        {/* ══ 4. ANA İÇERİK ALANI (SETUP / GENERATING / REVIEW) ══ */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {step === 'setup' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              {/* HIZLI HAZIR SINAV PAKETLERİ (PRESETS) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-orange-400" /> Hızlı Hazır Paketler
                  </Label>
                  <span className="text-[10px] text-slate-500">Tek tıkla hazır konfigürasyon</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => applyPreset('balanced')}
                    className="p-2.5 rounded-2xl border border-indigo-500/30 bg-indigo-950/30 hover:bg-indigo-900/40 text-left transition-all group"
                  >
                    <div className="text-xs font-black text-indigo-300 flex items-center gap-1 group-hover:text-indigo-200">
                      🎯 Tam Sınav
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">MCQ + D/Y + Boşluk</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset('mcqOnly')}
                    className="p-2.5 rounded-2xl border border-blue-500/30 bg-blue-950/30 hover:bg-blue-900/40 text-left transition-all group"
                  >
                    <div className="text-xs font-black text-blue-300 flex items-center gap-1 group-hover:text-blue-200">
                      📝 Test Odaklı
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">5 Nitelikli Çoktan Seçmeli</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset('quickScan')}
                    className="p-2.5 rounded-2xl border border-teal-500/30 bg-teal-950/30 hover:bg-teal-900/40 text-left transition-all group"
                  >
                    <div className="text-xs font-black text-teal-300 flex items-center gap-1 group-hover:text-teal-200">
                      ⚡ Hızlı Tarama
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">D/Y + Boşluk Doldurma</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset('lgs')}
                    className="p-2.5 rounded-2xl border border-amber-500/30 bg-amber-950/30 hover:bg-amber-900/40 text-left transition-all group"
                  >
                    <div className="text-xs font-black text-amber-300 flex items-center gap-1 group-hover:text-amber-200">
                      🏆 LGS Formatı
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Yeni Nesil Beceri Temelli</div>
                  </button>
                </div>
              </div>

              {/* 1. SORU TİPLERİ */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  1. Üretilecek Soru Tipleri
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {QUESTION_TYPE_OPTIONS.map(type => {
                    const isSelected = selectedTypes.includes(type.id);
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => toggleType(type.id)}
                        className={cn(
                          "p-3 rounded-2xl border text-left transition-all flex items-start gap-3",
                          isSelected
                            ? "bg-slate-900 border-indigo-500 shadow-md ring-1 ring-indigo-500/30"
                            : "bg-slate-950/60 border-white/5 opacity-60 hover:opacity-100 hover:border-white/20"
                        )}
                      >
                        <div className={cn("p-2 rounded-xl border flex-shrink-0 bg-gradient-to-br", type.color)}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white flex items-center justify-between">
                            {type.label}
                            {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">{type.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. ZORLUK SEVİYELERİ VE SORU SAYISI */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* ZORLUK */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    2. Zorluk Seviyeleri
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Kolay', 'Orta', 'Zor'] as const).map(lvl => {
                      const isSelected = selectedDifficulties.includes(lvl);
                      const colors = {
                        'Kolay': isSelected ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-slate-950 border-white/5 text-slate-400',
                        'Orta': isSelected ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-slate-950 border-white/5 text-slate-400',
                        'Zor': isSelected ? 'bg-rose-500/20 border-rose-500 text-rose-300' : 'bg-slate-950 border-white/5 text-slate-400',
                      };
                      return (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => toggleDifficulty(lvl)}
                          className={cn(
                            "py-2.5 px-3 rounded-xl border text-center text-xs font-bold transition-all",
                            colors[lvl]
                          )}
                        >
                          {lvl}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* SAYI SEÇİCİ */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      3. Tip Başına Soru Sayısı
                    </Label>
                    <span className="text-xs font-extrabold text-indigo-400">
                      Toplam ~{estimatedTotalQuestions} Soru
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {[2, 3, 5, 10].map(cnt => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setCountPerType(cnt)}
                        className={cn(
                          "flex-1 py-2 rounded-xl border text-xs font-bold transition-all",
                          countPerType === cnt
                            ? "bg-indigo-600 border-indigo-500 text-white shadow-md"
                            : "bg-slate-950 border-white/10 text-slate-400 hover:text-white"
                        )}
                      >
                        {cnt}
                      </button>
                    ))}
                    <div className="w-20">
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        value={countPerType}
                        onChange={(e) => setCountPerType(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                        className="h-9 bg-slate-950 border-white/10 text-center text-xs font-bold text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. ÖZEL ÖĞRETMEN TALİMATI / ODAK ALANI */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-purple-400" /> 4. Özel AI İstemi / Odak Alanı (İsteğe Bağlı)
                </Label>
                <Textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Örn: 2026 LGS tarzı metin yorumlama sorularına ağırlık ver, günlük hayatta yardımlaşma örnekleri kullan..."
                  className="min-h-[70px] bg-slate-950 border-white/15 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* ══ GENERATING EKRANI ══ */}
          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center min-h-[380px] gap-4 text-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 animate-spin blur-md opacity-70"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-yellow-300 animate-pulse" />
                </div>
              </div>
              <div className="space-y-1 max-w-sm">
                <h4 className="text-base font-black text-white">Yapay Zekâ Soruları Hazırlıyor...</h4>
                <p className="text-xs text-slate-400">
                  {context?.selectionNames?.topicName 
                    ? `"${context.selectionNames.topicName}" konusu analiz ediliyor ve kazanımlara uygun sorular kurgulanıyor.`
                    : 'Kaynak metin inceleniyor ve sorular üretiliyor.'}
                </p>
              </div>
              <Badge variant="outline" className="text-[11px] font-mono text-indigo-300 border-indigo-500/30 bg-indigo-950/40">
                Model: {activeModelId}
              </Badge>
            </div>
          )}

          {/* ══ REVIEW EKRANI ══ */}
          {step === 'review' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-white">
                    🎉 {generatedQuestions.length} Soru Üretildi
                  </h4>
                  <span className="text-xs text-slate-400">
                    (Kaydetmeden önce soruları doğrudan düzenleyebilirsiniz)
                  </span>
                </div>

                {/* Filtre Butonları */}
                <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-white/10">
                  {(['all', 'Çoktan Seçmeli', 'Doğru/Yanlış', 'Boşluk Doldurma'] as const).map(filterKey => (
                    <button
                      key={filterKey}
                      type="button"
                      onClick={() => setReviewFilter(filterKey)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all",
                        reviewFilter === filterKey
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-white"
                      )}
                    >
                      {filterKey === 'all' ? 'Tümü' : filterKey}
                    </button>
                  ))}
                </div>
              </div>

              {/* Soru Kartları */}
              <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                {filteredReviewedQuestions.map((q, idx) => (
                  <Card key={q.tempId} className="p-4 bg-slate-900/70 border border-white/10 rounded-2xl space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-bold bg-white/5 border-white/10 text-slate-300">
                          {q.type}
                        </Badge>
                        <Badge className={cn(
                          "text-[10px] font-bold border",
                          q.difficulty === 'Kolay' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                          q.difficulty === 'Orta' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                          'bg-rose-500/20 text-rose-400 border-rose-500/30'
                        )}>
                          {q.difficulty}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Select
                          value={q.difficulty}
                          onValueChange={(val) => updateQuestion(q.tempId, { difficulty: val as Question['difficulty'] })}
                        >
                          <SelectTrigger className="h-7 w-24 text-[11px] bg-slate-950 border-white/10 text-slate-300">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-white/10 text-white">
                            <SelectItem value="Kolay">Kolay</SelectItem>
                            <SelectItem value="Orta">Orta</SelectItem>
                            <SelectItem value="Zor">Zor</SelectItem>
                          </SelectContent>
                        </Select>

                        <button
                          type="button"
                          onClick={() => deleteQuestion(q.tempId)}
                          className="p-1 text-slate-400 hover:text-rose-400 transition-colors rounded-lg hover:bg-rose-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Soru Metni */}
                    <Textarea 
                      value={q.text}
                      onChange={(e) => updateQuestion(q.tempId, { text: e.target.value })}
                      className="bg-slate-950 border-white/10 rounded-xl text-xs font-medium text-white focus:border-indigo-500"
                      rows={2}
                    />

                    {/* Seçenekler / Şıklar (Çoktan Seçmeli veya Boşluk Doldurma) */}
                    {(q.type === 'Çoktan Seçmeli' || q.type === 'Boşluk Doldurma') && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Seçenekler (Doğru cevabı yuvarlağa tıklayarak seçin):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(q.options || []).map((opt: string, optIdx: number) => {
                            const isCorrect = q.correctAnswer === opt;
                            return (
                              <div 
                                key={optIdx} 
                                className={cn(
                                  "flex items-center gap-2 p-1.5 px-2.5 rounded-xl border transition-all",
                                  isCorrect 
                                    ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300" 
                                    : "bg-slate-950 border-white/5 text-slate-300"
                                )}
                              >
                                <input
                                  type="radio"
                                  name={`correct-${q.tempId}`}
                                  checked={isCorrect}
                                  onChange={() => updateQuestion(q.tempId, { correctAnswer: opt })}
                                  className="accent-emerald-500 cursor-pointer"
                                />
                                <Input 
                                  value={opt}
                                  onChange={(e) => {
                                    const newOpts = [...(q.options || [])];
                                    newOpts[optIdx] = e.target.value;
                                    const updateObj: Partial<ReviewedQuestion> = { options: newOpts };
                                    if (isCorrect) {
                                      updateObj.correctAnswer = e.target.value;
                                    }
                                    updateQuestion(q.tempId, updateObj);
                                  }}
                                  className="h-7 bg-transparent border-0 text-xs text-white p-0 focus-visible:ring-0"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Doğru / Yanlış Seçimi */}
                    {q.type === 'Doğru/Yanlış' && (
                      <div className="flex items-center gap-3 pt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Doğru Cevap:</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateQuestion(q.tempId, { correctAnswer: 'Doğru' })}
                            className={cn(
                              "px-3 py-1 rounded-lg text-xs font-bold border transition-all",
                              q.correctAnswer === 'Doğru'
                                ? "bg-emerald-600 border-emerald-500 text-white"
                                : "bg-slate-950 border-white/10 text-slate-400 hover:text-white"
                            )}
                          >
                            ✓ Doğru
                          </button>
                          <button
                            type="button"
                            onClick={() => updateQuestion(q.tempId, { correctAnswer: 'Yanlış' })}
                            className={cn(
                              "px-3 py-1 rounded-lg text-xs font-bold border transition-all",
                              q.correctAnswer === 'Yanlış'
                                ? "bg-rose-600 border-rose-500 text-white"
                                : "bg-slate-950 border-white/10 text-slate-400 hover:text-white"
                            )}
                          >
                            ✗ Yanlış
                          </button>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ══ 5. ALT AKSİYON BARI (FOOTER) ══ */}
        <div className="p-3.5 sm:p-4 px-4 sm:px-6 border-t border-white/10 bg-slate-900/90 backdrop-blur-md flex items-center justify-between flex-shrink-0">
          {step === 'setup' && (
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                className="text-slate-400 hover:text-white text-xs font-bold rounded-xl"
              >
                Vazgeç
              </Button>
              <Button
                type="button"
                onClick={handleGenerate}
                disabled={localSourceText.trim().length < 3 || isFetchingRemoteText}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs h-10 px-6 rounded-xl shadow-lg shadow-purple-900/30 transition-all hover:scale-[1.02]"
              >
                <Sparkles className="w-4 h-4 mr-2 text-yellow-300 animate-pulse" />
                ✨ {estimatedTotalQuestions} Adet Soru Üret
              </Button>
            </>
          )}

          {step === 'review' && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('setup')}
                className="border-white/10 text-slate-300 hover:text-white bg-slate-900 text-xs font-bold rounded-xl"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Ayarlara Dön
              </Button>

              <Button
                type="button"
                onClick={handleSaveToLibrary}
                disabled={isSavingQuestions || generatedQuestions.length === 0}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-10 px-6 rounded-xl shadow-lg shadow-emerald-900/30 transition-all hover:scale-[1.02]"
              >
                {isSavingQuestions ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Kaydediliyor...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Soru Bankasına Kaydet ({generatedQuestions.length} Soru)</>
                )}
              </Button>
            </>
          )}

          {step === 'generating' && (
            <div className="w-full flex justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep('setup')}
                className="text-slate-400 hover:text-white text-xs font-bold rounded-xl"
              >
                İptal Et
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
