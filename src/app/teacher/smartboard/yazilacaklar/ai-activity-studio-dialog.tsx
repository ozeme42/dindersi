'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
    Loader2, Sparkles, Key, Eye, EyeOff, Save, CheckCircle2, 
    Settings2, Brain, Layers, Check, X,
    Wand2, BookOpen, Puzzle, HelpCircle, FileText, Shuffle, Target,
    ChevronDown, ChevronUp, Tag, ListOrdered, AlertTriangle, MessageSquare
} from 'lucide-react';
import { saveSystemAiConfigAction } from '@/ai/ai-config-service';
import { 
    generateCentralActivityAiAction, 
    type ConceptItem 
} from './actions';
import { normalizeConcept } from '@/lib/concept-utils';
import { cn } from '@/lib/utils';

// Güncel Gemini Modelleri (Sunum Stüdyosu ile Birebir Aynı)
export const FREE_GEMINI_MODELS = [
    {
        id: 'gemini-3.7-flash',
        name: 'Gemini 3.7 Flash',
        tag: '🚀 En Yeni Nesil (2026)',
        desc: 'Google’ın en gelişmiş hibrit akıl yürütme modeli.',
        badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40'
    },
    {
        id: 'gemini-3.6-flash',
        name: 'Gemini 3.6 Flash',
        tag: '⚡ En Kararlı & Hızlı (Önerilen)',
        desc: 'Yüksek yanıt hızı, kesintisiz kararlılık ve zengin ders tasarımı.',
        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
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

export interface AiActivityStudioDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    topicTitle: string;
    sourceText: string;
    grade?: string;
    courseTitle?: string;
    missingConcepts?: string[];
    onGenerated: (data: {
        concepts?: string[];
        conceptDefinitions?: ConceptItem[];
        notes?: string[];
        activitySentences?: string[];
    }) => void;
}

export function AiActivityStudioDialog({
    isOpen,
    onOpenChange,
    topicTitle,
    sourceText: initialSourceText,
    grade = '5',
    courseTitle = 'Din Kültürü ve Ahlak Bilgisi',
    missingConcepts = [],
    onGenerated
}: AiActivityStudioDialogProps) {
    const { toast } = useToast();

    // Kaynak Metin & Özel Prompt
    const [localSourceText, setLocalSourceText] = useState(initialSourceText || topicTitle || '');
    const [customPrompt, setCustomPrompt] = useState('');
    const [isSourceTextOpen, setIsSourceTextOpen] = useState(false);

    // Seçili Modüller
    const [modules, setModules] = useState<{
        concepts: boolean;
        definitions: boolean;
        notes: boolean;
        activitySentences: boolean;
    }>({
        concepts: true,
        definitions: true,
        notes: true,
        activitySentences: true
    });

    // Yalnızca eksik kavramları tamamlama modu
    const [onlyTargetMissing, setOnlyTargetMissing] = useState(false);

    // Ayarlar & Model Çekmecesi
    const [showSettings, setShowSettings] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSavingSystemKey, setIsSavingSystemKey] = useState(false);
    const [isKeySaved, setIsKeySaved] = useState(false);
    const [showApiKeyText, setShowApiKeyText] = useState(false);

    // Local Storage / Model State
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

    // initialSourceText değiştiğinde güncelle
    useEffect(() => {
        setLocalSourceText(initialSourceText || topicTitle || '');
    }, [initialSourceText, topicTitle]);

    if (!isOpen) return null;

    const handleClose = () => {
        if (isGenerating) return;
        onOpenChange(false);
    };

    // Model değiştirme
    const handleModelSelect = (modelId: string) => {
        setSelectedModel(modelId);
        if (typeof window !== 'undefined') {
            localStorage.setItem('custom_gemini_model', modelId);
        }
    };

    // API Key sisteme kaydetme
    const handleSaveApiKey = async () => {
        if (!apiKey.trim()) return;
        setIsSavingSystemKey(true);
        try {
            if (typeof window !== 'undefined') {
                localStorage.setItem('custom_gemini_api_key', apiKey.trim());
            }
            const res = await saveSystemAiConfigAction({
                apiKey: apiKey.trim(),
                modelName: selectedModel
            });
            if (res.success) {
                setIsKeySaved(true);
                toast({ title: "API Anahtarı Kaydedildi", description: "Google AI Studio anahtarınız başarıyla sisteme tanımlandı." });
                setTimeout(() => setIsKeySaved(false), 3000);
            } else {
                toast({ title: "Kayıt Uyarısı", description: (res as any).error || res.message || "Sisteme kaydedilemedi, tarayıcıda saklandı.", variant: "default" });
            }
        } catch (err: any) {
            toast({ title: "Hata", description: err.message || "API kaydedilemedi.", variant: "destructive" });
        } finally {
            setIsSavingSystemKey(false);
        }
    };

    // Hazır Paket Uygulama
    const applyPreset = (preset: 'all' | 'wordsAndGames' | 'notesAndDefs' | 'onlyMissing' | 'clear') => {
        if (preset === 'all') {
            setModules({ concepts: true, definitions: true, notes: true, activitySentences: true });
            setOnlyTargetMissing(false);
        } else if (preset === 'wordsAndGames') {
            setModules({ concepts: true, definitions: false, notes: false, activitySentences: true });
            setOnlyTargetMissing(false);
        } else if (preset === 'notesAndDefs') {
            setModules({ concepts: false, definitions: true, notes: true, activitySentences: false });
            setOnlyTargetMissing(false);
        } else if (preset === 'onlyMissing') {
            setModules({ concepts: false, definitions: true, notes: false, activitySentences: false });
            setOnlyTargetMissing(true);
        } else if (preset === 'clear') {
            setModules({ concepts: false, definitions: false, notes: false, activitySentences: false });
            setOnlyTargetMissing(false);
        }
    };

    const toggleModule = (key: keyof typeof modules) => {
        setModules(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const selectedCount = Object.values(modules).filter(Boolean).length;

    // Üretim İşlemi
    const handleGenerate = async () => {
        if (selectedCount === 0) {
            toast({ title: "Seçim Yapın", description: "Lütfen üretmek istediğiniz en az bir modül seçin.", variant: "default" });
            return;
        }

        setIsGenerating(true);
        try {
            const targetConceptsToSend = onlyTargetMissing && missingConcepts.length > 0 
                ? missingConcepts 
                : undefined;

            const res = await generateCentralActivityAiAction({
                sourceText: localSourceText,
                topicTitle,
                grade,
                courseTitle,
                activeModules: modules,
                targetConcepts: targetConceptsToSend,
                customPrompt: customPrompt.trim() || undefined,
                apiKey: apiKey.trim() || undefined,
                modelName: selectedModel
            });

            if (res.success) {
                onGenerated({
                    concepts: res.concepts,
                    conceptDefinitions: res.conceptDefinitions,
                    notes: res.notes,
                    activitySentences: res.activitySentences
                });

                const summaryParts: string[] = [];
                if (res.concepts && res.concepts.length > 0) summaryParts.push(`${res.concepts.length} kavram`);
                if (res.conceptDefinitions && res.conceptDefinitions.length > 0) summaryParts.push(`${res.conceptDefinitions.length} tanım`);
                if (res.notes && res.notes.length > 0) summaryParts.push(`${res.notes.length} ders notu`);
                if (res.activitySentences && res.activitySentences.length > 0) summaryParts.push(`${res.activitySentences.length} oyun cümlesi`);

                toast({
                    title: "Yapay Zekâ İçeriği Üretti! ✨",
                    description: `${summaryParts.join(', ')} stüdyoya başarıyla aktarıldı.`,
                    className: "bg-purple-950 border-purple-500 text-white"
                });

                onOpenChange(false);
            } else {
                toast({
                    title: "Üretim Hatası",
                    description: res.error || "Yapay zeka içerik oluşturamadı.",
                    variant: "destructive"
                });
            }
        } catch (err: any) {
            console.error("AI Generation error:", err);
            toast({
                title: "Hata",
                description: err.message || "İçerik üretilirken bir hata oluştu.",
                variant: "destructive"
            });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div 
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
            onClick={handleClose}
        >
            <div 
                className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-950 border border-white/15 text-slate-100 shadow-2xl rounded-3xl overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* ══ 1. ÜST BAŞLIK & AYARLAR ÇUBUĞU ══ */}
                <div className="p-3.5 sm:p-4.5 px-4 sm:px-6 border-b border-white/10 bg-slate-900/90 backdrop-blur-md flex flex-row items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 sm:p-2.5 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl border border-purple-500/30 text-purple-400 shadow-md flex-shrink-0">
                            <Sparkles className="h-5 w-5 text-yellow-300 animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-sm sm:text-base md:text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                                ✨ Yapay Zekâ Etkinlik & İçerik Stüdyosu
                            </h3>
                            <p className="text-[11px] sm:text-xs text-slate-400 truncate max-w-[220px] sm:max-w-md">
                                {topicTitle ? `"${topicTitle}" konusu için kavram, tanım, not ve oyun cümleleri üretin.` : 'Konu için akıllı içerikler üretin.'}
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
                            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* ══ 2. MODEL & API AYARLARI ÇEKMECESİ ══ */}
                {showSettings && (
                    <div className="bg-slate-900/95 border-b border-white/10 p-4 sm:p-5 space-y-4 animate-in slide-in-from-top-2 duration-200 flex-shrink-0 max-h-[50vh] overflow-y-auto">
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
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                                    >
                                        {showApiKeyText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                                <Button 
                                    type="button"
                                    size="sm"
                                    onClick={handleSaveApiKey}
                                    disabled={isSavingSystemKey || !apiKey.trim()}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl px-4 cursor-pointer"
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
                                        onClick={() => handleModelSelect(m.id)}
                                        className={cn(
                                            "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                                            selectedModel === m.id
                                                ? "bg-indigo-600/30 border-indigo-500 text-white shadow-md ring-1 ring-indigo-500/40"
                                                : "bg-slate-950 border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/15"
                                        )}
                                    >
                                        <div className="font-bold text-[11px] truncate text-white">{m.name}</div>
                                        <div className="text-[9px] text-slate-400 truncate">{m.tag}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ══ 3. KAYNAK METİN ALANI (AKORDİYON) ══ */}
                <div className="bg-slate-900/60 border-b border-white/10 p-3 sm:px-6 flex flex-col gap-2 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="p-1 bg-indigo-500/20 rounded-lg text-indigo-300 border border-indigo-500/30">
                                <FileText className="w-3.5 h-3.5" />
                            </span>
                            <span className="text-xs font-bold text-slate-300">Kaynak Ders Kitabı Metni</span>
                            <span className="text-[10px] font-bold text-indigo-300 bg-indigo-950/70 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                                {localSourceText.length.toLocaleString('tr-TR')} karakter • {localSourceText.trim().split(/\s+/).filter(Boolean).length} kelime
                            </span>
                        </div>

                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsSourceTextOpen(!isSourceTextOpen)}
                            className="h-7 px-2.5 text-xs text-indigo-300 hover:text-white hover:bg-white/10 font-bold rounded-lg cursor-pointer"
                        >
                            {isSourceTextOpen ? (
                                <><ChevronUp className="w-3.5 h-3.5 mr-1" /> Kapat</>
                            ) : (
                                <><ChevronDown className="w-3.5 h-3.5 mr-1" /> Metni Gör / Düzenle 📝</>
                            )}
                        </Button>
                    </div>

                    {isSourceTextOpen && (
                        <div className="mt-1 animate-in fade-in-50 duration-200">
                            <Textarea 
                                value={localSourceText}
                                onChange={(e) => setLocalSourceText(e.target.value)}
                                placeholder="Ders kitabı kaynak metnini buraya yapıştırın veya düzenleyin..."
                                className="min-h-[110px] max-h-[220px] bg-slate-950 border-white/15 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 font-sans leading-relaxed"
                            />
                        </div>
                    )}
                </div>

                {/* ══ 4. HIZLI HAZIR PAKETLER ══ */}
                <div className="p-3 sm:px-6 pt-3 bg-slate-950 flex-shrink-0 space-y-2 border-b border-white/5">
                    <div className="flex items-center justify-between">
                        <Label className="text-[11px] sm:text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Wand2 className="w-3.5 h-3.5 text-yellow-400" /> ⚡ Hızlı Hazır Paketler (Tek Tıkla Seçim)
                        </Label>
                        <div className="flex items-center gap-1.5">
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => applyPreset('all')}
                                className="h-6 px-2 text-[11px] text-amber-400 hover:text-amber-300 font-bold cursor-pointer"
                            >
                                Tümünü Seç
                            </Button>
                            <span className="text-slate-600">•</span>
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => applyPreset('clear')}
                                className="h-6 px-2 text-[11px] text-rose-400 hover:text-rose-300 font-bold cursor-pointer"
                            >
                                Temizle
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {/* 1. Tam Paket */}
                        <button
                            type="button"
                            onClick={() => applyPreset('all')}
                            className={cn(
                                "p-2.5 rounded-2xl border text-left transition-all hover:scale-[1.02] shadow-sm cursor-pointer",
                                modules.concepts && modules.definitions && modules.notes && modules.activitySentences
                                    ? "bg-gradient-to-br from-indigo-950/80 to-purple-950/80 border-indigo-400 ring-1 ring-indigo-500/40"
                                    : "bg-slate-900/60 border-white/5 hover:border-white/15"
                            )}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-black text-white">🌟 Tam Paket</span>
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">4 Modül</span>
                            </div>
                            <p className="text-[10px] text-slate-400 line-clamp-1 leading-tight">
                                Kavram, Tanım, Defter Notu, Oyun Cümlesi
                            </p>
                        </button>

                        {/* 2. Kelime & Oyunlar */}
                        <button
                            type="button"
                            onClick={() => applyPreset('wordsAndGames')}
                            className={cn(
                                "p-2.5 rounded-2xl border text-left transition-all hover:scale-[1.02] shadow-sm cursor-pointer",
                                modules.concepts && modules.activitySentences && !modules.definitions && !modules.notes
                                    ? "bg-gradient-to-br from-blue-950/80 to-cyan-950/80 border-cyan-400 ring-1 ring-cyan-500/40"
                                    : "bg-slate-900/60 border-white/5 hover:border-white/15"
                            )}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-black text-white">🔤 Kelime & Oyun</span>
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">2 Modül</span>
                            </div>
                            <p className="text-[10px] text-slate-400 line-clamp-1 leading-tight">
                                Kelime Havuzu + Kısa Oyun Cümleleri
                            </p>
                        </button>

                        {/* 3. Defter & Tanım */}
                        <button
                            type="button"
                            onClick={() => applyPreset('notesAndDefs')}
                            className={cn(
                                "p-2.5 rounded-2xl border text-left transition-all hover:scale-[1.02] shadow-sm cursor-pointer",
                                modules.definitions && modules.notes && !modules.concepts && !modules.activitySentences
                                    ? "bg-gradient-to-br from-emerald-950/80 to-teal-950/80 border-emerald-400 ring-1 ring-emerald-500/40"
                                    : "bg-slate-900/60 border-white/5 hover:border-white/15"
                            )}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-black text-white">📚 Defter & Tanım</span>
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">2 Modül</span>
                            </div>
                            <p className="text-[10px] text-slate-400 line-clamp-1 leading-tight">
                                Kavram Tanımları + Maddeli Defter Notları
                            </p>
                        </button>

                        {/* 4. Yalnızca Eksikleri Tamamla */}
                        <button
                            type="button"
                            onClick={() => applyPreset('onlyMissing')}
                            className={cn(
                                "p-2.5 rounded-2xl border text-left transition-all hover:scale-[1.02] shadow-sm cursor-pointer",
                                onlyTargetMissing
                                    ? "bg-gradient-to-br from-amber-950/80 to-orange-950/80 border-amber-400 ring-1 ring-amber-500/40"
                                    : "bg-slate-900/60 border-white/5 hover:border-white/15"
                            )}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-black text-amber-300 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3 text-amber-400" /> Eksikleri Doldur
                                </span>
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    {missingConcepts.length} Eksik
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-400 line-clamp-1 leading-tight">
                                Sadece tanımsız kavramlara tanım yaz
                            </p>
                        </button>
                    </div>
                </div>

                {/* ══ 5. MODÜL SEÇİM KARTLARI (İÇERİK ALANI) ══ */}
                <div className="flex-1 overflow-y-auto p-4 sm:px-6 space-y-3 bg-slate-950">
                    <Label className="text-[11px] sm:text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-purple-400" /> Üretilecek İçerik Modüllerini Seçin
                    </Label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* 1. KAVRAMLAR */}
                        <div 
                            onClick={() => toggleModule('concepts')}
                            className={cn(
                                "p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between shadow-md",
                                modules.concepts 
                                    ? "bg-blue-950/40 border-blue-500/70 shadow-[0_0_15px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/30" 
                                    : "bg-slate-900/50 border-white/10 hover:border-white/20 opacity-70"
                            )}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                                        <Tag className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-white flex items-center gap-2">
                                            Kelime & Kavram Havuzu
                                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
                                                8-15 Kelime
                                            </span>
                                        </h4>
                                        <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                                            Anlat Bakalım, Anagram Duvarı ve Çarkıfelek oyunları için tekil anahtar kelimeler.
                                        </p>
                                    </div>
                                </div>
                                <div className={cn(
                                    "w-5 h-5 rounded-lg flex items-center justify-center border transition-all flex-shrink-0 mt-0.5",
                                    modules.concepts ? "bg-blue-500 border-blue-400 text-white" : "border-white/20 bg-slate-950"
                                )}>
                                    {modules.concepts && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                            </div>
                        </div>

                        {/* 2. KAVRAM-TANIM ÇİFTLERİ */}
                        <div 
                            onClick={() => toggleModule('definitions')}
                            className={cn(
                                "p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between shadow-md",
                                modules.definitions 
                                    ? "bg-purple-950/40 border-purple-500/70 shadow-[0_0_15px_rgba(168,85,247,0.15)] ring-1 ring-purple-500/30" 
                                    : "bg-slate-900/50 border-white/10 hover:border-white/20 opacity-70"
                            )}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                                        <BookOpen className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-white flex items-center gap-2">
                                            Kavram - Tanım Eşleşmeleri
                                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                                                6-12 Çift
                                            </span>
                                        </h4>
                                        <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                                            Kavram Düellosu, Hafıza Kartı ve Eşleştirme oyunları için ipucu tanımlar.
                                        </p>
                                    </div>
                                </div>
                                <div className={cn(
                                    "w-5 h-5 rounded-lg flex items-center justify-center border transition-all flex-shrink-0 mt-0.5",
                                    modules.definitions ? "bg-purple-500 border-purple-400 text-white" : "border-white/20 bg-slate-950"
                                )}>
                                    {modules.definitions && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                            </div>

                            {/* Eksik Tanımları Hedefle Seçeneği */}
                            {modules.definitions && missingConcepts.length > 0 && (
                                <div 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setOnlyTargetMissing(v => !v);
                                    }}
                                    className="mt-2.5 pt-2 border-t border-purple-500/30 flex items-center justify-between text-[11px] text-amber-300"
                                >
                                    <span className="flex items-center gap-1 font-bold">
                                        <AlertTriangle className="w-3 h-3 text-amber-400" /> 
                                        Sadece Tanımsız {missingConcepts.length} Kavramı Doldur
                                    </span>
                                    <input 
                                        type="checkbox" 
                                        checked={onlyTargetMissing} 
                                        onChange={() => {}} 
                                        className="rounded text-purple-600 focus:ring-0 cursor-pointer"
                                    />
                                </div>
                            )}
                        </div>

                        {/* 3. DEFTERE YAZILACAK NOTLAR */}
                        <div 
                            onClick={() => toggleModule('notes')}
                            className={cn(
                                "p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between shadow-md",
                                modules.notes 
                                    ? "bg-indigo-950/40 border-indigo-500/70 shadow-[0_0_15px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/30" 
                                    : "bg-slate-900/50 border-white/10 hover:border-white/20 opacity-70"
                            )}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-white flex items-center gap-2">
                                            Deftere Yazılacak Özet Notlar
                                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                                                5-8 Madde
                                            </span>
                                        </h4>
                                        <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                                            Akıllı tahtadan öğrencilerin doğrudan defterlerine yazacağı maddeli konu özeti.
                                        </p>
                                    </div>
                                </div>
                                <div className={cn(
                                    "w-5 h-5 rounded-lg flex items-center justify-center border transition-all flex-shrink-0 mt-0.5",
                                    modules.notes ? "bg-indigo-500 border-indigo-400 text-white" : "border-white/20 bg-slate-950"
                                )}>
                                    {modules.notes && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                            </div>
                        </div>

                        {/* 4. KISA ETKİNLİK CÜMLELERİ */}
                        <div 
                            onClick={() => toggleModule('activitySentences')}
                            className={cn(
                                "p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between shadow-md",
                                modules.activitySentences 
                                    ? "bg-emerald-950/40 border-emerald-500/70 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30" 
                                    : "bg-slate-900/50 border-white/10 hover:border-white/20 opacity-70"
                            )}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                                        <ListOrdered className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-white flex items-center gap-2">
                                            Kısa Etkinlik & Oyun Cümleleri
                                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                                                4-8 Kelime
                                            </span>
                                        </h4>
                                        <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                                            Cümle Kurma, Doğru/Yanlış ve Tornado oyunları için kısa, yalın cümle havuzu.
                                        </p>
                                    </div>
                                </div>
                                <div className={cn(
                                    "w-5 h-5 rounded-lg flex items-center justify-center border transition-all flex-shrink-0 mt-0.5",
                                    modules.activitySentences ? "bg-emerald-500 border-emerald-400 text-white" : "border-white/20 bg-slate-950"
                                )}>
                                    {modules.activitySentences && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ══ 6. ÖZEL İSTEK / PROMPT ══ */}
                    <div className="pt-2">
                        <Label className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mb-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-yellow-400" /> Özel Talimat / Prompt (İsteğe Bağlı):
                        </Label>
                        <Input 
                            value={customPrompt}
                            onChange={(e) => setCustomPrompt(e.target.value)}
                            placeholder="Örn: 5. sınıf seviyesine uygun, sade bir dil kullan; kavram tanımları çok net olsun..."
                            className="bg-slate-900 border-white/10 text-xs rounded-xl text-white placeholder:text-slate-500 focus:border-purple-500"
                        />
                    </div>
                </div>

                {/* ══ 7. ALT AKSİYON ÇUBUĞU ══ */}
                <div className="p-3.5 sm:p-4.5 px-4 sm:px-6 border-t border-white/10 bg-slate-900/90 backdrop-blur-md flex flex-row items-center justify-between flex-shrink-0">
                    <div className="text-xs text-slate-400">
                        <span className="font-bold text-white">{selectedCount}</span> modül seçildi • <span className="text-purple-300 font-mono text-[11px]">{selectedModel}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button 
                            type="button"
                            variant="ghost" 
                            size="sm"
                            onClick={handleClose}
                            disabled={isGenerating}
                            className="text-xs text-slate-400 hover:text-white rounded-xl cursor-pointer"
                        >
                            İptal
                        </Button>

                        <Button 
                            type="button"
                            size="sm"
                            onClick={handleGenerate}
                            disabled={isGenerating || selectedCount === 0}
                            className="bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold text-xs rounded-xl px-5 h-10 shadow-lg shadow-purple-900/40 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Yapay Zekâ Hazırlıyor...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 text-yellow-300" />
                                    <span>Seçilenleri AI İle Üret</span>
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
