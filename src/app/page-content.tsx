'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Loader2, BookOpen, Shield, PenSquare, UserCog, 
    FileCog, FileQuestion, ClipboardList, ClipboardCheck, Scale, BarChart3, 
    Image as ImageIcon, Settings, Trophy, DollarSign,  
    Gamepad2, StickyNote, LayoutGrid, Library, ArrowRight, LogOut, MonitorPlay,
    Feather, CheckCircle2, Layers, Sparkles
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
        <div className="absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] bg-sky-100/50 rounded-full blur-[120px] animate-pulse-slow delay-1000" />
    </div>
);

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

    if (user.role === 'student' && process.env.NEXT_PUBLIC_STATIC_BUILD !== 'true') {
        router.replace('/student');
        return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="h-10 w-10 animate-spin text-indigo-500" /></div>;
    }
  
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
         <div className="bg-white/70 backdrop-blur-xl rounded-[2rem] p-8 border border-white/50 shadow-xl relative overflow-hidden group">
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
                {getManagementButtons().map(({ key, href, title, icon, color }) =>
                    <ManagementButton key={key} href={href} title={title} icon={icon} gradient={color} />
                )}
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
    </div>
  );
};

const ManagementButton = ({ href, title, icon, gradient, onClick }: any) => {
    const content = (
        <div className={cn("h-full w-full rounded-2xl p-1 flex flex-col items-center justify-center text-center transition-all duration-300 relative overflow-hidden group bg-white/60 border border-white/80 hover:border-white hover:-translate-y-1 shadow-xl backdrop-blur-md")}>
            <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br mask-gradient", gradient)} style={{maskImage: 'linear-gradient(black, black), linear-gradient(black, black)', maskClip: 'content-box, border-box', maskComposite: 'exclude', padding: '1px'}} />
            <div className="p-4 flex flex-col items-center justify-center w-full h-full relative z-10">
                <div className={cn("p-3 rounded-xl mb-4 transition-all duration-300 shadow-lg group-hover:scale-110 group-hover:shadow-2xl bg-gradient-to-br", gradient)}>
                    {React.cloneElement(icon, { className: "h-6 w-6 text-white" })}
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
        return classGroups.find(g => g.name === activeTab);
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
        if (unitCount === 1) return { wrapper: "max-w-md", grid: "grid-cols-1" };
        if (unitCount === 2) return { wrapper: "max-w-4xl", grid: "grid-cols-1 md:grid-cols-2" };
        if (unitCount === 3) return { wrapper: "max-w-6xl", grid: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" };
        if (unitCount === 4) return { wrapper: "max-w-[96rem]", grid: "grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4" };
        return { wrapper: "max-w-[100rem]", grid: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" };
    };

    const gridConfig = useMemo(() => {
        const count = activeCourseData?.units?.length || 0;
        return getResponsiveGridConfig(count);
    }, [activeCourseData]);


    return (
        <div className="flex flex-col min-h-screen bg-[#f8fafc] pb-20 md:pb-8 font-sans text-slate-900 relative overflow-hidden selection:bg-indigo-100">
             <MagnificentLightBackground />

             <main className="flex-1 container mx-auto p-4 sm:p-6 md:p-8 space-y-12 relative z-10">
                
                <div className="flex flex-col lg:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-200/60 animate-in fade-in slide-in-from-top-4 duration-1000">
                    <div className="flex items-center gap-4">
                         <div className="relative p-3 bg-white rounded-2xl shadow-xl shadow-indigo-100 border border-indigo-50">
                             <Feather className="h-7 w-7 text-indigo-600" />
                             <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-white animate-pulse" />
                         </div>
                         <div>
                             <h1 className="text-3xl font-black tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">Din Dersi Atölyesi</h1>
                             <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">Dijital Öğrenme Platformu</p>
                         </div>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3">
                        {[
                            { icon: BookOpen, title: "Özetler", color: "text-amber-600", bg: "bg-amber-50" },
                            { icon: Gamepad2, title: "Oyunlar", color: "text-indigo-600", bg: "bg-indigo-50" },
                            { icon: Sparkles, title: "Etkinlikler", color: "text-purple-600", bg: "bg-purple-50" }
                        ].map((item, i) => (
                            <div key={i} className={cn("flex items-center gap-2.5 px-4 py-2 rounded-full border border-white shadow-sm backdrop-blur-md transition-all hover:scale-105", item.bg)}>
                                <item.icon className={cn("h-4 w-4", item.color)} />
                                <span className="text-xs font-black text-slate-700">{item.title}</span>
                            </div>
                        ))}
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
                            
                            {/* --- MOBILE NAV (YENİLENMİŞ ŞIK TASARIM) --- */}
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

                            {/* --- DESKTOP NAV (BAŞLIKLI VE İKONLU) --- */}
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

                        {/* ==================== CONTENT GRID ==================== */}
                        <div className={cn("w-full mx-auto mt-16 px-4 sm:px-6 transition-all duration-700", gridConfig.wrapper)}>
                            {activeCourseData && (
                                <div className={cn("grid gap-10 gap-y-20 animate-in zoom-in-95 duration-1000", gridConfig.grid)}>
                                    {activeCourseData.units.sort((a: PublicUnit, b: PublicUnit) => (a.title || '').localeCompare(b.title || '', 'tr', { numeric: true })).map((unit, index) => {
                                        const theme = getUnitTheme(index);
                                        const { full: courseFullName } = getCourseDisplayInfo(activeCourseData.title);
                                        return (
                                            <div key={unit.id} className="flex flex-col gap-10 group/unit">
                                                {/* ÜNİTE BAŞLIĞI */}
                                                <div className="relative">
                                                    <div className={cn("absolute -top-12 -left-4 text-[8rem] font-black opacity-[0.03] select-none pointer-events-none transition-all duration-1000 group-hover/unit:opacity-[0.07] group-hover/unit:-translate-y-4", theme.text)}>
                                                        {index + 1}
                                                    </div>
                                                    <div className={cn("relative flex flex-col p-8 bg-white rounded-[2.5rem] border-b-4 shadow-2xl shadow-slate-200/50 overflow-hidden", theme.border)}>
                                                        <div className="flex items-center justify-between mb-6">
                                                            <div className={cn("px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] bg-white border shadow-sm", theme.text)}>
                                                                Ünite Rehberi
                                                            </div>
                                                            {unit.hasUnitOzet && (
                                                                <Link href={`/ozetler/${activeCourseData.id}/${unit.id}`} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 text-slate-500 hover:bg-indigo-600 hover:text-white hover:shadow-lg hover:shadow-indigo-200 transition-all duration-300 font-bold text-xs">
                                                                    <BookOpen className="h-4 w-4" />
                                                                    <span>Ünite Özeti</span>
                                                                </Link>
                                                            )}
                                                        </div>
                                                        <h3 className="text-2xl font-black text-slate-800 leading-tight tracking-tight">{unit.title}</h3>
                                                    </div>
                                                </div>

                                                {/* KONU KARTLARI */}
                                                <div className="flex flex-col space-y-5">
                                                    {unit.topics.length > 0 ? (
                                                        unit.topics.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'tr', { numeric: true })).map((topic) => (
                                                            <Link 
                                                                key={topic.id} 
                                                                href={`/konu/${activeCourseData.id}/${unit.id}/${topic.id}?courseName=${encodeURIComponent(courseFullName)}&unitName=${encodeURIComponent(unit.title)}&topicName=${encodeURIComponent(topic.title)}`} 
                                                                className="group/card block relative"
                                                            >
                                                                <div className={cn(
                                                                    "relative flex items-center justify-between min-h-[95px] p-6 pl-10 rounded-[2rem] bg-white/70 backdrop-blur-md border border-white shadow-md transition-all duration-500 overflow-hidden",
                                                                    "hover:bg-white hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-2 hover:border-indigo-100"
                                                                )}>
                                                                    <div className={cn("absolute left-0 top-0 bottom-0 w-2.5 transition-all duration-500 group-hover/card:w-4 opacity-80", theme.accent)} />
                                                                    <div className={cn("absolute -bottom-8 -right-8 w-24 h-24 rounded-full blur-3xl opacity-0 group-hover/card:opacity-20 transition-all duration-700", theme.accent)} />

                                                                    <div className="flex flex-col justify-center flex-1 pr-8 relative z-10 transition-transform duration-500 group-hover/card:translate-x-2">
                                                                        <h4 className="text-[18px] font-black text-slate-700 leading-snug tracking-tight group-hover/card:text-indigo-900 transition-colors">
                                                                            {topic.title}
                                                                        </h4>
                                                                        <div className="flex items-center gap-2 mt-2 opacity-0 -translate-x-4 group-hover/card:opacity-100 group-hover/card:translate-x-0 transition-all duration-500">
                                                                            <span className="w-6 h-[2px] bg-indigo-500 rounded-full" />
                                                                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Konu İçeriği</span>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div className="flex-shrink-0 relative z-10">
                                                                        <div className="p-3.5 rounded-[1.2rem] bg-slate-50 text-slate-400 border border-slate-100 transition-all duration-500 group-hover/card:bg-indigo-600 group-hover/card:text-white group-hover/card:border-indigo-600 group-hover/card:shadow-xl group-hover/card:scale-110 group-hover/card:rotate-[-8deg]">
                                                                            <ArrowRight className="h-6 w-6" />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </Link>
                                                        ))
                                                    ) : (
                                                        <div className="p-10 rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-white/30 text-slate-400 text-sm font-bold italic text-center">Henüz içerik eklenmemiş.</div>
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

            <footer className="container mx-auto p-10 text-center relative z-10 mt-20">
                <div className="w-16 h-1 bg-slate-200 mx-auto mb-8 rounded-full" />
                <p className="text-slate-400 text-[11px] font-black tracking-[0.3em] uppercase">Din Dersi Atölyesi © 2024</p>
            </footer>
        </div>
    );
};

export function PageContent({ classGroups }: { classGroups: PublicClass[] }) {
    const { user, loading } = useAuth();
    if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="h-10 w-10 animate-spin text-indigo-500" /></div>;
    if (process.env.NEXT_PUBLIC_STATIC_BUILD === 'true') return <LoggedOutPage classGroups={classGroups || []} />;
    return user ? <LoggedInDashboard user={user} /> : <LoggedOutPage classGroups={classGroups || []} />;
}