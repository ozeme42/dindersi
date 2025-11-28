
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, User, Gamepad2, Map } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const NavLink = ({ href, icon: Icon, label, isActive, onClick, item }: { href: string; icon: React.ElementType; label: string, isActive: boolean, onClick: () => void, item: any }) => {

    return (
        <button
            onClick={onClick}
            className={cn(
                "relative flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-300 w-full",
                isActive ? "text-white" : "text-indigo-300/60 hover:text-indigo-200"
            )}
        >
            {/* Active Indicator Background */}
            {isActive && (
                <div className="absolute inset-0 bg-indigo-500/20 rounded-xl blur-sm" />
            )}
            
            <div className="relative z-10">
                <Icon className={cn(
                    "h-6 w-6 transition-all duration-300",
                    isActive ? "text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.8)] scale-110" : ""
                )} />
            </div>

            <span className={cn(
                "text-[10px] font-bold mt-1 transition-all duration-300",
                isActive ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
            )}>
                {label}
            </span>
        </button>
    );
};


export function BottomNavBar() {
    const { user } = useAuth();
    const pathname = usePathname();
    
    // Hide on login/register pages or if no user
    if (!user || pathname === '/login' || pathname === '/register') {
        return null;
    }
    
    // Hide on specific focus-intensive student pages
    const studentGamePaths = ['/coz', '/oyun', '/ders/', '/soru-bankasi/'];
    if (user.role === 'student' && studentGamePaths.some(p => pathname.includes(p))) {
        return null;
    }

    const studentLinks = [
        { id: 'home', icon: Home, label: 'Ana Üs', href: '/student' },
        { id: 'quests', icon: Map, label: 'Görevler', href: '/student/soru-bankasi' },
        { id: 'activities', icon: Gamepad2, label: 'Etkinlikler', href: '/student/activities', highlight: true },
        { id: 'rank', icon: Trophy, label: 'Liderlik', href: '/leaderboard' },
        { id: 'profile', icon: User, label: 'Profil', href: '/student/profile' },
    ];

    const teacherLinks = [
        // Teacher links can be added here if needed
    ];
    
    const links = user.role === 'student' ? studentLinks : [];
    
    if (links.length === 0) return null;

    return (
        <>
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
                <div className="bg-[#1a0b2e]/90 backdrop-blur-xl border-t border-white/10 px-2 py-2 flex justify-between items-stretch">
                    {links.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link key={item.id} href={item.href} passHref legacyBehavior>
                                <a className="flex-1">
                                     <NavLink 
                                        href={item.href}
                                        icon={item.icon}
                                        label={item.label}
                                        isActive={isActive}
                                        onClick={() => {}}
                                        item={item}
                                    />
                                </a>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
