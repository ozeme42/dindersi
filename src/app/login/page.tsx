
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Info, Gamepad2, User, Lock, ArrowLeft, LogIn, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';


// --- UI COMPONENTS ---

const GlassCard = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={cn(
        "backdrop-blur-xl bg-[#1a0b2e]/60 border-2 border-white/10 rounded-3xl shadow-2xl overflow-hidden relative transition-all duration-300",
        className
    )}>
        {/* Top Glow Line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-50"></div>
        {children}
    </div>
);

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [loginAttemptFailed, setLoginAttemptFailed] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);

  // If in static mode, redirect to home immediately.
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_STATIC_BUILD === 'true') {
      router.replace('/');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginAttemptFailed(false);
    setPendingApproval(false);

    const formData = new FormData(e.currentTarget);
    const displayNameInput = (formData.get('display-name') as string).trim();
    const password = formData.get('password') as string;

    if (!displayNameInput || !password) {
        toast({ title: "Eksik Bilgi", description: "Lütfen tüm alanları doldurun.", variant: "destructive" });
        setIsLoading(false);
        return;
    }

    try {
        const usersQuery = query(collection(db, 'users'), where("displayName", "==", displayNameInput));
        const querySnapshot = await getDocs(usersQuery);

        if (querySnapshot.empty) {
            toast({ title: "Giriş Hatası", description: "Ad Soyad veya şifre hatalı.", variant: "destructive" });
            setLoginAttemptFailed(true);
            setIsLoading(false);
            return;
        }

        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data() as UserProfile;
        
        if (userData.role === 'pending') {
            setPendingApproval(true);
            setIsLoading(false);
            return;
        }

        if (!userData.email) {
            toast({ title: "Giriş Hatası", description: "Bu kullanıcı için bir e-posta adresi kayıtlı değil.", variant: "destructive" });
            setIsLoading(false);
            return;
        }

        try {
            await signInWithEmailAndPassword(auth, userData.email, password);
            toast({
                title: "Giriş Başarılı!",
                description: "Panele yönlendiriliyorsunuz...",
             });

             if (userData.role === 'teacher' || userData.role === 'superadmin') {
                router.push('/');
             } else {
                router.push('/student');
             }

        } catch (error: any) {
             if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
                 toast({ title: "Giriş Hatası", description: "Ad Soyad veya şifre hatalı.", variant: "destructive" });
                 setLoginAttemptFailed(true);
             } else {
                 toast({ title: "Giriş Hatası", description: "Giriş sırasında bir hata oluştu.", variant: "destructive" });
             }
        }

    } catch (error) {
        console.error("Login process error:", error);
        toast({ title: "Beklenmedik Hata", description: "Giriş sırasında bir sorun oluştu.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };
  
  if (process.env.NEXT_PUBLIC_STATIC_BUILD === 'true') {
      return (
        <div className="flex h-screen items-center justify-center bg-slate-950">
            <Loader2 className="h-12 w-12 animate-spin text-cyan-500" />
        </div>
      )
  }

  return (
    <div className="min-h-screen bg-[#2b1055] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-[#2b1055] to-black flex items-center justify-center p-4 font-sans text-white">
      
      <div className="w-full max-w-md animate-in zoom-in-95 duration-500">
        
        {/* LOGO AREA */}
        <div className="text-center mb-8">
            <div className="bg-cyan-500/20 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-4 ring-cyan-500/10 shadow-[0_0_30px_rgba(6,182,212,0.4)] rotate-3">
                <Gamepad2 className="h-10 w-10 text-cyan-400" />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-white drop-shadow-sm">
                OYUNA GİRİŞ
            </h1>
            <p className="text-indigo-200/60 font-medium mt-2">Maceraya kaldığın yerden devam et.</p>
        </div>

        <GlassCard className="p-8">
            
            {/* ALERT BOXES */}
            {loginAttemptFailed && (
                <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3 animate-in slide-in-from-top-2">
                    <Info className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-red-300 text-sm">Giriş Başarısız</h4>
                        <p className="text-xs text-red-200/70 mt-1">
                            Kullanıcı adınızı veya şifrenizi kontrol edin. Liderlik tablosundan tam isminize bakabilirsiniz.
                        </p>
                    </div>
                </div>
            )}
             {pendingApproval && (
                <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3 animate-in slide-in-from-top-2">
                    <Info className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-yellow-300 text-sm">Onay Bekleniyor</h4>
                        <p className="text-xs text-yellow-200/70 mt-1">
                           Hesabınız henüz öğretmeniniz tarafından onaylanmamış. Lütfen daha sonra tekrar deneyin.
                        </p>
                    </div>
                </div>
            )}


            <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* USERNAME INPUT */}
                <div className="space-y-2 group">
                    <Label htmlFor="display-name" className="text-xs font-bold text-indigo-300 uppercase tracking-wider ml-1">Ad Soyad</Label>
                    <div className="relative">
                        <User className="absolute left-3 top-3 h-5 w-5 text-indigo-400 group-focus-within:text-cyan-400 transition-colors" />
                        <Input 
                            id="display-name" 
                            name="display-name" 
                            type="text" 
                            placeholder="Adınız ve Soyadınız" 
                            className="pl-10 bg-black/20 border-white/10 text-white placeholder:text-white/20 h-12 rounded-xl focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500 transition-all"
                        />
                    </div>
                </div>

                {/* PASSWORD INPUT */}
                <div className="space-y-2 group">
                    <Label htmlFor="password" className="text-xs font-bold text-indigo-300 uppercase tracking-wider ml-1">Şifre</Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 h-5 w-5 text-indigo-400 group-focus-within:text-cyan-400 transition-colors" />
                        <Input 
                            id="password" 
                            name="password" 
                            type="password" 
                            className="pl-10 bg-black/20 border-white/10 text-white h-12 rounded-xl focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500 transition-all"
                        />
                    </div>
                </div>

                {/* SUBMIT BUTTON */}
                <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full h-12 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-lg rounded-xl shadow-lg shadow-cyan-900/20 border-b-4 border-blue-800 active:border-b-0 active:translate-y-1 transition-all"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Yükleniyor...
                        </>
                    ) : (
                        <>
                            <LogIn className="mr-2 h-5 w-5" /> Başla
                        </>
                    )}
                </Button>
                
                 <div className="text-center pt-2">
                    <Button variant="link" asChild className="text-cyan-300 hover:text-white transition-colors text-sm">
                        <Link href="/register">
                            Hesabın yok mu? <UserPlus className="ml-2 h-4 w-4"/> Kayıt Ol
                        </Link>
                    </Button>
                </div>

                {/* BACK LINK */}
                <div className="pt-2 text-center">
                    <Button variant="link" asChild className="text-indigo-300 hover:text-white transition-colors">
                        <Link href="/" className="flex items-center gap-2">
                            <ArrowLeft className="h-4 w-4" /> Ana Sayfaya Dön
                        </Link>
                    </Button>
                </div>

            </form>
        </GlassCard>
        
        {/* Footer Text */}
        <p className="text-center text-indigo-300/30 text-xs mt-8 font-mono">
            PRESS START TO BEGIN
        </p>

      </div>
    </div>
  );
}
