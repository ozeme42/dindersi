'use client';

import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PartyPopper, Repeat, Save, CheckCircle2, Home, Trophy, Star, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";

type GameEndScreenProps = {
    score: number;
    onSave: () => void;
    isSaving: boolean;
    scoreSaved?: boolean;
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
    const router = useRouter();
    const isStudent = user?.role === 'student';
    const isPassed = score >= passThreshold;

    // --- Ders Akışı ile Haberleşme ---
    useEffect(() => {
        if (window.parent) {
            window.parent.postMessage({
                type: 'ACTIVITY_COMPLETED',
                score: score,
                passed: isPassed
            }, '*');
        }
    }, [score, isPassed]);

    const handleBackNavigation = () => {
      if (backUrl) {
          router.push(backUrl);
      } else if (!isStudent) {
          router.push('/');
      } else {
          router.push('/student');
      }
    };

    return (
        // Arka plan: Simsiyah yerine yumuşak "Slate-50" (Orta/Açık ton)
        <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4 pb-24 md:pb-4 relative overflow-hidden font-sans">
            
            {/* Arka Plan Deseni (Grid) */}
            <div className="absolute inset-0 z-0 opacity-[0.03]" 
                style={{ backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
            />

            {/* Arka Plan Dekoratif Gradyanlar (Daha yumuşak) */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-100/50 rounded-full blur-[100px] -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-indigo-100/40 rounded-full blur-[80px] translate-y-1/3" />
            </div>

            {/* Ana Kart */}
            <div className="relative z-10 w-full max-w-md animate-in zoom-in slide-in-from-bottom-4 duration-500">
                <Card className="w-full bg-white border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden rounded-2xl">
                    
                    {/* Üst Kısım: Başarı Durumu */}
                    <div className="flex flex-col items-center text-center p-8 pb-6">
                        <div className="relative mb-6 group">
                            {/* İkon Arkası Efekt */}
                            <div className={cn("absolute inset-0 blur-2xl rounded-full opacity-20 transition-colors duration-500", 
                                isPassed ? "bg-emerald-400" : "bg-orange-400"
                            )} />
                            
                            {/* İkon Kutusu */}
                            <div className={cn("relative p-5 rounded-2xl shadow-sm transform transition-transform group-hover:scale-105 duration-300",
                                isPassed ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
                            )}>
                                {isPassed ? (
                                    <Trophy className="h-10 w-10" />
                                ) : (
                                    <Star className="h-10 w-10" />
                                )}
                            </div>

                            {/* Konfeti İkonu (Sadece geçildiyse) */}
                            {isPassed && (
                                <div className="absolute -top-3 -right-3 animate-bounce delay-100">
                                    <PartyPopper className="h-6 w-6 text-yellow-500" />
                                </div>
                            )}
                        </div>
                        
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
                            {isPassed ? "Tebrikler!" : "Oyun Tamamlandı"}
                        </h2>
                        <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-[250px]">
                            {isPassed 
                                ? "Harika bir iş çıkardın, konu hakkındaki bilgilerin gayet iyi görünüyor." 
                                : "Biraz daha pratik yaparak daha yüksek puanlar alabilirsin."}
                        </p>
                    </div>

                    {/* Skor Kartı */}
                    <div className="px-6 pb-6">
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 flex flex-col items-center justify-center relative">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                                TOPLAM PUAN
                            </span>
                            
                            <div className="flex items-center gap-2">
                                <span className={cn("text-5xl font-black tracking-tighter", 
                                    isPassed ? "text-slate-800" : "text-slate-700"
                                )}>
                                    {score}
                                </span>
                            </div>
                            
                            <div className={cn("mt-3 text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1.5", 
                                isPassed 
                                    ? "bg-emerald-100/50 text-emerald-700 border-emerald-200" 
                                    : "bg-orange-100/50 text-orange-700 border-orange-200"
                            )}>
                                {isPassed ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                                {isPassed ? "BAŞARILI" : "TEKRAR DENE"}
                            </div>
                        </div>
                    </div>

                    {/* Butonlar Alanı */}
                    <div className="p-6 pt-0 space-y-3 bg-slate-50/50 border-t border-slate-100">
                        
                        {/* 1. PUANI KAYDET (Öğrenciyse) */}
                        {isStudent && (
                            <Button 
                                onClick={onSave}
                                disabled={isSaving || scoreSaved || score <= 0}
                                className={cn(
                                    "w-full h-12 text-base font-semibold rounded-xl shadow-sm transition-all relative overflow-hidden",
                                    scoreSaved 
                                        ? "bg-slate-100 text-slate-400 hover:bg-slate-100 border border-slate-200 cursor-default shadow-none" 
                                        : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 hover:shadow-indigo-300"
                                )}
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Kaydediliyor...
                                    </>
                                ) : scoreSaved ? (
                                    <>
                                        <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />
                                        Puan Kaydedildi
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Puanı Kaydet
                                    </>
                                )}
                            </Button>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <Button 
                                onClick={onRestart} 
                                variant="outline" 
                                className="h-11 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl"
                            >
                                <Repeat className="mr-2 h-4 w-4 text-slate-500" />
                                Tekrar Oyna
                            </Button>
                            
                             <Button 
                                onClick={handleBackNavigation}
                                variant="outline" 
                                className="h-11 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl"
                            >
                                {user ? <ArrowLeft className="mr-2 h-4 w-4 text-slate-500" /> : <Home className="mr-2 h-4 w-4 text-slate-500" />}
                                {user ? 'Geri Dön' : 'Ana Sayfa'}
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}