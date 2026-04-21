
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    Loader2, BookOpen, Shield, PenSquare, UserCog, 
    FileCog, FileQuestion, ClipboardList, ClipboardCheck, Scale, BarChart3, 
    ImageIcon, Settings, Trophy, DollarSign,  
    Gamepad2, StickyNote, LayoutGrid, Library, ArrowRight, LogOut, MonitorPlay,
    Feather, CheckCircle2, Layers, Sparkles,
    LogIn, UserPlus, Download, TabletSmartphone
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

// --- UTILS ---
import { cn } from '@/lib/utils';
// --- UI COMPONENTS ---
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

// --- TYPES ---
type PublicTopic = { id: string; title: string; hasYazilacaklarContent: boolean; hasOzetContent: boolean };
type PublicUnit = { id: string; title: string; topics: PublicTopic[]; hasUnitOzet: boolean };
type PublicCourse = { id: string; title: string; units: PublicUnit[] };
export type PublicClass = { name: string; courses: PublicCourse[] };

// --- YARDIMCI FONKSİYONLAR ---
const getCourseDisplayInfo = (name: string) => {
    if (!name) return { full: "", short: "" };
    const lowerName = name.toLocaleLowerCase('tr');
    
    if (lowerName.includes('dkab') || lowerName === 'din' || lowerName.includes('din kültürü')) {
        return { full: "Din Kültürü ve Ahlak Bilgisi", short: "DKAB" };
    }
    if (lowerName.includes('siyer') || lowerName.includes('peygamber') || lowerName === 'siyer-i nebi') {
        return { full: "Peygamberimizin Hayatı", short: "SİYER" };
    }
    return { full: name, short: name };
};

const formatGroupName = (name: string) => {
    if (!isNaN(parseInt(name))) {
        return `${name}. Sınıf`;
    }
    return name;
}

const getUnitTheme = (index: number) => {
    const themes = [
        { name: 'cyan', border: 'border-cyan-200', text: 'text-cyan-700', bgAccent: 'bg-cyan-50', from: 'from-cyan-400', to: 'to-blue-500', accent: 'bg-cyan-500', glow: 'shadow-cyan-200' },
        { name: 'fuchsia', border: 'border-fuchsia-200', text: 'text-fuchsia-700', bgAccent: 'bg-fuchsia-50', from: 'from-fuchsia-400', to: 'to-pink-500', accent: 'bg-fuchsia-500', glow: 'shadow-fuchsia-200' },
        { name: 'emerald', border: 'border-emerald-200', text: 'text-emerald-700', bgAccent: 'bg-emerald-50', from: 'from-emerald-400', to: 'to-teal-500', accent: 'bg-emerald-500', glow: 'shadow-emerald-200' },
        { name: 'amber', border: 'border-amber-200', text: 'text-amber-700', bgAccent: 'bg-amber-50', from: 'from-amber-400', to: 'to-orange-500', accent: 'bg-amber-500', glow: 'shadow-amber-200' },
        { name: 'violet', border: 'border-violet-200', text: 'text-violet-700', bgAccent: 'bg-violet-50', from: 'from-violet-400', to: 'to-purple-500', accent: 'bg-violet-500', glow: 'shadow-violet-200' },
    ];
    return themes[index % themes.length];
};

const MagnificentLightBackground = () => (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#f8fafc]">
        <div className="absolute top-[-10%] left-[-10%] w-[1000px] h-[1000px] bg-indigo-100/50 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-sky-100/50 rounded-full blur-[120px] animate-pulse-slow delay-1000" />
    </div>
);

// --- FOOTER ---
const SiteFooter = () => {
  return (
    <footer className="w-full border-t border-slate-200 bg-white/90 backdrop-blur-md py-3 mt-auto relative z-20">
      <div className="container mx-auto px-4 flex flex-row items-center justify-between gap-4">
        
        {/* Sol Taraf: Marka */}
        <div className="flex flex-col md:flex-row md:items-center gap-0.5 md:gap-3 text-left">
          <span className="text-xs font-black text-slate-700 tracking-tight whitespace-nowrap">
            Din Dersi Atölyesi
          </span>
          <span className="hidden md:inline text-slate-300">|</span>
          <span className="hidden sm:inline text-[10px] text-slate-500 font-medium whitespace-nowrap">
            © {new Date().getFullYear()} Tüm hakları saklıdır.
          </span>
        </div>

        {/* Sağ Taraf: Butonlar Grubu */}
        <div className="flex items-center gap-2">
            {/* Mobil Uygulama İndir Butonu */}
            <Link 
                href="https://firebasestorage.googleapis.com/v0/b/tamuyum.firebasestorage.app/o/DinDersi%20At%C3%B6lyesi.apk?alt=media&token=0421a76b-8ca8-404b-9b05-d5f88afb343f"
                className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 hover:border-indigo-300 hover:bg-indigo-100 transition-all duration-300 shadow-sm"
            >
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white group-hover:scale-110 transition-transform">
                    <Download className="w-2.5 h-2.5" />
                </div>
                <span className="text-[10px] md:text-[11px] font-bold text-indigo-700 whitespace-nowrap">
                    Uygulamayı İndir
                </span>
            </Link>

            {/* Telegram Butonu */}
            <Link 
                href="https://t.me/dindersiatolyesi" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-300 shadow-sm"
            >
                <div className="relative flex items-center justify-center w-5 h-5 rounded-full bg-[#24A1DE] text-white group-hover:scale-110 transition-transform">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5 ml-[-1px] mt-[0.5px]">
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 11.944 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                    </svg>
                </div>
                <span className="hidden md:inline text-[11px] font-bold text-slate-600 group-hover:text-[#24A1DE] transition-colors">
                    Telegram
                </span>
            </Link>
        </div>
      </div>
    </footer>
  );
}

const LoggedInDashboard = ({ user }: { user: any }) => {
    const router = useRouter();
    const { toast } = useToast();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // GÜVENLİK KONTROLÜ 1: Eğer öğrenciyse, useEffect çalışmadan önce bile UI render etme.
    if (user.role === 'student' && process.env.NEXT_PUBLIC_STATIC_BUILD !== 'true') {
        return null;
    }

    useEffect(() => {
        if (user.role === 'student' && process.env.NEXT_PUBLIC_STATIC_BUILD !== 'true') {
            router.replace('/student');
        }
    }, [user, router]);

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

    const managementButtons = {
        superAdmin: { key: 'superAdmin', href: '/teacher/superadmin', title: 'Süper Admin', icon: <Shield />, color: "from-red-500 to-pink-600" },
        contentTeacher: { key: 'contentTeacher', href: "/teacher/content-creation", title: "İçerik Yönetimi", icon: <PenSquare />, color: "from-orange-500 to-amber-500" },
        studentsTeacher: { key: 'studentsTeacher', href: '/teacher/students', title: 'Öğrenci Yönetimi', icon: <UserCog />, color: "from-blue-500 to-cyan-500" },
        questionsTeacher: { key: 'questionsTeacher', href: '/teacher/questions', title: 'Soru Bankası', icon: <FileCog />, color: "from-indigo-500 to-purple-500" },
        examQuestions: { key: 'examQuestions', href: '/teacher/exam-questions', title: 'Deneme Havuzu', icon: <FileQuestion />, color: "from-violet-500 to-fuchsia-500" },
        activityDataBank: { key: 'activityDataBank', href: '/teacher/activity-data', title: 'Etkinlik Verileri', icon: <ClipboardList />, color: "from-teal-500 to-emerald-500" },
        exams: { key: 'exams', href: '/teacher/exams', title: 'Deneme Oluştur', icon: <ClipboardCheck />, color: "from-green-500 to-lime-500" },
        evaluationScales: { key: 'evaluationScales', href: '/teacher/scales', title: 'Ölçekler', icon: <Scale />, color: "from-cyan-500 to-sky-500" },
        statsTeacher: { key: 'statsTeacher', href: '/teacher/stats', title: 'İstatistikler', icon: <BarChart3 />, color: "from-yellow-500 to-orange-500" },
        imageLibrary: { key: 'imageLibrary', href: '/teacher/image-library', title: 'Görsel Arşivi', icon: <ImageIcon />, color: "from-rose-500 to-pink-500" },
        gameSettingsTeacher: { key: 'gameSettingsTeacher', href: '/teacher/game-settings', title: 'Oyun Ayarları', icon: <Settings />, color: "from-slate-500 to-gray-500" },
        leaderboard: { key: 'leaderboard', href: "/leaderboard", title: "Liderlik", icon: <Trophy />, color: "from-yellow-400 to-amber-400" },
        scoreEvents: { key: 'scoreEvents', href: '/teacher/score-events', title: 'Puan Hareketleri', icon: <DollarSign />, color: "from-emerald-400 to-teal-400" },
        veriEditoru: { key: 'veriEditoru', href: '/teacher/veri-editoru', title: 'Veri Editörü', icon: <Settings />, color: "from-pink-500 to-rose-500" },
    };

    const getManagementButtons = () => {
        if (user.role === 'teacher') {
            return [
                managementButtons.studentsTeacher,
                managementButtons.leaderboard,
                managementButtons.evaluationScales,
            ];
        }
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
            managementButtons.imageLibrary,
            managementButtons.gameSettingsTeacher,
            managementButtons.scoreEvents,
            managementButtons.veriEditoru,
        ];
        if(user.role === 'superadmin') {
            buttons.unshift(managementButtons.superAdmin);
        }
        return buttons;
    }
  
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100 relative">
      <MagnificentLightBackground />
      <main className="flex-1 container mx-auto p-4 sm:p-6 md:p-8 space-y-12 relative z-10">
         <div className="bg-white/70 backdrop-blur-xl rounded-[2rem] p-8 border border-white/5 shadow-xl relative overflow-hidden group">
             <div className="flex items-center gap-4 mb-6 relative z-10">
                 <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-200">
                    <MonitorPlay className="h-6 w-6 text-white"/>
                 </div>
                 <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Öğretmen Paneli</h2>
                    <p className="text-slate-600 text-sm font-medium">Hoşgeldiniz, {user.displayName}</p>
                 </div>
             </div>
             <div className="relative z-10"><TeacherMainButtons /></div>
         </div>
        <div className="space-y-6">
             <div className="flex items-center gap-3 px-2">
                 <LayoutGrid className="text-indigo-500 h-6 w-6" />
                 <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Araçlar</h2>
             </div>
             <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                {getManagementButtons().map(({ key, href, title, icon, color }) => (
                    <ManagementButton key={key} href={href} title={title} icon={icon} gradient={color} />
                ))}
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                          <button className="block group h-full w-full">
                             <div className="h-full w-full rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all duration-300 border border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-300 group-hover:-translate-y-1 backdrop-blur-md shadow-sm">
                                 <div className="p-3 rounded-xl mb-3 transition-colors bg-gradient-to-br from-red-500 to-pink-600 shadow-lg group-hover:shadow-red-200">
                                     <LogOut className="h-6 w-6 text-white" />
                                 </div>
                                 <h3 className="font-bold text-sm text-red-800 group-hover:text-red-900 transition-colors">Çıkış Yap</h3>
                             </div>
                          </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-white backdrop-blur-xl border-slate-200 text-slate-900 rounded-2xl">
                        <AlertDialogHeader><AlertDialogTitle>Oturumu Kapat</AlertDialogTitle><AlertDialogDescription>Emin misiniz?</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-lg">İptal</AlertDialogCancel>
                            <AlertDialogAction onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white rounded-lg">Çıkış Yap</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
      </main>
      
      <SiteFooter />
    </div>
  );
};

const ManagementButton = ({ href, title, icon, gradient, onClick }: any) => {
    const content = (
        <div className={cn("h-full w-full rounded-2xl p-1 flex flex-col items-center justify-center text-center transition-all duration-300 relative overflow-hidden group bg-white/60 border border-white/80 hover:border-white hover:-translate-y-1 shadow-xl backdrop-blur-md")}>
            <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br mask-gradient", gradient)} style={{maskImage: 'linear-gradient(black, black), linear-gradient(black, black)', maskClip: 'content-box, border-box', maskComposite: 'exclude', padding: '1px'}} />
            <div className="p-4 flex flex-col items-center justify-center w-full h-full relative z-10">
                <div className={cn("p-3 rounded-xl mb-4 transition-all duration-300 shadow-lg group-hover:scale-110 group-hover:shadow-2xl bg-gradient-to-br", gradient)}>
                    {React.cloneElement(icon as React.ReactElement, { className: "h-6 w-6 text-white" })}
                </div>
                <h3 className="font-bold text-sm text-slate-600 group-hover:text-slate-900 transition-colors">{title}</h3>
            </div>
        </div>
    );
    return href ? <Link href={href} className="block group h-full">{content}</Link> : <button className="block group h-full w-full" onClick={onClick}>{content}</button>;
};

const LoggedOutPage = ({ classGroups }: { classGroups: PublicClass[] }) => {
    const [activeTab, setActiveTab] = useState<string>(classGroups && classGroups.length > 0 ? classGroups[0].name : "");
    const [activeCourseId, setActiveCourseId] = useState<string>("");

    const activeClassData = useMemo(() => {
        return (classGroups || []).find(g => g.name === activeTab);
    }, [classGroups, activeTab]);

    const sortedCourses = useMemo(() => {
        if (!activeClassData || !activeClassData.courses) return [];
        return [...activeClassData.courses].sort((a, b) => (a.title || '').localeCompare(b.title || '', 'tr'));
    }, [activeClassData]);

    useEffect(() => {
        if (sortedCourses.length > 0) {
            setActiveCourseId(sortedCourses[0].id);
        } else {
            setActiveCourseId("");
        }
    }, [sortedCourses]);

    const activeCourseData = useMemo(() => {
        if (!activeClassData) return null;
        return activeClassData.courses.find(c => c.id === activeCourseId);
    }, [activeClassData, activeCourseId]);

    const getResponsiveGridConfig = (unitCount: number) => {
        const baseWrapper = "w-full px-4 md:px-6 mx-auto flex justify-center";
        
        if (unitCount === 1) return { 
            wrapper: `${baseWrapper} max-w-2xl`, 
            grid: "grid-cols-1 w-full max-w-md" 
        };
        
        if (unitCount === 2) return { 
            wrapper: `${baseWrapper} max-w-5xl`, 
            grid: "grid-cols-1 md:grid-cols-2 w-full" 
        };
        
        if (unitCount === 3) return { 
            wrapper: `${baseWrapper} max-w-7xl`, 
            grid: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-full" 
        };
        
        if (unitCount === 4) return { 
            wrapper: `${baseWrapper} max-w-[90rem]`, 
            grid: "grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 w-full" 
        };
        
        return { 
            wrapper: `${baseWrapper} max-w-[110rem]`, 
            grid: "grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 w-full justify-center" 
        };
    };

    const gridConfig = useMemo(() => {
        const count = activeCourseData?.units?.length || 0;
        return getResponsiveGridConfig(count);
    }, [activeCourseData]);


    return (
        <div className="flex flex-col min-h-screen bg-[#f8fafc] font-sans text-slate-900 relative overflow-hidden selection:bg-indigo-100">
             <MagnificentLightBackground />

             <main className="flex-1 container mx-auto p-4 sm:p-6 md:p-8 space-y-12 relative z-10 pb-16">
                
                {/* Header Kısmı */}
                <div className="flex flex-col lg:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-200/60 animate-in fade-in slide-in-from-top-4 duration-1000">
                    <div className="flex items-center gap-4">
                         <div className="relative h-16 w-16 overflow-hidden rounded-2xl shadow-xl border border-indigo-50 bg-white">
                             <Image 
                                src="https://firebasestorage.googleapis.com/v0/b/tamuyum.firebasestorage.app/o/Ekran%20g%C3%B6r%C3%BCnt%C3%BCs%C3%BC%202026-04-06%20191410%20(2).png?alt=media&token=af8346d3-7274-4c37-8199-bbdc9bc85b1a" 
                                alt="Logo" 
                                fill
                                className="object-cover"
                             />
                         </div>
                         <div>
                             <h1 className="text-3xl font-black tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">Din Dersi Atölyesi</h1>
                             <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">Dijital Öğrenme Platformu</p>
                         </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-4 lg:gap-6">
                        <div className="flex flex-wrap justify-center gap-3">
                            {[
                                { icon: BookOpen, title: "Özetler", color: "text-amber-600", bg: "bg-amber-50" },
                                { icon: Gamepad2, title: "Oyunlar", color: "text-indigo-600", bg: "bg-indigo-50" },
                                { icon: Sparkles, title: "Etkinlikler", color: "text-purple-600", bg: "bg-purple-50" }
                            ].map((item, i) => (
                                <div key={i} className={cn("flex items-center gap-2.5 px-4 py-2 rounded-full border border-white shadow-sm backdrop-blur-md transition-all hover:scale-105 select-none", item.bg)}>
                                    <item.icon className={cn("h-4 w-4", item.color)} />
                                    <span className="text-xs font-black text-slate-700">{item.title}</span>
                                </div>
                            ))}
                        </div>

                        <div className="hidden sm:block w-px h-6 bg-slate-200/60" />

                        <div className="flex items-center gap-3">
                            <Link href="/login" className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-500 font-bold text-xs hover:text-indigo-600 hover:bg-white hover:shadow-sm transition-all">
                                <LogIn className="w-4 h-4" />
                                <span>Giriş</span>
                            </Link>
                            <Link href="/register" className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 transition-all">
                                <UserPlus className="w-4 h-4" />
                                <span>Kayıt Ol</span>
                            </Link>
                        </div>
                    </div>
                </div>

                {(!classGroups || classGroups.length === 0) ? (
                    <div className="text-center py-24 bg-white/40 backdrop-blur-md rounded-[3rem] border-2 border-dashed border-slate-200">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Trophy className="h-10 w-10 text-slate-300" />
                        </div>
                        <p className="text-slate-500 font-bold text-lg">Henüz içerik eklenmemiş.</p>
                        <p className="text-slate-400 text-sm mt-2">Daha sonra tekrar kontrol edin.</p>
                    </div>
                ) : (
                    <>
                        <div className="sticky top-6 z-50 flex justify-center animate-in fade-in slide-in-from-top-8 duration-700 px-4 sm:px-0">
                            {/* Mobil Seçim Menüsü */}
                            <div className="md:hidden w-full flex flex-col gap-3 p-3 bg-white/90 backdrop-blur-2xl border border-white/80 rounded-[2.5rem] shadow-2xl shadow-indigo-100/30">
                                <div className="flex items-center gap-3 px-2">
                                    <div className="flex flex-col items-center justify-center pr-3 border-r border-slate-100">
                                        <Layers className="w-4 h-4 text-indigo-400" />
                                        <span className="text-[8px] font-black text-indigo-300 uppercase mt-0.5 tracking-tighter">Sınıf</span>
                                    </div>
                                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar snap-x flex-1">
                                        {classGroups.map((group) => {
                                            const isActive = activeTab === group.name;
                                            return (
                                                <button key={group.name} onClick={() => setActiveTab(group.name)} className={cn("snap-center flex-shrink-0 px-5 py-2.5 rounded-xl font-black text-xs transition-all duration-300", isActive ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-400 hover:bg-slate-50")}>
                                                    {formatGroupName(group.name)}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 px-2">
                                    <div className="flex flex-col items-center justify-center pr-3 border-r border-slate-100">
                                        <Library className="w-4 h-4 text-slate-400" />
                                        <span className="text-[8px] font-black text-slate-300 uppercase mt-0.5 tracking-tighter">Ders</span>
                                    </div>
                                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar snap-x flex-1">
                                        {sortedCourses.map((course) => {
                                            const isCourseActive = activeCourseId === course.id;
                                            const { short } = getCourseDisplayInfo(course.title);
                                            return (
                                                <button key={course.id} onClick={() => setActiveCourseId(course.id)} className={cn("snap-center flex-shrink-0 px-5 py-2.5 rounded-xl font-black text-xs transition-all duration-300 border", isCourseActive ? "bg-white border-indigo-200 text-indigo-600 shadow-md" : "border-transparent text-slate-400")}>
                                                    {short}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Masaüstü Seçim Menüsü */}
                            <div className="hidden md:flex flex-row items-center gap-6 animate-in fade-in duration-1000">
                                <div className="flex items-center gap-4 p-2 pl-4 bg-white/80 backdrop-blur-2xl border border-white rounded-[2rem] shadow-xl shadow-slate-200/50">
                                    <div className="flex flex-col items-center justify-center pr-3 border-r border-slate-100">
                                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter leading-none mb-1">Sınıf</span>
                                        <Layers className="w-4 h-4 text-indigo-300" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {classGroups.map((group) => {
                                            const isActive = activeTab === group.name;
                                            return (
                                                <button key={group.name} onClick={() => setActiveTab(group.name)} className={cn("relative px-7 py-3 rounded-2xl font-black text-sm transition-all duration-500 group overflow-hidden min-w-[100px]", isActive ? "text-white shadow-xl shadow-indigo-200 scale-105" : "text-slate-500 hover:text-indigo-600")}>
                                                      {isActive && <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-600 animate-in fade-in duration-500" />}
                                                      <span className="relative z-10">{formatGroupName(group.name)}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-2 pl-4 bg-white/80 backdrop-blur-2xl border border-white rounded-[2rem] shadow-xl shadow-slate-200/50">
                                    <div className="flex flex-col items-center justify-center pr-3 border-r border-slate-100">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter leading-none mb-1">Ders</span>
                                        <Library className="w-4 h-4 text-slate-300" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {sortedCourses.map((course) => {
                                            const isCourseActive = activeCourseId === course.id;
                                            const { full } = getCourseDisplayInfo(course.title);
                                            return (
                                                <button key={course.id} onClick={() => setActiveCourseId(course.id)} className={cn("flex items-center gap-3 px-6 py-3 rounded-2xl text-sm font-black transition-all duration-500 whitespace-nowrap", isCourseActive ? "bg-white text-indigo-700 shadow-lg border border-indigo-50 scale-105" : "text-slate-400 hover:text-slate-600 hover:bg-white/50")}>
                                                    {isCourseActive ? <CheckCircle2 className="w-4 h-4 text-indigo-500" /> : <Library className="w-4 h-4" />}
                                                    <span>{full}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* İÇERİK GRID ALANI */}
                        <div className={cn("mt-16 transition-all duration-700", gridConfig.wrapper)}>
                            {activeCourseData && (
                                <div className={cn("grid gap-5 xl:gap-6 gap-y-12 animate-in zoom-in-95 duration-1000 place-content-center", gridConfig.grid)}>
                                    {(activeCourseData.units || []).sort((a: PublicUnit, b: PublicUnit) => (a.title || '').localeCompare(b.title || '', 'tr', { numeric: true })).map((unit, index) => {
                                        const theme = getUnitTheme(index);
                                        const { full: courseFullName } = getCourseDisplayInfo(activeCourseData.title);
                                        return (
                                            <div key={unit.id} className="flex flex-col gap-6 group/unit w-full">
                                                <div className="relative">
                                                    <div className={cn("absolute -top-8 -left-2 text-[6rem] font-black opacity-[0.03] select-none pointer-events-none transition-all duration-1000 group-hover/unit:opacity-[0.07] group-hover/unit:-translate-y-4", theme.text)}>
                                                        {index + 1}
                                                    </div>
                                                    <div className={cn("relative flex flex-col p-6 bg-white rounded-[2rem] border-b-4 shadow-2xl shadow-slate-200/50 overflow-hidden", theme.border)}>
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div className={cn("px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] bg-white border shadow-sm", theme.text)}>
                                                                Ünite Rehberi
                                                            </div>
                                                            {unit.hasUnitOzet && (
                                                                <Link href={`/ozetler/${activeCourseData.id}/${unit.id}`} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 text-slate-500 hover:bg-indigo-600 hover:text-white hover:shadow-lg hover:shadow-indigo-200 transition-all duration-300 font-bold text-[10px]">
                                                                        <BookOpen className="h-3.5 w-3.5" />
                                                                        <span>Özet</span>
                                                                </Link>
                                                            )}
                                                        </div>
                                                        <h3 className="text-xl font-black text-slate-800 leading-tight tracking-tight min-h-[3.5rem] flex items-center">{unit.title}</h3>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col space-y-4">
                                                    {unit.topics.length > 0 ? (
                                                        unit.topics.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'tr', { numeric: true })).map((topic) => (
                                                            <Link 
                                                                key={topic.id} 
                                                                href={`/konu/${activeCourseData.id}/${unit.id}/${topic.id}?courseName=${encodeURIComponent(courseFullName)}&unitName=${encodeURIComponent(unit.title)}&topicName=${encodeURIComponent(topic.title)}`} 
                                                                className="group/card block relative"
                                                            >
                                                                <div className={cn(
                                                                    "relative flex items-center justify-between min-h-[80px] p-4 pl-8 rounded-[1.5rem] bg-white/70 backdrop-blur-md border border-white shadow-md transition-all duration-500 overflow-hidden",
                                                                    "hover:bg-white hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 hover:border-indigo-100"
                                                                )}>
                                                                    <div className={cn("absolute left-0 top-0 bottom-0 w-2 transition-all duration-500 group-hover/card:w-3 opacity-80", theme.accent)} />
                                                                    <div className={cn("absolute -bottom-8 -right-8 w-20 h-20 rounded-full blur-3xl opacity-0 group-hover/card:opacity-20 transition-all duration-700", theme.accent)} />

                                                                    <div className="flex flex-col justify-center flex-1 pr-4 relative z-10 transition-transform duration-500 group-hover/card:translate-x-1">
                                                                        <h4 className="text-[15px] font-black text-slate-700 leading-snug tracking-tight group-hover/card:text-indigo-900 transition-colors line-clamp-2">
                                                                                {topic.title}
                                                                        </h4>
                                                                    </div>
                                                                    
                                                                    <div className="flex-shrink-0 relative z-10">
                                                                        <div className="p-2 rounded-xl bg-slate-50 text-slate-400 border border-slate-100 transition-all duration-500 group-hover/card:bg-indigo-600 group-hover/card:text-white group-hover/card:border-indigo-600 group-hover/card:shadow-lg group-hover/card:scale-110">
                                                                                <ArrowRight className="h-4 w-4" />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </Link>
                                                        ))
                                                    ) : (
                                                        <div className="p-6 rounded-[2rem] border-2 border-dashed border-slate-200 bg-white/30 text-slate-400 text-xs font-bold italic text-center">İçerik yok.</div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </>
                )}
             </main>

            <SiteFooter />
        </div>
    );
};

export function PageContent({ classGroups }: { classGroups: PublicClass[] }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="h-10 w-10 animate-spin text-indigo-500" /></div>;
    
    if (process.env.NEXT_PUBLIC_STATIC_BUILD === 'true') return <LoggedOutPage classGroups={classGroups || []} />;
    
    if (user) {
        if (user.role === 'student') {
             router.replace('/student');
             return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="h-10 w-10 animate-spin text-indigo-500" /></div>;
        }
        return <LoggedInDashboard user={user} />;
    }
    
    return <LoggedOutPage classGroups={classGroups || []} />;
}
