'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { 
    Home, Map, Compass, Trophy, ShoppingCart, User, 
    LogOut, FileCog 
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function StudentSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuth();
    const [pendingExams, setPendingExams] = useState(0);

    // Sınav bildirim rozetini önbellekten çek
    useEffect(() => {
        if (!user?.uid) return;
        try {
            const cached = sessionStorage.getItem(`student_dashboard_stats_${user.uid}`);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed.examStats?.pending) {
                    setPendingExams(parsed.examStats.pending);
                }
            }
        } catch (e) {}
    }, [user?.uid]);

    const handleLogout = async () => {
        try {
            if (logout) {
                await logout();
            } else {
                const { getAuth, signOut } = await import('firebase/auth');
                await signOut(getAuth());
            }
            router.push('/login');
        } catch (e) {
            console.error('Logout error:', e);
        }
    };

    const tabs = [
        { href: '/student', icon: Home, label: 'Ana Sayfa' },
        { href: '/student/soru-bankasi', icon: Map, label: 'Macera Haritası' },
        { href: '/student/gorevler', icon: Compass, label: 'Görev Yolculuğu' },
        { href: '/student/deneme', icon: FileCog, label: 'Denemeler' },
        { href: '/leaderboard', icon: Trophy, label: 'Liderlik' },
        { href: '/student/shop', icon: ShoppingCart, label: 'Mağaza' },
        { href: '/student/profile', icon: User, label: 'Profil' },
    ];

    return (
        <aside className="hidden md:flex flex-col fixed top-0 left-0 w-72 h-screen bg-[#0a081e]/95 backdrop-blur-2xl border-r border-white/10 z-50 p-6 overflow-y-auto">
            {/* Logo */}
            <Link href="/student" className="flex items-center gap-3.5 mb-8 mt-2 px-2 group">
                <div className="relative w-12 h-12 rounded-2xl overflow-hidden shadow-lg shadow-emerald-500/20 border border-white/15 bg-white shrink-0 group-hover:scale-105 transition-transform duration-300">
                    <Image 
                        src="https://firebasestorage.googleapis.com/v0/b/tamuyum.firebasestorage.app/o/Ekran%20g%C3%B6r%C3%BCnt%C3%BCs%C3%BC%202026-04-06%20191410%20(2).png?alt=media&token=af8346d3-7274-4c37-8199-bbdc9bc85b1a" 
                        alt="Din Dersi Atölyesi Logo" 
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                </div>
                <h1 className="text-2xl font-black text-white tracking-wide leading-tight group-hover:text-emerald-300 transition-colors">
                    Din Dersi<br />
                    <span className="text-emerald-400">Atölyesi</span>
                </h1>
            </Link>

            {/* Menü Başlığı */}
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 px-2">
                Ana Menü
            </div>

            {/* Menü Linkleri */}
            <nav className="flex-1 flex flex-col gap-1.5">
                {tabs.map((tab) => {
                    const isActive = tab.href === '/student'
                        ? pathname === '/student'
                        : pathname.startsWith(tab.href);
                    const Icon = tab.icon;

                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={cn(
                                "flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 font-bold group",
                                isActive
                                    ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                                    : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"
                            )}
                        >
                            <div className="relative shrink-0">
                                <Icon
                                    className={cn(
                                        "w-5 h-5 transition-transform duration-200",
                                        isActive
                                            ? "text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.8)] scale-110"
                                            : "text-slate-400 group-hover:text-white group-hover:scale-110"
                                    )}
                                />
                                {tab.href === '/student/deneme' && pendingExams > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-slate-950 animate-pulse">
                                        {pendingExams}
                                    </span>
                                )}
                            </div>
                            <span className="text-sm md:text-base">{tab.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Çıkış Butonu */}
            <div className="mt-auto pt-4 border-t border-white/5">
                <Button
                    onClick={handleLogout}
                    variant="ghost"
                    className="w-full justify-start gap-4 px-4 py-3.5 h-auto text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-2xl transition-colors font-bold border border-transparent"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="text-sm md:text-base">Çıkış Yap</span>
                </Button>
            </div>
        </aside>
    );
}
