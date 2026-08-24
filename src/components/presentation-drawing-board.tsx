'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
    Pencil, Highlighter, Eraser, MoveRight, Square, Circle, 
    Type, Undo2, Redo2, Trash2, Download, Eye, EyeOff, 
    X, Sparkles, Wand2, Grid, AlignJustify, Palette, ChevronUp,
    ChevronDown, GripVertical, Shapes, MoreHorizontal, Minus
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';

export type DrawingTool = 
    | 'pen' 
    | 'highlighter' 
    | 'laser' 
    | 'arrow' 
    | 'line' 
    | 'rect' 
    | 'circle' 
    | 'eraser' 
    | 'text';

export type BoardSurface = 'transparent' | 'white' | 'dark' | 'grid' | 'lined';

interface LaserPoint {
    x: number;
    y: number;
    alpha: number;
    size: number;
}

interface TextItem {
    id: string;
    text: string;
    x: number;
    y: number;
    color: string;
    fontSize: number;
}

export interface PresentationDrawingBoardProps {
    isOpen: boolean;
    onClose: () => void;
    isDarkMode?: boolean;
}

const PRESET_COLORS = [
    { label: 'Kırmızı', value: '#ef4444' },
    { label: 'Sarı', value: '#eab308' },
    { label: 'Yeşil', value: '#22c55e' },
    { label: 'Cyan / Camgöbeği', value: '#06b6d4' },
    { label: 'Mavi', value: '#3b82f6' },
    { label: 'Mor', value: '#a855f7' },
    { label: 'Pembe', value: '#ec4899' },
    { label: 'Turuncu', value: '#f97316' },
    { label: 'Beyaz', value: '#ffffff' },
    { label: 'Siyah', value: '#0f172a' },
];

const PRESET_STROKES = [
    { label: 'İnce', value: 2 },
    { label: 'Normal', value: 5 },
    { label: 'Kalın', value: 10 },
    { label: 'Vurgu', value: 18 },
    { label: 'Dev', value: 30 },
];

export function PresentationDrawingBoard({
    isOpen,
    onClose,
    isDarkMode = true
}: PresentationDrawingBoardProps) {
    const { toast } = useToast();

    // Canvas Referansları
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const tempCanvasRef = useRef<HTMLCanvasElement>(null);
    const laserCanvasRef = useRef<HTMLCanvasElement>(null);

    // Contexts
    const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
    const [tempCtx, setTempCtx] = useState<CanvasRenderingContext2D | null>(null);
    const [laserCtx, setLaserCtx] = useState<CanvasRenderingContext2D | null>(null);

    // Çizim Ayarları
    const [tool, setTool] = useState<DrawingTool>('pen');
    const [color, setColor] = useState('#06b6d4'); // Parlak Cyan
    const [strokeWidth, setStrokeWidth] = useState(4);
    const [surface, setSurface] = useState<BoardSurface>('transparent');
    const [isDrawing, setIsDrawing] = useState(false);
    const [isLayerVisible, setIsLayerVisible] = useState(true);

    // Toolbar Durumları (Varsayılan: Alt Çubuk)
    const [toolbarPosition, setToolbarPosition] = useState<'top' | 'bottom'>('bottom');

    // Metin Ekleme
    const [textItems, setTextItems] = useState<TextItem[]>([]);
    const [activeTextInput, setActiveTextInput] = useState<{ x: number; y: number } | null>(null);
    const [currentTextValue, setCurrentTextValue] = useState('');

    // Geçmiş (Undo / Redo)
    const [history, setHistory] = useState<ImageData[]>([]);
    const [historyStep, setHistoryStep] = useState(-1);

    // Çizim Yolu (Bezier Yumuşatma)
    const pointsRef = useRef<{ x: number; y: number }[]>([]);
    const startPointRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    // Lazer Kuyruğu
    const laserPointsRef = useRef<LaserPoint[]>([]);
    const laserAnimRef = useRef<number | null>(null);

    // ─── CANVAS BOYUTLANDIRMA & BAŞLATMA ───
    const initCanvases = useCallback(() => {
        if (!containerRef.current) return;
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        if (canvasRef.current) {
            canvasRef.current.width = width;
            canvasRef.current.height = height;
            const c = canvasRef.current.getContext('2d', { willReadFrequently: true });
            if (c) {
                c.lineCap = 'round';
                c.lineJoin = 'round';
                setCtx(c);

                // İlk boş snapshot kaydet
                const snapshot = c.getImageData(0, 0, width, height);
                setHistory([snapshot]);
                setHistoryStep(0);
            }
        }

        if (tempCanvasRef.current) {
            tempCanvasRef.current.width = width;
            tempCanvasRef.current.height = height;
            const tc = tempCanvasRef.current.getContext('2d');
            if (tc) {
                tc.lineCap = 'round';
                tc.lineJoin = 'round';
                setTempCtx(tc);
            }
        }

        if (laserCanvasRef.current) {
            laserCanvasRef.current.width = width;
            laserCanvasRef.current.height = height;
            const lc = laserCanvasRef.current.getContext('2d');
            if (lc) setLaserCtx(lc);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            initCanvases();
            const handleResize = () => initCanvases();
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
    }, [isOpen, initCanvases]);

    // ─── GEÇMİŞ KAYIT (SNAPSHOT) ───
    const saveSnapshot = useCallback(() => {
        if (!ctx || !canvasRef.current) return;
        const w = canvasRef.current.width;
        const h = canvasRef.current.height;
        const snapshot = ctx.getImageData(0, 0, w, h);

        setHistory(prev => {
            const nextHistory = prev.slice(0, historyStep + 1);
            if (nextHistory.length >= 25) nextHistory.shift();
            return [...nextHistory, snapshot];
        });
        setHistoryStep(prev => Math.min(prev + 1, 24));
    }, [ctx, historyStep]);

    // ─── GERİ AL / İLERİ AL ───
    const undo = useCallback(() => {
        if (!ctx || !canvasRef.current || historyStep <= 0) return;
        const targetStep = historyStep - 1;
        const targetSnapshot = history[targetStep];
        if (targetSnapshot) {
            ctx.putImageData(targetSnapshot, 0, 0);
            setHistoryStep(targetStep);
        }
    }, [ctx, history, historyStep]);

    const redo = useCallback(() => {
        if (!ctx || !canvasRef.current || historyStep >= history.length - 1) return;
        const targetStep = historyStep + 1;
        const targetSnapshot = history[targetStep];
        if (targetSnapshot) {
            ctx.putImageData(targetSnapshot, 0, 0);
            setHistoryStep(targetStep);
        }
    }, [ctx, history, historyStep]);

    // ─── TÜMÜNÜ TEMİZLE ───
    const clearCanvas = useCallback(() => {
        if (!ctx || !canvasRef.current) return;
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        setTextItems([]);
        setActiveTextInput(null);
        saveSnapshot();
        toast({ title: 'Tahta Temizlendi', description: 'Tüm çizimler temizlendi.' });
    }, [ctx, saveSnapshot, toast]);

    // ─── KOORDİNAT HESAPLAMA ───
    const getCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    };

    // ─── LAZER ANİMASYON DÖNGÜSÜ ───
    useEffect(() => {
        if (!isOpen) return;

        const animateLaser = () => {
            if (laserCtx && laserCanvasRef.current) {
                laserCtx.clearRect(0, 0, laserCanvasRef.current.width, laserCanvasRef.current.height);

                laserPointsRef.current = laserPointsRef.current
                    .map(p => ({ ...p, alpha: p.alpha - 0.04, size: p.size * 0.95 }))
                    .filter(p => p.alpha > 0);

                laserPointsRef.current.forEach((point) => {
                    laserCtx.save();
                    laserCtx.beginPath();
                    laserCtx.arc(point.x, point.y, Math.max(point.size, 2), 0, Math.PI * 2);
                    laserCtx.fillStyle = `rgba(239, 68, 68, ${point.alpha})`;
                    laserCtx.shadowColor = '#ef4444';
                    laserCtx.shadowBlur = 15;
                    laserCtx.fill();
                    laserCtx.restore();
                });
            }
            laserAnimRef.current = requestAnimationFrame(animateLaser);
        };

        laserAnimRef.current = requestAnimationFrame(animateLaser);
        return () => {
            if (laserAnimRef.current) cancelAnimationFrame(laserAnimRef.current);
        };
    }, [isOpen, laserCtx]);

    // ─── OK ÇİZME YARDIMCISI ───
    const drawArrow = (context: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number) => {
        const headlen = Math.max(strokeWidth * 3.5, 14);
        const dx = toX - fromX;
        const dy = toY - fromY;
        const angle = Math.atan2(dy, dx);

        context.beginPath();
        context.moveTo(fromX, fromY);
        context.lineTo(toX, toY);
        context.stroke();

        // Ok Başı
        context.beginPath();
        context.moveTo(toX, toY);
        context.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
        context.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
        context.closePath();
        context.fillStyle = context.strokeStyle;
        context.fill();
    };

    // ─── POINTER EVENT HANDLERS ───
    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!ctx || !canvasRef.current) return;
        const coords = getCoords(e);

        if (tool === 'text') {
            setActiveTextInput(coords);
            setCurrentTextValue('');
            return;
        }

        setIsDrawing(true);
        startPointRef.current = coords;
        pointsRef.current = [coords];

        if (tool === 'laser') {
            laserPointsRef.current.push({ x: coords.x, y: coords.y, alpha: 1.0, size: strokeWidth * 2.5 });
            return;
        }

        if (tool === 'pen' || tool === 'highlighter' || tool === 'eraser') {
            ctx.save();
            if (tool === 'eraser') {
                ctx.globalCompositeOperation = surface === 'transparent' ? 'destination-out' : 'source-over';
                ctx.strokeStyle = surface === 'white' ? '#ffffff' : (surface === 'dark' ? '#020617' : '#000000');
                ctx.lineWidth = strokeWidth * 3;
            } else if (tool === 'highlighter') {
                ctx.globalCompositeOperation = 'source-over';
                ctx.strokeStyle = color;
                ctx.globalAlpha = 0.35;
                ctx.lineWidth = strokeWidth * 3;
            } else {
                ctx.globalCompositeOperation = 'source-over';
                ctx.strokeStyle = color;
                ctx.globalAlpha = 1.0;
                ctx.lineWidth = strokeWidth;
            }

            ctx.beginPath();
            ctx.moveTo(coords.x, coords.y);
            ctx.lineTo(coords.x, coords.y);
            ctx.stroke();
        }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const coords = getCoords(e);

        if (tool === 'laser') {
            laserPointsRef.current.push({ x: coords.x, y: coords.y, alpha: 1.0, size: strokeWidth * 2.5 });
            return;
        }

        if (!isDrawing || !ctx || !tempCtx || !tempCanvasRef.current) return;

        if (tool === 'pen' || tool === 'highlighter' || tool === 'eraser') {
            pointsRef.current.push(coords);

            // Bezier eğrisi ile pürüzsüz interpolasyon
            if (pointsRef.current.length >= 3) {
                const len = pointsRef.current.length;
                const xc = (pointsRef.current[len - 2].x + pointsRef.current[len - 1].x) / 2;
                const yc = (pointsRef.current[len - 2].y + pointsRef.current[len - 1].y) / 2;

                ctx.quadraticCurveTo(pointsRef.current[len - 2].x, pointsRef.current[len - 2].y, xc, yc);
                ctx.stroke();
            }
        } else {
            // Şekil Çizimi (Geçici Canvas'ta Canlı Önizleme)
            tempCtx.clearRect(0, 0, tempCanvasRef.current.width, tempCanvasRef.current.height);
            tempCtx.strokeStyle = color;
            tempCtx.lineWidth = strokeWidth;
            tempCtx.globalAlpha = 1.0;

            const startX = startPointRef.current.x;
            const startY = startPointRef.current.y;
            const width = coords.x - startX;
            const height = coords.y - startY;

            if (tool === 'line') {
                tempCtx.beginPath();
                tempCtx.moveTo(startX, startY);
                tempCtx.lineTo(coords.x, coords.y);
                tempCtx.stroke();
            } else if (tool === 'arrow') {
                drawArrow(tempCtx, startX, startY, coords.x, coords.y);
            } else if (tool === 'rect') {
                tempCtx.strokeRect(startX, startY, width, height);
            } else if (tool === 'circle') {
                tempCtx.beginPath();
                const radiusX = Math.abs(width / 2);
                const radiusY = Math.abs(height / 2);
                const centerX = startX + width / 2;
                const centerY = startY + height / 2;
                tempCtx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
                tempCtx.stroke();
            }
        }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawing && tool !== 'laser') return;
        setIsDrawing(false);

        if (tool === 'laser') return;

        if (!ctx || !canvasRef.current || !tempCanvasRef.current || !tempCtx) return;

        if (tool === 'pen' || tool === 'highlighter' || tool === 'eraser') {
            ctx.restore();
        } else {
            // Geçici canvas'taki şekli ana canvas'a aktar
            const coords = getCoords(e);
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = strokeWidth;
            ctx.globalAlpha = 1.0;

            const startX = startPointRef.current.x;
            const startY = startPointRef.current.y;
            const width = coords.x - startX;
            const height = coords.y - startY;

            if (tool === 'line') {
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(coords.x, coords.y);
                ctx.stroke();
            } else if (tool === 'arrow') {
                drawArrow(ctx, startX, startY, coords.x, coords.y);
            } else if (tool === 'rect') {
                ctx.strokeRect(startX, startY, width, height);
            } else if (tool === 'circle') {
                ctx.beginPath();
                const radiusX = Math.abs(width / 2);
                const radiusY = Math.abs(height / 2);
                const centerX = startX + width / 2;
                const centerY = startY + height / 2;
                ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.restore();
            tempCtx.clearRect(0, 0, tempCanvasRef.current.width, tempCanvasRef.current.height);
        }

        pointsRef.current = [];
        saveSnapshot();
    };

    // ─── METİN EKLEME ONAYI ───
    const handleAddText = () => {
        if (!activeTextInput || !currentTextValue.trim()) {
            setActiveTextInput(null);
            return;
        }

        const newItem: TextItem = {
            id: Date.now().toString(),
            text: currentTextValue,
            x: activeTextInput.x,
            y: activeTextInput.y,
            color: color,
            fontSize: Math.max(strokeWidth * 4, 18),
        };

        if (ctx) {
            ctx.save();
            ctx.font = `bold ${newItem.fontSize}px sans-serif`;
            ctx.fillStyle = newItem.color;
            ctx.fillText(newItem.text, newItem.x, newItem.y + newItem.fontSize);
            ctx.restore();
            saveSnapshot();
        }

        setTextItems(prev => [...prev, newItem]);
        setActiveTextInput(null);
        setCurrentTextValue('');
    };

    // ─── ÇİZİMİ / GÖRÜNTÜYÜ İNDİR (PNG) ───
    const exportDrawing = () => {
        if (!canvasRef.current) return;
        const link = document.createElement('a');
        link.download = `dindersi-not-${new Date().toISOString().slice(0, 10)}.png`;
        link.href = canvasRef.current.toDataURL('image/png');
        link.click();
        toast({ title: 'Kaydedildi', description: 'Çizim ve notlar PNG olarak indirildi.' });
    };

    // ─── KLAVYE KISAYOLLARI ───
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (activeTextInput) return; // Metin yazarken engelle

            if (e.key === 'p' || e.key === 'P') setTool('pen');
            else if (e.key === 'h' || e.key === 'H') setTool('highlighter');
            else if (e.key === 'l' || e.key === 'L') setTool('laser');
            else if (e.key === 'e' || e.key === 'E') setTool('eraser');
            else if (e.key === 'a' || e.key === 'A') setTool('arrow');
            else if (e.key === 'r' || e.key === 'R') setTool('rect');
            else if (e.key === 'c' || e.key === 'C') setTool('circle');
            else if (e.key === 't' || e.key === 'T') setTool('text');
            else if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) {
                e.preventDefault();
                undo();
            } else if (e.ctrlKey && (e.key === 'y' || e.key === 'Y')) {
                e.preventDefault();
                redo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, activeTextInput, undo, redo]);

    if (!isOpen) return null;

    return (
        <div 
            ref={containerRef}
            className={cn(
                "fixed inset-0 z-50 overflow-hidden select-none transition-colors duration-300 pointer-events-auto",
                surface === 'white' && "bg-white",
                surface === 'dark' && "bg-[#020617]",
                surface === 'grid' && "bg-[#020617] bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px]",
                surface === 'lined' && "bg-[#020617] bg-[linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] [background-size:100%_36px]",
                surface === 'transparent' && "bg-black/10 backdrop-blur-[0.5px]"
            )}
        >
            {/* ══ ÇİZİM KATMANLARI (CANVAS) ══ */}
            <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className={cn(
                    "absolute inset-0 w-full h-full touch-none z-10",
                    !isLayerVisible && "opacity-0 pointer-events-none",
                    tool === 'laser' ? "cursor-crosshair" : (tool === 'eraser' ? "cursor-cell" : "cursor-crosshair")
                )}
            />

            {/* Geçici Şekil Önizleme Katmanı */}
            <canvas
                ref={tempCanvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none z-20 touch-none"
            />

            {/* Lazer Katmanı */}
            <canvas
                ref={laserCanvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none z-30 touch-none"
            />

            {/* Metin Giriş Alanı */}
            {activeTextInput && (
                <div 
                    className="absolute z-40 flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-white/20 shadow-2xl backdrop-blur-xl"
                    style={{ left: activeTextInput.x, top: activeTextInput.y }}
                >
                    <input
                        type="text"
                        autoFocus
                        value={currentTextValue}
                        onChange={(e) => setCurrentTextValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddText();
                            if (e.key === 'Escape') setActiveTextInput(null);
                        }}
                        placeholder="Notunuzu yazın ve Enter'a basın..."
                        className="h-9 px-3 text-sm bg-transparent border-0 text-white font-bold placeholder:text-slate-500 focus:outline-none min-w-[240px]"
                    />
                    <Button size="sm" onClick={handleAddText} className="h-7 px-2.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white">
                        Ekle
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setActiveTextInput(null)} className="h-7 w-7 p-0 text-slate-400 hover:text-white">
                        <X className="w-3.5 h-3.5" />
                    </Button>
                </div>
            )}

            {/* ══ ULTRA-KOMPAKT SÜRÜKLENEBİLİR ÇİZİM ARAÇ ÇUBUĞU ══ */}
            <motion.div
                drag
                dragMomentum={false}
                dragConstraints={containerRef}
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 30, opacity: 0 }}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center touch-none"
            >
                {/* Ana Kompakt Kapsayıcı */}
                <div className="flex items-center gap-1 p-1.5 rounded-2xl bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-3xl border border-white/20 shadow-[0_0_40px_rgba(0,0,0,0.8)] text-white select-none">
                    
                    {/* Sürükleme Tutamacı */}
                    <div 
                        className="flex items-center justify-center px-1 py-1.5 cursor-grab active:cursor-grabbing text-slate-400 hover:text-white border-r border-white/15"
                        title="Sürüklemek için basılı tutun"
                    >
                        <GripVertical className="w-4 h-4" />
                    </div>

                    {/* 1. Ana Araçlar (Kalem, Fosforlu, Lazer, Şekiller, Silgi) */}
                    <div className="flex items-center gap-0.5 pr-1 border-r border-white/15">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setTool('pen')}
                            className={cn(
                                "h-9 w-9 rounded-xl transition-all",
                                tool === 'pen' ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/40" : "text-slate-300 hover:bg-white/10"
                            )}
                            title="Kalem (P)"
                        >
                            <Pencil className="w-4 h-4" />
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setTool('highlighter')}
                            className={cn(
                                "h-9 w-9 rounded-xl transition-all",
                                tool === 'highlighter' ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/40" : "text-slate-300 hover:bg-white/10"
                            )}
                            title="Fosforlu Vurgulayıcı (H)"
                        >
                            <Highlighter className="w-4 h-4" />
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setTool('laser')}
                            className={cn(
                                "h-9 w-9 rounded-xl transition-all",
                                tool === 'laser' ? "bg-rose-600 text-white shadow-md shadow-rose-500/40 animate-pulse" : "text-slate-300 hover:bg-white/10"
                            )}
                            title="Lazer İşaretçi (L)"
                        >
                            <Wand2 className="w-4 h-4 text-rose-300" />
                        </Button>

                        {/* Şekiller & Metin Açılır Menüsü */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        "h-9 w-9 rounded-xl transition-all",
                                        ['arrow', 'rect', 'circle', 'line', 'text'].includes(tool) ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/40" : "text-slate-300 hover:bg-white/10"
                                    )}
                                    title="Şekiller & Metin"
                                >
                                    {tool === 'arrow' ? <MoveRight className="w-4 h-4" /> : 
                                     tool === 'rect' ? <Square className="w-4 h-4" /> :
                                     tool === 'circle' ? <Circle className="w-4 h-4" /> :
                                     tool === 'text' ? <Type className="w-4 h-4" /> :
                                     <Shapes className="w-4 h-4" />}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent side="top" align="center" className="w-48 p-2 rounded-2xl border-white/20 bg-slate-950/95 backdrop-blur-3xl shadow-2xl text-white mb-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2 py-1">Şekiller & Metin</span>
                                <div className="space-y-1">
                                    <button
                                        onClick={() => setTool('arrow')}
                                        className={cn(
                                            "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all",
                                            tool === 'arrow' ? "bg-indigo-600 text-white" : "hover:bg-white/10 text-slate-300"
                                        )}
                                    >
                                        <MoveRight className="w-4 h-4" /> <span>Ok Çiz (A)</span>
                                    </button>
                                    <button
                                        onClick={() => setTool('rect')}
                                        className={cn(
                                            "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all",
                                            tool === 'rect' ? "bg-indigo-600 text-white" : "hover:bg-white/10 text-slate-300"
                                        )}
                                    >
                                        <Square className="w-4 h-4" /> <span>Dikdörtgen (R)</span>
                                    </button>
                                    <button
                                        onClick={() => setTool('circle')}
                                        className={cn(
                                            "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all",
                                            tool === 'circle' ? "bg-indigo-600 text-white" : "hover:bg-white/10 text-slate-300"
                                        )}
                                    >
                                        <Circle className="w-4 h-4" /> <span>Çember (C)</span>
                                    </button>
                                    <button
                                        onClick={() => setTool('line')}
                                        className={cn(
                                            "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all",
                                            tool === 'line' ? "bg-indigo-600 text-white" : "hover:bg-white/10 text-slate-300"
                                        )}
                                    >
                                        <Minus className="w-4 h-4" /> <span>Düz Çizgi</span>
                                    </button>
                                    <button
                                        onClick={() => setTool('text')}
                                        className={cn(
                                            "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all",
                                            tool === 'text' ? "bg-indigo-600 text-white" : "hover:bg-white/10 text-slate-300"
                                        )}
                                    >
                                        <Type className="w-4 h-4" /> <span>Metin Ekle (T)</span>
                                    </button>
                                </div>
                            </PopoverContent>
                        </Popover>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setTool('eraser')}
                            className={cn(
                                "h-9 w-9 rounded-xl transition-all",
                                tool === 'eraser' ? "bg-slate-700 text-white border border-white/30" : "text-slate-300 hover:bg-white/10"
                            )}
                            title="Silgi (E)"
                        >
                            <Eraser className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* 2. Renk ve Kalınlık Birleşik Butonu */}
                    <div className="flex items-center px-1 border-r border-white/15">
                        <Popover>
                            <PopoverTrigger asChild>
                                <button
                                    className="h-9 px-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 border border-white/10 transition-all"
                                    title="Renk & Kalınlık Seç"
                                >
                                    <div 
                                        className="w-4 h-4 rounded-full border border-white/60 shadow-sm"
                                        style={{ backgroundColor: color }}
                                    />
                                    <span className="text-[11px] font-mono">{strokeWidth}px</span>
                                </button>
                            </PopoverTrigger>
                            <PopoverContent side="top" align="center" className="w-64 p-3 rounded-2xl border-white/20 bg-slate-950/95 backdrop-blur-3xl shadow-2xl text-white mb-2">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Renk Paleti</span>
                                <div className="grid grid-cols-5 gap-1.5 mb-3">
                                    {PRESET_COLORS.map((c) => (
                                        <button
                                            key={c.value}
                                            onClick={() => setColor(c.value)}
                                            className={cn(
                                                "w-9 h-9 rounded-xl border-2 transition-transform hover:scale-110 active:scale-90 flex items-center justify-center",
                                                color === c.value ? "border-white shadow-lg scale-105" : "border-transparent"
                                            )}
                                            style={{ backgroundColor: c.value }}
                                            title={c.label}
                                        />
                                    ))}
                                </div>
                                <div className="flex items-center gap-2 pt-2 pb-3 border-t border-white/10">
                                    <span className="text-xs text-slate-400">Özel:</span>
                                    <input 
                                        type="color" 
                                        value={color} 
                                        onChange={(e) => setColor(e.target.value)} 
                                        className="w-full h-7 bg-transparent border-0 cursor-pointer rounded-lg"
                                    />
                                </div>
                                <div className="pt-2 border-t border-white/10">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Kalınlık</span>
                                        <span className="text-xs font-bold text-cyan-400">{strokeWidth} px</span>
                                    </div>
                                    <div className="grid grid-cols-5 gap-1 mb-2">
                                        {PRESET_STROKES.map((s) => (
                                            <button
                                                key={s.value}
                                                onClick={() => setStrokeWidth(s.value)}
                                                className={cn(
                                                    "py-1 rounded-lg text-xs font-bold transition-all border",
                                                    strokeWidth === s.value ? "bg-indigo-600 border-indigo-400 text-white" : "border-white/10 hover:bg-white/10 text-slate-300"
                                                )}
                                            >
                                                {s.value}
                                            </button>
                                        ))}
                                    </div>
                                    <Slider
                                        value={[strokeWidth]}
                                        min={1}
                                        max={40}
                                        step={1}
                                        onValueChange={(val) => setStrokeWidth(val[0])}
                                        className="py-1"
                                    />
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* 3. Tahta Arka Plan Türü */}
                    <div className="flex items-center px-0.5 border-r border-white/15">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-300 hover:bg-white/10" title="Tahta Arka Planı">
                                    <Palette className="w-4 h-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent side="top" align="center" className="w-56 p-2 rounded-2xl border-white/20 bg-slate-950/95 backdrop-blur-3xl shadow-2xl text-white mb-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2 py-1">Tahta Modu</span>
                                <div className="space-y-1">
                                    <button
                                        onClick={() => setSurface('transparent')}
                                        className={cn(
                                            "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all",
                                            surface === 'transparent' ? "bg-indigo-600 border-indigo-400 text-white" : "border-white/10 hover:bg-white/10 text-slate-300"
                                        )}
                                    >
                                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                                        <span>Şeffaf Sunum</span>
                                    </button>
                                    <button
                                        onClick={() => setSurface('dark')}
                                        className={cn(
                                            "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all",
                                            surface === 'dark' ? "bg-indigo-600 border-indigo-400 text-white" : "border-white/10 hover:bg-white/10 text-slate-300"
                                        )}
                                    >
                                        <div className="w-3.5 h-3.5 rounded bg-slate-950 border border-slate-700" />
                                        <span>Kara Tahta</span>
                                    </button>
                                    <button
                                        onClick={() => setSurface('white')}
                                        className={cn(
                                            "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all",
                                            surface === 'white' ? "bg-indigo-600 border-indigo-400 text-white" : "border-white/10 hover:bg-white/10 text-slate-300"
                                        )}
                                    >
                                        <div className="w-3.5 h-3.5 rounded bg-white" />
                                        <span>Beyaz Tahta</span>
                                    </button>
                                    <button
                                        onClick={() => setSurface('grid')}
                                        className={cn(
                                            "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all",
                                            surface === 'grid' ? "bg-indigo-600 border-indigo-400 text-white" : "border-white/10 hover:bg-white/10 text-slate-300"
                                        )}
                                    >
                                        <Grid className="w-3.5 h-3.5 text-slate-400" />
                                        <span>Kareli Defter</span>
                                    </button>
                                    <button
                                        onClick={() => setSurface('lined')}
                                        className={cn(
                                            "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all",
                                            surface === 'lined' ? "bg-indigo-600 border-indigo-400 text-white" : "border-white/10 hover:bg-white/10 text-slate-300"
                                        )}
                                    >
                                        <AlignJustify className="w-3.5 h-3.5 text-slate-400" />
                                        <span>Çizgili Defter</span>
                                    </button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* 4. Geri Al & Temizle & Diğer */}
                    <div className="flex items-center gap-0.5 px-0.5 border-r border-white/15">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={undo}
                            disabled={historyStep <= 0}
                            className="h-9 w-9 rounded-xl text-slate-300 hover:bg-white/10 disabled:opacity-20"
                            title="Geri Al (Ctrl+Z)"
                        >
                            <Undo2 className="w-4 h-4" />
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={clearCanvas}
                            className="h-9 w-9 rounded-xl text-rose-400 hover:bg-rose-500/20"
                            title="Tümünü Temizle"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-400 hover:bg-white/10" title="Daha Fazla">
                                    <MoreHorizontal className="w-4 h-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent side="top" align="center" className="w-48 p-2 rounded-2xl border-white/20 bg-slate-950/95 backdrop-blur-3xl shadow-2xl text-white mb-2">
                                <div className="space-y-1">
                                    <button
                                        onClick={redo}
                                        disabled={historyStep >= history.length - 1}
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold hover:bg-white/10 disabled:opacity-30 transition-all text-slate-300"
                                    >
                                        <Redo2 className="w-4 h-4" /> <span>İleri Al (Ctrl+Y)</span>
                                    </button>
                                    <button
                                        onClick={() => setIsLayerVisible(prev => !prev)}
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold hover:bg-white/10 transition-all text-slate-300"
                                    >
                                        {isLayerVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        <span>{isLayerVisible ? 'Çizimleri Gizle' : 'Çizimleri Göster'}</span>
                                    </button>
                                    <button
                                        onClick={exportDrawing}
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold hover:bg-white/10 transition-all text-emerald-400"
                                    >
                                        <Download className="w-4 h-4" /> <span>PNG Olarak İndir</span>
                                    </button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* 5. Kapat Butonu */}
                    <div className="flex items-center pl-0.5">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="h-9 w-9 rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30 transition-all active:scale-95"
                            title="Çizim Modunu Kapat (Esc / D)"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </motion.div>

            {/* Sağ Üst Sabit Hızlı Kapatma Butonu */}
            <div className="fixed top-3 right-4 z-50">
                <Button
                    onClick={onClose}
                    size="sm"
                    className="h-9 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-lg shadow-rose-600/40 gap-1.5 border border-rose-400/40 active:scale-95 transition-all"
                >
                    <X className="w-4 h-4" />
                    <span>Çizimi Kapat (D)</span>
                </Button>
            </div>
        </div>
    );
}
