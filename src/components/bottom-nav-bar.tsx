
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, User, PenSquare, Users, MonitorPlay, ClipboardList, Repeat, ShoppingCart, Package, Scale, Bug, DollarSign, Map, Swords } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { ErrorReportDialog } from './error-report-dialog';

type NavItem = {
    id: string;
    href: string;
    icon: React.ElementType;
    label: string;
    highlight?: boolean;
};

const NavLink = ({ item, isActive, onClick }: { item: NavItem; isActive: boolean; onClick: () => void; }) => {
    const { href, icon: Icon, label, highlight } = item;

    return (
        <Link href={href} onClick={onClick} className={cn(
            "relative flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-300 w-full",
            isActive ? "text-white" : "text-indigo-300/60 hover:text-indigo-200"
        )}>
             {/* Active Indicator Background */}
            {isActive && !highlight && (
                <div className="absolute inset-0 bg-indigo-500/20 rounded-xl blur-sm" />
            )}
            
            {/* Highlighted Middle Button Style */}
            {highlight ? (
                <div className={cn(
                    "relative -mt-8 p-3 rounded-2xl border-2 shadow-lg transition-transform duration-300",
                    isActive 
                        ? "bg-gradient-to-br from-amber-400 to-orange-600 border-amber-200 shadow-orange-500/50 scale-110" 
                        : "bg-slate-800 border-slate-600 shadow-black/50"
                )}>
                    <Icon className={cn("h-7 w-7", isActive ? "text-white" : "text-slate-400")} />
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
            {!highlight && (
                <span className={cn(
                    "text-[10px] font-bold mt-1 transition-all duration-300",
                    isActive ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
                )}>
                    {label}
                </span>
            )}
        </Link>
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

    const studentLinks: NavItem[] = [
        { id: 'home', href: '/student', icon: Home, label: 'Ana Üs' },
        { id: 'quests', href: '/student/soru-bankasi', icon: Map, label: 'Görevler' },
        { id: 'arena', href: '/student/yarismalar', icon: Swords, label: 'Arena', highlight: true },
        { id: 'rank', href: '/leaderboard', icon: Trophy, label: 'Liderlik' },
        { id: 'profile', href: '/student/profile', icon: User, label: 'Profil' },
    ];

    const teacherLinks: NavItem[] = [
        { id: 'home', href: '/', icon: Home, label: 'Panel' },
        { id: 'content', href: '/teacher/content-creation', icon: PenSquare, label: 'İçerik' },
        { id: 'smartboard', href: '/teacher/smartboard', icon: MonitorPlay, label: 'Tahta', highlight: true },
        { id: 'scores', href: '/teacher/score-events', icon: DollarSign, label: 'Puanlar' },
        { id: 'students', href: '/teacher/students', icon: Users, label: 'Öğrenciler' },
    ];
    
    const links = user.role === 'teacher' || user.role === 'superadmin' ? teacherLinks : studentLinks;
    const activeItem = links.find(link => pathname.startsWith(link.href) && (link.href !== '/student' || pathname === '/student'));


    return (
        <>
            <div className="fixed bottom-0 left-0 right-0 h-16 bg-card/95 backdrop-blur-sm border-t z-50 rounded-t-2xl md:hidden">
                <div className="flex items-stretch justify-around h-full">
                    {links.map(link => (
                        <NavLink key={link.id} item={link} isActive={activeItem?.id === link.id} onClick={() => {}}/>
                    ))}
                </div>
            </div>
        </>
    );
}
