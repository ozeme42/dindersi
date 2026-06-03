'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { Loader2, ArrowRight, BookOpen, Layers, ArrowLeft, FileText, Columns } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
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
                let studentClassStr = '7'; // Fallback
                if (user?.class) {
                    studentClassStr = user.class.split(' - ')[0].trim();
                }

                // Statik veriyi çek
                const { classGroups, error } = await getCurriculumForSelection('yazilacaklar', true);
                if (!error && classGroups) {
                    const myClassGroup = classGroups.find(g => String(g.name).includes(studentClassStr)) || classGroups[0];
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

    return (
        <div className="min-h-screen bg-[#09071a] w-full pb-20 md:pb-8 pt-4 md:pt-6">
            <div className="max-w-lg md:max-w-5xl mx-auto px-3 md:px-8">
                
                <style jsx global>{`
                    body { background-color: #09071a; }
                `}</style>
                
                {/* SAYFA BAŞLIĞI */}
            <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
                <button onClick={() => router.push('/student')} className="p-2 md:p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all group shrink-0 mr-1 md:mr-2">
                    <ArrowLeft className="h-5 w-5 md:h-6 md:w-6 text-slate-400 group-hover:text-white transition-colors" />
                </button>
                <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                    <BookOpen className="w-5 h-5 md:w-7 md:h-7 text-white drop-shadow-md" />
                </div>
                <div>
                    <h1 className="text-lg md:text-3xl font-black text-white tracking-tight leading-tight">Ders Notları</h1>
                    <p className="text-indigo-200/80 font-medium text-[10px] md:text-sm leading-tight">Panolar ve Özetler</p>
                </div>
            </div>

            {isLoadingData ? (
                <div className="flex py-20 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-500" /></div>
            ) : (
                <>
                    {/* DERS SEÇİM TABS */}
                    {courses.length > 1 && (
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mb-4 md:mb-8 pb-1 md:pb-2">
                            {courses.map((course) => {
                                const isCourseActive = activeCourseId === course.id;
                                const { short } = getCourseDisplayInfo(course.title);
                                return (
                                    <button 
                                        key={course.id} 
                                        onClick={() => setActiveCourseId(course.id)} 
                                        className={cn(
                                            "flex-shrink-0 px-4 py-2 md:px-5 md:py-3 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm transition-all duration-300 focus-visible:outline-none", 
                                            isCourseActive 
                                                ? "bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] scale-105 border border-indigo-400/50" 
                                                : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/5"
                                        )}
                                    >
                                        {short}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {courses.length === 0 && (
                        <div className="py-10 text-center rounded-3xl border border-dashed border-white/10 bg-white/5 mt-8">
                            <Layers className="h-10 w-10 text-slate-500 mx-auto mb-3 opacity-50" />
                            <p className="text-slate-400 font-medium">Bu sınıfa ait henüz içerik bulunamadı.</p>
                        </div>
                    )}

                    {/* ÜNİTELER VE KONULAR (GRID) */}
                    <div className="grid md:grid-cols-2 gap-4 md:gap-8 animate-in zoom-in-95 duration-500 items-start">
                        {activeCourseData && (activeCourseData.units || []).sort((a, b) => (a.title || '').localeCompare(b.title || '', 'tr', { numeric: true })).map((unit, index) => {
                            const theme = getUnitTheme(index);
                            
                            return (
                                <div key={unit.id} className="bg-white/5 backdrop-blur-md rounded-2xl md:rounded-[2rem] border border-white/10 shadow-sm md:shadow-md overflow-hidden flex flex-col hover:shadow-lg md:hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all duration-300 relative z-10">
                                    {/* ÜNİTE BAŞLIĞI */}
                                    <div className={cn("relative p-3 md:p-6 bg-gradient-to-br border-b border-white/10", theme.headerFrom, theme.headerTo)}>
                                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                                        <div className="flex items-center justify-between mb-1.5 md:mb-3">
                                            <div className="px-2 py-0.5 md:px-3 md:py-1 rounded-md md:rounded-lg text-[9px] md:text-[10px] font-bold uppercase tracking-widest bg-white/20 text-white backdrop-blur-sm shadow-sm">
                                                {index + 1}. ÜNİTE
                                            </div>
                                        </div>
                                        <h3 className="text-base md:text-2xl font-bold text-white leading-snug drop-shadow-md">
                                            {unit.title}
                                        </h3>
                                    </div>

                                    {/* KONULAR LİSTESİ */}
                                    <div className="p-2 md:p-4 flex flex-col gap-2 md:gap-3 relative z-10 bg-black/20">
                                        {(unit as any).hasUnitOzet && (
                                            <Link 
                                                href={`/student/ders-notlari/${activeCourseData.id}/${unit.id}/unit-summary`} 
                                                className={cn(
                                                    "group/card flex items-center justify-between p-2.5 md:p-4 rounded-xl bg-cyan-900/40 transition-all duration-300 shadow-sm focus-visible:outline-none focus-visible:ring-2 border border-cyan-500/30 hover:bg-cyan-800/50 hover:shadow-md hover:-translate-y-0.5 md:hover:-translate-y-1 backdrop-blur-sm"
                                                )}
                                            >
                                                <div className="flex-1 pr-2 md:pr-3 flex items-center gap-2.5 md:gap-3">
                                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-cyan-950/50 border border-cyan-500/40 flex items-center justify-center shrink-0">
                                                        <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-cyan-400" />
                                                    </div>
                                                    <h4 className="text-xs md:text-[15px] font-black leading-tight transition-colors text-cyan-100 group-hover/card:text-white uppercase tracking-wider">
                                                        Ünite Özeti
                                                    </h4>
                                                </div>
                                                <div className="flex-shrink-0 p-1.5 md:p-2.5 rounded-lg md:rounded-xl bg-cyan-950/50 border border-cyan-500/40 text-cyan-400 transition-colors duration-300 group-hover/card:text-white group-hover/card:bg-cyan-500">
                                                    <ArrowRight className="h-3.5 w-3.5 md:h-5 md:w-5" />
                                                </div>
                                            </Link>
                                        )}
                                        {unit.topics.length > 0 ? (
                                            unit.topics.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'tr', { numeric: true })).map((topic) => (
                                                <Link 
                                                    key={topic.id} 
                                                    href={`/student/ders-notlari/${activeCourseData.id}/${unit.id}/${topic.id}`} 
                                                    className={cn(
                                                        "group/card flex items-center justify-between p-2.5 md:p-4 rounded-xl bg-white/5 transition-all duration-300 shadow-sm focus-visible:outline-none focus-visible:ring-2 border",
                                                        theme.topicBorder, 
                                                        "hover:shadow-md hover:-translate-y-0.5 md:hover:-translate-y-1 backdrop-blur-sm", theme.topicHoverBg, theme.topicHoverBorder
                                                    )}
                                                >
                                                    <div className="flex-1 pr-2 md:pr-3 flex items-center gap-2.5 md:gap-3">
                                                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-black/30 border border-white/10 flex items-center justify-center shrink-0">
                                                            <Layers className={cn("w-4 h-4 md:w-5 md:h-5", theme.topicText)} />
                                                        </div>
                                                        <h4 className={cn("text-xs md:text-[15px] font-bold leading-tight transition-colors text-slate-200 group-hover/card:text-white")}>
                                                            {topic.title}
                                                        </h4>
                                                    </div>
                                                    <div className={cn("flex-shrink-0 p-1.5 md:p-2.5 rounded-lg md:rounded-xl bg-white/5 border border-white/10 text-slate-500 transition-colors duration-300 group-hover/card:text-white", theme.topicIconHoverAccent)}>
                                                        <ArrowRight className="h-3.5 w-3.5 md:h-5 md:w-5" />
                                                    </div>
                                                </Link>
                                            ))
                                        ) : (
                                            !(unit as any).hasUnitOzet && (
                                                <div className="py-4 md:py-6 rounded-xl border border-dashed border-white/20 bg-white/5 text-slate-400 text-xs md:text-sm font-medium text-center">
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
