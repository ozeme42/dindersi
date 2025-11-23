

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Book, Library, ListTodo, Columns, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Course, Unit, Topic, SchoolClass } from "@/lib/types";
import { SelectionGrid } from "@/components/selection-grid";
import { Loader2 } from "lucide-react";

const steps = [
  { id: 1, name: "Sınıf Seçimi", icon: <Users className="h-5 w-5" /> },
  { id: 2, name: "Ders Seçimi", icon: <Book className="h-5 w-5" /> },
  { id: 3, name: "Ünite Seçimi", icon: <Library className="h-5 w-5" /> },
  { id: 4, name: "Konu Seçimi", icon: <ListTodo className="h-5 w-5" /> },
];

export default function YazilacaklarSetupPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  
  const [selection, setSelection] = useState({
    classId: "",
    courseId: "",
    unitId: "",
    topicId: "",
  });
  
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const [coursesSnapshot, classesSnapshot] = await Promise.all([
          getDocs(query(collection(db, "courses"), orderBy("title"))),
          getDocs(query(collection(db, "classes"), orderBy("createdAt", "asc")))
        ]);
        setAllCourses(coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course)));
        setClasses(classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass)));
      } catch (error) {
        console.error("Error fetching initial data: ", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const handleNext = () => currentStep < steps.length && setCurrentStep(currentStep + 1);
  const handleBack = () => {
    if (currentStep > 1) {
        if (currentStep === 2) setSelection(s => ({...s, classId: ''}));
        if (currentStep === 3) setSelection(s => ({...s, courseId: ''}));
        if (currentStep === 4) setSelection(s => ({...s, unitId: ''}));
        setCurrentStep(currentStep - 1);
    }
  };

  const handleSelectClass = (classId: string) => {
    setSelection(prev => ({ ...prev, classId, courseId: '', unitId: '', topicId: '' }));
    
    const firstClassId = classes.length > 0 ? classes[0].id : null;
    const isFirstClass = classId === firstClassId;
    const applicableCourses = allCourses.filter(course => course.isSummerSchool !== true && (course.classId === classId || (!course.classId && isFirstClass)));
    setCourses(applicableCourses);
    setUnits([]);
    setTopics([]);
    handleNext();
  };

  const handleSelectCourse = async (courseId: string) => {
    setSelection(prev => ({ ...prev, courseId, unitId: '', topicId: '' }));
    setIsLoading(true);
    const unitsRef = collection(db, `courses/${courseId}/units`);
    const q = query(unitsRef, orderBy("title"));
    const unitsSnapshot = await getDocs(q);
    setUnits(unitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Unit)));
    setTopics([]);
    setIsLoading(false);
    handleNext();
  };

  const handleSelectUnit = async (unitId: string) => {
    setSelection(prev => ({ ...prev, unitId, topicId: '' }));
    setIsLoading(true);
    const topicsRef = collection(db, `courses/${selection.courseId}/units/${unitId}/topics`);
    const q = query(topicsRef, orderBy("title"));
    const topicsSnapshot = await getDocs(q);
    setTopics(topicsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Topic)));
    setIsLoading(false);
    handleNext();
  };
  
  const handleSelectTopic = (topicId: string) => {
     router.push(`/teacher/smartboard/yazilacaklar/oyun?courseId=${selection.courseId}&unitId=${selection.unitId}&topicId=${topicId}`);
  };
  
  const renderContent = () => {
    if (isLoading && currentStep > 1) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin"/></div>
    }
    
    switch(currentStep) {
        case 1:
            return <SelectionGrid items={classes} selectedId={selection.classId} onSelect={handleSelectClass} titleKey="name" isLoading={isLoading} />;
        case 2:
            return <SelectionGrid items={courses} selectedId={selection.courseId} onSelect={handleSelectCourse} titleKey="title" isLoading={isLoading} />;
        case 3:
            return <SelectionGrid items={units} selectedId={selection.unitId} onSelect={handleSelectUnit} disabled={!selection.courseId} titleKey="title" isLoading={isLoading} />;
        case 4:
            return <SelectionGrid items={topics} selectedId={selection.topicId} onSelect={handleSelectTopic} disabled={!selection.unitId} titleKey="title" isLoading={isLoading} />;
        default:
            return null;
     }
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold font-headline">Yazılacaklar</h1>
          <p className="text-muted-foreground">İçeriği tahtada göstermek için bir konu seçin.</p>
        </div>

        <div className="flex justify-center items-center mb-8 px-4">
          <ol className="flex items-center w-full max-w-lg">
            {steps.map((step, index) => (
              <li key={step.id} className={cn("flex w-full items-center", { "after:content-[''] after:w-full after:h-1 after:border-b after:border-border after:border-2 after:inline-block": step.id !== steps.length })}>
                <span className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full lg:h-12 lg:w-12 shrink-0 transition-colors duration-300",
                  currentStep > step.id ? "bg-primary text-primary-foreground" :
                  currentStep === step.id ? "bg-accent text-accent-foreground scale-110" :
                  "bg-muted text-muted-foreground"
                )}>
                  {step.icon}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <Card className="min-h-[400px]">
          <CardHeader>
            <CardTitle>{steps.find(s => s.id === currentStep)?.name}</CardTitle>
          </CardHeader>
          <CardContent className="min-h-[250px] flex justify-center items-center">
             {renderContent()}
          </CardContent>
          <CardFooter className="flex justify-between pt-6">
            {currentStep === 1 ? (
                <Button asChild variant="outline">
                    <Link href="/teacher/smartboard"><ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön</Link>
                </Button>
            ) : (
                <Button variant="outline" onClick={handleBack}><ArrowLeft className="mr-2 h-4 w-4" /> Geri</Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
