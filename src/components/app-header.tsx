'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from './ui/button';
import { BookOpenCheck, LogOut, User as UserIcon, UserCog, Bug, DollarSign, Loader2, Trophy } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { UserAvatar } from './user-avatar';
import { ErrorReportDialog } from './error-report-dialog';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { cn } from '@/lib/utils';

export function AppHeader({ title }: { title?: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };
  
  const getDashboardLink = () => {
    if (!user) return "/";
    // For teachers, the main page IS their dashboard now.
    return user.role === 'teacher' || user.role === 'superadmin' ? '/' : '/student';
  }

  const isLeaderboardPage = !!title;

  return (
    <>
      <header className={cn(
          "px-4 h-16 hidden md:flex items-center border-b",
          isLeaderboardPage ? "bg-transparent text-white border-white/10" : "bg-card"
      )}>
        <Link href="/" className="flex items-center justify-center">
          <BookOpenCheck className={cn("h-6 w-6", isLeaderboardPage ? "text-amber-400" : "text-primary")} />
          <span className={cn(
              "ml-2 text-lg font-semibold",
              isLeaderboardPage ? "text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-500" : "font-headline"
          )}>{title || 'Değerler Oyunu'}</span>
        </Link>
        <nav className="ml-auto flex gap-1 sm:gap-2 items-center">
          
           {user && (user.role === 'teacher' || user.role === 'superadmin') && (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" asChild>
                            <Link href="/teacher/score-events">
                                <DollarSign className="h-5 w-5" />
                                <span className="sr-only">Puan Hareketleri</span>
                            </Link>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Puan Hareketleri</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
          )}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <UserAvatar user={user} className="h-10 w-10"/>
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">
                              {user.displayName || user.email}
                          </p>
                          <p className="text-xs leading-none text-muted-foreground">
                              {user.email}
                          </p>
                      </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                      <Link href={getDashboardLink()}>
                          <UserIcon className="mr-2 h-4 w-4" />
                          <span>Panelim</span>
                      </Link>
                  </DropdownMenuItem>
                  {user.role === 'student' && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/student/profile">
                          <UserCog className="mr-2 h-4 w-4" />
                          <span>Profilim</span>
                        </Link>
                      </DropdownMenuItem>
                       <DropdownMenuItem onClick={() => setIsReportDialogOpen(true)}>
                        <Bug className="mr-2 h-4 w-4" />
                        <span>Hata Bildir</span>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Çıkış Yap</span>
                  </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">Giriş</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Kayıt Ol</Link>
              </Button>
            </>
          )}
        </nav>
      </header>
      {user?.role === 'student' && (
          <ErrorReportDialog isOpen={isReportDialogOpen} onOpenChange={setIsReportDialogOpen} />
      )}
    </>
  );
}
