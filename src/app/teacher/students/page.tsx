

'use client';

import { useState, useEffect, useMemo, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from 'next/link';

// UI Imports
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// ADDED Search ICON
import { FilePenLine, Trash2, Loader2, UserPlus, MoreHorizontal, Users, Shield, Upload, AlertTriangle, ArrowDownAZ, CalendarClock, DollarSign, Send, UserCog, Search, Filter } from "lucide-react";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";


// Firebase and Actions
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, query, where, orderBy, deleteDoc } from "firebase/firestore";
import { getAllUsers, saveUser, deleteStudents as deleteUsersAction, resetAllGeneralScores, bulkAddStudents } from './actions';


// Types
import type { UserProfile, SchoolClass, School } from "@/lib/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { UserEditorDialog } from "@/components/user-editor-dialog";
import { UserAvatar } from "@/components/user-avatar";

function StudentTable({ 
    students, 
    isLoading, 
    onEdit, 
    onDelete, 
    onClassChange,
    allClasses 
}: { 
    students: UserProfile[], 
    isLoading: boolean, 
    onEdit: (student: UserProfile) => void,
    onDelete: (studentId: string) => void,
    onClassChange: (studentId: string, newClassName: string) => void,
    allClasses: SchoolClass[],
}) {
    if (isLoading) {
        return <div className="flex justify-center items-center h-48"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /></div>;
    }
    
    return (
        <div className="rounded-2xl border border-white/10 overflow-hidden bg-slate-900/40 backdrop-blur-sm shadow-xl">
            <Table>
                <TableHeader className="bg-slate-900/80">
                    <TableRow className="border-white/5 hover:bg-transparent">
                        <TableHead className="text-slate-300 font-bold">Öğrenci</TableHead>
                        <TableHead className="text-slate-300 font-bold">Sınıf/Şube</TableHead>
                        <TableHead className="text-right text-slate-300 font-bold">Eylemler</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {students.length > 0 ? students.map((student) => {
                        const [currentClassName, currentBranch] = student.class?.split(' - ') || ['', ''];
                        const studentClass = allClasses.find(c => c.name === currentClassName);

                        return (
                        <TableRow key={student.uid} className="border-white/5 hover:bg-white/5 transition-colors group">
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-800 rounded-full border border-white/10 group-hover:border-purple-400 transition-colors">
                                        <UserCog className="h-6 w-6 text-purple-400" />
                                    </div>
                                    <span className="font-bold text-white group-hover:text-purple-400 transition-colors">{student.displayName}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                {studentClass && studentClass.branches ? (
                                     <Select 
                                         value={currentBranch || ''}
                                         onValueChange={(newBranch) => {
                                             if (newBranch) {
                                                 onClassChange(student.uid, `${currentClassName} - ${newBranch}`);
                                             }
                                         }}
                                     >
                                         <SelectTrigger className="w-40 bg-slate-950 border-white/10 text-white h-9 text-xs focus:border-indigo-500/50">
                                             <SelectValue />
                                         </SelectTrigger>
                                         <SelectContent className="bg-slate-900 border-white/10 text-white">
                                             {studentClass.branches.map(b => (
                                                 <SelectItem key={b} value={b}>{b}</SelectItem>
                                             ))}
                                         </SelectContent>
                                     </Select>
                                ) : (
                                     <Badge variant="secondary" className="bg-slate-800 text-slate-400 border-white/10">
                                        {student.class || 'Sınıfsız'}
                                     </Badge>
                                )}
                            </TableCell>
                            <TableCell className="text-right">
                                 <DropdownMenu>
                                     <DropdownMenuTrigger asChild>
                                         <Button size="icon" variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/10">
                                             <MoreHorizontal className="h-5 w-5" />
                                         </Button>
                                     </DropdownMenuTrigger>
                                     <DropdownMenuContent align="end" className="bg-slate-900 border-white/10 text-white w-48">
                                         <DropdownMenuLabel className="text-slate-500 text-xs uppercase tracking-wider">Seçenekler</DropdownMenuLabel>
                                         <DropdownMenuItem onClick={() => onEdit(student)} className="focus:bg-white/10 focus:text-white cursor-pointer">
                                             <FilePenLine className="mr-2 h-4 w-4 text-emerald-400" /> Düzenle
                                         </DropdownMenuItem>
                                         <AlertDialog>
                                             <AlertDialogTrigger asChild>
                                                 <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-red-400 hover:bg-red-500/10 hover:text-red-300 w-full cursor-pointer">
                                                     <Trash2 className="mr-2 h-4 w-4" /> Sil
                                                 </div>
                                             </AlertDialogTrigger>
                                             <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
                                                 <AlertDialogHeader>
                                                     <AlertDialogTitle className="text-red-400">Emin misiniz?</AlertDialogTitle>
                                                     <AlertDialogDescription className="text-slate-400">
                                                         "{student.displayName}" adlı sanal öğrenci kalıcı olarak silinecektir.
                                                     </AlertDialogDescription>
                                                 </AlertDialogHeader>
                                                 <AlertDialogFooter>
                                                     <AlertDialogCancel className="bg-transparent border-white/10 text-slate-300 hover:bg-white/5 hover:text-white">İptal</AlertDialogCancel>
                                                     <AlertDialogAction onClick={() => onDelete(student.uid)} className="bg-red-600 hover:bg-red-500 text-white">
                                                         Evet, Sil
                                                     </AlertDialogAction>
                                                 </AlertDialogFooter>
                                             </AlertDialogContent>
                                         </AlertDialog>
                                     </DropdownMenuContent>
                                 </DropdownMenu>
                            </TableCell>
                        </TableRow>
                        )
                    }) : (
                        <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center text-slate-500 italic">Bu görünümde sanal öğrenci bulunmuyor.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

const UserEditorSchema = z.object({
  uid: z.string().optional(),
  displayName: z.string().min(3, "Ad Soyad en az 3 karakter olmalıdır."),
  email: z.string().email("Geçersiz e-posta adresi.").optional(),
  role: z.enum(['student', 'teacher', 'superadmin', 'guest']),
  password: z.string().optional(),
  classId: z.string().nullable().optional(),
  branch: z.string().nullable().optional(),
  schoolId: z.string().nullable().optional(),
  newSchoolName: z.string().optional(),
  score: z.coerce.number().optional().default(0),
}).refine(data => {
    if (!data.uid && (!data.password || data.password.length < 6)) {
      return false;
    }
    if (data.uid && data.password && data.password.length > 0 && data.password.length < 6) {
      return false;
    }
    if(data.schoolId === 'new' && (!data.newSchoolName || data.newSchoolName.trim() === '')) {
        return false;
    }
    return true;
}, {
    message: "Yeni kullanıcı için şifre zorunludur ve en az 6 karakter olmalıdır. Yeni okul adı boş bırakılamaz.",
    path: ["password"],
});

export default function StudentsPage() {
    const [allStudents, setAllStudents] = useState<UserProfile[]>([]);
    const [classes, setClasses] = useState<SchoolClass[]>([]);
    const [schools, setSchools] = useState<School[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [activeClassId, setActiveClassId] = useState<string>('all');
    const [activeBranch, setActiveBranch] = useState<string>('all');
    const [bulkClassId, setBulkClassId] = useState<string>('');
    const [bulkBranch, setBulkBranch] = useState<string>('');
    const [bulkSchoolId, setBulkSchoolId] = useState('');
    const [newBulkSchoolName, setNewBulkSchoolName] = useState('');
    
    const [isAdding, setIsAdding] = useState(false);
    const [newStudentName, setNewStudentName] = useState("");
    const [isBulkAdding, setIsBulkAdding] = useState(false);
    const [bulkStudentNames, setBulkStudentNames] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const [searchTerm, setSearchTerm] = useState("");
    const [dialogState, setDialogState] = useState<{isOpen: boolean; user: Partial<UserProfile> | null}>({isOpen: false, user: null});

    const { toast } = useToast();

    const fetchAllData = async () => {
        setIsLoading(true);
        try {
            const [usersData, classesData, schoolsData] = await Promise.all([
                getAllUsers(),
                getDocs(query(collection(db, "classes"), orderBy("createdAt", "asc"))),
                getDocs(query(collection(db, "schools"), orderBy("name", "asc")))
            ]);
            
            setAllStudents(usersData.filter(u => u.role === 'student' || u.role === 'guest'));
            const classesList = classesData.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
            const sortedClasses = classesList.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
            setClasses(sortedClasses);
            setSchools(schoolsData.docs.map(doc => ({ id: doc.id, ...doc.data() } as School)));

        } catch (error) {
            console.error("Error fetching data:", error);
            toast({ title: "Hata", description: "Veri alınırken bir hata oluştu.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);
    
    const handleDeleteUser = async (userId: string) => {
        try {
            await deleteUsersAction([userId]);
            toast({ title: "Başarılı", description: "Öğrenci silindi." });
            await fetchAllData();
        } catch(e) {
             toast({ title: "Hata", description: "Öğrenci silinirken bir hata oluştu.", variant: "destructive" });
        }
    }
    
    const handleOpenDialog = (user: Partial<UserProfile> | null = null) => {
        setDialogState({ isOpen: true, user });
    };
    
    const handleSaveUser = async (data: z.infer<typeof UserEditorSchema>) => {
        setIsSaving(true);
        
        const fullClassName = data.classId && data.branch 
            ? `${classes.find(c => c.id === data.classId)?.name} - ${data.branch}` 
            : data.classId 
            ? classes.find(c => c.id === data.classId)?.name 
            : undefined;

        let schoolName = data.schoolId === 'new' ? data.newSchoolName : schools.find(s => s.id === data.schoolId)?.name;

        const dataToSave = {
            ...data,
            class: fullClassName,
            schoolName: schoolName,
        };

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

    const handleAddSingleStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBulkClassData || !bulkBranch || !newStudentName.trim() || (!bulkSchoolId && !newBulkSchoolName)) {
            toast({title: "Eksik Bilgi", description: "Lütfen bir sınıf, şube, okul seçin ve öğrenci adı girin.", variant: "destructive"});
            return;
        }
        setIsSaving(true);
        const className = `${selectedBulkClassData.name} - ${bulkBranch}`;
        let finalSchoolName = '';
        if (bulkSchoolId === 'new') {
            finalSchoolName = newBulkSchoolName.trim();
        } else {
            const selectedSchool = schools.find(s => s.id === bulkSchoolId);
            finalSchoolName = selectedSchool?.name || '';
        }

        const result = await bulkAddStudents([newStudentName], className, finalSchoolName);
        
        if (result.success) {
            toast({title: "Başarılı", description: `${newStudentName} eklendi.`});
            setNewStudentName("");
            await fetchAllData();
        } else {
            toast({title: "Hata", description: result.error, variant: "destructive"});
        }
        setIsSaving(false);
    }

    const handleBulkAdd = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedBulkClassData || !bulkBranch || !bulkStudentNames.trim() || (!bulkSchoolId && !newBulkSchoolName)) {
            toast({title: "Eksik Bilgi", description: "Lütfen bir sınıf, şube, okul seçin ve öğrenci adları girin.", variant: "destructive"});
            return;
        }
    setIsSaving(true);
    const className = `${selectedBulkClassData.name} - ${bulkBranch}`;
    const names = bulkStudentNames.split('\n').map(name => name.trim()).filter(Boolean);
    
    let finalSchoolName = '';
    if (bulkSchoolId === 'new') {
        finalSchoolName = newBulkSchoolName.trim();
    } else {
        const selectedSchool = schools.find(s => s.id === bulkSchoolId);
        finalSchoolName = selectedSchool?.name || '';
    }

    const result = await bulkAddStudents(names, className, finalSchoolName);

    if (result.success) {
        toast({title: "Başarılı", description: `${result.successCount} öğrenci eklendi.`});
        setBulkStudentNames("");
        await fetchAllData();
    } else {
        toast({title: "Hata", description: result.error, variant: "destructive"});
    }
    setIsSaving(false);
  }
    
    const handleClassChange = async (studentId: string, newClassName: string) => {
        const originalStudent = allStudents.find(s => s.uid === studentId);
        if (!originalStudent) return;
    
        setAllStudents(prev => prev.map(s => s.uid === studentId ? { ...s, class: newClassName } : s));

        const result = await saveUser({ ...originalStudent, class: newClassName } as UserProfile);

        if (!result.success) {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
            setAllStudents(prev => prev.map(s => s.uid === studentId ? originalStudent : s));
        } else {
            toast({ title: "Başarılı", description: "Öğrencinin şubesi güncellendi." });
        }
    };

    const selectedClass = useMemo(() => classes.find(c => c.id === activeClassId), [activeClassId, classes]);
    const selectedBulkClassData = classes.find(c => c.id === bulkClassId);

    const filteredStudents = useMemo(() => {
        let list = allStudents.filter(s => s.role === 'student'); // Sadece 'student' rolündekiler
        
        if (activeClassId !== 'all' && selectedClass) {
            if (activeBranch === 'all') {
                 list = list.filter(s => s.class?.startsWith(selectedClass.name));
            } else {
                 list = list.filter(s => s.class === `${selectedClass?.name} - ${activeBranch}`);
            }
        }
        
        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            list = list.filter(s => 
                (s.displayName && s.displayName.toLowerCase().includes(lowercasedTerm))
            );
        }
        
        list.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '', 'tr'));
        return list;
    }, [allStudents, activeClassId, activeBranch, selectedClass, searchTerm]);

    const filteredGuestStudents = useMemo(() => {
        return allStudents.filter(s => s.role === 'guest');
    }, [allStudents]);
  
    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-4 sm:p-6 md:p-8 relative overflow-hidden">
            
           {/* Arka Plan */}
           <div className="fixed inset-0 pointer-events-none z-0">
              <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-indigo-900/10 rounded-full blur-[150px]" />
              <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-purple-900/10 rounded-full blur-[150px]" />
              <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]" />
          </div>

          <div className="max-w-7xl mx-auto relative z-10 space-y-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-8">
                 <h1 className="text-4xl font-black text-white tracking-tight uppercase drop-shadow-md flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 rounded-xl border border-purple-500/30">
                        <Users className="h-8 w-8 text-purple-400" />
                    </div>
                    Öğrenci Yönetimi
                </h1>
            </div>

            <Tabs defaultValue="list" className="space-y-6">
                <div className="bg-slate-900/40 p-1.5 rounded-xl border border-white/10 inline-flex">
                    <TabsList className="bg-transparent border-0 p-0 h-auto gap-2">
                        <TabsTrigger value="list" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400 px-6 py-2.5 rounded-lg transition-all font-bold">
                            <Users className="mr-2 h-4 w-4"/> Öğrenci Listesi
                        </TabsTrigger>
                        <TabsTrigger value="guest" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400 px-6 py-2.5 rounded-lg transition-all font-bold">
                            <UserCog className="mr-2 h-4 w-4"/> Sanal Öğrenciler
                        </TabsTrigger>
                        <TabsTrigger value="add" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-slate-400 px-6 py-2.5 rounded-lg transition-all font-bold">
                            <UserPlus className="mr-2 h-4 w-4"/> Yeni Öğrenci Ekle
                        </TabsTrigger>
                    </TabsList>
                </div>
                
                <TabsContent value="list" className="space-y-6 outline-none">
                     <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-xl overflow-hidden">
                        <CardHeader className="border-b border-white/5 pb-4">
                            <CardTitle className="text-xl text-white">Öğrenci Filtresi</CardTitle>
                            <CardDescription className="text-slate-400 text-sm">Sisteme kayıtlı öğrencileri görüntüleyin ve yönetin.</CardDescription>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                                <Select value={activeClassId} onValueChange={v => { setActiveClassId(v); setActiveBranch('all'); }}>
                                    <SelectTrigger className="bg-slate-950 border-white/10 text-white h-11 focus:border-indigo-500/50"><SelectValue placeholder="Sınıf Seç..." /></SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/10 text-white"><SelectItem value="all">Tüm Sınıflar</SelectItem>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                </Select>
                                <Select value={activeBranch} onValueChange={setActiveBranch} disabled={activeClassId === 'all'}>
                                    <SelectTrigger className="bg-slate-950 border-white/10 text-white h-11 focus:border-indigo-500/50"><SelectValue placeholder="Şube Seç..." /></SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                                        <SelectItem value="all">Tüm Şubeler</SelectItem>
                                        {selectedClass?.branches?.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                 <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <Input placeholder="Öğrenci ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-slate-950 border-white/10 text-white h-11 pl-10 focus:border-indigo-500/50 placeholder:text-slate-600" />
                                 </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                             <div className="rounded-2xl border border-white/10 overflow-hidden bg-slate-900/40 backdrop-blur-sm shadow-xl">
                                <Table>
                                    <TableHeader className="bg-slate-900/80">
                                        <TableRow className="border-white/5 hover:bg-transparent">
                                            <TableHead className="text-slate-300 font-bold">Öğrenci</TableHead>
                                            <TableHead className="text-slate-300 font-bold">Sınıf/Şube</TableHead>
                                            <TableHead className="text-slate-300 font-bold">Puan</TableHead>
                                            <TableHead className="text-right text-slate-300 font-bold">Eylemler</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredStudents.map(student => (
                                            <TableRow key={student.uid} className="border-white/5 hover:bg-white/5 transition-colors group">
                                                 <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <UserAvatar user={student} className="h-10 w-10 border-2 border-slate-700 group-hover:border-purple-400 transition-colors"/>
                                                        <span className="font-bold text-white group-hover:text-purple-400 transition-colors">{student.displayName}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="bg-slate-800 text-slate-400 border-white/10">
                                                        {student.class || 'Sınıfsız'}
                                                    </Badge>
                                                </TableCell>
                                                 <TableCell>
                                                    <span className="font-bold text-lg text-amber-400 flex items-center gap-1.5">
                                                        <DollarSign className="w-4 h-4 text-amber-600"/>
                                                        {student.score || 0}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                     <DropdownMenu>
                                                         <DropdownMenuTrigger asChild>
                                                             <Button size="icon" variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/10">
                                                                 <MoreHorizontal className="h-5 w-5" />
                                                             </Button>
                                                         </DropdownMenuTrigger>
                                                         <DropdownMenuContent align="end" className="bg-slate-900 border-white/10 text-white w-48">
                                                            <DropdownMenuItem onClick={() => router.push(`/teacher/students/${student.uid}`)}>
                                                                <Send className="mr-2 h-4 w-4" /> Detaylar
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleOpenDialog(student)}><FilePenLine className="mr-2 h-4 w-4"/> Düzenle</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleDeleteUser(student.uid)} className="text-red-400 focus:text-red-300 focus:bg-red-500/10">
                                                                <Trash2 className="mr-2 h-4 w-4"/> Sil
                                                            </DropdownMenuItem>
                                                         </DropdownMenuContent>
                                                     </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                     </Card>
                </TabsContent>

                <TabsContent value="guest" className="space-y-6 outline-none">
                  {/* Bu kısım `StudentTable` bileşenini kullanacak */}
                  <StudentTable students={filteredGuestStudents} isLoading={isLoading} onEdit={handleOpenDialog} onDelete={handleDeleteUser} onClassChange={()=>{}} allClasses={classes} />
                </TabsContent>
              
              <TabsContent value="add" className="outline-none space-y-6">
                  <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
                    <CardHeader className="bg-white/5 border-b border-white/5 pb-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
                                <UserPlus className="h-6 w-6 text-emerald-400" />
                            </div>
                            <CardTitle className="text-2xl text-white">Yeni Öğrenci Ekle</CardTitle>
                        </div>
                        <CardDescription className="text-slate-400 text-base">Oluşturulan öğrenciler seçtiğiniz sınıf ve şubeye atanacaktır.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8">
                        <Tabs defaultValue="single" className="w-full">
                          <TabsList className="bg-slate-950 border border-white/10 p-1 rounded-xl h-auto w-full flex">
                            <TabsTrigger value="single" className="flex-1 py-3 text-sm font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400">Tek Tek Ekle</TabsTrigger>
                            <TabsTrigger value="bulk" className="flex-1 py-3 text-sm font-bold data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-slate-400">Toplu Liste Ekle</TabsTrigger>
                          </TabsList>
                          
                          <div className="mt-6 bg-slate-950/50 p-6 rounded-2xl border border-white/5">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="space-y-1">
                                    <Label className="text-slate-300 text-xs">Sınıf</Label>
                                    <Select value={bulkClassId} onValueChange={v => { setBulkClassId(v); setBulkBranch(''); }}>
                                        <SelectTrigger className="bg-slate-900 border-white/10 text-white h-11 focus:border-indigo-500/50"><SelectValue placeholder="Sınıf Seç..." /></SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-white/10 text-white"><SelectItem value="" disabled>Lütfen bir sınıf seçin</SelectItem>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-slate-300 text-xs">Şube</Label>
                                    <Select value={bulkBranch} onValueChange={setBulkBranch} disabled={!selectedBulkClassData}>
                                        <SelectTrigger className="bg-slate-900 border-white/10 text-white h-11 focus:border-indigo-500/50"><SelectValue placeholder="Şube Seç..." /></SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                                            <SelectItem value="" disabled>Lütfen bir şube seçin</SelectItem>
                                            {selectedBulkClassData?.branches?.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                              <TabsContent value="single" className="mt-0">
                                <form onSubmit={handleAddSingleStudent} className="flex gap-4 items-end">
                                  <div className="flex-1 space-y-2">
                                      <Label className="text-slate-300">Öğrenci Adı Soyadı</Label>
                                      <Input 
                                        placeholder="Örn: Savaşçı 1" 
                                        value={newStudentName} 
                                        onChange={e => setNewStudentName(e.target.value)} 
                                        className="bg-slate-900 border-white/10 h-12 text-white focus:border-indigo-500/50"
                                      />
                                  </div>
                                  <Button type="submit" size="lg" className="h-12 px-8 bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-900/20" disabled={isSaving || !selectedBulkClassData || !bulkBranch}>
                                      {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <UserPlus className="mr-2 h-5 w-5"/>} Ekle
                                  </Button>
                                </form>
                              </TabsContent>

                              <TabsContent value="bulk" className="mt-0 space-y-4">
                                 <form onSubmit={handleBulkAdd} className="space-y-4">
                                     <div className="space-y-2">
                                        <Label htmlFor="bulk-school">Okul</Label>
                                        <Select value={bulkSchoolId} onValueChange={setBulkSchoolId}>
                                            <SelectTrigger id="bulk-school" className="bg-slate-900 border-white/10 text-white h-12 rounded-xl"><SelectValue placeholder="Okul Seçin..." /></SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-white/10 text-white">{schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}<SelectItem value="new"><span className="flex items-center gap-2"><PlusCircle className="h-4 w-4 text-cyan-400"/>Diğer (Yeni Okul Ekle)</span></SelectItem></SelectContent>
                                        </Select>
                                    </div>
                                    {bulkSchoolId === 'new' && (
                                        <div className="space-y-2 animate-in slide-in-from-top-2">
                                            <Label htmlFor="new-bulk-school-name">Yeni Okul Adı</Label>
                                            <Input id="new-bulk-school-name" value={newBulkSchoolName} onChange={e => setNewBulkSchoolName(e.target.value)} placeholder="Okulun tam adını girin" className="bg-slate-900 border-white/10 text-white h-12 rounded-xl"/>
                                        </div>
                                    )}
                                    <div>
                                         <Label htmlFor="bulk-names">Öğrenci Adları</Label>
                                         <Textarea id="bulk-names" value={bulkStudentNames} onChange={e => setBulkStudentNames(e.target.value)} placeholder="Ahmet Yılmaz&#10;Ayşe Kaya&#10;Mehmet Doğan" className="min-h-[200px] bg-slate-900 border-white/10 text-white font-mono text-sm leading-relaxed focus:border-emerald-500/50"/>
                                    </div>
                                    <Button type="submit" size="lg" className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20" disabled={isSaving || !selectedBulkClassData || !bulkBranch}>
                                        {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Users className="mr-2 h-5 w-5"/>} Listeyi İçe Aktar
                                    </Button>
                                 </form>
                              </TabsContent>
                          </div>
                        </Tabs>
                    </CardContent>
                  </Card>
              </TabsContent>
            </Tabs>
          </div>

          {dialogState.isOpen && (
             <UserEditorDialog 
                 isOpen={dialogState.isOpen}
                 onOpenChange={(isOpen) => setDialogState({ isOpen, user: null })}
                 user={dialogState.user}
                 onSave={handleSaveUser}
                 isSaving={isSaving}
                 classes={classes}
                 schools={schools}
             />
          )}
        </div>
    );
}

