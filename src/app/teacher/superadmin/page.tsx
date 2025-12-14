
'use client';

import { useState, useEffect } from "react";
import { User, Download, HardDriveDownload, AlertTriangle, Loader2, Building, Book, FileQuestion, List, FileJson, Server } from "lucide-react";
import { getAllUsers, exportAllData, exportDataForStaticSite } from "./actions";
import type { UserProfile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

function downloadJson(data: any, filename: string) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SuperAdminPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [isExportingStatic, setIsExportingStatic] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const allUsers = await getAllUsers();
        setUsers(allUsers);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast({ title: "Veri Yüklenemedi", description: "Kullanıcılar getirilirken bir hata oluştu.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllData();
  }, [toast]);

  const handleDownload = async (dataType: 'users' | 'curriculum' | 'questions' | 'activity-items' | 'yazilacaklar', filename: string) => {
    setIsDownloading(dataType);
    try {
      const data = await exportAllData(dataType);
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
      const result = await exportDataForStaticSite();
      if (result.success) {
        toast({ title: "Başarılı", description: "Statik site verileri başarıyla oluşturuldu ve 'public/curriculum' klasörüne kaydedildi." });
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
    { type: 'users', title: "Tüm Kullanıcılar", icon: <User className="mr-2 h-4 w-4"/>, filename: "users.json" },
    { type: 'curriculum', title: "Ders Müfredatı", icon: <Book className="mr-2 h-4 w-4"/>, filename: "curriculum.json" },
    { type: 'questions', title: "Soru Bankası", icon: <FileQuestion className="mr-2 h-4 w-4"/>, filename: "questions.json" },
    { type: 'activity-items', title: "Etkinlik Verileri", icon: <List className="mr-2 h-4 w-4"/>, filename: "activity-items.json" },
    { type: 'yazilacaklar', title: "Yazılacaklar", icon: <FileJson className="mr-2 h-4 w-4"/>, filename: "yazilacaklar.json" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
        <main className="flex-1 container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">Süper Admin Paneli</h1>
                    <p className="text-muted-foreground">Uygulama verilerini yönetin ve yedekleyin.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Veri Yedekleme</CardTitle>
                    <CardDescription>
                        Uygulamanın veritabanındaki verileri JSON formatında bilgisayarınıza indirin.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {dataSections.map(section => (
                         <Button key={section.type} variant="outline" onClick={() => handleDownload(section.type as any, section.filename)} disabled={!!isDownloading}>
                            {isDownloading === section.type ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4"/>}
                            {section.title} İndir (.json)
                        </Button>
                    ))}
                </CardContent>
            </Card>
            
            <Card>
                 <CardHeader>
                    <CardTitle>Statik Site Yönetimi</CardTitle>
                    <CardDescription>
                        Veritabanındaki tüm güncel verileri, statik sitenin kullanabileceği JSON dosyalarına dönüştürün. Bu işlem, `public/curriculum` klasöründeki dosyaları günceller.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <Button onClick={handleExportStaticData} disabled={isExportingStatic}>
                        {isExportingStatic ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Server className="mr-2 h-4 w-4"/>}
                        Statik Site Verilerini Oluştur
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Kullanıcı Listesi</CardTitle>
                    <CardDescription>Sisteme kayıtlı tüm kullanıcılar.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Ad Soyad</TableHead>
                                    <TableHead>E-posta</TableHead>
                                    <TableHead>Rol</TableHead>
                                    <TableHead>Sınıf</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map(user => (
                                    <TableRow key={user.uid}>
                                        <TableCell className="font-medium">{user.displayName}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell><Badge variant={user.role === 'superadmin' ? 'destructive' : user.role === 'teacher' ? 'secondary' : 'outline'}>{user.role}</Badge></TableCell>
                                        <TableCell>{user.class || '-'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </main>
    </div>
  );
}
