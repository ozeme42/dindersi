

'use client';

import { useState, useEffect, useMemo, useCallback } from "react";
import { getStudentData, saveUser, deleteStudents, bulkAddStudents } from './actions';
import type { UserProfile, SchoolClass, School } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { useToast } from "@/hooks/use-toast";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, PlusCircle, Trash2, MoreHorizontal, User, GraduationCap, School as SchoolIcon, Upload } from "lucide-react";
import { UserEditorDialog } from "@/components/user-editor-dialog";
import { UserAvatar } from "@/components/user-avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import Link from 'next/link';
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function StudentsPage() {
    const { user: teacherUser } = useAuth();
    const [students, setStudents] = useState<UserProfile[]>([]);
    const [classes, setClasses] = useState<SchoolClass[]>([]);
    const [schools, setSchools] = useState<School[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filter, setFilter] = useState<{ class: string, school: string }>({ class: "all", school: "all" });
    const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
    const { toast } = useToast();

    // Dialog States
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingUser, setEditingUser] = useState<Partial<UserProfile> | null>(null);

    // New states for bulk add
    const [isBulkAdding, setIsBulkAdding] = useState(false);
    const [bulkStudentNames, setBulkStudentNames] = useState("");
    const [bulkClassId, setBulkClassId] = useState("");
    const [bulkBranch, setBulkBranch] = useState("");
    const [bulkSchoolId, setBulkSchoolId] = useState("");
    const [newBulkSchoolName, setNewBulkSchoolName] = useState("");


    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const { students, classes, schools } = await getStudentData();
        setStudents(students);
        setClasses(classes);
        setSchools(schools);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSaveUser = async (data: any) => {
        setIsSaving(true);
        
        let classString = data.class || '';
        if (data.classId && data.branch) {
            const selectedClass = classes.find(c => c.id === data.classId);
            if (selectedClass) {
                classString = `${selectedClass.name} - ${data.branch}`;
            }
        }
        
        let schoolString = data.schoolName || '';
        if(data.schoolId) {
            if(data.schoolId === 'new') {
                schoolString = data.newSchoolName.trim();
            } else {
                const selectedSchool = schools.find(s => s.id === data.schoolId);
                if (selectedSchool) schoolString = selectedSchool.name;
            }
        }

        const payload = { ...data, class: classString, schoolName: schoolString };
        
        const result = await saveUser(payload);
        if (result.success) {
            toast({ title: 'Başarılı', description: 'Kullanıcı bilgileri kaydedildi.' });
            setIsEditorOpen(false);
            fetchData();
        } else {
            toast({ title: 'Hata', description: result.error, variant: 'destructive' });
        }
        setIsSaving(false);
    };

    const handleDeleteSelected = async () => {
        const result = await deleteStudents(Array.from(selectedStudents));
        if (result.success) {
            toast({ title: 'Başarılı', description: `${selectedStudents.size} öğrenci silindi.` });
            setSelectedStudents(new Set());
            fetchData();
        } else {
            toast({ title: 'Hata', description: result.error, variant: 'destructive' });
        }
    };
    
    const handleNewUser = () => {
        setEditingUser(null);
        setIsEditorOpen(true);
    };
    
    const handleEditUser = (student: UserProfile) => {
        setEditingUser(student);
        setIsEditorOpen(true);
    };

    const handleBulkSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const names = bulkStudentNames.split('\n').filter(name => name.trim() !== '');
        if (names.length === 0 || !bulkClassId || !bulkBranch) {
            toast({ title: 'Eksik Bilgi', description: 'Lütfen eklenecek öğrencilerin adlarını, sınıfını ve şubesini seçin.', variant: 'destructive' });
            return;
        }

        setIsBulkAdding(true);
        
        let finalSchoolName = '';
        if (bulkSchoolId === 'new') {
            finalSchoolName = newBulkSchoolName.trim();
        } else {
            const selectedSchool = schools.find(s => s.id === bulkSchoolId);
            finalSchoolName = selectedSchool?.name || '';
        }
        
        if(!finalSchoolName){
             toast({ title: 'Eksik Bilgi', description: 'Lütfen bir okul seçin veya yeni bir okul adı girin.', variant: 'destructive' });
             setIsBulkAdding(false);
             return;
        }

        const selectedClass = classes.find(c => c.id === bulkClassId);
        const className = `${selectedClass?.name} - ${bulkBranch}`;

        const result = await bulkAddStudents(names, className, finalSchoolName);

        if (result.success) {
            toast({ title: 'Başarılı', description: `${result.successCount} öğrenci başarıyla eklendi.` });
            setBulkStudentNames('');
            fetchData();
        } else {
            toast({ title: 'Hata', description: result.error, variant: 'destructive' });
        }
        setIsBulkAdding(false);
    };


    const filteredStudents = useMemo(() => {
        return students.filter(student => {
            const matchesSearch = student.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || (student.email && student.email.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesClass = filter.class === 'all' || student.class === filter.class;
            const matchesSchool = filter.school === 'all' || student.schoolName === filter.school;
            return matchesSearch && matchesClass && matchesSchool;
        });
    }, [students, searchTerm, filter]);

    const toggleSelectAll = () => {
        if (selectedStudents.size === filteredStudents.length) {
            setSelectedStudents(new Set());
        } else {
            setSelectedStudents(new Set(filteredStudents.map(s => s.uid)));
        }
    };

    const toggleStudentSelection = (uid: string) => {
        const newSelection = new Set(selectedStudents);
        if (newSelection.has(uid)) {
            newSelection.delete(uid);
        } else {
            newSelection.add(uid);
        }
        setSelectedStudents(newSelection);
    };

    if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    const uniqueClasses = Array.from(new Set(students.map(s => s.class).filter(Boolean)));
    const uniqueSchools = Array.from(new Set(students.map(s => s.schoolName).filter(Boolean)));

    const selectedBulkClassData = classes.find(c => c.id === bulkClassId);


    return (
        <div className="container mx-auto p-4 sm:p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                <h1 className="text-3xl font-bold font-headline">Öğrenci Yönetimi</h1>
            </div>

            <Tabs defaultValue="list">
                <TabsList className="mb-4">
                    <TabsTrigger value="list">Öğrenci Listesi</TabsTrigger>
                    <TabsTrigger value="add">Yeni Ekle</TabsTrigger>
                </TabsList>

                <TabsContent value="list">
                     <div className="flex flex-col md:flex-row gap-4 mb-4">
                        <Input placeholder="Öğrenci ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-sm"/>
                        <Select value={filter.class} onValueChange={(value) => setFilter(prev => ({...prev, class: value}))}>
                            <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Sınıfa Göre Filtrele"/></SelectTrigger>
                            <SelectContent><SelectItem value="all">Tüm Sınıflar</SelectItem>{uniqueClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={filter.school} onValueChange={(value) => setFilter(prev => ({...prev, school: value}))}>
                            <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Okula Göre Filtrele"/></SelectTrigger>
                            <SelectContent><SelectItem value="all">Tüm Okullar</SelectItem>{uniqueSchools.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                        {selectedStudents.size > 0 && (
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4"/> {selectedStudents.size} Öğrenciyi Sil</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Emin misiniz?</AlertDialogTitle><AlertDialogDescription>Seçili {selectedStudents.size} öğrenci kalıcı olarak silinecektir. Bu işlem geri alınamaz.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={handleDeleteSelected}>Evet, Sil</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12"><Checkbox checked={selectedStudents.size > 0 && selectedStudents.size === filteredStudents.length && filteredStudents.length > 0} onCheckedChange={toggleSelectAll} /></TableHead>
                                    <TableHead>Ad Soyad</TableHead>
                                    <TableHead>Okul</TableHead>
                                    <TableHead>Sınıf</TableHead>
                                    <TableHead className="text-right">Puan</TableHead>
                                    <TableHead className="w-12"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredStudents.length > 0 ? filteredStudents.map(student => (
                                    <TableRow key={student.uid}>
                                        <TableCell><Checkbox checked={selectedStudents.has(student.uid)} onCheckedChange={() => toggleStudentSelection(student.uid)} /></TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <UserAvatar user={student} />
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{student.displayName}</span>
                                                    <span className="text-xs text-muted-foreground">{student.email}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm flex items-center gap-2 pt-6"><SchoolIcon className="h-4 w-4"/> {student.schoolName || '-'}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm flex items-center gap-2 pt-6"><GraduationCap className="h-4 w-4"/> {student.class || '-'}</TableCell>
                                        <TableCell className="text-right font-mono">{student.score || 0}</TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem asChild><Link href={`/teacher/students/${student.uid}`}>Detayları Gör</Link></DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleEditUser(student)}>Düzenle</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )) : <TableRow><TableCell colSpan={6} className="text-center h-24">Filtreye uygun öğrenci bulunamadı.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>
                <TabsContent value="add">
                     <Tabs defaultValue="single">
                        <TabsList className="mb-4">
                            <TabsTrigger value="single">Tek Tek Ekle</TabsTrigger>
                            <TabsTrigger value="bulk">Toplu Liste Ekle</TabsTrigger>
                        </TabsList>
                        <TabsContent value="single">
                            <Card className="max-w-xl">
                                <CardHeader>
                                    <CardTitle>Yeni Öğrenci Oluştur</CardTitle>
                                    <CardDescription>Yeni bir öğrenci hesabı oluşturun.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button onClick={handleNewUser} className="w-full"><PlusCircle className="mr-2 h-4 w-4"/> Formu Aç</Button>
                                </CardContent>
                            </Card>
                        </TabsContent>
                         <TabsContent value="bulk">
                           <Card className="max-w-xl">
                             <CardHeader>
                                <CardTitle>Toplu Öğrenci Ekle</CardTitle>
                                <CardDescription>Her satıra bir öğrenci gelecek şekilde isim listesini yapıştırın.</CardDescription>
                             </CardHeader>
                             <form onSubmit={handleBulkSave}>
                                 <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                         <div>
                                            <Label htmlFor="bulk-class">Sınıf</Label>
                                            <Select value={bulkClassId} onValueChange={setBulkClassId}>
                                                <SelectTrigger id="bulk-class"><SelectValue placeholder="Sınıf Seç"/></SelectTrigger>
                                                <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                         </div>
                                         <div>
                                            <Label htmlFor="bulk-branch">Şube</Label>
                                            <Select value={bulkBranch} onValueChange={setBulkBranch} disabled={!selectedBulkClassData}>
                                                <SelectTrigger id="bulk-branch"><SelectValue placeholder="Şube Seç"/></SelectTrigger>
                                                <SelectContent>{selectedBulkClassData?.branches?.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                                            </Select>
                                         </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="bulk-school">Okul</Label>
                                        <Select value={bulkSchoolId} onValueChange={setBulkSchoolId}>
                                            <SelectTrigger id="bulk-school"><SelectValue placeholder="Okul Seçin..." /></SelectTrigger>
                                            <SelectContent>{schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}<SelectItem value="new"><span className="flex items-center gap-2"><PlusCircle className="h-4 w-4 text-cyan-400"/>Diğer (Yeni Okul Ekle)</span></SelectItem></SelectContent>
                                        </Select>
                                    </div>
                                    {bulkSchoolId === 'new' && (
                                        <div className="space-y-2">
                                            <Label htmlFor="new-bulk-school-name">Yeni Okul Adı</Label>
                                            <Input id="new-bulk-school-name" value={newBulkSchoolName} onChange={e => setNewBulkSchoolName(e.target.value)} placeholder="Okulun tam adını girin"/>
                                        </div>
                                    )}
                                    <div>
                                         <Label htmlFor="bulk-names">Öğrenci Adları</Label>
                                         <Textarea id="bulk-names" value={bulkStudentNames} onChange={e => setBulkStudentNames(e.target.value)} placeholder="Ahmet Yılmaz&#10;Ayşe Kaya&#10;Mehmet Doğan" className="min-h-[200px]"/>
                                    </div>
                                 </CardContent>
                                 <CardFooter>
                                     <Button type="submit" className="w-full" disabled={isBulkAdding}>
                                        {isBulkAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                        <Upload className="mr-2 h-4 w-4"/> Listeyi İçe Aktar
                                     </Button>
                                 </CardFooter>
                             </form>
                           </Card>
                        </TabsContent>
                     </Tabs>
                </TabsContent>
            </Tabs>

            <UserEditorDialog isOpen={isEditorOpen} onOpenChange={setIsEditorOpen} user={editingUser} onSave={handleSaveUser} isSaving={isSaving} classes={classes} schools={schools} />
        </div>
    );
}
