'use client';

import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PartyPopper, Repeat, Save, CheckCircle2, Home, Trophy, Star } from "lucide-react";
import Link from 'next/link';
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";

type GameEndScreenProps = {
    score: number;
    onSave: () => void;      // Bu fonksiyon tetiklenince DB işlemleri başlayacak
    isSaving: boolean;       // Butona basılınca true olacak
    scoreSaved?: boolean;    // İşlem bitince true olacak
    onRestart: () => void;
    backUrl: string;
    passThreshold?: number;
};

export function GameEndScreen({ 
    score, 
    onSave, 
    isSaving, 
    onRestart, 
    backUrl, 
    scoreSaved,
    passThreshold = 50 
}: GameEndScreenProps) {
    const { user } = useAuth();
    const isStudent = user?.role === 'student';

    // --- Ders Akışı ile Haberleşme (Sadece bilgi verir, kayıt yapmaz) ---
    useEffect(() => {
        if (window.parent) {
            window.parent.postMessage({
                type: 'ACTIVITY_COMPLETED',
                score: score,
                passed: score >= passThreshold
            }, '*');
        }
    }, [score, passThreshold]);

    return (
        <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4 pb-24 md:pb-4 relative overflow-hidden">
            
            {/* Arka Plan Efektleri */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[120px]" />
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 w-full max-w-md animate-in zoom-in slide-in-from-bottom-8 duration-500">
                <Card className="w-full bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden rounded-3xl">
                    
                    {/* Başlık ve İkon */}
                    <div className="flex flex-col items-center text-center p-8 pb-6">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full animate-pulse" />
                            <div className="relative bg-gradient-to-br from-amber-400 to-orange-600 p-4 rounded-2xl shadow-lg shadow-amber-500/20 transform rotate-3">
                                <Trophy className="h-12 w-12 text-white" />
                            </div>
                            <div className="absolute -top-2 -right-2">
                                <PartyPopper className="h-8 w-8 text-yellow-300 animate-bounce" />
                            </div>
                        </div>
                        
                        <h2 className="text-3xl font-black text-white tracking-tight mb-2">Tebrikler!</h2>
                        <p className="text-slate-400 text-sm font-medium">Oyun tamamlandı.</p>
                    </div>

                    {/* Skor Göstergesi */}
                    <div className="px-8 pb-8">
                        <div className="bg-slate-950/50 border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">TOPLAM PUAN</span>
                            <div className="flex items-center gap-2">
                                <Star className="h-6 w-6 text-yellow-400 fill-yellow-400" />
                                <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300 tracking-tighter">
                                    {score}
                                </span>
                            </div>
                            
                            <div className={cn("mt-2 text-xs font-bold px-2 py-1 rounded-full border", 
                                score >= passThreshold 
                                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                                    : "bg-red-500/20 text-red-400 border-red-500/30"
                            )}>
                                {score >= passThreshold ? "BAŞARILI" : "TEKRAR DENE"}
                            </div>
                        </div>
                    </div>

                    {/* BUTONLAR ALANI */}
                    <div className="p-6 pt-0 space-y-3">
                        
                        {/* 1. PUANI KAYDET BUTONU (Sadece öğrenciler için) */}
                        {isStudent && (
                            <Button 
                                onClick={onSave}
                                disabled={isSaving || scoreSaved || score <= 0}
                                className={cn(
                                    "w-full h-14 text-lg font-bold rounded-xl shadow-lg transition-all relative overflow-hidden",
                                    scoreSaved 
                                        ? "bg-slate-800 text-slate-400 border border-white/5 cursor-default" 
                                        : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/20 hover:scale-[1.02]"
                                )}
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Kaydediliyor...
                                    </>
                                ) : scoreSaved ? (
                                    <>
                                        <CheckCircle2 className="mr-2 h-5 w-5 text-emerald-500" />
                                        Kaydedildi!
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-5 w-5" />
                                        Puanı Kaydet
                                    </>
                                )}
                            </Button>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <Button 
                                onClick={onRestart} 
                                variant="outline" 
                                className="h-12 bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white hover:border-white/20 rounded-xl"
                            >
                                <Repeat className="mr-2 h-4 w-4" />
                                Tekrar Oyna
                            </Button>
                            
                            <Button 
                                asChild 
                                variant="outline" 
                                className="h-12 bg-transparent border-white/10 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl"
                            >
                                <Link href={backUrl}>
                                    <Home className="mr-2 h-4 w-4" />
                                    Ana Menü
                                </Link>
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
