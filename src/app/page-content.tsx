
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Loader2, BookOpen, Shield, PenSquare, UserCog, 
    FileCog, FileQuestion, ClipboardList, ClipboardCheck, Scale, BarChart3, 
    ImageIcon, Settings, Trophy, DollarSign,  
    Gamepad2, LayoutGrid, Library, ArrowRight, LogOut, MonitorPlay,
    CheckCircle2, Layers, Sparkles,
    LogIn, UserPlus, Download, Youtube, Quote,
    MoreHorizontal, FileText, Globe
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

// --- GÜNLÜK İÇERİKLER (Ayet ve Hadis Havuzu) ---
const VERSES = [
    { text: "Şüphesiz Allah, adaleti, iyilik yapmayı, yakınlara yardım etmeyi emreder; hayasızlığı, fenalık ve azgınlığı da yasaklar.", source: "Nahl Suresi, 90" },
    { text: "İyilikle kötülük bir olmaz. Sen (kötülüğü) en güzel bir şekilde önle. O zaman seninle arasında düşmanlık bulunan kimse, sanki candan bir dost olur.", source: "Fussilet Suresi, 34" },
    { text: "Kim zerre miktarı hayır yapmışsa onu (karşılığını) görür. Kim de zerre miktarı şer işlemişse onu görür.", source: "Zilzâl Suresi, 7-8" },
    { text: "İman edip iyi işler yapanlara gelince, elbette biz işini iyi yapanın mükafatını zayi etmeyiz.", source: "Kehf Suresi, 30" },
    { text: "Gevşemeyin, hüzünlenmeyin. Eğer (gerçekten) iman etmiş kimselerseniz üstün olan sizlersiniz.", source: "Âl-i İmrân Suresi, 139" }
];

const HADITHS = [
    { text: "Sizin en hayırlınız, Kur'an'ı öğrenen ve öğreteninizdir.", source: "Buhârî, Fezâilü'l-Kur'ân, 21" },
    { text: "Kolaylaştırınız, zorlaştırmayınız. Müjdeleyiniz, nefret ettirmeyiniz.", source: "Buhârî, İlim, 11" },
    { text: "İki nimet vardır ki insanların çoğu onun kıymetini bilmezler: Vücut sağlığı ve boş vakit.", source: "Buhârî, Rikak, 1" },
    { text: "İnsanların en hayırlısı, insanlara en faydalı olanıdır.", source: "Heysemî, Mecma'u'z-Zevâid, 8/191" },
    { text: "Müslüman, elinden ve dilinden diğer Müslümanlerin güvende olduğu kimsedir.", source: "Buhârî, Îmân, 4" }
];

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
        { 
            name: 'emerald',
            headerFrom: 'from-emerald-500', headerTo: 'to-teal-600',
            ozetBg: 'bg-emerald-50', ozetBorder: 'border border-emerald-200', ozetText: 'text-emerald-700', ozetHoverBg: 'hover:bg-emerald-100', ozetHoverBorder: 'hover:border-emerald-300', ozetIconBg: 'bg-white', ozetIconText: 'text-emerald-600',
            topicBorder: 'border-2 border-emerald-200', topicText: 'text-emerald-800', topicHoverBg: 'hover:bg-emerald-50', topicHoverBorder: 'hover:border-emerald-400', topicIconHoverAccent: 'group-hover/card:bg-emerald-500 group-hover/card:border-emerald-500'
        },
        { 
            name: 'indigo',
            headerFrom: 'from-indigo-500', headerTo: 'to-blue-600',
            ozetBg: 'bg-indigo-50', ozetBorder: 'border border-indigo-200', ozetText: 'text-indigo-700', ozetHoverBg: 'hover:bg-indigo-100', ozetHoverBorder: 'hover:border-indigo-300', ozetIconBg: 'bg-white', ozetIconText: 'text-indigo-600',
            topicBorder: 'border-2 border-indigo-200', topicText: 'text-indigo-800', topicHoverBg: 'hover:bg-indigo-50', topicHoverBorder: 'hover:border-indigo-400', topicIconHoverAccent: 'group-hover/card:bg-indigo-500 group-hover/card:border-indigo-500'
        },
        { 
            name: 'amber',
            headerFrom: 'from-amber-400', headerTo: 'to-orange-500',
            ozetBg: 'bg-amber-50', ozetBorder: 'border border-amber-200', ozetText: 'text-amber-800', ozetHoverBg: 'hover:bg-amber-100', ozetHoverBorder: 'hover:border-amber-300', ozetIconBg: 'bg-white', ozetIconText: 'text-amber-600',
            topicBorder: 'border-2 border-amber-200', topicText: 'text-amber-800', topicHoverBg: 'hover:bg-amber-50', topicHoverBorder: 'hover:border-amber-400', topicIconHoverAccent: 'group-hover/card:bg-amber-500 group-hover/card:border-amber-500'
        },
        { 
            name: 'violet',
            headerFrom: 'from-violet-500', headerTo: 'to-purple-600',
            ozetBg: 'bg-violet-50', ozetBorder: 'border border-violet-200', ozetText: 'text-violet-700', ozetHoverBg: 'hover:bg-violet-100', ozetHoverBorder: 'hover:border-violet-300', ozetIconBg: 'bg-white', ozetIconText: 'text-violet-600',
            topicBorder: 'border-2 border-violet-200', topicText: 'text-violet-800', topicHoverBg: 'hover:bg-violet-50', topicHoverBorder: 'hover:border-violet-400', topicIconHoverAccent: 'group-hover/card:bg-violet-500 group-hover/card:border-violet-500'
        },
        { 
            name: 'cyan',
            headerFrom: 'from-cyan-500', headerTo: 'to-sky-600',
            ozetBg: 'bg-cyan-50', ozetBorder: 'border border-cyan-200', ozetText: 'text-cyan-700', ozetHoverBg: 'hover:bg-cyan-100', ozetHoverBorder: 'hover:border-cyan-300', ozetIconBg: 'bg-white', ozetIconText: 'text-cyan-600',
            topicBorder: 'border-2 border-cyan-200', topicText: 'text-cyan-800', topicHoverBg: 'hover:bg-cyan-50', topicHoverBorder: 'hover:border-cyan-400', topicIconHoverAccent: 'group-hover/card:bg-cyan-500 group-hover/card:border-cyan-500'
        },
    ];
    return themes[index % themes.length];
};

const MagnificentLightBackground = () => (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-slate-50">
        <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-emerald-50/40 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-50/40 rounded-full blur-[100px]" />
    </div>
);

// --- FOOTER ---
const SiteFooter = () => {
  return (
    <footer className="w-full border-t border-slate-200 bg-white/90 backdrop-blur-md py-3 mt-auto relative z-20">
      <div className="container mx-auto px-4 flex flex-row items-center justify-between gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-0.5 md:gap-3 text-left">
          <span className="text-sm font-bold text-slate-700 tracking-tight whitespace-nowrap">
            Din Dersi Atölyesi
          </span>
          <span className="hidden md:inline text-slate-300">|</span>
          <span className="hidden sm:inline text-xs text-slate-500 font-medium whitespace-nowrap">
            © {new Date().getFullYear()} Tüm hakları saklıdır.
          </span>
        </div>

        <div className="flex items-center gap-2">
            <Link 
                href="https://firebasestorage.googleapis.com/v0/b/tamuyum.firebasestorage.app/o/DinDersi%20At%C3%B6lyesi.apk?alt=media&token=0421a76b-8ca8-404b-9b05-d5f88afb343f"
                className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 hover:border-emerald-300 hover:bg-emerald-100 transition-all duration-300 shadow-sm focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
            >
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white group-hover:scale-110 transition-transform">
                    <Download className="w-3 h-3" />
                </div>
                <span className="hidden md:inline text-xs font-bold text-emerald-800 whitespace-nowrap">
                    Uygulamayı İndir
                </span>
            </Link>

            <Link 
                href="https://t.me/dindersiatolyesi" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-300 shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
            >
                <div className="relative flex items-center justify-center w-5 h-5 rounded-full bg-[#24A1DE] text-white group-hover:scale-110 transition-transform">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5 ml-[-1px] mt-[0.5px]">
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 11.944 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                    </svg>
                </div>
                <span className="hidden md:inline text-xs font-bold text-slate-600 group-hover:text-[#24A1DE] transition-colors">
                    Telegram
                </span>
            </Link>

            <Link 
                href="https://youtube.com/@dindersiatolyesi?si=WGt1I87skOUh2X3x" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-100 hover:border-red-300 hover:bg-red-100 transition-all duration-300 shadow-sm focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
            >
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-red-600 text-white group-hover:scale-110 transition-transform">
                    <Youtube className="w-3 h-3" />
                </div>
                <span className="hidden md:inline text-xs font-bold text-red-700 transition-colors">
                    YouTube
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

    if (user.role === 'student' && process.env.NEXT_PUBLIC_STATIC_BUILD !== 'true') {
        return null;
    }

    useEffect(() => {
        if (user.role === 'student' && process.env.NEXT_PUBLIC_STATIC_BUILD !== 'true') {
            router.replace('/student');
        }
    }, [user, router]);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            toast({ title: "Başarılı", description: "Oturumunuz güvenli bir şekilde kapatıldı." });
            router.push('/login');
        } catch (error) {
            toast({ title: "Hata", description: "Çıkış yapılırken bir hata oluştu.", variant: "destructive" });
        }
    };

    const managementButtons = {
        superAdmin: { key: 'superAdmin', href: '/teacher/superadmin', title: 'Süper Admin', icon: <Shield />, color: "from-slate-700 to-slate-900" },
        contentTeacher: { key: 'contentTeacher', href: "/teacher/content-creation", title: "İçerik Yönetimi", icon: <PenSquare />, color: "from-indigo-500 to-blue-600" },
        extraPages: { key: 'extraPages', href: "/teacher/extra-pages", title: "Ekstra Sayfalar", icon: <Globe />, color: "from-cyan-500 to-blue-600" },
        studentsTeacher: { key: 'studentsTeacher', href: '/teacher/students', title: 'Öğrenci Yönetimi', icon: <UserCog />, color: "from-emerald-500 to-teal-600" },
        questionsTeacher: { key: 'questionsTeacher', href: '/teacher/questions', title: 'Soru Bankası', icon: <FileCog />, color: "from-amber-500 to-orange-600" },
        examQuestions: { key: 'examQuestions', href: '/teacher/exam-questions', title: 'Deneme Havuzu', icon: <FileQuestion />, color: "from-violet-500 to-purple-600" },
        activityDataBank: { key: 'activityDataBank', href: '/teacher/activity-data', title: 'Etkinlik Verileri', icon: <ClipboardList />, color: "from-cyan-500 to-sky-600" },
        exams: { key: 'exams', href: '/teacher/exams', title: 'Deneme Oluştur', icon: <ClipboardCheck />, color: "from-emerald-600 to-green-600" },
        evaluationScales: { key: 'evaluationScales', href: '/teacher/scales', title: 'Ölçekler', icon: <Scale />, color: "from-indigo-400 to-blue-500" },
        statsTeacher: { key: 'statsTeacher', href: '/teacher/stats', title: 'İstatistikler', icon: <BarChart3 />, color: "from-amber-400 to-orange-500" },
        imageLibrary: { key: 'imageLibrary', href: '/teacher/image-library', title: 'Görsel Arşivi', icon: <ImageIcon />, color: "from-rose-500 to-pink-600" },
        gameSettingsTeacher: { key: 'gameSettingsTeacher', href: '/teacher/game-settings', title: 'Oyun Ayarları', icon: <Settings />, color: "from-slate-500 to-gray-600" },
        leaderboard: { key: 'leaderboard', href: "/leaderboard", title: "Liderlik", icon: <Trophy />, color: "from-yellow-400 to-amber-500" },
        scoreEvents: { key: 'scoreEvents', href: '/teacher/score-events', title: 'Puan Hareketleri', icon: <DollarSign />, color: "from-teal-400 to-emerald-500" },
        veriEditoru: { key: 'veriEditoru', href: '/teacher/veri-editoru', title: 'Veri Editörü', icon: <Settings />, color: "from-slate-600 to-slate-800" },
    };

    const getManagementButtons = () => {
        if (user.role === 'teacher') {
            return [managementButtons.studentsTeacher, managementButtons.leaderboard, managementButtons.evaluationScales];
        }
        const buttons = [
            managementButtons.contentTeacher, managementButtons.extraPages, managementButtons.studentsTeacher, managementButtons.questionsTeacher,
            managementButtons.examQuestions, managementButtons.activityDataBank, managementButtons.exams,
            managementButtons.evaluationScales, managementButtons.leaderboard, managementButtons.statsTeacher,
            managementButtons.imageLibrary, managementButtons.gameSettingsTeacher, managementButtons.scoreEvents,
            managementButtons.veriEditoru,
        ];
        if(user.role === 'superadmin') buttons.unshift(managementButtons.superAdmin);
        return buttons;
    }
  
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100 relative">
      <main className="flex-1 container mx-auto p-4 sm:p-6 md:p-8 space-y-12 relative z-10">
         <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm relative overflow-hidden group">
             <div className="flex items-center gap-4 mb-6 relative z-10">
                 <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600">
                    <MonitorPlay className="h-6 w-6"/>
                 </div>
                 <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Öğretmen Paneli</h2>
                    <p className="text-slate-500 text-sm font-medium">Hoşgeldiniz, {user.displayName}</p>
                 </div>
             </div>
             <div className="relative z-10"><TeacherMainButtons /></div>
         </div>
        <div className="space-y-6">
             <div className="flex items-center gap-3 px-2">
                 <LayoutGrid className="text-indigo-500 h-6 w-6" />
                 <h2 className="text-xl font-bold text-slate-800 tracking-tight">Araçlar</h2>
             </div>
             <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                {getManagementButtons().map(({ key, href, title, icon, color }) => (
                    <ManagementButton key={key} href={href} title={title} icon={icon} gradient={color} />
                ))}
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                          <button className="block group h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded-2xl">
                             <div className="h-full w-full rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all duration-300 border border-red-100 bg-red-50 hover:bg-red-100 hover:border-red-200">
                                 <div className="p-3 rounded-xl mb-3 transition-colors bg-red-500 shadow-sm text-white">
                                     <LogOut className="h-6 w-6" />
                                 </div>
                                 <h3 className="font-semibold text-sm text-red-800">Çıkış Yap</h3>
                             </div>
                          </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-white border-slate-200 text-slate-900 rounded-2xl">
                        <AlertDialogHeader><AlertDialogTitle>Oturumu Kapat</AlertDialogTitle><AlertDialogDescription>Çıkış yapmak istediğinize emin misiniz?</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-lg font-medium">İptal</AlertDialogCancel>
                            <AlertDialogAction onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold">Çıkış Yap</AlertDialogAction>
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
        <div className="h-full w-full rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all duration-200 bg-white border border-slate-100 hover:border-slate-300 hover:shadow-md">
            <div className={cn("p-3 rounded-xl mb-3 shadow-sm text-white bg-gradient-to-br", gradient)}>
                {React.cloneElement(icon as React.ReactElement, { className: "h-6 w-6" })}
            </div>
            <h3 className="font-semibold text-sm text-slate-700 group-hover:text-slate-900 transition-colors">{title}</h3>
        </div>
    );
    return href ? 
        <Link href={href} className="block group h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-2xl">{content}</Link> : 
        <button className="block group h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-2xl" onClick={onClick}>{content}</button>;
};

// --- ANA SAYFA (LOGGED OUT) ---
const LoggedOutPage = ({ classGroups }: { classGroups: PublicClass[] }) => {
    const [activeTab, setActiveTab] = useState<string>(classGroups && classGroups.length > 0 ? classGroups[0].name : "");
    const [activeCourseId, setActiveCourseId] = useState<string>("");

    // Günün indeksini belirleme (Her gün 1 artar, ay/yıl fark etmeksizin tutarlı değişir)
    const dailyIndex = useMemo(() => {
        const today = new Date();
        const diff = today.getTime() - new Date(today.getFullYear(), 0, 0).getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    }, []);

    const dailyVerse = VERSES[dailyIndex % VERSES.length];
    const dailyHadith = HADITHS[dailyIndex % HADITHS.length];

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
        if (unitCount === 1) return { wrapper: `${baseWrapper} max-w-2xl`, grid: "grid-cols-1 w-full max-w-md" };
        if (unitCount === 2) return { wrapper: `${baseWrapper} max-w-5xl`, grid: "grid-cols-1 md:grid-cols-2 w-full" };
        if (unitCount === 3) return { wrapper: `${baseWrapper} max-w-7xl`, grid: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-full" };
        if (unitCount === 4) return { wrapper: `${baseWrapper} max-w-[90rem]`, grid: "grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 w-full" };
        return { wrapper: `${baseWrapper} max-w-[110rem]`, grid: "grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 w-full justify-center" };
    };

    const gridConfig = useMemo(() => {
        const count = activeCourseData?.units?.length || 0;
        return getResponsiveGridConfig(count);
    }, [activeCourseData]);

    return (
        <div className="flex flex-col min-h-screen bg-[#f8fafc] font-sans text-slate-900 relative selection:bg-emerald-100">
             <MagnificentLightBackground />

             {/* Boşluklar space-y-10'dan space-y-5'e düşürüldü */}
             <main className="flex-1 container mx-auto p-4 sm:p-6 md:p-8 space-y-5 relative z-10 pb-20">
                
                {/* --- HEADER --- */}
                {/* Alt boşluk pb-6'dan pb-4'e düşürüldü */}
                <div className="flex flex-col lg:flex-row items-center justify-between gap-6 pb-4 border-b border-slate-200/60 animate-in fade-in slide-in-from-top-4 duration-700 relative z-30">
                    <div className="flex items-center gap-4">
                         <div className="relative h-14 w-14 overflow-hidden rounded-2xl shadow-sm border border-slate-100 bg-white group">
                             <Image 
                                src="https://firebasestorage.googleapis.com/v0/b/tamuyum.firebasestorage.app/o/Ekran%20g%C3%B6r%C3%BCnt%C3%BCs%C3%BC%202026-04-06%20191410%20(2).png?alt=media&token=af8346d3-7274-4c37-8199-bbdc9bc85b1a" 
                                alt="Din Dersi Atölyesi Logo" 
                                fill
                                className="object-cover group-hover:scale-110 transition-transform duration-500"
                             />
                         </div>
                         <div className="flex flex-col -gap-0.5"> {/* Dikey hizalama */}
                             <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tighter leading-none drop-shadow-sm select-none">
                                 <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700">
                                     Din Dersi Atölyesi
                                 </span>
                             </h1>
                             <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-widest mt-1 select-none">
                                 Dijital Öğrenme Platformu
                             </p>
                         </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-4 lg:gap-6 relative z-20">
                        <div className="flex flex-wrap justify-center gap-2">
                            {[
                                { icon: BookOpen, title: "Özetler", color: "text-amber-600", bg: "bg-amber-50" },
                                { icon: Gamepad2, title: "Oyunlar", color: "text-indigo-600", bg: "bg-indigo-50" },
                                { icon: Sparkles, title: "Etkinlikler", color: "text-emerald-600", bg: "bg-emerald-50" }
                            ].map((item, i) => (
                                <div key={i} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full border border-white shadow-sm transition-all select-none", item.bg)}>
                                    <item.icon className={cn("h-4 w-4", item.color)} />
                                    <span className="text-xs font-bold text-slate-700">{item.title}</span>
                                </div>
                            ))}
                        </div>

                        <div className="hidden sm:block w-px h-6 bg-slate-200" />

                        <div className="flex items-center gap-3">
                            <Link href="/login" className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-600 font-semibold text-sm hover:text-emerald-700 hover:bg-emerald-50 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none">
                                <LogIn className="w-4 h-4" />
                                <span>Giriş</span>
                            </Link>
                            <Link href="/register" className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-sm shadow-md hover:bg-emerald-700 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none">
                                <UserPlus className="w-4 h-4" />
                                <span>Kayıt Ol</span>
                            </Link>
                        </div>
                    </div>
                </div>

                {(!classGroups || classGroups.length === 0) ? (
                    <div className="text-center py-20 bg-white/50 rounded-3xl border-2 border-dashed border-slate-200 mt-8">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <BookOpen className="h-8 w-8 text-slate-300" />
                        </div>
                        <p className="text-slate-600 font-semibold text-lg">Henüz içerik eklenmemiş.</p>
                        <p className="text-slate-400 text-sm mt-1">Daha sonra tekrar kontrol edin.</p>
                    </div>
                ) : (
                    <>
                        {/* --- FİLTRELEME MENÜSÜ --- */}
                        {/* pt-4'ten pt-2'ye düşürüldü */}
                        <div className="sticky top-4 z-50 flex justify-center animate-in fade-in slide-in-from-top-8 duration-500 px-2 sm:px-0 pt-2">
                            {/* Mobil Seçim */}
                            <div className="md:hidden w-full flex flex-col gap-3 p-3 bg-white/95 backdrop-blur-md border border-slate-200 rounded-3xl shadow-lg">
                                
                                {/* Mobil Sınıf Seçimi (Koyu İndigo Çerçeve) */}
                                <div className="flex items-center gap-2 p-1.5 relative border-2 border-indigo-500 shadow-sm shadow-indigo-100 bg-white rounded-2xl">
                                    <div className="flex flex-col items-center justify-center pl-2 pr-3 border-r border-indigo-100">
                                        <Layers className="w-4 h-4 text-indigo-500" />
                                        <span className="text-[9px] font-bold text-indigo-600 uppercase mt-0.5">Sınıf</span>
                                    </div>
                                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-1">
                                        {classGroups.map((group) => {
                                            const isActive = activeTab === group.name;
                                            return (
                                                <button key={group.name} onClick={() => setActiveTab(group.name)} className={cn("flex-shrink-0 px-4 py-2 rounded-xl font-bold text-xs transition-colors focus-visible:outline-none", isActive ? "bg-indigo-600 text-white shadow-md border-2 border-indigo-600" : "bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 border-2 border-transparent")}>
                                                    {formatGroupName(group.name)}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none rounded-r-2xl" />
                                </div>

                                {/* Mobil Ders Seçimi (Koyu Zümrüt Çerçeve) */}
                                <div className="flex items-center gap-2 p-1.5 relative border-2 border-emerald-500 shadow-sm shadow-emerald-100 bg-white rounded-2xl">
                                    <div className="flex flex-col items-center justify-center pl-2 pr-3 border-r border-emerald-100">
                                        <Library className="w-4 h-4 text-emerald-500" />
                                        <span className="text-[9px] font-bold text-emerald-600 uppercase mt-0.5">Ders</span>
                                    </div>
                                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-1">
                                        {sortedCourses.map((course) => {
                                            const isCourseActive = activeCourseId === course.id;
                                            const { short } = getCourseDisplayInfo(course.title);
                                            return (
                                                <button key={course.id} onClick={() => setActiveCourseId(course.id)} className={cn("flex-shrink-0 px-4 py-2 rounded-xl font-bold text-xs transition-colors focus-visible:outline-none", isCourseActive ? "bg-emerald-50 text-emerald-700 shadow-sm border-2 border-emerald-500" : "bg-slate-50 text-slate-500 hover:bg-emerald-50 border-2 border-transparent")}>
                                                    {short}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none rounded-r-2xl" />
                                </div>
                            </div>

                            {/* Masaüstü Seçim */}
                            <div className="hidden md:flex flex-row items-center gap-4">
                                
                                {/* Masaüstü Sınıf Seçimi (Koyu İndigo Çerçeve) */}
                                <div className="flex items-center gap-2 p-1.5 pr-2 bg-white border-2 border-indigo-500 rounded-2xl shadow-md shadow-indigo-100/50 hover:shadow-lg hover:shadow-indigo-200/50 transition-shadow">
                                    <div className="flex flex-col items-center justify-center px-4 border-r border-indigo-100">
                                        <span className="text-[10px] font-bold text-indigo-600 uppercase">Sınıf</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {classGroups.map((group) => {
                                            const isActive = activeTab === group.name;
                                            return (
                                                <button key={group.name} onClick={() => setActiveTab(group.name)} className={cn("px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors focus-visible:outline-none", isActive ? "bg-indigo-600 text-white shadow-md border-2 border-indigo-600" : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 border-2 border-transparent")}>
                                                    {formatGroupName(group.name)}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Masaüstü Ders Seçimi (Koyu Zümrüt Çerçeve) */}
                                <div className="flex items-center gap-2 p-1.5 pr-2 bg-white border-2 border-emerald-500 rounded-2xl shadow-md shadow-emerald-100/50 hover:shadow-lg hover:shadow-emerald-200/50 transition-shadow">
                                    <div className="flex flex-col items-center justify-center px-4 border-r border-emerald-100">
                                        <span className="text-[10px] font-bold text-emerald-600 uppercase">Ders</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {sortedCourses.map((course) => {
                                            const isCourseActive = activeCourseId === course.id;
                                            const { full } = getCourseDisplayInfo(course.title);
                                            return (
                                                <button key={course.id} onClick={() => setActiveCourseId(course.id)} className={cn("flex-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none", isCourseActive ? "bg-emerald-50 text-emerald-700 border-2 border-emerald-500 shadow-sm" : "text-slate-500 hover:bg-emerald-50 border-2 border-transparent")}>
                                                    {isCourseActive && <CheckCircle2 className="w-4 h-4" />}
                                                    <span>{full}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* --- İÇERİK GRID ALANI --- (gap-3 sm:gap-4 xl:gap-5 ile boşluklar daraltıldı) */}
                        <div className={cn("mt-2 transition-all duration-500", gridConfig.wrapper)}>
                            {/* Kartlar arası boşluk (gap) daraltıldı */}
                            <div className={cn("grid gap-3 sm:gap-4 xl:gap-5 animate-in zoom-in-95 duration-500 items-start", gridConfig.grid)}>
                                {activeCourseData && (activeCourseData.units || []).sort((a: PublicUnit, b: PublicUnit) => (a.title || '').localeCompare(b.title || '', 'tr', { numeric: true })).map((unit, index) => {
                                    const theme = getUnitTheme(index);
                                    const { full: courseFullName } = getCourseDisplayInfo(activeCourseData.title);
                                    
                                    return (
                                        <div key={unit.id} className="bg-white rounded-[2rem] border border-slate-200 shadow-md overflow-hidden flex flex-col hover:shadow-lg transition-shadow duration-300 relative z-10">
                                            
                                            {/* Ünite Başlık Alanı (Canlı Gradient) */}
                                            <div className={cn("relative p-5 sm:p-6 bg-gradient-to-br", theme.headerFrom, theme.headerTo)}>
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-white/20 text-white backdrop-blur-sm shadow-sm">
                                                        {index + 1}. ÜNİTE
                                                    </div>
                                                </div>
                                                <h3 className="text-xl sm:text-2xl font-bold text-white leading-snug drop-shadow-md">
                                                    {unit.title}
                                                </h3>
                                            </div>

                                            {/* Ünite Özeti Butonu (Açık Ton) */}
                                            {unit.hasUnitOzet && (
                                                <div className="px-4 pt-4 pb-1 relative z-10">
                                                    <Link 
                                                        href={`/ozetler/${activeCourseData.id}/${unit.id}`} 
                                                        className={cn(
                                                            "group/ozet flex items-center justify-center gap-3 w-full py-3.5 px-4 rounded-xl font-bold text-sm sm:text-base transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                                                            theme.ozetBg, theme.ozetBorder, theme.ozetText, theme.ozetHoverBg, theme.ozetHoverBorder
                                                        )}
                                                    >
                                                        <div className={cn("p-1.5 rounded-lg transition-transform group-hover/ozet:scale-110", theme.ozetIconBg, theme.ozetIconText)}>
                                                            <BookOpen className="w-5 h-5" />
                                                        </div>
                                                        <span>Ünite Özeti</span>
                                                    </Link>
                                                </div>
                                            )}

                                            {/* Konu Listesi (Sade ve Renkli Çerçeveli) */}
                                            <div className="p-4 flex flex-col gap-2.5 relative z-10">
                                                {unit.topics.length > 0 ? (
                                                    unit.topics.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'tr', { numeric: true })).map((topic) => (
                                                        <Link 
                                                            key={topic.id} 
                                                            href={`/konu/${activeCourseData.id}/${unit.id}/${topic.id}?courseName=${encodeURIComponent(courseFullName)}&unitName=${encodeURIComponent(unit.title)}&topicName=${encodeURIComponent(topic.title)}`} 
                                                            className={cn(
                                                                "group/card flex items-center justify-between p-3.5 sm:p-4 rounded-xl bg-white transition-all duration-300 shadow-sm focus-visible:outline-none focus-visible:ring-2",
                                                                theme.topicBorder, 
                                                                "hover:shadow-md hover:-translate-y-0.5", theme.topicHoverBg, theme.topicHoverBorder
                                                            )}
                                                        >
                                                            <div className="flex-1 pr-3">
                                                                <h4 className={cn("text-[14px] sm:text-[15px] font-semibold leading-tight transition-colors", theme.topicText)}>
                                                                    {topic.title}
                                                                </h4>
                                                            </div>
                                                            <div className={cn("flex-shrink-0 p-2 rounded-lg bg-white border border-slate-200 text-slate-400 transition-colors duration-300 group-hover/card:text-white", theme.topicIconHoverAccent)}>
                                                                <ArrowRight className="h-4 w-4" />
                                                            </div>
                                                        </Link>
                                                    ))
                                                ) : (
                                                    <div className="py-6 rounded-xl border-2 border-dashed border-slate-100 bg-slate-50/50 text-slate-400 text-sm font-medium text-center">
                                                        Bu üniteye henüz konu eklenmemiş.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}

                {/* --- GÜNÜN AYETİ VE HADİSİ --- */}
                <div className="mt-12 pt-8 border-t border-slate-200/60 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 px-2 sm:px-0 max-w-[110rem] mx-auto w-full relative z-10">
                    
                    {/* Ayet Kartı */}
                    <div className="relative overflow-hidden bg-white/80 backdrop-blur-xl border border-emerald-100 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Quote className="w-24 h-24 text-emerald-600 rotate-180" />
                        </div>
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-1.5 bg-emerald-100 rounded-lg">
                                    <BookOpen className="w-4 h-4 text-emerald-600" />
                                </div>
                                <h2 className="text-sm font-bold text-emerald-700 uppercase tracking-widest">Günün Ayeti</h2>
                            </div>
                            <blockquote className="flex-1 text-slate-700 font-medium leading-relaxed italic mb-4 selection:bg-emerald-100">
                                "{dailyVerse.text}"
                            </blockquote>
                            <div className="text-right">
                                <span className="inline-block px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold text-slate-500">
                                    {dailyVerse.source}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Hadis Kartı */}
                    <div className="relative overflow-hidden bg-white/80 backdrop-blur-xl border border-indigo-100 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Quote className="w-24 h-24 text-indigo-600 rotate-180" />
                        </div>
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-1.5 bg-indigo-100 rounded-lg">
                                    <Sparkles className="w-4 h-4 text-indigo-600" />
                                </div>
                                <h2 className="text-sm font-bold text-indigo-700 uppercase tracking-widest">Günün Hadisi</h2>
                            </div>
                            <blockquote className="flex-1 text-slate-700 font-medium leading-relaxed italic mb-4 selection:bg-indigo-100">
                                "{dailyHadith.text}"
                            </blockquote>
                            <div className="text-right">
                                <span className="inline-block px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold text-slate-500">
                                    {dailyHadith.source}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- DİĞER BUTONU --- */}
                <div className="mt-12 flex justify-center pb-12 relative z-10">
                    <Link href="/extra" className="group flex items-center gap-4 px-10 py-5 rounded-[2.5rem] bg-slate-900 border-2 border-white/10 text-white shadow-2xl hover:border-cyan-500/50 hover:bg-slate-800 transition-all duration-300 hover:scale-[1.03]">
                        <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-cyan-500/20 transition-colors">
                             <MoreHorizontal className="h-8 w-8 text-slate-400 group-hover:text-cyan-400" />
                        </div>
                        <div className="text-left">
                            <span className="block text-xl font-black uppercase tracking-widest">Daha Fazla Keşfet</span>
                            <span className="block text-xs font-medium text-slate-500 group-hover:text-slate-300 transition-colors">Özel Dökümanlar ve Kaynaklar</span>
                        </div>
                    </Link>
                </div>

             </main>

            <SiteFooter />
        </div>
    );
};

export function PageContent({ classGroups }: { classGroups: PublicClass[] }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="h-10 w-10 animate-spin text-emerald-500" /></div>;
    
    if (process.env.NEXT_PUBLIC_STATIC_BUILD === 'true') return <LoggedOutPage classGroups={classGroups || []} />;
    
    if (user) {
        if (user.role === 'student') {
             router.replace('/student');
             return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="h-10 w-10 animate-spin text-emerald-500" /></div>;
        }
        return <LoggedInDashboard user={user} />;
    }
    
    return <LoggedOutPage classGroups={classGroups || []} />;
}
