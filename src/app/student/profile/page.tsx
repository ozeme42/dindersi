'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/context/auth-context';
import { db, auth } from '@/lib/firebase';
import { doc, updateDoc, collection, getDocs, query, orderBy, addDoc } from 'firebase/firestore';
import type { UserProfile, SchoolClass, School } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, ArrowLeft, Mail, GraduationCap, Trophy, Award, Medal, 
  Edit, KeySquare, LogOut, Crown, Save, Shield, Star, 
  Lock, ShieldCheck, School as SchoolIcon, PlusCircle
} from 'lucide-react';
import { UserAvatar } from '@/components/user-avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
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
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { updateUserPassword } from '@/ai/flows/update-user-password-flow'; 
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

// --- Edit Profile Form Component ---
function EditProfileForm({ user, classes, schools, onSave, onCancel, isSaving }: { 
    user: UserProfile, 
    classes: SchoolClass[], 
    schools: School[],
    onSave: (data: any) => void, 
    onCancel: () => void, 
    isSaving: boolean 
}) {
    const [displayName, setDisplayName] = useState(user.displayName || ''); 
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('');
    const [selectedSchoolId, setSelectedSchoolId] = useState('');
    const [newSchoolName, setNewSchoolName] = useState('');

    useEffect(() => {
        if (user.class) {
            const parts = user.class.split(' - ');
            const className = parts[0];
            const branchName = parts[1] || '';
            const userClass = classes.find(c => c.name === className);
            if (userClass) {
                setSelectedClassId(userClass.id);
                setSelectedBranch(branchName);
            }
        }
        if (user.schoolName) {
            const userSchool = schools.find(s => s.name === user.schoolName);
            setSelectedSchoolId(userSchool?.id || '');
        }
    }, [user, classes, schools]);

    const handleSave = () => {
        const selectedClass = classes.find(c => c.id === selectedClassId);
        const newClassString = selectedClass ? `${selectedClass.name} - ${selectedBranch}` : user.class;
        
        let newSchoolString = user.schoolName;
        if(selectedSchoolId === 'new') {
            newSchoolString = newSchoolName.trim();
        } else {
            const selectedSchool = schools.find(s => s.id === selectedSchoolId);
            if(selectedSchool) newSchoolString = selectedSchool.name;
        }

        if (displayName === user.displayName && newClassString === user.class && newSchoolString === user.schoolName) {
            onCancel();
            return;
        }

        onSave({ displayName, class: newClassString, schoolName: newSchoolString });
    };

    const selectedClassData = classes.find(c => c.id === selectedClassId);

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 p-4 bg-slate-900/50 rounded-xl border border-white/5 backdrop-blur-md"> 
            <div className="space-y-2 group">
                <Label htmlFor="displayName" className="text-slate-300 font-medium">Ad Soyad</Label>
                <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ad Soyad Giriniz" className="bg-slate-950 border-white/10 text-white h-11 focus:border-indigo-500/50 rounded-lg transition-all"/>
            </div>
            
             <div className="space-y-2">
                <Label htmlFor="school">Okul</Label>
                <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
                    <SelectTrigger id="school" className="bg-slate-950 border-white/10 text-white h-11 rounded-lg"><SelectValue placeholder="Okulunuzu seçin..." /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                        {schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        <SelectItem value="new"><span className="flex items-center gap-2"><PlusCircle className="h-4 w-4 text-cyan-400"/>Diğer (Yeni Okul Ekle)</span></SelectItem>
                    </SelectContent>
                </Select>
             </div>

            {selectedSchoolId === 'new' && (
                <div className="space-y-2 group animate-in slide-in-from-top-2">
                    <Label htmlFor="new-school-name">Yeni Okul Adı</Label>
                    <Input id="new-school-name" value={newSchoolName} onChange={e => setNewSchoolName(e.target.value)} placeholder="Okulun tam adını girin" className="bg-slate-950 border-white/10 text-white h-11 rounded-xl focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500"/>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="class">Sınıf</Label>
                    <Select value={selectedClassId} onValueChange={(value) => { setSelectedClassId(value); setSelectedBranch(''); }}>
                        <SelectTrigger id="class" className="bg-slate-950 border-white/10 text-white h-11 rounded-lg"><SelectValue placeholder="Seçiniz" /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="branch">Şube</Label>
                    <Select value={selectedBranch} onValueChange={setSelectedBranch} disabled={!selectedClassData || selectedClassData.branches?.length === 0}>
                        <SelectTrigger id="branch" className="bg-slate-950 border-white/10 text-white h-11 rounded-lg"><SelectValue placeholder="Seçiniz" /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                            {selectedClassData?.branches?.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-white/5 mt-2">
                <Button variant="ghost" onClick={onCancel} disabled={isSaving} className="text-slate-400 hover:text-white hover:bg-white/5 rounded-lg">İptal</Button>
                <Button onClick={handleSave} disabled={isSaving || !displayName || (!selectedSchoolId && !newSchoolName) || !selectedClassId || !selectedBranch} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg shadow-indigo-900/20">
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    <Save className="mr-2 h-4 w-4"/> Kaydet
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
                 <Button variant="outline" className="w-full justify-start h-12 bg-slate-900/50 border-white/10 hover:border-indigo-500/50 hover:bg-slate-900 text-slate-300 hover:text-white transition-all group"> 
                    <KeySquare className="mr-3 h-5 w-5 text-indigo-400 group-hover:text-indigo-300"/>
                    Şifre Değiştir
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Şifre Değiştir</DialogTitle>
                    <DialogDescription className="text-slate-400">Yeni bir şifre belirleyin. Güvenliğiniz için bu işlem sonrası oturumunuz kapatılacaktır.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="new-password">Yeni Şifre</Label>
                        <Input id="new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="bg-slate-950 border-white/10 text-white focus:border-indigo-500/50" />
                    </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Yeni Şifre (Tekrar)</Label>
                        <Input id="confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="bg-slate-950 border-white/10 text-white focus:border-indigo-500/50" />
                    </div>
                    {error && <p className="text-sm text-red-400 bg-red-400/10 p-2 rounded border border-red-500/20">{error}</p>}
                </div>
                 <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/5">İptal</Button></DialogClose>
                    <Button onClick={handlePasswordChange} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-500 text-white">
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
  const [schools, setSchools] = useState<School[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Fetch classes and schools
  useEffect(() => {
    async function fetchData() {
        if (!user) return;
        try {
            const classesQuery = query(collection(db, "classes"), orderBy("createdAt", "asc"));
            const schoolsQuery = query(collection(db, "schools"), orderBy("name", "asc"));
            
            const [classesSnapshot, schoolsSnapshot] = await Promise.all([
                getDocs(classesQuery),
                getDocs(schoolsQuery)
            ]);

            const classesData = classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
            classesData.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
            setClasses(classesData);

            const schoolsData = schoolsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as School));
            setSchools(schoolsData);

        } catch (error) {
            console.error("Error fetching data: ", error);
        }
    }
    
    if (user) {
        fetchData();
    }
  }, [user]);

  const handleSaveProfile = async (data: { displayName: string, class: string, schoolName: string }) => {
    if (!user) return;
    setIsSaving(true);
    try {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
            displayName: data.displayName,
            class: data.class,
            schoolName: data.schoolName,
        });

        if (data.schoolName && !schools.some(s => s.name === data.schoolName)) {
            await addDoc(collection(db, "schools"), { name: data.schoolName });
        }
        
        toast({ title: "Başarılı", description: "Profil bilgileriniz güncellendi." });
        setIsEditMode(false);
        // Let onSnapshot handle the update
    } catch (error) {
        console.error("Error updating profile: ", error);
        toast({ title: "Hata", description: "Profil güncellenirken bir sorun oluştu.", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };
  
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
    return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-cyan-500" /></div>;
  }

  if (!user) {
    return (
        <div className="flex h-screen items-center justify-center flex-col gap-4 bg-slate-950 text-white">
            <p className="text-slate-400">Lütfen giriş yapın.</p>
            <Link href="/login"><Button>Giriş Yap</Button></Link>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-24 md:pb-12 text-slate-100 relative overflow-hidden font-sans selection:bg-indigo-500/30">
        
        {/* Arka Plan Efektleri */}
        <div className="fixed inset-0 pointer-events-none z-0">
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto p-4 sm:p-6 md:p-8 space-y-8">
            
            {/* Header Area */}
            <div className="flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild className="text-slate-400 hover:text-white hover:bg-white/10 rounded-xl hidden md:flex">
                         <Link href="/student"><ArrowLeft className="h-6 w-6"/></Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-white">Profilim</h1>
                        <p className="text-slate-400 text-sm font-medium">Hesap bilgilerin ve başarıların.</p>
                    </div>
                 </div>
                 
                 <div className="flex items-center gap-3">
                      <Button asChild variant="outline" className="hidden md:flex border-white/10 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl">
                          <Link href="/student">Panele Dön</Link>
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="bg-red-600 hover:bg-red-500 text-white font-bold px-6 shadow-lg shadow-red-900/20 rounded-xl" disabled={isLoggingOut}>
                                {isLoggingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <LogOut className="mr-2 h-4 w-4"/>}
                                <span className="hidden sm:inline">Çıkış Yap</span>
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-slate-900 border-white/10 text-white rounded-2xl">
                            <AlertDialogHeader>
                                <AlertDialogTitle>Çıkış Yapılıyor</AlertDialogTitle>
                                <AlertDialogDescription className="text-slate-400">
                                    Oturumunuzu kapatmak istediğinize emin misiniz?
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="bg-transparent border-white/10 text-slate-300 hover:bg-white/5 hover:text-white">İptal</AlertDialogCancel>
                                <AlertDialogAction onClick={handleLogout} className="bg-red-600 hover:bg-red-500 text-white border-none">Evet, Çıkış Yap</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                 </div>
            </div>

            <div className="space-y-8">
                  
                  <Card className="overflow-visible bg-slate-900/60 backdrop-blur-md border border-white/10 shadow-2xl rounded-[2.5rem] relative mt-16 group hover:border-indigo-500/30 transition-all duration-500">
                     <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full p-1 bg-gradient-to-br from-cyan-500 via-violet-500 to-fuchsia-500 shadow-[0_0_50px_rgba(139,92,246,0.4)] z-20 group-hover:scale-105 transition-transform duration-500">
                          <div className="w-full h-full rounded-full bg-slate-900 p-1">
                             <UserAvatar user={user} className="w-full h-full text-4xl rounded-full" />
                          </div>
                          <div className="absolute bottom-0 right-0 bg-slate-900 rounded-full p-2 border border-white/10 shadow-lg">
                             <ShieldCheck className="h-5 w-5 text-emerald-400" />
                          </div>
                     </div>

                     <CardContent className="pt-20 pb-8 px-6 flex flex-col items-center text-center">
                         
                         <div className="w-full">
                             {isEditMode ? (
                                 <EditProfileForm 
                                     user={user as UserProfile} 
                                     classes={classes} 
                                     schools={schools}
                                     onSave={handleSaveProfile} 
                                     onCancel={() => setIsEditMode(false)}
                                     isSaving={isSaving}
                                 />
                             ) : (
                                 <div className="space-y-6 animate-in fade-in duration-500">
                                     <div>
                                         <div className="flex items-center justify-center gap-3">
                                             <h2 className="text-3xl font-black text-white tracking-tight">{user.displayName}</h2>
                                             <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors" onClick={() => setIsEditMode(true)}>
                                                 <Edit className="h-4 w-4" />
                                             </Button>
                                         </div>
                                         <p className="text-sm text-slate-400 flex items-center justify-center gap-2 mt-2 font-medium">
                                             <Mail className="h-3.5 w-3.5 opacity-70"/> {user.email}
                                         </p>
                                     </div>

                                     <div className="flex flex-col gap-2 items-center justify-center">
                                         <Badge variant="secondary" className="bg-slate-800/80 text-slate-300 border border-white/5 py-2 px-4 rounded-xl text-sm font-medium w-fit">
                                             <SchoolIcon className="h-4 w-4 mr-2 text-cyan-400"/> {user.schoolName || 'Okul Belirtilmemiş'}
                                         </Badge>
                                         <Badge variant="secondary" className="bg-slate-800/80 text-slate-300 border border-white/5 py-2 px-4 rounded-xl text-sm font-medium w-fit">
                                             <GraduationCap className="h-4 w-4 mr-2 text-indigo-400"/> {user.class || 'Sınıf Belirtilmemiş'}
                                          </Badge>
                                          <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/10 py-2 px-4 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(245,158,11,0.1)] w-fit">
                                             <Star className="h-4 w-4 mr-2 fill-amber-400/20"/> {user.score?.toLocaleString() || 0} Puan
                                          </Badge>
                                     </div>
                                 </div>
                             )}
                         </div>
                     </CardContent>
                  </Card>

                  <Card className="bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-3xl shadow-lg overflow-hidden">
                     <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-transparent opacity-50" />
                     <CardHeader className="pb-3 border-b border-white/5">
                         <CardTitle className="text-lg font-bold text-slate-200 flex items-center gap-2">
                             <Lock className="h-4 w-4 text-indigo-400"/> Güvenlik
                         </CardTitle>
                     </CardHeader>
                     <CardContent className="pt-4 space-y-3">
                         <PasswordChangeDialog user={user as UserProfile} onPasswordChanged={handleLogout} />
                     </CardContent>
                  </Card>
            </div>
        </div>
    </div>
  );
}

export default function ProfilePageSuspense() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-cyan-500"/></div>}>
            <ProfilePage/>
        </Suspense>
    )
}