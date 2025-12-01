'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, User, Trophy, BookOpen, BrainCircuit, Gamepad2, Swords } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';

export function StudentPageContent() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.replace('/login');
        }
    }, [user, loading, router]);

    if (loading || !user) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-900">
                <Loader2 className="h-12 w-12 animate-spin text-white" />
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-slate-900 text-white">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-lg">
                <div className="container mx-auto flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                        <Avatar>
                            <AvatarImage src={user.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.uid}`} />
                            <AvatarFallback>{user.displayName?.charAt(0) || 'O'}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-bold">{user.displayName}</p>
                            <p className="text-xs text-slate-400">Seviye 12</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-lg text-yellow-400">11.400 Puan</p>
                        <Progress value={45} className="w-24 h-1 mt-1 bg-slate-700" />
                    </div>
                </div>
            </header>

            {/* Ana İçerik - Mobil cihazlar için üst boşluk eklendi */}
            <main className="container mx-auto px-4 pb-8 pt-24">
                {/* Günün Liderleri */}
                <Card className="bg-gradient-to-b from-slate-800/50 to-slate-900/50 backdrop-blur-md bg-white/10 border-2 border-white/20 rounded-3xl shadow-2xl overflow-hidden relative">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-yellow-300">
                            <Trophy className="h-6 w-6" />
                            <span>Günün Efsaneleri</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-around items-end gap-2">
                            {/* İkinci */}
                            <div className="text-center w-1/4">
                                <Avatar className="w-16 h-16 mx-auto border-4 border-slate-400">
                                    <AvatarImage src="https://api.dicebear.com/7.x/adventurer/svg?seed=ayse" />
                                    <AvatarFallback>A</AvatarFallback>
                                </Avatar>
                                <p className="font-bold text-sm mt-2">Ayşe</p>
                                <div className="bg-slate-700 p-2 rounded-lg mt-1 h-16 flex flex-col justify-center">
                                    <p className="text-slate-300 text-xs">2. Sıra</p>
                                    <p className="font-bold text-lg text-slate-100">9.800</p>
                                </div>
                            </div>
                            {/* Birinci */}
                            <div className="text-center w-1/3">
                                <Avatar className="w-24 h-24 mx-auto border-4 border-yellow-400 shadow-lg shadow-yellow-500/20">
                                    <AvatarImage src="https://api.dicebear.com/7.x/adventurer/svg?seed=musa" />
                                    <AvatarFallback>M</AvatarFallback>
                                </Avatar>
                                <p className="font-bold text-lg mt-2 text-yellow-300">Musa</p>
                                <div className="bg-yellow-400/20 border-2 border-yellow-400 p-2 rounded-lg mt-1 h-20 flex flex-col justify-center">
                                    <p className="text-yellow-200 text-xs">1. Sıra</p>
                                    <p className="font-bold text-2xl text-white">11.400</p>
                                </div>
                            </div>
                            {/* Üçüncü */}
                            <div className="text-center w-1/4">
                                <Avatar className="w-16 h-16 mx-auto border-4 border-amber-600">
                                    <AvatarImage src="https://api.dicebear.com/7.x/adventurer/svg?seed=aku" />
                                    <AvatarFallback>A</AvatarFallback>
                                </Avatar>
                                <p className="font-bold text-sm mt-2">Aku</p>
                                <div className="bg-slate-700 p-2 rounded-lg mt-1 h-16 flex flex-col justify-center">
                                    <p className="text-slate-300 text-xs">3. Sıra</p>
                                    <p className="font-bold text-lg text-slate-100">8.100</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Hızlı Erişim Butonları */}
                <div className="grid grid-cols-2 gap-4 mt-8">
                    <Link href="/yazilacaklar" className="block">
                        <div className="h-full p-4 rounded-2xl bg-sky-500/20 border border-sky-400 text-sky-300 flex flex-col items-center justify-center text-center">
                            <BookOpen className="h-8 w-8 mb-2" />
                            <span className="font-bold">Yazılacaklar</span>
                        </div>
                    </Link>
                    <Link href="/leaderboard" className="block">
                        <div className="h-full p-4 rounded-2xl bg-yellow-500/20 border border-yellow-400 text-yellow-300 flex flex-col items-center justify-center text-center">
                            <Trophy className="h-8 w-8 mb-2" />
                            <span className="font-bold">Liderlik</span>
                        </div>
                    </Link>
                    <Link href="/ozetler" className="block">
                        <div className="h-full p-4 rounded-2xl bg-purple-500/20 border border-purple-400 text-purple-300 flex flex-col items-center justify-center text-center">
                            <BrainCircuit className="h-8 w-8 mb-2" />
                            <span className="font-bold">Özetler</span>
                        </div>
                    </Link>
                     <Link href="/games/hangman" className="block">
                        <div className="h-full p-4 rounded-2xl bg-rose-500/20 border border-rose-400 text-rose-300 flex flex-col items-center justify-center text-center">
                            <Swords className="h-8 w-8 mb-2" />
                            <span className="font-bold">Adam Asmaca</span>
                        </div>
                    </Link>
                    <Link href="/games/word-scramble" className="block col-span-2">
                        <div className="h-full p-4 rounded-2xl bg-emerald-500/20 border border-emerald-400 text-emerald-300 flex flex-col items-center justify-center text-center">
                            <Gamepad2 className="h-8 w-8 mb-2" />
                            <span className="font-bold">Kelime Oyunu</span>
                        </div>
                    </Link>
                </div>
            </main>
        </div>
    );
}
