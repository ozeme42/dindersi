
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, User, ClipboardList, ShoppingCart, Gamepad2, MonitorPlay, PenSquare, DollarSign } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const NavLink = ({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) => {
    const pathname = usePathname();
    const isActive = (href === '/' || href === '/student') ? pathname === href : pathname.startsWith(href);

    return (
        <div className={cn(
            "flex flex-col items-center justify-center gap-0.5 w-full text-center transition-all duration-300",
            isActive ? "text-primary" : "text-muted-foreground hover:text-foreground/80"
        )}>
            <div className={cn("p-2 rounded-full transition-all duration-300", isActive && "bg-primary/10")}>
                <Icon className={cn("h-5 w-5 transition-all duration-300", isActive && "scale-110")} />
            </div>
            <span className={cn(
                "text-[10px] font-bold transition-all duration-300",
                isActive ? "opacity-100" : "opacity-0 h-0"
            )}>{label}</span>
        </div>
    );
};


export function BottomNavBar() {
    const { user } = useAuth();
    const pathname = usePathname();
    const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

    const studentGamePaths = ['/coz', '/oyun', '/ders/', '/soru-bankasi/'];
    
    if (!user || pathname === '/login' || pathname === '/register' || (user.role === 'student' && studentGamePaths.some(p => pathname.includes(p)))) {
        return null;
    }

    const studentLinks = [
        { id: 'student-home', href: '/student', icon: Home, label: 'Panel' },
        { id: 'student-activities', href: '/student/activities', icon: Gamepad2, label: 'Etkinlikler' },
        { id: 'student-deneme', href: '/student/deneme', icon: ClipboardList, label: 'Denemeler' },
        { id: 'student-leaderboard', href: '/leaderboard', icon: Trophy, label: 'Sıralama' },
        { id: 'student-profile', href: '/student/profile', icon: User, label: 'Profil' },
    ];

    const teacherLinks = [
        { id: 'teacher-home', href: '/', icon: Home, label: 'Panel' },
        { id: 'teacher-content', href: '/teacher/content-creation', icon: PenSquare, label: 'İçerik' },
        { id: 'teacher-smartboard', href: '/teacher/smartboard', icon: MonitorPlay, label: 'Tahta' },
        { id: 'teacher-stats', href: '/teacher/stats', icon: Trophy, label: 'Sıralama' },
        { id: 'teacher-students', href: '/teacher/students', icon: Users, label: 'Öğrenciler' },
    ];
    
    const links = user.role === 'teacher' || user.role === 'superadmin' ? teacherLinks : studentLinks;

    return (
        <>
            <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card/95 backdrop-blur-sm border-t z-50 rounded-t-2xl">
                <div className="flex items-stretch justify-around h-full">
                    {links.map((item) => {
                        const isActive = (item.href === '/' || item.href === '/student') ? pathname === item.href : pathname.startsWith(item.href);
                        return (
                            <Link key={item.id} href={item.href} className="flex-1">
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

