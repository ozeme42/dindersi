
"use client"

import { useState, useEffect } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { FilePenLine, Trash2, Loader2, UserPlus, MoreHorizontal, User, Sun } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
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
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { db, firebaseConfig } from "@/lib/firebase"
import { collection, getDocs, doc, updateDoc, deleteDoc, serverTimestamp, setDoc, query, where, writeBatch } from "firebase/firestore"
import type { UserProfile } from "@/lib/types"
import Link from "next/link"
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, fetchSignInMethodsForEmail, updateProfile } from "firebase/auth"
import { normalizeNameToEmailLocalPart } from "@/lib/utils"


const SUMMER_SCHOOL_CLASS_NAME = "Yaz Okulu Havuzu";

function StudentRow({ student, onEdit, onDelete }: { student: UserProfile, onEdit: (student: UserProfile) => void, onDelete: (studentId: string) => void}) {
    return (
        <TableRow>
            <TableCell>
                <div className="flex items-center gap-3">
                    <Avatar>
                        <AvatarImage src={student.avatar || `https://placehold.co/40x40.png`} alt={student.displayName} data-ai-hint="profile picture" />
                        <AvatarFallback>{student.displayName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{student.displayName}</span>
                </div>
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
                        <DropdownMenuItem asChild>
                           <Link href={`/teacher/students/${student.uid}`}>
                                <User className="mr-2 h-4 w-4" /> Profili Görüntüle
                            </Link>
                        </DropdownMenuItem>
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
                                        Bu işlem geri alınamaz. "{student.displayName}" adlı öğrenci kalıcı olarak silinecektir.
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
}

export default function SummerStudentManagementPage() {
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<UserProfile | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { toast } = useToast();

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, "users"), where("class", "==", SUMMER_SCHOOL_CLASS_NAME));
      const studentsSnapshot = await getDocs(q);
      const studentsData = studentsSnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile));
      setStudents(studentsData);
    } catch (error) {
      console.error("Error fetching summer students:", error);
      toast({ title: "Hata", description: "Yaz okulu öğrencileri alınırken bir hata oluştu.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);
  
  const handleOpenEdit = (student: UserProfile) => {
    setEditingStudent(student);
    setIsEditOpen(true);
  };
  
  const handleDelete = async (studentId: string) => {
     try {
        await deleteDoc(doc(db, "users", studentId));
        toast({ title: "Öğrenci Silindi", description: "Öğrenci başarıyla havuzdan silindi." });
        fetchStudents();
      } catch (error) {
        toast({ title: "Hata", description: "Öğrenci silinirken bir hata oluştu.", variant: "destructive" });
      }
  };
  
  const handleDeleteAll = async () => {
       try {
        const q = query(collection(db, "users"), where("class", "==", SUMMER_SCHOOL_CLASS_NAME));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            toast({ title: "Bilgi", description: "Havuzda zaten öğrenci yok." });
            return;
        }
        
        // Firestore batch is limited to 500 operations. If more, you need multiple batches.
        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();

        toast({ title: "Havuz Temizlendi", description: `${snapshot.size} öğrenci başarıyla silindi.`});
        fetchStudents();
      } catch (error) {
          toast({ title: "Hata", description: "Havuzdaki öğrenciler silinirken bir hata oluştu.", variant: "destructive"});
      }
  }

  const handleSave = async (studentToSave: UserProfile) => {
    setIsSaving(true);
    try {
        await updateDoc(doc(db, 'users', studentToSave.uid), { displayName: studentToSave.displayName.trim() });
        toast({ title: "Öğrenci Güncellendi" });
        fetchStudents();
      } catch (error) {
       toast({ title: "Hata", description: "Öğrenci güncellenirken bir hata oluştu.", variant: "destructive" });
    } finally {
        setIsSaving(false);
        setIsEditOpen(false);
    }
  };

  const handleAddStudent = async (displayName: string) => {
    setIsSaving(true);
    const finalDisplayName = displayName.trim();
    if (!finalDisplayName) {
        toast({ title: "Hata", description: "Öğrenci adı boş olamaz.", variant: "destructive" });
        setIsSaving(false);
        return;
    }
    
    if (!firebaseConfig.apiKey) {
        console.error("Firebase config is missing. Make sure .env file is set up and the dev server was restarted.");
        toast({
            title: "Yapılandırma Hatası",
            description: ".env dosyasındaki Firebase ayarları yüklenemedi. Lütfen dosyayı kontrol edip geliştirme sunucusunu yeniden başlatın.",
            variant: "destructive",
            duration: 10000,
        });
        setIsSaving(false);
        return;
    }
    
    const password = "123456";
    const appName = 'student-creation-' + Date.now();
    let secondaryApp;
    
    try {
        secondaryApp = initializeApp(firebaseConfig, appName);
        const secondaryAuth = getAuth(secondaryApp);
        
        const baseLocalPart = normalizeNameToEmailLocalPart(finalDisplayName);
        let finalEmail = `yaz.${baseLocalPart}@degerleroyunu.app`; // Prefix to avoid collisions
        let attempts = 0;

        while (true) {
            const methods = await fetchSignInMethodsForEmail(secondaryAuth, finalEmail);
            if (methods.length === 0) break;
            attempts++;
            finalEmail = `yaz.${baseLocalPart}${attempts}@degerleroyunu.app`;
            if (attempts > 100) {
                 throw new Error("Bu isimle çok fazla kullanıcı mevcut, lütfen farklı bir isim deneyin.");
            }
        }
        
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, finalEmail, password);
        const user = userCredential.user;

        await updateProfile(user, { displayName: finalDisplayName });

        const newUserProfile = {
            uid: user.uid,
            displayName: finalDisplayName,
            email: finalEmail,
            role: 'student' as 'student',
            class: SUMMER_SCHOOL_CLASS_NAME,
            createdAt: serverTimestamp(),
            score: 0,
        };

        // Use the main 'db' instance, which is authenticated as the teacher
        await setDoc(doc(db, "users", user.uid), newUserProfile);
        
        toast({ title: "Öğrenci Eklendi!", description: `${displayName} başarıyla havuz eklendi.` });
        fetchStudents();
        setIsAddOpen(false);

    } catch (error: any) {
        console.error("Error creating summer student:", error);
        toast({ title: "Hata", description: "Öğrenci oluşturulurken bir hata oluştu: " + error.message, variant: "destructive" });
    } finally {
        setIsSaving(false);
        if (secondaryApp) {
            await deleteApp(secondaryApp);
        }
    }
  };
  
  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Sun className="h-6 w-6 text-orange-500" /> Yaz Okulu Öğrenci Havuzu
              </CardTitle>
              <CardDescription>Yaz kursuna katılan öğrencileri buradan yönetin.</CardDescription>
            </div>
            <div className="flex gap-2">
              <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive-outline"><Trash2 className="mr-2 h-4 w-4"/> Havuzu Boşalt</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                      <AlertDialogHeader>
                          <AlertDialogTitle>Tüm Havuzu Silmek İstediğinize Emin misiniz?</AlertDialogTitle>
                          <AlertDialogDescription>
                              Bu işlem, havuzdaki tüm öğrenci kayıtlarını Firestore veritabanından kalıcı olarak silecektir. 
                              Ancak, bu öğrencilerin sisteme giriş yapmak için kullandıkları kimlik bilgileri (authentication) silinmez. 
                              Bu işlem geri alınamaz.
                          </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                          <AlertDialogCancel>İptal</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive hover:bg-destructive/90">
                              Evet, Tümünü Sil
                          </AlertDialogAction>
                      </AlertDialogFooter>
                  </AlertDialogContent>
              </AlertDialog>
              <Button onClick={() => setIsAddOpen(true)}><UserPlus className="mr-2 h-4 w-4"/> Yeni Öğrenci Ekle</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : students.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">Yaz Okulu Havuzunda öğrenci bulunmuyor.</div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Öğrenci</TableHead>
                            <TableHead className="text-right">Eylemler</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {students.map((student) => (
                            <StudentRow key={student.uid} student={student} onEdit={handleOpenEdit} onDelete={handleDelete} />
                        ))}
                    </TableBody>
                </Table>
            )}
        </CardContent>
      </Card>

      <StudentEditorDialog 
        isOpen={isEditOpen} 
        onOpenChange={setIsEditOpen} 
        student={editingStudent}
        onSave={handleSave}
        isSaving={isSaving}
      />
      
      <AddStudentDialog
        isOpen={isAddOpen}
        onOpenChange={setIsAddOpen}
        onAdd={handleAddStudent}
        isSaving={isSaving}
      />
    </div>
  );
}

function AddStudentDialog({ isOpen, onOpenChange, onAdd, isSaving }: { isOpen: boolean, onOpenChange: (open: boolean) => void, onAdd: (name: string) => void, isSaving: boolean }) {
    const [displayName, setDisplayName] = useState('');
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAdd(displayName);
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { setDisplayName('') }; onOpenChange(open); }}>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Havuzuna Yeni Öğrenci Ekle</DialogTitle>
                        <DialogDescription>Varsayılan şifre "123456" olarak atanacaktır.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="add-display-name">Ad Soyad</Label>
                            <Input id="add-display-name" value={displayName} onChange={e => setDisplayName(e.target.value)} required/>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="ghost">İptal</Button></DialogClose>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Öğrenci Oluştur
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </form>
        </Dialog>
    )
}

function StudentEditorDialog({ isOpen, onOpenChange, student, onSave, isSaving }: { isOpen: boolean, onOpenChange: (open: boolean) => void, student: UserProfile | null, onSave: (student: UserProfile) => void, isSaving: boolean }) {
    const [displayName, setDisplayName] = useState(student?.displayName || '');
    
    useEffect(() => {
        setDisplayName(student?.displayName || '');
    }, [student])

    const handleInternalSave = () => {
        if (!student) return;
        onSave({ ...student, displayName });
    }
    
    if (!student) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Öğrenciyi Düzenle</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Ad Soyad</Label>
                        <Input id="name" value={displayName} className="col-span-3" onChange={(e) => setDisplayName(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="ghost">İptal</Button></DialogClose>
                    <Button onClick={handleInternalSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Kaydet
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
