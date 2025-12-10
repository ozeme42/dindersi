'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Trophy, Loader2, User, Medal, ArrowUpDown, AlertCircle } from 'lucide-react';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Firebase
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { getStudentAnalysis } from './actions';

// Types
import type { SchoolClass, StudentAnalysisData } from './actions';

export default function StudentAnalysisPage() {
    // State
    const [allClasses, setAllClasses] = useState<SchoolClass[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedBranch, setSelectedBranch] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    
    const [students, setStudents] = useState<StudentAnalysisData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isPageLoading, setIsPageLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 1. Sayfa Yüklendiğinde Sınıfları Çek
    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const classesSnap = await getDocs(query(collection(db, 'classes'), orderBy('name')));
                const classes = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
                setAllClasses(classes);
            } catch (error) {
                console.error("Sınıflar çekilemedi:", error);
            } finally {
                setIsPageLoading(false);
            }
        };
        fetchClasses();
    }, []);

    // 2. Filtreler Değiştiğinde Verileri Çek
    useEffect(() => {
        const fetchStudentsAndScores = async () => {
            if (!selectedClassId || !selectedBranch) {
                setStudents([]);
                return;
            }

            setIsLoading(true);
            setError(null);
            
            const result = await getStudentAnalysis(selectedClassId, selectedBranch);
            
            if (result.success && result.data) {
                // Puana göre sırala
                const sortedStudents = result.data.sort((a, b) => b.average - a.average);
                setStudents(sortedStudents);
            } else {
                setError(result.error || "Öğrenci verileri alınamadı.");
                setStudents([]);
            }
            setIsLoading(false);
        };

        if (selectedClassId && selectedBranch) {
            fetchStudentsAndScores();
        }
    }, [selectedClassId, selectedBranch]);

    const selectedClass = useMemo(() => allClasses.find(c => c.id === selectedClassId), [allClasses, selectedClassId]);

    // Arama Filtrelemesi
    const filteredStudents = useMemo(() => {
        return students.filter(s => 
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (s.studentNumber && s.studentNumber.includes(searchTerm))
        );
    }, [students, searchTerm]);

    const getSuccessColor = (score: number, count: number) => {
        if (count === 0) return 'text-slate-500 bg-slate-700';
        if (score >= 85) return 'text-emerald-400 bg-emerald-500';
        if (score >= 70) return 'text-yellow-400 bg-yellow-500';
        if (score >= 50) return 'text-orange-400 bg-orange-500';
        return 'text-red-400 bg-red-500';
    };

    if (isPageLoading) {
        return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="h-10 w-10 text-emerald-500 animate-spin"/></div>;
    }

    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-4 sm:p-6 md:p-8 relative overflow-hidden">
            {/* Arka Plan */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-emerald-900/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-blue-900/10 rounded-full blur-[150px]" />
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10 space-y-6">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
                    <div>
                        <Link href="/teacher/scales" className="inline-flex items-center text-slate-400 hover:text-white transition-colors mb-2 text-sm">
                            <ArrowLeft className="h-4 w-4 mr-1" /> Ölçeklere Dön
                        </Link>
                        <h1 className="text-3xl md:text-4xl font-black text-white flex items-center gap-3">
                            <Trophy className="text-emerald-400 h-8 w-8"/> Öğrenci Başarı Analizi
                        </h1>
                    </div>
                </div>

                {/* Filtreler */}
                <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-xl">
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label className="text-slate-300">Sınıf Seçimi</Label>
                                <Select value={selectedClassId} onValueChange={(value) => { setSelectedClassId(value); setSelectedBranch(''); }}>
                                    <SelectTrigger className="bg-slate-950 border-white/10 text-white h-12"><SelectValue placeholder="Sınıf Seçin..."/></SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                                        {allClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-300">Şube Seçimi</Label>
                                <Select value={selectedBranch} onValueChange={setSelectedBranch} disabled={!selectedClass}>
                                    <SelectTrigger className="bg-slate-950 border-white/10 text-white h-12"><SelectValue placeholder="Şube Seçin..." /></SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                                        <SelectItem value="all">Tüm Şubeler</SelectItem>
                                        {selectedClass?.branches?.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-300">Öğrenci Ara</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-500" />
                                    <Input 
                                        placeholder="İsim veya numara..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 bg-slate-950 border-white/10 text-white h-12"
                                        disabled={!selectedClassId || !selectedBranch}
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                {/* Hata Mesajı */}
                {error && (
                    <Alert className="bg-orange-500/10 border-orange-500/20 text-orange-200">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Veri Yüklenemedi</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* Tablo Alanı */}
                <Card className="bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden min-h-[400px]">
                    <CardHeader className="bg-black/20 border-b border-white/5 pb-4">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-white flex items-center gap-2">
                                <User className="h-5 w-5 text-emerald-400"/> Öğrenci Listesi
                            </CardTitle>
                            {students.length > 0 && <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30">{filteredStudents.length} Öğrenci</Badge>}
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                                <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mb-3" />
                                <p>Veriler işleniyor...</p>
                            </div>
                        ) : selectedClassId && selectedBranch ? (
                            filteredStudents.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-slate-950/50">
                                            <TableRow className="border-white/5 hover:bg-transparent">
                                                <TableHead className="text-slate-400 font-bold w-16 text-center">Sıra</TableHead>
                                                <TableHead className="text-slate-400 font-bold w-24">No</TableHead>
                                                <TableHead className="text-slate-400 font-bold">Öğrenci Adı</TableHead>
                                                <TableHead className="text-slate-400 font-bold w-24 text-center">Şube</TableHead>
                                                <TableHead className="text-slate-400 font-bold w-48">Başarı Durumu</TableHead>
                                                <TableHead className="text-slate-400 font-bold w-32 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        Ortalama <ArrowUpDown className="h-3 w-3 opacity-50" />
                                                    </div>
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredStudents.map((student, index) => {
                                                const colorClass = getSuccessColor(student.average, student.completedScales);
                                                const barColor = colorClass.split(' ')[1];
                                                const textColor = colorClass.split(' ')[0];

                                                return (
                                                    <TableRow key={student.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                                                        <TableCell className="text-center font-mono text-slate-500 font-bold group-hover:text-white">
                                                            {index < 3 ? <Medal className={cn("h-5 w-5 mx-auto", index === 0 ? "text-yellow-400" : index === 1 ? "text-slate-300" : "text-amber-600")} /> : index + 1}
                                                        </TableCell>
                                                        <TableCell className="font-mono text-slate-400">{student.studentNumber}</TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center border border-white/10 text-slate-300">
                                                                    <User className="h-4 w-4" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-slate-200 group-hover:text-emerald-300 transition-colors">{student.name}</p>
                                                                    <p className="text-[10px] text-slate-500">{student.completedScales > 0 ? `${student.completedScales} değerlendirme` : 'Henüz not yok'}</p>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge variant="outline" className="bg-slate-950 border-white/10 text-slate-400">{student.branch}</Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="w-full">
                                                                <Progress value={student.completedScales > 0 ? student.average : 0} className="h-2.5 bg-slate-950" indicatorClassName={student.completedScales > 0 ? barColor.replace('bg-', '') : 'bg-slate-700'} />
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className={cn("text-xl font-black", student.completedScales > 0 ? textColor : 'text-slate-600')}>
                                                                {student.completedScales > 0 ? student.average : '-'}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                 <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                                     <User className="h-12 w-12 mb-4 opacity-50 text-slate-600" />
                                     <h3 className="text-lg font-bold text-slate-400">Öğrenci Bulunamadı</h3>
                                     <p className="text-sm">Seçilen kriterlere uygun öğrenci yok.</p>
                                 </div>
                            )
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                                <Search className="h-12 w-12 mb-4 opacity-50 text-slate-600" />
                                <h3 className="text-lg font-bold text-slate-400">Analiz için Seçim Yapın</h3>
                                <p className="text-sm">Lütfen yukarıdaki filtrelerden bir sınıf ve şube seçin.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
