
'use client';

import { useState, useEffect, useMemo, useCallback } from "react";
import { 
  User, Download, AlertTriangle, Loader2, Book, FileQuestion, List, FileJson, 
  Server, ClipboardList, DollarSign, Shield, Filter, Home, UserPlus, Trash2, 
  ArrowLeft, ArrowRight, UserCog, UserCheck, MoreHorizontal, FilePenLine, 
  GraduationCap, School as SchoolIcon, LayoutDashboard, Database, Save, 
  HardDriveDownload, Search, Plus, Building2, ArrowRightLeft, CheckSquare, Trophy
} from "lucide-react";

// Server Actions
import { getStudentData } from "@/app/teacher/students/actions";
import { 
  exportAllData, deleteBulkUsers,
  saveSchool, deleteSchool, bulkUpdateStudentSchool,
  exportStaticAdvanced
} from "./actions";
import { archiveAndResetScores, saveLeaderboardSettings, getLeaderboardSettings } from '@/app/teacher/actions';


import { getExamCreationData } from "../exams/actions";
import { saveUser } from "@/app/teacher/students/actions";

// Types & Zod
import type { UserProfile, SchoolClass, Course, Unit, Topic, School } from "@/lib/types";
import { z } from "zod";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from 'next/link';
import { UserAvatar } from "@/components/user-avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { UserEditorDialog } from "@/components/user-editor-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// --- YARDIMCI FONKSİYONLAR ---
function downloadJson(data: any, filename: string) {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    alert("İndirilecek veri bulunamadı.");
    return;
  }
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const slugify = (text: string) => {
    if (!text) return '';
    const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;'
    const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------'
    const p = new RegExp(a.split('').join('|'), 'g')
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-') 
        .replace(p, c => b.charAt(a.indexOf(c)))
        .replace(/&/g, '-and-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
};

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

// Okul Schema
const SchoolEditorSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(3, "Okul adı en az 3 karakter olmalıdır."),
});

// --- ISTATISTIK KARTI BILEŞENI ---
function StatCard({ title, value, icon: Icon, colorClass }: { title: string, value: number, icon: any, colorClass: string }) {
    return (
        <Card className="bg-slate-900/50 border-white/10 backdrop-blur-sm overflow-hidden relative">
            <div className={`absolute top-0 right-0 p-4 opacity-10 ${colorClass}`}>
                <Icon className="h-24 w-24" />
            </div>
            <CardHeader className="pb-2">
                <CardDescription>{title}</CardDescription>
                <CardTitle className="text-3xl font-bold text-white flex items-center gap-2">
                    {value}
                </CardTitle>
            </CardHeader>
        </Card>
    )
}

function LeaderboardSettingsCard() {
    const { toast } = useToast();
    const [settings, setSettings] = useState({ seasonName: '' });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [resetStep, setResetStep] = useState(0);

    const fetchSettings = useCallback(async () => {
        setIsLoading(true);
        const data = await getLeaderboardSettings();
        setSettings(data);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const handleSave = async () => {
        setIsSaving(true);
        const result = await saveLeaderboardSettings(settings);
        if (result.success) {
            toast({ title: "Başarılı", description: "Liderlik tablosu ayarları kaydedildi." });
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    const handleSeasonFinale = async () => {
        setIsResetting(true);
        const result = await archiveAndResetScores(settings.seasonName);
        if (result.success) {
            toast({ title: "Sezon Finali Başarılı!", description: "Tüm puanlar arşivlendi ve sıfırlandı. Yeni sezon başlıyor!" });
            await fetchSettings();
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsResetting(false);
        setResetStep(0);
    }

    if (isLoading) {
        return <div className="flex justify-center items-center h-48"><Loader2 className="animate-spin h-8 w-8 text-indigo-400" /></div>
    }

    return (
        <Card className="bg-slate-900/60 border-white/10 backdrop-blur-md shadow-xl h-full flex flex-col">
            <CardHeader>
                <CardTitle className="text-xl text-white flex items-center gap-2"><Trophy className="h-5 w-5 text-yellow-400"/> Liderlik Tablosu Ayarları</CardTitle>
                <CardDescription>Mevcut sezon adını ve diğer ayarları yönetin.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 flex-grow">
                <div className="space-y-2">
                    <Label htmlFor="seasonName" className="text-slate-300">Mevcut Sezon Adı</Label>
                    <Input 
                        id="seasonName"
                        value={settings.seasonName}
                        onChange={(e) => setSettings({ ...settings, seasonName: e.target.value })}
                        className="bg-slate-950 border-white/10 text-white h-11"
                    />
                </div>
            </CardContent>
            <CardFooter className="flex-col gap-4 border-t border-white/5 pt-4">
                 <Button onClick={handleSave} disabled={isSaving} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4"/>}
                    Ayarları Kaydet
                 </Button>
                
                 <AlertDialog open={resetStep > 0} onOpenChange={(open) => !open && setResetStep(0)}>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full bg-red-800 hover:bg-red-700">
                            <Shield className="mr-2 h-4 w-4"/> Sezon Finali Yap
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
                       {resetStep === 1 ? (
                            <>
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-amber-400">Son Onay</AlertDialogTitle>
                                    <AlertDialogDescription className="text-slate-400">
                                        "{settings.seasonName}" sezonu arşivlenecek ve **TÜM** genel öğrenci puanları sıfırlanacak. Bu işlem geri alınamaz.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setResetStep(0)} className="bg-transparent border-white/10 text-slate-300 hover:bg-white/5 hover:text-white">İptal</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleSeasonFinale} disabled={isResetting} className="bg-red-600 hover:bg-red-700 text-white">
                                        {isResetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Evet, Arşivle ve Sıfırla"}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </>
                       ) : (
                             <AlertDialogHeader>
                                <AlertDialogTitle>Sezon Finali</AlertDialogTitle>
                                <AlertDialogDescription className="text-slate-400">
                                   Bu işlem, mevcut liderlik tablosunu "{settings.seasonName}" adıyla arşivleyecek ve tüm öğrencilerin genel puanlarını sıfırlayacaktır.
                                </AlertDialogDescription>
                                <AlertDialogFooter className="pt-4">
                                     <AlertDialogCancel onClick={() => setResetStep(0)} className="bg-transparent border-white/10 text-slate-300 hover:bg-white/5 hover:text-white">İptal</AlertDialogCancel>
                                    <Button onClick={() => setResetStep(1)} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                                        Devam Et <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </AlertDialogFooter>
                             </AlertDialogHeader>
                       )}
                    </AlertDialogContent>
                </AlertDialog>
            </CardFooter>
        </Card>
    );
}

export default function SuperAdminPage() {
  const { toast } = useToast();
  
  // Data States
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [allClasses, setAllClasses] = useState<SchoolClass[]>([]);
  const [allCourses, setAllCourses] = useState<(Course & { units: (Unit & { topics: Topic[] })[] })[]>([]);
  
  // Loading & Filter States
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  
  const [isExportingAdvanced, setIsExportingAdvanced] = useState(false);
  const [staticFilters, setStaticFilters] = useState<{classId: string, courseId: string, unitId: string, topicId: string}>({
      classId: 'all', courseId: 'all', unitId: 'all', topicId: 'all',
  });
  const [exportTypes, setExportTypes] = useState({
      manifest: true,
      ozet: true,
      flow: true,
      questions: true,
      activities: true,
      notes: true
  });
  
  const [filters, setFilters] = useState<{classId: string, courseId: string, unitId: string, topicId: string}>({
      classId: 'all', courseId: 'all', unitId: 'all', topicId: 'all',
  });
  
  const [dialogState, setDialogState] = useState<{isOpen: boolean; user: Partial<UserProfile> | null}>({isOpen: false, user: null});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  const [bulkSchoolDialog, setBulkSchoolDialog] = useState(false);
  const [selectedTargetSchoolId, setSelectedTargetSchoolId] = useState<string>("");
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const [schoolDialogState, setSchoolDialogState] = useState<{isOpen: boolean; school: School | null}>({isOpen: false, school: null});
  const [schoolNameInput, setSchoolNameInput] = useState("");
  const [isSavingSchool, setIsSavingSchool] = useState(false);

  const [studentsCurrentPage, setStudentsCurrentPage] = useState(1);
  const [teachersCurrentPage, setTeachersCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [searchTerm, setSearchTerm] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("all");

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { students, classes, schools } = await getStudentData();
      setUsers(students);
      setAllClasses(classes);
      setSchools(schools);

      const curriculumData = await getExamCreationData();
      if (!curriculumData.error) {
        setAllCourses(curriculumData.courses);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast({ title: "Veri Yüklenemedi", description: "Gerekli veriler getirilirken bir hata oluştu.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Derived Data & Filtering
  const students = useMemo(() => {
      return users.filter(u => {
          const isStudentRole = u.role === 'student' || u.role === 'pending';
          const isNotVirtual = u.role !== 'guest' && !(u as any).isVirtual; 
          return isStudentRole && isNotVirtual;
      });
  }, [users]);

  const teachers = useMemo(() => users.filter(u => u.role === 'teacher'), [users]);
  
  const filterList = (list: UserProfile[]) => {
      return list.filter(item => {
          const matchesSearch = item.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || item.email?.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesSchool = schoolFilter === 'all' || item.schoolName === schools.find(s => s.id === schoolFilter)?.name;
          return matchesSearch && matchesSchool;
      });
  };

  const filteredStudents = useMemo(() => filterList(students), [students, searchTerm, schoolFilter, schools]);
  const filteredTeachers = useMemo(() => filterList(teachers), [teachers, searchTerm, schoolFilter, schools]);
  
  const paginatedStudents = useMemo(() => {
      const startIndex = (studentsCurrentPage - 1) * itemsPerPage;
      return filteredStudents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredStudents, studentsCurrentPage]);

   const paginatedTeachers = useMemo(() => {
      const startIndex = (teachersCurrentPage - 1) * itemsPerPage;
      return filteredTeachers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTeachers, teachersCurrentPage]);

  const totalStudentPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const totalTeacherPages = Math.ceil(filteredTeachers.length / itemsPerPage);

  // --- HANDLERS: USER ---
  const handleOpenDialog = (user: Partial<UserProfile> | null = null, role: 'student' | 'teacher') => {
      const defaultUser = { role };
      setDialogState({ isOpen: true, user: user || defaultUser });
  };

  const handleSaveUser = async (data: z.infer<typeof UserEditorSchema>) => {
    setIsSaving(true);
    const fullClassName = data.classId && data.branch ? `${allClasses.find(c => c.id === data.classId)?.name} - ${data.branch}` : data.classId ? allClasses.find(c => c.id === data.classId)?.name : undefined;
    let schoolName = data.schoolId === 'new' ? data.newSchoolName : schools.find(s => s.id === data.schoolId)?.name;
    const dataToSave = { ...data, class: fullClassName, schoolName: schoolName };

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
  
  const handleDeleteUser = async (userId: string) => {
    if(!confirm("Kullanıcıyı silmek istediğinize emin misiniz?")) return;
    const originalUsers = [...users];
    setUsers(prev => prev.filter(s => s.uid !== userId));
    const result = await deleteBulkUsers([userId]);
    if (result.success) {
        toast({ title: "Başarılı", description: "Kullanıcı silindi." });
        await fetchAllData();
        setSelectedUserIds(prev => { const newSet = new Set(prev); newSet.delete(userId); return newSet; });
    } else {
          toast({ title: "Hata", description: result.error, variant: "destructive" });
          setUsers(originalUsers);
    }
  };
  
   const handleBulkDelete = async () => {
    setIsDeleting(true);
    const originalUsers = [...users];
    setUsers(prev => prev.filter(user => !selectedUserIds.has(user.uid)));

    const result = await deleteBulkUsers(Array.from(selectedUserIds));
    if (result.success) {
        toast({ title: "Başarılı", description: `${result.deletedCount} kullanıcı silindi.` });
        await fetchAllData(); 
    } else {
        toast({ title: "Hata", description: result.error, variant: "destructive" });
        setUsers(originalUsers);
    }
    setSelectedUserIds(new Set());
    setIsDeleting(false);
  };

  // --- HANDLER: BULK SCHOOL UPDATE ---
  const handleBulkSchoolUpdate = async () => {
      if (!selectedTargetSchoolId) {
          toast({ title: "Hata", description: "Lütfen bir okul seçiniz.", variant: "destructive" });
          return;
      }
      
      const targetSchool = schools.find(s => s.id === selectedTargetSchoolId);
      if (!targetSchool) return;

      setIsBulkUpdating(true);
      const result = await bulkUpdateStudentSchool(
          Array.from(selectedUserIds),
          targetSchool.id,
          targetSchool.name
      );

      if (result.success) {
          toast({ title: "Başarılı", description: `${result.count} öğrencinin okulu güncellendi.` });
          await fetchAllData();
          setBulkSchoolDialog(false);
          setSelectedUserIds(new Set());
          setSelectedTargetSchoolId("");
      } else {
          toast({ title: "Hata", description: result.error, variant: "destructive" });
      }
      setIsBulkUpdating(false);
  };


  // --- HANDLERS: SCHOOL ---
  const handleOpenSchoolDialog = (school: School | null = null) => {
      setSchoolNameInput(school ? school.name : "");
      setSchoolDialogState({ isOpen: true, school });
  };

  const handleSaveSchool = async () => {
      try {
          SchoolEditorSchema.parse({ name: schoolNameInput });
      } catch (error: any) {
          toast({ title: "Hata", description: error.errors[0].message, variant: "destructive" });
          return;
      }

      setIsSavingSchool(true);
      const result = await saveSchool({
          id: schoolDialogState.school?.id,
          name: schoolNameInput
      });

      if (result.success) {
          toast({ title: "Başarılı", description: `Okul ${schoolDialogState.school ? 'güncellendi' : 'eklendi'}.` });
          await fetchAllData();
          setSchoolDialogState({ isOpen: false, school: null });
      } else {
          toast({ title: "Hata", description: result.error, variant: "destructive" });
      }
      setIsSavingSchool(false);
  };

  const handleDeleteSchool = async (schoolId: string) => {
      const hasUsers = users.some(u => u.schoolName === schools.find(s => s.id === schoolId)?.name);
      if (hasUsers) {
          toast({ title: "Silinemez", description: "Bu okula kayıtlı kullanıcılar var. Önce kullanıcıları silin veya taşıyın.", variant: "destructive" });
          return;
      }

      if(!confirm("Bu okulu silmek istediğinize emin misiniz?")) return;

      const result = await deleteSchool(schoolId);
      if (result.success) {
          toast({ title: "Başarılı", description: "Okul silindi." });
          await fetchAllData();
      } else {
          toast({ title: "Hata", description: result.error, variant: "destructive" });
      }
  };

  // --- HANDLERS: EXPORT ---
  const handleDownload = async (dataType: 'users' | 'curriculum' | 'questions' | 'examQuestions' | 'assignments' | 'scoreEvents' | 'activity-items' | 'yazilacaklar', baseFilename: string) => {
    setIsDownloading(dataType);
    let filenameParts = [];
    if (filters.classId && filters.classId !== 'all') {
        const className = allClasses.find(c => c.id === filters.classId)?.name || filters.classId;
        filenameParts.push(slugify(className));
    }
    const filename = `${filenameParts.join('_')}_${baseFilename}.json`;
    
    try {
      const data = await exportAllData(dataType, filters);
      downloadJson(data, filename);
    } catch (e: any) {
      toast({ title: "İndirme Hatası", description: `Hata: ${e.message}`, variant: "destructive" });
    } finally {
      setIsDownloading(null);
    }
  };
  
  const handleAdvancedExport = async () => {
      if (!Object.values(exportTypes).some(v => v)) {
          toast({ title: "Hata", description: "En az bir veri tipi seçmelisiniz.", variant: "destructive" });
          return;
      }

      setIsExportingAdvanced(true);
      try {
          const result = await exportStaticAdvanced(staticFilters, Object.keys(exportTypes).filter(k => exportTypes[k as keyof typeof exportTypes]));
          if (result.success) {
              toast({ title: "Başarılı", description: result.message });
          } else {
              throw new Error(result.error);
          }
      } catch (e: any) {
           toast({ title: "Dışa Aktarma Hatası", description: `Hata: ${e.message}`, variant: "destructive" });
      } finally {
          setIsExportingAdvanced(false);
      }
  };

  const availableCourses = useMemo(() => {
    if (staticFilters.classId === 'all') return allCourses;
    return allCourses.filter(c => c.classId === staticFilters.classId);
  }, [allCourses, staticFilters.classId]);

  const availableUnits = useMemo(() => {
    if (staticFilters.courseId === 'all') return [];
    const course = allCourses.find(c => c.id === staticFilters.courseId);
    return course ? course.units : [];
  }, [allCourses, staticFilters.courseId]);

  const availableTopics = useMemo(() => {
    if (staticFilters.unitId === 'all') return [];
    const unit = availableUnits.find(u => u.id === staticFilters.unitId);
    return unit ? unit.topics : [];
  }, [availableUnits, staticFilters.unitId]);


  const dataSections = [
    { type: 'users', title: "Kullanıcılar", icon: <User className="mr-2 h-4 w-4"/>, filename: "kullanicilar", desc: "Tüm öğrenci ve öğretmen verileri" },
    { type: 'curriculum', title: "Müfredat", icon: <Book className="mr-2 h-4 w-4"/>, filename: "mufredat", desc: "Ders, ünite ve konu yapıları" },
    { type: 'questions', title: "Soru Bankası", icon: <FileQuestion className="mr-2 h-4 w-4"/>, filename: "soru_bankasi", desc: "Sisteme kayıtlı tüm sorular" },
    { type: 'examQuestions', title: "Deneme Soruları", icon: <Shield className="mr-2 h-4 w-4"/>, filename: "deneme_sorulari", desc: "Oluşturulan sınavlar" },
    { type: 'assignments', title: "Ödevler", icon: <ClipboardList className="mr-2 h-4 w-4"/>, filename: "odevler", desc: "Aktif ve geçmiş ödevler" },
    { type: 'scoreEvents', title: "Puanlar", icon: <DollarSign className="mr-2 h-4 w-4"/>, filename: "puan_hareketleri", desc: "Puan geçmişi ve hareketleri" },
    { type: 'activity-items', title: "Etkinlikler", icon: <List className="mr-2 h-4 w-4"/>, filename: "etkinlik_verileri", desc: "Oyun ve etkinlik içerikleri" },
    { type: 'yazilacaklar', title: "Yazılacaklar", icon: <FileJson className="mr-2 h-4 w-4"/>, filename: "yazilacaklar", desc: "Bekleyen işlemler listesi" },
  ];

  if (isLoading) {
      return (
          <div className="flex h-screen w-full items-center justify-center bg-slate-950">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-16 w-16 animate-spin text-indigo-500" />
                <p className="text-slate-400 animate-pulse">Sistem verileri yükleniyor...</p>
              </div>
          </div>
      );
  }

  const handleSelectUser = (userId: string) => {
    setSelectedUserIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(userId)) newSet.delete(userId);
        else newSet.add(userId);
        return newSet;
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-4 sm:p-6 lg:p-8 relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none z-0">
             <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-indigo-900/10 rounded-full blur-[150px]" />
             <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[150px]" />
        </div>

        <main className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8 relative z-10">
             {/* HEADER */}
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/10 pb-8">
                <div className="flex items-center gap-5">
                    <Link href="/teacher" className="group">
                        <div className="flex items-center justify-center h-16 w-16 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl shadow-indigo-900/20 group-hover:border-indigo-500/50 group-hover:scale-105 transition-all">
                            <Shield className="h-8 w-8 text-indigo-400 group-hover:text-indigo-300" />
                        </div>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight">Süper Admin Paneli</h1>
                        <p className="text-slate-400 font-medium">Sistem genelini yönetin, yedekleyin ve yapılandırın.</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button asChild variant="outline" className="border-white/10 hover:bg-white/5 bg-slate-900/50 backdrop-blur-md">
                        <Link href="/teacher"><Home className="mr-2 h-4 w-4"/>Panele Dön</Link>
                    </Button>
                </div>
            </div>

            {/* QUICK STATS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Toplam Öğrenci" value={students.length} icon={GraduationCap} colorClass="text-emerald-500" />
                <StatCard title="Toplam Öğretmen" value={teachers.length} icon={UserCog} colorClass="text-amber-500" />
                <StatCard title="Kayıtlı Okul" value={schools.length} icon={SchoolIcon} colorClass="text-purple-500" />
                <StatCard title="Toplam Sınıf" value={allClasses.length} icon={LayoutDashboard} colorClass="text-blue-500" />
            </div>

            <Tabs defaultValue="management" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px] bg-slate-900/50 border border-white/10 p-1 rounded-xl">
                    <TabsTrigger value="management" className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Veri Yönetimi</TabsTrigger>
                    <TabsTrigger value="tools" className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Sistem Araçları</TabsTrigger>
                </TabsList>
                
                <TabsContent value="management" className="space-y-6">
                    <Card className="bg-slate-900/60 border-white/10 backdrop-blur-md shadow-xl">
                         {/* ... (Bu kısımlar değişmedi, aynen korundu) ... */}
                        <CardHeader className="border-b border-white/5 pb-4">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <CardTitle className="text-xl text-white flex items-center gap-2"><UserCog className="h-5 w-5 text-indigo-400"/> Veri Yönetim Merkezi</CardTitle>
                                    <CardDescription>Sistemdeki kullanıcıları ve okulları yönetin.</CardDescription>
                                </div>
                                <div className="flex gap-2 w-full md:w-auto">
                                     <Button onClick={() => handleOpenDialog(null, 'student')} className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-500"><UserPlus className="mr-2 h-4 w-4"/> Öğrenci Ekle</Button>
                                     <Button onClick={() => handleOpenDialog(null, 'teacher')} className="flex-1 md:flex-none bg-amber-600 hover:bg-amber-500"><UserPlus className="mr-2 h-4 w-4"/> Öğretmen Ekle</Button>
                                </div>
                            </div>
                            
                            {/* FILTERS */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <Input placeholder="İsim veya e-posta ile ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-slate-950 border-white/10 pl-10 h-10" />
                                </div>
                                <div>
                                    <Select value={schoolFilter} onValueChange={setSchoolFilter}>
                                        <SelectTrigger className="bg-slate-950 border-white/10 h-10"><SelectValue placeholder="Okul Filtrele" /></SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                                            <SelectItem value="all">Tüm Okullar</SelectItem>
                                            {schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardHeader>
                        
                        <CardContent className="p-0">
                            <Tabs defaultValue="students_list" className="w-full">
                                <div className="px-6 py-2 border-b border-white/5 flex justify-between items-center overflow-x-auto">
                                    <TabsList className="bg-transparent h-10 gap-4">
                                        <TabsTrigger value="students_list" className="bg-transparent data-[state=active]:bg-slate-800 data-[state=active]:text-white border border-transparent data-[state=active]:border-white/10 rounded-full px-4 text-slate-400">Öğrenciler ({filteredStudents.length})</TabsTrigger>
                                        <TabsTrigger value="teachers_list" className="bg-transparent data-[state=active]:bg-slate-800 data-[state=active]:text-white border border-transparent data-[state=active]:border-white/10 rounded-full px-4 text-slate-400">Öğretmenler ({filteredTeachers.length})</TabsTrigger>
                                        <TabsTrigger value="schools_list" className="bg-transparent data-[state=active]:bg-slate-800 data-[state=active]:text-white border border-transparent data-[state=active]:border-white/10 rounded-full px-4 text-slate-400 flex items-center gap-2">
                                            <Building2 className="h-3 w-3" /> Okullar ({schools.length})
                                        </TabsTrigger>
                                    </TabsList>
                                     {selectedUserIds.size > 0 && (
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                                                {selectedUserIds.size} kullanıcı seçildi
                                            </Badge>
                                            
                                            <Button variant="outline" size="sm" onClick={() => setBulkSchoolDialog(true)} className="border-indigo-500/30 hover:bg-indigo-500/10 text-indigo-300">
                                                <ArrowRightLeft className="mr-2 h-4 w-4" /> Okul Değiştir
                                            </Button>

                                             <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="destructive" size="sm" disabled={isDeleting}>
                                                        <Trash2 className="mr-2 h-4 w-4" /> Seçilenleri Sil
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                                        <AlertDialogDescription>Seçilen {selectedUserIds.size} kullanıcı ve tüm verileri kalıcı olarak silinecek.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>İptal</AlertDialogCancel>
                                                        <AlertDialogAction onClick={handleBulkDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-500">
                                                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Sil
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    )}
                                </div>

                                {/* STUDENTS TAB */}
                                <TabsContent value="students_list" className="mt-0">
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader className="bg-slate-950/50">
                                                <TableRow className="border-white/5 hover:bg-transparent">
                                                    <TableHead className="px-4"><Checkbox onCheckedChange={checked => {
                                                        const currentIds = new Set(selectedUserIds);
                                                        paginatedStudents.forEach(s => {
                                                            if (checked) currentIds.add(s.uid);
                                                            else currentIds.delete(s.uid);
                                                        });
                                                        setSelectedUserIds(currentIds);
                                                    }} /></TableHead>
                                                    <TableHead className="text-slate-300">Öğrenci</TableHead>
                                                    <TableHead className="text-slate-300">Okul</TableHead>
                                                    <TableHead className="text-slate-300">Sınıf</TableHead>
                                                    <TableHead className="text-slate-300">Puan</TableHead>
                                                    <TableHead className="text-right text-slate-300">İşlemler</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {paginatedStudents.length > 0 ? paginatedStudents.map(student => (
                                                    <TableRow key={student.uid} className="border-white/5 hover:bg-white/5 group">
                                                        <TableCell className="px-4"><Checkbox checked={selectedUserIds.has(student.uid)} onCheckedChange={() => handleSelectUser(student.uid)} /></TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <UserAvatar user={student} className="h-9 w-9 border border-white/10" />
                                                                <div>
                                                                    <div className="font-medium text-white">{student.displayName}</div>
                                                                    <div className="text-xs text-slate-500">{student.email}</div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell><Badge variant="outline" className="border-white/10 text-slate-400 bg-slate-950/50">{student.schoolName || '-'}</Badge></TableCell>
                                                        <TableCell><Badge className="bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30">{student.class || 'N/A'}</Badge></TableCell>
                                                        <TableCell className="font-mono text-amber-500">{student.score}</TableCell>
                                                        <TableCell className="text-right">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-white"><MoreHorizontal className="h-4 w-4"/></Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="bg-slate-900 border-white/10 text-white w-48">
                                                                    <DropdownMenuLabel className="text-slate-500 text-xs uppercase tracking-wider">Seçenekler</DropdownMenuLabel>
                                                                    <DropdownMenuItem onClick={() => handleOpenDialog(student, 'student')}><FilePenLine className="mr-2 h-4 w-4 text-emerald-400"/> Düzenle</DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleDeleteUser(student.uid)} className="text-red-400 focus:text-red-300"><Trash2 className="mr-2 h-4 w-4"/> Sil</DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </TableCell>
                                                    </TableRow>
                                                )) : (
                                                    <TableRow><TableCell colSpan={6} className="h-24 text-center text-slate-500">Kayıt bulunamadı.</TableCell></TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <div className="p-4 border-t border-white/5 flex items-center justify-between">
                                        <span className="text-sm text-slate-500">Sayfa {studentsCurrentPage} / {totalStudentPages}</span>
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="outline" onClick={() => setStudentsCurrentPage(p => Math.max(1, p - 1))} disabled={studentsCurrentPage === 1} className="h-8 border-white/10">Önceki</Button>
                                            <Button size="sm" variant="outline" onClick={() => setStudentsCurrentPage(p => Math.min(totalStudentPages, p + 1))} disabled={studentsCurrentPage === totalStudentPages} className="h-8 border-white/10">Sonraki</Button>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* TEACHERS TAB */}
                                <TabsContent value="teachers_list" className="mt-0">
                                   <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader className="bg-slate-950/50">
                                                <TableRow className="border-white/5 hover:bg-transparent">
                                                    <TableHead className="text-slate-300">Öğretmen</TableHead>
                                                    <TableHead className="text-slate-300">Okul</TableHead>
                                                    <TableHead className="text-slate-300">Rol</TableHead>
                                                    <TableHead className="text-right text-slate-300">İşlemler</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                 {paginatedTeachers.length > 0 ? paginatedTeachers.map(teacher => (
                                                    <TableRow key={teacher.uid} className="border-white/5 hover:bg-white/5">
                                                        <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <UserAvatar user={teacher} className="h-9 w-9 border border-amber-500/30" />
                                                                <div>
                                                                    <div className="font-medium text-white">{teacher.displayName}</div>
                                                                    <div className="text-xs text-slate-500">{teacher.email}</div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell><Badge variant="outline" className="border-white/10 text-slate-400 bg-slate-950/50">{teacher.schoolName || 'Tüm Okullar'}</Badge></TableCell>
                                                        <TableCell><Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border border-amber-500/20">Öğretmen</Badge></TableCell>
                                                        <TableCell className="text-right">
                                                             <div className="flex justify-end gap-2">
                                                                <Button size="sm" variant="ghost" onClick={() => handleOpenDialog(teacher, 'teacher')} className="h-8 w-8 p-0"><FilePenLine className="h-4 w-4"/></Button>
                                                                <Button size="sm" variant="ghost" onClick={() => handleDeleteUser(teacher.uid)} className="h-8 w-8 p-0 text-red-400 hover:text-red-300"><Trash2 className="h-4 w-4"/></Button>
                                                             </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )) : (
                                                    <TableRow><TableCell colSpan={4} className="h-24 text-center text-slate-500">Kayıt bulunamadı.</TableCell></TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <div className="p-4 border-t border-white/5 flex items-center justify-between">
                                        <span className="text-sm text-slate-500">Sayfa {teachersCurrentPage} / {totalTeacherPages}</span>
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="outline" onClick={() => setTeachersCurrentPage(p => Math.max(1, p - 1))} disabled={teachersCurrentPage === 1} className="h-8 border-white/10">Önceki</Button>
                                            <Button size="sm" variant="outline" onClick={() => setTeachersCurrentPage(p => Math.min(totalTeacherPages, p + 1))} disabled={teachersCurrentPage === totalTeacherPages} className="h-8 border-white/10">Sonraki</Button>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* SCHOOLS TAB */}
                                <TabsContent value="schools_list" className="mt-0">
                                    <div className="p-4 border-b border-white/5 flex justify-end">
                                        <Button onClick={() => handleOpenSchoolDialog(null)} className="bg-purple-600 hover:bg-purple-500 text-white">
                                            <Plus className="mr-2 h-4 w-4"/> Yeni Okul Ekle
                                        </Button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader className="bg-slate-950/50">
                                                <TableRow className="border-white/5 hover:bg-transparent">
                                                    <TableHead className="text-slate-300">Okul Adı</TableHead>
                                                    <TableHead className="text-slate-300">ID</TableHead>
                                                    <TableHead className="text-slate-300">Öğrenci Sayısı</TableHead>
                                                    <TableHead className="text-right text-slate-300">İşlemler</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {schools.length > 0 ? schools.map(school => {
                                                    const studentCount = users.filter(u => u.schoolName === school.name).length;
                                                    return (
                                                        <TableRow key={school.id} className="border-white/5 hover:bg-white/5">
                                                            <TableCell className="font-medium text-white">{school.name}</TableCell>
                                                            <TableCell className="font-mono text-xs text-slate-500">{school.id}</TableCell>
                                                            <TableCell><Badge variant="secondary" className="bg-slate-800 text-slate-300">{studentCount} Öğrenci</Badge></TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    <Button size="sm" variant="ghost" onClick={() => handleOpenSchoolDialog(school)} className="h-8 w-8 p-0 text-slate-400 hover:text-white"><FilePenLine className="h-4 w-4"/></Button>
                                                                    <Button size="sm" variant="ghost" onClick={() => handleDeleteSchool(school.id)} className="h-8 w-8 p-0 text-red-400 hover:text-red-300"><Trash2 className="h-4 w-4"/></Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                }) : (
                                                    <TableRow><TableCell colSpan={4} className="h-24 text-center text-slate-500">Henüz okul eklenmemiş.</TableCell></TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="tools" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <LeaderboardSettingsCard />
                        <Card className="lg:col-span-2 bg-slate-900/60 border-white/10 backdrop-blur-md shadow-xl h-full">
                            <CardHeader>
                                <CardTitle className="text-xl text-white flex items-center gap-2"><HardDriveDownload className="h-5 w-5 text-emerald-400"/> Statik Site Oluşturma</CardTitle>
                                <CardDescription>Filtreleyerek belirli içerikler için dosya oluşturun.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="p-4 rounded-xl bg-slate-950/50 border border-white/5 space-y-4">
                                    <div className="space-y-3">
                                        <Label className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Filtreleme</Label>
                                        
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                            <Select value={staticFilters.classId} onValueChange={(val) => setStaticFilters(prev => ({ ...prev, classId: val, courseId: 'all', unitId: 'all', topicId: 'all' }))}>
                                                <SelectTrigger className="bg-slate-900 border-white/10 text-white h-9"><SelectValue placeholder="Sınıf Seç" /></SelectTrigger>
                                                <SelectContent className="bg-slate-900 border-white/10 text-white">
                                                    <SelectItem value="all">Tüm Sınıflar</SelectItem>
                                                    {allClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>

                                            <Select value={staticFilters.courseId} onValueChange={(val) => setStaticFilters(prev => ({ ...prev, courseId: val, unitId: 'all', topicId: 'all' }))}>
                                                <SelectTrigger className="bg-slate-900 border-white/10 text-white h-9"><SelectValue placeholder="Ders Seç" /></SelectTrigger>
                                                <SelectContent className="bg-slate-900 border-white/10 text-white">
                                                    <SelectItem value="all">Tüm Dersler</SelectItem>
                                                    {availableCourses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                                                </SelectContent>
                                            </Select>

                                            <Select value={staticFilters.unitId} onValueChange={(val) => setStaticFilters(prev => ({ ...prev, unitId: val, topicId: 'all' }))} disabled={staticFilters.courseId === 'all'}>
                                                <SelectTrigger className="bg-slate-900 border-white/10 text-white h-9"><SelectValue placeholder="Ünite Seç" /></SelectTrigger>
                                                <SelectContent className="bg-slate-900 border-white/10 text-white">
                                                    <SelectItem value="all">Tüm Üniteler</SelectItem>
                                                    {availableUnits.map(u => <SelectItem key={u.id} value={u.id}>{u.title}</SelectItem>)}
                                                </SelectContent>
                                            </Select>

                                            <Select value={staticFilters.topicId} onValueChange={(val) => setStaticFilters(prev => ({ ...prev, topicId: val }))} disabled={staticFilters.unitId === 'all'}>
                                                <SelectTrigger className="bg-slate-900 border-white/10 text-white h-9"><SelectValue placeholder="Konu Seç" /></SelectTrigger>
                                                <SelectContent className="bg-slate-900 border-white/10 text-white">
                                                    <SelectItem value="all">Tüm Konular</SelectItem>
                                                    {availableTopics.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <Separator className="bg-white/10" />

                                    <div className="space-y-3">
                                         <Label className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Veri Tipleri</Label>
                                         <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                             {[
                                                 { id: 'manifest', label: 'Manifest' },
                                                 { id: 'ozet', label: 'Özetler (.html)' },
                                                 { id: 'flow', label: 'Ders Akışı' },
                                                 { id: 'questions', label: 'Soru Bankası' },
                                                 { id: 'activities', label: 'Etkinlik Verileri' },
                                                 { id: 'notes', label: 'Notlar/Yazılacaklar' },
                                             ].map((type) => (
                                                 <div key={type.id} className="flex items-center space-x-2">
                                                     <Checkbox 
                                                         id={`exp-${type.id}`} 
                                                         checked={(exportTypes as any)[type.id]} 
                                                         onCheckedChange={(checked) => setExportTypes(prev => ({...prev, [type.id]: checked}))}
                                                         className="border-white/30 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                                     />
                                                     <label htmlFor={`exp-${type.id}`} className="text-sm text-slate-300 cursor-pointer select-none">{type.label}</label>
                                                 </div>
                                             ))}
                                         </div>
                                    </div>
                                    
                                    <Button onClick={handleAdvancedExport} disabled={isExportingAdvanced} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20 mt-4">
                                        {isExportingAdvanced ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckSquare className="mr-2 h-4 w-4"/>}
                                        Dosyaları Oluştur
                                    </Button>
                                </div>
                                
                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                                    <p className="text-xs text-blue-200 flex gap-2"><AlertTriangle className="h-3 w-3 shrink-0"/> Public/Curriculum klasörüne yazar.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            {dialogState.isOpen && (
                 <UserEditorDialog 
                     isOpen={dialogState.isOpen}
                     onOpenChange={(isOpen) => setDialogState({ isOpen, user: null })}
                     user={dialogState.user}
                     onSave={handleSaveUser}
                     isSaving={isSaving}
                     classes={allClasses}
                     schools={schools}
                 />
              )}

            <Dialog open={schoolDialogState.isOpen} onOpenChange={(isOpen) => setSchoolDialogState({ ...schoolDialogState, isOpen })}>
                <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{schoolDialogState.school ? 'Okul Düzenle' : 'Yeni Okul Ekle'}</DialogTitle>
                        <DialogDescription>
                            Okul adını giriniz. Değişiklikler sisteme anında yansır.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name" className="text-white">Okul Adı</Label>
                            <Input
                                id="name"
                                value={schoolNameInput}
                                onChange={(e) => setSchoolNameInput(e.target.value)}
                                className="bg-slate-950 border-white/10 text-white"
                                placeholder="Örn: Atatürk Ortaokulu"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" onClick={handleSaveSchool} disabled={isSavingSchool} className="bg-purple-600 hover:bg-purple-500 text-white">
                            {isSavingSchool ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                            {schoolDialogState.school ? 'Güncelle' : 'Kaydet'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={bulkSchoolDialog} onOpenChange={setBulkSchoolDialog}>
                <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Toplu Okul Değiştirme</DialogTitle>
                        <DialogDescription>
                            Seçilen <b>{selectedUserIds.size}</b> öğrenci için yeni okulu seçiniz.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="bulk-school" className="text-white">Yeni Okul</Label>
                             <Select value={selectedTargetSchoolId} onValueChange={setSelectedTargetSchoolId}>
                                <SelectTrigger className="bg-slate-950 border-white/10 h-10"><SelectValue placeholder="Okul Seçiniz" /></SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10 text-white">
                                    {schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setBulkSchoolDialog(false)}>İptal</Button>
                        <Button type="submit" onClick={handleBulkSchoolUpdate} disabled={isBulkUpdating} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                             {isBulkUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Güncelle
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </main>
    </div>
  );
}
