
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, User, PenSquare, Users, MonitorPlay, ClipboardList, Repeat, ShoppingCart, Package, Scale, Bug, DollarSign, Swords, Map } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const NavLink = ({ href, icon: Icon, label, isActive, isHighlight = false, onClick }: { href?: string; icon: React.ElementType; label: string, isActive: boolean, isHighlight?: boolean, onClick?: () => void }) => {

    const content = (
        <div
            onClick={onClick}
            className={cn(
                "relative flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-300 w-full"
            )}
        >
            {/* Active Indicator Background */}
            {isActive && !isHighlight && (
                <div className="absolute inset-0 bg-indigo-500/20 rounded-xl blur-sm" />
            )}
            
            {/* Highlighted Middle Button Style */}
            {isHighlight ? (
                <div className={cn(
                    "relative -mt-8 p-3 rounded-xl border-2 shadow-lg transition-transform duration-300",
                    isActive 
                        ? "bg-gradient-to-br from-amber-400 to-orange-600 border-amber-200 shadow-orange-500/50 scale-110" 
                        : "bg-slate-800 border-slate-600 shadow-black/50"
                )}>
                    <Icon className={cn("h-6 w-6", isActive ? "text-white" : "text-slate-400")} />
                </div>
            ) : (
                <div className="relative z-10">
                    <Icon className={cn(
                        "h-6 w-6 transition-all duration-300",
                        isActive ? "text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.8)] scale-110" : ""
                    )} />
                </div>
            )}

            {/* Label (Only visible if not highlighted middle button or if active) */}
            {!item.highlight && (
                <span className={cn(
                    "text-[10px] font-bold mt-1 transition-all duration-300",
                    isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 hidden"
                )}>
                    {item.label}
                </span>
            )}
        </div>
    );

    if (href) {
        return <Link href={href} className="flex-1">{content}</Link>;
    }
    return <button className="flex-1">{content}</button>;
};


export function BottomNavBar() {
    const { user } = useAuth();
    const pathname = usePathname();

    const studentGamePaths = ['/coz', '/oyun', '/ders/', '/soru-bankasi/'];
    if (!user || pathname === '/login' || pathname === '/register' || (user.role === 'student' && studentGamePaths.some(p => pathname.includes(p)))) {
        return null;
    }
    
    const studentLinks = [
        { id: 'home', icon: Home, label: 'Ana Üs', href: '/student' },
        { id: 'quests', icon: Map, label: 'Görevler', href: '/student/soru-bankasi' },
        { id: 'arena', icon: Swords, label: 'Arena', href: '/student/yarismalar', highlight: true },
        { id: 'rank', icon: Trophy, label: 'Liderlik', href: '/leaderboard' },
        { id: 'profile', icon: User, label: 'Profil', href: '/student/profile' },
    ];

    const teacherLinks = [
        { id: 'home', href: '/', icon: Home, label: 'Panel' },
        { id: 'content', href: '/teacher/content-creation', icon: PenSquare, label: 'İçerik' },
        { id: 'scores', href: '/teacher/score-events', icon: DollarSign, label: 'Puanlar' },
        { id: 'smartboard', href: '/teacher/smartboard', icon: MonitorPlay, label: 'Tahta' },
        { id: 'stats', href: '/teacher/stats', icon: Trophy, label: 'Sıralama' },
    ];
    
    const links = user.role === 'teacher' || user.role === 'superadmin' ? teacherLinks : studentLinks;

    return (
        <>
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#1a0b2e]/90 backdrop-blur-xl border-t border-white/10 shadow-2xl px-2 py-2 flex justify-around items-center overflow-hidden rounded-t-2xl">
                {/* Alt parıltı efekti */}
                <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-indigo-500/10 to-transparent pointer-events-none"></div>

                {links.map((item) => {
                    const isActive = (item.href === '/' || item.href === '/student') ? pathname === item.href : pathname.startsWith(item.href);
                    return <NavLink key={item.id} {...item} isActive={isActive} />;
                })}
            </div>
        </>
    );
}
