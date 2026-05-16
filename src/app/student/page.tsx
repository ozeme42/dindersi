
'use client';

import { useAuth } from '@/context/auth-context';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { 
    Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    LogOut, User, Star, GraduationCap, LayoutDashboard, 
    Gamepad2, BookOpen, Settings, Loader2 
} from 'lucide-react';
import { UserAvatar } from '@/components/user-avatar';
import Link from 'next/link';

export default function StudentDashboard() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push('/login');
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (!user) {
        router.replace('/login');
        return null;
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 font-sans">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <header className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
                            <LayoutDashboard className="h-6 w-6 text-indigo-400" />
                        </div>
                        <h1 className="text-2xl font-black tracking-tight uppercase">Öğrenci Paneli</h1>
                    </div>
                    <Button 
                        variant="ghost" 
                        onClick={handleLogout}
                        className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl"
                    >
                        <LogOut className="h-5 w-5 mr-2" /> Çıkış Yap
                    </Button>
                </header>

                {/* Profile Card */}
                <Card className="bg-slate-900/60 border-white/10 backdrop-blur-md overflow-hidden relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-50" />
                    <CardHeader className="relative z-10 flex flex-col md:flex-row items-center gap-6 p-8">
                        <UserAvatar user={user} className="h-24 w-24 border-4 border-white/10 shadow-2xl" />
                        <div className="flex-1 text-center md:text-left space-y-2">
                            <Badge className="bg-indigo-600 hover:bg-indigo-500 text-white border-none px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                Öğrenci Profili
                            </Badge>
                            <h2 className="text-3xl font-black tracking-tight">{user.displayName}</h2>
                            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-slate-400 font-medium">
                                <div className="flex items-center gap-2">
                                    <GraduationCap className="h-4 w-4" />
                                    <span>{user.class || 'Sınıf Bilgisi Yok'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-amber-400">
                                    <Star className="h-4 w-4 fill-amber-400" />
                                    <span className="font-bold">{user.score || 0} Puan</span>
                                </div>
                            </div>
                        </div>
                        <Button asChild variant="outline" className="border-white/10 text-white hover:bg-white/10 rounded-xl px-6 h-12">
                            <Link href="/student/profil">Profili Düzenle</Link>
                        </Button>
                    </CardHeader>
                </Card>

                {/* Quick Access */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <QuickAction icon={Gamepad2} label="Oyunlar" color="bg-pink-500" href="/student/oyunlar" />
                    <QuickAction icon={BookOpen} label="Ders Notları" color="bg-emerald-500" href="/" />
                    <QuickAction icon={Star} label="Mağaza" color="bg-amber-500" href="/student/magaza" />
                    <QuickAction icon={Settings} label="Ayarlar" color="bg-slate-500" href="/student/ayarlar" />
                </div>
                
                {/* Logout Footer for Mobile */}
                <div className="md:hidden pt-8">
                    <Button 
                        variant="destructive" 
                        onClick={handleLogout}
                        className="w-full h-14 text-lg font-bold rounded-2xl shadow-xl shadow-red-900/20"
                    >
                        <LogOut className="h-6 w-6 mr-3" /> GÜVENLİ ÇIKIŞ
                    </Button>
                </div>
            </div>
        </div>
    );
}

function QuickAction({ icon: Icon, label, color, href }: { icon: any, label: string, color: string, href: string }) {
    return (
        <Link href={href}>
            <Card className="bg-slate-900/40 border-white/5 hover:border-white/20 transition-all hover:-translate-y-1 group">
                <CardContent className="flex flex-col items-center justify-center p-6 space-y-3">
                    <div className={cn("p-3 rounded-2xl text-white shadow-lg transition-transform group-hover:scale-110", color)}>
                        <Icon className="h-6 w-6" />
                    </div>
                    <span className="font-bold text-sm text-slate-300 group-hover:text-white transition-colors">{label}</span>
                </CardContent>
            </Card>
        </Link>
    );
}
