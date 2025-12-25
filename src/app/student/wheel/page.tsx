
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Home, Loader2, PartyPopper, RotateCw, Star } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { WheelOfFortune } from '@/components/wheel-of-fortune';
import { claimWheelPrize } from './actions';
import { useToast } from '@/hooks/use-toast';
import Confetti from 'react-dom-confetti';

const prizes = [
  { value: 1000, label: '1.000', color: '#4f46e5' },   // Indigo
  { value: 5000, label: '5.000', color: '#db2777' },   // Pink
  { value: 10000, label: '10.000', color: '#16a34a' }, // Green
  { value: 20000, label: '20.000', color: '#f59e0b' }, // Amber
  { value: 1000, label: '1.000', color: '#4f46e5' },
  { value: 5000, label: '5.000', color: '#db2777' },
  { value: 10000, label: '10.000', color: '#16a34a' },
  { value: 20000, label: '20.000', color: '#f59e0b' },
];

export default function WheelPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    
    const [isSpinning, setIsSpinning] = useState(false);
    const [winner, setWinner] = useState<{ value: number; label: string } | null>(null);
    const [isClaiming, setIsClaiming] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.replace('/login');
        }
    }, [user, loading, router]);
    
    const handleSpinEnd = async (selectedPrize: { value: number; label: string }) => {
        setWinner(selectedPrize);
        setShowConfetti(true);
        setIsClaiming(true);
        if (user) {
            const result = await claimWheelPrize(user.uid, selectedPrize.value);
            if (result.success) {
                toast({
                    title: 'Tebrikler!',
                    description: `${selectedPrize.label} puan kazandın!`,
                });
            } else {
                 toast({
                    title: 'Hata',
                    description: result.error || 'Ödül alınamadı.',
                    variant: 'destructive',
                });
            }
        }
        setIsClaiming(false);
    };

    if (loading || !user) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950">
                <Loader2 className="h-16 w-16 animate-spin text-fuchsia-500" />
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-4 overflow-hidden relative font-sans">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-fuchsia-900/20 via-slate-950 to-slate-950 -z-10" />

            <div className="absolute top-6 left-6 z-20">
                <Button asChild variant="outline" className="border-white/10 text-slate-300 hover:text-white bg-slate-900/50 backdrop-blur-md">
                    <Link href="/student"><Home className="mr-2 h-4 w-4"/> Panele Dön</Link>
                </Button>
            </div>

            <div className="text-center mb-8 relative z-10">
                <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-pink-500 drop-shadow-lg">
                    Şans Çarkı
                </h1>
                <p className="text-slate-400 mt-2 text-lg">Serini kutla ve ödülünü kazan!</p>
            </div>

            <div className="relative z-10 w-full max-w-lg aspect-square">
                 <WheelOfFortune 
                    segments={prizes}
                    onSpinStart={() => {
                        setIsSpinning(true);
                        setWinner(null);
                        setShowConfetti(false);
                    }}
                    onSpinEnd={handleSpinEnd}
                 />
            </div>
            
            {winner && !isClaiming && (
                 <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-30 flex items-center justify-center animate-in fade-in duration-500">
                    <div className="text-center p-8 bg-slate-900 border-2 border-yellow-500 rounded-3xl shadow-2xl shadow-yellow-500/20 max-w-sm animate-in zoom-in-50 slide-in-from-bottom-10">
                        <Confetti active={showConfetti} config={{ elementCount: 200, spread: 90 }} />
                        <PartyPopper className="h-20 w-20 text-yellow-400 mx-auto mb-4 animate-bounce" />
                        <h2 className="text-4xl font-black text-white">Tebrikler!</h2>
                        <p className="text-xl text-yellow-300 mt-2">Kazandığın Puan:</p>
                        <p className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-amber-500 my-4">{winner.label}</p>
                        <div className="flex gap-4 mt-8">
                             <Button onClick={() => router.push('/student')} size="lg" className="flex-1 bg-white text-black font-bold hover:bg-slate-200 h-12">
                                Harika!
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
