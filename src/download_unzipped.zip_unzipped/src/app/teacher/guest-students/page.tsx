
"use client"

import { useState, useEffect, useMemo } from "react"
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link"

// UI Imports
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FilePenLine, Trash2, Loader2, UserPlus, MoreHorizontal, Users, Shield, Upload, AlertTriangle, ArrowDownAZ, CalendarClock, DollarSign, Send, UserCog } from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";


// Firebase and Actions
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, getDocs, doc, query, where, orderBy, deleteDoc } from "firebase/firestore"
import { updateUser, createNewUser, deleteUserFromFirestore, resetAllGeneralScores, getAllUsers } from '@/app/teacher/superadmin/actions';
import { addGuestStudent, bulkAddGuestStudents, updateStudentClass } from "./actions";


// Types
import type { UserProfile, SchoolClass } from "@/lib/types"
import { cn } from "@/lib/utils"
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { UserEditorDialog } from "@/components/user-editor-dialog"

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
        return <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }
    
    return (
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Sanal Öğrenci</TableHead>
                        <TableHead>Sınıf/Şube</TableHead>
                        <TableHead className="text-right">Eylemler</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {students.length > 0 ? students.map((student) => {
                        const [currentClassName, currentBranch] = student.class?.split(' - ') || ['', ''];
                        const studentClass = allClasses.find(c => c.name === currentClassName);

                        return (
                        <TableRow key={student.uid}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <UserCog className="h-6 w-6 text-muted-foreground" />
                                    <span className="font-medium">{student.displayName}</span>
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
                                        <SelectTrigger className="w-40">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {studentClass.branches.map(b => (
                                                <SelectItem key={b} value={b}>{b}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    student.class
                                )}
                            </TableCell>
                            <TableCell className="text-right">
                                 <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button aria-haspopup="true" size="icon" variant="ghost">
                                            <MoreHorizontal className="h-4 w-4" />
                                            <span className="sr-only">Menüyü aç</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Eylemler</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => onEdit(student)}><FilePenLine className="mr-2 h-4 w-4" /> Düzenle</DropdownMenuItem>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <button className="w-full text-left relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-destructive hover:bg-destructive/10">
                                                    <Trash2 className="mr-2 h-4 w-4" /> Sil
                                                </button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Bu işlem geri alınamaz. "{student.displayName}" adlı sanal öğrenci kalıcı olarak silinecektir.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>İptal</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => onDelete(student.uid)} className="bg-destructive hover:bg-destructive/90">
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
                            <TableCell colSpan={3} className="h-24 text-center">Bu görünümde sanal öğrenci bulunmuyor.</TableCell>
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
});

export default function GuestStudentManagementPage() {
  const [allStudents, setAllStudents] = useState<UserProfile[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [activeClassId, setActiveClassId] = useState<string>('all');
  const [activeBranch, setActiveBranch] = useState<string>('all');
  
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
      const [usersData, classesData] = await Promise.all([
          getAllUsers(),
          getDocs(query(collection(db, "classes"), orderBy("createdAt", "asc")))
      ]);
      
      const studentsData = usersData.filter(u => u.role === 'guest');
      setAllStudents(studentsData);

      const classesList = classesData.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
      const sortedClasses = classesList.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      setClasses(sortedClasses);
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
        await deleteDoc(doc(db, "users", userId));
        toast({ title: "Başarılı", description: "Sanal öğrenci silindi." });
        await fetchAllData();
    } catch(e) {
         toast({ title: "Hata", description: "Sanal öğrenci silinirken bir hata oluştu.", variant: "destructive" });
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

    const dataToSave = {
        ...data,
        class: fullClassName,
    };

    const result = data.uid
      ? await updateUser(dataToSave as UserProfile)
      : await createNewUser(dataToSave as any);
      
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
    if (!selectedClass || !activeBranch || activeBranch === 'all' || !newStudentName.trim()) {
        toast({title: "Eksik Bilgi", description: "Lütfen bir sınıf, şube seçin ve öğrenci adı girin.", variant: "destructive"});
        return;
    }
    setIsSaving(true);
    const className = `${selectedClass.name} - ${activeBranch}`;
    const result = await addGuestStudent(newStudentName, className);
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
    const result = await bulkAddGuestStudents(names, className);

    if (result.success) {
        toast({title: "Başarılı", description: `${result.successCount} sanal öğrenci eklendi.`});
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
  
    // Optimistic UI update
    setAllStudents(prev => prev.map(s => s.uid === studentId ? { ...s, class: newClassName } : s));

    const result = await updateStudentClass(studentId, newClassName);

    if (!result.success) {
        toast({ title: "Hata", description: result.error, variant: "destructive" });
        // Revert UI on failure
        setAllStudents(prev => prev.map(s => s.uid === studentId ? originalStudent : s));
    } else {
        toast({ title: "Başarılı", description: "Öğrencinin şubesi güncellendi." });
    }
};

  const selectedClass = useMemo(() => classes.find(c => c.id === activeClassId), [activeClassId, classes]);

  const filteredStudents = useMemo(() => {
    let list = allStudents;
    
    if (selectedClass) {
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
  
  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold font-headline">Sanal Öğrenci Yönetimi</h1>
        </div>

        <Tabs defaultValue="list">
          <TabsList>
            <TabsTrigger value="list">Öğrenci Listesi</TabsTrigger>
            <TabsTrigger value="add">Yeni Öğrenci Ekle</TabsTrigger>
          </TabsList>
          <TabsContent value="list">
             <Card>
                <CardHeader>
                    <CardTitle>Sanal Öğrenciler</CardTitle>
                    <CardDescription>Akıllı tahta yarışmalarında kullanılacak sanal öğrencileri görüntüleyin ve yönetin.</CardDescription>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-4">
                        <Select value={activeClassId} onValueChange={v => { setActiveClassId(v); setActiveBranch('all'); }}>
                            <SelectTrigger><SelectValue placeholder="Sınıf Seç..." /></SelectTrigger>
                            <SelectContent><SelectItem value="all">Tüm Sınıflar</SelectItem>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={activeBranch} onValueChange={setActiveBranch} disabled={activeClassId === 'all'}>
                            <SelectTrigger><SelectValue placeholder="Şube Seç..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tüm Şubeler</SelectItem>
                                {selectedClass?.branches?.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                            </SelectContent>
                        </Select>
                         <Input placeholder="Öğrenci ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                </CardHeader>
                <CardContent>
                    <StudentTable students={filteredStudents} isLoading={isLoading} onEdit={handleOpenDialog} onDelete={handleDeleteUser} onClassChange={handleClassChange} allClasses={classes} />
                </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="add">
              <Card>
                <CardHeader>
                    <CardTitle>Yeni Sanal Öğrenci Ekle</CardTitle>
                    <CardDescription>Oluşturulan öğrenciler seçtiğiniz sınıf ve şubeye atanacaktır.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <Select value={activeClassId} onValueChange={v => { setActiveClassId(v); setActiveBranch('all'); }}>
                            <SelectTrigger><SelectValue placeholder="Sınıf Seç..." /></SelectTrigger>
                            <SelectContent><SelectItem value="all" disabled>Lütfen bir sınıf seçin</SelectItem>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={activeBranch} onValueChange={setActiveBranch} disabled={activeClassId === 'all'}>
                            <SelectTrigger><SelectValue placeholder="Şube Seç..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" disabled>Lütfen bir şube seçin</SelectItem>
                                {selectedClass?.branches?.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <Tabs defaultValue="single">
                      <TabsList>
                        <TabsTrigger value="single">Tek Tek Ekle</TabsTrigger>
                        <TabsTrigger value="bulk">Toplu Ekle</TabsTrigger>
                      </TabsList>
                      <TabsContent value="single" className="pt-4">
                        <form onSubmit={handleAddSingleStudent} className="flex gap-2">
                          <Input placeholder="Öğrenci Adı Soyadı" value={newStudentName} onChange={e => setNewStudentName(e.target.value)} />
                          <Button type="submit" disabled={isSaving || !selectedClass || !activeBranch || activeBranch === 'all'}><UserPlus className="mr-2 h-4 w-4"/> Ekle</Button>
                        </form>
                      </TabsContent>
                      <TabsContent value="bulk" className="pt-4">
                        <form onSubmit={handleBulkAdd} className="space-y-4">
                            <Textarea placeholder="Her satıra bir öğrenci adı yazın..." className="min-h-48" value={bulkStudentNames} onChange={e => setBulkStudentNames(e.target.value)} />
                            <Button type="submit" disabled={isSaving || !selectedClass || !activeBranch || activeBranch === 'all'}><Users className="mr-2 h-4 w-4"/> Toplu Ekle</Button>
                        </form>
                      </TabsContent>
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
