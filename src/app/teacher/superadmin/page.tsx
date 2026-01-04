
'use client';

import { useState, useEffect, useMemo, useCallback } from "react";
import { User, Download, AlertTriangle, Loader2, Book, FileQuestion, List, FileJson, Server, ClipboardList, DollarSign, Shield, Filter, Home, UserPlus, Trash2, ArrowLeft, ArrowRight, UserCog, UserCheck, MoreHorizontal, FilePenLine } from "lucide-react";
import { getStudentData } from "@/app/teacher/students/actions";
import { exportAllData, exportManifestAndContent, exportActivityData, deleteUserFromFirestore, deleteBulkUsers } from "./actions";
import type { UserProfile, SchoolClass, Course, Unit, Topic, School } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getExamCreationData } from "../exams/actions";
import Link from 'next/link';
import { UserAvatar } from "@/components/user-avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { UserEditorDialog } from "@/components/user-editor-dialog";
import { saveUser } from "@/app/teacher/students/actions";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


function downloadJson(data: any, filename: string) {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    alert("İndirilecek veri bulunamadı.");
    return;
  }
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Helper to slugify strings for filenames
const slugify = (text: string) => {
    if (!text) return '';
    const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;'
    const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------'
    const p = new RegExp(a.split('').join('|'), 'g')

    return text.toString().toLowerCase()
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(p, c => b.charAt(a.indexOf(c))) // Replace special characters
        .replace(/&/g, '-and-') // Replace & with 'and'
        .replace(/[^\w\-]+/g, '') // Remove all non-word chars
        .replace(/\-\-+/g, '-') // Replace multiple - with single -
        .replace(/^-+/, '') // Trim - from start of text
        .replace(/-+$/, '');          // Trim - from end of text
};


const UserEditorSchema = z.object({
  uid: z.string().optional(),
  displayName: z.string().min(3, "Ad Soyad en az 3 karakter olmalıdır."),
  email: z.string().optional(),
  role: z.enum(['student', 'teacher', 'superadmin', 'guest']),
  password: z.string().optional(),
  classId: z.string().nullable().optional(),
  branch: z.string().nullable().optional(),
  schoolId: z.string().nullable().optional(),
  newSchoolName: z.string().optional(),
  score: z.coerce.number().optional().default(0),
}).refine(data => {
    if (!data.uid && (!data.password || data.password.length < 6)) return false;
    if (data.uid && data.password && data.password.length > 0 && data.password.length < 6) return false;
    if(data.schoolId === 'new' && (!data.newSchoolName || data.newSchoolName.trim() === '')) return false;
    return true;
}, {
    message: "Yeni kullanıcı için şifre zorunludur ve en az 6 karakter olmalıdır. Yeni okul adı boş bırakılamaz.",
    path: ["password"],
});


export default function SuperAdminPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [isExportingStatic, setIsExportingStatic] = useState(false);
  const [exportStep, setExportStep] = useState<string | null>(null);
  
  const [allClasses, setAllClasses] = useState<SchoolClass[]>([]);
  const [allCourses, setAllCourses] = useState<(Course & { units: (Unit & { topics: Topic[] })[] })[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [filters, setFilters] = useState<{classId: string, courseId: string, unitId: string, topicId: string}>({
      classId: 'all',
      courseId: 'all',
      unitId: 'all',
      topicId: 'all',
  });
  
  const { toast } = useToast();
  
  const [dialogState, setDialogState] = useState<{isOpen: boolean; user: Partial<UserProfile> | null}>({isOpen: false, user: null});
  const [isSaving, setIsSaving] = useState(false);

  const [studentsCurrentPage, setStudentsCurrentPage] = useState(1);
  const [teachersCurrentPage, setTeachersCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [searchTerm, setSearchTerm] = useState("");


  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { students, classes, schools } = await getStudentData();
      
      setUsers(students);
      setAllClasses(classes);
      setSchools(schools);

      const curriculumData = await getExamCreationData();
      if (!curriculumData.error) {
        setAllCourses(curriculumData.courses);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast({ title: "Veri Yüklenemedi", description: "Gerekli veriler getirilirken bir hata oluştu.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const students = useMemo(() => users.filter(u => u.role === 'student' || u.role === 'guest' || u.role === 'pending'), [users]);
  const teachers = useMemo(() => users.filter(u => u.role === 'teacher'), [users]);
  
  const filteredStudents = useMemo(() => {
      return students.filter(s => s.displayName?.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [students, searchTerm]);

  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => t.displayName?.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [teachers, searchTerm]);
  
  const paginatedStudents = useMemo(() => {
      const startIndex = (studentsCurrentPage - 1) * itemsPerPage;
      return filteredStudents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredStudents, studentsCurrentPage]);

   const paginatedTeachers = useMemo(() => {
      const startIndex = (teachersCurrentPage - 1) * itemsPerPage;
      return filteredTeachers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTeachers, teachersCurrentPage]);

  const totalStudentPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const totalTeacherPages = Math.ceil(filteredTeachers.length / itemsPerPage);

  
  const handleOpenDialog = (user: Partial<UserProfile> | null = null, role: 'student' | 'teacher') => {
      const defaultUser = { role };
      setDialogState({ isOpen: true, user: user || defaultUser });
  };

  const handleSaveUser = async (data: z.infer<typeof UserEditorSchema>) => {
    setIsSaving(true);
    const fullClassName = data.classId && data.branch ? `${allClasses.find(c => c.id === data.classId)?.name} - ${data.branch}` : data.classId ? allClasses.find(c => c.id === data.classId)?.name : undefined;
    let schoolName = data.schoolId === 'new' ? data.newSchoolName : schools.find(s => s.id === data.schoolId)?.name;
    const dataToSave = { ...data, class: fullClassName, schoolName };

    const result = await saveUser(dataToSave);
    if (result.success) {
      toast({ title: "Başarılı", description: `Kullanıcı ${data.uid ? 'güncellendi' : 'oluşturuldu'}.` });
      await fetchAllData();
      setDialogState({ isOpen: false, user: null });
    } else {
      toast({ title: "Hata", description: result.error, variant: "destructive" });
    }
    setIsSaving(false);
  };
  
  const handleDeleteUser = async (userId: string) => {
    const originalUsers = [...users];
    setUsers(prev => prev.filter(s => s.uid !== userId));
    const result = await deleteBulkUsers([userId]);
    if (result.success) {
        toast({ title: "Başarılı", description: "Kullanıcı silindi." });
        await fetchAllData();
    } else {
        toast({ title: "Hata", description: result.error, variant: "destructive" });
        setUsers(originalUsers);
    }
  };


  const handleDownload = async (dataType: 'users' | 'curriculum' | 'questions' | 'examQuestions' | 'assignments' | 'scoreEvents' | 'activity-items' | 'yazilacaklar', baseFilename: string) => {
    setIsDownloading(dataType);
    
    // Create a dynamic filename based on filters
    let filenameParts = [];
    if (filters.classId && filters.classId !== 'all') {
        const className = allClasses.find(c => c.id === filters.classId)?.name || filters.classId;
        filenameParts.push(slugify(className));
    }
    
    const filename = `${filenameParts.join('_')}_${baseFilename}.json`;
    
    try {
      const data = await exportAllData(dataType, filters);
      downloadJson(data, filename);
    } catch (e: any) {
      console.error("Failed to download data:", e);
      toast({ title: "İndirme Hatası", description: `Veri indirilirken bir hata oluştu: ${e.message}`, variant: "destructive" });
    } finally {
      setIsDownloading(null);
    }
  };
  
  const handleExportStatic = async (step: 'manifest' | 'activities') => {
      setIsExportingStatic(true);
      setExportStep(step);
      try {
          const result = step === 'manifest' ? await exportManifestAndContent() : await exportActivityData();
          if (result.success) {
              toast({ title: "Başarılı", description: result.message });
          } else {
              throw new Error(result.error);
          }
      } catch(e: any) {
         console.error("Failed to export static data:", e);
         toast({ title: "Dışa Aktarma Hatası", description: `Statik site verileri oluşturulurken bir hata oluştu: ${e.message}`, variant: "destructive" });
      } finally {
        setExportStep(null);
        setIsExportingStatic(false);
      }
  }

  const dataSections = [
    { type: 'users', title: "Kullanıcılar", icon: <User className="mr-2 h-4 w-4"/>, filename: "kullanicilar" },
    { type: 'curriculum', title: "Müfredat", icon: <Book className="mr-2 h-4 w-4"/>, filename: "mufredat" },
    { type: 'questions', title: "Soru Bankası", icon: <FileQuestion className="mr-2 h-4 w-4"/>, filename: "soru_bankasi" },
    { type: 'examQuestions', title: "Deneme Soruları", icon: <Shield className="mr-2 h-4 w-4"/>, filename: "deneme_sorulari" },
    { type: 'assignments', title: "Ödevler", icon: <ClipboardList className="mr-2 h-4 w-4"/>, filename: "odevler" },
    { type: 'scoreEvents', title: "Puan Hareketleri", icon: <DollarSign className="mr-2 h-4 w-4"/>, filename: "puan_hareketleri" },
    { type: 'activity-items', title: "Etkinlik Verileri", icon: <List className="mr-2 h-4 w-4"/>, filename: "etkinlik_verileri" },
    { type: 'yazilacaklar', title: "Yazılacaklar", icon: <FileJson className="mr-2 h-4 w-4"/>, filename: "yazilacaklar" },
  ];

  if (isLoading) {
      return (
          <div className="flex h-screen w-full items-center justify-center bg-slate-950">
              <Loader2 className="h-16 w-16 animate-spin text-indigo-500" />
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
        <main className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
             <div className="flex flex-col sm:flex-row items-center justify-between text-center sm:text-left">
                <div className="flex items-center gap-4">
                    <Link href="/teacher" className="inline-block transition-transform hover:scale-110 hover:rotate-3">
                        <div className="inline-flex items-center justify-center p-4 bg-slate-900 border border-white/10 rounded-full shadow-2xl shadow-indigo-900/20">
                            <Shield className="h-10 w-10 text-indigo-400" />
                        </div>
                    </Link>
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tight">Süper Admin Paneli</h1>
                        <p className="text-slate-400 text-lg font-medium">Uygulama verilerini yönetin ve yedekleyin.</p>
                    </div>
                </div>
                <Button asChild variant="outline" className="mt-4 sm:mt-0 border-white/10 text-white hover:bg-white/5 bg-slate-900">
                    <Link href="/teacher"><Home className="mr-2 h-4 w-4"/>Panele Dön</Link>
                </Button>
            </div>
            
            <Tabs defaultValue="students">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="students">Öğrenciler</TabsTrigger>
                    <TabsTrigger value="teachers">Öğretmenler</TabsTrigger>
                </TabsList>
                
                <TabsContent value="students" className="mt-6">
                    <Card className="bg-slate-900/50 border-white/10 backdrop-blur-sm">
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-white">Öğrenci Yönetimi</CardTitle>
                                <Button onClick={() => handleOpenDialog(null, 'student')}><UserPlus className="mr-2 h-4 w-4"/> Öğrenci Ekle</Button>
                            </div>
                            <div className="pt-2"><Input placeholder="Öğrenci ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                        </CardHeader>
                        <CardContent>
                             <div className="border rounded-lg overflow-hidden border-white/10">
                                <Table>
                                    <TableHeader className="bg-slate-900/80"><TableRow className="border-white/5 hover:bg-transparent"><TableHead>Öğrenci</TableHead><TableHead>Okul</TableHead><TableHead>Sınıf</TableHead><TableHead>Puan</TableHead><TableHead className="text-right">Eylemler</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {paginatedStudents.map(student => (
                                            <TableRow key={student.uid} className="border-white/5"><TableCell><div className="flex items-center gap-3"><UserAvatar user={student} /><span className="font-medium">{student.displayName}</span></div></TableCell><TableCell><Badge variant="outline">{student.schoolName || '-'}</Badge></TableCell><TableCell><Badge variant="secondary">{student.class || 'N/A'}</Badge></TableCell><TableCell>{student.score}</TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => handleOpenDialog(student, 'student')}>Düzenle</Button><Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteUser(student.uid)}>Sil</Button></TableCell></TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                             </div>
                        </CardContent>
                        <CardFooter className="justify-between">
                            <span className="text-sm text-muted-foreground">{filteredStudents.length} öğrenci bulundu.</span>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => setStudentsCurrentPage(p => Math.max(1, p - 1))} disabled={studentsCurrentPage === 1}>Önceki</Button>
                                <span className="p-2 text-sm">{studentsCurrentPage} / {totalStudentPages}</span>
                                <Button size="sm" variant="outline" onClick={() => setStudentsCurrentPage(p => Math.min(totalStudentPages, p + 1))} disabled={studentsCurrentPage === totalStudentPages}>Sonraki</Button>
                            </div>
                        </CardFooter>
                    </Card>
                </TabsContent>
                
                <TabsContent value="teachers" className="mt-6">
                     <Card className="bg-slate-900/50 border-white/10 backdrop-blur-sm">
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-white">Öğretmen Yönetimi</CardTitle>
                                <Button onClick={() => handleOpenDialog(null, 'teacher')}><UserPlus className="mr-2 h-4 w-4"/> Öğretmen Ekle</Button>
                            </div>
                             <div className="pt-2"><Input placeholder="Öğretmen ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                        </CardHeader>
                        <CardContent>
                             <div className="border rounded-lg overflow-hidden border-white/10">
                                <Table>
                                    <TableHeader className="bg-slate-900/80"><TableRow className="border-white/5 hover:bg-transparent"><TableHead>Öğretmen</TableHead><TableHead>Okul</TableHead><TableHead className="text-right">Eylemler</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {paginatedTeachers.map(teacher => (
                                            <TableRow key={teacher.uid} className="border-white/5">
                                                <TableCell><div className="flex items-center gap-3"><UserAvatar user={teacher} /><span className="font-medium">{teacher.displayName}</span></div></TableCell>
                                                <TableCell><Badge variant="secondary">{teacher.schoolName || 'Tüm Okullar'}</Badge></TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(teacher, 'teacher')}>Düzenle</Button>
                                                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteUser(teacher.uid)}>Sil</Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                             </div>
                        </CardContent>
                         <CardFooter className="justify-between">
                            <span className="text-sm text-muted-foreground">{filteredTeachers.length} öğretmen bulundu.</span>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => setTeachersCurrentPage(p => Math.max(1, p - 1))} disabled={teachersCurrentPage === 1}>Önceki</Button>
                                <span className="p-2 text-sm">{teachersCurrentPage} / {totalTeacherPages}</span>
                                <Button size="sm" variant="outline" onClick={() => setTeachersCurrentPage(p => Math.min(totalTeacherPages, p + 1))} disabled={teachersCurrentPage === totalTeacherPages}>Sonraki</Button>
                            </div>
                        </CardFooter>
                    </Card>
                </TabsContent>
            </Tabs>

            <Card className="bg-slate-900/50 border-white/10 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-white">Veri Yedekleme</CardTitle>
                    <CardDescription className="text-slate-400">
                        Uygulamanın veritabanındaki verileri JSON formatında bilgisayarınıza indirin.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {dataSections.map(section => (
                         <Button key={section.type} variant="outline" onClick={() => handleDownload(section.type as any, section.filename)} disabled={!!isDownloading} className="justify-start bg-slate-900/50 border-white/10 hover:bg-slate-800 hover:text-white text-slate-300">
                            {isDownloading === section.type ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : section.icon}
                            {section.title}
                        </Button>
                    ))}
                </CardContent>
            </Card>
            
            <Card className="bg-slate-900/50 border-white/10 backdrop-blur-sm">
                 <CardHeader>
                    <CardTitle className="text-white">Statik Site Yönetimi</CardTitle>
                    <CardDescription className="text-slate-400">
                        Veritabanındaki güncel verileri, statik sitenin kullanabileceği ayrı dosyalara dönüştürün. Bu işlem, `public/curriculum` klasöründeki dosyaları günceller.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-4">
                    <Button onClick={() => handleExportStatic('manifest')} disabled={isExportingStatic} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20">
                        {exportStep === 'manifest' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Server className="mr-2 h-4 w-4"/>}
                        Yapıyı ve İçeriği Oluştur
                    </Button>
                     <Button onClick={() => handleExportStatic('activities')} disabled={isExportingStatic} className="bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-lg shadow-amber-900/20">
                        {exportStep === 'activities' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Server className="mr-2 h-4 w-4"/>}
                        Oyun Verilerini Oluştur (Yavaş)
                    </Button>
                </CardContent>
            </Card>

             {dialogState.isOpen && (
                 <UserEditorDialog 
                     isOpen={dialogState.isOpen}
                     onOpenChange={(isOpen) => setDialogState({ isOpen, user: null })}
                     user={dialogState.user}
                     onSave={handleSaveUser}
                     isSaving={isSaving}
                     classes={allClasses}
                     schools={schools}
                 />
              )}
        </main>
    </div>
  );
}
