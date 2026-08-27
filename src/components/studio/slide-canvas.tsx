'use client';

import React, { useMemo, useState } from 'react';
import type { LessonStep, Topic } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    ChevronLeft, ChevronRight, Play, Maximize2, Sparkles, 
    Layers, Wand2, Eye, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
    Tv, Monitor
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LessonContentViewer } from '@/components/lesson-content-viewer';
import { getStepTypeMeta } from './slide-filmstrip';

export type SlideCanvasProps = {
    steps: (LessonStep & { id: string })[];
    selectedIndex: number;
    onSelectIndex: (index: number) => void;
    topicTitle: string;
    courseTitle?: string;
    unitTitle?: string;
    onOpenFullscreenPreview: () => void;
    onOpenAi?: () => void;
    isLeftCollapsed?: boolean;
    onToggleLeftCollapse?: () => void;
    isRightCollapsed?: boolean;
    onToggleRightCollapse?: () => void;
};

export function SlideCanvas({
    steps,
    selectedIndex,
    onSelectIndex,
    topicTitle,
    courseTitle = 'Ders',
    unitTitle = 'Ünite',
    onOpenFullscreenPreview,
    onOpenAi,
    isLeftCollapsed = false,
    onToggleLeftCollapse,
    isRightCollapsed = false,
    onToggleRightCollapse
}: SlideCanvasProps) {
    const currentStep = steps[selectedIndex];
    const meta = getStepTypeMeta(currentStep?.type);
    const [aspectRatioMode, setAspectRatioMode] = useState<'16-9' | 'fill'>('16-9');

    // Tek slaytlık geçici Topic nesnesi oluşturuyoruz ki LessonContentViewer sadece bu slaytı birebir tam çalışır olarak render etsin
    const singleSlideTopic: Topic = useMemo(() => {
        if (!currentStep) {
            return {
                id: 'preview-topic',
                title: topicTitle || 'Ders Sunumu',
                steps: [],
                isPublished: true,
                itemCount: 0
            };
        }
        return {
            id: 'preview-topic',
            title: topicTitle || 'Ders Sunumu',
            steps: [{ ...currentStep, isPublished: true }],
            isPublished: true,
            itemCount: 1
        };
    }, [currentStep, topicTitle]);

    const hasPrev = selectedIndex > 0;
    const hasNext = selectedIndex < steps.length - 1;

    return (
        <div className="flex flex-col h-full bg-slate-950/95 rounded-3xl border border-white/10 overflow-hidden shadow-2xl relative">
            {/* Slayt Sahnesi Üst Çubuğu */}
            <div className="p-3 border-b border-white/8 bg-slate-900/70 backdrop-blur-md flex items-center justify-between flex-shrink-0 gap-2">
                {/* Sol: Panel aç/kapa ve Slayt bilgisi */}
                <div className="flex items-center gap-2 min-w-0">
                    {onToggleLeftCollapse && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onToggleLeftCollapse}
                            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl"
                            title={isLeftCollapsed ? "Sol Slayt Şeridini Göster" : "Sol Slayt Şeridini Gizle"}
                        >
                            {isLeftCollapsed ? <PanelLeftOpen className="h-4 w-4 text-indigo-400" /> : <PanelLeftClose className="h-4 w-4" />}
                        </Button>
                    )}

                    <span className="text-xs font-black text-slate-400 font-mono">
                        #{selectedIndex + 1}
                    </span>
                    {currentStep && (
                        <span className={cn("inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-0.5 rounded-lg border", meta.color)}>
                            {meta.icon}
                            <span>{meta.label}</span>
                        </span>
                    )}
                    <h3 className="text-xs sm:text-sm font-black text-white truncate max-w-xs md:max-w-md hidden sm:block">
                        {currentStep?.title || 'Slayt Seçilmedi'}
                    </h3>
                </div>

                {/* Sağ: Görünüm butonları & Sağ panel aç/kapa */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* 16:9 / Fill Toggle */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAspectRatioMode(m => m === '16-9' ? 'fill' : '16-9')}
                        className="bg-slate-950 border-white/10 text-slate-300 hover:text-white rounded-xl text-xs h-8 px-2 hidden sm:flex"
                        title={aspectRatioMode === '16-9' ? "Tam Ekrana Sığdır" : "16:9 Akıllı Tahta Oranı"}
                    >
                        {aspectRatioMode === '16-9' ? <Tv className="h-3.5 w-3.5 mr-1 text-cyan-400" /> : <Monitor className="h-3.5 w-3.5 mr-1 text-purple-400" />}
                        <span className="text-[11px] font-bold">{aspectRatioMode === '16-9' ? '16:9 Tahta' : 'Esnek'}</span>
                    </Button>

                    <Button
                        size="sm"
                        onClick={onOpenFullscreenPreview}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs h-8 px-3 rounded-xl shadow-lg shadow-purple-950/40 cursor-pointer"
                    >
                        <Play className="h-3.5 w-3.5 mr-1.5 fill-current" /> ▶️ Sunumu Başlat
                    </Button>

                    {onToggleRightCollapse && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onToggleRightCollapse}
                            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl"
                            title={isRightCollapsed ? "Sağ Düzenleyiciyi Göster" : "Sağ Düzenleyiciyi Gizle"}
                        >
                            {isRightCollapsed ? <PanelRightOpen className="h-4 w-4 text-indigo-400" /> : <PanelRightClose className="h-4 w-4" />}
                        </Button>
                    )}
                </div>
            </div>

            {/* Canlı Slayt Sahnesi (Viewport & Exact 1:1 Stage) */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 flex items-center justify-center bg-slate-950/90 relative">
                {currentStep ? (
                    <div className={cn(
                        "w-full transition-all duration-300 flex items-center justify-center",
                        aspectRatioMode === '16-9' 
                            ? "max-w-5xl aspect-[16/9] min-h-[440px] max-h-[75vh]" 
                            : "w-full h-full min-h-[480px]"
                    )}>
                        {/* Akıllı Tahta Çerçevesi / Glow Frame */}
                        <div className="w-full h-full rounded-2xl sm:rounded-3xl border-2 border-white/15 bg-gradient-to-b from-slate-900/90 to-slate-950/95 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col relative p-1 sm:p-2 backdrop-blur-2xl">
                            <LessonContentViewer
                                key={`slide-viewer-${currentStep.id || selectedIndex}`}
                                topic={singleSlideTopic}
                                courseId="preview-course"
                                unitId="preview-unit"
                                courseTitle={courseTitle}
                                unitTitle={unitTitle}
                                onTopicComplete={() => {}}
                                progress={{ answers: {}, score: 0 }}
                                onProgressUpdate={() => {}}
                                isFullscreen={false}
                                animationSpeed="fast"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-20 text-slate-500">
                        <Wand2 className="h-16 w-16 mx-auto mb-4 text-orange-400 opacity-40 animate-pulse" />
                        <h4 className="text-lg font-black text-white mb-2">Slayt Bulunamadı</h4>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                            Sol taraftan bir slayt seçin veya yeni bir ders slaytı ekleyin.
                        </p>
                        {onOpenAi && (
                            <Button
                                onClick={onOpenAi}
                                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs rounded-xl"
                            >
                                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-yellow-300" /> ✨ AI ile Slayt Üret
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Sahne Alt Kontrol Çubuğu (Navigation) */}
            <div className="p-2.5 sm:p-3 border-t border-white/8 bg-slate-900/80 backdrop-blur-md flex items-center justify-between flex-shrink-0">
                {/* Sol: Önceki / Sonraki Butonları */}
                <div className="flex items-center gap-1.5">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={!hasPrev}
                        onClick={() => hasPrev && onSelectIndex(selectedIndex - 1)}
                        className="bg-slate-950 border-white/10 text-slate-300 hover:text-white rounded-xl text-xs h-8 px-2.5 disabled:opacity-30"
                    >
                        <ChevronLeft className="h-4 w-4 mr-0.5" /> Önceki
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={!hasNext}
                        onClick={() => hasNext && onSelectIndex(selectedIndex + 1)}
                        className="bg-slate-950 border-white/10 text-slate-300 hover:text-white rounded-xl text-xs h-8 px-2.5 disabled:opacity-30"
                    >
                        Sonraki <ChevronRight className="h-4 w-4 ml-0.5" />
                    </Button>
                </div>

                {/* Orta: Slayt Sayacı */}
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-400">
                        Slayt <strong className="text-white font-black">{steps.length > 0 ? selectedIndex + 1 : 0}</strong> / {steps.length}
                    </span>
                </div>

                {/* Sağ: Tam Ekran Bilgi & Buton */}
                <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 hidden md:inline-block">
                        💡 Birebir akıllı tahta önizlemesi
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onOpenFullscreenPreview}
                        className="text-slate-400 hover:text-white h-8 px-2 rounded-xl text-xs"
                        title="Tam Ekran Akıllı Tahta Modu"
                    >
                        <Maximize2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
