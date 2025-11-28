
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, User, BookOpenCheck, Users, MonitorPlay, ClipboardList, Repeat, ShoppingCart, Package, Scale, Bug, DollarSign } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { ErrorReportDialog } from './error-report-dialog';

const NavLink = ({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) => {
    const pathname = usePathname();
    const isActive = (href === '/' || href === '/student') ? pathname === href : pathname.startsWith(href);

    return (
        <Link href={href} className={cn(
            "flex flex-col items-center justify-center gap-1 w-full text-center p-1 rounded-md transition-colors duration-200",
            isActive ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground/80"
        )}>
            <Icon className="h-5 w-5" />
            <span className="text-xs font-medium">{label}</span>
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
        { href: '/student/soru-bankasi', icon: BookOpenCheck, label: 'Çalışmalar' },
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
            <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t z-50">
                <div className="flex items-stretch justify-around h-full px-2">
                    {links.map(link => (
                        <NavLink key={link.href} {...link} />
                    ))}
                </div>
            </div>
        </>
    );
}
