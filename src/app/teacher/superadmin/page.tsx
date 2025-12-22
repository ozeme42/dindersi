
'use client';

import { useState, useEffect, useMemo, useCallback } from "react";
import { User, Download, AlertTriangle, Loader2, Book, FileQuestion, List, FileJson, Server, ClipboardList, DollarSign, Shield, Filter, Home } from "lucide-react";
import { getAllUsers, exportAllData, exportDataForStaticSite } from "./actions";
import type { UserProfile, SchoolClass, Course, Unit, Topic } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getExamCreationData } from "../exams/actions"; // Re-using this to get curriculum structure
import Link from 'next/link';

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

// Helper to slugify strings for filenames
const slugify = (text: string) => {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Boşlukları - ile değiştir
        .replace(/[^\w-]+/g, '')       // Alfanümerik olmayan karakterleri kaldır
        .replace(/--+/g, '-')         // Birden fazla -'yi tek - yap
        .replace(/^-+/, '')           // Başlangıçtaki -'leri kaldır
        .replace(/-+$/, '');          // Sondaki -'leri kaldır
};


export default function SuperAdminPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [isExportingStatic, setIsExportingStatic] = useState(false);
  
  // New state for filters
  const [allClasses, setAllClasses] = useState<SchoolClass[]>([]);
  const [allCourses, setAllCourses] = useState<(Course & { units: (Unit & { topics: Topic[] })[] })[]>([]);
  const [filters, setFilters] = useState<{classId: string, courseId: string, unitId: string, topicId: string}>({
      classId: 'all',
      courseId: 'all',
      unitId: 'all',
      topicId: 'all',
  });
  
  const { toast } = useToast();

  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        const [usersData, curriculumData] = await Promise.all([
          getAllUsers(),
          getExamCreationData(), // This fetches all curriculum data we need for filters
        ]);
        setUsers(usersData);
        setAllClasses(curriculumData.classes);
        setAllCourses(curriculumData.courses);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast({ title: "Veri Yüklenemedi", description: "Gerekli veriler getirilirken bir hata oluştu.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllData();
  }, [toast]);
  
  // Memoized lists for dependent dropdowns
  const filteredCourses = useMemo(() => {
    if (filters.classId === 'all') return allCourses;
    return allCourses.filter(c => c.classId === filters.classId || !c.classId);
  }, [filters.classId, allCourses]);

  const filteredUnits = useMemo(() => {
    if (filters.courseId === 'all') return [];
    const course = allCourses.find(c => c.id === filters.courseId);
    return course?.units || [];
  }, [filters.courseId, allCourses]);

  const filteredTopics = useMemo(() => {
    if (filters.unitId === 'all') return [];
    const unit = filteredUnits.find(u => u.id === filters.unitId);
    return unit?.topics || [];
  }, [filters.unitId, filteredUnits]);

  const handleDownload = async (dataType: 'users' | 'curriculum' | 'questions' | 'examQuestions' | 'assignments' | 'scoreEvents' | 'activity-items' | 'yazilacaklar', baseFilename: string) => {
    setIsDownloading(dataType);
    
    // Create a dynamic filename based on filters
    let filenameParts = [];
    if (filters.classId && filters.classId !== 'all') {
        const className = allClasses.find(c => c.id === filters.classId)?.name || filters.classId;
        filenameParts.push(slugify(className));
    }
    if (filters.courseId && filters.courseId !== 'all') {
        const courseName = allCourses.find(c => c.id === filters.courseId)?.title || filters.courseId;
        filenameParts.push(slugify(courseName));
    }
    if (filters.unitId && filters.unitId !== 'all') {
        const unitName = filteredUnits.find(u => u.id === filters.unitId)?.title || filters.unitId;
        filenameParts.push(slugify(unitName));
    }
     if (filters.topicId && filters.topicId !== 'all') {
        const topicName = filteredTopics.find(t => t.id === filters.topicId)?.title || filters.topicId;
        filenameParts.push(slugify(topicName));
    }
    
    filenameParts.push(baseFilename);
    const filename = `${filenameParts.join('_')}.json`;
    
    try {
      const data = await exportAllData(dataType, filters);
      downloadJson(data, filename);
    } catch (e: any) {
      console.error("Failed to download data:", e);
      toast({ title: "İndirme Hatası", description: `Veri indirilirken bir hata oluştu: ${e.message}`, variant: "destructive" });
    } finally {
      setIsDownloading(null);
    }
  };
  
  const handleExportStaticData = async () => {
    setIsExportingStatic(true);
    try {
      const result = await exportDataForStaticSite(filters);
      if (result.success) {
        toast({ title: "Başarılı", description: result.message });
      } else {
        throw new Error(result.error);
      }
    } catch(e: any) {
       console.error("Failed to export static data:", e);
       toast({ title: "Dışa Aktarma Hatası", description: `Statik site verileri oluşturulurken bir hata oluştu: ${e.message}`, variant: "destructive" });
    } finally {
      setIsExportingStatic(false);
    }
  }

  const dataSections = [
    { type: 'users', title: "Kullanıcılar", icon: <User className="mr-2 h-4 w-4"/>, filename: "kullanicilar" },
    { type: 'curriculum', title: "Müfredat", icon: <Book className="mr-2 h-4 w-4"/>, filename: "mufredat" },
    { type: 'questions', title: "Soru Bankası", icon: <FileQuestion className="mr-2 h-4 w-4"/>, filename: "soru_bankasi" },
    { type: 'examQuestions', title: "Deneme Soruları", icon: <Shield className="mr-2 h-4 w-4"/>, filename: "deneme_sorulari" },
    { type: 'assignments', title: "Ödevler", icon: <ClipboardList className="mr-2 h-4 w-4"/>, filename: "odevler" },
    { type: 'scoreEvents', title: "Puan Hareketleri", icon: <DollarSign className="mr-2 h-4 w-4"/>, filename: "puan_hareketleri" },
    { type: 'activity-items', title: "Etkinlik Verileri", icon: <List className="mr-2 h-4 w-4"/>, filename: "etkinlik_verileri" },
    { type: 'yazilacaklar', title: "Yazılacaklar", icon: <FileJson className="mr-2 h-4 w-4"/>, filename: "yazilacaklar" },
  ];

  if (isLoading) {
      return (
          <div className="flex h-screen w-full items-center justify-center bg-slate-950">
              <Loader2 className="h-16 w-16 animate-spin text-indigo-500" />
          </div>
      );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans">
        <main className="flex-1 container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-white">Süper Admin Paneli</h1>
                    <p className="text-slate-400">Uygulama verilerini yönetin ve yedekleyin.</p>
                </div>
                <Button asChild variant="outline" className="border-white/10 text-white hover:bg-white/5">
                    <Link href="/teacher"><Home className="mr-2 h-4 w-4"/>Panele Dön</Link>
                </Button>
            </div>

            <Card className="bg-slate-900/50 border-white/10 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-xl text-white flex items-center gap-2"><Filter className="text-indigo-400 h-5 w-5"/> Veri İndirme Filtreleri</CardTitle>
                    <CardDescription className="text-slate-400">
                        Belirli bir veri grubunu indirmek için aşağıdaki filtreleri kullanın. Filtre seçmezseniz tüm veriler indirilir.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Select value={filters.classId} onValueChange={v => setFilters({ classId: v, courseId: 'all', unitId: 'all', topicId: 'all' })}>
                        <SelectTrigger className="bg-slate-900 border-white/10 text-white h-11"><SelectValue placeholder="Sınıf Seç..." /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white"><SelectItem value="all">Tüm Sınıflar</SelectItem>{allClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                     <Select value={filters.courseId} onValueChange={v => setFilters(f => ({ ...f, courseId: v, unitId: 'all', topicId: 'all' }))} disabled={filters.classId === 'all'}>
                        <SelectTrigger className="bg-slate-900 border-white/10 text-white h-11"><SelectValue placeholder="Ders Seç..." /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white"><SelectItem value="all">Tüm Dersler</SelectItem>{filteredCourses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={filters.unitId} onValueChange={v => setFilters(f => ({ ...f, unitId: v, topicId: 'all' }))} disabled={filters.courseId === 'all'}>
                        <SelectTrigger className="bg-slate-900 border-white/10 text-white h-11"><SelectValue placeholder="Ünite Seç..." /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white"><SelectItem value="all">Tüm Üniteler</SelectItem>{filteredUnits.map(u => <SelectItem key={u.id} value={u.id}>{u.title}</SelectItem>)}</SelectContent>
                    </Select>
                     <Select value={filters.topicId} onValueChange={v => setFilters(f => ({ ...f, topicId: v }))} disabled={filters.unitId === 'all'}>
                        <SelectTrigger className="bg-slate-900 border-white/10 text-white h-11"><SelectValue placeholder="Konu Seç..." /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white"><SelectItem value="all">Tüm Konular</SelectItem>{filteredTopics.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent>
                    </Select>
                </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-white/10 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-white">Veri Yedekleme</CardTitle>
                    <CardDescription className="text-slate-400">
                        Uygulamanın veritabanındaki verileri JSON formatında bilgisayarınıza indirin.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {dataSections.map(section => (
                         <Button key={section.type} variant="outline" onClick={() => handleDownload(section.type as any, section.filename)} disabled={!!isDownloading} className="justify-start bg-slate-900/50 border-white/10 hover:bg-slate-800 hover:text-white text-slate-300">
                            {isDownloading === section.type ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : section.icon}
                            {section.title}
                        </Button>
                    ))}
                </CardContent>
            </Card>
            
            <Card className="bg-slate-900/50 border-white/10 backdrop-blur-sm">
                 <CardHeader>
                    <CardTitle className="text-white">Statik Site Yönetimi</CardTitle>
                    <CardDescription className="text-slate-400">
                        Veritabanındaki güncel verileri, statik sitenin kullanabileceği ayrı dosyalara dönüştürün. Bu işlem, `public/curriculum` klasöründeki dosyaları günceller.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <Button onClick={handleExportStaticData} disabled={isExportingStatic} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20">
                        {isExportingStatic ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Server className="mr-2 h-4 w-4"/>}
                        Statik Site Verilerini Oluştur
                    </Button>
                </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-white/10 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-white">Kullanıcı Listesi</CardTitle>
                    <CardDescription className="text-slate-400">Sisteme kayıtlı tüm kullanıcılar.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : (
                        <div className="border rounded-lg overflow-hidden border-white/10">
                            <Table>
                                <TableHeader className="bg-slate-900/80">
                                    <TableRow className="border-white/5 hover:bg-transparent">
                                        <TableHead className="text-slate-300">Ad Soyad</TableHead>
                                        <TableHead className="text-slate-300">E-posta</TableHead>
                                        <TableHead className="text-slate-300">Rol</TableHead>
                                        <TableHead className="text-slate-300">Sınıf</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map(user => (
                                        <TableRow key={user.uid} className="border-white/5">
                                            <TableCell className="font-medium text-white">{user.displayName}</TableCell>
                                            <TableCell className="text-slate-400">{user.email}</TableCell>
                                            <TableCell><Badge variant={user.role === 'superadmin' ? 'destructive' : user.role === 'teacher' ? 'secondary' : 'outline'} className={user.role === 'teacher' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : user.role === 'student' ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' : ''}>{user.role}</Badge></TableCell>
                                            <TableCell className="text-slate-400">{user.class || '-'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </main>
    </div>
  );
}
