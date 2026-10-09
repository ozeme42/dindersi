"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    Maximize2, Minimize2, ExternalLink, RotateCcw, 
    Sparkles, Puzzle, Crosshair, Package, CheckCircle2, Grid, Skull, 
    Search, HelpCircle, Trophy, FileText, Zap, Layers, Eye, Edit3, 
    Shuffle, Loader2, Globe, Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface WordwallActivityItem {
    id: number | string;
    name: string;
    templateName: string;
    templateId?: number;
    themeId?: number;
    guid: string;
    thumbnail?: string;
}

const TEMPLATE_META: Record<string, { label: string; icon: any; color: string; badge: string }> = {
    'Match up': { label: 'Eşleştirme', icon: Puzzle, color: 'bg-blue-500 hover:bg-blue-600 border-blue-300 text-white', badge: 'EŞLEŞTİRME' },
    'Anagram': { label: 'Kavram Avı', icon: Crosshair, color: 'bg-amber-500 hover:bg-amber-600 border-amber-300 text-white', badge: 'ANAGRAM' },
    'Open the box': { label: 'Kutu Aç', icon: Package, color: 'bg-purple-600 hover:bg-purple-700 border-purple-400 text-white', badge: 'KUTU AÇ' },
    'True or false': { label: 'Doğru / Yanlış', icon: CheckCircle2, color: 'bg-emerald-600 hover:bg-emerald-700 border-emerald-400 text-white', badge: 'D / Y' },
    'Matching pairs': { label: 'Hafıza Kartları', icon: Grid, color: 'bg-rose-500 hover:bg-rose-600 border-rose-300 text-white', badge: 'HAFIZA' },
    'Hangman': { label: 'Adam Asmaca', icon: Skull, color: 'bg-rose-600 hover:bg-rose-700 border-rose-400 text-white', badge: 'ASMACA' },
    'Wordsearch': { label: 'Kelime Avı', icon: Search, color: 'bg-teal-600 hover:bg-teal-700 border-teal-400 text-white', badge: 'BULMACA' },
    'Quiz': { label: 'Çoktan Seçmeli', icon: HelpCircle, color: 'bg-indigo-600 hover:bg-indigo-700 border-indigo-400 text-white', badge: 'TEST' },
    'Gameshow quiz': { label: 'Yarışma', icon: Trophy, color: 'bg-yellow-500 hover:bg-yellow-600 border-yellow-300 text-slate-900', badge: 'GAMESHOW' },
    'Find the match': { label: 'Eşini Bul', icon: Sparkles, color: 'bg-violet-600 hover:bg-violet-700 border-violet-400 text-white', badge: 'EŞİNİ BUL' },
    'Crossword': { label: 'Kare Bulmaca', icon: FileText, color: 'bg-slate-700 hover:bg-slate-800 border-slate-500 text-white', badge: 'ÇAPRAZ' },
    'Flying fruit': { label: 'Uçan Meyveler', icon: Zap, color: 'bg-lime-600 hover:bg-lime-700 border-lime-400 text-white', badge: 'MEYVELER' },
    'Flash cards': { label: 'Bilgi Kartları', icon: Layers, color: 'bg-sky-500 hover:bg-sky-600 border-sky-300 text-white', badge: 'KARTLAR' },
    'Watch and memorize': { label: 'İzle & Hatırla', icon: Eye, color: 'bg-indigo-500 hover:bg-indigo-600 border-indigo-300 text-white', badge: 'HATIRLA' },
    'Complete the sentence': { label: 'Cümle Tamamlama', icon: Edit3, color: 'bg-orange-500 hover:bg-orange-600 border-orange-300 text-white', badge: 'CÜMLE' },
    'Unjumble': { label: 'Cümle Oluştur', icon: Shuffle, color: 'bg-emerald-500 hover:bg-emerald-600 border-emerald-300 text-white', badge: 'SIRALA' },
};

export function WordwallTab({
    topicId,
    topicName,
    courseName,
    unitName,
    grade,
    darkMode = false,
}: {
    topicId: string;
    topicName: string;
    courseName?: string;
    unitName?: string;
    grade?: string;
    darkMode?: boolean;
}) {
    const [activities, setActivities] = useState<WordwallActivityItem[]>([]);
    const [selectedActivity, setSelectedActivity] = useState<WordwallActivityItem | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isIframeLoading, setIsIframeLoading] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [iframeKey, setIframeKey] = useState(0);
    const [fallbackLevel, setFallbackLevel] = useState<'topic' | 'class' | 'sukas'>('topic');

    const containerRef = useRef<HTMLDivElement>(null);

    // Sınıf seviyesini hesapla (5, 6, 7, 8)
    const effectiveGrade = useMemo(() => {
        if (grade) {
            const m = String(grade).match(/[5-8]/);
            if (m) return m[0];
        }
        const combined = `${courseName || ''} ${unitName || ''} ${topicName || ''}`;
        const m = combined.match(/([5-8])\s*(\.|\s*sınıf|\s*grade)/i) || combined.match(/([5-8])/);
        return m ? m[1] : '5';
    }, [grade, courseName, unitName, topicName]);

    // Tam ekran dinleyicisi
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    // Etkinlikleri kademeli fallback ile yükle: Konu -> Sınıf -> Sukas Genel Kütüphanesi
    useEffect(() => {
        let isMounted = true;
        setIsLoading(true);

        const loadActivities = async () => {
            let list: WordwallActivityItem[] = [];
            let resolvedLevel: 'topic' | 'class' | 'sukas' = 'topic';

            // 1. ADIM: Konuya özel JSON dosyasını dene
            if (topicId && topicId !== 'all') {
                try {
                    const res = await fetch(`/curriculum/wordwall/${topicId}.json?v=${Date.now()}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (Array.isArray(data) && data.length > 0) {
                            list = data;
                            resolvedLevel = 'topic';
                        }
                    }
                } catch (e) {
                    // Konu bulunamazsa fallback'e geç
                }
            }

            // 2. ADIM: Konu bulunamadıysa -> Sınıf (Grade) kütüphanesini aç
            if (list.length === 0 && effectiveGrade) {
                try {
                    const res = await fetch(`/curriculum/wordwall/class-${effectiveGrade}.json?v=${Date.now()}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (Array.isArray(data) && data.length > 0) {
                            list = data;
                            resolvedLevel = 'class';
                        }
                    }
                } catch (e) {
                    // Sınıf dosyası okunamadıysa Sukas'a geç
                }
            }

            // 3. ADIM: Sınıf da bulunamazsa -> Sukas Genel Kütüphanesini aç (ASLA BOŞ KALMAZ)
            if (list.length === 0) {
                try {
                    const res = await fetch(`/curriculum/wordwall/sukas-default.json?v=${Date.now()}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (Array.isArray(data) && data.length > 0) {
                            list = data;
                            resolvedLevel = 'sukas';
                        }
                    }
                } catch (e) {
                    console.warn('Wordwall fallback yüklenemedi:', e);
                }
            }

            if (!isMounted) return;

            setFallbackLevel(resolvedLevel);
            setActivities(list);
            if (list.length > 0) {
                // Öncelikli olarak Match up veya ilk etkinliği seç
                const preferred = list.find(a => a.templateName === 'Match up') || list[0];
                setSelectedActivity(preferred);
            } else {
                setSelectedActivity(null);
            }
            setIsLoading(false);
        };

        loadActivities();

        return () => {
            isMounted = false;
        };
    }, [topicId, effectiveGrade]);

    // Etkinlik seçildiğinde iframe yükleme durumunu sıfırla
    const handleSelectActivity = (act: WordwallActivityItem) => {
        if (selectedActivity?.guid === act.guid) return;
        setIsIframeLoading(true);
        setSelectedActivity(act);
        setIframeKey(k => k + 1);
    };

    const embedUrl = useMemo(() => {
        if (!selectedActivity?.guid) return '';
        const theme = selectedActivity.themeId || 46;
        const template = selectedActivity.templateId || 0;
        return `https://wordwall.net/tr/embed/${selectedActivity.guid}?themeId=${theme}&templateId=${template}&fontStackId=0`;
    }, [selectedActivity]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className={cn("w-10 h-10 animate-spin", darkMode ? "text-cyan-400" : "text-blue-600")} />
                <p className={cn("text-sm font-bold uppercase tracking-widest", darkMode ? "text-slate-400" : "text-slate-500")}>
                    Wordwall Etkinlikleri Hazırlanıyor...
                </p>
            </div>
        );
    }

    return (
        <div 
            ref={containerRef}
            className={cn(
                "w-full transition-all duration-300 flex flex-col",
                isFullscreen 
                    ? "fixed inset-0 z-[200] bg-slate-900 p-0 m-0 h-screen w-screen" 
                    : "w-full space-y-4 pb-20"
            )}
        >
            {/* ═══ 1. ÜST BAŞLIK VE KONTROLLER ═══ */}
            <div className={cn(
                "flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3 sm:p-4 shadow-sm backdrop-blur-md transition-colors",
                isFullscreen 
                    ? "bg-slate-900/90 border-slate-800 text-white rounded-none border-x-0 border-t-0"
                    : darkMode
                        ? "bg-slate-900/80 border border-white/10 text-white shadow-xl"
                        : "bg-white border border-slate-200/80 text-slate-800"
            )}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-blue-600 via-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
                        <Globe className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className={cn(
                                "text-[10px] sm:text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
                                fallbackLevel === 'topic'
                                    ? "bg-blue-500/20 text-blue-300 border-blue-400/40"
                                    : fallbackLevel === 'class'
                                        ? "bg-amber-500/20 text-amber-300 border-amber-400/40"
                                        : "bg-sky-500/20 text-sky-300 border-sky-400/40"
                            )}>
                                {fallbackLevel === 'topic'
                                    ? 'WORDWALL CANLI'
                                    : fallbackLevel === 'class'
                                        ? `${effectiveGrade}. SINIF ETKİNLİKLERİ`
                                        : 'SUKAS KÜTÜPHANESİ'
                                }
                            </span>
                            <span className={cn("text-xs font-bold hidden sm:inline", darkMode ? "text-slate-400" : "text-slate-400")}>
                                {activities.length} Etkinlik
                            </span>
                        </div>
                        <h2 className={cn(
                            "text-base sm:text-lg font-black tracking-tight line-clamp-1",
                            isFullscreen || darkMode ? "text-white" : "text-slate-800"
                        )}>
                            {selectedActivity ? selectedActivity.name : topicName}
                        </h2>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                            setIsIframeLoading(true);
                            setIframeKey(k => k + 1);
                        }}
                        title="Yeniden Yükle"
                        className={cn(
                            "rounded-xl h-9 w-9",
                            darkMode
                                ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/15 hover:text-white"
                                : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        )}
                    >
                        <RotateCcw className="w-4 h-4" />
                    </Button>

                    <a
                        href="https://wordwall.net/tr/teacher/518166/sukas"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hidden md:inline-flex"
                        title="Sukas Wordwall Öğretmen Sayfası"
                    >
                        <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                                "rounded-xl font-bold text-xs h-9 gap-1.5",
                                darkMode
                                    ? "bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20 hover:text-white"
                                    : "border-amber-200 text-amber-800 bg-amber-50 hover:bg-amber-100"
                            )}
                        >
                            <Globe className="w-3.5 h-3.5 text-amber-400" />
                            Sukas Sayfası
                        </Button>
                    </a>

                    {selectedActivity && (
                        <a
                            href={`https://wordwall.net/tr/resource/${selectedActivity.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden sm:inline-flex"
                        >
                            <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                    "rounded-xl font-bold text-xs h-9 gap-1.5",
                                    darkMode
                                        ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/15 hover:text-white"
                                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Wordwall'da Aç
                            </Button>
                        </a>
                    )}

                    <Button
                        variant="default"
                        size="sm"
                        onClick={toggleFullscreen}
                        className={cn(
                            "rounded-xl font-black text-xs h-9 gap-1.5 shadow-md transition-all",
                            isFullscreen 
                                ? "bg-rose-600 hover:bg-rose-700 text-white" 
                                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/20"
                        )}
                    >
                        {isFullscreen ? (
                            <>
                                <Minimize2 className="w-4 h-4" />
                                <span className="hidden sm:inline">Tam Ekrandan Çık</span>
                            </>
                        ) : (
                            <>
                                <Maximize2 className="w-4 h-4" />
                                <span className="hidden sm:inline">Tam Ekran</span>
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* ═══ FALLBACK BİLGİLENDİRME BARI (Konu bulunamadığında) ═══ */}
            {fallbackLevel === 'class' && (
                <div className={cn(
                    "flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all",
                    darkMode
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
                        : "bg-amber-50 border-amber-200 text-amber-900"
                )}>
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>
                            Bu konuya özel etkinlik henüz bulunamadı. <strong>{effectiveGrade}. Sınıf Wordwall Kütüphanesi ({activities.length} Etkinlik)</strong> açıldı.
                        </span>
                    </div>
                    <a
                        href="https://wordwall.net/tr/teacher/518166/sukas"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-black text-amber-400 hover:text-amber-300 underline shrink-0"
                    >
                        <span>Sukas Sayfasını Aç</span>
                        <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
            )}

            {fallbackLevel === 'sukas' && (
                <div className={cn(
                    "flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all",
                    darkMode
                        ? "bg-sky-500/10 border-sky-500/30 text-sky-200"
                        : "bg-sky-50 border-sky-200 text-sky-900"
                )}>
                    <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-sky-400 shrink-0" />
                        <span>
                            <strong>Sukas Wordwall Genel Kütüphanesi ({activities.length} Etkinlik)</strong> açıldı.
                        </span>
                    </div>
                    <a
                        href="https://wordwall.net/tr/teacher/518166/sukas"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-black text-sky-400 hover:text-sky-300 underline shrink-0"
                    >
                        <span>Sukas Sayfasını Aç</span>
                        <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
            )}

            {/* ═══ 2. ETKİNLİK SEÇİCİ ÇİPLER (CAROUSEL / CHIPS) ═══ */}
            {activities.length > 0 ? (
                <div className={cn(
                    "flex items-center gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar scroll-smooth",
                    isFullscreen && "px-4 py-2 bg-slate-900 border-b border-slate-800"
                )}>
                    {activities.map((act) => {
                        const meta = TEMPLATE_META[act.templateName] || {
                            label: act.templateName,
                            icon: Gamepad2Icon,
                            color: 'bg-slate-700 hover:bg-slate-800 text-white',
                            badge: 'OYUN'
                        };
                        const Icon = meta.icon;
                        const isSelected = selectedActivity?.guid === act.guid;

                        return (
                            <button
                                key={act.id}
                                onClick={() => handleSelectActivity(act)}
                                className={cn(
                                    "group relative flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 border select-none",
                                    isSelected
                                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-400 shadow-lg shadow-blue-500/30 scale-[1.02] ring-2 ring-blue-400/50"
                                        : isFullscreen || darkMode
                                            ? "bg-slate-900/90 text-slate-300 border-white/10 hover:bg-slate-800 hover:border-cyan-400/60 hover:text-white"
                                            : "bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-900 shadow-sm"
                                )}
                            >
                                <span className={cn(
                                    "p-1 rounded-lg flex items-center justify-center transition-colors",
                                    isSelected 
                                        ? "bg-white/20 text-white" 
                                        : darkMode 
                                            ? "bg-slate-800 text-slate-400 group-hover:bg-cyan-500/20 group-hover:text-cyan-300"
                                            : "bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-600"
                                )}>
                                    <Icon className="w-3.5 h-3.5" />
                                </span>
                                <div className="flex flex-col text-left leading-tight">
                                    <span className="font-black tracking-tight line-clamp-1 max-w-[160px] sm:max-w-[200px]">
                                        {meta.label}
                                    </span>
                                    <span className={cn(
                                        "text-[9px] font-bold uppercase tracking-wider line-clamp-1 opacity-70",
                                        isSelected 
                                            ? "text-blue-100" 
                                            : "text-slate-400"
                                    )}>
                                        {act.name.replace(topicName, '').trim() || meta.badge}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            ) : (
                <div className={cn(
                    "p-8 text-center rounded-3xl space-y-3",
                    darkMode
                        ? "bg-slate-900/80 border border-white/10 text-white"
                        : "bg-white border border-slate-200"
                )}>
                    <Globe className={cn("w-12 h-12 mx-auto", darkMode ? "text-cyan-400/40" : "text-slate-300")} />
                    <h3 className={cn("text-base font-bold", darkMode ? "text-white" : "text-slate-700")}>
                        {topicId === 'all' ? 'Lütfen Bir Konu Seçin' : 'Bu Konu İçin Wordwall Etkinlikleri Hazırlanıyor'}
                    </h3>
                    <p className={cn("text-xs max-w-md mx-auto", darkMode ? "text-slate-400" : "text-slate-500")}>
                        {topicId === 'all'
                            ? 'Wordwall canlı etkinliklerini listelemek için yukarıdaki listeden bir konu seçebilirsiniz.'
                            : 'Seçilen konunun Wordwall etkinlikleri müfredat kütüphanesinden otomatik olarak yüklenecektir.'
                        }
                    </p>
                </div>
            )}

            {/* ═══ 3. İFRAME OYNATICI ALANI ═══ */}
            {selectedActivity ? (
                <div className={cn(
                    "relative w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-200/80 shadow-2xl transition-all duration-300",
                    isFullscreen 
                        ? "flex-1 rounded-none border-0 h-[calc(100vh-60px)]" 
                        : "h-[calc(100vh-250px)] min-h-[580px] max-h-[850px]"
                )}>
                    {isIframeLoading && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/90 text-white gap-3 backdrop-blur-sm">
                            <Loader2 className="w-10 h-10 animate-spin text-sky-400" />
                            <div className="text-center space-y-1">
                                <p className="text-sm font-black tracking-wide text-white uppercase">
                                    {selectedActivity.name}
                                </p>
                                <p className="text-xs text-slate-400">Wordwall motoru yükleniyor...</p>
                            </div>
                        </div>
                    )}

                    <iframe
                        key={iframeKey}
                        src={embedUrl}
                        title={selectedActivity.name}
                        onLoad={() => setIsIframeLoading(false)}
                        className="w-full h-full border-0 block bg-slate-950"
                        allow="autoplay; fullscreen; clipboard-write; encrypted-media"
                        allowFullScreen
                    />
                </div>
            ) : null}
        </div>
    );
}

function Gamepad2Icon(props: any) {
    return <Play {...props} />;
}
