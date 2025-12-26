
'use client';

import { useState, useEffect, useMemo, useCallback } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
    CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Loader2,
    Book,
    Library,
    ListTodo,
    Users,
    FileJson,
    ArrowLeft
} from "lucide-react";
import Link from 'next/link';

import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Course, Unit, Topic, SchoolClass } from "@/lib/types";

import { SelectionGrid } from "@/components/selection-grid";
import { getStaticActivityData, saveStaticActivityData } from "./actions";
import { StaticDataEditor } from "@/components/static-data-editor";

const steps = [
  { id: 1, name: "Sınıf", icon: <Users className="h-5 w-5" /> },
  { id: 2, name: "Ders", icon: <Book className="h-5 w-5" /> },
  { id: 3, name: "Ünite", icon: <Library className="h-5 w-5" /> },
  { id: 4, name: "Konu", icon: <ListTodo className="h-5 w-5" /> },
];

export default function StaticDataEditorPage() {
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    
    const [allClasses, setAllClasses] = useState<SchoolClass[]>([]);
    const [allCourses, setAllCourses] = useState<Course[]>([]);
    
    const [courses, setCourses] = useState<Course[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);
    
    const [selection, setSelection] = useState({
        classId: "",
        courseId: "",
        unitId: "",
        topicId: "",
        topicName: "",
    });

    const [activeData, setActiveData] = useState<any[] | null>(null);
    const [isDataLoading, setIsDataLoading] = useState(false);

    useEffect(() => {
        const fetchInitialData = async () => {
            setIsLoading(true);
            try {
                const [coursesSnapshot, classesSnapshot] = await Promise.all([
                    getDocs(query(collection(db, "courses"), orderBy("title"))),
                    getDocs(query(collection(db, "classes"), orderBy("createdAt", "asc")))
                ]);
                setAllCourses(coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course)));
                setAllClasses(classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass)));
            } catch (error) {
                console.error("Error fetching initial data: ", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
            setActiveData(null); // Go back to selection
            if (currentStep === 2) setSelection(s => ({...s, classId: ''}));
            if (currentStep === 3) setSelection(s => ({...s, courseId: ''}));
            if (currentStep === 4) setSelection(s => ({...s, unitId: ''}));
        }
    };

    const handleSelectClass = async (classId: string) => {
        setSelection(prev => ({ ...prev, classId, courseId: '', unitId: '', topicId: '' }));
        const firstClassId = allClasses.length > 0 ? allClasses[0].id : null;
        const isFirstClass = classId === firstClassId;
        const applicableCourses = allCourses.filter(course => course.classId === classId || (!course.classId && isFirstClass));
        setCourses(applicableCourses);
        setUnits([]);
        setTopics([]);
        setCurrentStep(2);
    };

    const handleSelectCourse = async (courseId: string) => {
        setSelection(prev => ({ ...prev, courseId, unitId: '', topicId: '' }));
        setIsDataLoading(true);
        const unitsRef = collection(db, `courses/${courseId}/units`);
        const q = query(unitsRef, orderBy("title"));
        const unitsSnapshot = await getDocs(q);
        setUnits(unitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Unit)));
        setTopics([]);
        setIsDataLoading(false);
        setCurrentStep(3);
    };

    const handleSelectUnit = async (unitId: string) => {
        setSelection(prev => ({ ...prev, unitId, topicId: '' }));
        setIsDataLoading(true);
        const topicsRef = collection(db, `courses/${selection.courseId}/units/${unitId}/topics`);
        const q = query(topicsRef, orderBy("title"));
        const topicsSnapshot = await getDocs(q);
        setTopics(topicsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Topic)));
        setIsDataLoading(false);
        setCurrentStep(4);
    };
    
    const handleSelectTopic = async (topicId: string, topicName: string) => {
        setSelection(prev => ({ ...prev, topicId, topicName }));
        setIsDataLoading(true);
        const result = await getStaticActivityData(topicId);
        if (result.success) {
            setActiveData(result.data || []);
        } else {
            // If file doesn't exist, start with an empty array
            setActiveData([]);
        }
        setIsDataLoading(false);
    };

    if (activeData !== null) {
        return <StaticDataEditor 
                    topicName={selection.topicName} 
                    topicId={selection.topicId} 
                    initialData={activeData} 
                    onBack={() => {
                        setActiveData(null); // Go back to topic selection
                        setSelection(prev => ({...prev, topicId: '', topicName: ''}));
                    }}
                    saveAction={saveStaticActivityData}
                />
    }

    const renderContent = () => {
        if (isLoading) {
            return <div className="flex h-64 items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-purple-400"/></div>
        }

        switch(currentStep) {
            case 1: return <SelectionGrid items={allClasses} onSelect={handleSelectClass} titleKey="name" isLoading={isLoading} />;
            case 2: return <SelectionGrid items={courses} onSelect={handleSelectCourse} titleKey="title" isLoading={isDataLoading} />;
            case 3: return <SelectionGrid items={units} onSelect={handleSelectUnit} disabled={!selection.courseId} titleKey="title" isLoading={isDataLoading} />;
            case 4: return <SelectionGrid items={topics} onSelect={handleSelectTopic} disabled={!selection.unitId} titleKey="title" isLoading={isDataLoading} />;
            default: return null;
        }
    }
    
    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-4 sm:p-6 md:p-8 relative overflow-hidden">
            <div className="max-w-5xl mx-auto w-full relative z-10 space-y-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black font-headline text-white tracking-tight uppercase drop-shadow-lg flex items-center justify-center gap-3">
                        <FileJson className="h-8 w-8 text-purple-400"/> Statik Veri Editörü
                    </h1>
                    <p className="text-slate-400 mt-1">Oyun ve etkinlikler için kullanılan statik JSON dosyalarını düzenleyin.</p>
                </div>
                
                <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl">
                    <CardHeader className="border-b border-white/5 pb-4">
                        <CardTitle className="text-xl text-white">{steps.find(s => s.id === currentStep)?.name} Seçimi</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow flex justify-center items-start p-6 min-h-[400px]">
                        {renderContent()}
                    </CardContent>
                    <CardFooter className="flex justify-between p-6 border-t border-white/5 bg-slate-900/50">
                        {currentStep > 1 ? (
                            <Button variant="ghost" onClick={handleBack} className="text-slate-400 hover:text-white hover:bg-white/10"><ArrowLeft className="mr-2 h-4 w-4" /> Geri</Button>
                        ) : <div></div>}
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
}
