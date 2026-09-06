'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { Loader2, ArrowRight, BookOpen, Layers, ArrowLeft, FileText, Columns } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { getCurriculumForSelection, ClassGroup, EnrichedCourse } from '@/components/actions/get-curriculum-for-selection';

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

const getUnitTheme = (index: number) => {
    const themes = [
        { 
            name: 'emerald',
            headerFrom: 'from-emerald-950/80', headerTo: 'to-teal-900/40',
            topicBorder: 'border-white/5', topicText: 'text-emerald-300', topicHoverBg: 'hover:bg-emerald-500/10', topicHoverBorder: 'hover:border-emerald-500/40', topicIconHoverAccent: 'group-hover/card:bg-emerald-500 group-hover/card:border-emerald-400 group-hover/card:text-white group-hover/card:shadow-[0_0_15px_rgba(16,185,129,0.5)]'
        },
        { 
            name: 'indigo',
            headerFrom: 'from-indigo-950/80', headerTo: 'to-blue-900/40',
            topicBorder: 'border-white/5', topicText: 'text-indigo-300', topicHoverBg: 'hover:bg-indigo-500/10', topicHoverBorder: 'hover:border-indigo-500/40', topicIconHoverAccent: 'group-hover/card:bg-indigo-500 group-hover/card:border-indigo-400 group-hover/card:text-white group-hover/card:shadow-[0_0_15px_rgba(99,102,241,0.5)]'
        },
        { 
            name: 'amber',
            headerFrom: 'from-amber-950/80', headerTo: 'to-orange-900/40',
            topicBorder: 'border-white/5', topicText: 'text-amber-300', topicHoverBg: 'hover:bg-amber-500/10', topicHoverBorder: 'hover:border-amber-500/40', topicIconHoverAccent: 'group-hover/card:bg-amber-500 group-hover/card:border-amber-400 group-hover/card:text-white group-hover/card:shadow-[0_0_15px_rgba(245,158,11,0.5)]'
        },
        { 
            name: 'violet',
            headerFrom: 'from-violet-950/80', headerTo: 'to-purple-900/40',
            topicBorder: 'border-white/5', topicText: 'text-violet-300', topicHoverBg: 'hover:bg-violet-500/10', topicHoverBorder: 'hover:border-violet-500/40', topicIconHoverAccent: 'group-hover/card:bg-violet-500 group-hover/card:border-violet-400 group-hover/card:text-white group-hover/card:shadow-[0_0_15px_rgba(139,92,246,0.5)]'
        },
        { 
            name: 'cyan',
            headerFrom: 'from-cyan-950/80', headerTo: 'to-sky-900/40',
            topicBorder: 'border-white/5', topicText: 'text-cyan-300', topicHoverBg: 'hover:bg-cyan-500/10', topicHoverBorder: 'hover:border-cyan-500/40', topicIconHoverAccent: 'group-hover/card:bg-cyan-500 group-hover/card:border-cyan-400 group-hover/card:text-white group-hover/card:shadow-[0_0_15px_rgba(6,182,212,0.5)]'
        },
    ];
    return themes[index % themes.length];
};

function DersNotlariPage() {
    const { user, loading } = useAuth();
    const [courses, setCourses] = useState<EnrichedCourse[]>([]);
    const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchData = async () => {
            if (loading) return;
            setIsLoadingData(true);
            try {
                let gradeStr = '5'; // Fallback
                if (user?.class) {
                    const gradeMatch = user.class.match(/\d+/);
                    if (gradeMatch) gradeStr = gradeMatch[0];
                    else gradeStr = user.class.split(' - ')[0].trim();
                }

                // Statik veriyi çek
                const { classGroups, error } = await getCurriculumForSelection('yazilacaklar', true);
                if (!error && classGroups) {
                    const myClassGroup = classGroups.find(g => String(g.name) === gradeStr || String(g.name).includes(gradeStr)) || classGroups[0];
                    if (myClassGroup && myClassGroup.courses.length > 0) {
                        setCourses(myClassGroup.courses);
                        setActiveCourseId(myClassGroup.courses[0].id);
                    } else {
                        setCourses([]);
                    }
                } else {
                    setCourses([]);
                }
            } catch (err) {
                console.error(err);
                setCourses([]);
            } finally {
                setIsLoadingData(false);
            }
        };

        fetchData();
    }, [user, loading]);

    const activeCourseData = useMemo(() => {
        return courses.find(c => c.id === activeCourseId) || courses[0];
    }, [courses, activeCourseId]);

    if (loading) {
        return <div className="flex h-[80vh] w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>;
    }

    // Hesaplanmış istatistikler (0 DB maliyeti)
    const stats = useMemo(() => {
        const totalUnits = activeCourseData?.units?.length || 0;
        const totalTopics = activeCourseData?.units?.reduce((acc, u) => acc + (u.topics?.length || 0), 0) || 0;
        return { totalUnits, totalTopics };
    }, [activeCourseData]);

    return (
        <div className="min-h-screen bg-[#050314] w-full pb-24 md:pb-12 pt-4 md:pt-6 relative overflow-hidden font-sans">
            {/* Ambient Background Glows */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[140px]" />
                <div className="absolute top-[30%] right-[-10%] w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[140px]" />
                <div className="absolute bottom-[-10%] left-[20%] w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[140px]" />
                <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
                
                {/* HERO BANNER */}
                <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-br from-white/[0.07] via-white/[0.03] to-transparent backdrop-blur-2xl p-6 md:p-8 mb-8 shadow-2xl">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent" />
                    
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Button asChild variant="ghost" size="sm" className="h-8 px-3 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl group">
                                    <Link href="/student" className="flex items-center gap-1.5 text-xs font-bold">
                                        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                                        Öğrenci Paneli
                                    </Link>
                                </Button>
                                <span className="text-slate-600">/</span>
                                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Çalışma Panosu</span>
                            </div>
                            
                            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight flex items-center gap-3.5">
                                <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0">
                                    <BookOpen className="w-6 h-6 md:w-7 md:h-7 text-white" />
                                </div>
                                <span>Ders <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-300">Notları</span></span>
                            </h1>
                            <p className="text-slate-300/80 text-sm md:text-base mt-2 max-w-xl leading-relaxed font-medium">
                                Konu özetleri, kavram haritaları ve interaktif ders içerikleriyle sınava ve derslere eksiksiz hazırlan!
                            </p>
                        </div>

                        {/* Canlı İstatistik Çipleri */}
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
                            <div className="flex-1 sm:flex-none bg-[#0e0c26]/90 border border-white/10 rounded-2xl p-4 shadow-xl backdrop-blur-xl flex items-center gap-3.5 min-w-[140px]">
                                <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shrink-0">
                                    <BookOpen className="w-6 h-6 text-indigo-400" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Ders Sayısı</span>
                                    <span className="text-xl md:text-2xl font-black text-white font-mono leading-none">{courses.length}</span>
                                    <span className="text-[10px] font-bold text-slate-400 ml-1">Ders</span>
                                </div>
                            </div>

                            <div className="flex-1 sm:flex-none bg-[#0e0c26]/90 border border-white/10 rounded-2xl p-4 shadow-xl backdrop-blur-xl flex items-center gap-3.5 min-w-[140px]">
                                <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shrink-0">
                                    <Layers className="w-6 h-6 text-purple-400" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Toplam Ünite</span>
                                    <span className="text-xl md:text-2xl font-black text-white font-mono leading-none">{stats.totalUnits}</span>
                                    <span className="text-[10px] font-bold text-slate-400 ml-1">Ünite</span>
                                </div>
                            </div>

                            <div className="flex-1 sm:flex-none bg-[#0e0c26]/90 border border-white/10 rounded-2xl p-4 shadow-xl backdrop-blur-xl flex items-center gap-3.5 min-w-[140px]">
                                <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
                                    <FileText className="w-6 h-6 text-cyan-400" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Toplam Konu</span>
                                    <span className="text-xl md:text-2xl font-black text-white font-mono leading-none">{stats.totalTopics}</span>
                                    <span className="text-[10px] font-bold text-slate-400 ml-1">Konu</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            {isLoadingData ? (
                <div className="flex py-20 w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-indigo-400" /></div>
            ) : (
                <>
                    {/* DERS SEÇİM TABS */}
                    {courses.length > 1 && (
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mb-8 pb-1">
                            {courses.map((course) => {
                                const isCourseActive = activeCourseId === course.id;
                                const { short, full } = getCourseDisplayInfo(course.title);
                                return (
                                    <button 
                                        key={course.id} 
                                        onClick={() => setActiveCourseId(course.id)} 
                                        className={cn(
                                            "flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs md:text-sm transition-all duration-300 focus-visible:outline-none shrink-0 shadow-lg", 
                                            isCourseActive 
                                                ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.35)] scale-105 border border-indigo-400/50" 
                                                : "bg-[#0e0c26]/80 text-slate-400 hover:bg-white/10 hover:text-white border border-white/10"
                                        )}
                                    >
                                        <BookOpen className="w-4 h-4 shrink-0" />
                                        <span>{full || short}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {courses.length === 0 && (
                        <div className="py-16 text-center rounded-3xl border border-dashed border-white/10 bg-white/5 mt-8">
                            <Layers className="h-12 w-12 text-slate-500 mx-auto mb-3 opacity-50" />
                            <p className="text-slate-400 font-bold text-base">Bu sınıfa ait henüz içerik bulunamadı.</p>
                        </div>
                    )}

                    {/* ÜNİTELER VE KONULAR (RESPONSIVE GRID) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in zoom-in-95 duration-500 items-start">
                        {activeCourseData && (activeCourseData.units || []).sort((a, b) => (a.title || '').localeCompare(b.title || '', 'tr', { numeric: true })).map((unit, index) => {
                            const theme = getUnitTheme(index);
                            
                            return (
                                <div key={unit.id} className="bg-[#0e0c26]/70 backdrop-blur-xl rounded-3xl border border-white/10 shadow-xl overflow-hidden flex flex-col hover:border-white/20 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative z-10">
                                    {/* ÜNİTE BAŞLIĞI */}
                                    <div className={cn("relative p-5 md:p-6 bg-gradient-to-br border-b border-white/10", theme.headerFrom, theme.headerTo)}>
                                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                                        <div className="flex items-center justify-between mb-2.5">
                                            <div className="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/20 text-white backdrop-blur-md shadow-sm border border-white/15">
                                                {index + 1}. ÜNİTE
                                            </div>
                                            <span className="text-[11px] font-bold text-white/70">
                                                {(unit.topics?.length || 0)} Konu
                                            </span>
                                        </div>
                                        <h3 className="text-lg md:text-xl font-black text-white leading-snug drop-shadow-md">
                                            {unit.title}
                                        </h3>
                                    </div>

                                    {/* KONULAR LİSTESİ */}
                                    <div className="p-3 md:p-4 flex flex-col gap-2.5 relative z-10 bg-black/20">
                                        {(unit as any).hasUnitOzet && (
                                            <Link 
                                                href={`/student/ders-notlari/${activeCourseData.id}/${unit.id}/unit-summary`} 
                                                className={cn(
                                                    "group/card flex items-center justify-between p-3.5 md:p-4 rounded-2xl bg-cyan-950/40 transition-all duration-300 shadow-md focus-visible:outline-none focus-visible:ring-2 border border-cyan-500/30 hover:bg-cyan-900/50 hover:border-cyan-400/60 hover:-translate-y-0.5 backdrop-blur-sm"
                                                )}
                                            >
                                                <div className="flex-1 pr-3 flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center shrink-0 shadow-inner">
                                                        <BookOpen className="w-5 h-5 text-cyan-400" />
                                                    </div>
                                                    <h4 className="text-xs md:text-sm font-black leading-tight transition-colors text-cyan-200 group-hover/card:text-white uppercase tracking-wider">
                                                        Ünite Özeti
                                                    </h4>
                                                </div>
                                                <div className="flex-shrink-0 p-2 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-400 transition-all duration-300 group-hover/card:text-white group-hover/card:bg-cyan-500 group-hover/card:scale-105">
                                                    <ArrowRight className="h-4 w-4" />
                                                </div>
                                            </Link>
                                        )}
                                        {unit.topics && unit.topics.length > 0 ? (
                                            [...unit.topics].sort((a, b) => (a.title || '').localeCompare(b.title || '', 'tr', { numeric: true })).map((topic) => (
                                                <Link 
                                                    key={topic.id} 
                                                    href={`/student/ders-notlari/${activeCourseData.id}/${unit.id}/${topic.id}`} 
                                                    className={cn(
                                                        "group/card flex items-center justify-between p-3.5 md:p-4 rounded-2xl bg-white/[0.04] transition-all duration-300 shadow-sm focus-visible:outline-none focus-visible:ring-2 border",
                                                        theme.topicBorder, 
                                                        "hover:shadow-md hover:-translate-y-0.5 backdrop-blur-sm", theme.topicHoverBg, theme.topicHoverBorder
                                                    )}
                                                >
                                                    <div className="flex-1 pr-3 flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center shrink-0">
                                                            <Layers className={cn("w-5 h-5", theme.topicText)} />
                                                        </div>
                                                        <h4 className={cn("text-xs md:text-sm font-bold leading-tight transition-colors text-slate-200 group-hover/card:text-white")}>
                                                            {topic.title}
                                                        </h4>
                                                    </div>
                                                    <div className={cn("flex-shrink-0 p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 transition-all duration-300 group-hover/card:text-white group-hover/card:scale-105", theme.topicIconHoverAccent)}>
                                                        <ArrowRight className="h-4 w-4" />
                                                    </div>
                                                </Link>
                                            ))
                                        ) : (
                                            !(unit as any).hasUnitOzet && (
                                                <div className="py-6 rounded-2xl border border-dashed border-white/15 bg-white/5 text-slate-400 text-xs md:text-sm font-medium text-center">
                                                    Bu üniteye henüz içerik eklenmemiş.
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
        </div>
    );
}

export default function DersNotlariSuspense() {
    return (
        <Suspense fallback={<div className="flex h-[80vh] w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <DersNotlariPage />
        </Suspense>
    );
}
