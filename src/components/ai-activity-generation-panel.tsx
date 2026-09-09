"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  Sparkles, Settings2, Key, Eye, EyeOff, Save, Check, 
  ChevronUp, ChevronDown, FileText, Loader2, X, Trash2, 
  ArrowLeft, BookOpen, CheckCircle2, Database, 
  Wand2, Plus, RefreshCw, List
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateActivityData, type AiActivityDataOutput } from '@/ai/flows/generate-activity-data-flow';
import { saveGeneratedActivityItems } from '@/app/teacher/activity-data/actions';
import { saveSystemAiConfigAction } from '@/ai/ai-config-service';
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
    desc: 'Pedagojik içerik ve kaliteli veri üretimi için dengeli model.',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40'
  },
  {
    id: 'gemini-3.5-flash-lite',
    name: 'Gemini 3.5 Flash-Lite',
    tag: '⚡ Ultra Düşük Gecikme',
    desc: 'Hızlı etkinlik verisi üretimi için optimize edilmiş hafif model.',
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
    desc: 'Akademik ve derinlikli kavram-tanım eşleştirmeleri için.',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  }
];

const ACTIVITY_TYPE_OPTIONS = [
  { 
    id: 'concepts', 
    label: 'Anahtar Kavramlar', 
    desc: 'Çark, kelime bulmaca ve hafıza oyunlarında kullanılan temel terimler.',
    icon: Database,
    color: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-400'
  },
  { 
    id: 'definitions', 
    label: 'Kavram-Tanım Eşleştirmeleri', 
    desc: '"Ben Kimim?" ve eşleştirme oyunları için kavram ve tanım çiftleri.',
    icon: FileText,
    color: 'from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400'
  },
  { 
    id: 'sentences', 
    label: 'Özet Cümleleri (Maks 6 Kelime)', 
    desc: 'Anagram ve cümle kurma oyunlarında kullanılan kısa, öz kazanım cümleleri.',
    icon: CheckCircle2,
    color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400'
  },
] as const;

type AiActivityGenerationPanelProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  context: {
    courseId: string;
    unitId: string;
    topicId: string;
    topicTitle: string;
    sourceText?: string;
    isLoadingSourceText?: boolean;
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
  const [isSaving, setIsSaving] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'concepts' | 'definitions' | 'sentences'>('all');
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

  // ══ VERİ ÜRETİM KONFİGÜRASYONU ══
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['concepts', 'definitions', 'sentences']);
  const [countPerType, setCountPerType] = useState<number>(0); // 0 = Sınırsız / Tümünü Bul
  const [customPrompt, setCustomPrompt] = useState<string>('');

  // ══ İNCELENEN / DÜZENLENEN ÇIKTI ══
  const [reviewedData, setReviewedData] = useState<AiActivityDataOutput>({
    concepts: [],
    conceptDefinitions: [],
    summarySentences: [],
  });

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
    if (context?.courseId && context?.unitId && context?.topicId && context.topicId !== 'all') {
      let isMounted = true;
      setIsFetchingRemoteText(true);
      const fetchTopic = async () => {
        try {
          const topicRef = doc(db, 'courses', context.courseId, 'units', context.unitId, 'topics', context.topicId);
          const snap = await getDoc(topicRef);
          if (isMounted && snap.exists()) {
            const data = snap.data();
            const text = data.sourceText || '';
            setLocalSourceText(text);
            setIsSourceTextOpen(text.length < 150);
          }
        } catch (err) {
          console.warn("Could not fetch topic source text in AI activity panel:", err);
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
      setReviewedData({ concepts: [], conceptDefinitions: [], summarySentences: [] });
      setShowSettings(false);
    }, 250);
  };

  // ══ HIZLI HAZIR PAKETLER (PRESETS) ══
  const applyPreset = (preset: 'all' | 'conceptsOnly' | 'definitionsOnly' | 'sentencesOnly') => {
    if (preset === 'all') {
      setSelectedTypes(['concepts', 'definitions', 'sentences']);
      setCountPerType(0);
      setCustomPrompt('Konudaki tüm temel kavramları, eşleştirmeleri ve özet cümleleri kapsayan eksiksiz ve zengin paket.');
    } else if (preset === 'conceptsOnly') {
      setSelectedTypes(['concepts']);
      setCountPerType(0);
      setCustomPrompt('Kelime çarkı ve hafıza oyunu için konudaki tüm anahtar kavramlar ve terimler.');
    } else if (preset === 'definitionsOnly') {
      setSelectedTypes(['definitions']);
      setCountPerType(0);
      setCustomPrompt('"Ben Kimim?" oyunu için konudaki tüm kavram-tanım çiftleri ve net ipuçları.');
    } else if (preset === 'sentencesOnly') {
      setSelectedTypes(['sentences']);
      setCountPerType(0);
      setCustomPrompt('Anagram ve cümle sıralama oyunları için en fazla 6 kelimelik tüm vurucu özet cümleler.');
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
        title: "Kayıt Hatası",
        description: error.message || "API anahtarı kaydedilemedi.",
        variant: "destructive",
      });
    } finally {
      setIsSavingSystemKey(false);
    }
  };

  // ══ AI İLE VERİ ÜRETİMİNİ TETİKLEME ══
  const handleGenerate = async () => {
    if (!context) {
      toast({ title: "Hata", description: "Lütfen önce bir konu seçin.", variant: "destructive" });
      return;
    }
    if (selectedTypes.length === 0) {
      toast({ title: "Uyarı", description: "Lütfen en az bir içerik türü seçin.", variant: "destructive" });
      return;
    }

    setStep('generating');

    try {
      const trimmedKey = apiKey.trim();
      const trimmedModel = activeModelId;

      if (typeof window !== 'undefined') {
        if (trimmedKey) localStorage.setItem('custom_gemini_api_key', trimmedKey);
        localStorage.setItem('custom_gemini_model', trimmedModel);
      }

      const input = {
        topicTitle: context.topicTitle,
        contextText: localSourceText.trim() || undefined,
        generateConcepts: selectedTypes.includes('concepts'),
        generateDefinitions: selectedTypes.includes('definitions'),
        generateSentences: selectedTypes.includes('sentences'),
        countPerType,
        customPrompt: customPrompt.trim() || undefined,
        apiKey: trimmedKey || undefined,
        modelName: trimmedModel || undefined,
      };

      const result = await generateActivityData(input);

      const totalFound = (result.concepts?.length || 0) + 
                         (result.conceptDefinitions?.length || 0) + 
                         (result.summarySentences?.length || 0);

      if (totalFound === 0) {
        toast({
          title: "İçerik Üretilemedi",
          description: "Yapay zeka bu kriterlere uygun veri üretemedi. Lütfen kaynak metni genişleterek tekrar deneyin.",
          variant: "destructive",
        });
        setStep('setup');
        return;
      }

      setReviewedData({
        concepts: result.concepts || [],
        conceptDefinitions: result.conceptDefinitions || [],
        summarySentences: result.summarySentences || [],
      });

      setStep('review');
      toast({
        title: "Veriler Hazır! 🎉",
        description: `${totalFound} adet etkinlik verisi üretildi. İnceleyip düzenleyebilir ve kaydedebilirsiniz.`,
      });
    } catch (err: any) {
      console.error("Activity generation error:", err);
      toast({
        title: "Üretim Başarısız",
        description: err.message || "Yapay zeka ile veri üretilirken bir hata oluştu.",
        variant: "destructive",
      });
      setStep('setup');
    }
  };

  // ══ DÜZENLEME FONKSİYONLARI ══
  const handleConceptChange = (index: number, value: string) => {
    setReviewedData(prev => {
      const next = [...(prev.concepts || [])];
      next[index] = value;
      return { ...prev, concepts: next };
    });
  };

  const handleDeleteConcept = (index: number) => {
    setReviewedData(prev => ({
      ...prev,
      concepts: (prev.concepts || []).filter((_, i) => i !== index),
    }));
  };

  const handleAddConcept = () => {
    setReviewedData(prev => ({
      ...prev,
      concepts: [...(prev.concepts || []), 'Yeni Kavram'],
    }));
  };

  const handleDefinitionChange = (index: number, field: 'concept' | 'definition', value: string) => {
    setReviewedData(prev => {
      const next = [...(prev.conceptDefinitions || [])];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, conceptDefinitions: next };
    });
  };

  const handleDeleteDefinition = (index: number) => {
    setReviewedData(prev => ({
      ...prev,
      conceptDefinitions: (prev.conceptDefinitions || []).filter((_, i) => i !== index),
    }));
  };

  const handleAddDefinition = () => {
    setReviewedData(prev => ({
      ...prev,
      conceptDefinitions: [...(prev.conceptDefinitions || []), { concept: 'Kavram', definition: 'Tanım metni...' }],
    }));
  };

  const handleSentenceChange = (index: number, value: string) => {
    setReviewedData(prev => {
      const next = [...(prev.summarySentences || [])];
      next[index] = value;
      return { ...prev, summarySentences: next };
    });
  };

  const handleDeleteSentence = (index: number) => {
    setReviewedData(prev => ({
      ...prev,
      summarySentences: (prev.summarySentences || []).filter((_, i) => i !== index),
    }));
  };

  const handleAddSentence = () => {
    setReviewedData(prev => ({
      ...prev,
      summarySentences: [...(prev.summarySentences || []), 'Kısa ve öz bir özet cümlesi.'],
    }));
  };

  // ══ VERİTABANINA AKTARMA VE KAYDETME ══
  const handleSaveToDatabase = async () => {
    if (!context) return;
    setIsSaving(true);
    try {
      const result = await saveGeneratedActivityItems({
        courseId: context.courseId,
        unitId: context.unitId,
        topicId: context.topicId,
        content: reviewedData,
      });

      if (result.success) {
        toast({
          title: "Başarıyla Kaydedildi! 🎉",
          description: `${result.count || 0} adet etkinlik verisi veritabanına eklendi.`,
        });
        onDataGenerated();
        handleClose();
      } else {
        toast({
          title: "Kayıt Başarısız",
          description: result.error || "Veriler kaydedilirken bir hata oluştu.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Hata",
        description: err.message || "Kayıt işlemi sırasında hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ══ HESAPLANAN DEĞERLER (HOOKS) ══
  const wordCount = useMemo(() => {
    return localSourceText.trim().split(/\s+/).filter(Boolean).length;
  }, [localSourceText]);

  const totalReviewedCount = (reviewedData.concepts?.length || 0) + 
                             (reviewedData.conceptDefinitions?.length || 0) + 
                             (reviewedData.summarySentences?.length || 0);

  const estimatedTotal = countPerType === 0 ? 'Tüm İçerikler' : selectedTypes.length * countPerType;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[96vw] max-h-[94vh] flex flex-col gap-0 bg-slate-950 border-white/15 text-slate-100 shadow-2xl rounded-3xl overflow-hidden p-0 z-[70] [&>button:last-child]:hidden">
        <DialogTitle className="sr-only">Yapay Zekâ Etkinlik Veri Stüdyosu</DialogTitle>
        <DialogDescription className="sr-only">
          {context?.topicTitle ? `"${context.topicTitle}" konusu için akıllı oyun ve etkinlik verileri üretin.` : 'Konu için akıllı etkinlik verileri üretin.'}
        </DialogDescription>
        {/* ══ 1. ÜST BAŞLIK & AYARLAR ÇUBUĞU ══ */}
        <div className="p-3.5 sm:p-4 px-4 sm:px-6 border-b border-white/10 bg-slate-900/90 backdrop-blur-md flex flex-row items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl border border-purple-500/30 text-purple-400 shadow-md flex-shrink-0">
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-300 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base md:text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                ✨ Yapay Zekâ Etkinlik Veri Stüdyosu
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate max-w-[220px] sm:max-w-md">
                {context?.topicTitle ? `"${context.topicTitle}" konusu için akıllı oyun ve etkinlik verileri üretin.` : 'Konu için akıllı etkinlik verileri üretin.'}
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
              <span className="text-[11px] text-slate-400">Anahtar tarayıcınızda ve sistemde güvenle saklanır</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* API Key Girişi */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300 flex items-center justify-between">
                  <span>API Anahtarı (Google AI Studio)</span>
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] text-indigo-400 hover:underline"
                  >
                    Ücretsiz Anahtar Al ↗
                  </a>
                </Label>
                <div className="relative">
                  <Input
                    type={showApiKeyText ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="bg-slate-950 border-white/10 text-xs pr-10 text-white placeholder:text-slate-600 h-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKeyText(!showApiKeyText)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                  >
                    {showApiKeyText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Model Seçimi */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-slate-300">Aktif Model</Label>
                  <button
                    type="button"
                    onClick={() => setIsCustomModel(!isCustomModel)}
                    className="text-[10px] text-indigo-400 hover:underline"
                  >
                    {isCustomModel ? "Listeden Seç" : "Özel Model Yaz"}
                  </button>
                </div>

                {isCustomModel ? (
                  <Input
                    value={customModelInput}
                    onChange={(e) => setCustomModelInput(e.target.value)}
                    placeholder="Örn: gemini-2.5-pro, gemini-1.5-pro"
                    className="bg-slate-950 border-white/10 text-xs text-white placeholder:text-slate-600 h-9"
                  />
                ) : (
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg text-xs text-white px-2.5 h-9 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {FREE_GEMINI_MODELS.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} — {m.tag}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Model Açıklama Kartları */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {FREE_GEMINI_MODELS.slice(0, 3).map(m => (
                <div 
                  key={m.id} 
                  onClick={() => { setSelectedModel(m.id); setIsCustomModel(false); }}
                  className={cn(
                    "p-2 rounded-xl border text-left cursor-pointer transition-all",
                    selectedModel === m.id && !isCustomModel
                      ? "bg-indigo-950/50 border-indigo-500/80 shadow-md ring-1 ring-indigo-500/50" 
                      : "bg-slate-950/60 border-white/5 hover:border-white/15"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-white">{m.name}</span>
                    <Badge variant="outline" className={cn("text-[9px] px-1 py-0", m.badge)}>{m.tag}</Badge>
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{m.desc}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleSaveApiKeyToSystem}
                disabled={isSavingSystemKey || !apiKey.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold border-none h-8 px-3 rounded-xl shadow-md"
              >
                {isSavingSystemKey ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Kaydediliyor...</>
                ) : isKeySaved ? (
                  <><Check className="w-3.5 h-3.5 mr-1.5 text-emerald-300" /> Kaydedildi!</>
                ) : (
                  <><Save className="w-3.5 h-3.5 mr-1.5" /> Ayarları Sisteme Kaydet</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ══ 3. GÖVDE ALANI (SCROLL) ══ */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* ════ ADIM 1: KURULUM & KONFİGÜRASYON ════ */}
          {step === 'setup' && (
            <div className="space-y-6">
              {/* CANLI KAYNAK METİN ALANI */}
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 overflow-hidden shadow-lg">
                <div 
                  className="p-3.5 px-4 bg-slate-900/90 border-b border-white/5 flex items-center justify-between cursor-pointer select-none"
                  onClick={() => setIsSourceTextOpen(!isSourceTextOpen)}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-white">
                          Kayıtlı Kaynak Konu Metni
                        </span>
                        {isFetchingRemoteText ? (
                          <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] animate-pulse">
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Yükleniyor...
                          </Badge>
                        ) : localSourceText.trim().length > 0 ? (
                          <Badge variant="outline" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                            {wordCount} Kelime • {localSourceText.length} Karakter
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
                            Müfredat Bilgisiyle Üretilecek
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {context?.topicTitle 
                          ? (localSourceText.trim().length > 0 
                              ? `"${context.topicTitle}" konusu için veritabanında kayıtlı metin.` 
                              : `"${context.topicTitle}" için kayıtlı metin yok; MEB müfredat kazanımları esas alınarak üretilecek. Dilerseniz aşağıya özel metin de yapıştırabilirsiniz.`)
                          : 'Yapay zekanın veri türeteceği temel kaynak.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-xs text-slate-300 hover:text-white"
                      onClick={(e) => { e.stopPropagation(); setIsSourceTextOpen(!isSourceTextOpen); }}
                    >
                      {isSourceTextOpen ? (
                        <><ChevronUp className="w-3.5 h-3.5 mr-1" /> Daralt</>
                      ) : (
                        <><ChevronDown className="w-3.5 h-3.5 mr-1" /> Göster / Düzenle</>
                      )}
                    </Button>
                  </div>
                </div>

                {isSourceTextOpen && (
                  <div className="p-4 bg-slate-950/60 space-y-2 border-t border-white/5 animate-in slide-in-from-top-1 duration-150">
                    <Textarea
                      value={localSourceText}
                      onChange={(e) => setLocalSourceText(e.target.value)}
                      placeholder="Konuya ait kaynak metin buraya yüklenecektir. Dilerseniz buradaki metni düzenleyebilir veya yeni eklemeler yapabilirsiniz..."
                      className="min-h-[140px] max-h-[260px] bg-slate-900/80 border-white/10 text-xs text-slate-200 placeholder:text-slate-600 leading-relaxed focus:border-indigo-500"
                    />
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Bu metin oyunlarda kullanılacak kavram, tanım ve cümlelerin doğruluğunu garanti eder.</span>
                      <span>{localSourceText.length} karakter</span>
                    </div>
                  </div>
                )}
              </div>

              {/* HIZLI HAZIR PAKETLER (PRESETS) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Wand2 className="w-3.5 h-3.5 text-purple-400" /> Hızlı Hazır Paketler
                  </Label>
                  <span className="text-[11px] text-slate-500">Tek tıkla en popüler kombinasyonları uygular</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => applyPreset('all')}
                    className="p-3 rounded-2xl border border-white/10 bg-slate-900/60 hover:bg-indigo-950/40 hover:border-indigo-500/50 text-left transition-all group"
                  >
                    <div className="text-base mb-1">🎯</div>
                    <div className="text-xs font-bold text-white group-hover:text-indigo-300">Tam Etkinlik Paketi</div>
                    <div className="text-[10px] text-slate-400 line-clamp-2">Kavramlar, tanımlar ve özet cümleler</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset('conceptsOnly')}
                    className="p-3 rounded-2xl border border-white/10 bg-slate-900/60 hover:bg-blue-950/40 hover:border-blue-500/50 text-left transition-all group"
                  >
                    <div className="text-base mb-1">🔑</div>
                    <div className="text-xs font-bold text-white group-hover:text-blue-300">Kavram & Terim</div>
                    <div className="text-[10px] text-slate-400 line-clamp-2">Kelime çarkı ve bulmaca için terimler</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset('definitionsOnly')}
                    className="p-3 rounded-2xl border border-white/10 bg-slate-900/60 hover:bg-purple-950/40 hover:border-purple-500/50 text-left transition-all group"
                  >
                    <div className="text-base mb-1">📖</div>
                    <div className="text-xs font-bold text-white group-hover:text-purple-300">Kavram-Tanım Eşleştirme</div>
                    <div className="text-[10px] text-slate-400 line-clamp-2">"Ben Kimim?" oyunu için ipuçları</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset('sentencesOnly')}
                    className="p-3 rounded-2xl border border-white/10 bg-slate-900/60 hover:bg-emerald-950/40 hover:border-emerald-500/50 text-left transition-all group"
                  >
                    <div className="text-base mb-1">⚡</div>
                    <div className="text-xs font-bold text-white group-hover:text-emerald-300">Özet Cümleleri</div>
                    <div className="text-[10px] text-slate-400 line-clamp-2">Anagram ve cümle kurma (maks 6 kelime)</div>
                  </button>
                </div>
              </div>

              {/* ÜRETİLECEK İÇERİK TÜRLERİ SEÇİMİ */}
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-wider text-slate-300">
                  Üretilecek İçerik Türleri
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {ACTIVITY_TYPE_OPTIONS.map((type) => {
                    const isSelected = selectedTypes.includes(type.id);
                    const Icon = type.icon;
                    return (
                      <div
                        key={type.id}
                        onClick={() => {
                          setSelectedTypes(prev =>
                            isSelected ? prev.filter(t => t !== type.id) : [...prev, type.id]
                          );
                        }}
                        className={cn(
                          "p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between",
                          isSelected
                            ? `bg-gradient-to-br ${type.color} ring-1 ring-white/20 shadow-lg`
                            : "bg-slate-900/40 border-white/5 hover:border-white/15 opacity-70 hover:opacity-100"
                        )}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="p-2 rounded-xl bg-slate-950/60 border border-white/10">
                            <Icon className="w-4 h-4" />
                          </div>
                          <Checkbox checked={isSelected} className="border-white/30" />
                        </div>
                        <div>
                          <div className="text-xs font-black text-white mb-0.5">{type.label}</div>
                          <div className="text-[11px] text-slate-400 leading-tight">{type.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* MİKTAR VE ÖZEL YÖNERGE AYARLARI */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-900/60 border border-white/10">
                {/* Miktar Seçimi */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>Üretim Kapsamı / Hedef Sayı</span>
                    {countPerType === 0 && (
                      <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                        Sınırsız Mod
                      </span>
                    )}
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCountPerType(0)}
                      className={cn(
                        "h-8 rounded-lg text-xs font-bold border transition-all col-span-2 flex items-center justify-center gap-1.5",
                        countPerType === 0
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 border-indigo-400 text-white shadow-md shadow-indigo-950/50"
                          : "bg-slate-950 border-white/10 text-slate-300 hover:text-white hover:border-indigo-500/30"
                      )}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                      <span>🌟 Tümünü Bul (Sınırsız)</span>
                    </button>
                    {[10, 20].map(count => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setCountPerType(count)}
                        className={cn(
                          "h-8 rounded-lg text-xs font-bold border transition-all",
                          countPerType === count
                            ? "bg-indigo-600 border-indigo-500 text-white shadow-sm"
                            : "bg-slate-950 border-white/10 text-slate-400 hover:text-white"
                        )}
                      >
                        {count} Adet
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {countPerType === 0 ? (
                      <span className="text-emerald-300 font-semibold">
                        ✓ Sayı sınırı yok: Konudaki tüm kavramlar, tanımlar ve özet cümleler eksiksiz taranıp çıkarılır.
                      </span>
                    ) : (
                      <span>
                        Seçilen {selectedTypes.length} türe göre yaklaşık <span className="text-indigo-400 font-bold">{estimatedTotal} öğe</span> üretilecek.
                      </span>
                    )}
                  </p>
                </div>

                {/* Öğretmen Özel Yönergesi */}
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>Öğretmen Özel Yönergesi (İsteğe Bağlı)</span>
                    <span className="text-[10px] text-slate-500">Prompt Direktifi</span>
                  </Label>
                  <Input
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Örn: 5. sınıf seviyesine uygun, günlük hayat senaryolu ve sade terimler seç..."
                    className="bg-slate-950 border-white/10 text-xs text-white placeholder:text-slate-600 h-9"
                  />
                  <p className="text-[10px] text-slate-500">
                    Modelin çıktı stilini, zorluğunu veya odaklanmasını istediğiniz kavramları belirtebilirsiniz.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ════ ADIM 2: ÜRETİM EKRANI (GENERATING) ════ */}
          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-25 animate-pulse rounded-full" />
                <div className="p-4 rounded-3xl bg-slate-900 border border-white/15 relative z-10 shadow-2xl">
                  <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">Yapay Zekâ Etkinlik Verilerini Hazırlıyor...</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {activeModelId} modeli kaynak metni analiz ediyor, pedagojik kavram, tanım ve cümleleri çıkarıyor.
                </p>
              </div>
            </div>
          )}

          {/* ════ ADIM 3: İNCELEME & DÜZENLEME (REVIEW) ════ */}
          {step === 'review' && (
            <div className="space-y-4">
              {/* Filtre / Sekme Butonları */}
              <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-white/10">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setReviewFilter('all')}
                    className={cn(
                      "px-3 py-1 rounded-xl text-xs font-bold border transition-all",
                      reviewFilter === 'all'
                        ? "bg-white/15 border-white/30 text-white"
                        : "bg-slate-900/60 border-white/5 text-slate-400 hover:text-white"
                    )}
                  >
                    Tümü ({totalReviewedCount})
                  </button>

                  {reviewedData.concepts && reviewedData.concepts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setReviewFilter('concepts')}
                      className={cn(
                        "px-3 py-1 rounded-xl text-xs font-bold border transition-all",
                        reviewFilter === 'concepts'
                          ? "bg-blue-600/30 border-blue-500/50 text-blue-300"
                          : "bg-slate-900/60 border-white/5 text-slate-400 hover:text-white"
                      )}
                    >
                      🔑 Kavramlar ({reviewedData.concepts.length})
                    </button>
                  )}

                  {reviewedData.conceptDefinitions && reviewedData.conceptDefinitions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setReviewFilter('definitions')}
                      className={cn(
                        "px-3 py-1 rounded-xl text-xs font-bold border transition-all",
                        reviewFilter === 'definitions'
                          ? "bg-purple-600/30 border-purple-500/50 text-purple-300"
                          : "bg-slate-900/60 border-white/5 text-slate-400 hover:text-white"
                      )}
                    >
                      📖 Tanımlar ({reviewedData.conceptDefinitions.length})
                    </button>
                  )}

                  {reviewedData.summarySentences && reviewedData.summarySentences.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setReviewFilter('sentences')}
                      className={cn(
                        "px-3 py-1 rounded-xl text-xs font-bold border transition-all",
                        reviewFilter === 'sentences'
                          ? "bg-emerald-600/30 border-emerald-500/50 text-emerald-300"
                          : "bg-slate-900/60 border-white/5 text-slate-400 hover:text-white"
                      )}
                    >
                      ⚡ Cümleler ({reviewedData.summarySentences.length})
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">
                    Kaydetmeden önce metinleri doğrudan düzenleyebilirsiniz
                  </span>
                </div>
              </div>

              {/* 1. KAVRAMLAR LİSTESİ */}
              {(reviewFilter === 'all' || reviewFilter === 'concepts') && (reviewedData.concepts || []).length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5" /> Anahtar Kavramlar ({reviewedData.concepts?.length})
                    </h5>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={handleAddConcept}
                      className="h-6 text-[10px] text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Yeni Kavram
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(reviewedData.concepts || []).map((concept, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center gap-2 p-2 px-3 rounded-xl bg-slate-900/60 border border-white/5 hover:border-blue-500/30 group"
                      >
                        <span className="text-xs font-bold text-blue-400 w-5">#{idx + 1}</span>
                        <Input
                          value={concept}
                          onChange={(e) => handleConceptChange(idx, e.target.value)}
                          className="h-8 bg-slate-950 border-white/5 text-xs text-white focus-visible:ring-blue-500/50"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteConcept(idx)}
                          className="text-slate-500 hover:text-rose-400 p-1 rounded-lg opacity-40 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. KAVRAM-TANIM EŞLEŞTİRMELERİ */}
              {(reviewFilter === 'all' || reviewFilter === 'definitions') && (reviewedData.conceptDefinitions || []).length > 0 && (
                <div className="space-y-2.5 pt-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-black uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> Kavram - Tanım Eşleştirmeleri ({reviewedData.conceptDefinitions?.length})
                    </h5>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={handleAddDefinition}
                      className="h-6 text-[10px] text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Yeni Tanım
                    </Button>
                  </div>

                  <div className="space-y-2.5">
                    {(reviewedData.conceptDefinitions || []).map((item, idx) => (
                      <Card 
                        key={idx} 
                        className="p-3 bg-slate-900/60 border-white/5 hover:border-purple-500/30 space-y-2 group relative"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-xs font-bold text-purple-400">#{idx + 1} Kavram:</span>
                            <Input
                              value={item.concept}
                              onChange={(e) => handleDefinitionChange(idx, 'concept', e.target.value)}
                              placeholder="Kavram Adı"
                              className="h-8 max-w-xs bg-slate-950 border-white/10 text-xs font-bold text-purple-300 focus-visible:ring-purple-500/50"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteDefinition(idx)}
                            className="text-slate-500 hover:text-rose-400 p-1 rounded-lg opacity-40 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div>
                          <Textarea
                            value={item.definition}
                            onChange={(e) => handleDefinitionChange(idx, 'definition', e.target.value)}
                            placeholder="İpucu / Tanım metni (Kavramın adını içermemelidir)"
                            className="min-h-[54px] bg-slate-950 border-white/5 text-xs text-slate-200 focus-visible:ring-purple-500/50"
                          />
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. ÖZET CÜMLELERİ */}
              {(reviewFilter === 'all' || reviewFilter === 'sentences') && (reviewedData.summarySentences || []).length > 0 && (
                <div className="space-y-2.5 pt-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Özet Cümleleri ({reviewedData.summarySentences?.length})
                    </h5>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={handleAddSentence}
                      className="h-6 text-[10px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Yeni Cümle
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {(reviewedData.summarySentences || []).map((sentence, idx) => {
                      const words = sentence.trim().split(/\s+/).filter(Boolean);
                      const isTooLong = words.length > 6;
                      return (
                        <div 
                          key={idx} 
                          className="flex items-start gap-2 p-2 px-3 rounded-xl bg-slate-900/60 border border-white/5 hover:border-emerald-500/30 group"
                        >
                          <span className="text-xs font-bold text-emerald-400 mt-2">#{idx + 1}</span>
                          <div className="flex-1 space-y-1">
                            <Textarea
                              value={sentence}
                              onChange={(e) => handleSentenceChange(idx, e.target.value)}
                              className="min-h-[44px] bg-slate-950 border-white/5 text-xs text-white focus-visible:ring-emerald-500/50"
                            />
                            <div className="flex items-center justify-between text-[10px]">
                              <span className={cn(isTooLong ? "text-amber-400 font-bold" : "text-slate-500")}>
                                {words.length} kelime {isTooLong && "(Uyarı: Oyunlar için 6 kelimeden kısa önerilir)"}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteSentence(idx)}
                            className="text-slate-500 hover:text-rose-400 p-1 rounded-lg mt-2 opacity-40 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ══ 4. ALT AKSİYON BARI (FOOTER) ══ */}
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
                disabled={isFetchingRemoteText || selectedTypes.length === 0}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs h-10 px-6 rounded-xl shadow-lg shadow-purple-900/30 transition-all hover:scale-[1.02] disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 mr-2 text-yellow-300 animate-pulse" />
                ✨ {estimatedTotal} Adet Veri Üret
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
                onClick={handleSaveToDatabase}
                disabled={isSaving || totalReviewedCount === 0}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-10 px-6 rounded-xl shadow-lg shadow-emerald-900/30 transition-all hover:scale-[1.02] disabled:opacity-50"
              >
                {isSaving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Kaydediliyor...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Veritabanına Kaydet ({totalReviewedCount} Öğe)</>
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
      </DialogContent>
    </Dialog>
  );
}
