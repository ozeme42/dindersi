
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, User, PenSquare, Users, MonitorPlay, ClipboardList, Gamepad2, DollarSign } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { ErrorReportDialog } from './error-report-dialog';

const NavLink = ({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) => {
    const pathname = usePathname();
    const isActive = (href === '/' || href === '/student') ? pathname === href : pathname.startsWith(href);

    return (
        <div className={cn(
            "relative flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-300 w-full",
            isActive ? "text-white" : "text-indigo-300/60 hover:text-indigo-200"
        )}>
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
                isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 hidden"
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
                            <Link key={item.href} href={item.href} className="flex-1">
                                 <NavLink 
                                    href={item.href}
                                    icon={item.icon}
                                    label={item.label}
                                />
                            </Link>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
