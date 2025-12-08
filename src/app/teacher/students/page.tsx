
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { Loader2, UserPlus, Users, MoreHorizontal, Trash2, ArrowLeft, Download, Upload } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile, SchoolClass } from "@/lib/types";
import { UserAvatar } from "@/components/user-avatar";
import { UserEditorDialog } from "@/components/user-editor-dialog";
import { db } from "@/lib/firebase"
import { collection, getDocs, doc, query, where, orderBy, deleteDoc } from "firebase/firestore"
import { getAllUsers } from '@/app/teacher/superadmin/actions';
import { addStudentToClass, bulkAddStudentsToClass, addManualScore } from "./actions";

// Form Schemas
const searchFormSchema = z.object({
  searchTerm: z.string().optional(),
  classFilter: z.string().optional(),
});

const manualScoreSchema = z.object({
  score: z.coerce.number().int("Puan tam sayı olmalıdır.").min(1, "Puan pozitif olmalıdır."),
  reason: z.string().min(3, "Lütfen bir açıklama girin."),
});

// Helper component for Manual Score
function ManualScoreDialog({ student, onScoreAdded, isOpen, onOpenChange }: { student: UserProfile, onScoreAdded: () => void, isOpen: boolean, onOpenChange: (open: boolean) => void }) {
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    const { register, handleSubmit, formState: { errors }, reset } = useForm<z.infer<typeof manualScoreSchema>>({
        resolver: zodResolver(manualScoreSchema),
    });

    const onSubmit = async (data: z.infer<typeof manualScoreSchema>) => {
        setIsSaving(true);
        const result = await addManualScore(student.uid, data.score, data.reason);
        if (result.success) {
            toast({ title: "Başarılı", description: `${student.displayName} adlı öğrenciye ${data.score} puan eklendi.` });
            onScoreAdded();
            onOpenChange(false);
            reset();
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    return (
         <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                 <form onSubmit={handleSubmit(onSubmit)}>
                    <DialogHeader>
                        <DialogTitle>Manuel Puan Ekle</DialogTitle>
                        <DialogDescription>{student.displayName} adlı öğrenciye manuel olarak puan ekleyin.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div>
                            <Label htmlFor="score">Eklenecek Puan</Label>
                            <Input id="score" type="number" {...register("score")} />
                            {errors.score && <p className="text-sm text-destructive mt-1">{errors.score.message}</p>}
                        </div>
                        <div>
                            <Label htmlFor="reason">Açıklama</Label>
                            <Input id="reason" {...register("reason")} placeholder="Örn: Sınıf içi katılım" />
                            {errors.reason && <p className="text-sm text-destructive mt-1">{errors.reason.message}</p>}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>İptal</Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Ekle
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}


export default function StudentsPage() {
    const { user } = useAuth();
    const [students, setStudents] = useState<UserProfile[]>([]);
    const [classes, setClasses] = useState<SchoolClass[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [isAddStudentDialogOpen, setIsAddStudentDialogOpen] = useState(false);
    const [isManualScoreDialogOpen, setIsManualScoreDialogOpen] = useState(false);
    const [studentForManualScore, setStudentForManualScore] = useState<UserProfile | null>(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [classFilter, setClassFilter] = useState("all");
    const { toast } = useToast();

    const fetchAllData = useCallback(async () => {
        setIsLoading(true);
        const [allUsers, classesSnapshot] = await Promise.all([
            getAllUsers(),
            getDocs(collection(db, "classes"))
        ]);
        
        const studentAndGuestUsers = allUsers.filter(u => u.role === 'student' || u.role === 'guest');
        setStudents(studentAndGuestUsers);
        
        const classesData = classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
        setClasses(classesData);

        setIsLoading(false);
    }, []);


    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    const filteredStudents = useMemo(() => {
        return students.filter(student => {
            const nameMatch = student.displayName.toLowerCase().includes(searchTerm.toLowerCase());
            const classMatch = classFilter === 'all' || student.class === classFilter;
            return nameMatch && classMatch;
        });
    }, [students, searchTerm, classFilter]);
    
    const handleSaveUser = async (data: any) => {
        setIsSaving(true);
        const action = data.uid ? undefined : undefined;
        const result = data.uid ? {success: false, error: "Update not implemented"} : {success: false, error: "Create not implemented"};
        
        if (action) {
           // const result = await action(data);
             if (result.success) {
                toast({ title: "Başarılı", description: "Kullanıcı bilgileri kaydedildi." });
                fetchAllData();
                setIsAddStudentDialogOpen(false);
                setEditingUser(null);
            } else {
                toast({ title: "Hata", description: result.error, variant: "destructive" });
            }
        }
        setIsSaving(false);
    };

    const handleDeleteUser = async (userId: string) => {
        setIsSaving(true);
        // const result = await deleteUserFromFirestore(userId);
        const result = {success: false, error: "Delete not implemented"}
        if(result.success) {
            toast({ title: "Başarılı", description: "Kullanıcı silindi."});
            fetchAllData();
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    const openManualScoreDialog = (student: UserProfile) => {
        setStudentForManualScore(student);
        setIsManualScoreDialogOpen(true);
    };

    return (
        <Card className="m-4">
            <CardHeader>
                <CardTitle>Öğrenci Yönetimi</CardTitle>
                <CardDescription>
                    Sisteme kayıtlı tüm öğrencileri görüntüleyin, düzenleyin ve yeni öğrenci ekleyin.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                     <div className="flex gap-2 w-full sm:w-auto">
                        <Input 
                            placeholder="Öğrenci ara..." 
                            className="max-w-xs"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                         <Select value={classFilter} onValueChange={setClassFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Sınıf Filtrele"/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tüm Sınıflar</SelectItem>
                                {classes.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                            </SelectContent>
                         </Select>
                     </div>
                    <div className="flex gap-2">
                        <Button onClick={() => setIsAddStudentDialogOpen(true)}>
                            <UserPlus className="mr-2 h-4 w-4" /> Öğrenci Ekle
                        </Button>
                    </div>
                </div>

                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">Avatar</TableHead>
                                <TableHead>Ad Soyad</TableHead>
                                <TableHead>E-posta</TableHead>
                                <TableHead>Sınıf</TableHead>
                                <TableHead className="text-right">Puan</TableHead>
                                <TableHead className="text-right">İşlemler</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredStudents.length > 0 ? (
                                filteredStudents.map(student => (
                                    <TableRow key={student.uid}>
                                        <TableCell><UserAvatar user={student} className="h-10 w-10"/></TableCell>
                                        <TableCell className="font-medium">{student.displayName}</TableCell>
                                        <TableCell className="text-muted-foreground">{student.email}</TableCell>
                                        <TableCell>{student.class}</TableCell>
                                        <TableCell className="text-right font-mono">{student.score || 0}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                     <Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Menü</span><MoreHorizontal className="h-4 w-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => { setEditingUser(student); setIsAddStudentDialogOpen(true); }}>Düzenle</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => openManualScoreDialog(student)}>Puan Ekle</DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10">Sil</DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    "{student.displayName}" adlı öğrenciyi silmek üzeresiniz. Bu işlem geri alınamaz.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>İptal</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteUser(student.uid)} disabled={isSaving}>Sil</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        Filtreyle eşleşen öğrenci bulunamadı.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
            
             <UserEditorDialog
                isOpen={isAddStudentDialogOpen}
                onOpenChange={(open) => { if(!open) setEditingUser(null); setIsAddStudentDialogOpen(open); }}
                user={editingUser}
                onSave={handleSaveUser}
                isSaving={isSaving}
                classes={classes}
            />

            {studentForManualScore && (
                <ManualScoreDialog
                    isOpen={isManualScoreDialogOpen}
                    onOpenChange={setIsManualScoreDialogOpen}
                    student={studentForManualScore}
                    onScoreAdded={fetchAllData}
                />
            )}
        </Card>
    );
}
