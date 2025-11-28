'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, User, BookOpenCheck, Gamepad2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { ErrorReportDialog } from './error-report-dialog';

const NavLink = ({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) => {
    const pathname = usePathname();
    const isActive = (href === '/student') ? pathname === href : pathname.startsWith(href);

    return (
        <Link href={href} className={cn(
            "flex flex-col items-center justify-center gap-1 w-full text-center py-1 transition-colors duration-300",
            isActive ? "text-primary font-bold" : "text-muted-foreground hover:text-primary/80"
        )}>
            <Icon className="h-6 w-6" />
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
    
    const links = user.role === 'teacher' || user.role === 'superadmin' ? [] : studentLinks;
    
    if (links.length === 0) {
        return null;
    }


    return (
        <>
            <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card/95 backdrop-blur-sm border-t rounded-t-xl z-50">
                <div className="flex items-stretch justify-around h-full">
                    {links.map(link => (
                        <NavLink key={link.href} {...link} />
                    ))}
                </div>
            </div>
        </>
    );
}
