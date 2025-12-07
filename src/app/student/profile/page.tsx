
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useAuth } from '@/context/auth-context';
import { db, auth } from '@/lib/firebase';
import { doc, updateDoc, collection, getDocs } from 'firebase/firestore';
import type { UserProfile, SchoolClass, Achievement } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, User, Mail, GraduationCap, Trophy, Shield, Star, Award, Medal, BookOpen, Edit, Save, X, KeySquare, LogOut } from 'lucide-react';
import { UserAvatar } from '@/components/user-avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { getStudentAchievements } from './actions';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { updateUserPassword } from '@/ai/flows/update-user-password-flow';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

// --- Edit Profile Form Component ---
function EditProfileForm({ user, classes, onSave, onCancel, isSaving }: { user: UserProfile, classes: SchoolClass[], onSave: (data: any) => void, onCancel: () => void, isSaving: boolean }) {
    const [displayName, setDisplayName] = useState(user.displayName);
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('');

    useEffect(() => {
        if (user.class) {
            const [className, branchName] = user.class.split(' - ');
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
        onSave({ displayName, class: newClassString });
    };

    const selectedClassData = classes.find(c => c.id === selectedClassId);

    return (
        <div className="space-y-4">
            <div>
                <Label htmlFor="displayName">Ad Soyad</Label>
                <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
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
                    <Select value={selectedBranch} onValueChange={setSelectedBranch} disabled={!selectedClassData}>
                        <SelectTrigger id="branch"><SelectValue placeholder="Şube Seçin" /></SelectTrigger>
                        <SelectContent>
                            {selectedClassData?.branches?.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <Button variant="ghost" onClick={onCancel}>İptal</Button>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Kaydet
                </Button>
            </div>
        </div>
    );
}

// --- Password Change Dialog ---
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
                toast({ title: "Başarılı", description: "Şifreniz başarıyla güncellendi." });
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
                 <Button variant="outline" size="sm">
                    <KeySquare className="mr-2 h-4 w-4"/>
                    Şifre Değiştir
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Şifre Değiştir</DialogTitle>
                    <DialogDescription>Yeni bir şifre belirleyin. Bu işlem sonrası mevcut oturumunuz kapanacaktır.</DialogDescription>
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


function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoadingAchievements, setIsLoadingAchievements] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function fetchClasses() {
        try {
            const classesSnapshot = await getDocs(collection(db, "classes"));
            const classesData = classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
            setClasses(classesData);
        } catch (error) {
            console.error("Error fetching classes: ", error);
        }
    }
    
    fetchClasses();
  }, []);

  useEffect(() => {
    async function fetchAchievements() {
        if (!user) return;
        setIsLoadingAchievements(true);
        const result = await getStudentAchievements(user.uid, user.createdAt || null);
        if (result.success && result.achievements) {
            setAchievements(result.achievements);
        }
        setIsLoadingAchievements(false);
    }
    
    if (user) {
        fetchAchievements();
    }
  }, [user]);

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
    } catch (error) {
        console.error("Error updating profile: ", error);
        toast({ title: "Hata", description: "Profil güncellenirken bir sorun oluştu.", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };
  
  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (!user) {
    return (
        <div className="flex h-screen items-center justify-center">
            <p>Lütfen giriş yapın.</p>
            <Link href="/login"><Button className="ml-4">Giriş Yap</Button></Link>
        </div>
    );
  }

  const rankIcon = (rank: number) => {
    if (rank === 1) return <Medal className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-slate-400" />;
    if (rank === 3) return <Medal className="h-6 w-6 text-amber-700" />;
    return <Trophy className="h-6 w-6 text-slate-500" />;
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 pb-24 md:pb-8">
        <div className="container mx-auto p-4 sm:p-6 md:p-8">
            
            <div className="mb-6 flex items-center justify-between">
                <Button asChild variant="outline" size="sm">
                    <Link href="/student"><ArrowLeft className="mr-2 h-4 w-4" /> Panele Dön</Link>
                </Button>
                <h1 className="text-2xl md:text-3xl font-bold font-headline text-center">Profilim</h1>
                <div className="w-24"></div> {/* Spacer */}
            </div>

            <Card className="w-full max-w-4xl mx-auto overflow-hidden">
                <div className="relative p-6 bg-slate-800 text-white">
                     <div className="absolute inset-0 bg-grid opacity-10" />
                     <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-800" />
                     <div className="relative flex flex-col md:flex-row items-center gap-6">
                        <UserAvatar user={user} className="w-24 h-24 text-4xl border-4 border-slate-700" />
                        <div className="flex-1 text-center md:text-left">
                            {isEditMode ? (
                                <EditProfileForm 
                                    user={user as UserProfile} 
                                    classes={classes} 
                                    onSave={handleSaveProfile} 
                                    onCancel={() => setIsEditMode(false)}
                                    isSaving={isSaving}
                                />
                            ) : (
                                <>
                                    <h2 className="text-3xl font-bold">{user.displayName}</h2>
                                    <p className="text-slate-400 flex items-center justify-center md:justify-start gap-2"><Mail className="h-4 w-4"/> {user.email}</p>
                                    <p className="text-slate-400 flex items-center justify-center md:justify-start gap-2"><GraduationCap className="h-4 w-4"/> {user.class || 'Sınıf Belirtilmemiş'}</p>
                                </>
                            )}
                        </div>
                         {!isEditMode && (
                             <div className="absolute top-2 right-2 flex flex-col gap-2">
                                <Button variant="ghost" size="icon" className="hover:bg-white/10" onClick={() => setIsEditMode(true)}>
                                    <Edit className="h-5 w-5" />
                                </Button>
                                <PasswordChangeDialog user={user as UserProfile} onPasswordChanged={handleLogout}/>
                             </div>
                         )}
                     </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border">
                    <div className="p-4 bg-card text-center">
                        <p className="text-2xl font-bold text-primary">{(user.score || 0).toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">Toplam Puan</p>
                    </div>
                     <div className="p-4 bg-card text-center">
                        <p className="text-2xl font-bold">#12</p>
                        <p className="text-sm text-muted-foreground">Genel Sıralama</p>
                    </div>
                    <div className="p-4 bg-card text-center">
                        <p className="text-2xl font-bold">#3</p>
                        <p className="text-sm text-muted-foreground">Sınıf Sıralaması</p>
                    </div>
                    <div className="p-4 bg-card text-center">
                        <p className="text-2xl font-bold">{achievements.length}</p>
                        <p className="text-sm text-muted-foreground">Kazanılan Rozet</p>
                    </div>
                </div>

                <CardContent className="p-6">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Award className="text-amber-500 h-5 w-5"/> Başarılar</h3>
                     {isLoadingAchievements ? (
                         <div className="flex justify-center items-center h-24">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                     ) : achievements.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {achievements.map((ach, i) => (
                                <div key={i} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                                    {rankIcon(ach.rank)}
                                    <div>
                                        <p className="font-semibold">{ach.periodName}</p>
                                        <Badge variant={ach.periodType === 'monthly' ? 'default' : 'secondary'} className="mt-1">
                                            {ach.periodType === 'monthly' ? 'Aylık' : 'Haftalık'} {ach.rank}.
                                        </Badge>
                                    </div>
                                    <p className="ml-auto font-bold text-lg text-primary">{ach.score.toLocaleString()}</p>
                                </div>
                            ))}
                        </div>
                     ) : (
                         <p className="text-muted-foreground text-center py-4">Henüz bir sıralama başarısı kazanmadın.</p>
                     )}
                     
                </CardContent>
                <CardFooter className="flex-col md:flex-row justify-center gap-4 bg-muted/50 p-4 border-t">
                    <Button asChild variant="outline">
                        <Link href="/student/tekrar-et">
                             <BookOpen className="mr-2 h-4 w-4"/> Yanlışlarımı Tekrar Et
                        </Link>
                    </Button>
                     <Button asChild variant="outline">
                        <Link href="/teacher/reports">
                           <BookOpen className="mr-2 h-4 w-4"/> Raporlarımı Görüntüle
                        </Link>
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive-outline">
                                <LogOut className="mr-2 h-4 w-4"/> Oturumu Kapat
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Oturumu Kapat</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Çıkış yapmak istediğinizden emin misiniz?
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>İptal</AlertDialogCancel>
                                <AlertDialogAction onClick={handleLogout}>Evet, Çıkış Yap</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardFooter>
            </Card>
        </div>
    </div>
  );
}

export default function ProfilePageSuspense() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin"/></div>}>
            <ProfilePage/>
        </Suspense>
    )
}
