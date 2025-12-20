

'use client';

import { useState, useEffect, useMemo, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";

// UI Imports
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { FilePenLine, Trash2, Loader2, UserPlus, MoreHorizontal, Users, Shield, Upload, AlertTriangle, ArrowDownAZ, CalendarClock, DollarSign, Send, UserCog, UserCheck, Search, Filter } from "lucide-react";
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
import { updateUser, getAllUsers, deleteUserFromFirestore } from '@/app/teacher/superadmin/actions';
import { addStudentToClass, bulkAddStudentsToClass, addManualScore, createNewStudent } from "./actions";


// Types
import type { UserProfile, SchoolClass } from "@/lib/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { UserEditorDialog } from "@/components/user-editor-dialog";

function StudentQuickScore({ studentId, onScoreAdd }: { studentId: string, onScoreAdd: (studentId: string, points: number, reason: string) => Promise<void> }) {
    const [points, setPoints] = useState(10);
    const [reason, setReason] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const handleQuickAdd = async () => {
        if (!reason.trim() || points === 0) return;
        setIsSaving(true);
        await onScoreAdd(studentId, points, reason);
        setPoints(10);
        setReason("");
        setIsSaving(false);
    };

    return (
        <div className="flex items-center gap-2 bg-slate-900/50 p-1.5 rounded-lg border border-white/5 shadow-inner">
            <Input
                type="number"
                value={points}
                onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
                className="w-16 h-8 text-center bg-slate-950 border-white/10 text-white focus:border-indigo-500/50"
            />
            <Input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Açıklama"
                className="w-32 h-8 bg-slate-950 border-white/10 text-white focus:border-indigo-500/50 text-xs"
            />
            <Button size="icon" className="h-8 w-8 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20" onClick={handleQuickAdd} disabled={isSaving || !reason.trim() || points === 0}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}
            </Button>
        </div>
    );
}

function StudentTable({ students, isLoading, onEdit, onDelete, onAddScore }: { 
    students: UserProfile[], 
    isLoading: boolean, 
    onEdit: (student: UserProfile) => void, 
    onDelete: (studentId: string) => void,
    onAddScore: (studentId: string, points: number, reason: string) => Promise<void>
}) {
    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /></div>;
    }
    
    return (
        <div className="rounded-2xl border border-white/10 overflow-hidden bg-slate-900/40 backdrop-blur-sm shadow-xl">
            <Table>
                <TableHeader className="bg-slate-900/80">
                    <TableRow className="border-white/5 hover:bg-transparent">
                        <TableHead className="text-slate-300 font-bold">Öğrenci</TableHead>
                        <TableHead className="text-slate-300 font-bold">Sınıf</TableHead>
                        <TableHead className="text-right text-slate-300 font-bold">Puan</TableHead>
                        <TableHead className="w-[320px] text-slate-300 font-bold">Hızlı Puan</TableHead>
                        <TableHead className="text-right text-slate-300 font-bold">İşlemler</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {students.length > 0 ? students.map((student) => {
                        return (
                        <TableRow key={student.uid} className="border-white/5 hover:bg-white/5 transition-colors group">
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <UserAvatar user={student} className="h-10 w-10 border-2 border-slate-700 group-hover:border-indigo-500 transition-colors"/>
                                        <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-0.5">
                                            {student.role === 'guest' ? <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full" title="Misafir"/> : <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" title="Kayıtlı"/>}
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-white group-hover:text-indigo-400 transition-colors">{student.displayName}</span>
                                        <span className="text-xs text-slate-500 truncate max-w-[150px]">{student.email}</span>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant="secondary" className="bg-slate-800 text-slate-300 border-white/10 group-hover:bg-indigo-500/20 group-hover:text-indigo-300 group-hover:border-indigo-500/30 transition-all">
                                    {student.class || '-'}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <span className="font-black text-lg text-emerald-400 drop-shadow-sm">{student.score?.toLocaleString() || 0}</span>
                            </TableCell>
                            <TableCell>
                                <StudentQuickScore studentId={student.uid} onScoreAdd={onAddScore} />
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
                                        <DropdownMenuItem asChild className="focus:bg-white/10 focus:text-white cursor-pointer">
                                           <Link href={`/teacher/students/${student.uid}`}>
                                                <Users className="mr-2 h-4 w-4 text-indigo-400" /> Profil
                                           </Link>
                                        </DropdownMenuItem>
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
                                                        "{student.displayName}" silinecek. Bu işlem geri alınamaz.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel className="bg-transparent border-white/10 text-slate-300 hover:bg-white/5 hover:text-white">İptal</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => onDelete(student.uid)} className="bg-red-600 hover:bg-red-500 text-white border-none">
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
                            <TableCell colSpan={5} className="h-32 text-center text-slate-500 italic">
                                Bu filtrede öğrenci bulunamadı.
                            </TableCell>
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
  email: z.string().email("Geçersiz e-posta adresi."),
  role: z.enum(['student', 'teacher', 'superadmin', 'guest']),
  password: z.string().optional(),
  classId: z.string().nullable().optional(),
  branch: z.string().nullable().optional(),
  score: z.coerce.number().optional().default(0),
}).refine(data => {
    if (!data.uid && (!data.password || data.password.length < 6)) {
      return false;
    }
    if (data.uid && data.password && data.password.length > 0 && data.password.length < 6) {
      return false;
    }
    return true;
}, {
    message: "Yeni kullanıcı için şifre zorunludur ve en az 6 karakter olmalıdır. Düzenleme yaparken ise şifre alanı boş bırakılabilir veya en az 6 karakter olmalıdır.",
    path: ["password"],
});


export default function StudentManagementPage() {
  const [allStudents, setAllStudents] = useState<UserProfile[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [activeClassId, setActiveClassId] = useState<string>('all');
  const [activeBranch, setActiveBranch] = useState<string>('all');
  
  const [dialogState, setDialogState] = useState<{isOpen: boolean; user: Partial<UserProfile> | null}>({isOpen: false, user: null});
  const [isSaving, setIsSaving] = useState(false);
  
  const [sortBy, setSortBy] = useState<'name' | 'date'>('name');
  const [searchTerm, setSearchTerm] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [bulkStudentNames, setBulkStudentNames] = useState("");

  const { toast } = useToast();

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const usersData = await getAllUsers();
      if (usersData) {
        const studentsData = usersData.filter(u => u.role === 'student');
        setAllStudents(studentsData);
      } else {
         toast({ title: "Hata", description: "Kullanıcılar getirilemedi.", variant: "destructive" });
      }

      const classesData = await getDocs(query(collection(db, "classes"), orderBy("createdAt", "asc")));
      const classesList = classesData.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
      const sortedClasses = classesList.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      setClasses(sortedClasses);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: "Hata", description: "Veri alınırken bir hata oluştu.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);
  
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

    const dataToSave = {
        ...data,
        class: fullClassName,
    };

    const result = data.uid
      ? await updateUser(dataToSave as UserProfile)
      : await createNewStudent(dataToSave as any);
      
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
    const result = await deleteUserFromFirestore(userId);
    if (result.success) {
        toast({ title: "Başarılı", description: "Öğrenci sistemden tamamen silindi." });
        await fetchAllData();
    } else {
        toast({ title: "Hata", description: result.error, variant: "destructive" });
    }
  }

  const handleAddManualScore = async (studentId: string, points: number, reason: string) => {
    const result = await addManualScore(studentId, points, reason);
    if (result.success) {
        toast({ title: "Başarılı", description: "Puan başarıyla işlendi." });
        await fetchAllData();
    } else {
        toast({ title: "Hata", description: result.error, variant: "destructive" });
    }
  };

  const handleAddSingleStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !activeBranch || activeBranch === 'all' || !newStudentName.trim()) {
        toast({title: "Eksik Bilgi", description: "Lütfen bir sınıf, şube seçin ve öğrenci adı girin.", variant: "destructive"});
        return;
    }
    setIsSaving(true);
    const className = `${selectedClass.name} - ${activeBranch}`;
    const result = await addStudentToClass(newStudentName, className);
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
      if (!selectedClass || !activeBranch || activeBranch === 'all' || !bulkStudentNames.trim()) {
        toast({title: "Eksik Bilgi", description: "Lütfen bir sınıf, şube seçin ve öğrenci adları girin.", variant: "destructive"});
        return;
    }
    setIsSaving(true);
    const className = `${selectedClass.name} - ${activeBranch}`;
    const names = bulkStudentNames.split('\n').map(name => name.trim()).filter(Boolean);
    const result = await bulkAddStudentsToClass(names, className);

    if (result.success) {
        toast({title: "Başarılı", description: `${result.successCount} öğrenci eklendi.`});
        setBulkStudentNames("");
        await fetchAllData();
    } else {
        toast({title: "Hata", description: result.error, variant: "destructive"});
    }
    setIsSaving(false);
  }
  
  const selectedClass = useMemo(() => classes.find(c => c.id === activeClassId), [activeClassId, classes]);

  const filteredAndSortedStudents = useMemo(() => {
    let list = allStudents;
    
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
            (s.displayName && s.displayName.toLowerCase().includes(lowercasedTerm)) || 
            (s.email && s.email.toLowerCase().includes(lowercasedTerm))
        );
    }
    
    list.sort((a, b) => {
        if (sortBy === 'name') {
            return (a.displayName || '').localeCompare(b.displayName || '', 'tr');
        } else { // date
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        }
    });

    return list;
  }, [allStudents, activeClassId, activeBranch, selectedClass, searchTerm, sortBy]);
  
  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-4 sm:p-6 md:p-8 relative overflow-hidden">
        
       {/* Arka Plan */}
       <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-indigo-900/10 rounded-full blur-[150px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-emerald-900/10 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10 space-y-8">
        <div className="flex items-center justify-between border-b border-white/10 pb-8">
             <h1 className="text-4xl font-black text-white tracking-tight uppercase drop-shadow-md flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
                    <UserCog className="h-8 w-8 text-indigo-400" />
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
                    <TabsTrigger value="add" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-slate-400 px-6 py-2.5 rounded-lg transition-all font-bold">
                        <UserPlus className="mr-2 h-4 w-4"/> Yeni Ekle
                    </TabsTrigger>
                </TabsList>
            </div>

          <TabsContent value="list" className="space-y-6 outline-none">
             {/* Filtreleme Barı */}
             <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-white/5 shadow-lg">
                <div className="md:col-span-3">
                     <Select value={activeClassId} onValueChange={v => { setActiveClassId(v); setActiveBranch('all'); }}>
                        <SelectTrigger className="bg-slate-950 border-white/10 h-11 text-white font-medium focus:ring-indigo-500/50"><SelectValue placeholder="Sınıf Seç..." /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white"><SelectItem value="all">Tüm Sınıflar</SelectItem>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="md:col-span-2">
                    <Select value={activeBranch} onValueChange={setActiveBranch} disabled={activeClassId === 'all'}>
                        <SelectTrigger className="bg-slate-950 border-white/10 h-11 text-white font-medium focus:ring-indigo-500/50"><SelectValue placeholder="Şube Seç..." /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                            <SelectItem value="all">Tüm Şubeler</SelectItem>
                            {selectedClass?.branches?.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="md:col-span-4">
                     <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input placeholder="İsim veya e-posta ile ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-slate-950 border-white/10 h-11 pl-10 text-white focus:border-indigo-500/50 placeholder:text-slate-600" />
                     </div>
                </div>
                 <div className="md:col-span-3 flex justify-end gap-2">
                    <Button variant={sortBy === 'name' ? 'secondary' : 'ghost'} onClick={() => setSortBy('name')} size="sm" className={cn("h-11 px-4 font-bold border border-white/5", sortBy === 'name' ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" : "text-slate-400 hover:text-white hover:bg-white/5")}>
                        <ArrowDownAZ className="mr-2 h-4 w-4"/> A-Z
                    </Button>
                     <Button variant={sortBy === 'date' ? 'secondary' : 'ghost'} onClick={() => setSortBy('date')} size="sm" className={cn("h-11 px-4 font-bold border border-white/5", sortBy === 'date' ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" : "text-slate-400 hover:text-white hover:bg-white/5")}>
                        <CalendarClock className="mr-2 h-4 w-4"/> Tarih
                    </Button>
                </div>
             </div>

             <StudentTable
                students={filteredAndSortedStudents}
                isLoading={isLoading}
                onEdit={handleOpenDialog}
                onDelete={handleDeleteUser}
                onAddScore={handleAddManualScore}
            />
          </TabsContent>

          <TabsContent value="add" className="outline-none">
              <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
                <CardHeader className="bg-white/5 border-b border-white/5 pb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
                            <UserPlus className="h-6 w-6 text-emerald-400" />
                        </div>
                        <CardTitle className="text-2xl text-white">Yeni Öğrenci Ekle</CardTitle>
                    </div>
                    <CardDescription className="text-slate-400 text-base">
                        Öğrencileri tek tek veya toplu liste halinde ekleyebilirsiniz. Eklenen öğrenciler seçilen sınıfa atanır.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                    {/* Sınıf Seçimi */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-slate-300">Sınıf</Label>
                            <Select value={activeClassId} onValueChange={v => { setActiveClassId(v); setActiveBranch('all'); }}>
                                <SelectTrigger className="bg-slate-950 border-white/10 h-12 text-lg text-white"><SelectValue placeholder="Sınıf Seç..." /></SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10 text-white"><SelectItem value="all" disabled>Lütfen bir sınıf seçin</SelectItem>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-300">Şube</Label>
                            <Select value={activeBranch} onValueChange={setActiveBranch} disabled={activeClassId === 'all'}>
                                <SelectTrigger className="bg-slate-950 border-white/10 h-12 text-lg text-white"><SelectValue placeholder="Şube Seç..." /></SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10 text-white">
                                    <SelectItem value="all" disabled>Lütfen bir şube seçin</SelectItem>
                                    {selectedClass?.branches?.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <Tabs defaultValue="single" className="w-full">
                      <TabsList className="bg-slate-950 border border-white/10 p-1 rounded-xl h-auto w-full flex">
                        <TabsTrigger value="single" className="flex-1 py-3 text-sm font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400">Tek Tek Ekle</TabsTrigger>
                        <TabsTrigger value="bulk" className="flex-1 py-3 text-sm font-bold data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-slate-400">Toplu Liste Ekle</TabsTrigger>
                      </TabsList>
                      
                      <div className="mt-6 bg-slate-950/50 p-6 rounded-2xl border border-white/5">
                          <TabsContent value="single" className="mt-0">
                            <form onSubmit={handleAddSingleStudent} className="flex gap-4 items-end">
                              <div className="flex-1 space-y-2">
                                  <Label className="text-slate-300">Ad Soyad</Label>
                                  <Input 
                                    placeholder="Örn: Ali Yılmaz" 
                                    value={newStudentName} 
                                    onChange={e => setNewStudentName(e.target.value)} 
                                    className="bg-slate-900 border-white/10 h-12 text-white focus:border-indigo-500/50"
                                  />
                              </div>
                              <Button type="submit" size="lg" className="h-12 px-8 bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-900/20" disabled={isSaving || !selectedClass || !activeBranch || activeBranch === 'all'}>
                                  {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <UserPlus className="mr-2 h-5 w-5"/>} Ekle
                              </Button>
                            </form>
                          </TabsContent>

                          <TabsContent value="bulk" className="mt-0 space-y-4">
                            <div className="space-y-2">
                                <Label className="text-slate-300">Öğrenci Listesi</Label>
                                <Textarea 
                                    placeholder="Her satıra bir öğrenci adı gelecek şekilde yapıştırın..." 
                                    className="min-h-[200px] bg-slate-900 border-white/10 text-white font-mono text-sm leading-relaxed focus:border-emerald-500/50" 
                                    value={bulkStudentNames} 
                                    onChange={e => setBulkStudentNames(e.target.value)} 
                                />
                            </div>
                            <Button type="submit" size="lg" onClick={handleBulkAdd} className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20" disabled={isSaving || !selectedClass || !activeBranch || activeBranch === 'all'}>
                                {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Users className="mr-2 h-5 w-5"/>} Listeyi İçe Aktar
                            </Button>
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
           />
      )}
    </div>
  );
}
