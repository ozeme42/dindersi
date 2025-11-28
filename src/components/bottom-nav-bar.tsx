
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, User, Gamepad2, MonitorPlay, ClipboardList, DollarSign, PenSquare } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const NavLink = ({ href, icon: Icon, label, isActive }: { href: string; icon: React.ElementType; label: string; isActive: boolean }) => {
    return (
        <div className={cn(
            "relative flex flex-col items-center justify-center gap-1 w-full text-center p-1 rounded-lg",
            isActive ? "text-primary" : "text-muted-foreground hover:text-primary/80"
        )}>
            <div className="relative">
                <Icon className={cn(
                    "h-6 w-6 transition-all duration-200",
                    isActive && "scale-110"
                )} />
            </div>
            <span className={cn(
                "text-xs font-medium transition-opacity duration-200",
                isActive ? "opacity-100" : "opacity-80"
            )}>
                {label}
            </span>
        </div>
    );
};

export function BottomNavBar() {
    const { user } = useAuth();
    const pathname = usePathname();

    if (!user || pathname === '/login' || pathname === '/register') {
        return null;
    }
    
    // Hide on specific focus-intensive student pages
    const studentGamePaths = ['/coz', '/oyun', '/ders/', '/soru-bankasi/'];
    if (user.role === 'student' && studentGamePaths.some(p => pathname.includes(p))) {
        return null;
    }

    const studentLinks = [
        { href: '/student', icon: Home, label: 'Panel' },
        { href: '/student/activities', icon: Gamepad2, label: 'Etkinlikler' },
        { href: '/student/soru-bankasi', icon: ClipboardList, label: 'Soru Bankası' },
        { href: '/leaderboard', icon: Trophy, label: 'Sıralama' },
        { href: '/student/profile', icon: User, label: 'Profil' },
    ];

    const teacherLinks = [
        { href: '/', icon: Home, label: 'Panel' },
        { href: '/teacher/content-creation', icon: PenSquare, label: 'İçerik' },
        { href: '/teacher/score-events', icon: DollarSign, label: 'Puanlar' },
        { href: '/teacher/smartboard', icon: MonitorPlay, label: 'Tahta' },
        { href: '/teacher/stats', icon: Trophy, label: 'Sıralama' },
    ];
    
    const links = user.role === 'teacher' || user.role === 'superadmin' ? teacherLinks : studentLinks;

    return (
        <>
            <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card/95 backdrop-blur-sm border-t z-50 rounded-t-2xl">
                <div className="flex items-stretch justify-around h-full">
                    {links.map(item => {
                        const isActive = (item.href === '/' || item.href === '/student') ? pathname === item.href : pathname.startsWith(item.href);
                        return (
                            <Link key={item.id} href={item.href} className="flex-1">
                                 <NavLink 
                                    href={item.href}
                                    icon={item.icon}
                                    label={item.label}
                                    isActive={isActive}
                                />
                            </Link>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
