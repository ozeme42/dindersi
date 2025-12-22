

      

'use client';

import React, { useState, useEffect } from 'react';
import { 
    Loader2, BookOpen, Columns, LayoutTemplate, Shield, PenSquare, UserCog, 
    FileCog, FileQuestion, ClipboardList, ClipboardCheck, Scale, BarChart3, 
    Image as ImageIcon, Settings, Trophy, Bug, DollarSign, LogIn, ListOrdered, Smartphone, 
    Gamepad2, Star, Sparkles, ChevronDown, PlayCircle, Menu, X, User, LogOut, Swords, MonitorPlay, LayoutGrid, Globe
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// --- UTILS ---
import { cn } from '@/lib/utils';
import type { PublicClass } from './actions/getPublicCurriculum';

// --- UI COMPONENTS ---
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { TeacherMainButtons } from '@/components/teacher-main-buttons';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';

// --- GAME THEME COMPONENTS ---
const GameButton = ({ children, className, variant = 'primary', href, target, ...props }: any) => {
    const variants: {[key: string]: string} = {
        primary: "bg-indigo-600 hover:bg-indigo-500 border-indigo-800 text-white shadow-lg shadow-indigo-900/20",
        secondary: "bg-rose-600 hover:bg-rose-500 border-rose-800 text-white shadow-lg shadow-rose-900/20",
        success: "bg-emerald-600 hover:bg-emerald-500 border-emerald-800 text-white shadow-lg shadow-emerald-900/20",
        warning: "bg-amber-600 hover:bg-amber-500 border-amber-800 text-white shadow-lg shadow-amber-900/20",
        info: "bg-cyan-600 hover:bg-cyan-500 border-cyan-800 text-white shadow-lg shadow-cyan-900/20",
        dark: "bg-slate-800 hover:bg-slate-700 border-slate-900 text-white shadow-lg shadow-slate-900/20",
    };

    const baseClass = "relative inline-flex items-center justify-center font-bold uppercase tracking-wide transition-all duration-200 border-b-[4px] active:border-b-0 active:translate-y-[4px] rounded-xl py-3 px-6 group cursor-pointer";
    
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
        "backdrop-blur-xl bg-slate-900/60 border border-white/10 rounded-3xl shadow-2xl overflow-hidden relative",
        className
    )}>
        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
        {children}
    </div>
);


// --- MAIN PAGES ---

const LoggedOutPage = ({ classGroups }: { classGroups: PublicClass[] }) => {
    const groupColors = [
        'from-purple-500 to-indigo-600', 
        'from-pink-500 to-rose-600', 
        'from-emerald-400 to-teal-600',
        'from-amber-400 to-orange-600', 
        'from-cyan-400 to-blue-600'
    ];
    
    const classColorMap: { [key: string]: string } = {
        '5': 'text-cyan-400',
        '6': 'text-emerald-400',
        '7': 'text-amber-400',
        '8': 'text-rose-400',
        'Lise': 'text-indigo-400',
        'Genel': 'text-slate-400',
    };
    
    const formatGroupName = (name: string) => {
        if (!isNaN(parseInt(name))) {
            return `${name}. Sınıf`;
        }
        return name;
    }

    return (
        <div className="flex flex-col min-h-screen bg-slate-950 pb-20 md:pb-8 font-sans selection:bg-purple-500/30 text-white relative overflow-hidden">
             
             {/* Arka Plan Efektleri */}
             <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-indigo-900/20 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-purple-900/20 rounded-full blur-[150px]" />
            </div>

             {/* Hero Section */}
             <main className="flex-1 container mx-auto p-4 sm:p-6 md:p-8 space-y-12 relative z-10">
                <div className="flex flex-col items-center justify-center py-16 space-y-8 text-center">
                    <div className="relative group">
                        <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                        <div className="relative inline-flex items-center justify-center p-6 bg-slate-900/50 backdrop-blur-sm rounded-[2rem] border border-white/10 mb-6 shadow-2xl">
                             <Gamepad2 className="h-16 w-16 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
                        </div>
                        <h1 className="text-5xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 drop-shadow-2xl tracking-tighter">
                            DEĞERLER OYUNU
                        </h1>
                        <p className="mt-4 text-xl text-slate-400 max-w-2xl mx-auto font-medium">
                            Eğitimi oyunlaştırarak öğrenmeyi eğlenceli hale getirin.
                        </p>
                    </div>
                    
                    <div className="flex gap-4 flex-wrap justify-center mt-8">
                        <GameButton href="/login" variant="success" className="text-lg min-w-[180px] h-14">
                            <LogIn className="mr-2 h-5 w-5" /> Giriş Yap
                        </GameButton>
                        <GameButton href="/leaderboard" variant="warning" className="text-lg min-w-[180px] h-14">
                            <Trophy className="mr-2 h-5 w-5" /> Liderlik
                        </GameButton>
                        <GameButton href="/curriculum" variant="info" className="text-lg min-w-[180px] h-14">
                            <BookOpen className="mr-2 h-5 w-5" /> Müfredatı Keşfet
                        </GameButton>
                    </div>
                </div>
                 
                {/* Content Groups */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
                    {classGroups.map((group, groupIndex) => (
                        <div key={group.name} className="group">
                            <GlassCard className="transition-transform duration-300 hover:-translate-y-1">
                                <Accordion type="multiple" defaultValue={[group.name]} className="w-full border-none">
                                    <AccordionItem value={group.name} className="border-none">
                                        <AccordionTrigger className={cn(
                                            "px-6 py-5 text-xl sm:text-2xl font-black text-white hover:no-underline transition-all relative overflow-hidden",
                                            `bg-gradient-to-r ${groupColors[groupIndex % groupColors.length]}`
                                        )}>
                                            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <div className="flex items-center gap-3 relative z-10">
                                                <Star className="h-6 w-6 text-yellow-300 fill-yellow-300 drop-shadow-md" />
                                                {formatGroupName(group.name)}
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="p-0 bg-slate-900/50">
                                            <div className="p-4 space-y-3">
                                                <Accordion type="multiple" className="w-full space-y-3">
                                                    {group.courses.map((course) => (
                                                        <AccordionItem 
                                                            value={course.id} 
                                                            key={course.id} 
                                                            className="border-none bg-slate-800/40 rounded-xl overflow-hidden border border-white/5 hover:bg-slate-800/60 transition-colors"
                                                        >
                                                            <AccordionTrigger className="px-4 py-3 hover:no-underline group/course">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={cn(
                                                                        "h-10 w-10 rounded-lg flex items-center justify-center font-black text-lg bg-slate-900 border border-white/10 shadow-lg group-hover/course:scale-110 transition-transform", 
                                                                        classColorMap[group.name] || 'text-slate-500'
                                                                    )}>
                                                                        {group.name.charAt(0)}
                                                                    </div>
                                                                    <span className="text-lg font-bold text-slate-200 group-hover/course:text-white transition-colors">
                                                                        {course.title}
                                                                    </span>
                                                                </div>
                                                            </AccordionTrigger>
                                                            <AccordionContent className="px-4 pb-4 pt-0">
                                                                <Accordion type="multiple" className="mt-2 space-y-2 pl-3 border-l-2 border-white/10 ml-5">
                                                                    {course.units.length > 0 ? (
                                                                        course.units.map(unit => (
                                                                        <AccordionItem value={unit.id} key={unit.id} className="border-none">
                                                                            <div className="flex justify-between items-center pr-2">
                                                                                <AccordionTrigger className="font-bold uppercase text-xs tracking-wider text-slate-400 hover:text-white hover:no-underline py-2 transition-colors flex-1">
                                                                                    <span>{unit.title}</span>
                                                                                </AccordionTrigger>
                                                                                {unit.hasUnitOzet && (
                                                                                    <Link href={`/ozetler/${course.id}/${unit.id}`} onClick={(e) => e.stopPropagation()}>
                                                                                        <Button variant="outline" size="sm" className="h-6 px-2 text-xs bg-amber-900/50 hover:bg-amber-600 border border-amber-700 hover:border-amber-500 text-amber-200 hover:text-white">
                                                                                            <BookOpen className="h-3 w-3 mr-1"/> Ünite Özeti
                                                                                        </Button>
                                                                                    </Link>
                                                                                )}
                                                                            </div>
                                                                            <AccordionContent className="space-y-2 pt-2">
                                                                                {unit.topics.map(topic => (
                                                                                    <div key={topic.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/40 hover:bg-slate-800/60 p-3 rounded-lg transition-all border border-white/5 hover:border-white/10 group/topic">
                                                                                        <div className="flex items-center gap-3">
                                                                                            <div className="h-6 w-6 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                                                                                                <Sparkles className="h-3 w-3 text-indigo-400" />
                                                                                            </div>
                                                                                            <span className="font-medium text-slate-300 text-sm group-hover/topic:text-white">{topic.title}</span>
                                                                                        </div>
                                                                                        <div className="flex gap-2 self-end sm:self-center">
                                                                                            {(topic as any).hasYazilacaklarContent && (
                                                                                                <Link href={`/yazilacaklar/${course.id}/${unit.id}/${topic.id}`} className="flex items-center gap-1 bg-sky-900/50 hover:bg-sky-600 border border-sky-700 hover:border-sky-500 text-sky-200 hover:text-white text-[10px] font-bold py-1 px-2 rounded transition-colors">
                                                                                                    <Columns className="h-3 w-3"/> Yazılacaklar
                                                                                                </Link>
                                                                                            )}
                                                                                            {(topic as any).hasOzetContent && (
                                                                                                <Link href={`/ozetler/${course.id}/${unit.id}/${topic.id}`} className="flex items-center gap-1 bg-amber-900/50 hover:bg-amber-600 border border-amber-700 hover:border-amber-500 text-amber-200 hover:text-white text-[10px] font-bold py-1 px-2 rounded transition-colors">
                                                                                                    <BookOpen className="h-3 w-3"/> Özet
                                                                                                </Link>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </AccordionContent>
                                                                        </AccordionItem>
                                                                        ))
                                                                    ) : <p className="text-xs text-slate-600 italic p-2">Henüz içerik eklenmemiş.</p>}
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

            <footer className="container mx-auto p-8 text-center relative z-10 border-t border-white/5 mt-12 space-y-6">
                 <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                     <a 
                        href="/curriculum/index.html" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-3 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-xl border border-white/10 shadow-lg transition-transform hover:scale-105"
                    >
                        <Globe />
                        Statik Siteyi Keşfet
                    </a>
                     <a 
                        href="https://dosya.co/ug6tf9joqc7i/Değerler_Oyunu.apk.html" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-3 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-xl border border-white/10 shadow-lg transition-transform hover:scale-105"
                    >
                        <Smartphone />
                        Android Uygulamasını İndir
                    </a>
                 </div>
                <p className="text-slate-500 text-xs font-bold tracking-[0.2em] uppercase">Eğlenerek Öğrenmenin Adresi</p>
            </footer>
        </div>
    );
};

// --- LOGGED IN DASHBOARD ---

const LoggedInDashboard = ({ user }: { user: any }) => {
    const router = useRouter();
    const { toast } = useToast();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await signOut(auth);
            toast({ title: "Başarılı", description: "Oturumunuz güvenli bir şekilde kapatıldı." });
            router.push('/login');
        } catch (error) {
            console.error("Logout error:", error);
            toast({ title: "Hata", description: "Çıkış yapılırken bir hata oluştu.", variant: "destructive" });
        } finally {
            setIsLoggingOut(false);
        }
    };

    useEffect(() => {
        if (user.role === 'student' && process.env.NEXT_PUBLIC_STATIC_BUILD !== 'true') {
            router.replace('/student');
        }
    }, [user, router]);
    
    if (user.role === 'student' && process.env.NEXT_PUBLIC_STATIC_BUILD !== 'true') {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-950">
                <div className="flex flex-col items-center gap-6 text-center">
                    <div className="relative">
                        <div className="absolute inset-0 bg-cyan-500 blur-3xl opacity-20 animate-pulse rounded-full"></div>
                        <Gamepad2 className="h-24 w-24 text-cyan-400 relative z-10 animate-bounce drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-3xl font-black text-white uppercase tracking-tight">Hoşgeldin {user.displayName}!</h2>
                        <div className="flex items-center justify-center gap-2 text-slate-400">
                             <Loader2 className="h-4 w-4 animate-spin" />
                             <span className="text-sm font-bold uppercase tracking-widest">Yönlendiriliyorsunuz...</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
  
  const managementButtons = {
    superAdmin: { key: 'superAdmin', href: '/teacher/superadmin', title: 'Süper Admin', icon: <Shield />, color: "bg-red-500 shadow-red-200" },
    contentTeacher: { key: 'contentTeacher', href: "/teacher/content-creation", title: "İçerik Yönetimi", icon: <PenSquare />, color: "bg-orange-500 shadow-orange-200" },
    studentsTeacher: { key: 'studentsTeacher', href: '/teacher/students', title: 'Öğrenci Yönetimi', icon: <UserCog />, color: "bg-blue-500 shadow-blue-200" },
    questionsTeacher: { key: 'questionsTeacher', href: '/teacher/questions', title: 'Soru Bankası', icon: <FileCog />, color: "bg-indigo-500 shadow-indigo-200" },
    examQuestions: { key: 'examQuestions', href: '/teacher/exam-questions', title: 'Deneme Havuzu', icon: <FileQuestion />, color: "bg-violet-500 shadow-violet-200" },
    activityDataBank: { key: 'activityDataBank', href: '/teacher/activity-data', title: 'Etkinlik Verileri', icon: <ClipboardList />, color: "bg-teal-500 shadow-teal-200" },
    exams: { key: 'exams', href: '/teacher/exams', title: 'Deneme Oluştur', icon: <ClipboardCheck />, color: "bg-green-500 shadow-green-200" },
    evaluationScales: { key: 'evaluationScales', href: '/teacher/scales', title: 'Ölçekler', icon: <Scale />, color: "bg-cyan-500 shadow-cyan-200" },
    statsTeacher: { key: 'statsTeacher', href: '/teacher/stats', title: 'İstatistikler', icon: <BarChart3 />, color: "bg-yellow-500 shadow-yellow-200" },
    imageLibrary: { key: 'imageLibrary', href: '/teacher/image-library', title: 'Görsel Arşivi', icon: <ImageIcon />, color: "bg-rose-500 shadow-rose-200" },
    gameSettingsTeacher: { key: 'gameSettingsTeacher', href: '/teacher/game-settings', title: 'Oyun Ayarları', icon: <Settings />, color: "bg-slate-500 shadow-slate-200" },
    leaderboard: { key: 'leaderboard', href: "/leaderboard", title: "Liderlik", icon: <Trophy />, color: "bg-yellow-500 shadow-yellow-200" },
    errorReports: { key: 'errorReports', href: '/teacher/error-reports', title: 'Hata Raporları', icon: <Bug />, color: "bg-red-400 shadow-red-100" },
    scoreEvents: { key: 'scoreEvents', href: '/teacher/score-events', title: 'Puan Hareketleri', icon: <DollarSign />, color: "bg-emerald-500 shadow-emerald-200" },
    wheelOfFortune: { key: 'wheelOfFortune', href: '/teacher/smartboard/carkifelek', title: 'Çarkıfelek', icon: <Swords />, color: "bg-pink-500 shadow-pink-200" },
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
          managementButtons.leaderboard,
          managementButtons.statsTeacher,
          managementButtons.wheelOfFortune,
          managementButtons.imageLibrary,
          managementButtons.gameSettingsTeacher,
          managementButtons.errorReports,
          managementButtons.scoreEvents,
      ];
      if(user.role === 'superadmin') {
          buttons.unshift(managementButtons.superAdmin);
      }
      return buttons;
  }
  
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 font-sans text-slate-100 selection:bg-indigo-500/30">
      
      {/* Arka Plan Efekti */}
      <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[1200px] h-[1200px] bg-indigo-900/10 rounded-full blur-[150px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] bg-cyan-900/10 rounded-full blur-[150px]" />
      </div>
      
      <main className="flex-1 container mx-auto p-4 sm:p-6 md:p-8 space-y-12 relative z-10">
        
        {/* Quick Actions */}
         <div className="bg-slate-900/40 backdrop-blur-md rounded-[2rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"/>
             
             <div className="flex items-center gap-3 mb-6 relative z-10">
                 <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg">
                    <MonitorPlay className="h-5 w-5 text-white"/>
                 </div>
                 <h2 className="text-xl font-black text-white uppercase tracking-tight">Akıllı Tahta & Oyunlar</h2>
             </div>
             
             <div className="relative z-10">
                <TeacherMainButtons />
             </div>
         </div>

        {/* Management Grid */}
        <div className="space-y-6">
             <div className="flex items-center gap-3 px-2">
                 <LayoutGrid className="text-cyan-500 h-6 w-6" />
                 <h2 className="text-2xl font-black text-white uppercase tracking-tight">Araçlar</h2>
             </div>
             
             <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                {getManagementButtons().map(({ key, href, title, icon, color }) =>
                    <ManagementButton key={key} href={href} title={title} icon={icon} colorClass={color} />
                )}
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                         <button className="block group h-full w-full">
                            <div className="h-full w-full rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all duration-300 border border-red-900/20 bg-slate-900 hover:bg-red-950/20 hover:border-red-500/30 group-hover:-translate-y-1">
                                <div className="p-3 rounded-xl mb-3 transition-colors bg-gradient-to-br from-red-600 to-rose-700 shadow-lg group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(220,38,38,0.4)]">
                                    <LogOut className="h-7 w-7 text-white" />
                                </div>
                                <h3 className="font-bold text-sm text-red-300 group-hover:text-red-200 transition-colors">Çıkış Yap</h3>
                            </div>
                        </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-slate-900 border-white/10 text-white rounded-2xl">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Oturumu Kapat</AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-400">
                                Oturumunuzu güvenli bir şekilde sonlandırmak istediğinizden emin misiniz?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="bg-transparent border-white/10 text-slate-300 hover:text-white hover:bg-white/5 rounded-lg">İptal</AlertDialogCancel>
                            <AlertDialogAction onClick={handleLogout} disabled={isLoggingOut} className="bg-red-600 hover:bg-red-500 text-white border-none">
                                {isLoggingOut && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Evet, Çıkış Yap
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>

      </main>
    </div>
  );
};

const ManagementButton = ({ href, title, icon, colorClass, onClick }: { href?: string, title: string, icon: React.ReactNode, colorClass: string, onClick?: () => void }) => {
    
    // Cyber tema için renkleri düzenle
    const cyberColors: {[key: string]: string} = {
        "bg-red-500": "from-red-600 to-rose-600 border-red-500 text-red-100",
        "bg-orange-500": "from-orange-500 to-amber-600 border-orange-500 text-orange-100",
        "bg-blue-500": "from-blue-600 to-indigo-600 border-blue-500 text-blue-100",
        "bg-indigo-500": "from-indigo-600 to-violet-600 border-indigo-500 text-indigo-100",
        "bg-violet-500": "from-violet-600 to-purple-600 border-violet-500 text-violet-100",
        "bg-teal-500": "from-teal-600 to-emerald-600 border-teal-500 text-teal-100",
        "bg-green-500": "from-green-600 to-emerald-600 border-green-500 text-green-100",
        "bg-cyan-500": "from-cyan-600 to-sky-600 border-cyan-500 text-cyan-100",
        "bg-yellow-500": "from-yellow-500 to-amber-500 border-yellow-500 text-yellow-100",
        "bg-rose-500": "from-rose-600 to-pink-600 border-rose-500 text-rose-100",
        "bg-slate-500": "from-slate-600 to-gray-700 border-slate-500 text-slate-100",
        "bg-red-400": "from-red-500 to-pink-600 border-red-400 text-red-100",
        "bg-emerald-500": "from-emerald-600 to-green-600 border-emerald-500 text-emerald-100",
        "bg-pink-500": "from-pink-600 to-rose-600 border-pink-500 text-pink-100",
    };

    // Mevcut colorClass içinden bg- rengini bulup eşle
    const bgClass = colorClass.split(' ').find(c => c.startsWith('bg-')) || 'bg-slate-500';
    const gradient = cyberColors[bgClass] || "from-slate-600 to-slate-700 border-slate-500 text-white";

    const content = (
        <div className={cn(
            "h-full w-full rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all duration-300 relative overflow-hidden group border",
            "bg-slate-900 border-white/5 hover:border-white/20 hover:bg-slate-800 hover:-translate-y-1 shadow-lg"
        )}>
             {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-500" />
            
            <div className={cn(
                "p-3 rounded-xl mb-3 transition-all duration-300 shadow-lg border bg-gradient-to-br",
                gradient,
                "group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]"
            )}>
                {React.cloneElement(icon as React.ReactElement, { className: "h-7 w-7" })}
            </div>
            <h3 className="font-bold text-sm text-slate-300 group-hover:text-white transition-colors">{title}</h3>
        </div>
    );

    if (href) {
        return <Link href={href} className="block group h-full">{content}</Link>;
    }
    return <button className="block group h-full w-full" onClick={onClick}>{content}</button>;
};

export function PageContent({ classGroups }: { classGroups: PublicClass[] }) {
    const { user, loading } = useAuth();
    
    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950">
                <Loader2 className="h-16 w-16 animate-spin text-indigo-500" />
            </div>
        );
    }
    
    if (process.env.NEXT_PUBLIC_STATIC_BUILD === 'true') {
        return <LoggedOutPage classGroups={classGroups || []} />;
    }
    
    return user ? <LoggedInDashboard user={user} /> : <LoggedOutPage classGroups={classGroups || []} />;
}
