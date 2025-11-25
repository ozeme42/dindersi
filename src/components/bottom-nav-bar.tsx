
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, User, PenSquare, Users, MonitorPlay, ClipboardList, Repeat, ShoppingCart, Package, Scale, Bug, DollarSign, Gamepad2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { ErrorReportDialog } from './error-report-dialog';

const NavLink = ({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) => {
    const pathname = usePathname();
    const isActive = (href === '/' || href === '/student') ? pathname === href : pathname.startsWith(href);

    return (
        <Link href={href} className="flex flex-col items-center justify-center gap-1 w-full text-center p-1 group">
            <div className={cn(
                "p-2 rounded-full transition-all duration-200",
                isActive ? "bg-primary/10" : ""
            )}>
                 <Icon className={cn("h-5 w-5 transition-all duration-200", isActive ? "text-primary scale-110" : "text-muted-foreground group-hover:text-foreground/80")} />
            </div>
            <span className={cn(
                "text-xs font-medium transition-colors duration-200",
                 isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground/80"
            )}>{label}</span>
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

    const studentLinks = [
        { href: '/student', icon: Home, label: 'Panel' },
        { href: '/student/soru-bankasi', icon: ClipboardList, label: 'Çalışmalar' },
        { href: '/student/activities', icon: Gamepad2, label: 'Etkinlikler' },
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
            <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background via-card/95 to-card/90 backdrop-blur-sm z-50 pb-safe">
                <div className="flex items-stretch justify-around h-full">
                    {links.map(link => (
                        <NavLink key={link.href} {...link} />
                    ))}
                </div>
            </div>
        </>
    );
}
