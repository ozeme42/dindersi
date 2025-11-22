'use client';

import Link from 'next/link';
import {
  Bot,
  BookOpen,
  LayoutDashboard,
  Route,
  Settings,
  GraduationCap,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/lessons', icon: BookOpen, label: 'Lessons' },
  { href: '/learning-path', icon: Route, label: 'Learning Path' },
  { href: '/tutor', icon: Bot, label: 'AI Tutor' },
];

export function MainSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
      <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
        <Link
          href="/dashboard"
          className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
        >
          <GraduationCap className="h-5 w-5 transition-all group-hover:scale-110" />
          <span className="sr-only">EduAI</span>
        </Link>
        <TooltipProvider>
          {navItems.map((item) => (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8',
                    pathname.startsWith(item.href) &&
                      'bg-accent text-accent-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="sr-only">{item.label}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </nav>
      <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
              >
                <Settings className="h-5 w-5" />
                <span className="sr-only">Settings</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Settings</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </nav>
    </aside>
  );
}
