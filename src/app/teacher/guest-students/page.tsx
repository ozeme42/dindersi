
'use client';

import { useState, useEffect, useMemo, useCallback } from "react";

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
    Search, UserCog, PencilRuler 
} from "lucide-react";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

// Firebase and Actions
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { UserEditorDialog } from "@/components/user-editor-dialog";
import { UserAvatar } from "@/components/user-avatar";
import { getStudentData, addGuestStudent, bulkAddStudents, updateStudentClass, deleteBulkGuestStudents, bulkUpdateGuestStudents } from "./actions";
import { saveUser } from "@/app/teacher/students/actions";

// Types
import type { UserProfile, SchoolClass, School } from "@/lib/types";
import { z } from "zod";


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
                                    if (checked) {
                                        onSelect('all-select'); 
                                    } else {
                                        onSelect('all-deselect');
                                    }
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
                            <TableCell colSpan={isSuperAdmin ? 5 : 4} className="h-24 text-center text-slate-500 italic">Bu görünümde sanal öğrenci bulunmuyor.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

// --- MAIN PAGE COMPONENT ---
export default function GuestStudentManagementPage() {
    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'superadmin';

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
    const [bulkClassId, setBulkClassId] = useState<string>('');
    const [bulkBranch, setBulkBranch] = useState<string>('');
    const [selectedBulkClassData, setSelectedBulkClassData] = useState<SchoolClass | null>(null);

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

    const { toast } = useToast();

    // --- DATA FETCHING ---
    const fetchAllData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const sanitizedTeacher = {
                uid: user.uid,
                role: user.role,
                schoolName: user.schoolName,
            } as any;

            const { students, classes, schools } = await getStudentData(sanitizedTeacher);
            setAllStudents(students);
            
            const sortedClasses = [...classes].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
            setClasses(sortedClasses);
            setSchools(schools);

        } catch (error) {
            console.error("Error fetching data:", error);
            toast({ title: "Hata", description: "Veri alınırken bir hata oluştu.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [toast, user]);

    useEffect(() => {
        if(user?.uid) {
            fetchAllData();
        }
    }, [fetchAllData, user?.uid]);

    // --- FILTERING LOGIC ---
    const selectedClass = useMemo(() => classes.find(c => c.id === activeClassId), [activeClassId, classes]);
    
    const filteredStudents = useMemo(() => {
        let list = allStudents.filter(s => s.role === 'guest');

        if (isSuperAdmin) {
            if(schoolFilter !== 'all') {
                const selectedSchool = schools.find(s => s.id === schoolFilter);
                if (selectedSchool) {
                    list = list.filter(s => s.schoolName === selectedSchool.name);
                }
            }
        } else if(user?.role === 'teacher') {
            if (user.schoolName) {
                 list = list.filter(s => s.schoolName === user.schoolName);
            } else {
                 list = list.filter(s => s.teacherId === user.uid);
            }
        }

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
        
        list.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '', 'tr'));
        return list;
    }, [allStudents, activeClassId, activeBranch, selectedClass, searchTerm, schoolFilter, schools, user, isSuperAdmin]);

    // --- HANDLERS ---
    const handleSelectUser = (action: string) => {
        if (action === 'all-select') {
            const newSelectedIds = new Set(selectedStudentIds);
            filteredStudents.forEach(s => newSelectedIds.add(s.uid));
            setSelectedStudentIds(newSelectedIds);
        } else if (action === 'all-deselect') {
            const newSelectedIds = new Set(selectedStudentIds);
            filteredStudents.forEach(s => newSelectedIds.delete(s.uid));
            setSelectedStudentIds(newSelectedIds);
        } else {
            const userId = action;
            setSelectedStudentIds(prev => {
                const newSet = new Set(prev);
                if (newSet.has(userId)) newSet.delete(userId);
                else newSet.add(userId);
                return newSet;
            });
        }
    };

    const handleDeleteUser = async (userId: string) => {
        const result = await deleteBulkGuestStudents([userId]);
        if (result.success) {
            toast({ title: "Başarılı", description: "Sanal öğrenci silindi." });
            await fetchAllData();
        } else {
             toast({ title: "Hata", description: "Sanal öğrenci silinirken bir hata oluştu.", variant: "destructive" });
        }
    }
  
    const handleOpenDialog = (user: Partial<UserProfile> | null = null) => {
        setDialogState({ isOpen: true, user: user || { role: 'guest' } });
    };
  
    const handleSaveUser = async (data: any) => {
        if (!user) return;
        setIsSaving(true);
    
        const fullClassName = data.classId && data.branch 
            ? `${classes.find(c => c.id === data.classId)?.name} - ${data.branch}` 
            : data.classId 
            ? classes.find(c => c.id === data.classId)?.name 
            : undefined;
        
        const dataToSave = { 
            ...data, 
            class: fullClassName, 
            teacherId: user.uid, 
            role: 'guest',
            ...(user.schoolId && { schoolId: user.schoolId }),
            ...(user.schoolName && { schoolName: user.schoolName }),
        };

        const result = await saveUser(dataToSave as any);
      
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
        if (!user || !selectedBulkClassData || !bulkBranch || bulkBranch === 'all' || !newStudentName.trim()) {
            toast({title: "Eksik Bilgi", description: "Lütfen bir sınıf, şube seçin ve öğrenci adı girin.", variant: "destructive"});
            return;
        }
        setIsSaving(true);
        const className = `${selectedBulkClassData.name} - ${bulkBranch}`;
        
        const result = await addGuestStudent(
            newStudentName, 
            className, 
            user.uid, 
            user.schoolId || undefined, 
            user.schoolName || undefined
        );
        
        if (result.success) {
            toast({title: "Başarılı", description: `${newStudentName} eklendi.`});
            setNewStudentName("");
            await fetchAllData();
        } else {
            toast({title: "Hata", description: result.error, variant: "destructive"});
        }
        setIsSaving(false);
    }
    
    const handleBulkDelete = async () => {
        setIsDeleting(true);
        const result = await deleteBulkGuestStudents(Array.from(selectedStudentIds));
        if (result.success) {
            toast({ title: "Başarılı", description: `Seçilen sanal öğrenciler silindi.` });
            setSelectedStudentIds(new Set());
            await fetchAllData(); 
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsDeleting(false);
    };

    const handleBulkEditSubmit = async () => {
        const hasClassChange = bulkEditClassId && bulkEditBranch;
        const hasSchoolChange = isSuperAdmin && bulkEditSchoolId;

        if (!hasClassChange && !hasSchoolChange) {
            toast({title: "Hata", description: "Lütfen güncellemek istediğiniz bilgileri seçiniz.", variant: "destructive"});
            return;
        }

        setIsSaving(true);
        
        const updates: any = {};

        if (hasClassChange) {
             const selectedClass = classes.find(c => c.id === bulkEditClassId);
             updates.className = selectedClass ? `${selectedClass.name} - ${bulkEditBranch}` : '';
        }

        if (hasSchoolChange) {
            const selectedSchool = schools.find(s => s.id === bulkEditSchoolId);
            if (selectedSchool) {
                updates.schoolId = selectedSchool.id;
                updates.schoolName = selectedSchool.name;
            }
        }

        const result = await bulkUpdateGuestStudents(Array.from(selectedStudentIds), updates);

        if (result.success) {
            toast({ title: "Başarılı", description: "Toplu güncelleme yapıldı." });
            await fetchAllData();
            setIsBulkEditOpen(false);
            setBulkEditClassId("");
            setBulkEditBranch("");
            setBulkEditSchoolId("");
            setSelectedStudentIds(new Set());
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-950">
                <Loader2 className="h-16 w-16 animate-spin text-indigo-500" />
            </div>
        );
    }
  
    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-4 sm:p-6 md:p-8 relative overflow-hidden">
        
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-indigo-900/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-purple-900/10 rounded-full blur-[150px]" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10 space-y-8">
                
                <div className="flex items-center justify-between border-b border-white/10 pb-8">
                     <h1 className="text-4xl font-black text-white tracking-tight uppercase drop-shadow-md flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 rounded-xl border border-purple-500/30">
                            <UserCog className="h-8 w-8 text-purple-400" />
                        </div>
                        {isSuperAdmin ? "Yönetici Sanal Öğrenci Paneli" : "Sanal Öğrenci Yönetimi"}
                    </h1>
                </div>

                <Tabs defaultValue="list" className="space-y-6">
                    <div className="bg-slate-900/40 p-1.5 rounded-xl border border-white/10 inline-flex">
                        <TabsList className="bg-transparent border-0 p-0 h-auto gap-2">
                            <TabsTrigger value="list" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400 px-6 py-2.5 rounded-lg transition-all font-bold">
                                <Users className="mr-2 h-4 w-4"/> Sanal Öğrenci Listesi
                            </TabsTrigger>
                        </TabsList>
                    </div>

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
                                                {selectedClass?.branches?.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
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
                                {selectedStudentIds.size > 0 && (
                                    <div className="bg-slate-800/50 p-3 rounded-xl border border-white/10 flex items-center justify-between">
                                        <span className="text-sm font-bold text-indigo-300">{selectedStudentIds.size} sanal öğrenci seçildi.</span>
                                        <div className="flex gap-2">
                                            <Button 
                                                variant="secondary" 
                                                size="sm" 
                                                className="bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30"
                                                onClick={() => setIsBulkEditOpen(true)}
                                            >
                                                <PencilRuler className="h-4 w-4 mr-2" /> Toplu Düzenle
                                            </Button>

                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                     <Button variant="destructive" size="sm" disabled={isDeleting}>
                                                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                                                        <span className="ml-2">Seçilenleri Sil</span>
                                                     </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                                        <AlertDialogDescription>Seçili {selectedStudentIds.size} sanal öğrenci kalıcı olarak silinecektir.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>İptal</AlertDialogCancel>
                                                        <AlertDialogAction onClick={handleBulkDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-500">
                                                            {isDeleting ? "Siliniyor..." : "Evet, Sil"}
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                )}
                                <StudentTable 
                                    students={filteredStudents} 
                                    isLoading={isLoading} 
                                    onEdit={handleOpenDialog} 
                                    onDelete={handleDeleteUser} 
                                    onClassChange={updateStudentClass} 
                                    allClasses={classes} 
                                    selectedIds={selectedStudentIds}
                                    onSelect={handleSelectUser}
                                    isSuperAdmin={isSuperAdmin}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

             <Dialog open={isBulkEditOpen} onOpenChange={setIsBulkEditOpen}>
                <DialogContent className="bg-slate-900 border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>Toplu Düzenleme</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Seçilen {selectedStudentIds.size} öğrenci için yeni bilgileri giriniz.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid gap-6 py-4">
                         {isSuperAdmin && (
                            <div className="space-y-2 p-4 bg-slate-950/50 rounded-lg border border-white/5">
                                <Label className="text-indigo-400 font-bold">Okul Değişikliği (Sadece Admin)</Label>
                                <Select value={bulkEditSchoolId} onValueChange={setBulkEditSchoolId}>
                                    <SelectTrigger className="bg-slate-900 border-white/10 h-10"><SelectValue placeholder="Okul Değiştir (Opsiyonel)..." /></SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                                        {schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                         )}

                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Yeni Sınıf</Label>
                                <Select value={bulkEditClassId} onValueChange={(val) => { setBulkEditClassId(val); setBulkEditBranch(""); }}>
                                    <SelectTrigger className="bg-slate-950 border-white/10"><SelectValue placeholder="Sınıf Seç..." /></SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                                        {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Yeni Şube</Label>
                                <Select value={bulkEditBranch} onValueChange={setBulkEditBranch} disabled={!bulkEditClassId}>
                                    <SelectTrigger className="bg-slate-950 border-white/10"><SelectValue placeholder="Şube..." /></SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                                        {classes.find(c => c.id === bulkEditClassId)?.branches.map(b => (
                                            <SelectItem key={b} value={b}>{b}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                         </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBulkEditOpen(false)} className="border-white/10 hover:bg-white/5 text-slate-300">İptal</Button>
                        <Button onClick={handleBulkEditSubmit} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                             {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Güncelle
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {dialogState.isOpen && (
                 <UserEditorDialog 
                      isOpen={dialogState.isOpen}
                      onOpenChange={(isOpen) => setDialogState({ isOpen, user: null })}
                      user={dialogState.user}
                      onSave={handleSaveUser as any}
                      isSaving={isSaving}
                      classes={classes}
                      schools={schools}
                  />
             )}
        </div>
    );
}

