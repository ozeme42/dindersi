
'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type ColorTheme = "default" | "zinc" | "rose" | "blue" | "green" | "orange";
type ThemeMode = "light" | "dark" | "system";

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: ColorTheme
  defaultMode?: ThemeMode
  storageKey?: string
}

type ThemeProviderState = {
  colorTheme: ColorTheme
  setColorTheme: (theme: ColorTheme) => void
  themeMode: ThemeMode,
  setThemeMode: (mode: ThemeMode) => void
}

const initialState: ThemeProviderState = {
  colorTheme: 'default',
  themeMode: 'dark',
  setColorTheme: () => null,
  setThemeMode: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = 'default',
  defaultMode = 'dark',
  storageKey = 'tamuyum-theme',
  ...props
}: ThemeProviderProps) {
  const colorThemeStorageKey = `${storageKey}-color`;
  const themeModeStorageKey = `${storageKey}-mode`;

  const [colorTheme, setColorTheme] = useState<ColorTheme>(() => {
    if (typeof window === 'undefined') return defaultTheme;
    try {
      return (localStorage.getItem(colorThemeStorageKey) as ColorTheme) || defaultTheme;
    } catch (error) {
      console.error("Error reading color theme from localStorage", error);
      return defaultTheme;
    }
  });

  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
     if (typeof window === 'undefined') return defaultMode;
    try {
      return (localStorage.getItem(themeModeStorageKey) as ThemeMode) || defaultMode;
    } catch (error) {
      console.error("Error reading theme mode from localStorage", error);
      return defaultMode;
    }
  });

  useEffect(() => {
    const root = window.document.documentElement
    root.setAttribute('data-theme', colorTheme);
     try {
        localStorage.setItem(colorThemeStorageKey, colorTheme)
      } catch (e) {
        console.error("Error setting color theme in localStorage", e);
      }
  }, [colorTheme, colorThemeStorageKey])
  
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (themeMode === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(themeMode);
     try {
        localStorage.setItem(themeModeStorageKey, themeMode);
      } catch (e) {
        console.error("Error setting theme mode in localStorage", e);
      }
  }, [themeMode, themeModeStorageKey]);

  const value = {
    colorTheme,
    setColorTheme,
    themeMode,
    setThemeMode
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider')

  return context
}
