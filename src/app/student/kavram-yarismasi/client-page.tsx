
"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Book, Library, ListTodo, PartyPopper, BrainCircuit, Gamepad2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Course, Unit, Topic, SchoolClass } from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import { Loader2 } from "lucide-react";
import { SelectionGrid } from "@/components/selection-grid";

const steps = [
  { id: 1, name: "Ders Seçimi", icon: <Book className="h-5 w-5" /> },
  { id: 2, name: "Ünite Seçimi", icon: <Library className="h-5 w-5" /> },
  { id: 3, name: "Konu Seçimi", icon: <ListTodo className="h-5 w-5" /> },
  { id: 4, name: "Onay", icon: <Check className="h-5 w-5" /> },
];

export function KavramYarismaSetupClientPage() {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);

  const [selection, setSelection] = useState({
    courseId: "",
    courseName: "",
    unitId: "",
    unitName: "",
    topicId: "",
    topicName: "",
  });

  useEffect(() => {
    const fetchCourses = async () => {
      if (!user) {
        setIsLoading(true);
        return;
      }
      setIsLoading(true);
      try {
        const studentClassName = user.class?.split(' - ')[0];

        const classesQuery = query(collection(db, "classes"), orderBy("createdAt", "asc"));
        const classesSnapshot = await getDocs(classesQuery);
        const allClasses = classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
        
        const allCoursesSnapshot = await getDocs(collection(db, "courses"));
        const allCourses = allCoursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));

        let finalCourses: Course[] = [];

        if (user.role === 'teacher' || user.role === 'superadmin') {
            finalCourses = allCourses.map(course => {
                const courseClass = allClasses.find(c => c.id === course.classId);
                return {
                    ...course,
                    className: courseClass?.name ? `${courseClass.name}. Sınıf` : 'Genel'
                };
            });
        } else {
            const studentVisibleCourses = allCourses.filter(c => !c.isTeacherOnly);
            const studentClass = allClasses.find(c => studentClassName && c.name === studentClassName);
            const studentClassId = studentClass?.id;
            
            if (studentClassId) {
                finalCourses = studentVisibleCourses.filter(course =>
                    course.classId === studentClassId || !course.classId
                ).map(course => ({
                    ...course,
                    className: course.classId ? `${allClasses.find(c => c.id === course.classId)?.name}. Sınıf` : 'Genel'
                }));
            } else {
                finalCourses = studentVisibleCourses.filter(course => !course.classId).map(course => ({
                    ...course,
                    className: 'Genel'
                }));
            }
        }
        setCourses(finalCourses);
      } catch (error) {
        console.error("Error fetching filtered courses:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCourses();
  }, [user]);

  const handleSelectCourse = async (courseId: string, courseName: string) => {
    setSelection({ ...selection, courseId, courseName, unitId: '', unitName: '', topicId: '', topicName: '' });
    setIsDataLoading(true);
    const unitsRef = collection(db, `courses/${courseId}/units`);
    const q = query(unitsRef, orderBy("title"));
    const unitsSnapshot = await getDocs(q);
    setUnits(unitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Unit)));
    setTopics([]);
    setIsDataLoading(false);
    setCurrentStep(2);
  };

  const handleSelectUnit = async (unitId: string, unitName: string) => {
    setSelection({ ...selection, unitId, unitName, topicId: '', topicName: '' });
    if (unitId === 'all') {
      setSelection(prev => ({ ...prev, topicId: 'all', topicName: 'Tüm Konular' }));
      setTopics([]);
    } else {
        setIsDataLoading(true);
        const topicsRef = collection(db, `courses/${selection.courseId}/units/${unitId}/topics`);
        const q = query(topicsRef, orderBy("title"));
        const topicsSnapshot = await getDocs(q);
        setTopics(topicsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Topic)));
        setIsDataLoading(false);
    }
    setCurrentStep(3);
  };
  
  const handleSelectTopic = (topicId: string, topicName: string) => {
    setSelection({ ...selection, topicId, topicName });
    setCurrentStep(4);
  };

  const handleNext = () => currentStep < steps.length && setCurrentStep(currentStep + 1);
  const handleBack = () => currentStep > 1 && setCurrentStep(currentStep - 1);
  
  const getGameUrl = () => {
    const params = new URLSearchParams({
      courseId: selection.courseId,
      courseName: selection.courseName,
      unitId: selection.unitId,
      unitName: selection.unitName,
      topicId: selection.topicId,
      topicName: selection.topicName,
    });
    return `/student/kavram-yarismasi/oyun?${params.toString()}`;
  }
  
  const renderContent = () => {
    if (isLoading) return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin"/></div>;
    if (isDataLoading) return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin"/></div>;
      
    switch(currentStep) {
          case 1:
            return <SelectionGrid items={courses} selectedId={selection.courseId} onSelect={handleSelectCourse} titleKey="title" isLoading={isLoading} subtitleKey="className"/>;
          case 2:
            return <SelectionGrid items={units} selectedId={selection.unitId} onSelect={handleSelectUnit} specialOptions={[{ id: 'all', name: 'Tüm Üniteler' }]} disabled={!selection.courseId} titleKey="title" isLoading={isLoading}/>;
          case 3:
            return <SelectionGrid items={topics} selectedId={selection.topicId} onSelect={handleSelectTopic} specialOptions={[{ id: 'all', name: 'Tüm Konular' }]} disabled={!selection.unitId || selection.unitId === 'all'} titleKey="title" isLoading={isLoading}/>;
          case 4:
            return (
              <div className="space-y-4 text-center sm:text-left w-full max-w-lg">
                 <h3 className="text-xl font-semibold font-headline text-center mb-4">Oyun Özeti</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                    <p><strong>Ders:</strong></p><p>{selection.courseName}</p>
                    <p><strong>Ünite:</strong></p><p>{selection.unitName}</p>
                    <p><strong>Konu:</strong></p><p>{selection.topicName}</p>
                 </div>
              </div>
            );
          default:
            return null;
      }
  }

  return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-black">
            <div className="container mx-auto p-4 sm:p-6 md:p-8">
                <div className="max-w-4xl mx-auto">
                    <Card className="bg-white/60 dark:bg-black/60 backdrop-blur-lg border-white/20 shadow-2xl">
                        <CardHeader>
                            <div className="relative flex justify-center mb-6">
                                <div className="absolute inset-0 bg-gradient-to-b from-purple-500/20 to-transparent -translate-y-1/2 rounded-full blur-2xl"></div>
                                <div className="relative z-10 p-4 bg-white/80 dark:bg-black/80 backdrop-blur-sm rounded-full shadow-lg border border-white/30">
                                    <BrainCircuit className="h-12 w-12 text-pink-500" />
                                </div>
                            </div>
                            <CardTitle className="text-center text-3xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500 header-font">
                                Kavram Yarışması
                            </CardTitle>
                            <CardDescription className="text-center">
                                Tanımı verilen kavramı bularak puanları topla!
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="min-h-[400px]">
                            <div className="flex justify-center items-center mb-8 px-4">
                              <ol className="flex items-center w-full max-w-lg">
                                {steps.map((step, index) => (
                                  <li key={step.id} className={cn("flex w-full items-center", { "after:content-[''] after:w-full after:h-1 after:border-b after:border-pink-200 dark:after:border-pink-800 after:border-2 after:inline-block": index !== steps.length - 1 })}>
                                    <span className={cn(
                                      "flex items-center justify-center w-10 h-10 rounded-full lg:h-12 lg:w-12 shrink-0 transition-colors duration-300",
                                      currentStep > step.id ? "bg-pink-600 text-white" :
                                      currentStep === step.id ? "bg-purple-500 text-white scale-110 ring-4 ring-purple-300 dark:ring-purple-700" :
                                      "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                                    )}>
                                      {step.icon}
                                    </span>
                                  </li>
                                ))}
                              </ol>
                            </div>
                             <div className="min-h-[250px] flex items-center justify-center">
                                {renderContent()}
                            </div>
                        </CardContent>

                        <CardFooter className="flex justify-between pt-6 border-t border-black/5">
                            {currentStep === 1 ? (
                                <Button asChild variant="ghost">
                                    <Link href="/student/activities"><ArrowLeft className="mr-2 h-4 w-4" /> Etkinlikler</Link>
                                </Button>
                            ) : (
                                <Button variant="ghost" onClick={handleBack}><ArrowLeft className="mr-2 h-4 w-4" /> Geri</Button>
                            )}

                            {currentStep < steps.length ? (
                                <Button onClick={handleNext} disabled={
                                    (currentStep === 1 && !selection.courseId) ||
                                    (currentStep === 2 && !selection.unitId) ||
                                    (currentStep === 3 && !selection.topicId)
                                } className="bg-pink-500 hover:bg-pink-600 text-white">
                                    İleri <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            ) : (
                                <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
                                    <Link href={getGameUrl()}>
                                        <PartyPopper className="mr-2 h-4 w-4" /> Oyunu Başlat
                                    </Link>
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}
