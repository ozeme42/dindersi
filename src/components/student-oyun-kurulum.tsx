'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, ArrowRight, Layers, Gamepad2, Play, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { getCurriculumForSelection, EnrichedCourse } from '@/components/actions/get-curriculum-for-selection';
import { getUserGamePlayCounts } from '@/app/student/actions';

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

type StudentOyunKurulumProps = {
    pageTitle?: string;
    gameName?: string;
    gamePath?: string;
    pageIcon?: React.ElementType;
    gameIcon?: React.ElementType;
    isStatic?: boolean;
    studentClassId?: string | null;
};

export function StudentOyunKurulum({ 
    pageTitle: initialPageTitle, gameName, gamePath, pageIcon: PageIconProp, gameIcon, isStatic = false, studentClassId 
}: StudentOyunKurulumProps) {
    const { user, loading } = useAuth();
    const [courses, setCourses] = useState<EnrichedCourse[]>([]);
    const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [playCounts, setPlayCounts] = useState<Record<string, number>>({});
    const router = useRouter();

    const title = initialPageTitle || gameName || "Oyun";
    const finalGamePath = gamePath || "";
    const IconComponent = PageIconProp || gameIcon || Gamepad2;

    useEffect(() => {
        const fetchData = async () => {
            if (loading) return;
            setIsLoadingData(true);
            try {
                let studentClassStr = studentClassId || '7'; // Fallback
                if (!studentClassId && user?.class) {
                    studentClassStr = user.class.split(' - ')[0].trim();
                }

                // Oyunlar için dataType 'games'
                const { classGroups, error } = await getCurriculumForSelection('games', isStatic);
                if (!error && classGroups) {
                    const myClassGroup = classGroups.find(g => String(g.name).includes(studentClassStr)) || classGroups[0];
                    if (myClassGroup && myClassGroup.courses.length > 0) {
                        setCourses(myClassGroup.courses);
                        setActiveCourseId(myClassGroup.courses[0].id);
                    }
                }
                
                // Oyun oynanma sayılarını çek
                if (user?.uid) {
                    const counts = await getUserGamePlayCounts(user.uid, title, finalGamePath);
                    setPlayCounts(counts);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoadingData(false);
            }
        };

        fetchData();
    }, [user, loading, studentClassId, isStatic]);

    const activeCourseData = useMemo(() => {
        return courses.find(c => c.id === activeCourseId) || courses[0];
    }, [courses, activeCourseId]);

    if (loading || isLoadingData) {
        return <div className="flex h-screen w-full bg-[#09071a] items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-cyan-500" /></div>;
    }

    if (!courses || courses.length === 0) {
        return (
            <div className="flex h-screen w-full bg-[#09071a] items-center justify-center flex-col gap-4">
                <IconComponent className="w-16 h-16 text-slate-500 opacity-50" />
                <h2 className="text-xl font-bold text-slate-400">Sınıfınıza ait konu bulunamadı.</h2>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#09071a] w-full pb-20 md:pb-8 pt-4 md:pt-6">
            <div className="max-w-lg md:max-w-5xl mx-auto px-3 md:px-8">
                
                <style jsx global>{`
                    body { background-color: #09071a; }
                `}</style>
                
                {/* SAYFA BAŞLIĞI */}
            <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-8">
                <button onClick={() => router.push('/student')} className="p-2 md:p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all group shrink-0 mr-1 md:mr-2">
                    <ArrowLeft className="h-5 w-5 md:h-6 md:w-6 text-slate-400 group-hover:text-white transition-colors" />
                </button>
                <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
                    <IconComponent className="w-5 h-5 md:w-7 md:h-7 text-white drop-shadow-md" />
                </div>
                <div>
                    <h1 className="text-lg md:text-3xl font-black text-white tracking-tight leading-tight">{title}</h1>
                    <p className="text-cyan-200/80 font-medium text-[10px] md:text-sm leading-tight">Konu seç ve oynamaya başla!</p>
                </div>
            </div>

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
                                        ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)] scale-105 border border-cyan-400/50" 
                                        : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/5"
                                )}
                            >
                                {short}
                            </button>
                        );
                    })}
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
                                {unit.topics && unit.topics.length > 0 ? (
                                    <>
                                        {/* KARMA: TÜM ÜNİTE KONULARI SEÇENEĞİ */}
                                        {(() => {
                                            const karmaCount = Object.entries(playCounts).reduce((acc, [contextStr, c]) => {
                                                if (contextStr.includes('Karma') || contextStr.includes('Genel')) {
                                                    // Sadece o üniteye ait karmaları mı sayıyoruz? Karma genellikle tek.
                                                    // Eşleşmeyi "Karma" kelimesine göre yapıyoruz
                                                    return acc + c;
                                                }
                                                return acc;
                                            }, 0);
                                            const isKarmaLimitReached = karmaCount >= 10;
                                            
                                            return (
                                                <Link 
                                                    href={`/oyunlar/${finalGamePath}/oyun?${new URLSearchParams({ 
                                                        gameName: title, gamePath: finalGamePath, classId: activeCourseData.classId || "", 
                                                        className: activeCourseData.className || "", courseId: activeCourseData.id, 
                                                        courseName: activeCourseData.title, unitId: unit.id, unitName: unit.title, 
                                                        topicId: 'all', topicName: 'Karma', isStatic: String(isStatic) 
                                                    }).toString()}`} 
                                                    className={cn(
                                                        "group/card flex items-center justify-between p-2.5 md:p-4 rounded-xl transition-all duration-300 shadow-sm focus-visible:outline-none focus-visible:ring-2 border backdrop-blur-sm",
                                                        isKarmaLimitReached 
                                                            ? "bg-black/40 border-white/5 opacity-70 hover:opacity-100" 
                                                            : "bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border-purple-500/30 hover:shadow-md hover:-translate-y-0.5 md:hover:-translate-y-1 hover:from-purple-800/50 hover:to-indigo-800/50 hover:border-purple-400/50"
                                                    )}
                                                >
                                                    <div className="flex-1 pr-2 md:pr-3 flex items-center gap-2.5 md:gap-3">
                                                        <div className={cn("w-8 h-8 md:w-10 md:h-10 rounded-lg border flex items-center justify-center shrink-0 transition-colors", 
                                                            isKarmaLimitReached 
                                                                ? "bg-black/60 border-white/10" 
                                                                : "bg-black/40 border-purple-500/20 group-hover/card:bg-purple-500/30"
                                                        )}>
                                                            <Layers className={cn("w-4 h-4 md:w-5 md:h-5", isKarmaLimitReached ? "text-slate-500" : "text-purple-300")} />
                                                        </div>
                                                        <h4 className={cn("text-xs md:text-[15px] font-black tracking-wide transition-colors", 
                                                            isKarmaLimitReached ? "text-slate-400" : "text-purple-200 group-hover/card:text-white"
                                                        )}>
                                                            Tüm Ünite Konuları (Karma)
                                                        </h4>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {finalGamePath !== 'milyoner-yarismasi' && (
                                                            <div className={cn("px-2 py-1 md:px-2.5 md:py-1 rounded-md md:rounded-lg text-[10px] md:text-xs font-black border flex items-center justify-center gap-1 min-w-[3rem]",
                                                                isKarmaLimitReached 
                                                                    ? "bg-rose-950/40 text-rose-400 border-rose-900/50" 
                                                                    : "bg-purple-500/20 text-purple-300 border-purple-500/30"
                                                            )}>
                                                                {karmaCount}/10
                                                            </div>
                                                        )}
                                                        <div className={cn("flex-shrink-0 p-1.5 md:p-2.5 rounded-lg md:rounded-xl border transition-colors duration-300", 
                                                            isKarmaLimitReached
                                                                ? "bg-white/5 border-white/10 text-slate-500 group-hover/card:text-white"
                                                                : "bg-purple-500/20 border-purple-500/30 text-purple-300 group-hover/card:bg-purple-500 group-hover/card:text-white"
                                                        )}>
                                                            <Play className="h-4 w-4 md:h-5 md:w-5 ml-0.5" />
                                                        </div>
                                                    </div>
                                                </Link>
                                            );
                                        })()}

                                        {/* BİREYSEL KONULAR */}
                                        {unit.topics.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'tr', { numeric: true })).map((topic) => {
                                            
                                            // Toplam play count hesapla
                                            const count = Object.entries(playCounts).reduce((acc, [contextStr, c]) => {
                                                if (contextStr.includes(topic.title)) {
                                                    return acc + c;
                                                }
                                                return acc;
                                            }, 0);
                                            const limitReached = count >= 10;
                                            
                                            // OYUN İÇİN URL OLUŞTURMA
                                            const params = new URLSearchParams({ 
                                                gameName: title, 
                                                gamePath: finalGamePath, 
                                                classId: activeCourseData.classId || "", 
                                                className: activeCourseData.className || "", 
                                                courseId: activeCourseData.id, 
                                                courseName: activeCourseData.title, 
                                                unitId: unit.id, 
                                                unitName: unit.title, 
                                                topicId: topic.id, 
                                                topicName: topic.title, 
                                                isStatic: String(isStatic) 
                                            });
                                            const finalUrl = `/oyunlar/${finalGamePath}/oyun?${params.toString()}`;

                                            return (
                                                <Link 
                                                    key={topic.id} 
                                                    href={finalUrl} 
                                                    className={cn(
                                                        "group/card flex items-center justify-between p-2.5 md:p-4 rounded-xl transition-all duration-300 shadow-sm focus-visible:outline-none focus-visible:ring-2 border backdrop-blur-sm",
                                                        limitReached 
                                                            ? "bg-black/40 border-white/5 opacity-70 hover:opacity-100" 
                                                            : cn("bg-white/5", theme.topicBorder, theme.topicHoverBg, theme.topicHoverBorder, "hover:shadow-md hover:-translate-y-0.5 md:hover:-translate-y-1")
                                                    )}
                                                >
                                                    <div className="flex-1 pr-2 md:pr-3 flex items-center gap-2.5 md:gap-3">
                                                        <div className={cn("w-8 h-8 md:w-10 md:h-10 rounded-lg border flex items-center justify-center shrink-0 transition-colors", 
                                                            limitReached 
                                                                ? "bg-black/60 border-white/10" 
                                                                : cn("bg-black/30 border-white/10 group-hover/card:bg-cyan-500/20 group-hover/card:border-cyan-500/50")
                                                        )}>
                                                            <Play className={cn("w-4 h-4 md:w-5 md:h-5 ml-0.5", limitReached ? "text-slate-500" : theme.topicText)} />
                                                        </div>
                                                        <h4 className={cn("text-xs md:text-[15px] font-bold leading-tight transition-colors", 
                                                            limitReached ? "text-slate-400" : "text-slate-200 group-hover/card:text-white"
                                                        )}>
                                                            {topic.title}
                                                        </h4>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-2">
                                                        {finalGamePath !== 'milyoner-yarismasi' && (
                                                            <div className={cn("px-2 py-1 md:px-2.5 md:py-1 rounded-md md:rounded-lg text-[10px] md:text-xs font-black border flex items-center justify-center gap-1 min-w-[3rem]",
                                                                limitReached 
                                                                    ? "bg-rose-950/40 text-rose-400 border-rose-900/50" 
                                                                    : "bg-black/40 text-slate-400 border-white/10"
                                                            )}>
                                                                {count}/10
                                                            </div>
                                                        )}
                                                        <div className={cn("flex-shrink-0 p-1.5 md:p-2.5 rounded-lg md:rounded-xl border transition-colors duration-300", 
                                                            limitReached
                                                                ? "bg-white/5 border-white/10 text-slate-500 group-hover/card:text-white"
                                                                : cn("bg-cyan-500/10 border-cyan-500/20 text-cyan-400 group-hover/card:bg-cyan-500 group-hover/card:text-white", theme.topicIconHoverAccent)
                                                        )}>
                                                            <Gamepad2 className="h-4 w-4 md:h-5 md:w-5" />
                                                        </div>
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </>
                                ) : (
                                    <div className="py-4 md:py-6 rounded-xl border border-dashed border-white/20 bg-white/5 text-slate-400 text-xs md:text-sm font-medium text-center">
                                        Bu üniteye henüz konu eklenmemiş.
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
        </div>
    );
}
