
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/context/auth-context';
import { db, auth } from '@/lib/firebase';
import { doc, updateDoc, collection, getDocs, getDoc } from 'firebase/firestore';
import type { UserProfile, SchoolClass, Achievement } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Mail, GraduationCap, Trophy, Award, Medal, BookOpen, Edit, KeySquare, LogOut, Crown, Save } from 'lucide-react';
import { UserAvatar } from '@/components/user-avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { getStudentAchievements } from './actions';
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
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { updateUserPassword } from '@/ai/flows/update-user-password-flow'; 
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

// --- Edit Profile Form Component (Küçük İyileştirmeler) ---
function EditProfileForm({ user, classes, onSave, onCancel, isSaving }: { user: UserProfile, classes: SchoolClass[], onSave: (data: any) => void, onCancel: () => void, isSaving: boolean }) {
    // user.displayName null gelebilir, başlangıç değeri boş string yapıldı
    const [displayName, setDisplayName] = useState(user.displayName || ''); 
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('');

    useEffect(() => {
        if (user.class) {
            const parts = user.class.split(' - ');
            const className = parts[0];
            const branchName = parts[1] || ''; // Şube olmayabilir
            const userClass = classes.find(c => c.name === className);
            if (userClass) {
                setSelectedClassId(userClass.id);
                setSelectedBranch(branchName);
            }
        }
    }, [user.class, classes]);

    const handleSave = () => {
        const selectedClass = classes.find(c => c.id === selectedClassId);
        const newClassString = selectedClass ? `${selectedClass.name} - ${selectedBranch}` : user.class;
        
        // Sadece değişen verileri kaydetmek için ek kontrol
        if (displayName === user.displayName && newClassString === user.class) {
            onCancel(); // Değişiklik yoksa iptal et
            return;
        }

        onSave({ displayName, class: newClassString });
    };

    const selectedClassData = classes.find(c => c.id === selectedClassId);

    return (
        // Animasyon eklendi
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 p-4 pt-0 bg-white md:bg-transparent"> 
            <div>
                <Label htmlFor="displayName">Ad Soyad</Label>
                <Input 
                    id="displayName" 
                    value={displayName} 
                    onChange={(e) => setDisplayName(e.target.value)} 
                    placeholder="Ad Soyad Giriniz"
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="class">Sınıf</Label>
                    <Select value={selectedClassId} onValueChange={(value) => { setSelectedClassId(value); setSelectedBranch(''); }}>
                        <SelectTrigger id="class"><SelectValue placeholder="Sınıf Seçin" /></SelectTrigger>
                        <SelectContent>
                            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="branch">Şube</Label>
                    <Select value={selectedBranch} onValueChange={setSelectedBranch} disabled={!selectedClassData || selectedClassData.branches?.length === 0}>
                        <SelectTrigger id="branch"><SelectValue placeholder="Şube Seçin" /></SelectTrigger>
                        <SelectContent>
                            {selectedClassData?.branches?.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <Button variant="ghost" onClick={onCancel} disabled={isSaving}>İptal</Button>
                <Button onClick={handleSave} disabled={isSaving || !displayName || !selectedClassId || !selectedBranch}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    <Save className="mr-2 h-4 w-4"/> Kaydet
                </Button>
            </div>
        </div>
    );
}

// --- Password Change Dialog (Küçük İyileştirmeler) ---
function PasswordChangeDialog({ user, onPasswordChanged }: { user: UserProfile, onPasswordChanged: () => void }) {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);

    const handlePasswordChange = async () => {
        if (newPassword !== confirmPassword) {
            setError("Şifreler uyuşmuyor.");
            return;
        }
        if (newPassword.length < 6) {
            setError("Şifre en az 6 karakter olmalıdır.");
            return;
        }
        setError(null);
        setIsSaving(true);
        try {
            const result = await updateUserPassword({ uid: user.uid, password: newPassword });
            if (result.success) {
                toast({ title: "Başarılı", description: "Şifreniz başarıyla güncellendi. Lütfen tekrar giriş yapın." });
                setNewPassword('');
                setConfirmPassword('');
                setIsOpen(false);
                onPasswordChanged(); 
            } else {
                setError(result.error || "Bir hata oluştu.");
            }
        } catch (e: any) {
            setError(e.message || "Beklenmedik bir hata oluştu.");
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                 <Button variant="outline" size="sm" className="w-full justify-start"> 
                    <KeySquare className="mr-2 h-4 w-4"/>
                    Şifre Değiştir
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Şifre Değiştir</DialogTitle>
                    <DialogDescription>Yeni bir şifre belirleyin. Güvenliğiniz için bu işlem sonrası oturumunuz kapatılacaktır.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="new-password">Yeni Şifre</Label>
                        <Input id="new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="confirm-password">Yeni Şifre (Tekrar)</Label>
                        <Input id="confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                </div>
                 <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="ghost">İptal</Button></DialogClose>
                    <Button onClick={handlePasswordChange} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Güncelle
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ----------------------------------------------------------------------
// --- Ana Bileşen: ProfilePage ---
// ----------------------------------------------------------------------

function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoadingAchievements, setIsLoadingAchievements] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false); // Çıkış işlemi loading state'i eklendi

  // Sınıfları çekme (Fetch Classes)
  useEffect(() => {
    async function fetchClasses() {
        try {
            const classesSnapshot = await getDocs(collection(db, "classes"));
            const classesData = classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
            // Sınıf adına göre sıralama
            classesData.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
            setClasses(classesData);
        } catch (error) {
            console.error("Error fetching classes: ", error);
             toast({ title: "Hata", description: "Sınıf bilgileri alınamadı.", variant: "destructive" });
        }
    }
    
    fetchClasses();
  }, [toast]);

  // Başarıları çekme (Fetch Achievements)
  useEffect(() => {
    async function fetchAchievements() {
        if (!user) return;
        setIsLoadingAchievements(true);
        try {
            const result = await getStudentAchievements(user.uid, user.createdAt || null);
            if (result.success && result.achievements) {
                // Başarıları puana göre sırala (yüksekten düşüğe)
                result.achievements.sort((a, b) => b.score - a.score); 
                setAchievements(result.achievements);
            }
        } catch (error) {
             console.error("Error fetching achievements:", error);
        } finally {
            setIsLoadingAchievements(false);
        }
    }
    
    if (user) {
        fetchAchievements();
    }
  }, [user]);

  // Profil Kaydetme (Handle Save Profile)
  const handleSaveProfile = async (data: { displayName: string, class: string }) => {
    if (!user) return;
    setIsSaving(true);
    try {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
            displayName: data.displayName,
            class: data.class,
        });
        toast({ title: "Başarılı", description: "Profil bilgileriniz güncellendi." });
        setIsEditMode(false);
        router.refresh(); // Veri bağlamını (context) ve Next.js önbelleğini (cache) güncellemek için
    } catch (error) {
        console.error("Error updating profile: ", error);
        toast({ title: "Hata", description: "Profil güncellenirken bir sorun oluştu.", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };
  
  // Oturumu Kapatma (Handle Logout)
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
        await signOut(auth);
        toast({ title: "Başarılı", description: "Oturumunuz güvenli bir şekilde kapatıldı." });
        router.push('/login');
    } catch (error) {
        console.error("Logout error:", error);
        toast({ title: "Hata", description: "Çıkış yapılırken bir hata oluştu.", variant: "destructive" });
        setIsLoggingOut(false);
    }
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (!user) {
    return (
        <div className="flex h-screen items-center justify-center flex-col gap-4">
            <p className="text-muted-foreground">Lütfen giriş yapın.</p>
            <Link href="/login"><Button>Giriş Yap</Button></Link>
        </div>
    );
  }

  // Başarı Sırası İkonu (Rank Icon)
  const rankIcon = (rank: number) => {
    const defaultClasses = "h-6 w-6";
    if (rank === 1) return <Crown className={`${defaultClasses} text-yellow-500 fill-yellow-500`} />;
    if (rank === 2) return <Medal className={`${defaultClasses} text-slate-400 fill-slate-400/50`} />;
    if (rank === 3) return <Medal className={`${defaultClasses} text-amber-700 fill-amber-700/50`} />;
    return <Trophy className={`${defaultClasses} text-slate-500`} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-20 pt-8 px-4 md:px-6">
        <div className="max-w-6xl mx-auto space-y-8">
            
            {/* 1. Header Area */}
            <div className="flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild className="text-slate-500 hover:text-primary">
                         <Link href="/student"><ArrowLeft className="h-5 w-5"/></Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Profilim</h1>
                        <p className="text-slate-500 text-sm dark:text-slate-400">Hesap bilgilerinizi ve başarılarınızı yönetin.</p>
                    </div>
                 </div>
                 <Button asChild variant="outline" className="hidden md:flex">
                     <Link href="/student">Panele Dön</Link>
                 </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 2. Sol Kolon: Profil Kartı ve İşlemler */}
                <div className="lg:col-span-1 space-y-6">
                     <Card className="overflow-hidden border-t-4 border-t-primary shadow-lg dark:border-t-indigo-500">
                        <div className="h-24 bg-gradient-to-r from-primary/10 to-indigo-100 dark:from-slate-800 dark:to-slate-700"></div>
                        <CardContent className="relative pt-0 pb-6 px-6 flex flex-col items-center text-center">
                            
                            {/* Avatar */}
                            <div className="absolute -top-12">
                                <UserAvatar user={user as UserProfile} className="w-24 h-24 border-4 border-white dark:border-slate-900 text-4xl shadow-xl bg-white dark:bg-slate-800" />
                            </div>

                            <div className="mt-14 w-full">
                                {isEditMode ? (
                                    <EditProfileForm 
                                        user={user as UserProfile} 
                                        classes={classes} 
                                        onSave={handleSaveProfile} 
                                        onCancel={() => setIsEditMode(false)}
                                        isSaving={isSaving}
                                    />
                                ) : (
                                    <div className="space-y-1 animate-in fade-in duration-300">
                                        <div className="flex items-center justify-center gap-2">
                                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{user.displayName}</h2>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-primary dark:hover:text-indigo-400" onClick={() => setIsEditMode(true)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
                                            <Mail className="h-3.5 w-3.5"/> {user.email}
                                        </p>
                                        <div className="flex items-center justify-center gap-2 pt-2">
                                             <Badge variant="secondary" className="flex items-center gap-1 dark:bg-slate-700 dark:text-white">
                                                <GraduationCap className="h-3.5 w-3.5"/> {user.class || 'Sınıf Belirtilmemiş'}
                                             </Badge>
                                             <Badge variant="outline" className="flex items-center gap-1 border-primary/20 text-primary bg-primary/5 dark:bg-indigo-900/30 dark:border-indigo-500/50 dark:text-indigo-400">
                                                {/* <Star className="h-3.5 w-3.5 fill-primary text-primary dark:fill-indigo-400 dark:text-indigo-400"/> */}
                                                {(user.score || 0).toLocaleString()} Puan
                                             </Badge>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                     </Card>

                     {/* Hızlı Erişim ve İşlemler */}
                     <Card className="shadow-lg dark:bg-slate-800 dark:border-slate-700">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Hızlı Erişim</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Button asChild variant="outline" className="w-full justify-start">
                                <Link href="/student/tekrar-et">
                                    <BookOpen className="mr-2 h-4 w-4"/> Yanlışlarımı Tekrar Et
                                </Link>
                            </Button>
                            <PasswordChangeDialog user={user as UserProfile} onPasswordChanged={handleLogout} />
                        </CardContent>
                        <CardFooter className="pt-4 border-t dark:border-slate-700">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm" className="w-full" disabled={isLoggingOut}>
                                        {isLoggingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <LogOut className="mr-2 h-4 w-4"/>}
                                        Oturumu Kapat
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Oturumu Kapat</AlertDialogTitle>
                                        <AlertDialogDescription>Oturumunuzu kapatmak istediğinize emin misiniz?</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>İptal</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleLogout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Çıkış Yap</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardFooter>
                     </Card>
                </div>

                {/* 3. Sağ Kolon: İstatistikler ve Başarılar */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Hızlı İstatistikler */}
                    <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
                        <Card className="bg-white shadow-lg dark:bg-slate-800 dark:border-slate-700 min-w-[140px] flex-1">
                            <CardContent className="p-4 flex flex-col items-center text-center">
                                <Trophy className="h-7 w-7 text-primary mb-2 opacity-80 dark:text-indigo-400" />
                                <div className="text-2xl font-bold text-slate-900 dark:text-white">{achievements.length}</div>
                                <div className="text-sm text-muted-foreground font-medium">Kazanılan Rozet</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-white shadow-lg dark:bg-slate-800 dark:border-slate-700 min-w-[140px] flex-1">
                             <CardContent className="p-4 flex flex-col items-center text-center">
                                <Award className="h-7 w-7 text-orange-500 mb-2 opacity-80" />
                                <div className="text-2xl font-bold text-slate-900 dark:text-white">#{(user as any).classRank || '-'}</div> 
                                <div className="text-sm text-muted-foreground font-medium">Sınıf Sıralaması</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-white shadow-lg dark:bg-slate-800 dark:border-slate-700 min-w-[140px] flex-1">
                             <CardContent className="p-4 flex flex-col items-center text-center">
                                <Crown className="h-7 w-7 text-yellow-500 mb-2 opacity-80" />
                                <div className="text-2xl font-bold text-slate-900 dark:text-white">#{(user as any).generalRank || '-'}</div> 
                                <div className="text-sm text-muted-foreground font-medium">Genel Sıralama</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Başarılar Listesi */}
                    <Card className="shadow-lg dark:bg-slate-800 dark:border-slate-700">
                        <CardHeader className="border-b dark:border-slate-700">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Medal className="h-5 w-5 text-indigo-500"/> 
                                Sıralama Başarıları
                            </CardTitle>
                            <CardDescription>Kazandığın en son dereceler ve puanlar.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4">
                            {isLoadingAchievements ? (
                                <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground/50"/></div>
                            ) : achievements.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {achievements.slice(0, 6).map((ach, i) => ( // En fazla 6 başarı göster
                                        <div key={i} className="flex items-center gap-4 p-4 rounded-xl border bg-slate-50 hover:bg-slate-100 transition-colors dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-700/50">
                                            <div className="p-2 rounded-full shadow-md">
                                                {rankIcon(ach.rank)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-base truncate dark:text-white">{ach.periodName}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant={ach.periodType === 'monthly' ? 'default' : 'secondary'} className="text-xs px-2 h-6 dark:bg-indigo-600 dark:text-white">
                                                        {ach.periodType === 'monthly' ? 'Aylık' : 'Haftalık'}
                                                    </Badge>
                                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">#{ach.rank}. Sıra</span>
                                                </div>
                                            </div>
                                            <div className="ml-auto text-right">
                                                <span className="block font-bold text-lg text-primary dark:text-indigo-400">{ach.score.toLocaleString()}</span>
                                                <span className="text-xs text-muted-foreground">Puan</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed dark:bg-slate-900 dark:border-slate-700">
                                    <Trophy className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                                    <p className="text-slate-500 font-medium dark:text-slate-400">Henüz listelenecek bir başarınız yok.</p>
                                    <p className="text-xs text-slate-400 mt-1 dark:text-slate-500">Sınavlara katılarak puan toplayın!</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    </div>
  );
}

export default function ProfilePageSuspense() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary"/></div>}>
            <ProfilePage/>
        </Suspense>
    )
}
