'use client'

import { useTheme } from '@/context/theme-provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Palette, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const themes = [
  { value: 'default', label: 'Varsayılan (Turkuaz)' },
  { value: 'zinc', label: 'Çinko' },
  { value: 'rose', label: 'Gül' },
  { value: 'blue', label: 'Mavi' },
  { value: 'green', label: 'Yeşil' },
  { value: 'orange', label: 'Turuncu' },
]

export function ThemeSwitcher() {
  const { colorTheme, setColorTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Palette className="h-5 w-5" />
          <span className="sr-only">Temayı değiştir</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {themes.map((t) => (
          <DropdownMenuItem key={t.value} onClick={() => setColorTheme(t.value as any)}>
            <Check className={cn("mr-2 h-4 w-4", colorTheme === t.value ? "opacity-100" : "opacity-0")} />
            {t.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
