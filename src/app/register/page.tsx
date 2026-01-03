
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Info, Gamepad2, User, Lock, ArrowLeft, LogIn, School as SchoolIcon, PlusCircle, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import type { UserProfile, SchoolClass, School } from '@/lib/types';
import { normalizeNameToEmailLocalPart } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// --- UI COMPONENTS ---
const GlassCard = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={cn(
        "backdrop-blur-xl bg-[#1a0b2e]/60 border-2 border-white/10 rounded-3xl shadow-2xl overflow-hidden relative transition-all duration-300",
        className
    )}>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-50"></div>
        {children}
    </div>
);

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [newSchoolName, setNewSchoolName] = useState('');

  const selectedClass = classes.find(c => c.id === selectedClassId);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [classesSnapshot, schoolsSnapshot] = await Promise.all([
        getDocs(query(collection(db, "classes"), orderBy("createdAt", "asc"))),
        getDocs(query(collection(db, "schools"), orderBy("name", "asc"))),
      ]);

      const classesData = classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
      classesData.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      setClasses(classesData);

      const schoolsData = schoolsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as School))
        .filter(school => school.id && school.name && school.name.trim());
      setSchools(schoolsData);

    } catch (error) {
      console.error("Error fetching data: ", error);
      toast({ title: "Hata", description: "Sınıf veya okul listesi alınamadı.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const displayName = (formData.get('display-name') as string).trim();
    const password = formData.get('password') as string;
    
    if (!displayName || !password || !selectedClassId || !selectedBranch || (!selectedSchoolId && !newSchoolName)) {
        toast({ title: "Eksik Bilgi", description: "Lütfen tüm alanları doldurun.", variant: "destructive" });
        setIsLoading(false);
        return;
    }
    
    if (password.length < 6) {
        toast({ title: "Zayıf Şifre", description: "Şifre en az 6 karakter olmalıdır.", variant: "destructive" });
        setIsLoading(false);
        return;
    }
    
    const email = `${normalizeNameToEmailLocalPart(displayName)}@degerleroyunu.com`;

    try {
        let finalSchoolName = '';
        if (selectedSchoolId === 'new') {
            finalSchoolName = newSchoolName.trim().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
            if (!schools.some(s => s.name.toLowerCase() === finalSchoolName.toLowerCase())) {
                 await addDoc(collection(db, "schools"), { name: finalSchoolName });
            }
        } else {
            finalSchoolName = schools.find(s => s.id === selectedSchoolId)?.name || '';
        }
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const userProfile: Omit<UserProfile, 'uid'> = {
            displayName,
            email,
            role: 'pending',
            class: `${selectedClass?.name} - ${selectedBranch}`,
            schoolName: finalSchoolName,
            score: 0,
            createdAt: serverTimestamp(),
            ownedItems: [],
        };

        await setDoc(doc(db, "users", user.uid), userProfile);
        
        toast({ title: "Kayıt Başarılı!", description: "Hesabınız oluşturuldu. Öğretmeninizin onayı sonrası giriş yapabilirsiniz." });
        router.push('/login');

    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            toast({ title: "Kayıt Hatası", description: "Bu ad ve soyad ile zaten bir hesap mevcut.", variant: "destructive" });
        } else {
            console.error("Registration error:", error);
            toast({ title: "Beklenmedik Hata", description: "Kayıt sırasında bir sorun oluştu.", variant: "destructive" });
        }
    } finally {
        setIsLoading(false);
    }
  };
  
  if (process.env.NEXT_PUBLIC_STATIC_BUILD === 'true') {
      return (
        <div className="flex h-screen items-center justify-center bg-slate-950">
            <p>Statik modda kayıt yapılamaz.</p>
        </div>
      )
  }

  return (
    <div className="min-h-screen bg-[#2b1055] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-[#2b1055] to-black flex items-center justify-center p-4 font-sans text-white">
      
      <div className="w-full max-w-md animate-in zoom-in-95 duration-500">
        
        <div className="text-center mb-8">
            <div className="bg-cyan-500/20 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-4 ring-cyan-500/10 shadow-[0_0_30px_rgba(6,182,212,0.4)] rotate-3">
                <UserPlus className="h-10 w-10 text-cyan-400" />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-white drop-shadow-sm">
                YENİ HESAP
            </h1>
            <p className="text-indigo-200/60 font-medium mt-2">Maceraya katılmak için kaydol.</p>
        </div>

        <GlassCard className="p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
                
                <div className="space-y-2 group">
                    <Label htmlFor="display-name">Ad Soyad</Label>
                    <div className="relative">
                        <User className="absolute left-3 top-3 h-5 w-5 text-indigo-400 group-focus-within:text-cyan-400 transition-colors" />
                        <Input id="display-name" name="display-name" placeholder="Adınız ve Soyadınız" className="pl-10 bg-black/20 border-white/10 text-white placeholder:text-white/20 h-12 rounded-xl focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500" />
                    </div>
                </div>
                
                <div className="space-y-2 group">
                    <Label htmlFor="password">Şifre (En az 6 karakter)</Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 h-5 w-5 text-indigo-400 group-focus-within:text-cyan-400 transition-colors" />
                        <Input id="password" name="password" type="password" className="pl-10 bg-black/20 border-white/10 text-white h-12 rounded-xl focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500"/>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="class">Sınıf</Label>
                        <Select value={selectedClassId} onValueChange={(value) => { setSelectedClassId(value); setSelectedBranch(''); }}>
                            <SelectTrigger id="class" className="bg-black/20 border-white/10 text-white h-12 rounded-xl"><SelectValue placeholder="Seçiniz..." /></SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/10 text-white">
                                {classes && classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="branch">Şube</Label>
                        <Select value={selectedBranch} onValueChange={setSelectedBranch} disabled={!selectedClass || !selectedClass.branches || selectedClass.branches.length === 0}>
                            <SelectTrigger id="branch" className="bg-black/20 border-white/10 text-white h-12 rounded-xl"><SelectValue placeholder="Seçiniz..." /></SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/10 text-white">
                                {selectedClass?.branches?.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="school">Okul</Label>
                    <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
                        <SelectTrigger id="school" className="bg-black/20 border-white/10 text-white h-12 rounded-xl"><SelectValue placeholder="Okulunuzu seçin..." /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                            {isLoading ? (
                                <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin"/></div>
                            ) : (
                                <>
                                    {schools && schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                    <SelectItem value="new"><span className="flex items-center gap-2"><PlusCircle className="h-4 w-4 text-cyan-400"/>Diğer (Yeni Okul Ekle)</span></SelectItem>
                                </>
                            )}
                        </SelectContent>
                    </Select>
                </div>

                {selectedSchoolId === 'new' && (
                    <div className="space-y-2 group animate-in slide-in-from-top-2">
                        <Label htmlFor="new-school-name">Yeni Okul Adı</Label>
                        <Input id="new-school-name" name="new-school-name" value={newSchoolName} onChange={e => setNewSchoolName(e.target.value)} placeholder="Örn: Yunus Emre Ortaokulu" className="bg-black/20 border-white/10 text-white h-12 rounded-xl focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500"/>
                        <p className="text-xs text-indigo-300/60 px-2">Lütfen okul adının her kelimesinin baş harfini büyük yazın.</p>
                    </div>
                )}

                <Button type="submit" disabled={isLoading} className="w-full h-12 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-lg rounded-xl shadow-lg shadow-cyan-900/20 border-b-4 border-blue-800 active:border-b-0 active:translate-y-1 transition-all">
                    {isLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Yükleniyor...</> : <><UserPlus className="mr-2 h-5 w-5" /> Kayıt Ol</>}
                </Button>

                <div className="pt-2 text-center">
                    <Button variant="link" asChild className="text-indigo-300 hover:text-white transition-colors">
                        <Link href="/login" className="flex items-center gap-2">
                            <ArrowLeft className="h-4 w-4" /> Zaten hesabım var
                        </Link>
                    </Button>
                </div>
            </form>
        </GlassCard>
      </div>
    </div>
  );
}
