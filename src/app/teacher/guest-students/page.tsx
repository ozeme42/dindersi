
'use client';

import { useState, useEffect, useMemo, useCallback } from "react";
import { z } from "zod";
import { useRouter } from 'next/navigation';

// UI Imports
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    FilePenLine, Trash2, Loader2, UserPlus, MoreHorizontal, Users, 
    Search, UserCog, PencilRuler, Save, Upload, Home
} from "lucide-react";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

// Actions & Hooks
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { getStudentData, saveUser, bulkAddStudents, approveStudent, updateStudentClass, deleteBulkGuestStudents, bulkUpdateGuestStudents } from "../students/actions";

// Types
import type { UserProfile, SchoolClass, School } from "@/lib/types";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { UserEditorDialog } from "@/components/user-editor-dialog";
import { UserAvatar } from "@/components/user-avatar";
import Link from "next/link";
import { cn } from "@/lib/utils";


// --- STUDENT TABLE COMPONENT ---
function StudentTable({ 
    students, 
    isLoading, 
    onEdit, 
    onDelete, 
    onClassChange,
    allClasses,
    selectedIds,
    onSelect,
    isSuperAdmin
}: { 
    students: UserProfile[], 
    isLoading: boolean, 
    onEdit: (student: UserProfile) => void,
    onDelete: (studentId: string) => void,
    onClassChange: (studentId: string, newClassName: string) => void,
    allClasses: SchoolClass[],
    selectedIds: Set<string>,
    onSelect: (action: string) => void,
    isSuperAdmin: boolean
}) {
    if (isLoading) {
        return <div className="flex justify-center items-center h-48"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /></div>;
    }
    
    return (
        <div className="rounded-2xl border border-white/10 overflow-hidden bg-slate-900/40 backdrop-blur-sm shadow-xl">
            <Table>
                <TableHeader className="bg-slate-900/80">
                    <TableRow className="border-white/5 hover:bg-transparent">
                        <TableHead className="w-12 px-4">
                             <Checkbox
                                checked={students.length > 0 && students.every(s => selectedIds.has(s.uid))}
                                onCheckedChange={(checked) => {
                                    if (checked) onSelect('all-select'); 
                                    else onSelect('all-deselect');
                                }}
                            />
                        </TableHead>
                        <TableHead className="text-slate-300 font-bold">Sanal Öğrenci</TableHead>
                        {isSuperAdmin && <TableHead className="text-slate-300 font-bold">Okul</TableHead>}
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
                             <TableCell className="px-4">
                                <Checkbox
                                    checked={selectedIds.has(student.uid)}
                                    onCheckedChange={() => onSelect(student.uid)}
                                />
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-800 rounded-full border border-white/10 group-hover:border-purple-400 transition-colors">
                                        <UserCog className="h-6 w-6 text-purple-400" />
                                    </div>
                                    <span className="font-bold text-white group-hover:text-purple-400 transition-colors">{student.displayName}</span>
                                </div>
                            </TableCell>
                            {isSuperAdmin && (
                                <TableCell>
                                    <span className="text-slate-400 text-sm">{student.schoolName || '-'}</span>
                                </TableCell>
                            )}
                            <TableCell>
                                {studentClass && studentClass.branches ? (
                                     <Select 
                                        value={currentBranch || ''}
                                        onValueChange={(newBranch) => {
                                             if (newBranch) onClassChange(student.uid, `${currentClassName} - ${newBranch}`);
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
                                                 <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors text-red-400 hover:bg-red-500/10 hover:text-red-300 w-full cursor-pointer">
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
                            <TableCell colSpan={isSuperAdmin ? 5 : 4} className="h-24 text-center text-slate-500 italic">Bu kriterlere uygun sanal öğrenci bulunmuyor.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

// --- SCHEMA ---
const UserEditorSchema = z.object({
  uid: z.string().optional(),
  displayName: z.string().min(3, "Ad Soyad en az 3 karakter olmalıdır."),
  email: z.string().optional(),
  role: z.enum(['student', 'teacher', 'superadmin', 'guest', 'pending']),
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
    message: "Şifre/Okul adı kontrolü başarısız.",
    path: ["password"],
});

// --- PAGE COMPONENT ---
export default function GuestStudentManagementPage() {
    const { user: currentUser } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
  
    // Data States
    const [allStudents, setAllStudents] = useState<UserProfile[]>([]);
    const [classes, setClasses] = useState<SchoolClass[]>([]);
    const [schools, setSchools] = useState<School[]>([]);
    const [isLoading, setIsLoading] = useState(true);
  
    // Filter States
    const [activeClassId, setActiveClassId] = useState<string>('all');
    const [activeBranch, setActiveBranch] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState("");
    const [schoolFilter, setSchoolFilter] = useState('all');
    
    // Add User States
    const [newStudentName, setNewStudentName] = useState("");
    const [bulkStudentNames, setBulkStudentNames] = useState("");
    const [bulkClassId, setBulkClassId] = useState<string>("");
    const [bulkBranch, setBulkBranch] = useState<string>("");
    const [bulkSchoolId, setBulkSchoolId] = useState<string>("");
    const [newBulkSchoolName, setNewBulkSchoolName] = useState('');

    // Operations States
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [dialogState, setDialogState] = useState<{isOpen: boolean; user: Partial<UserProfile> | null}>({isOpen: false, user: null});
    const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

    // Bulk Edit States
    const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
    const [bulkEditSchoolId, setBulkEditSchoolId] = useState<string>("");
    const [bulkEditClassId, setBulkEditClassId] = useState<string>("");
    const [bulkEditBranch, setBulkEditBranch] = useState<string>("");

    const isSuperAdmin = currentUser?.role === 'superadmin';

    // --- VERİ ÇEKME ---
    const fetchAllData = useCallback(async () => {
        if (!currentUser) return;
        setIsLoading(true);
        try {
            const sanitizedTeacher = {
                uid: currentUser.uid,
                role: currentUser.role,
                schoolName: currentUser.schoolName,
            } as any;
            const { students, classes, schools } = await getStudentData(sanitizedTeacher);
            setAllStudents(students);
            const sortedClasses = [...classes].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
            setClasses(sortedClasses);
            setSchools(schools);

            // Set default school filter for teacher
            if (currentUser.role === 'teacher' && currentUser.schoolName) {
                const teacherSchool = schools.find(s => s.name === currentUser.schoolName);
                if (teacherSchool) {
                    setSchoolFilter(teacherSchool.id); 
                    setBulkSchoolId(teacherSchool.id);
                }
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            toast({ title: "Hata", description: "Veri alınırken bir hata oluştu.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [toast, currentUser]);

    useEffect(() => {
        if(currentUser?.uid) fetchAllData();
    }, [fetchAllData, currentUser?.uid]);
  
    const handleDeleteUser = async (userId: string) => {
        const result = await deleteBulkGuestStudents([userId]);
        if (result.success) {
            toast({ title: "Başarılı", description: "Sanal öğrenci silindi." });
            await fetchAllData();
        } else {
             toast({ title: "Hata", description: "Sanal öğrenci silinirken bir hata oluştu.", variant: "destructive" });
        }
    };
    
    // Filtrelenmiş öğrenci listesi
    const filteredStudents = useMemo(() => {
        let list = allStudents.filter(u => u.role === 'guest');

        if (isSuperAdmin) {
            if (schoolFilter !== 'all') {
                const selectedSchool = schools.find(s => s.id === schoolFilter);
                if (selectedSchool) list = list.filter(s => s.schoolName === selectedSchool.name);
            }
        } else if (currentUser?.role === 'teacher') {
            if (currentUser.schoolName) list = list.filter(s => s.schoolName === currentUser.schoolName);
            else list = [];
        }

        const selectedClass = classes.find(c => c.id === activeClassId);
        if (activeClassId !== 'all' && selectedClass) {
            if (activeBranch === 'all') {
                list = list.filter(s => s.class?.startsWith(selectedClass.name));
            } else {
                list = list.filter(s => s.class === `${selectedClass.name} - ${activeBranch}`);
            }
        }
        
        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            list = list.filter(s => s.displayName && s.displayName.toLowerCase().includes(lowercasedTerm));
        }
        
        return list.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '', 'tr'));
    }, [allStudents, activeClassId, activeBranch, searchTerm, schoolFilter, schools, currentUser, isSuperAdmin, classes]);

    const selectedClassData = classes.find(c => c.id === activeClassId);
    const selectedBulkClassData = classes.find(c => c.id === bulkClassId);

    const handleSingleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !selectedBulkClassData || !bulkBranch || bulkBranch === 'all' || !newStudentName.trim()) {
            toast({title: "Eksik Bilgi", description: "Lütfen bir sınıf, şube seçin ve öğrenci adı girin.", variant: "destructive"});
            return;
        }

        let schoolNameToAdd: string | undefined;
        let schoolIdToAdd: string | undefined;

        if(isSuperAdmin) {
            if(bulkSchoolId === 'new') {
                if(!newBulkSchoolName.trim()) {
                    toast({title: "Eksik Bilgi", description: "Yeni okul adını giriniz.", variant: "destructive"});
                    return;
                }
                 schoolNameToAdd = newBulkSchoolName.trim();
            } else {
                const school = schools.find(s => s.id === bulkSchoolId);
                schoolNameToAdd = school?.name;
                schoolIdToAdd = school?.id;
            }
        } else {
            schoolNameToAdd = currentUser.schoolName;
            schoolIdToAdd = schools.find(s => s.name === currentUser.schoolName)?.id;
        }
        
        if (!schoolNameToAdd) {
            toast({title: "Eksik Bilgi", description: "Okul bilgisi bulunamadı.", variant: "destructive"});
            return;
        }

        setIsSaving(true);
        const fullClassName = `${selectedBulkClassData.name} - ${bulkBranch}`;
        const result = await addGuestStudent(newStudentName, fullClassName, currentUser.uid, schoolIdToAdd, schoolNameToAdd);

        if (result.success) {
            toast({ title: "Başarılı", description: `${newStudentName} eklendi.` });
            setNewStudentName("");
            await fetchAllData();
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    const handleBulkAdd = async (e: React.FormEvent) => {
      e.preventDefault();
      
        let schoolNameForBulk: string | undefined;
        let schoolIdForBulk: string | undefined;
        if (isSuperAdmin) {
            if (bulkSchoolId === 'new') {
                schoolNameForBulk = newBulkSchoolName.trim();
            } else {
                const school = schools.find(s => s.id === bulkSchoolId);
                schoolNameForBulk = school?.name;
                schoolIdForBulk = school?.id;
            }
        } else {
            schoolNameForBulk = currentUser?.schoolName;
            schoolIdForBulk = schools.find(s => s.name === currentUser?.schoolName)?.id;
        }
      
        if (!selectedBulkClassData || !bulkBranch || !bulkStudentNames.trim() || !schoolNameForBulk) {
            toast({title: "Eksik Bilgi", description: "Lütfen bir sınıf, şube, okul seçin ve öğrenci adları girin.", variant: "destructive"});
            return;
        }

        setIsSaving(true);
        const className = `${selectedBulkClassData.name} - ${bulkBranch}`;
        const names = bulkStudentNames.split('\n').map(name => name.trim()).filter(Boolean);

        const result = await bulkAddStudents(names, className, schoolNameForBulk, currentUser?.uid, schoolIdForBulk);

        if (result.success) {
            toast({title: "Başarılı", description: `${result.successCount} öğrenci eklendi.`});
            setBulkStudentNames("");
            await fetchAllData();
        } else {
            toast({title: "Hata", description: result.error, variant: "destructive"});
        }
        setIsSaving(false);
    }
  
    // Diğer handler'lar (handleBulkDelete, handleSaveUser, vs.) aynı kalabilir.
    // ...

    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-4 sm:p-6 md:p-8 relative overflow-hidden">
        
            {/* Arka Plan Efektleri */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-indigo-900/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-purple-900/10 rounded-full blur-[150px]" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10 space-y-8">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-8">
                     <div className="flex items-center gap-4">
                        <div className="p-2 bg-purple-500/20 rounded-xl border border-purple-500/30">
                            <UserCog className="h-8 w-8 text-purple-400" />
                        </div>
                        <div>
                             <h1 className="text-3xl font-black text-white tracking-tight uppercase drop-shadow-md">
                                {isSuperAdmin ? "Yönetici Sanal Öğrenci Paneli" : "Sanal Öğrenci Yönetimi"}
                            </h1>
                            <p className="text-slate-400 mt-1 font-medium">Akıllı tahta yarışmaları için misafir öğrenci oluşturun ve yönetin.</p>
                        </div>
                     </div>
                     <Button asChild variant="outline" className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 bg-slate-900">
                         <Link href="/teacher">
                             <Home className="mr-2 h-4 w-4" /> Panele Dön
                         </Link>
                    </Button>
                </div>

                <Tabs defaultValue="list" className="space-y-6">
                    <div className="bg-slate-900/40 p-1.5 rounded-xl border border-white/10 inline-flex">
                        <TabsList className="bg-transparent border-0 p-0 h-auto gap-2">
                            <TabsTrigger value="list" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400 px-6 py-2.5 rounded-lg transition-all font-bold">
                                <Users className="mr-2 h-4 w-4"/> Öğrenci Listesi
                            </TabsTrigger>
                            <TabsTrigger value="add" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-slate-400 px-6 py-2.5 rounded-lg transition-all font-bold">
                                <UserPlus className="mr-2 h-4 w-4"/> Öğrenci Ekle
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* --- TAB 1: LİSTE --- */}
                    <TabsContent value="list" className="space-y-6 outline-none">
                        <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-xl overflow-hidden">
                            <CardHeader className="border-b border-white/5 pb-4">
                                <CardTitle className="text-xl text-white">Filtreleme ve Arama</CardTitle>
                                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
                                    {isSuperAdmin && (
                                        <Select value={schoolFilter} onValueChange={setSchoolFilter}>
                                            <SelectTrigger className="bg-slate-950 border-white/10 text-white h-11 focus:border-indigo-500/50">
                                                <SelectValue placeholder="Okul Seç..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-white/10 text-white">
                                                <SelectItem value="all">Tüm Okullar</SelectItem>
                                                {schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    )}
                                    <div className={isSuperAdmin ? '' : 'md:col-span-1'}>
                                        <Select value={activeClassId} onValueChange={v => { setActiveClassId(v); setActiveBranch('all'); }}>
                                            <SelectTrigger className="bg-slate-950 border-white/10 text-white h-11 focus:border-indigo-500/50"><SelectValue placeholder="Sınıf Seç..." /></SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-white/10 text-white"><SelectItem value="all">Tüm Sınıflar</SelectItem>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div className={isSuperAdmin ? '' : 'md:col-span-1'}>
                                        <Select value={activeBranch} onValueChange={setActiveBranch} disabled={activeClassId === 'all'}>
                                            <SelectTrigger className="bg-slate-950 border-white/10 text-white h-11 focus:border-indigo-500/50"><SelectValue placeholder="Şube Seç..." /></SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-white/10 text-white">
                                                <SelectItem value="all">Tüm Şubeler</SelectItem>
                                                {selectedClassData?.branches?.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                     <div className="relative md:col-span-2">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                        <Input placeholder="Öğrenci ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-slate-950 border-white/10 text-white h-11 pl-10 focus:border-indigo-500/50 placeholder:text-slate-600" />
                                     </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4">
                                {/*... bulk actions UI ...*/}
                                <StudentTable students={filteredStudents} isLoading={isLoading} onEdit={handleOpenDialog} onDelete={handleDeleteUser} onClassChange={updateStudentClass} allClasses={classes} selectedIds={selectedStudentIds} onSelect={() => {}} isSuperAdmin={isSuperAdmin} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* --- TAB 2: EKLEME --- */}
                    <TabsContent value="add" className="outline-none">
                       {/*... add student form ...*/}
                        <Card className="bg-slate-900/60 border border-white/10 flex flex-col">
                            <CardHeader className="bg-white/5 border-b border-white/5 pb-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
                                        <UserPlus className="h-6 w-6 text-emerald-400" />
                                    </div>
                                    <CardTitle className="text-2xl text-white">Öğrenci Ekle</CardTitle>
                                </div>
                                <CardDescription className="text-slate-400 text-base">Yeni sanal öğrencileri tek tek veya toplu halde sisteme kaydedin.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                     {isSuperAdmin && (
                                        <div className="space-y-1">
                                            <Label className="text-white">Okul</Label>
                                            <Select value={bulkSchoolId} onValueChange={setBulkSchoolId}>
                                                <SelectTrigger className="bg-slate-950 border-white/10 text-white h-11 rounded-xl"><SelectValue placeholder="Okul Seçin..." /></SelectTrigger>
                                                <SelectContent className="bg-slate-900 border-white/10 text-white">
                                                    {schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                                    <SelectItem value="new">
                                                        <span className="flex items-center gap-2"><PlusCircle className="h-4 w-4 text-cyan-400"/>Yeni Okul Ekle</span>
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                    <div className="space-y-1">
                                        <Label className="text-slate-300">Sınıf</Label>
                                        <Select value={bulkClassId} onValueChange={(val) => { setBulkClassId(val); setBulkBranch(""); }}>
                                            <SelectTrigger className="bg-slate-950 border-white/10 text-white h-11 focus:border-indigo-500/50"><SelectValue placeholder="Sınıf Seç..." /></SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-white/10 text-white">{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-slate-300">Şube</Label>
                                        <Select value={bulkBranch} onValueChange={setBulkBranch} disabled={!selectedBulkClassData}>
                                            <SelectTrigger className="bg-slate-950 border-white/10 text-white h-11 focus:border-indigo-500/50"><SelectValue placeholder="Şube Seç..." /></SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-white/10 text-white">
                                                {selectedBulkClassData?.branches?.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {bulkSchoolId === 'new' && isSuperAdmin && (
                                        <div className="space-y-1 animate-in slide-in-from-top-2 md:col-span-3">
                                            <Label htmlFor="new-bulk-school-name">Yeni Okul Adı</Label>
                                            <Input id="new-bulk-school-name" value={newBulkSchoolName} onChange={e => setNewBulkSchoolName(e.target.value)} placeholder="Okulun tam adını girin" className="bg-slate-900 border-white/10 text-white h-11 rounded-xl"/>
                                        </div>
                                    )}
                                </div>
                                <Tabs defaultValue="bulk" className="w-full">
                                    <TabsList className="grid w-full grid-cols-2 bg-slate-950 border border-white/10 p-1 rounded-xl h-auto">
                                        <TabsTrigger value="bulk" className="py-3 text-sm font-bold data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-slate-400">Toplu Liste Ekle</TabsTrigger>
                                        <TabsTrigger value="single" className="py-3 text-sm font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400">Tek Tek Ekle</TabsTrigger>
                                    </TabsList>
                                    
                                    <div className="mt-6 bg-slate-950/50 p-6 rounded-2xl border border-white/5">
                                        <TabsContent value="single" className="mt-0">
                                            <form onSubmit={handleSingleAdd} className="flex gap-4 items-end">
                                              <div className="flex-1 space-y-2">
                                                  <Label className="text-slate-300">Öğrenci Adı Soyadı</Label>
                                                  <Input placeholder="Örn: Savaşçı 1" value={newStudentName} onChange={e => setNewStudentName(e.target.value)} className="bg-slate-900 border-white/10 h-12 text-white focus:border-indigo-500/50"/>
                                              </div>
                                              <Button type="submit" size="lg" className="h-12 px-8 bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-900/20" disabled={isSaving || !selectedBulkClassData || !bulkBranch || !newStudentName.trim()}>
                                                  {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <UserPlus className="mr-2 h-5 w-5"/>} Ekle
                                              </Button>
                                            </form>
                                        </TabsContent>

                                        <TabsContent value="bulk" className="mt-0 space-y-4">
                                            <div className="space-y-2">
                                                <Label className="text-slate-300">Öğrenci Listesi (Her Satıra Bir İsim)</Label>
                                                <Textarea value={bulkStudentNames} onChange={e => setBulkStudentNames(e.target.value)} placeholder={"Ahmet Yılmaz\nAyşe Kaya\nMehmet Doğan"} className="min-h-[200px] bg-slate-900 border-white/10 text-white font-mono text-sm leading-relaxed focus:border-emerald-500/50" />
                                            </div>
                                            <div className="flex justify-end mt-6">
                                                <Button type="submit" size="lg" onClick={handleBulkAdd} className="h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20" disabled={isSaving || !selectedBulkClassData || !bulkBranch || !bulkStudentNames.trim() || (!bulkSchoolId && !currentUser?.schoolName) || (bulkSchoolId === 'new' && !newBulkSchoolName)}>
                                                    {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Users className="mr-2 h-5 w-5"/>} Listeyi İçe Aktar
                                                </Button>
                                            </div>
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

```
- `src/components/user-profile-badge.tsx:
```tsx
'use client';

import { useAuth } from '@/context/auth-context';
import { UserAvatar } from './user-avatar';
import { Button } from './ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from './ui/dropdown-menu';
import Link from 'next/link';
import { LogOut, User, LayoutDashboard } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

export function UserProfileBadge() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await signOut(auth);
            toast({
                title: "Başarılı",
                description: "Oturumunuz güvenli bir şekilde kapatıldı.",
            })
            router.push('/login');
        } catch (error) {
            console.error("Logout error:", error);
            toast({
                title: "Hata",
                description: "Çıkış yapılırken bir hata oluştu.",
                variant: "destructive",
            })
        } finally {
            setIsLoggingOut(false);
        }
    };
    
    const getDashboardLink = () => {
        if (!user) return "/";
        return user.role === 'teacher' || user.role === 'superadmin' ? '/teacher' : '/student';
    }

    if (loading) {
        return <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full" disabled><Loader2 className="animate-spin"/></Button>
    }

    if (!user) {
        return (
            <div className="flex items-center gap-2">
                <Button asChild variant="ghost">
                    <Link href="/login">Giriş Yap</Link>
                </Button>
                <Button asChild>
                    <Link href="/register">Kayıt Ol</Link>
                </Button>
            </div>
        )
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-12 w-12 rounded-full p-0">
                    <div className="h-10 w-10 rounded-full border-2 border-primary/50 p-0.5">
                       <UserAvatar user={user} className="h-full w-full"/>
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                            {user.displayName || "Kullanıcı"}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href={getDashboardLink()}>
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>Panel</span>
                    </Link>
                </DropdownMenuItem>
                 <DropdownMenuItem asChild>
                    <Link href="/student/profile">
                        <User className="mr-2 h-4 w-4" />
                        <span>Profil</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Çıkış Yap</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

```