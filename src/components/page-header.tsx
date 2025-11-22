'use client';

import { usePathname } from 'next/navigation';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  Bot,
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  PanelLeft,
  Route,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/lessons', icon: BookOpen, label: 'Lessons' },
  { href: '/learning-path', icon: Route, label: 'Learning Path' },
  { href: '/tutor', icon: Bot, label: 'AI Tutor' },
];

export function PageHeader() {
  const pathname = usePathname();

  const getTitle = () => {
    if (pathname.startsWith('/lessons/')) {
      return 'Lesson';
    }
    const currentNavItem = navItems.find((item) =>
      pathname.startsWith(item.href)
    );
    return currentNavItem ? currentNavItem.label : 'EduAI';
  };

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="sm:hidden">
            <PanelLeft className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="sm:max-w-xs">
          <nav className="grid gap-6 text-lg font-medium">
            <Link
              href="/dashboard"
              className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
            >
              <GraduationCap className="h-5 w-5 transition-all group-hover:scale-110" />
              <span className="sr-only">EduAI</span>
            </Link>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground',
                  pathname.startsWith(item.href) && 'text-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
            <Link
              href="#"
              className="mt-auto flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
            >
              <Settings className="h-5 w-5" />
              Settings
            </Link>
          </nav>
        </SheetContent>
      </Sheet>
      <h1 className="font-headline text-xl font-semibold md:text-2xl">
        {getTitle()}
      </h1>
    </>
  );
}
