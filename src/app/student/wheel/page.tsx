
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Loader2, Trophy, ArrowLeft, Star, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { WheelOfFortune } from '@/components/wheel-of-fortune';
import { claimWheelPrize } from './actions';
import { useToast } from '@/hooks/use-toast';
import confetti from 'canvas-confetti';

// --- GÜNCEL PUAN LİSTESİ (ARTIRILDI) ---
const prizes = [
  { value: 1000,  label: '1.000 XP',  color: '#3b82f6' },   // Mavi
  { value: 5000,  label: '5.000 XP',  color: '#a855f7' },   // Mor
  { value: 10000, label: '10.000 XP', color: '#ef4444' },   // Kırmızı
  { value: 20000, label: '20.000 XP', color: '#eab308' },   // Altın
  { value: 30000, label: '30.000 XP', color: '#22c55e' },   // Yeşil
  { value: 40000, label: '40.000 XP', color: '#ec4899' },   // Pembe
  { value: 50000, label: '50.000 XP', color: '#f97316' },   // Turuncu
];


export default function WheelPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    
    const [isSpinning, setIsSpinning] = useState(false);
    const [winner, setWinner] = useState<{ value: number; label: string, color: string } | null>(null);
    const [isClaiming, setIsClaiming] = useState(false);

    useEffect(() => {
        if (!loading && !user) router.replace('/login');
    }, [user, loading, router]);
    
    // Konfeti Efekti
    const triggerConfetti = (isBigWin: boolean) => {
        const duration = isBigWin ? 5000 : 3000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 50 };
        const random = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function() {
            const timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) return clearInterval(interval);

            const particleCount = 50 * (timeLeft / duration);
            confetti({ ...defaults, particleCount, origin: { x: random(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: random(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);
    };

    const handleSpinEnd = async (selectedPrize: any) => {
        setWinner(selectedPrize);
        
        // 10.000 ve üzeri büyük ödül sayılır
        const isBigWin = selectedPrize.value >= 10000;
        triggerConfetti(isBigWin);
        
        setIsClaiming(true);
        if (user) {
            try {
                const result = await claimWheelPrize(user.uid, selectedPrize.value);
                if (!result.success) {
                    toast({
                        title: 'Bir sorun oluştu',
                        description: result.error || 'Ödül kaydedilemedi. Lütfen sayfayı yenile.',
                        variant: 'destructive',
                    });
                }
            } catch (error) {
                console.error(error);
                toast({
                    title: 'Hata',
                    description: 'Bağlantı hatası oluştu.',
                    variant: 'destructive',
                });
            }
        }
        setIsClaiming(false);
    };

    if (loading || !user) {
        return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-fuchsia-500" /></div>;
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-4 overflow-hidden relative font-sans selection:bg-amber-500/30">
            
            {/* Arka Plan */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/30 via-slate-950 to-slate-950 -z-20" />
            
            {/* Geri Dön Butonu */}
            <div className="absolute top-6 left-6 z-20">
                <Button asChild variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/10">
                    <Link href="/student" className="flex items-center gap-2">
                        <ArrowLeft className="h-5 w-5"/> Panele Dön
                    </Link>
                </Button>
            </div>

            {/* Başlık */}
            <div className="text-center mb-8 relative z-10 animate-in slide-in-from-top-10 duration-700">
                <div className="inline-flex items-center justify-center p-2 mb-4 bg-amber-500/10 rounded-full border border-amber-500/30 backdrop-blur-md">
                    <Trophy className="h-5 w-5 text-amber-400 mr-2" />
                    <span className="text-amber-200 text-xs font-bold uppercase tracking-widest">Haftalık Seri Ödülü</span>
                </div>
                <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 drop-shadow-2xl">
                    ŞANS ÇARKI
                </h1>
                <p className="text-slate-400 mt-2 text-sm font-medium">Büyük ödül 50.000 XP!</p>
            </div>

            {/* ÇARK ALANI */}
            <div className="relative z-10 group w-full max-w-[500px] aspect-square">
                {/* Arkadaki Parlama */}
                <div className={cn(
                    "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] bg-amber-500/10 rounded-full blur-[80px] transition-all duration-1000",
                    isSpinning && "scale-125 opacity-100 bg-amber-500/20"
                )} />

                {/* Çark Bileşeni */}
                <div className="relative w-full h-full drop-shadow-2xl">
                     <WheelOfFortune 
                        segments={prizes}
                        spinDuration={12} 
                        onSpinStart={() => {
                            setIsSpinning(true);
                            setWinner(null);
                        }}
                        onSpinEnd={handleSpinEnd}
                      />
                </div>
            </div>
            
            {/* KAZANMA POP-UP EKRANI */}
            {winner && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-500" />
                    
                    <div className="relative bg-slate-900 border-2 border-amber-500/30 rounded-[2rem] p-10 text-center max-w-sm w-full shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 overflow-hidden">
                        
                        {/* Arka Plan Işıltısı */}
                        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-transparent pointer-events-none" />

                        <div className="absolute -top-12 left-1/2 -translate-x-1/2">
                            <Star className="h-24 w-24 text-yellow-400 fill-yellow-400 animate-[spin_4s_linear_infinite] drop-shadow-[0_0_30px_rgba(250,204,21,0.8)]" />
                        </div>

                        <h2 className="text-4xl font-black text-white mt-8 mb-2 tracking-tight">TEBRİKLER!</h2>
                        <p className="text-slate-400 text-sm mb-6 font-medium">Hesabına yatan ödül:</p>

                        <div className="py-6 bg-slate-950 rounded-2xl border border-white/5 mb-6 relative group">
                            {/* Kazanılan ödülün rengine göre parıltı */}
                            <div className="absolute inset-0 opacity-20 rounded-2xl animate-pulse" style={{ backgroundColor: winner.color }} />
                            <span 
                                className="relative text-5xl font-black text-transparent bg-clip-text tracking-tighter drop-shadow-sm"
                                style={{ 
                                    backgroundImage: `linear-gradient(to right, #fff, ${winner.color})` 
                                }}
                            >
                                {winner.label}
                            </span>
                        </div>

                        <Button 
                            onClick={() => router.push('/student')} 
                            size="lg" 
                            disabled={isClaiming}
                            className="w-full h-14 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-lg rounded-xl shadow-lg shadow-emerald-900/20 transition-all hover:scale-[1.02]"
                        >
                            {isClaiming ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 
                                    Kaydediliyor...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="mr-2 h-5 w-5 fill-white" /> 
                                    Ödülü Al ve Çık
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
