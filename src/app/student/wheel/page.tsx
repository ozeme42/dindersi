
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
import { playSound } from '@/lib/audio-service';

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
        playSound(isBigWin ? 'win' : 'level-up');
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
        <div className="min-h-screen bg-[#050314] text-white p-4 sm:p-6 md:p-8 overflow-hidden relative font-sans selection:bg-amber-500/30 flex flex-col justify-center">
            
            {/* Cosmic Ambient Effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-amber-600/15 rounded-full blur-[140px]" />
                <div className="absolute top-[40%] right-[-10%] w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[140px]" />
                <div className="absolute bottom-[-10%] left-[30%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px]" />
                <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
            </div>
            
            {/* Top Navigation Bar */}
            <div className="w-full max-w-6xl mx-auto flex items-center justify-between relative z-20 mb-6 sm:mb-8">
                <Button asChild variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/10 rounded-xl px-4 py-2 text-sm font-bold group">
                    <Link href="/student" className="flex items-center gap-2">
                        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform"/> 
                        <span>Panele Dön</span>
                    </Link>
                </Button>

                <div className="flex items-center gap-2 bg-[#0e0c26]/90 border border-yellow-500/30 px-3.5 py-1.5 rounded-2xl backdrop-blur-md shadow-lg">
                    <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
                    <span className="text-xs font-black text-yellow-300">Büyük Ödül: 50.000 XP</span>
                </div>
            </div>

            {/* Main Stage Grid */}
            <div className="w-full max-w-6xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                
                {/* Left Column: Rules, Title, and Reward List */}
                <div className="lg:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-left space-y-5 animate-in slide-in-from-left-8 duration-700">
                    <div className="inline-flex items-center p-2 px-3.5 bg-amber-500/15 rounded-full border border-amber-500/30 backdrop-blur-md">
                        <Trophy className="h-4 w-4 text-amber-400 mr-2 shrink-0" />
                        <span className="text-amber-200 text-xs font-black uppercase tracking-widest">Haftalık Seri Bonus Çarkı</span>
                    </div>

                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 drop-shadow-2xl leading-none">
                        ŞANS ÇARKI
                    </h1>

                    <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-md font-medium">
                        Çarkı çevir, şansını dene ve anında kazanacağın binlerce XP ile liderlik tablosunda üst basamaklara tırman!
                    </p>

                    {/* Ödül Dağılım Kartı */}
                    <div className="w-full bg-[#0e0c26]/80 border border-white/10 rounded-3xl p-5 backdrop-blur-xl shadow-xl space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-white/10">
                            <span className="text-xs font-black uppercase tracking-wider text-slate-400">Çarktaki Ödüller</span>
                            <span className="text-xs font-bold text-emerald-400">Garantili XP</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {prizes.map((p, idx) => (
                                <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/5">
                                    <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: p.color }} />
                                    <span className="text-xs font-black text-slate-200">{p.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Interactive Wheel */}
                <div className="lg:col-span-7 flex flex-col items-center justify-center relative">
                    <div className="relative group w-full max-w-[480px] sm:max-w-[520px] aspect-square flex items-center justify-center">
                        {/* Arkadaki Parlama */}
                        <div className={cn(
                            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[115%] h-[115%] bg-amber-500/15 rounded-full blur-[90px] transition-all duration-1000 pointer-events-none",
                            isSpinning && "scale-125 opacity-100 bg-amber-500/30"
                        )} />

                        {/* Çark Bileşeni */}
                        <div className="relative w-full h-full drop-shadow-[0_0_50px_rgba(0,0,0,0.8)]">
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
                    
                    <p className="text-xs text-slate-400 font-bold mt-4 flex items-center gap-1.5 animate-pulse">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        Çarkın ortasındaki butona basarak şansını dene!
                    </p>
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
