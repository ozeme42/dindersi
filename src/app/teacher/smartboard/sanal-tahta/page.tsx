'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
    Pencil, Eraser, Highlighter, MousePointer2, Square, Circle, Minus, 
    Undo2, Trash2, Download, Grid3X3, AlignJustify, Maximize2, Settings2, 
    Palette, Type, X, Check, Image as ImageIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

type Tool = 'pen' | 'marker' | 'eraser' | 'line' | 'rect' | 'circle';
type BackgroundType = 'blank' | 'grid' | 'lined' | 'dots';

export default function VirtualBoardPage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
    
    // Araç Durumları
    const [tool, setTool] = useState<Tool>('pen');
    const [color, setColor] = useState('#38bdf8'); // Default Cyan
    const [lineWidth, setLineWidth] = useState(3);
    const [background, setBackground] = useState<BackgroundType>('grid');
    const [history, setHistory] = useState<ImageData[]>([]);
    const [historyStep, setHistoryStep] = useState(-1);
    
    // Çizim Başlangıç Pozisyonu (Şekiller için)
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [snapshot, setSnapshot] = useState<ImageData | null>(null);

    const { toast } = useToast();

    // Renk Paleti (Cyber Tema)
    const colors = [
        '#ffffff', // Beyaz
        '#38bdf8', // Cyan
        '#f472b6', // Pink
        '#a78bfa', // Purple
        '#34d399', // Emerald
        '#fbbf24', // Amber
        '#f87171', // Red
        '#94a3b8', // Slate (Silik)
    ];

    // Canvas Başlatma ve Boyutlandırma
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        // Container boyutuna göre ayarla
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        setContext(ctx);

        // Arka planı çiz
        drawBackground(ctx, background, container.clientWidth, container.clientHeight);
        
        // İlk durumu geçmişe kaydet
        const initialData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setHistory([initialData]);
        setHistoryStep(0);

        // Pencere yeniden boyutlandırıldığında
        const handleResize = () => {
            if (!ctx || !canvas) return;
            const tempImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
            ctx.putImageData(tempImage, 0, 0);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Arka Plan Çizimi
    const drawBackground = (ctx: CanvasRenderingContext2D, type: BackgroundType, w: number, h: number) => {
        ctx.fillStyle = '#020617'; // Slate-950
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = '#1e293b'; // Slate-800
        ctx.lineWidth = 1;

        if (type === 'grid') {
            const step = 40;
            ctx.beginPath();
            for (let x = 0; x <= w; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
            for (let y = 0; y <= h; y += step) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
            ctx.stroke();
        } else if (type === 'lined') {
            const step = 40;
            ctx.beginPath();
            for (let y = 0; y <= h; y += step) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
            ctx.stroke();
        } else if (type === 'dots') {
            const step = 40;
            ctx.fillStyle = '#334155';
            for (let x = step; x < w; x += step) {
                for (let y = step; y < h; y += step) {
                    ctx.beginPath();
                    ctx.arc(x, y, 1, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        // Blank ise sadece siyah kalır
    };

    // Arka Plan Değiştiğinde
    useEffect(() => {
        if (!context || !canvasRef.current) return;
        const canvas = canvasRef.current;
        drawBackground(context, background, canvas.width, canvas.height);
        const newData = context.getImageData(0, 0, canvas.width, canvas.height);
        setHistory([newData]);
        setHistoryStep(0);
    }, [background, context]);

    // Çizim Fonksiyonları
    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!context || !canvasRef.current) return;

        setIsDrawing(true);
        const { offsetX, offsetY } = getCoordinates(e);
        
        setStartPos({ x: offsetX, y: offsetY });
        setSnapshot(context.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height));

        context.beginPath();
        context.moveTo(offsetX, offsetY);
        
        // Stil Ayarları
        context.strokeStyle = tool === 'eraser' ? '#020617' : color; // Silgi arka plan rengini boyar
        context.lineWidth = tool === 'marker' ? lineWidth * 3 : lineWidth;
        context.globalAlpha = tool === 'marker' ? 0.5 : 1.0;
        
        // Silgi ise daha kalın
        if (tool === 'eraser') context.lineWidth = lineWidth * 5;
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !context || !canvasRef.current || !snapshot) return;
        const { offsetX, offsetY } = getCoordinates(e);

        if (tool === 'pen' || tool === 'marker' || tool === 'eraser') {
            context.lineTo(offsetX, offsetY);
            context.stroke();
        } else {
            // Şekiller için önce eski görüntüyü yükle (temizle) sonra yeni şekli çiz
            context.putImageData(snapshot, 0, 0);
            context.beginPath();

            if (tool === 'line') {
                context.moveTo(startPos.x, startPos.y);
                context.lineTo(offsetX, offsetY);
            } else if (tool === 'rect') {
                context.rect(startPos.x, startPos.y, offsetX - startPos.x, offsetY - startPos.y);
            } else if (tool === 'circle') {
                const radius = Math.sqrt(Math.pow(offsetX - startPos.x, 2) + Math.pow(offsetY - startPos.y, 2));
                context.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
            }
            context.stroke();
        }
    };

    const stopDrawing = () => {
        if (!isDrawing || !context || !canvasRef.current) return;
        setIsDrawing(false);
        context.closePath();

        // History'e ekle
        const newData = context.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
        const newHistory = history.slice(0, historyStep + 1);
        setHistory([...newHistory, newData]);
        setHistoryStep(prev => prev + 1);
    };

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
        if (!canvasRef.current) return { offsetX: 0, offsetY: 0 };
        const rect = canvasRef.current.getBoundingClientRect();
        
        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        return {
            offsetX: clientX - rect.left,
            offsetY: clientY - rect.top
        };
    };

    // İşlemler
    const undo = () => {
        if (historyStep > 0 && context) {
            const prevData = history[historyStep - 1];
            context.putImageData(prevData, 0, 0);
            setHistoryStep(prev => prev - 1);
        }
    };

    const clearCanvas = () => {
        if (!context || !canvasRef.current) return;
        drawBackground(context, background, canvasRef.current.width, canvasRef.current.height);
        const newData = context.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
        setHistory(prev => [...prev.slice(0, historyStep + 1), newData]);
        setHistoryStep(prev => prev + 1);
        toast({ title: "Tahta Temizlendi", duration: 1500 });
    };

    const downloadCanvas = () => {
        if (!canvasRef.current) return;
        const link = document.createElement('a');
        link.download = `sanal-tahta-${new Date().toISOString()}.png`;
        link.href = canvasRef.current.toDataURL();
        link.click();
        toast({ title: "Tahta Görüntüsü İndirildi", duration: 2000 });
    };

    return (
        <div className="flex flex-col h-screen bg-slate-950 overflow-hidden relative select-none">
            
            {/* Üst Bar (Navigasyon & Başlık) */}
            <div className="absolute top-4 left-4 z-50 flex items-center gap-4">
                 <Link href="/teacher/smartboard">
                    <Button variant="outline" size="icon" className="bg-slate-900/80 border-white/10 text-white hover:bg-slate-800 rounded-xl h-12 w-12">
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                 </Link>
                 <div className="bg-slate-900/80 backdrop-blur-md px-6 py-2 rounded-xl border border-white/10 hidden md:block">
                     <h1 className="font-black text-white text-lg tracking-wide uppercase">Sanal Tahta</h1>
                 </div>
            </div>

            {/* Sağ Üst Araçlar (İndir, Temizle) */}
            <div className="absolute top-4 right-4 z-50 flex gap-2">
                <Button onClick={undo} disabled={historyStep <= 0} variant="outline" size="icon" className="bg-slate-900/80 border-white/10 text-white hover:bg-slate-800 rounded-xl h-12 w-12">
                    <Undo2 className="h-5 w-5" />
                </Button>
                <Button onClick={clearCanvas} variant="destructive" size="icon" className="rounded-xl h-12 w-12 bg-red-900/80 hover:bg-red-800 border-red-500/30">
                    <Trash2 className="h-5 w-5" />
                </Button>
                <Button onClick={downloadCanvas} variant="outline" size="icon" className="bg-slate-900/80 border-white/10 text-cyan-400 hover:bg-slate-800 rounded-xl h-12 w-12">
                    <Download className="h-5 w-5" />
                </Button>
            </div>

            {/* CANVAS CONTAINER */}
            <div ref={containerRef} className="flex-1 w-full h-full cursor-crosshair">
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="block touch-none"
                />
            </div>

            {/* ALT ARAÇ ÇUBUĞU (Floating Dock) */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 w-auto max-w-[95vw]">
                <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-2 flex flex-wrap items-center justify-center gap-2 md:gap-4">
                    
                    {/* Çizim Araçları Grubu */}
                    <div className="flex bg-slate-950/50 p-1 rounded-xl border border-white/5 gap-1">
                        <ToolButton active={tool === 'pen'} onClick={() => setTool('pen')} icon={<Pencil className="h-5 w-5"/>} />
                        <ToolButton active={tool === 'marker'} onClick={() => setTool('marker')} icon={<Highlighter className="h-5 w-5"/>} />
                        <ToolButton active={tool === 'eraser'} onClick={() => setTool('eraser')} icon={<Eraser className="h-5 w-5"/>} />
                    </div>

                    <div className="w-px h-8 bg-white/10 hidden sm:block"></div>

                    {/* Şekiller Grubu */}
                    <div className="flex bg-slate-950/50 p-1 rounded-xl border border-white/5 gap-1">
                        <ToolButton active={tool === 'line'} onClick={() => setTool('line')} icon={<Minus className="h-5 w-5 -rotate-45"/>} />
                        <ToolButton active={tool === 'rect'} onClick={() => setTool('rect')} icon={<Square className="h-5 w-5"/>} />
                        <ToolButton active={tool === 'circle'} onClick={() => setTool('circle')} icon={<Circle className="h-5 w-5"/>} />
                    </div>

                    <div className="w-px h-8 bg-white/10 hidden sm:block"></div>

                    {/* Renk ve Boyut Ayarları */}
                    <div className="flex items-center gap-3 bg-slate-950/50 p-2 px-4 rounded-xl border border-white/5">
                        
                        {/* Renk Seçici Popover */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <button 
                                    className="w-8 h-8 rounded-full border-2 border-white/20 shadow-sm transition-transform hover:scale-110 active:scale-95"
                                    style={{ backgroundColor: color }}
                                />
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-3 bg-slate-900 border-white/10" sideOffset={15}>
                                <div className="grid grid-cols-4 gap-2">
                                    {colors.map((c) => (
                                        <button
                                            key={c}
                                            onClick={() => setColor(c)}
                                            className={cn(
                                                "w-10 h-10 rounded-full border-2 transition-all hover:scale-110",
                                                color === c ? "border-white scale-110 shadow-[0_0_10px_white]" : "border-transparent"
                                            )}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>

                        {/* Kalınlık Slider */}
                        <div className="w-24 md:w-32">
                            <Slider
                                value={[lineWidth]}
                                min={1}
                                max={20}
                                step={1}
                                onValueChange={(val) => setLineWidth(val[0])}
                                className="cursor-pointer"
                            />
                        </div>
                    </div>

                    <div className="w-px h-8 bg-white/10 hidden sm:block"></div>

                    {/* Arka Plan Ayarı */}
                    <Popover>
                        <PopoverTrigger asChild>
                             <Button variant="ghost" size="icon" className="hover:bg-white/10 text-white rounded-xl">
                                <Settings2 className="h-6 w-6" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-40 p-2 bg-slate-900 border-white/10 text-white" sideOffset={15}>
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-slate-500 px-2 py-1">ARKA PLAN</span>
                                <Button variant="ghost" onClick={() => setBackground('blank')} className={cn("justify-start", background === 'blank' && "bg-white/10")}>
                                    <Square className="mr-2 h-4 w-4" /> Düz Siyah
                                </Button>
                                <Button variant="ghost" onClick={() => setBackground('grid')} className={cn("justify-start", background === 'grid' && "bg-white/10")}>
                                    <Grid3X3 className="mr-2 h-4 w-4" /> Kareli
                                </Button>
                                <Button variant="ghost" onClick={() => setBackground('lined')} className={cn("justify-start", background === 'lined' && "bg-white/10")}>
                                    <AlignJustify className="mr-2 h-4 w-4" /> Çizgili
                                </Button>
                                <Button variant="ghost" onClick={() => setBackground('dots')} className={cn("justify-start", background === 'dots' && "bg-white/10")}>
                                    <Loader2 className="mr-2 h-4 w-4" /> Noktalı
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>

                </div>
            </div>

        </div>
    );
}

// Yardımcı Alt Bileşen: ToolButton
const ToolButton = ({ active, onClick, icon }: { active: boolean, onClick: () => void, icon: React.ReactNode }) => (
    <button
        onClick={onClick}
        className={cn(
            "p-3 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95",
            active 
                ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.5)]" 
                : "text-slate-400 hover:text-white hover:bg-white/5"
        )}
    >
        {icon}
    </button>
);