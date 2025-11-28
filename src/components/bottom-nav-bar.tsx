'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, User, BookOpenCheck, Gamepad2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const NavLink = ({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) => {
    const pathname = usePathname();
    const isActive = (href === '/student' || href === '/') ? pathname === href : pathname.startsWith(href);

    return (
        <Link href={href} className={cn(
            "flex flex-col items-center justify-center gap-1 w-full transition-colors duration-200",
            isActive ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground/80"
        )}>
            <Icon className="h-5 w-5" />
            <span className="text-xs">{label}</span>
        </Link>
    );
};

export function BottomNavBar() {
    const { user } = useAuth();
    const pathname = usePathname();

    if (!user || pathname === '/login' || pathname === '/register') {
        return null;
    }
    
    const studentGamePaths = ['/coz', '/oyun', '/ders/', '/soru-bankasi/'];
    if (user.role === 'student' && studentGamePaths.some(p => pathname.includes(p))) {
        return null;
    }

    const studentLinks = [
        { href: '/student', icon: Home, label: 'Panel' },
        { href: '/student/soru-bankasi', icon: BookOpenCheck, label: 'Çalışmalar' },
        { href: '/student/activities', icon: Gamepad2, label: 'Etkinlikler' },
        { href: '/leaderboard', icon: Trophy, label: 'Sıralama' },
        { href: '/student/profile', icon: User, label: 'Profil' },
    ];
    
    const links = user.role === 'student' ? studentLinks : [];
    
    if (links.length === 0) return null;

    return (
        <div className="md:hidden fixed bottom-2 left-2 right-2 h-14 bg-card/80 backdrop-blur-sm border rounded-t-xl z-50 shadow-lg">
            <div className="flex items-stretch justify-around h-full">
                {links.map(link => (
                    <NavLink key={link.href} {...link} />
                ))}
            </div>
        </div>
    );
}
