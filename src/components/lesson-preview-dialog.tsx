'use client';

import React, { useState } from 'react';
import type { LessonStep, Topic } from '@/lib/types';
import { Button } from './ui/button';
import { X, Expand, Minimize, Play, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LessonContentViewer } from '@/components/lesson-content-viewer';

type LessonPreviewDialogProps = {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    steps: LessonStep[];
    topicTitle?: string;
    courseTitle?: string;
    unitTitle?: string;
};

export function LessonPreviewDialog({ 
    isOpen, 
    onOpenChange, 
    steps,
    topicTitle = 'Ders Önizlemesi',
    courseTitle = 'Ders',
    unitTitle = 'Ünite'
}: LessonPreviewDialogProps) {
    const [isFullscreen, setIsFullscreen] = useState(false);

    if (!isOpen) return null;

    const previewTopic: Topic = {
        id: 'preview-topic',
        title: topicTitle,
        steps: steps.map((s, idx) => ({
            ...s,
            id: (s as any).id || `preview_step_${idx}`,
            isPublished: s.isPublished !== undefined ? s.isPublished : true,
        })),
        isPublished: true,
        itemCount: steps.length
    };

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    const handleClose = () => {
        onOpenChange(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-in fade-in-0 duration-200">
            <div 
                className={cn(
                    "relative w-full h-full flex flex-col bg-slate-950 border border-white/15 text-slate-100 shadow-2xl rounded-3xl overflow-hidden transition-all duration-200",
                    isFullscreen ? "max-w-none max-h-none rounded-none border-0" : "max-w-7xl max-h-[95vh]"
                )}
            >
                {/* Header Toolbar */}
                <div className="flex-shrink-0 px-5 py-3.5 border-b border-white/10 bg-slate-900/90 backdrop-blur-md flex justify-between items-center z-30">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                            <Sparkles className="h-4 w-4 text-yellow-300 animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                                {topicTitle}
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                                    Canlı Akıllı Tahta Önizlemesi ({steps.length} Adım)
                                </span>
                            </h3>
                            <p className="text-[11px] text-slate-400 hidden sm:block">
                                Bu ekran, hazırladığınız ders adımlarının akıllı tahtada ve öğrenci ekranında nasıl çalışacağını birebir gösterir.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={toggleFullscreen}
                            className="bg-slate-900 border-white/10 text-slate-300 hover:text-white rounded-xl text-xs h-8 px-2.5"
                        >
                            {isFullscreen ? (
                                <><Minimize className="h-3.5 w-3.5 mr-1.5" /> Küçült</>
                            ) : (
                                <><Expand className="h-3.5 w-3.5 mr-1.5" /> Tam Ekran</>
                            )}
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleClose}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                {/* Live Lesson Content Viewer */}
                <div className="flex-1 w-full h-full min-h-0 relative overflow-hidden bg-slate-950">
                    {steps.length > 0 ? (
                        <LessonContentViewer
                            topic={previewTopic}
                            courseId="preview-course"
                            unitId="preview-unit"
                            courseTitle={courseTitle}
                            unitTitle={unitTitle}
                            onTopicComplete={() => {}}
                            progress={undefined}
                            onProgressUpdate={() => {}}
                            isFullscreen={isFullscreen}
                            isSingleCardMode={true}
                            animationSpeed="normal"
                            fontSizeScale="normal"
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center p-8">
                            <Play className="h-16 w-16 mb-4 text-purple-400/40" />
                            <p className="text-xl font-bold text-white mb-2">Henüz ders adımı eklenmedi.</p>
                            <p className="text-xs text-slate-400 max-w-sm">
                                Önizleme yapabilmek için lütfen 'AI Stüdyosu' veya 'Adım Ekle' butonlarını kullanarak ders akışınıza slaytlar ekleyin.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
