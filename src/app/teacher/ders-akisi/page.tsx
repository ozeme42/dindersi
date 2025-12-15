
'use client';

import { useState, useEffect } from 'react';
import { Workflow, Loader2, FilePenLine, Link as LinkIcon, BookOpen, Columns, Layers, ChevronRight, Hash, GraduationCap, Book, Home } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import type { Course, SchoolClass, Unit, Topic } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// --- NEON RENK PALETİ ---
const colorClasses = [
    'bg-blue-950/60 border-2 border-blue-500/50 hover:border-blue-400 hover:bg-blue-900/80 text-blue-100 hover:shadow-[0_0_30px_rgba(59,130,246,0.4)]',
    'bg-emerald-950/60 border-2 border-emerald-500/50 hover:border-emerald-400 hover:bg-emerald-900/80 text-emerald-100 hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]',
    'bg-purple-950/60 border-2 border-purple-500/50 hover:border-purple-400 hover:bg-purple-900/80 text-purple-100 hover:shadow-[0_0_30px_rgba(168,85,247,0.4)]',
    'bg-rose-950/60 border-2 border-rose-500/50 hover:border-rose-400 hover:bg-rose-900/80 text-rose-100 hover:shadow-[0_0_30px_rgba(244,63,94,0.4)]',
    'bg-amber-950/60 border-2 border-amber-500/50 hover:border-amber-400 hover:bg-amber-900/80 text-amber-100 hover:shadow-[0_0_30px_rgba(245,158,11,0.4)]',
    'bg-indigo-950/60 border-2 border-indigo-500/50 hover:border-indigo-400 hover:bg-indigo-900/80 text-indigo-100 hover:shadow-[0_0_30px_rgba(99,102,241,0.4)]',
    'bg-teal-950/60 border-2 border-teal-500/50 hover:border-teal-400 hover:bg-teal-900/80 text-teal-100 hover:shadow-[0_0_30px_rgba(20,184,166,0.4)]',
    'bg-cyan-950/60 border-2 border-cyan-500/50 hover:border-cyan-400 hover:bg-cyan-900/80 text-cyan-100 hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]',
];

// Types
type EnrichedUnit = Unit & { topics: Topic[] };
type EnrichedCourse = Course & { className?: string, units: EnrichedUnit[] };
type CourseGroup = {
    title: string;
    courses: EnrichedCourse[];
};

export default function DersAkisiPage() {
    const [allCourseGroups, setAllCourseGroups] = useState<CourseGroup[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const fetchData = async () => {
        try {
            const [coursesSnap, classesSnap] = await Promise.all([
                getDocs(query(collection(db, 'courses'), orderBy('title'))),
                getDocs(collection(db, 'classes'))
            ]);

            const allCoursesData = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
            const allClasses = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
            
            const classMap = new Map(allClasses.map(c => [c.id, c.name]));

            const groupedByTitle: { [title: string]: EnrichedCourse[] } = {};

            for (const course of allCoursesData) {
                const unitsSnap = await getDocs(query(collection(db, `courses/${course.id}/units`), orderBy("title")));
                const units: EnrichedUnit[] = await Promise.all(
                    unitsSnap.docs.map(async (unitDoc) => {
                        const topicsSnap = await getDocs(query(collection(db, `courses/${course.id}/units/${unitDoc.id}/topics`), orderBy("title")));
                        return {
                            id: unitDoc.id,
                            ...unitDoc.data(),
                            topics: topicsSnap.docs.map(topicDoc => ({ id: topicDoc.id, ...topicDoc.data() } as Topic)),
                        } as EnrichedUnit;
                    })
                );
                
                const enrichedCourse: EnrichedCourse = {
                    ...course,
                    className: course.classId ? classMap.get(course.classId) : 'Genel',
                    units: units,
                };
                
                let courseTitle = enrichedCourse.title;
                if (courseTitle.toUpperCase() === 'DKAB') {
                    courseTitle = 'Din Kültürü ve Ahlak Bilgisi';
                } else if (courseTitle.toUpperCase() === 'SİYER') {
                    courseTitle = 'Peygamberimizin Hayatı (Siyer)';
                }

                if (!groupedByTitle[courseTitle]) {
                    groupedByTitle[courseTitle] = [];
                }
                groupedByTitle[courseTitle].push(enrichedCourse);
            }

            const finalGroups: CourseGroup[] = Object.keys(groupedByTitle).map(title => ({
                title: title,
                courses: groupedByTitle[title].sort((a,b) => (a.className || '').localeCompare(b.className || '')),
            }));

            setAllCourseGroups(JSON.parse(JSON.stringify(finalGroups)));

        } catch (error) {
            console.error("Error fetching course flow data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);
    
    const handleEditClick = (e: React.MouseEvent, topic: Topic, courseId: string, unitId: string) => {
        e.preventDefault();
        e.stopPropagation();
        router.push(`/teacher/content-creation/edit?courseId=${courseId}&unitId=${unitId}&topicId=${topic.id}`);
    };

    const handleSummaryClick = (e: React.MouseEvent, courseId: string, unitId: string, topicId: string) => {
        e.preventDefault();
        e.stopPropagation();
        router.push(`/teacher/ders-akisi/ozet/${topicId}?courseId=${courseId}&unitId=${unitId}`);
    }

    const renderCourseContent = (courseGroups: CourseGroup[]) => {
        if (isLoading) {
            return (
                <div className="flex justify-center items-center h-[50vh]">
                    <Loader2 className="h-24 w-24 animate-spin text-cyan-500" />
                </div>
            );
        }

        if (courseGroups.length === 0) {
            return (
                <div className="text-center py-32 border-4 border-dashed border-slate-800 rounded-[3rem] bg-slate-900/50">
                    <Layers className="h-32 w-32 mx-auto mb-8 text-slate-600 opacity-50" />
                    <p className="text-4xl font-bold text-slate-500">Bu bölümde gösterilecek ders materyali bulunmuyor.</p>
                </div>
            );
        }

        return (
            <Accordion type="multiple" className="w-full space-y-8">
                {courseGroups.map((group, groupIndex) => (
                    <AccordionItem value={group.title} key={group.title} className="border-none">
                        <Card className="bg-slate-900/80 backdrop-blur-xl border-2 border-white/10 shadow-2xl overflow-hidden rounded-[2.5rem]">
                            {/* Grup Başlığı */}
                            <CardHeader className="p-0 border-b border-white/5">
                                <AccordionTrigger className={cn(
                                    "text-3xl md:text-5xl font-black hover:no-underline px-8 py-8 transition-all",
                                    "text-white bg-white/5 hover:bg-white/10 data-[state=open]:bg-indigo-500/20 data-[state=open]:text-indigo-300"
                                )}>
                                    <div className="flex items-center gap-6">
                                        <div className="p-3 rounded-2xl bg-indigo-500/20">
                                            <Hash className="w-10 h-10 md:w-12 md:h-12 text-indigo-400" />
                                        </div>
                                        {group.title}
                                    </div>
                                </AccordionTrigger>
                            </CardHeader>
                            
                            <AccordionContent className="p-6 md:p-8 bg-slate-950/30">
                                <div className="space-y-6">
                                {group.courses.map((course, courseIndex) => (
                                    <div key={course.id} className="pl-6 md:pl-10 border-l-4 border-indigo-500/30">
                                            <div className="flex items-start">
                                                {/* Bağlantı Çizgisi */}
                                                <div className="w-8 h-1 bg-indigo-500/30 -ml-10 mt-10 mr-4"></div>
                                                
                                                <Accordion type="single" collapsible className="w-full">
                                                    <AccordionItem value={course.id} className="border-2 border-white/10 rounded-3xl bg-slate-900 overflow-hidden shadow-xl">
                                                        <AccordionTrigger className={cn(
                                                            "px-8 py-6 text-2xl md:text-3xl font-bold hover:no-underline transition-all",
                                                            "text-slate-200 hover:text-white hover:bg-white/5 data-[state=open]:bg-white/5 data-[state=open]:text-cyan-400"
                                                        )}>
                                                            <div className="flex items-center gap-6 w-full">
                                                                <div className="h-16 w-16 rounded-2xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-black text-2xl border-2 border-cyan-500/30">
                                                                    {course.className?.charAt(0) || 'G'}
                                                                </div>
                                                                <span className="flex-1 text-left">
                                                                    {course.className && /^\d+$/.test(course.className) 
                                                                        ? `${course.className}.Sınıf` 
                                                                        : course.className
                                                                    }
                                                                </span>
                                                            </div>
                                                        </AccordionTrigger>
                                                        <AccordionContent className="p-6 md:p-8 bg-black/20">
                                                            <div className="space-y-6">
                                                                {course.units.map((unit, unitIndex) => (
                                                                    <Accordion key={unit.id} type="multiple" className="w-full">
                                                                        <AccordionItem value={unit.id} className="border-2 border-white/5 rounded-2xl bg-slate-900/50 overflow-hidden">
                                                                                <AccordionTrigger className={cn(
                                                                                    "px-6 py-5 text-xl md:text-2xl font-bold hover:no-underline transition-colors",
                                                                                    "text-slate-400 hover:text-white hover:bg-white/5"
                                                                                )}>
                                                                                    <span className="flex items-center gap-4">
                                                                                        <div className="p-2 bg-white/5 rounded-lg">
                                                                                            <Book className="w-6 h-6 text-slate-500" />
                                                                                        </div>
                                                                                        {unit.title}
                                                                                    </span>
                                                                                </AccordionTrigger>
                                                                                <AccordionContent className="p-6 bg-black/20">
                                                                                    {unit.topics.length > 0 ? (
                                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                                                                            {unit.topics.map((topic, topicIndex) => {
                                                                                                const isLink = topic.externalLink;
                                                                                                const hasStudentContent = (topic.steps?.length || 0) > 0;
                                                                                                const presentationUrl = `/teacher/presentation?courseId=${course.id}&unitId=${unit.id}&topicId=${topic.id}&courseName=${encodeURIComponent(course.title)}&unitName=${encodeURIComponent(unit.title)}`;
                                                                                                
                                                                                                const neonClass = colorClasses[(topicIndex + unitIndex + 2) % colorClasses.length];

                                                                                                return (
                                                                                                    <Link 
                                                                                                        key={topic.id}
                                                                                                        href={isLink ? topic.externalLink! : presentationUrl}
                                                                                                        target={isLink ? "_blank" : undefined}
                                                                                                        className={cn(
                                                                                                            "group relative w-full flex flex-col justify-center items-center text-center font-bold",
                                                                                                            "transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]",
                                                                                                            "rounded-[2rem] shadow-2xl min-h-[14rem]",
                                                                                                            "break-words whitespace-normal leading-tight p-8",
                                                                                                            neonClass
                                                                                                        )}
                                                                                                    >
                                                                                                        {/* İkon */}
                                                                                                        {isLink ? (
                                                                                                            <LinkIcon className="h-12 w-12 mb-4 opacity-70 group-hover:scale-110 transition-transform" />
                                                                                                        ) : (
                                                                                                            <GraduationCap className="h-12 w-12 mb-4 opacity-70 group-hover:scale-110 transition-transform" />
                                                                                                        )}

                                                                                                        {/* Başlık */}
                                                                                                        <span className="text-2xl md:text-3xl line-clamp-3">
                                                                                                            {topic.title}
                                                                                                        </span>

                                                                                                        {/* Action Buttons Overlay - Sabit Sağ Üst */}
                                                                                                        <div className={cn(
                                                                                                            "absolute top-4 right-4 flex gap-2 z-20",
                                                                                                            "transition-all duration-300 ease-in-out",
                                                                                                            
                                                                                                            // MOBİL (< 768px): Her zaman görünür ve yerinde
                                                                                                            "opacity-100 visible translate-y-0", 
                                                                                                            
                                                                                                            // MASAÜSTÜ (>= 768px): Başlangıçta Görünmez ve Gizli
                                                                                                            "md:opacity-0 md:invisible md:-translate-y-2",
                                                                                                            
                                                                                                            // MASAÜSTÜ HOVER: Görünür, Visible ve Yerine Gelir
                                                                                                            "md:group-hover:opacity-100 md:group-hover:visible md:group-hover:translate-y-0"
                                                                                                        )}>
                                                                                                            {hasStudentContent && !isLink && (
                                                                                                                <div 
                                                                                                                    onClick={(e) => {
                                                                                                                        e.preventDefault();
                                                                                                                        e.stopPropagation();
                                                                                                                        window.open(`/student/ders/${course.id}?topicId=${topic.id}`, '_blank');
                                                                                                                    }}
                                                                                                                    className="h-12 w-12 flex items-center justify-center rounded-xl bg-black/60 hover:bg-emerald-600 text-white border-2 border-white/20 backdrop-blur-md shadow-xl transition-all cursor-pointer"
                                                                                                                    title="Öğrenci Görünümü"
                                                                                                                >
                                                                                                                    <BookOpen className="h-6 w-6" />
                                                                                                                </div>
                                                                                                            )}
                                                                                                            <div 
                                                                                                                onClick={(e) => handleEditClick(e, topic, course.id, unit.id)}
                                                                                                                className="h-12 w-12 flex items-center justify-center rounded-xl bg-black/60 hover:bg-amber-600 text-white border-2 border-white/20 backdrop-blur-md shadow-xl transition-all cursor-pointer"
                                                                                                                title="Düzenle"
                                                                                                            >
                                                                                                                <FilePenLine className="h-6 w-6" />
                                                                                                            </div>
                                                                                                            <div 
                                                                                                                onClick={(e) => handleSummaryClick(e, course.id, unit.id, topic.id)}
                                                                                                                className="h-12 w-12 flex items-center justify-center rounded-xl bg-black/60 hover:bg-purple-600 text-white border-2 border-white/20 backdrop-blur-md shadow-xl transition-all cursor-pointer"
                                                                                                                title="Özet"
                                                                                                            >
                                                                                                                <Columns className="h-6 w-6" />
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </Link>
                                                                                                );
                                                                                            })}
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="text-xl text-slate-500 italic p-8 text-center border-4 border-dashed border-slate-800 rounded-3xl">
                                                                                            Bu üniteye henüz konu eklenmemiş.
                                                                                        </div>
                                                                                    )}
                                                                                </AccordionContent>
                                                                        </AccordionItem>
                                                                    </Accordion>
                                                                ))}
                                                            </div>
                                                        </AccordionContent>
                                                    </AccordionItem>
                                                </Accordion>
                                            </div>
                                    </div>
                                ))}
                                </div>
                            </AccordionContent>
                        </Card>
                    </AccordionItem>
                ))}
            </Accordion>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-6 md:p-10 relative overflow-hidden">
            
            {/* Arka Plan Efektleri */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-indigo-900/10 rounded-full blur-[200px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-cyan-900/10 rounded-full blur-[200px]" />
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]" />
            </div>

            <div className="max-w-[95%] mx-auto relative z-10 space-y-12">
                
                 {/* Header */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="text-center md:text-left">
                        <h1 className="text-6xl md:text-8xl font-black text-white tracking-tight uppercase drop-shadow-2xl">
                            Ders Akışı
                        </h1>
                        <p className="text-slate-400 text-xl md:text-2xl font-medium max-w-3xl mt-4">
                            Akıllı tahta modu devrede. Müfredat ve konuları buradan yönetin.
                        </p>
                    </div>
                     <Button asChild variant="outline" className="border-white/10 text-slate-300 hover:text-white h-14 px-8 rounded-xl text-lg bg-slate-900/50 backdrop-blur-md">
                        <Link href="/teacher">
                            <Home className="mr-2 h-5 w-5" /> Ana Panele Dön
                        </Link>
                    </Button>
                </div>

                {/* İçerik */}
                {renderCourseContent(allCourseGroups)}
            </div>
        </div>
    );
}

