

"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/auth-context";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, query, where, onSnapshot } from "firebase/firestore";
import { updateProfile, updatePassword } from "firebase/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Bug, Award, Trophy, Crown, Star, Repeat } from "lucide-react";
import type { SchoolClass, Achievement, ErrorReport } from "@/lib/types";
import { UserAvatar } from "@/components/user-avatar";
import Link from 'next/link';
import { getStudentAchievements } from "./actions";
import { getReviewQuestions } from "@/app/student/tekrar-et/actions";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


const profileFormSchema = z.object({
  displayName: z.string().min(3, { message: "Ad Soyad en az 3 karakter olmalıdır."}),
  classId: z.string().min(1, { message: "Lütfen bir sınıf seçin." }),
  branch: z.string().min(1, { message: "Lütfen bir şube seçin." }),
});

const passwordFormSchema = z.object({
    newPassword: z.string().min(6, { message: "Yeni şifre en az 6 karakter olmalıdır." }),
    confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
    message: "Şifreler eşleşmiyor.",
    path: ["confirmPassword"],
});


function AchievementsCard({ achievements, isLoading }: { achievements: Achievement[], isLoading: boolean }) {
    if (isLoading) {
        return (
            <Card className="xl:col-span-1">
                <CardHeader>
                    <CardTitle>Başarılarım</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </CardContent>
            </Card>
        )
    }

    if (achievements.length === 0) {
        return (
            <Card className="xl:col-span-1">
                <CardHeader>
                    <CardTitle>Başarılarım</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-muted-foreground py-10">
                    <Trophy className="mx-auto h-12 w-12 text-amber-300 mb-2"/>
                    <p>Henüz bir derecen yok.</p>
                    <p className="text-sm">Liderlik tablosunda yükselerek burada yerini al!</p>
                </CardContent>
            </Card>
        )
    }
    
    const weeklyAchievements = achievements.filter(a => a.periodType === 'weekly');
    const monthlyAchievements = achievements.filter(a => a.periodType === 'monthly');

    const rankIcons = {
        1: <Crown className="h-5 w-5 text-yellow-400" />,
        2: <Award className="h-5 w-5 text-gray-400" />,
        3: <Award className="h-5 w-5 text-orange-400" />,
    };

    return (
        <Card className="xl:col-span-1">
            <CardHeader>
                <CardTitle>🏆 Başarılarım</CardTitle>
                <CardDescription>Haftalık ve aylık liderlik tablosu derecelerin.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="weekly">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="weekly">Haftalık</TabsTrigger>
                        <TabsTrigger value="monthly">Aylık</TabsTrigger>
                    </TabsList>
                    <TabsContent value="weekly">
                        <ScrollArea className="h-48">
                            {weeklyAchievements.length > 0 ? weeklyAchievements.map((ach, i) => (
                                <div key={i} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                                    <div className="flex items-center gap-2">
                                        {rankIcons[ach.rank as keyof typeof rankIcons]}
                                        <span className="font-semibold">{ach.periodName}</span>
                                    </div>
                                    <Badge variant="secondary">{ach.rank}. oldun ({ach.score} Puan)</Badge>
                                </div>
                            )) : <p className="text-center text-sm text-muted-foreground p-4">Henüz haftalık derecen yok.</p>}
                        </ScrollArea>
                    </TabsContent>
                     <TabsContent value="monthly">
                        <ScrollArea className="h-48">
                            {monthlyAchievements.length > 0 ? monthlyAchievements.map((ach, i) => (
                                <div key={i} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                                    <div className="flex items-center gap-2">
                                        {rankIcons[ach.rank as keyof typeof rankIcons]}
                                        <span className="font-semibold">{ach.periodName}</span>
                                    </div>
                                    <Badge variant="secondary">{ach.rank}. oldun ({ach.score} Puan)</Badge>
                                </div>
                            )) : <p className="text-center text-sm text-muted-foreground p-4">Henüz aylık derecen yok.</p>}
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}

function ReviewQuestionsCard({ userId }: { userId: string }) {
    const [reviewCount, setReviewCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;
        getReviewQuestions(userId).then(result => {
            setReviewCount(result.questions?.length || 0);
        }).finally(() => setIsLoading(false));
    }, [userId]);

    return (
        <Card className="xl:col-span-1">
            <CardHeader>
                <CardTitle>Tekrar Zamanı!</CardTitle>
                <CardDescription>Yanlış cevapladığın soruları tekrar çözerek bilgilerini pekiştir.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? <Loader2 className="h-6 w-6 animate-spin"/> : 
                <p className="text-2xl font-bold">{reviewCount} <span className="text-base font-normal text-muted-foreground">soru tekrar için bekliyor.</span></p>}
            </CardContent>
            <CardFooter>
                <Button asChild disabled={reviewCount === 0 || isLoading}>
                    <Link href="/student/tekrar-et">
                        <Repeat className="mr-2 h-4 w-4"/> Tekrar Testine Başla
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    )
}


export default function ProfilePage() {
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();
    
    const [classes, setClasses] = useState<SchoolClass[]>([]);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [isProfileSaving, setIsProfileSaving] = useState(false);
    const [isPasswordSaving, setIsPasswordSaving] = useState(false);
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [isLoadingAchievements, setIsLoadingAchievements] = useState(true);
    const [hasUnreadReport, setHasUnreadReport] = useState(false);


    const profileForm = useForm<z.infer<typeof profileFormSchema>>({
        resolver: zodResolver(profileFormSchema),
        defaultValues: {
            displayName: '',
            classId: '',
            branch: '',
        }
    });

    const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
        resolver: zodResolver(passwordFormSchema),
    });
    
    const watchedClassId = profileForm.watch("classId");
    const selectedClassForForm = classes.find(c => c.id === watchedClassId);

    useEffect(() => {
        if (!user || authLoading) return;

        setIsLoadingAchievements(true);
        getStudentAchievements(user.uid, user.createdAt)
            .then(result => {
                if (result.success && result.achievements) {
                    setAchievements(result.achievements);
                } else if (result.error) {
                    toast({ title: "Başarılar Yüklenemedi", description: result.error, variant: "destructive" });
                }
            })
            .finally(() => setIsLoadingAchievements(false));

        // Listen for unread reports in real-time
        const reportsQuery = query(
            collection(db, 'errorReports'), 
            where('userId', '==', user.uid),
            where('studentHasUnreadMessages', '==', true)
        );

        const unsubscribe = onSnapshot(reportsQuery, (snapshot) => {
            setHasUnreadReport(!snapshot.empty);
        });
        
        return () => unsubscribe(); // Cleanup listener on component unmount

    }, [user, authLoading, toast]);
    
    useEffect(() => {
        async function fetchClasses() {
            try {
                const classesSnapshot = await getDocs(collection(db, "classes"));
                const classesData = classesSnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass))
                    .sort((a, b) => a.name.localeCompare(b.name, 'tr', { numeric: true }));
                setClasses(classesData);
            } catch (error) {
                console.error("Error fetching classes:", error);
                toast({ title: "Hata", description: "Sınıflar yüklenirken bir hata oluştu.", variant: "destructive"});
            } finally {
                setIsDataLoading(false);
            }
        }
        fetchClasses();
    }, [toast]);
    
    useEffect(() => {
        if (user && classes.length > 0) {
            const [className, branch] = user.class?.split(' - ') || ['', ''];
            const userClass = classes.find(c => c.name === className);
            
            profileForm.reset({
                displayName: user.displayName || "",
                classId: userClass?.id || '',
                branch: branch || '',
            });
        }
    }, [user, classes, profileForm]);
    
    async function onProfileSubmit(data: z.infer<typeof profileFormSchema>) {
        if (!user || !auth.currentUser) return;
        
        const selectedClass = classes.find(c => c.id === data.classId);
        if (!selectedClass) {
            toast({ title: "Hata", description: "Geçersiz sınıf seçimi.", variant: "destructive" });
            return;
        }

        setIsProfileSaving(true);
        try {
            const finalClassName = `${selectedClass.name} - ${data.branch}`;

            if (auth.currentUser.displayName !== data.displayName) {
                await updateProfile(auth.currentUser, { displayName: data.displayName });
            }

            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, {
                displayName: data.displayName,
                class: finalClassName,
            });

            toast({ title: "Başarılı", description: "Profil bilgileriniz güncellendi." });
        } catch (error) {
            console.error("Error updating profile:", error);
            toast({ title: "Hata", description: "Profil güncellenirken bir hata oluştu.", variant: "destructive" });
        } finally {
            setIsProfileSaving(false);
        }
    }

    async function onPasswordSubmit(data: z.infer<typeof passwordFormSchema>) {
        if (!user || !auth.currentUser) return;
        setIsPasswordSaving(true);
        try {
            await updatePassword(auth.currentUser, data.newPassword);
            toast({ title: "Başarılı", description: "Şifreniz başarıyla değiştirildi." });
            passwordForm.reset({ newPassword: '', confirmPassword: '' });
        } catch (error: any) {
             console.error("Error updating password:", error);
             if (error.code === 'auth/requires-recent-login') {
                toast({ title: "Güvenlik Uyarısı", description: "Bu hassas bir işlem olduğu için yakın zamanda giriş yapmanız gerekmektedir. Lütfen çıkış yapıp tekrar giriş yaptıktan sonra şifrenizi değiştirmeyi deneyin.", variant: "destructive", duration: 7000 });
             } else {
                toast({ title: "Hata", description: "Şifre değiştirilirken bir hata oluştu.", variant: "destructive" });
             }
        } finally {
            setIsPasswordSaving(false);
        }
    }

    if (authLoading || isDataLoading) {
        return <div className="flex h-[calc(100vh-theme(height.16))] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 md:p-8">
            <h1 className="text-3xl font-bold font-headline mb-6">Profilim</h1>
            <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                 <Card className="xl:col-span-1">
                    <CardHeader>
                        <CardTitle>Profil Önizleme</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                        <UserAvatar user={user} className="w-32 h-32 text-4xl"/>
                        <p className="text-2xl font-bold">{profileForm.watch('displayName')}</p>
                        <p className="text-muted-foreground">
                            {selectedClassForForm?.name}{selectedClassForForm && profileForm.watch('branch') && ` - ${profileForm.watch('branch')}`}
                        </p>
                        <div className="flex items-center gap-2 text-2xl font-bold text-amber-500">
                            <Star className="h-6 w-6"/>
                            <span>{user?.score?.toLocaleString() || 0} Puan</span>
                        </div>
                    </CardContent>
                </Card>
                <AchievementsCard achievements={achievements} isLoading={isLoadingAchievements} />
                 {user && <ReviewQuestionsCard userId={user.uid} />}
                <Card className="xl:col-span-1">
                    <CardHeader>
                        <CardTitle>Profil Bilgileri</CardTitle>
                        <CardDescription>Adınızı ve sınıfınızı güncelleyin.</CardDescription>
                    </CardHeader>
                    <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="displayName">Ad Soyad</Label>
                                <Input id="displayName" {...profileForm.register("displayName")} />
                                {profileForm.formState.errors.displayName && <p className="text-sm text-destructive">{profileForm.formState.errors.displayName.message}</p>}
                            </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="classId">Sınıf</Label>
                                    <Controller
                                        control={profileForm.control}
                                        name="classId"
                                        render={({ field }) => (
                                            <Select onValueChange={(value) => { field.onChange(value); profileForm.setValue('branch', ''); }} value={field.value || ''}>
                                                <SelectTrigger id="classId">
                                                    <SelectValue placeholder="Sınıf Seçin" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    {profileForm.formState.errors.classId && <p className="text-sm text-destructive">{profileForm.formState.errors.classId.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="branch">Şube</Label>
                                     <Controller
                                        control={profileForm.control}
                                        name="branch"
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value || ''} disabled={!selectedClassForForm}>
                                                <SelectTrigger id="branch">
                                                    <SelectValue placeholder="Şube Seçin" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {selectedClassForForm?.branches?.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                     {profileForm.formState.errors.branch && <p className="text-sm text-destructive">{profileForm.formState.errors.branch.message}</p>}
                                </div>
                             </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={isProfileSaving}>
                                 {isProfileSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Değişiklikleri Kaydet
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
                 <Card className="xl:col-span-1">
                    <CardHeader>
                        <CardTitle>Şifre Değiştir</CardTitle>
                        <CardDescription>Güvenliğiniz için yeni bir şifre belirleyin.</CardDescription>
                    </CardHeader>
                     <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="newPassword">Yeni Şifre</Label>
                                <Input id="newPassword" type="password" {...passwordForm.register("newPassword")} />
                                 {passwordForm.formState.errors.newPassword && <p className="text-sm text-destructive">{passwordForm.formState.errors.newPassword.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Yeni Şifre (Tekrar)</Label>
                                <Input id="confirmPassword" type="password" {...passwordForm.register("confirmPassword")} />
                                 {passwordForm.formState.errors.confirmPassword && <p className="text-sm text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p>}
                            </div>
                        </CardContent>
                        <CardFooter>
                           <Button type="submit" variant="secondary" disabled={isPasswordSaving}>
                                {isPasswordSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Şifreyi Değiştir
                           </Button>
                        </CardFooter>
                    </form>
                </Card>
                <Card className="lg:col-span-2 xl:col-span-1">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                             <CardTitle>Hata Raporlarım</CardTitle>
                            {hasUnreadReport && (
                                <Badge variant="destructive" className="animate-pulse">Yeni Cevap</Badge>
                            )}
                        </div>
                        <CardDescription>Gönderdiğiniz geri bildirimlerin durumunu buradan takip edebilirsiniz.</CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button asChild>
                            <Link href="/student/my-reports">
                                Raporlarımı Görüntüle
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );

    
}
