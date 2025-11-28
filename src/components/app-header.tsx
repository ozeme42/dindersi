
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from './ui/button';
import { BookOpenCheck, LogOut, User as UserIcon, UserCog, Bug, DollarSign, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { ModeSwitcher } from './mode-switcher';
import { UserAvatar } from './user-avatar';
import { ErrorReportDialog } from './error-report-dialog';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { BottomNavBar } from '@/components/bottom-nav-bar';

export function AppHeader() {
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

  return (
    <>
      <header className="px-4 h-16 flex items-center bg-card/95 backdrop-blur-sm border-b z-50 sticky top-0">
        <Link href="/" className="flex items-center justify-center">
          <BookOpenCheck className="h-6 w-6 text-primary" />
          <span className="ml-2 text-lg font-semibold font-headline">Değerler Oyunu</span>
        </Link>
        <nav className="ml-auto flex gap-1 sm:gap-2 items-center">
          <ModeSwitcher />
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
       <BottomNavBar />
      {user?.role === 'student' && (
          <ErrorReportDialog isOpen={isReportDialogOpen} onOpenChange={setIsReportDialogOpen} />
      )}
    </>
  );
}
