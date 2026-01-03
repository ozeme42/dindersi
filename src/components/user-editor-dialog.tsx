
"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { UserProfile, SchoolClass, School } from "@/lib/types";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, PlusCircle } from "lucide-react";

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


export function UserEditorDialog({ isOpen, onOpenChange, user, onSave, isSaving, classes, schools }: { 
    isOpen: boolean, 
    onOpenChange: (open: boolean) => void, 
    user: Partial<UserProfile> | null, 
    onSave: (data: z.infer<typeof UserEditorSchema>) => void,
    isSaving: boolean,
    classes: SchoolClass[],
    schools: School[],
}) {
    const { register, handleSubmit, control, watch, formState: { errors }, reset, setValue } = useForm<z.infer<typeof UserEditorSchema>>({
        resolver: zodResolver(UserEditorSchema),
        defaultValues: {
            displayName: '',
            email: '',
            role: 'student',
            classId: '',
            branch: '',
            schoolId: '',
            score: 0,
            password: '',
            newSchoolName: '',
        }
    });

    const role = watch("role");
    const classId = watch("classId");
    const schoolId = watch("schoolId");
    
    const selectedClass = classes.find(c => c.id === classId);

    useEffect(() => {
        if (isOpen) {
            if (user) {
                const [className, branch] = user.class?.split(' - ') || ['', ''];
                const userClass = classes.find(c => c.name === className);
                const userSchool = schools.find(s => s.name === user.schoolName);
                
                reset({
                    uid: user.uid,
                    displayName: user.displayName || '',
                    email: user.email || '',
                    role: user.role || 'student',
                    classId: userClass?.id || '',
                    branch: branch || '',
                    schoolId: userSchool?.id || '',
                    score: user.score || 0,
                    password: '',
                    newSchoolName: '',
                });
            } else {
                reset({
                    displayName: '', email: '', role: 'student', classId: '', branch: '', score: 0, password: '', schoolId: '', newSchoolName: '',
                });
            }
        }
    }, [user, isOpen, reset, classes, schools]);


    const onSubmit = (data: z.infer<typeof UserEditorSchema>) => {
        onSave(data);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{user?.uid ? "Kullanıcıyı Düzenle" : "Yeni Kullanıcı Oluştur"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="grid gap-4 py-4">
                        <div>
                            <Label htmlFor="displayName">Ad Soyad</Label>
                            <Input id="displayName" {...register("displayName")} />
                            {errors.displayName && <p className="text-sm text-destructive mt-1">{errors.displayName.message}</p>}
                        </div>
                        <div>
                            <Label htmlFor="email">E-posta</Label>
                            <Input id="email" type="email" {...register("email")} disabled={!!user?.uid} />
                            {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
                        </div>
                         <div>
                            <Label htmlFor="password">{user?.uid ? 'Yeni Şifre (değişmeyecekse boş bırakın)' : 'Şifre'}</Label>
                            <Input id="password" type="password" {...register("password")} placeholder={user?.uid ? 'Değiştirmek istemiyorsanız boş bırakın' : ''} />
                            {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
                        </div>
                        <div>
                            <Label htmlFor="role">Rol</Label>
                            <Controller name="role" control={control} render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="student">Öğrenci</SelectItem>
                                        <SelectItem value="teacher">Öğretmen</SelectItem>
                                        <SelectItem value="superadmin">Süper Admin</SelectItem>
                                        <SelectItem value="guest">Misafir Öğrenci</SelectItem>
                                    </SelectContent>
                                </Select>
                            )} />
                        </div>
                        {(role === 'student' || role === 'guest') && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label htmlFor="classId">Sınıf</Label>
                                        <Controller control={control} name="classId" render={({ field }) => (
                                            <Select onValueChange={(value) => { field.onChange(value); setValue('branch', ''); }} value={field.value || ''}>
                                                <SelectTrigger id="classId"><SelectValue placeholder="Sınıf Seçin" /></SelectTrigger>
                                                <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                        )}/>
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="branch">Şube</Label>
                                        <Controller control={control} name="branch" render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value || ''} disabled={!selectedClass}>
                                                <SelectTrigger id="branch"><SelectValue placeholder="Şube Seçin" /></SelectTrigger>
                                                <SelectContent>{selectedClass?.branches?.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                                            </Select>
                                        )}/>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="schoolId">Okul</Label>
                                    <Controller control={control} name="schoolId" render={({ field }) => (
                                        <Select onValueChange={(value) => { field.onChange(value); if(value !== 'new') setValue('newSchoolName', ''); }} value={field.value || ''}>
                                            <SelectTrigger id="schoolId"><SelectValue placeholder="Okul Seçin" /></SelectTrigger>
                                            <SelectContent>
                                                {schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                                <SelectItem value="new"><span className="flex items-center gap-2"><PlusCircle className="h-4 w-4 text-cyan-400"/>Diğer (Yeni Okul Ekle)</span></SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}/>
                                </div>
                                {schoolId === 'new' && (
                                    <div className="space-y-1 animate-in slide-in-from-top-2">
                                        <Label htmlFor="newSchoolName">Yeni Okul Adı</Label>
                                        <Input id="newSchoolName" {...register("newSchoolName")} placeholder="Okulun tam adını girin"/>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="ghost">İptal</Button></DialogClose>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Kaydet
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
