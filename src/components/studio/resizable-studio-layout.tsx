'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
    PanelLeftOpen, PanelLeftClose, PanelRightOpen, PanelRightClose, 
    Layers, Sliders, ChevronLeft, ChevronRight, GripVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type ResizableStudioLayoutProps = {
    leftPanel: React.ReactNode;
    centerPanel: React.ReactNode;
    rightPanel: React.ReactNode;
    leftTitle?: string;
    rightTitle?: string;
    defaultLeftWidth?: number;
    defaultRightWidth?: number;
};

export function ResizableStudioLayout({
    leftPanel,
    centerPanel,
    rightPanel,
    leftTitle = "Slaytlar",
    rightTitle = "Düzenleyici",
    defaultLeftWidth = 280,
    defaultRightWidth = 360,
}: ResizableStudioLayoutProps) {
    const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
    const [rightWidth, setRightWidth] = useState(defaultRightWidth);
    const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
    const [isRightCollapsed, setIsRightCollapsed] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const isDraggingLeft = useRef(false);
    const isDraggingRight = useRef(false);

    // Mouse Drag for Left Splitter
    const handleLeftMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isDraggingLeft.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const onMouseMove = (moveEvent: MouseEvent) => {
            if (!isDraggingLeft.current || !containerRef.current) return;
            const containerRect = containerRef.current.getBoundingClientRect();
            const newWidth = Math.max(180, Math.min(480, moveEvent.clientX - containerRect.left));
            setLeftWidth(newWidth);
        };

        const onMouseUp = () => {
            isDraggingLeft.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }, []);

    // Mouse Drag for Right Splitter
    const handleRightMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isDraggingRight.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const onMouseMove = (moveEvent: MouseEvent) => {
            if (!isDraggingRight.current || !containerRef.current) return;
            const containerRect = containerRef.current.getBoundingClientRect();
            const newWidth = Math.max(260, Math.min(580, containerRect.right - moveEvent.clientX));
            setRightWidth(newWidth);
        };

        const onMouseUp = () => {
            isDraggingRight.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }, []);

    return (
        <div 
            ref={containerRef}
            className="flex w-full h-[calc(100vh-130px)] min-h-[640px] overflow-hidden gap-0 relative select-none"
        >
            {/* ══ 1. SOL PANEL (Filmstrip) ══ */}
            {!isLeftCollapsed ? (
                <div 
                    style={{ width: `${leftWidth}px` }} 
                    className="flex-shrink-0 h-full overflow-hidden transition-[width] duration-75 relative flex flex-col"
                >
                    {leftPanel}
                </div>
            ) : (
                /* Sol Panel Kapalıyken İnce Dikey Bar */
                <div className="w-10 flex-shrink-0 h-full bg-slate-900/90 border border-white/10 rounded-2xl flex flex-col items-center py-3 gap-3 justify-between">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsLeftCollapsed(false)}
                        className="h-8 w-8 text-indigo-400 hover:text-white hover:bg-indigo-600/30 rounded-xl"
                        title="Sol Slayt Şeridini Aç"
                    >
                        <PanelLeftOpen className="h-4 w-4" />
                    </Button>
                    <span className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                        {leftTitle}
                    </span>
                    <Layers className="h-4 w-4 text-slate-600" />
                </div>
            )}

            {/* ══ SOL SPLITTER (Sürükleme Çizgisi) ══ */}
            {!isLeftCollapsed && (
                <div
                    onMouseDown={handleLeftMouseDown}
                    className="w-2 hover:w-2.5 h-full cursor-col-resize flex items-center justify-center group flex-shrink-0 transition-all z-20"
                    title="Genişliği ayarlamak için sürükleyin (Çift tıklayınca gizlenir)"
                    onDoubleClick={() => setIsLeftCollapsed(true)}
                >
                    <div className="w-0.5 h-16 rounded-full bg-white/10 group-hover:bg-indigo-500 group-hover:h-28 group-active:bg-indigo-400 transition-all" />
                </div>
            )}

            {/* ══ 2. MERKEZ PANEL (Canlı Slayt Kanvası) ══ */}
            <div className="flex-1 min-w-0 h-full overflow-hidden px-1">
                {/* Clone centerPanel with collapse toggle props if needed */}
                {React.isValidElement(centerPanel) 
                    ? React.cloneElement(centerPanel as React.ReactElement<any>, {
                        isLeftCollapsed,
                        onToggleLeftCollapse: () => setIsLeftCollapsed(v => !v),
                        isRightCollapsed,
                        onToggleRightCollapse: () => setIsRightCollapsed(v => !v),
                    })
                    : centerPanel
                }
            </div>

            {/* ══ SAĞ SPLITTER (Sürükleme Çizgisi) ══ */}
            {!isRightCollapsed && (
                <div
                    onMouseDown={handleRightMouseDown}
                    className="w-2 hover:w-2.5 h-full cursor-col-resize flex items-center justify-center group flex-shrink-0 transition-all z-20"
                    title="Genişliği ayarlamak için sürükleyin (Çift tıklayınca gizlenir)"
                    onDoubleClick={() => setIsRightCollapsed(true)}
                >
                    <div className="w-0.5 h-16 rounded-full bg-white/10 group-hover:bg-indigo-500 group-hover:h-28 group-active:bg-indigo-400 transition-all" />
                </div>
            )}

            {/* ══ 3. SAĞ PANEL (Anlık Düzenleyici / Inspector) ══ */}
            {!isRightCollapsed ? (
                <div 
                    style={{ width: `${rightWidth}px` }} 
                    className="flex-shrink-0 h-full overflow-hidden transition-[width] duration-75 relative flex flex-col"
                >
                    {rightPanel}
                </div>
            ) : (
                /* Sağ Panel Kapalıyken İnce Dikey Bar */
                <div className="w-10 flex-shrink-0 h-full bg-slate-900/90 border border-white/10 rounded-2xl flex flex-col items-center py-3 gap-3 justify-between">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsRightCollapsed(false)}
                        className="h-8 w-8 text-indigo-400 hover:text-white hover:bg-indigo-600/30 rounded-xl"
                        title="Sağ Düzenleyiciyi Aç"
                    >
                        <PanelRightOpen className="h-4 w-4" />
                    </Button>
                    <span className="[writing-mode:vertical-rl] text-[10px] font-black tracking-widest text-slate-400 uppercase">
                        {rightTitle}
                    </span>
                    <Sliders className="h-4 w-4 text-slate-600" />
                </div>
            )}
        </div>
    );
}
