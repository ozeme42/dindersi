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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

import { Loader2, UserPlus, Users, Trash2, ArrowLeft, Download, Upload } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile, SchoolClass } from "@/lib/types";
import { UserEditorDialog } from "@/components/user-editor-dialog";
import { db } from "@/lib/firebase"
import { collection, getDocs, doc, query, where, orderBy, deleteDoc } from "firebase/firestore"
import { getAllUsers } from '@/app/teacher/superadmin/actions';
import { addGuestStudent, bulkAddGuestStudents, updateStudentClass } from "./actions";


const searchFormSchema = z.object({
  searchTerm: z.string().optional(),
});


export default function GuestStudentsPage() {
    const { user } = useAuth();
    const [students, setStudents] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedStudents, setSelectedStudents] = useState<UserProfile[]>([]);
    
    const [isAddStudentDialogOpen, setIsAddStudentDialogOpen] = useState(false);
    const [isBulkAddDialogOpen, setIsBulkAddDialogOpen] = useState(false);

    const [searchTerm, setSearchTerm] = useState("");
    const { toast } = useToast();

    const fetchStudents = useCallback(async () => {
        setIsLoading(true);
        const result = await getAllUsers();
        if (result.success && result.users) {
             const guestStudents = result.users.filter(u => u.role === 'guest');
             setStudents(guestStudents);
        } else {
             toast({ title: "Hata", description: "Öğrenciler yüklenemedi.", variant: "destructive" });
        }
        setIsLoading(false);
    }, [toast]);

    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);
    
    const filteredStudents = useMemo(() => {
        return students.filter(student =>
            student.displayName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [students, searchTerm]);

    const handleCreateGuest = async (data: any) => {
        setIsSaving(true);
        const result = await addGuestStudent(data);
        if (result.success) {
            toast({ title: "Başarılı", description: "Misafir öğrenci başarıyla oluşturuldu." });
            fetchStudents();
            setIsAddStudentDialogOpen(false);
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };
    
    return (
        <Card className="m-4">
            <CardHeader>
                <CardTitle>Misafir Öğrenciler</CardTitle>
                <CardDescription>
                    Yarışmalar ve diğer etkinlikler için geçici misafir öğrenci hesapları oluşturun ve yönetin.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex justify-between items-center mb-4">
                     <Input 
                        placeholder="Öğrenci ara..." 
                        className="max-w-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <div className="flex gap-2">
                        <Button onClick={() => setIsAddStudentDialogOpen(true)}>
                            <UserPlus className="mr-2 h-4 w-4" /> Misafir Ekle
                        </Button>
                    </div>
                </div>

                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Ad Soyad</TableHead>
                                <TableHead>İşlemler</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={2} className="h-24 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredStudents.length > 0 ? (
                                filteredStudents.map(student => (
                                    <TableRow key={student.uid}>
                                        <TableCell className="font-medium">{student.displayName}</TableCell>
                                        <TableCell>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                           "{student.displayName}" adlı misafir öğrenciyi silmek üzeresiniz. Bu işlem geri alınamaz.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>İptal</AlertDialogCancel>
                                                        <AlertDialogAction disabled={isSaving} onClick={() => {}}>Sil</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={2} className="h-24 text-center">
                                        Misafir öğrenci bulunamadı.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
            
            {/* Tekli Ekleme Dialogu */}
             <UserEditorDialog
                isOpen={isAddStudentDialogOpen}
                onOpenChange={setIsAddStudentDialogOpen}
                user={null}
                onSave={handleCreateGuest}
                isSaving={isSaving}
                classes={[]} 
            />
        </Card>
    )
}
