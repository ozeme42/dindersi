
'use client';

import React, { useState, useEffect } from 'react';
import { 
    Loader2, Star, User, BookOpen, Trophy, 
    LogOut, Settings, LayoutDashboard, Sparkles, 
    Gamepad2, ClipboardList, Target, ShieldCheck,
    Fingerprint
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { UserAvatar } from '@/components/user-avatar';
import Link from 'next/link';

export default function StudentDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: "Başarılı", description: "Oturumunuz kapatıldı." });
      router.push('/login');
    } catch (error) {
      toast({ title: "Hata", description: "Çıkış yapılırken bir hata oluştu.", variant: "destructive" });
    }
  };

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 selection:bg-indigo-500/30">
      
      {/* Üst Navigasyon Barı */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-white/10 px-6 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg">
                <LayoutDashboard className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-black uppercase tracking-tight hidden sm:block">Öğrenci Paneli</h1>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                <span className="font-bold text-sm">{user.score || 0} XP</span>
             </div>
             <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-full h-10 w-10">
                <LogOut className="h-5 w-5" />
             </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6 md:p-8 space-y-8 pb-24">
        
        {/* PROFiL KARTI */}
        <Card className="bg-slate-900/60 border-white/10 backdrop-blur-md overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <CardContent className="p-8 flex flex-col md:flex-row items-center gap-8">
              <UserAvatar user={user} className="h-24 w-24 border-4 border-white/20 shadow-xl" />
              <div className="flex-1 text-center md:text-left space-y-2">
                <Badge className="bg-white/20 text-white border-none hover:bg-white/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                  Öğrenci Profili
                </Badge>
                <h2 className="text-3xl font-black tracking-tight">{user.displayName}</h2>
                <div className="flex flex-wrap justify-center md:justify-start gap-4 text-slate-400 font-medium">
                  <div className="flex items-center gap-2"><Target className="h-4 w-4" /> {user.class || 'Sınıf Belirtilmedi'}</div>
                  <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> {user.schoolName || 'Okul Belirtilmedi'}</div>
                </div>
              </div>
              <Button asChild variant="outline" className="border-white/10 hover:bg-white/5 text-slate-300">
                  <Link href="/student/profil"><Settings className="mr-2 h-4 w-4"/> Profili Düzenle</Link>
              </Button>
            </CardContent>
        </Card>

        {/* HIZLI BAĞLANTILAR */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/student/soru-bankasi" className="group">
                <Card className="h-full bg-slate-900/40 border-white/5 hover:border-indigo-500/50 transition-all hover:-translate-y-1">
                    <CardHeader>
                        <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                            <Gamepad2 className="h-6 w-6 text-indigo-400" />
                        </div>
                        <CardTitle>Soru Bankası</CardTitle>
                        <CardDescription>Konu testlerini çöz ve puan kazan.</CardDescription>
                    </CardHeader>
                </Card>
            </Link>

            <Link href="/student/liderlik" className="group">
                <Card className="h-full bg-slate-900/40 border-white/5 hover:border-yellow-500/50 transition-all hover:-translate-y-1">
                    <CardHeader>
                        <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                            <Trophy className="h-6 w-6 text-yellow-400" />
                        </div>
                        <CardTitle>Liderlik Tablosu</CardTitle>
                        <CardDescription>Sıralamanı gör ve rakiplerinle yarış.</CardDescription>
                    </CardHeader>
                </Card>
            </Link>

            <Link href="/student/magaza" className="group">
                <Card className="h-full bg-slate-900/40 border-white/5 hover:border-emerald-500/50 transition-all hover:-translate-y-1">
                    <CardHeader>
                        <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                            <Sparkles className="h-6 w-6 text-emerald-400" />
                        </div>
                        <CardTitle>Mağaza</CardTitle>
                        <CardDescription>XP'lerinle yeni rozetler ve çerçeveler al.</CardDescription>
                    </CardHeader>
                </Card>
            </Link>
        </div>

        {/* ÇIKIŞ BUTONU (ALT) */}
        <div className="pt-8 flex justify-center">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 font-bold px-8 h-14 rounded-2xl">
                        <LogOut className="mr-3 h-6 w-6" /> Güvenli Çıkış Yap
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-slate-900 border-white/10 text-white rounded-3xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Oturumu Kapat</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                            Yolculuğuna ara vermek istediğinden emin misin? Tüm ilerlemen kaydedildi.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-transparent border-white/10 text-slate-300 hover:bg-white/5">İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleLogout} className="bg-red-600 hover:bg-red-500 text-white font-bold border-none">
                            Evet, Çıkış Yap
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>

      </main>
    </div>
  );
}
