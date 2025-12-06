'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Loader2, BookOpen, Columns, LayoutTemplate, Shield, PenSquare, UserCog, 
    FileCog, FileQuestion, ClipboardList, ClipboardCheck, Scale, BarChart3, 
    Video, Settings, Trophy, Bug, DollarSign, LogIn, Gamepad2, Star, Sparkles, PlayCircle
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getPublicCurriculum, type PublicClass } from '@/app/actions/getPublicCurriculum';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AppHeader } from '@/components/app-header';
import { TeacherMainButtons } from '@/components/teacher-main-buttons';

// --- OPTIMIZED COMPONENTS ---

// Daha performanslı ve hafif kart yapısı
const GlassCard = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={cn(
        "backdrop-blur-sm bg-white/10 dark:bg-black/20 border border-white/20 dark:border-white/5 rounded-2xl shadow-xl overflow-hidden transform transition-all",
        className
    )}>
        {children}
    </div>
);

// Skeleton Loader (Daha hızlı açılış hissi için)
const LoadingSkeleton = () => (
    <div className="flex flex-col min-h-screen bg-[#2b1055] items-center p-4 space-y-6 animate-pulse">
        <div className="h-12 w-3/4 bg-white/10 rounded-lg mt-10"></div>
        <div className="flex gap-4 w-full justify-center">
            <div className="h-12 w-32 bg-white/10 rounded-xl"></div>
            <div className="h-12 w-32 bg-white/10 rounded-xl"></div>
        </div>
        <div className="w-full space-y-4 mt-8">
            {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 w-full bg-white/5 rounded-2xl border border-white/10"></div>
            ))}
        </div>
    </div>
);

const GameButton = ({ children, className, variant = 'primary', href, target, ...props }: any) => {
    const variants: {[key: string]: string} = {
        primary: "bg-indigo-500 active:bg-indigo-600 border-indigo-700 text-white shadow-indigo-900/20",
        secondary: "bg-rose-500 active:bg-rose-600 border-rose-700 text-white shadow-rose-900/20",
        success: "bg-emerald-500 active:bg-emerald-600 border-emerald-700 text-white shadow-emerald-900/20",
        warning: "bg-amber-500 active:bg-amber-600 border-amber-700 text-white shadow-amber-900/20",
    };

    const baseClass = "relative w-full sm:w-auto inline-flex items-center justify-center font-bold uppercase tracking-wide transition-transform duration-100 border-b-[4px] active:border-b-0 active:translate-y-[4px] rounded-xl py-3 px-6 shadow-lg text-sm sm:text-base";
    
    const content = (
        <span className={cn(baseClass, variants[variant], className)} {...props}>
            {children}
        </span>
    );

    if (href) return <Link href={href} target={target} className="w-full sm:w-auto block sm:inline-block text-center">{content}</Link>;
    return <button className="w-full sm:w-auto block sm:inline-block">{content}</button>;
};

// --- LOGGED OUT PAGE (Public View) ---
const LoggedOutPage = ({ classGroups }: { classGroups: PublicClass[] }) => {
    if (!classGroups || classGroups.length === 0) {
        return (
            <div className="flex flex-col min-h-[100dvh] bg-[#2b1055] items-center justify-center p-6 text-center">
                 <div className="p-8 rounded-3xl bg-white/10 backdrop-blur border border-white/20">
                    <Gamepad2 className="w-12 h-12 text-white/50 mx-auto mb-4" />
                    <p className="text-white text-lg font-bold">Macera yükleniyor veya bulunamadı.</p>
                </div>
            </div>
        );
    }

    const groupColors = [
        'from-purple-500 to-indigo-600', 'from-pink-500 to-rose-600', 
        'from-emerald-400 to-teal-600', 'from-amber-400 to-orange-600', 'from-sky-400 to-blue-600'
    ];
    
    const classColorMap: { [key: string]: string } = {
        '5': 'text-sky-500', '6': 'text-emerald-500', '7': 'text-amber-500', 
        '8': 'text-rose-500', 'Lise': 'text-indigo-500', 'Genel': 'text-slate-500',
    };

    return (
        <div className="flex flex-col min-h-[100dvh] bg-[#2b1055] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-[#2b1055] to-black pb-10 font-sans selection:bg-purple-500/30 text-white overflow-x-hidden">
             
             <main className="flex-1 container mx-auto px-4 sm:px-6 py-6 space-y-6 relative z-10 max-w-5xl">
                {/* Hero Mobile Optimized */}
                <div className="flex flex-col items-center justify-center py-6 sm:py-10 space-y-6">
                    <div className="relative text-center">
                        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 opacity-60 blur-xl animate-pulse"></div>
                        <h1 className="relative text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-100 to-white drop-shadow-sm tracking-tight leading-tight">
                            DEĞERLER<br className="sm:hidden"/> OYUNU
                        </h1>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto px-4 sm:px-0">
                        <GameButton href="/login" variant="success">
                            <LogIn className="mr-2 h-5 w-5" /> Giriş Yap
                        </GameButton>
                        <GameButton href="/leaderboard" variant="warning">
                            <Trophy className="mr-2 h-5 w-5" /> Liderlik
                        </GameButton>
                    </div>
                </div>
                 
                {/* Content Groups */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {classGroups.map((group, groupIndex) => (
                        <div key={group.name}>
                            <GlassCard>
                                <Accordion type="single" collapsible className="w-full border-none">
                                    <AccordionItem value={group.name} className="border-none">
                                        <AccordionTrigger className={cn(
                                            "px-5 py-4 text-lg sm:text-xl font-black text-white hover:no-underline transition-all active:scale-[0.99]",
                                            `bg-gradient-to-r ${groupColors[groupIndex % groupColors.length]}`
                                        )}>
                                            <div className="flex items-center gap-3">
                                                <Star className="h-5 w-5 text-yellow-300 fill-yellow-300 shrink-0" />
                                                <span>{isNaN(parseInt(group.name)) ? group.name : `${group.name}. Sınıf`}</span>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="p-0 bg-black/10">
                                            <div className="p-3 space-y-2">
                                                <Accordion type="single" collapsible className="w-full space-y-2">
                                                    {group.courses.map((course) => (
                                                        <AccordionItem key={course.id} value={course.id} className="border border-white/10 bg-white/5 rounded-xl overflow-hidden">
                                                            <AccordionTrigger className="px-3 py-2.5 hover:bg-white/5 hover:no-underline">
                                                                <div className="flex items-center gap-3 text-left">
                                                                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center font-bold text-sm bg-white shrink-0", classColorMap[group.name] || 'text-slate-500')}>
                                                                         {group.name.charAt(0)}
                                                                    </div>
                                                                    <span className="text-base font-bold text-white/90 leading-tight">
                                                                        {course.title}
                                                                    </span>
                                                                </div>
                                                            </AccordionTrigger>
                                                            <AccordionContent className="px-3 pb-3 pt-1">
                                                                {/* Mobile padding fix: pl-2 instead of pl-5 */}
                                                                <Accordion type="single" collapsible className="mt-1 space-y-1 pl-1 border-l border-dashed border-white/20 ml-2">
                                                                    {course.units.length > 0 ? course.units.map(unit => (
                                                                        <AccordionItem value={unit.id} key={unit.id} className="border-none">
                                                                            <AccordionTrigger className="font-bold uppercase text-[10px] sm:text-xs tracking-wider text-indigo-300 hover:no-underline py-2 text-left">
                                                                                {unit.title}
                                                                            </AccordionTrigger>
                                                                            <AccordionContent className="space-y-2 pt-1">
                                                                                {unit.topics.map(topic => (
                                                                                    <div key={topic.id} className="flex flex-col gap-2 bg-black/20 p-2.5 rounded-lg border border-white/5">
                                                                                        <div className="flex items-start gap-2">
                                                                                            <Sparkles className="h-4 w-4 text-yellow-200 shrink-0 mt-0.5" />
                                                                                            <span className="font-medium text-sm text-white/90 leading-snug">{topic.title}</span>
                                                                                        </div>
                                                                                        {(topic.hasYazilacaklarContent || topic.hasOzetContent) && (
                                                                                            <div className="flex gap-2 ml-6">
                                                                                                {topic.hasYazilacaklarContent && (
                                                                                                    <Link href={`/yazilacaklar/${course.id}/${unit.id}/${topic.id}`} className="flex-1 text-center bg-sky-600/80 p-1.5 rounded text-[10px] font-bold text-white border-b-2 border-sky-800 active:border-b-0 active:translate-y-[1px]">
                                                                                                        <Columns className="h-3 w-3 inline mr-1"/> Yazılacaklar
                                                                                                    </Link>
                                                                                                )}
                                                                                                {topic.hasOzetContent && (
                                                                                                    <Link href={`/ozetler/${course.id}/${unit.id}/${topic.id}`} className="flex-1 text-center bg-amber-600/80 p-1.5 rounded text-[10px] font-bold text-white border-b-2 border-amber-800 active:border-b-0 active:translate-y-[1px]">
                                                                                                        <BookOpen className="h-3 w-3 inline mr-1"/> Özet
                                                                                                    </Link>
                                                                                                )}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                ))}
                                                                            </AccordionContent>
                                                                        </AccordionItem>
                                                                    )) : <p className="text-xs text-white/40 italic p-1">İçerik hazırlanıyor.</p>}
                                                                </Accordion>
                                                            </AccordionContent>
                                                        </AccordionItem>
                                                    ))}
                                                </Accordion>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </GlassCard>
                        </div>
                    ))}
                </div>
            </main>

            <footer className="p-6 text-center z-10 mt-auto">
                <p className="text-white/30 text-[10px] font-medium tracking-widest uppercase">Eğlenerek Öğrenmenin Adresi</p>
            </footer>
        </div>
    );
};

// --- LOGGED IN DASHBOARD ---
const ManagementButton = React.memo(({ href, title, icon, colorClass }: { href: string, title: string, icon: React.ReactNode, colorClass: string }) => (
    <Link href={href} className="block group h-full touch-manipulation">
        <div className={cn(
            "h-full p-3 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-center transition-all duration-200 border-b-[4px] active:border-b-0 active:translate-y-[4px]",
            "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-900 shadow-sm active:shadow-none"
        )}>
            <div className={cn("p-3 rounded-xl mb-2 sm:mb-3", colorClass)}>
                {React.cloneElement(icon as React.ReactElement, { className: "h-6 w-6 sm:h-8 sm:w-8 text-white" })}
            </div>
            <h3 className="font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-tight">{title}</h3>
        </div>
    </Link>
));
ManagementButton.displayName = 'ManagementButton';

const LoggedInDashboard = ({ user }: { user: any }) => {
    const router = useRouter();

    useEffect(() => {
        if (user.role === 'student') router.replace('/student');
    }, [user, router]);
    
    if (user.role === 'student') return <LoadingSkeleton />;
  
    const buttons = useMemo(() => {
        const list = [
            { href: "/teacher/content-creation", title: "İçerik", icon: <PenSquare />, color: "bg-orange-500" },
            { href: '/teacher/students', title: 'Öğrenci', icon: <UserCog />, color: "bg-blue-500" },
            { href: '/teacher/questions', title: 'Sorular', icon: <FileCog />, color: "bg-indigo-500" },
            { href: '/teacher/exam-questions', title: 'Havuz', icon: <FileQuestion />, color: "bg-violet-500" },
            { href: '/teacher/activity-data', title: 'Veriler', icon: <ClipboardList />, color: "bg-teal-500" },
            { href: '/teacher/exams', title: 'Denemeler', icon: <ClipboardCheck />, color: "bg-green-500" },
            { href: '/teacher/scales', title: 'Ölçekler', icon: <Scale />, color: "bg-cyan-500" },
            { href: '/teacher/stats', title: 'İstatistik', icon: <BarChart3 />, color: "bg-pink-500" },
            { href: '/teacher/video-library', title: 'Videolar', icon: <Video />, color: "bg-rose-500" },
            { href: '/teacher/game-settings', title: 'Ayarlar', icon: <Settings />, color: "bg-slate-500" },
            { href: "/leaderboard", title: "Liderlik", icon: <Trophy />, color: "bg-yellow-500" },
            { href: '/teacher/error-reports', title: 'Hatalar', icon: <Bug />, color: "bg-red-400" },
            { href: '/teacher/score-events', title: 'Puanlar', icon: <DollarSign />, color: "bg-emerald-500" },
        ];
        if(user.role === 'superadmin') {
            list.unshift({ href: '/teacher/superadmin', title: 'Süper Admin', icon: <Shield />, color: "bg-red-600" });
        }
        return list;
    }, [user.role]);
  
  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-50 dark:bg-slate-950 transition-colors pb-10">
      <AppHeader />
      <main className="flex-1 container mx-auto px-4 py-6 space-y-6">
        <div className="text-center space-y-2 py-2">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-800 dark:text-white">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">Öğretmen</span> Paneli
          </h1>
        </div>
        
        {/* Hızlı İşlemler - Mobile Optimized */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-800">
             <h2 className="text-base font-bold mb-3 text-slate-700 dark:text-slate-300 flex items-center gap-2">
                 <PlayCircle className="text-indigo-500 w-5 h-5"/> Hızlı İşlemler
             </h2>
             <TeacherMainButtons />
        </div>

        {/* Grid - Mobile: 2 columns, Desktop: 4+ */}
        <div className="space-y-3">
             <div className="flex items-center gap-2 px-1">
                 <LayoutTemplate className="text-slate-400 w-5 h-5" />
                 <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200">Araçlar</h2>
             </div>
             
             <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                {buttons.map((btn) => (
                    <ManagementButton key={btn.href} {...btn} colorClass={btn.color} />
                ))}
            </div>
        </div>
      </main>
    </div>
  );
};

export default function Home() {
  const { user, loading } = useAuth();
  const [classGroups, setClassGroups] = useState<PublicClass[]>([]);
  // Başlangıçta boş array ile başla, loading skeleton göster
  const [contentLoading, setContentLoading] = useState(true);

  useEffect(() => {
    if (!user && !loading) {
      getPublicCurriculum()
        .then(data => {
          setClassGroups(data.classGroups);
          setContentLoading(false);
        })
        .catch(err => {
          console.error("Fetch error:", err);
          setContentLoading(false);
        });
    } else if (user) {
        setContentLoading(false);
    }
  }, [user, loading]);

  // Auth yüklenirken veya Veri çekilirken Skeleton göster
  if (loading || (contentLoading && !user)) {
    return <LoadingSkeleton />;
  }
  
  return user ? <LoggedInDashboard user={user} /> : <LoggedOutPage classGroups={classGroups} />;
}
