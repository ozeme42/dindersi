'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, User, PenSquare, Users, MonitorPlay, ClipboardList, Map, Swords, Backpack } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { ErrorReportDialog } from './error-report-dialog';

const NavLink = ({ href, icon: Icon, label, isActive, onClick, isHighlight = false }: { 
    href: string; 
    icon: React.ElementType; 
    label: string; 
    isActive: boolean;
    onClick: () => void;
    isHighlight?: boolean;
}) => {
    return (
        <Link 
            href={href} 
            onClick={onClick}
            className={cn(
                "relative flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-300 w-full z-10",
                isActive ? "text-white" : "text-indigo-300/60 hover:text-indigo-200"
            )}
        >
            {isHighlight ? (
                <div className={cn(
                    "relative -mt-8 p-3 rounded-xl border-2 shadow-lg transition-transform duration-300",
                    isActive 
                        ? "bg-gradient-to-br from-amber-400 to-orange-600 border-amber-200 shadow-orange-500/50 scale-110" 
                        : "bg-slate-800 border-slate-600 shadow-black/50"
                )}>
                    <Icon className={cn("h-6 w-6", isActive ? "text-white" : "text-slate-400")} />
                </div>
            ) : (
                <div className="relative z-10">
                    <Icon className={cn(
                        "h-6 w-6 transition-all duration-300",
                        isActive ? "text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.8)] scale-110" : ""
                    )} />
                </div>
            )}
            
            {!isHighlight && isActive && (
                <span className="text-[10px] font-bold mt-1 transition-all duration-300 opacity-100 translate-y-0">
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

    if (!user || pathname === '/login' || pathname === '/register') {
        return null;
    }
    
    const studentGamePaths = ['/coz', '/oyun', '/ders/', '/soru-bankasi/'];
    if (user.role === 'student' && studentGamePaths.some(p => pathname.startsWith(p))) {
        return null;
    }

    const studentLinks = [
        { href: '/student', icon: Home, label: 'Ana Üs' },
        { href: '/student/soru-bankasi', icon: Map, label: 'Görevler' },
        { href: '/student/yarismalar', icon: Swords, label: 'Arena', highlight: true },
        { href: '/leaderboard', icon: Trophy, label: 'Liderlik' },
        { href: '/student/profile', icon: User, label: 'Profil' },
    ];

    const teacherLinks = [
        { href: '/', icon: Home, label: 'Panel' },
        { href: '/teacher/content-creation', icon: PenSquare, label: 'İçerik' },
        { href: '/teacher/smartboard', icon: MonitorPlay, label: 'Tahta', highlight: true },
        { href: '/teacher/stats', icon: Trophy, label: 'Sıralama' },
        { href: '/teacher/students', icon: Users, label: 'Öğrenciler' },
    ];
    
    const links = user.role === 'teacher' || user.role === 'superadmin' ? teacherLinks : studentLinks;

    // Find the best active link, prioritizing deeper paths
    let activeHref = '';
    let maxMatchLength = -1;
    for (const link of links) {
        if (pathname.startsWith(link.href)) {
            if (link.href.length > maxMatchLength) {
                maxMatchLength = link.href.length;
                activeHref = link.href;
            }
        }
    }
    
    const activeLinkIndex = links.findIndex(l => l.href === activeHref);

    return (
        <>
            <div className="fixed bottom-4 left-4 right-4 h-16 z-50 md:hidden">
                <div className="bg-[#1a0b2e]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl px-2 py-1 h-full flex justify-around items-center relative overflow-hidden">
                    
                    {/* Glowing active indicator */}
                    {activeLinkIndex !== -1 && (
                         <div
                            className="absolute top-0 h-full bg-indigo-500/20 rounded-xl transition-all duration-500 ease-in-out"
                            style={{
                                width: `${100 / links.length}%`,
                                left: `${(activeLinkIndex / links.length) * 100}%`,
                            }}
                        />
                    )}
                
                    {links.map(link => (
                        <NavLink 
                            key={link.href} 
                            href={link.href}
                            icon={link.icon}
                            label={link.label}
                            isActive={activeHref === link.href}
                            onClick={() => {}}
                            isHighlight={link.highlight}
                        />
                    ))}
                </div>
            </div>
             {user?.role === 'student' && (
                <ErrorReportDialog isOpen={isReportDialogOpen} onOpenChange={setIsReportDialogOpen} />
            )}
        </>
    );
}
