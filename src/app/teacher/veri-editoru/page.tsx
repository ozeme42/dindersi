
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowLeft, Loader2, Book, Library, ListTodo, Users, FileJson, FileQuestion, Layers, FileText } from 'lucide-react';
import { SelectionGrid } from '@/components/selection-grid';
import { JsonDataEditor } from '@/components/json-data-editor';
import { TextDataEditor } from '@/components/text-data-editor';
import { getStaticData, saveStaticData, getStaticHtmlContent, saveStaticHtmlContent } from './actions';
import { getExamCreationData } from '@/app/teacher/exams/actions';
import type { Course, Unit, Topic, SchoolClass } from '@/lib/types';
import Link from 'next/link';

type EnrichedCourse = Course & { units: (Unit & { topics: Topic[] })[] };

const DATA_TYPES = [
    { id: 'questions', name: 'Soru Bankası (Genel)', icon: FileQuestion },
    { id: 'examQuestions', name: 'Soru Bankası (Deneme)', icon: FileQuestion },
    { id: 'activity-items', name: 'Etkinlik Verileri', icon: Layers },
    { id: 'yazilacaklar', name: 'Yazılacaklar', icon: FileText },
    { id: 'ozetler', name: 'İnteraktif Özetler (HTML)', icon: FileText },
    { id: 'flows', name: 'Ders Akışları', icon: FileText },
];

export default function VeriEditoruPage() {
    const [step, setStep] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isDataLoading, setIsDataLoading] = useState(false);
    
    // Curriculum structure data
    const [allClasses, setAllClasses] = useState<SchoolClass[]>([]);
    const [allCourses, setAllCourses] = useState<EnrichedCourse[]>([]);
    
    // Selections
    const [dataType, setDataType] = useState<string | null>(null);
    const [selection, setSelection] = useState<{
        classId?: string,
        courseId?: string,
        unitId?: string,
        topicId?: string,
    }>({});
    const [selectionName, setSelectionName] = useState<string>('');

    // Editor state
    const [activeData, setActiveData] = useState<any>(null);
    const [activeDataId, setActiveDataId] = useState<string | null>(null);
    
    useEffect(() => {
        const fetchCurriculum = async () => {
            const data = await getExamCreationData();
            if (!data.error) {
                setAllClasses(data.classes);
                setAllCourses(data.courses);
            }
            setIsLoading(false);
        };
        fetchCurriculum();
    }, []);

    const handleBack = () => {
        if (activeData !== null) {
            setActiveData(null);
            setActiveDataId(null);
            return;
        }
        if (step > 0) {
            setStep(prev => prev - 1);
        }
    };
    
    const handleDataTypeSelect = (type: string) => {
        setDataType(type);
        setStep(1);
    };

    const handleHierarchySelect = async (level: number, id: string, name: string) => {
        const newSelection = { ...selection };
        if (level === 1) { // Class
            newSelection.classId = id;
            newSelection.courseId = undefined;
            newSelection.unitId = undefined;
            newSelection.topicId = undefined;
        } else if (level === 2) { // Course
            newSelection.courseId = id;
            newSelection.unitId = undefined;
            newSelection.topicId = undefined;
        } else if (level === 3) { // Unit
            newSelection.unitId = id;
            newSelection.topicId = undefined;
        } else if (level === 4) { // Topic
            newSelection.topicId = id;
        }

        setSelection(newSelection);
        setSelectionName(name);

        const targetId = id === 'all' ? (newSelection.unitId || newSelection.courseId || '') : id;

        // Bitiş koşulları: Konu seçildiğinde veya özel "Tümü" seçeneği tıklandığında veriyi yükle.
        if (level === 4 || id === 'all') {
            setIsDataLoading(true);
            const finalDataType = (dataType === 'activity-items' && id === 'all' && newSelection.unitId) ? 'activities' : dataType;
            
            const result = dataType === 'ozetler' || dataType === 'flows'
                ? await getStaticHtmlContent(finalDataType!, targetId)
                : await getStaticData(finalDataType!, targetId);

            if (result.success) {
                setActiveData(result.data);
                setActiveDataId(targetId);
            } else {
                console.error(result.error);
                setActiveData(null); // Clear data on error
            }
            setIsDataLoading(false);
        } else {
            setStep(level + 1);
        }
    };
    
    const filteredCourses = useMemo(() => {
        if (!selection.classId || selection.classId === 'all') return allCourses;
        return allCourses.filter(c => c.classId === selection.classId || !c.classId);
    }, [selection.classId, allCourses]);

    const filteredUnits = useMemo(() => {
        if (!selection.courseId || selection.courseId === 'all') return [];
        const course = filteredCourses.find(c => c.id === selection.courseId);
        return course?.units || [];
    }, [selection.courseId, filteredCourses]);

    const filteredTopics = useMemo(() => {
        if (!selection.unitId || selection.unitId === 'all') return [];
        const unit = filteredUnits.find(u => u.id === selection.unitId);
        return unit?.topics || [];
    }, [selection.unitId, filteredUnits]);
    
    const renderContent = () => {
        if(isDataLoading || isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-purple-400"/></div>;

        if (activeData !== null && activeDataId && dataType) {
             if (dataType === 'ozetler' || dataType === 'flows') {
                return <TextDataEditor
                    fileName={`${selectionName} (${dataType})`}
                    initialContent={activeData}
                    saveAction={(content) => saveStaticHtmlContent(dataType, activeDataId, content)}
                />;
            }
            return <JsonDataEditor 
                        fileName={`${selectionName} (${dataType})`}
                        initialData={activeData}
                        saveAction={(data) => saveStaticData(dataType!, activeDataId, data)}
                   />;
        }

        switch(step) {
            case 0:
                return <SelectionGrid items={DATA_TYPES} onSelect={(id) => handleDataTypeSelect(id)} titleKey="name" isLoading={false} />;
            case 1:
                return <SelectionGrid items={allClasses} onSelect={(id, name) => handleHierarchySelect(1, id, name)} titleKey="name" isLoading={isLoading} />;
            case 2:
                const courses = allCourses.filter(c => c.classId === selection.classId || !c.classId);
                return <SelectionGrid items={courses} onSelect={(id, name) => handleHierarchySelect(2, id, name)} titleKey="title" isLoading={isLoading} />;
            case 3:
                const units = allCourses.find(c => c.id === selection.courseId)?.units || [];
                return <SelectionGrid items={units} onSelect={(id, name) => handleHierarchySelect(3, id, name)} specialOptions={[{ id: 'all', name: `Tüm Üniteler (${selection.courseId})`}]} titleKey="title" isLoading={isLoading} />;
            case 4:
                const topics = allCourses.flatMap(c => c.units).find(u => u.id === selection.unitId)?.topics || [];
                return <SelectionGrid items={topics} onSelect={(id, name) => handleHierarchySelect(4, id, name)} specialOptions={[{ id: 'all', name: `Tüm Konular (${selection.unitId})`}]} titleKey="title" isLoading={isLoading} />;
            default: return <p>Bir seçim yapın.</p>;
        }
    };
    
    return (
         <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-4 sm:p-6 md:p-8 relative overflow-hidden">
            <div className="max-w-7xl mx-auto w-full relative z-10 space-y-8">
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-black font-headline text-white tracking-tight uppercase drop-shadow-lg flex items-center justify-center gap-3">
                     <FileJson className="h-8 w-8 text-purple-400"/> Statik Veri Editörü
                  </h1>
                  <p className="text-slate-400 mt-1">Uygulamanın statik JSON dosyalarını doğrudan düzenleyin.</p>
                </div>
                
                 <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl">
                    <CardHeader className="border-b border-white/5 pb-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-xl text-white">
                                {activeData !== null ? `Düzenleniyor: ${selectionName}` : `Adım ${step}: Seçim Yapın`}
                            </CardTitle>
                            <Button variant="ghost" onClick={handleBack} className="text-slate-400 hover:text-white hover:bg-white/10"><ArrowLeft className="mr-2 h-4 w-4" /> Geri</Button>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-grow flex justify-center items-start p-6 min-h-[500px]">
                        {renderContent()}
                    </CardContent>
                </Card>
            </div>
         </div>
    );
}
