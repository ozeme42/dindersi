
'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { 
  Home, Trophy, User, PenSquare, Users, MonitorPlay, 
  ClipboardList, ShoppingCart, DollarSign, LayoutGrid, Gamepad2, Star, Sparkles, ChevronDown, PlayCircle, Menu, X, LogOut, Swords, Library, FileText, ChevronRight, ArrowRight, Scale
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { useState } from 'react';

// --- Özelleştirilmiş NavLink Bileşeni ---
const NavLink = ({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) => {
    const pathname = usePathname();
    // Tam eşleşme veya alt klasör kontrolü
    const isActive = (href === '/' || href === '/student') 
        ? pathname === href 
        : pathname.startsWith(href);

    return (
        <Link href={href} className="group flex flex-col items-center justify-center w-full h-full relative overflow-hidden">
            
            {/* Aktiflik Işığı (Üst Çizgi) */}
            {isActive && (
                <span className="absolute top-0 w-12 h-[3px] bg-cyan-400 rounded-b-full shadow-[0_0_10px_rgba(34,211,238,0.8)] animate-in fade-in zoom-in duration-300" />
            )}

            {/* İkon Kutusu */}
            <div className={cn(
                "relative p-1.5 rounded-xl transition-all duration-300 ease-out group-active:scale-90",
                isActive 
                    ? "bg-cyan-500/10 -translate-y-1" 
                    : "hover:bg-white/5"
            )}>
                {/* Aktif ise ikonun arkasında flu bir parlama */}
                {isActive && <div className="absolute inset-0 bg-cyan-400/20 blur-lg rounded-full" />}
                
                <Icon 
                    className={cn(
                        "h-6 w-6 transition-colors duration-300 relative z-10",
                        isActive 
                            ? "text-cyan-400 fill-cyan-400/20" 
                            : "text-slate-500 group-hover:text-slate-300"
                    )} 
                />
            </div>

            {/* Etiket */}
            <span className={cn(
                "text-[10px] font-medium mt-1 transition-all duration-300",
                isActive 
                    ? "text-cyan-100 translate-y-0" 
                    : "text-slate-600 group-hover:text-slate-400"
            )}>
                {label}
            </span>
        </Link>
    );
};

export function BottomNavBar() {
    const { user } = useAuth();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // 1. Giriş/Kayıt sayfalarında veya kullanıcı yoksa gizle
    if (!user || pathname === '/login' || pathname === '/register') {
        return null;
    }
    
    const isEmbedded = searchParams.get('embedded') === 'true';

    // 2. Öğrencinin odaklanması gereken sayfalarda gizle
    const distractionFreePaths = [
        '/student/ders/', // Ders akışı ve tüm alt sayfaları
        '/oyunlar/',      // Tüm oyun sayfaları
    ];

    if (user.role === 'student' && (isEmbedded || distractionFreePaths.some(p => pathname.startsWith(p)))) {
        return null;
    }

    const studentLinks = [
        { href: '/student', icon: Home, label: 'Panel' },
        { href: '/student/soru-bankasi', icon: LayoutGrid, label: 'Çalışmalar' },
        { href: '/oyunlar', icon: Gamepad2, label: 'Etkinlikler' },
        { href: '/leaderboard', icon: Trophy, label: 'Sıralama' },
        { href: '/student/profile', icon: User, label: 'Profil' },
    ];

    const teacherLinks = [
        { href: '/', icon: Home, label: 'Panel' },
        { href: '/teacher/students', icon: Users, label: 'Öğrenciler' },
        { href: '/leaderboard', icon: Trophy, label: 'Liderlik' },
        { href: '/teacher/scales', icon: Scale, label: 'Ölçekler' },
        { href: '/teacher/smartboard', icon: MonitorPlay, label: 'Tahta' },
    ];
    
    const links = user.role === 'teacher' || user.role === 'superadmin' ? teacherLinks : studentLinks;

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
            {/* Arka plan Blur Efekti ve Sınır Çizgisi */}
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl border-t border-white/10 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]" />
            
            {/* Menü İçeriği */}
            <div className="relative flex items-stretch justify-around h-[70px] pb-2 px-2">
                {links.map(link => (
                    <NavLink key={link.href} {...link} />
                ))}
            </div>
        </div>
    );
}
