
'use client'

import { useTheme } from '@/context/theme-provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sun, Moon, Laptop } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ModeSwitcher() {
  const { themeMode, setThemeMode } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Açık/Koyu Mod</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setThemeMode('light')}>
          <Sun className="mr-2 h-4 w-4" />
          <span>Açık</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setThemeMode('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          <span>Koyu</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setThemeMode('system')}>
          <Laptop className="mr-2 h-4 w-4" />
          <span>Sistem</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
