'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from './ui/button';
import { BookOpenCheck, LogOut, User as UserIcon, UserCog, DollarSign, Menu } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { UserAvatar } from './user-avatar';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export function AppHeader({ title }: { title?: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { toast } = useToast();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
        await signOut(auth);
        toast({ title: "Başarılı", description: "Oturumunuz güvenli bir şekilde kapatıldı." });
        router.push('/login');
    } catch (error) {
        console.error("Logout error:", error);
        toast({ title: "Hata", description: "Çıkış yapılırken bir hata oluştu.", variant: "destructive" });
    } finally {
        setIsLoggingOut(false);
    }
  };
  
  const getDashboardLink = () => {
    if (!user) return "/";
    return user.role === 'teacher' || user.role === 'superadmin' ? '/' : '/student';
  }

  const isLeaderboardPage = !!title;

  return (
    <>
      <header className={cn(
          "px-6 h-20 hidden md:flex items-center border-b z-50 transition-all duration-300",
          isLeaderboardPage 
            ? "fixed top-0 left-0 right-0 bg-transparent border-transparent" // Oyun/Leaderboard sayfalarında şeffaf
            : "sticky top-0 bg-slate-950/80 backdrop-blur-xl border-white/5" // Normal sayfalarda koyu cam
      )}>
        <Link href="/" className="flex items-center gap-3 group">
          <div className={cn(
              "p-2.5 rounded-xl border transition-all duration-300 shadow-lg",
              isLeaderboardPage 
                ? "bg-white/10 border-white/20 text-white" 
                : "bg-cyan-500/10 border-cyan-500/20 text-cyan-400 group-hover:border-cyan-500/50 group-hover:shadow-cyan-500/20"
          )}>
             <BookOpenCheck className="h-6 w-6" />
          </div>
          
          <div className="flex flex-col">
              <span className={cn(
                  "text-xl font-black tracking-tight leading-none",
                  isLeaderboardPage 
                    ? "text-white drop-shadow-md" 
                    : "text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500"
              )}>
                {title || 'Değerler Oyunu'}
              </span>
              {!title && <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Eğitim Platformu</span>}
          </div>
        </Link>

        <nav className="ml-auto flex gap-3 items-center">
          
           {user && (user.role === 'teacher' || user.role === 'superadmin') && (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" asChild className="text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl">
                            <Link href="/teacher/score-events">
                                <DollarSign className="h-5 w-5" />
                                <span className="sr-only">Puan Hareketleri</span>
                            </Link>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-slate-900 border-white/10 text-white">
                        <p>Puan Hareketleri</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-12 w-12 rounded-full p-0 hover:bg-transparent focus-visible:ring-0">
                      <div className="h-10 w-10 rounded-full border-2 border-slate-700 hover:border-cyan-400 transition-colors p-0.5">
                         <UserAvatar user={user} className="h-full w-full"/>
                      </div>
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 bg-slate-900 border-white/10 text-slate-200" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal p-4">
                      <div className="flex flex-col space-y-1">
                          <p className="text-sm font-bold leading-none text-white">
                              {user.displayName || "Kullanıcı"}
                          </p>
                          <p className="text-xs leading-none text-slate-500 font-mono">
                              {user.email}
                          </p>
                      </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/5" />
                  <DropdownMenuItem asChild className="focus:bg-white/10 focus:text-white cursor-pointer">
                      <Link href={getDashboardLink()}>
                          <UserIcon className="mr-2 h-4 w-4 text-cyan-400" />
                          <span>Panelim</span>
                      </Link>
                  </DropdownMenuItem>
                  {user.role === 'student' && (
                    <DropdownMenuItem asChild className="focus:bg-white/10 focus:text-white cursor-pointer">
                        <Link href="/student/profile">
                          <UserCog className="mr-2 h-4 w-4 text-purple-400" />
                          <span>Profilim</span>
                        </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-white/5" />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Çıkış Yap</span>
                  </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild className="text-slate-300 hover:text-white hover:bg-white/5">
                <Link href="/login">Giriş</Link>
              </Button>
              <Button asChild className="bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/20">
                <Link href="/register">Kayıt Ol</Link>
              </Button>
            </div>
          )}
        </nav>
      </header>
    </>
  );
}