

'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Workflow, Loader2, FilePenLine, Link as LinkIcon, BookOpen, Columns } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import type { Course, SchoolClass, Unit, Topic } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const colorClasses = [
    'bg-blue-600 hover:bg-blue-700',
    'bg-emerald-600 hover:bg-emerald-700',
    'bg-purple-600 hover:bg-purple-700',
    'bg-rose-600 hover:bg-rose-700',
    'bg-amber-600 hover:bg-amber-700',
    'bg-indigo-600 hover:bg-indigo-700',
    'bg-teal-600 hover:bg-teal-700',
    'bg-cyan-600 hover:bg-cyan-700',
    'bg-pink-600 hover:bg-pink-700',
    'bg-orange-600 hover:bg-orange-700',
];

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

            // Serialize the data before setting state
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
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            );
        }

        if (courseGroups.length === 0) {
            return (
                <div className="text-center py-10 text-muted-foreground">
                    Bu bölümde gösterilecek ders materyali bulunmuyor.
                </div>
            );
        }

        return (
            <Accordion type="multiple" className="w-full space-y-4">
                {courseGroups.map((group, groupIndex) => (
                    <AccordionItem value={group.title} key={group.title} className="border-b-0">
                        <Card>
                            <CardHeader className={cn("p-0 rounded-t-lg", colorClasses[groupIndex % colorClasses.length])}>
                                <AccordionTrigger className="text-3xl font-bold hover:no-underline p-6 text-primary-foreground">
                                    {group.title}
                                </AccordionTrigger>
                            </CardHeader>
                            <AccordionContent className="p-4 sm:p-6">
                                <div className="space-y-4">
                                {group.courses.map((course, courseIndex) => (
                                    <div key={course.id} className="pl-4 border-l-2 border-primary/50">
                                        <div className="flex items-center">
                                            <div className="w-4 h-px bg-primary/50 -ml-4 mr-2"></div>
                                            <Accordion type="single" collapsible className="w-full">
                                                <AccordionItem value={course.id} className="border rounded-md bg-muted/50">
                                                        <AccordionTrigger className={cn("px-4 py-3 text-2xl font-semibold hover:no-underline text-primary-foreground", colorClasses[(courseIndex + 3) % colorClasses.length])}>
                                                            <div className="flex items-center gap-4 w-full">
                                                                <span className="flex-1 text-left">{course.className}</span>
                                                            </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="p-3 bg-card">
                                                            <div className="space-y-3">
                                                            {course.units.map((unit, unitIndex) => (
                                                                <Accordion key={unit.id} type="multiple" className="w-full">
                                                                    <AccordionItem value={unit.id} className="border rounded-md bg-background">
                                                                        <AccordionTrigger className={cn("px-4 py-3 text-xl font-medium hover:no-underline text-primary-foreground", colorClasses[(unitIndex + 1) % colorClasses.length])}>
                                                                            {unit.title}
                                                                        </AccordionTrigger>
                                                                        <AccordionContent className="p-3">
                                                                            {unit.topics.length > 0 ? (
                                                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                                                                    {unit.topics.map((topic, topicIndex) => {
                                                                                        const isLink = topic.externalLink;
                                                                                        const hasStudentContent = (topic.steps?.length || 0) > 0;
                                                                                        const presentationUrl = `/teacher/presentation?courseId=${course.id}&unitId=${unit.id}&topicId=${topic.id}&courseName=${encodeURIComponent(course.title)}&unitName=${encodeURIComponent(unit.title)}`;
                                                                                        
                                                                                        return (
                                                                                            <div key={topic.id} className="relative group h-36">
                                                                                                <Button
                                                                                                    asChild
                                                                                                    className={cn(
                                                                                                        "w-full h-full p-3 justify-center items-center flex text-center font-medium",
                                                                                                        "text-primary-foreground shadow-lg transition-transform duration-200 hover:-translate-y-1",
                                                                                                        "break-words whitespace-normal text-base", // Ensure text wraps
                                                                                                        colorClasses[(topicIndex + 2) % colorClasses.length]
                                                                                                    )}
                                                                                                >
                                                                                                    {isLink ? (
                                                                                                        <Link href={topic.externalLink!} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 h-full w-full">
                                                                                                            {topic.title}
                                                                                                            <LinkIcon className="h-3 w-3" />
                                                                                                        </Link>
                                                                                                    ) : (
                                                                                                        <Link href={presentationUrl} className="flex items-center justify-center h-full w-full">
                                                                                                            {topic.title}
                                                                                                        </Link>
                                                                                                    )}
                                                                                                </Button>
                                                                                                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex flex-col gap-1">
                                                                                                    {hasStudentContent && !isLink && (
                                                                                                        <Button asChild size="icon" variant="ghost" className="h-7 w-7 text-primary-foreground/70 hover:text-primary-foreground hover:bg-black/20" title="Öğrenci Ders Akışını Görüntüle">
                                                                                                            <Link href={`/student/ders/${course.id}?topicId=${topic.id}`}>
                                                                                                                <BookOpen className="h-4 w-4" />
                                                                                                            </Link>
                                                                                                        </Button>
                                                                                                    )}
                                                                                                     <Button 
                                                                                                        size="icon" 
                                                                                                        variant="ghost" 
                                                                                                        className="h-7 w-7 text-primary-foreground/70 hover:text-primary-foreground hover:bg-black/20"
                                                                                                        onClick={() => handleSummaryClick(course.id, unit.id, topic.id)}
                                                                                                        title="Konu Özeti Oluştur"
                                                                                                    >
                                                                                                        <Columns className="h-4 w-4" />
                                                                                                    </Button>
                                                                                                    <Button 
                                                                                                        size="icon" 
                                                                                                        variant="ghost" 
                                                                                                        className="h-7 w-7 text-primary-foreground/70 hover:text-primary-foreground hover:bg-black/20"
                                                                                                        onClick={() => handleEditClick(topic, course.id, unit.id)}
                                                                                                        title="İçeriği Düzenle"
                                                                                                    >
                                                                                                        <FilePenLine className="h-4 w-4" />
                                                                                                    </Button>
                                                                                                </div>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            ) : <p className="text-sm text-muted-foreground text-center p-2">Bu ünite için konu bulunmuyor.</p>}
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
        <div className="container mx-auto p-4 sm:p-6 md:p-8">
            <div className="flex flex-col items-center text-center my-8">
                <Workflow className="h-16 w-16 text-primary mb-4" />
                <h1 className="text-4xl font-bold font-headline">Ders Akışı Yönetimi</h1>
                <p className="text-muted-foreground mt-2 max-w-2xl">
                    Derslerin, ünitelerin ve konuların akışını buradan yönetin.
                </p>
            </div>
            
             {renderCourseContent(allCourseGroups)}
        </div>
    );
}

type EnrichedUnit = Unit & { topics: Topic[] };
type EnrichedCourse = Course & { className?: string, units: EnrichedUnit[] };
type CourseGroup = {
    title: string;
    courses: EnrichedCourse[];
};
