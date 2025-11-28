
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, User, ClipboardList, Gamepad2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';

const NavLink = ({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) => {
    const pathname = usePathname();
    const isActive = pathname === href || (href !== '/student' && pathname.startsWith(href));

    return (
        <Link href={href} className="flex-1">
            <div className={cn(
                "flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-colors duration-200",
                isActive ? "text-primary font-bold" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}>
                <Icon className="h-5 w-5" />
                <span className="text-xs">{label}</span>
            </div>
        </Link>
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

    if(user.role !== 'student') {
        return null; // Only show for students for now
    }

    const links = [
        { href: '/student', icon: Home, label: 'Panel' },
        { href: '/student/soru-bankasi', icon: ClipboardList, label: 'Çalışmalar' },
        { href: '/student/activities', icon: Gamepad2, label: 'Etkinlikler' },
        { href: '/leaderboard', icon: Trophy, label: 'Sıralama' },
        { href: '/student/profile', icon: User, label: 'Profil' },
    ];
    
    return (
        <div className="md:hidden fixed bottom-4 left-4 right-4 z-50 h-16 bg-card/80 backdrop-blur-sm border rounded-xl shadow-lg">
            <div className="flex items-stretch justify-around h-full px-1">
                {links.map(link => (
                    <NavLink key={link.href} {...link} />
                ))}
            </div>
        </div>
    );
}
