'use client';

import { useState, useEffect } from 'react';
import { Workflow, Loader2, FilePenLine, Link as LinkIcon, BookOpen, Columns, Layers, ChevronRight, Hash } from "lucide-react";
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
// Yapıyı bozmadan sadece görsel sınıfları değiştirdik.
const colorClasses = [
    'bg-blue-950/40 border-2 border-blue-500/30 hover:border-blue-400 hover:bg-blue-900/60 text-blue-100 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]',
    'bg-emerald-950/40 border-2 border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-900/60 text-emerald-100 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]',
    'bg-purple-950/40 border-2 border-purple-500/30 hover:border-purple-400 hover:bg-purple-900/60 text-purple-100 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]',
    'bg-rose-950/40 border-2 border-rose-500/30 hover:border-rose-400 hover:bg-rose-900/60 text-rose-100 hover:shadow-[0_0_20px_rgba(244,63,94,0.3)]',
    'bg-amber-950/40 border-2 border-amber-500/30 hover:border-amber-400 hover:bg-amber-900/60 text-amber-100 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]',
    'bg-indigo-950/40 border-2 border-indigo-500/30 hover:border-indigo-400 hover:bg-indigo-900/60 text-indigo-100 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]',
    'bg-teal-950/40 border-2 border-teal-500/30 hover:border-teal-400 hover:bg-teal-900/60 text-teal-100 hover:shadow-[0_0_20px_rgba(20,184,166,0.3)]',
    'bg-cyan-950/40 border-2 border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-900/60 text-cyan-100 hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]',
    'bg-pink-950/40 border-2 border-pink-500/30 hover:border-pink-400 hover:bg-pink-900/60 text-pink-100 hover:shadow-[0_0_20px_rgba(236,72,153,0.3)]',
    'bg-orange-950/40 border-2 border-orange-500/30 hover:border-orange-400 hover:bg-orange-900/60 text-orange-100 hover:shadow-[0_0_20px_rgba(249,115,22,0.3)]',
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
    
    const handleEditClick = (topic: Topic, courseId: string, unitId: string) => {
        router.push(`/teacher/content-creation/edit?courseId=${courseId}&unitId=${unitId}&topicId=${topic.id}`);
    };

    const handleSummaryClick = (courseId: string, unitId: string, topicId: string) => {
        router.push(`/teacher/ders-akisi/ozet/${topicId}?courseId=${courseId}&unitId=${unitId}`);
    }

    const renderCourseContent = (courseGroups: CourseGroup[]) => {
        if (isLoading) {
            return (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-16 w-16 animate-spin text-cyan-500" />
                </div>
            );
        }

        if (courseGroups.length === 0) {
            return (
                <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/50">
                    <Layers className="h-16 w-16 mx-auto mb-4 text-slate-600 opacity-50" />
                    <p className="text-xl font-bold text-slate-500">Bu bölümde gösterilecek ders materyali bulunmuyor.</p>
                </div>
            );
        }

        return (
            <Accordion type="multiple" className="w-full space-y-6">
                {courseGroups.map((group, groupIndex) => (
                    <AccordionItem value={group.title} key={group.title} className="border-none">
                        <Card className="bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden rounded-3xl">
                            {/* Grup Başlığı */}
                            <CardHeader className="p-0 border-b border-white/5">
                                <AccordionTrigger className={cn(
                                    "text-2xl md:text-3xl font-black hover:no-underline px-6 py-5 transition-all",
                                    "text-white bg-white/5 hover:bg-white/10 data-[state=open]:bg-indigo-500/20 data-[state=open]:text-indigo-300"
                                )}>
                                    <div className="flex items-center gap-3">
                                        <Hash className="w-6 h-6 text-indigo-500" />
                                        {group.title}
                                    </div>
                                </AccordionTrigger>
                            </CardHeader>
                            
                            <AccordionContent className="p-4 sm:p-6 bg-slate-950/50">
                                <div className="space-y-4">
                                {group.courses.map((course, courseIndex) => (
                                    <div key={course.id} className="pl-4 border-l-2 border-indigo-500/30">
                                        <div className="flex items-center">
                                            {/* Bağlantı Çizgisi */}
                                            <div className="w-4 h-0.5 bg-indigo-500/30 -ml-4 mr-3"></div>
                                            
                                            <Accordion type="single" collapsible className="w-full">
                                                <AccordionItem value={course.id} className="border border-white/10 rounded-xl bg-slate-900 overflow-hidden shadow-lg">
                                                    <AccordionTrigger className={cn(
                                                        "px-5 py-4 text-xl font-bold hover:no-underline transition-all",
                                                        "text-slate-200 hover:text-white hover:bg-white/5 data-[state=open]:bg-white/5 data-[state=open]:text-indigo-400"
                                                    )}>
                                                        <div className="flex items-center gap-4 w-full">
                                                            <div className="h-8 w-8 rounded bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold border border-indigo-500/30">
                                                                {course.className?.charAt(0) || 'G'}
                                                            </div>
                                                            <span className="flex-1 text-left">{course.className}</span>
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="p-4 bg-black/20">
                                                        <div className="space-y-3">
                                                            {course.units.map((unit, unitIndex) => (
                                                                <Accordion key={unit.id} type="multiple" className="w-full">
                                                                    <AccordionItem value={unit.id} className="border border-white/5 rounded-lg bg-slate-900/50 overflow-hidden">
                                                                        <AccordionTrigger className={cn(
                                                                            "px-4 py-3 text-lg font-medium hover:no-underline transition-colors",
                                                                            "text-slate-400 hover:text-white hover:bg-white/5"
                                                                        )}>
                                                                            <span className="flex items-center gap-2">
                                                                                <ChevronRight className="w-4 h-4 text-slate-500" />
                                                                                {unit.title}
                                                                            </span>
                                                                        </AccordionTrigger>
                                                                        <AccordionContent className="p-4 bg-black/20">
                                                                            {unit.topics.length > 0 ? (
                                                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                                                                    {unit.topics.map((topic, topicIndex) => {
                                                                                        const isLink = topic.externalLink;
                                                                                        const hasStudentContent = (topic.steps?.length || 0) > 0;
                                                                                        const presentationUrl = `/teacher/presentation?courseId=${course.id}&unitId=${unit.id}&topicId=${topic.id}&courseName=${encodeURIComponent(course.title)}&unitName=${encodeURIComponent(unit.title)}`;
                                                                                        
                                                                                        const neonClass = colorClasses[(topicIndex + unitIndex + 2) % colorClasses.length];

                                                                                        return (
                                                                                            <div key={topic.id} className="relative group h-32">
                                                                                                <Button
                                                                                                    asChild
                                                                                                    className={cn(
                                                                                                        "w-full h-full p-4 flex flex-col justify-center items-center text-center font-bold",
                                                                                                        "transition-all duration-300 hover:-translate-y-1 active:translate-y-0",
                                                                                                        "rounded-xl shadow-lg",
                                                                                                        "break-words whitespace-normal text-sm leading-snug",
                                                                                                        neonClass
                                                                                                    )}
                                                                                                >
                                                                                                    {isLink ? (
                                                                                                        <Link href={topic.externalLink!} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center gap-2 h-full w-full">
                                                                                                            <LinkIcon className="h-5 w-5 mb-1 opacity-70" />
                                                                                                            {topic.title}
                                                                                                        </Link>
                                                                                                    ) : (
                                                                                                        <Link href={presentationUrl} className="flex flex-col items-center justify-center h-full w-full">
                                                                                                            <span className="line-clamp-3">{topic.title}</span>
                                                                                                        </Link>
                                                                                                    )}
                                                                                                </Button>
                                                                                                
                                                                                                {/* Action Buttons Overlay */}
                                                                                                <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                                                                                                    {hasStudentContent && !isLink && (
                                                                                                        <Button asChild size="icon" className="h-8 w-8 rounded-lg bg-black/60 hover:bg-black/90 text-white border border-white/20 backdrop-blur-sm shadow-xl" title="Öğrenci Görünümü">
                                                                                                            <Link href={`/student/ders/${course.id}?topicId=${topic.id}`}>
                                                                                                                <BookOpen className="h-4 w-4" />
                                                                                                            </Link>
                                                                                                        </Button>
                                                                                                    )}
                                                                                                    <Button 
                                                                                                        size="icon" 
                                                                                                        className="h-8 w-8 rounded-lg bg-black/60 hover:bg-black/90 text-white border border-white/20 backdrop-blur-sm shadow-xl"
                                                                                                        onClick={() => handleEditClick(topic, course.id, unit.id)}
                                                                                                        title="Düzenle"
                                                                                                    >
                                                                                                        <FilePenLine className="h-4 w-4" />
                                                                                                    </Button>
                                                                                                    <Button 
                                                                                                        size="icon" 
                                                                                                        className="h-8 w-8 rounded-lg bg-black/60 hover:bg-black/90 text-white border border-white/20 backdrop-blur-sm shadow-xl"
                                                                                                        onClick={() => handleSummaryClick(course.id, unit.id, topic.id)}
                                                                                                        title="Özet"
                                                                                                    >
                                                                                                        <Columns className="h-4 w-4" />
                                                                                                    </Button>
                                                                                                </div>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            ) : (
                                                                                <div className="text-sm text-slate-600 italic p-4 text-center border-2 border-dashed border-slate-800 rounded-xl">
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
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-4 sm:p-6 md:p-8 relative overflow-hidden">
            
            {/* Arka Plan Efektleri */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-indigo-900/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-cyan-900/10 rounded-full blur-[150px]" />
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10 space-y-8">
                
                {/* Header */}
                <div className="text-center space-y-4 py-8">
                    <div className="inline-flex items-center justify-center p-4 bg-slate-900 border border-white/10 rounded-full shadow-2xl shadow-indigo-900/20 mb-2">
                        <Workflow className="h-10 w-10 text-cyan-400" />
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight uppercase drop-shadow-lg">
                        Ders Akışı
                    </h1>
                    <p className="text-slate-400 text-lg max-w-2xl mx-auto font-medium">
                        Müfredat, üniteler ve konuları buradan yönetin.
                    </p>
                </div>

                {/* İçerik */}
                {renderCourseContent(allCourseGroups)}
            </div>
        </div>
    );
}