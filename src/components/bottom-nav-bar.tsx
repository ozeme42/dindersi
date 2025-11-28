
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, User, ClipboardList, ShoppingCart, MonitorPlay, PenSquare, DollarSign, Users } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { ErrorReportDialog } from './error-report-dialog';

const NavLink = ({ item, isActive }: { item: { href: string, icon: React.ElementType, label: string }, isActive: boolean }) => {
    const { href, icon: Icon, label } = item;
    return (
        <div className={cn(
            "flex flex-col items-center justify-center gap-0.5 w-full h-full transition-all duration-300",
            isActive ? "text-primary -translate-y-1" : "text-muted-foreground hover:text-foreground/80"
        )}>
            <div className={cn("p-2 rounded-full transition-all duration-300", isActive && "bg-primary/10")}>
                <Icon className="h-5 w-5" />
            </div>
            <span className={cn(
                "text-[10px] font-bold mt-0 transition-all duration-300",
                isActive ? "opacity-100" : "opacity-0"
            )}>
                {label}
            </span>
        </div>
    );
};

export function BottomNavBar() {
    const { user } = useAuth();
    const pathname = usePathname();
    const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

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
        { href: '/student', icon: Home, label: 'Panel' },
        { href: '/student/soru-bankasi', icon: ClipboardList, label: 'Soru Bankası' },
        { href: '/student/shop', icon: ShoppingCart, label: 'Dükkan' },
        { href: '/leaderboard', icon: Trophy, label: 'Sıralama' },
        { href: '/student/profile', icon: User, label: 'Profil' },
    ];

    const teacherLinks = [
        { href: '/', icon: Home, label: 'Panel' },
        { href: '/teacher/content-creation', icon: PenSquare, label: 'İçerik' },
        { href: '/teacher/score-events', icon: DollarSign, label: 'Puanlar' },
        { href: '/teacher/smartboard', icon: MonitorPlay, label: 'Tahta' },
        { href: '/teacher/stats', icon: Trophy, label: 'Sıralama' },
        { href: '/teacher/students', icon: Users, label: 'Öğrenciler' },
    ];
    
    const links = user.role === 'teacher' || user.role === 'superadmin' ? teacherLinks : studentLinks;

    return (
        <>
            <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card/95 backdrop-blur-sm border-t z-50 rounded-t-2xl">
                <div className="flex items-stretch justify-around h-full">
                    {links.map(item => {
                        const isActive = (item.href === '/' || item.href === '/student') ? pathname === item.href : pathname.startsWith(item.href);
                        return (
                            <Link key={item.href} href={item.href} className="flex-1">
                                 <NavLink 
                                    item={item}
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
