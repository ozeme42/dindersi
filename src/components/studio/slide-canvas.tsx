'use client';

import React, { useMemo } from 'react';
import type { LessonStep, Topic } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    ChevronLeft, ChevronRight, Play, Maximize2, Sparkles, 
    Layers, Wand2, Eye
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
};

export function SlideCanvas({
    steps,
    selectedIndex,
    onSelectIndex,
    topicTitle,
    courseTitle = 'Ders',
    unitTitle = 'Ünite',
    onOpenFullscreenPreview,
    onOpenAi
}: SlideCanvasProps) {
    const currentStep = steps[selectedIndex];
    const meta = getStepTypeMeta(currentStep?.type);

    // Tek slaytlık geçici Topic nesnesi oluşturuyoruz ki LessonContentViewer sadece bu slaytı göstersin
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
        <div className="flex flex-col h-full bg-slate-950/90 rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
            {/* Slayt Sahnesi Üst Çubuğu */}
            <div className="p-3.5 border-b border-white/8 bg-slate-900/60 backdrop-blur-md flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xs font-black text-slate-400 font-mono">
                        #{selectedIndex + 1}
                    </span>
                    {currentStep && (
                        <span className={cn("inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-0.5 rounded-lg border", meta.color)}>
                            {meta.icon}
                            <span>{meta.label}</span>
                        </span>
                    )}
                    <h3 className="text-sm font-black text-white truncate max-w-md">
                        {currentStep?.title || 'Slayt Seçilmedi'}
                    </h3>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                        size="sm"
                        onClick={onOpenFullscreenPreview}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs h-8 px-3 rounded-xl shadow-lg shadow-purple-950/40 cursor-pointer"
                    >
                        <Play className="h-3.5 w-3.5 mr-1.5 fill-current" /> ▶️ Akıllı Tahta Sunumunu Başlat
                    </Button>
                </div>
            </div>

            {/* Canlı Slayt Sahnesi (Viewport) */}
            <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center bg-slate-950 relative">
                {currentStep ? (
                    <div className="w-full max-w-4xl h-full min-h-[460px] flex flex-col justify-center">
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
                ) : (
                    <div className="text-center py-20 text-slate-500">
                        <Wand2 className="h-16 w-16 mx-auto mb-4 text-orange-400 opacity-40 animate-pulse" />
                        <h4 className="text-lg font-black text-white mb-2">Slayt Bulunamadı</h4>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                            Sol taraftan bir slayt seçin veya yukarıdaki menüden yeni bir ders slaytı ekleyin.
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

            {/* Sahne Alt Kontrol Çubuğu (Navigation & Zoom) */}
            <div className="p-3 border-t border-white/8 bg-slate-900/80 backdrop-blur-md flex items-center justify-between flex-shrink-0">
                {/* Sol: Önceki / Sonraki Butonları */}
                <div className="flex items-center gap-1.5">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={!hasPrev}
                        onClick={() => hasPrev && onSelectIndex(selectedIndex - 1)}
                        className="bg-slate-950 border-white/10 text-slate-300 hover:text-white rounded-xl text-xs h-8 px-2.5 disabled:opacity-30"
                    >
                        <ChevronLeft className="h-4 w-4 mr-0.5" /> Önceki Slayt
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={!hasNext}
                        onClick={() => hasNext && onSelectIndex(selectedIndex + 1)}
                        className="bg-slate-950 border-white/10 text-slate-300 hover:text-white rounded-xl text-xs h-8 px-2.5 disabled:opacity-30"
                    >
                        Sonraki Slayt <ChevronRight className="h-4 w-4 ml-0.5" />
                    </Button>
                </div>

                {/* Orta: Slayt Sayacı */}
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-400">
                        Slayt <strong className="text-white font-black">{steps.length > 0 ? selectedIndex + 1 : 0}</strong> / {steps.length}
                    </span>
                </div>

                {/* Sağ: Tam Ekran ve Bilgi */}
                <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 hidden sm:inline-block">
                        💡 Sağ paneldeki değişiklikler anlık buraya yansır
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onOpenFullscreenPreview}
                        className="text-slate-400 hover:text-white h-8 px-2 rounded-xl text-xs"
                        title="Büyük Ekran Önizleme"
                    >
                        <Maximize2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
