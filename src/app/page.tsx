'use client';

import React, { useState, useEffect } from 'react';
import { 
    Loader2, BookOpen, Columns, LayoutTemplate, Shield, PenSquare, UserCog, 
    FileCog, FileQuestion, ClipboardList, ClipboardCheck, Scale, BarChart3, 
    Video, Settings, Trophy, Bug, DollarSign, LogIn, ListOrdered, Smartphone, 
    Gamepad2, Star, Sparkles, ChevronDown, PlayCircle, Menu, X, User
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getPublicCurriculum } from '@/app/actions/getPublicCurriculum';
import type { PublicClass } from '@/app/actions/getPublicCurriculum';

// --- UTILS ---
import { cn } from '@/lib/utils';

// --- UI COMPONENTS ---
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AppHeader } from '@/components/app-header';
import { TeacherMainButtons } from '@/components/teacher-main-buttons';

// --- GAME THEME COMPONENTS ---
const GameButton = ({ children, className, variant = 'primary', href, target, ...props }: any) => {
    const variants: {[key: string]: string} = {
        primary: "bg-indigo-500 hover:bg-indigo-400 border-indigo-700 text-white shadow-indigo-900/20",
        secondary: "bg-rose-500 hover:bg-rose-400 border-rose-700 text-white shadow-rose-900/20",
        success: "bg-emerald-500 hover:bg-emerald-400 border-emerald-700 text-white shadow-emerald-900/20",
        warning: "bg-amber-500 hover:bg-amber-400 border-amber-700 text-white shadow-amber-900/20",
        info: "bg-sky-500 hover:bg-sky-400 border-sky-700 text-white shadow-sky-900/20",
        dark: "bg-slate-700 hover:bg-slate-600 border-slate-900 text-white shadow-slate-900/20",
    };

    const baseClass = "relative inline-flex items-center justify-center font-bold uppercase tracking-wide transition-all duration-200 border-b-[6px] active:border-b-0 active:translate-y-[6px] rounded-2xl py-3 px-6 shadow-xl group cursor-pointer";
    
    const content = (
        <span className={cn(baseClass, variants[variant], className)} {...props}>
            {children}
        </span>
    );

    if (href) {
        return <Link href={href} target={target} className="inline-block">{content}</Link>;
    }
    return <button className="inline-block">{content}</button>;
};

const GlassCard = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={cn(
        "backdrop-blur-md bg-white/10 dark:bg-black/20 border-2 border-white/20 dark:border-white/5 rounded-3xl shadow-2xl overflow-hidden",
        className
    )}>
        {children}
    </div>
);


// --- MAIN PAGES ---

const LoggedOutPage = ({ classGroups }: { classGroups: PublicClass[] }) => {
    if (classGroups.length === 0) {
        return (
            <div className="flex flex-col min-h-screen bg-[#2b1055] items-center justify-center p-4">
                 <div className="text-center p-8 rounded-3xl bg-white/10 backdrop-blur-lg border border-white/20">
                    <Gamepad2 className="w-16 h-16 text-white/50 mx-auto mb-4" />
                    <p className="text-white text-xl font-bold">Gösterilecek herkese açık macera bulunmuyor.</p>
                </div>
            </div>
        );
    }

    const groupColors = [
        'from-purple-500 to-indigo-600', 
        'from-pink-500 to-rose-600', 
        'from-emerald-400 to-teal-600',
        'from-amber-400 to-orange-600', 
        'from-sky-400 to-blue-600'
    ];
    
    const classColorMap: { [key: string]: string } = {
        '5': 'text-sky-500',
        '6': 'text-emerald-500',
        '7': 'text-amber-500',
        '8': 'text-rose-500',
        'Lise': 'text-indigo-500',
        'Genel': 'text-slate-500',
    };
    
    const formatGroupName = (name: string) => {
        if (!isNaN(parseInt(name))) {
            return `${name}. Sınıf`;
        }
        return name;
    }

    return (
        <div className="flex flex-col min-h-screen bg-[#2b1055] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-[#2b1055] to-black pb-20 md:pb-8 font-sans selection:bg-purple-500/30 text-white">
             
             {/* Hero Section */}
             <main className="flex-1 container mx-auto p-4 sm:p-6 md:p-8 space-y-8 relative z-10">
                <div className="flex flex-col items-center justify-center py-10 space-y-6">
                    <div className="relative">
                        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 opacity-75 blur-xl animate-pulse"></div>
                        <h1 className="relative text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-100 to-white drop-shadow-sm text-center tracking-tight">
                            DEĞERLER OYUNU
                        </h1>
                    </div>
                    
                    <div className="flex gap-4 flex-wrap justify-center mt-8">
                        <GameButton href="/login" variant="success" className="text-lg min-w-[160px]">
                            <LogIn className="mr-2 h-6 w-6" /> Giriş Yap
                        </GameButton>
                        <GameButton href="/leaderboard" variant="warning" className="text-lg min-w-[160px]">
                            <Trophy className="mr-2 h-6 w-6" /> Liderlik
                        </GameButton>
                    </div>
                </div>
                 
                {/* Content Groups */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {classGroups.map((group, groupIndex) => (
                        <div key={group.name} className="space-y-4">
                            <GlassCard>
                                <Accordion type="multiple" defaultValue={[group.name]} className="w-full border-none">
                                    <AccordionItem value={group.name} className="border-none">
                                        <AccordionTrigger className={cn(
                                            "px-6 py-5 text-xl sm:text-2xl font-black text-white hover:no-underline rounded-t-3xl data-[state=closed]:rounded-b-3xl transition-all",
                                            `bg-gradient-to-r ${groupColors[groupIndex % groupColors.length]}`
                                        )}>
                                            <div className="flex items-center gap-3">
                                                <Star className="h-6 w-6 text-yellow-300 fill-yellow-300" />
                                                {formatGroupName(group.name)}
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="p-0 bg-white/5">
                                            <div className="p-4 space-y-3">
                                                <Accordion type="multiple" className="w-full space-y-3">
                                                    {group.courses.map((course) => (
                                                        <AccordionItem 
                                                            value={course.id} 
                                                            key={course.id} 
                                                            className="border-none bg-white/5 rounded-2xl overflow-hidden border border-white/10"
                                                        >
                                                            <AccordionTrigger className="px-4 py-3 hover:bg-white/5 hover:no-underline transition-colors">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center font-bold text-lg bg-white shadow-sm", classColorMap[group.name] || 'text-slate-500')}>
                                                                         {group.name.charAt(0)}
                                                                    </div>
                                                                    <span className="text-lg font-bold text-white/90">
                                                                        {course.title}
                                                                    </span>
                                                                </div>
                                                            </AccordionTrigger>
                                                            <AccordionContent className="px-4 pb-4 pt-0">
                                                                <Accordion type="multiple" className="mt-2 space-y-2 pl-3 border-l-2 border-dashed border-white/20 ml-5">
                                                                    {course.units.length > 0 ? (
                                                                            course.units.map(unit => (
                                                                            <AccordionItem value={unit.id} key={unit.id} className="border-none">
                                                                                <AccordionTrigger className="font-bold uppercase text-xs tracking-wider text-indigo-300 hover:no-underline py-2">
                                                                                    {unit.title}
                                                                                </AccordionTrigger>
                                                                                <AccordionContent className="space-y-2 pt-2">
                                                                                    {unit.topics.map(topic => (
                                                                                        <div key={topic.id} className="group/topic flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black/20 hover:bg-black/40 p-3 rounded-xl transition-all border border-transparent hover:border-white/10">
                                                                                            <div className="flex items-center gap-3">
                                                                                                <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center group-hover/topic:scale-110 transition-transform">
                                                                                                    <Sparkles className="h-4 w-4 text-yellow-200" />
                                                                                                </div>
                                                                                                <span className="font-medium text-white/90">{topic.title}</span>
                                                                                            </div>
                                                                                            <div className="flex gap-2 self-end sm:self-center">
                                                                                                {topic.hasYazilacaklarContent && (
                                                                                                    <Link href={`/yazilacaklar/${course.id}/${unit.id}/${topic.id}`} className="flex items-center gap-1 bg-sky-600/80 hover:bg-sky-500 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-colors border-b-2 border-sky-800 active:border-b-0 active:translate-y-[2px]">
                                                                                                        <Columns className="h-3.5 w-3.5"/> Yazılacaklar
                                                                                                    </Link>
                                                                                                )}
                                                                                                {topic.hasOzetContent && (
                                                                                                    <Link href={`/ozetler/${course.id}/${unit.id}/${topic.id}`} className="flex items-center gap-1 bg-amber-600/80 hover:bg-amber-500 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-colors border-b-2 border-amber-800 active:border-b-0 active:translate-y-[2px]">
                                                                                                        <BookOpen className="h-3.5 w-3.5"/> Özet
                                                                                                    </Link>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    ))}
                                                                                </AccordionContent>
                                                                            </AccordionItem>
                                                                            ))
                                                                    ) : <p className="text-sm text-white/40 italic p-2">Henüz görev eklenmemiş.</p>}
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

            <footer className="container mx-auto p-8 text-center relative z-10">
                <p className="text-white/30 text-xs mt-8 font-medium tracking-widest uppercase">Eğlenerek Öğrenmenin Adresi</p>
            </footer>
        </div>
    );
};

// --- LOGGED IN DASHBOARD ---

const ManagementButton = ({ href, title, icon, colorClass }: { href: string, title: string, icon: React.ReactNode, colorClass: string }) => {
    return (
        <Link href={href} className="block group h-full">
            <div className={cn(
                "h-full p-4 rounded-3xl flex flex-col items-center justify-center text-center transition-all duration-300 border-b-[6px] active:border-b-0 active:translate-y-[6px]",
                "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-900 shadow-lg hover:shadow-xl group-hover:-translate-y-1 group-active:shadow-none"
            )}>
                <div className={cn("p-4 rounded-2xl mb-3 transition-colors", colorClass)}>
                    {React.cloneElement(icon as React.ReactElement, { className: "h-8 w-8 text-white" })}
                </div>
                <h3 className="font-bold text-sm md:text-base text-slate-700 dark:text-slate-200 leading-tight">{title}</h3>
            </div>
        </Link>
    );
};

const LoggedInDashboard = ({ user }: { user: any }) => {
    const router = useRouter();

    useEffect(() => {
        if (user.role === 'student') {
            router.replace('/student');
        }
    }, [user, router]);
    
    if (user.role === 'student') {
        return (
            <div className="flex h-[80vh] items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="flex flex-col items-center gap-4 text-center p-6">
                    <div className="relative">
                        <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 animate-pulse rounded-full"></div>
                        <Gamepad2 className="h-20 w-20 text-indigo-600 relative z-10 animate-bounce" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Hoşgeldin {user.displayName}!</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">Oyun Alanına Yönlendiriliyorsunuz...</p>
                </div>
            </div>
        );
    }
  
  // Dashboard Konfigürasyonu
  const managementButtons = {
    superAdmin: { key: 'superAdmin', href: '/teacher/superadmin', title: 'Süper Admin', icon: <Shield />, color: "bg-red-500 shadow-red-200" },
    contentTeacher: { key: 'contentTeacher', href: "/teacher/content-creation", title: "İçerik Yönetimi", icon: <PenSquare />, color: "bg-orange-500 shadow-orange-200" },
    studentsTeacher: { key: 'studentsTeacher', href: '/teacher/students', title: 'Öğrenci Yönetimi', icon: <UserCog />, color: "bg-blue-500 shadow-blue-200" },
    questionsTeacher: { key: 'questionsTeacher', href: '/teacher/questions', title: 'Soru Bankası', icon: <FileCog />, color: "bg-indigo-500 shadow-indigo-200" },
    examQuestions: { key: 'examQuestions', href: '/teacher/exam-questions', title: 'Deneme Havuzu', icon: <FileQuestion />, color: "bg-violet-500 shadow-violet-200" },
    activityDataBank: { key: 'activityDataBank', href: '/teacher/activity-data', title: 'Etkinlik Verileri', icon: <ClipboardList />, color: "bg-teal-500 shadow-teal-200" },
    exams: { key: 'exams', href: '/teacher/exams', title: 'Deneme Oluştur', icon: <ClipboardCheck />, color: "bg-green-500 shadow-green-200" },
    evaluationScales: { key: 'evaluationScales', href: '/teacher/scales', title: 'Ölçekler', icon: <Scale />, color: "bg-cyan-500 shadow-cyan-200" },
    statsTeacher: { key: 'statsTeacher', href: '/teacher/stats', title: 'İstatistikler', icon: <BarChart3 />, color: "bg-pink-500 shadow-pink-200" },
    videoLibrary: { key: 'videoLibrary', href: '/teacher/video-library', title: 'Video Arşivi', icon: <Video />, color: "bg-rose-500 shadow-rose-200" },
    gameSettingsTeacher: { key: 'gameSettingsTeacher', href: '/teacher/game-settings', title: 'Oyun Ayarları', icon: <Settings />, color: "bg-slate-500 shadow-slate-200" },
    leaderboard: { key: 'leaderboard', href: "/leaderboard", title: "Liderlik", icon: <Trophy />, color: "bg-yellow-500 shadow-yellow-200" },
    errorReports: { key: 'errorReports', href: '/teacher/error-reports', title: 'Hata Raporları', icon: <Bug />, color: "bg-red-400 shadow-red-100" },
    scoreEvents: { key: 'scoreEvents', href: '/teacher/score-events', title: 'Puan Hareketleri', icon: <DollarSign />, color: "bg-emerald-500 shadow-emerald-200" },
  };

  const getManagementButtons = () => {
      const buttons = [
          managementButtons.contentTeacher,
          managementButtons.studentsTeacher,
          managementButtons.questionsTeacher,
          managementButtons.examQuestions,
          managementButtons.activityDataBank,
          managementButtons.exams,
          managementButtons.evaluationScales,
          managementButtons.statsTeacher,
          managementButtons.videoLibrary,
          managementButtons.gameSettingsTeacher,
          managementButtons.leaderboard,
          managementButtons.errorReports,
          managementButtons.scoreEvents,
      ];
      if(user.role === 'superadmin') {
          buttons.unshift(managementButtons.superAdmin);
      }
      return buttons;
  }
  
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <AppHeader />
      <main className="flex-1 container mx-auto p-4 sm:p-6 md:p-8 space-y-10">
        
        {/* Header Section */}
        <div className="text-center space-y-4 py-6">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-800 dark:text-white">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">
                Öğretmen
            </span>{" "}
            Paneli
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto">
             {user.role === 'superadmin' ? 'Sistem üzerindeki tüm kontroller elinizin altında.' : 'Sınıfını yönet, içerik ekle ve öğrencilerinin gelişimini takip et.'}
          </p>
        </div>
        
        {/* Quick Actions Component */}
         <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
             <h2 className="text-lg font-bold mb-4 text-slate-700 dark:text-slate-300 flex items-center gap-2">
                 <PlayCircle className="text-indigo-500"/> Hızlı İşlemler
             </h2>
             <TeacherMainButtons />
         </div>

        {/* Management Grid */}
        <div className="space-y-4">
             <div className="flex items-center gap-2 px-2">
                 <LayoutTemplate className="text-slate-400" />
                 <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">Yönetim Araçları</h2>
             </div>
             
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                {getManagementButtons().map(({ key, href, title, icon, color }) =>
                    <ManagementButton key={key} href={href} title={title} icon={icon} colorClass={color} />
                )}
            </div>
        </div>

      </main>
    </div>
  );
};


export default function Home() {
  const { user, loading } = useAuth();
  const [classGroups, setClassGroups] = useState<PublicClass[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    // Fetch data only for the logged-out view
    if (!user && !loading) {
      getPublicCurriculum()
        .then(data => {
          setClassGroups(data.classGroups);
          setDataLoading(false);
        })
        .catch(err => {
          console.error("Failed to fetch public curriculum:", err);
          setDataLoading(false);
        });
    } else {
      setDataLoading(false);
    }
  }, [user, loading]);

  const viewLoading = loading || dataLoading;

  if (viewLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#2b1055]">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    );
  }
  
  return user ? <LoggedInDashboard user={user} /> : <LoggedOutPage classGroups={classGroups || []} />;
}
