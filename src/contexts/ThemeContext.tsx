import { CacheProvider } from '@emotion/react'
import createCache from '@emotion/cache'
import rtlPlugin from 'stylis-plugin-rtl'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { CssBaseline, ThemeProvider } from '@mui/material'
import type { PaletteMode } from '@mui/material'
import { createCraftTheme } from '../theme/theme'

const cacheRtl = createCache({ key: 'mui-rtl', stylisPlugins: [rtlPlugin] })

type ThemeMode = 'light' | 'dark' | 'system'
export type BorderRadiusOption = 'small' | 'medium' | 'large'
export type SidebarStyleOption = 'glass' | 'solid'
export type FontSizeOption = 'small' | 'medium' | 'large'

interface ThemeContextValue {
  mode: ThemeMode
  primaryColor: 'blue' | 'cyan'
  sidebarStyle: SidebarStyleOption
  borderRadius: BorderRadiusOption
  fontSize: FontSizeOption
  setMode: (mode: ThemeMode) => void
  setPrimaryColor: (color: 'blue' | 'cyan') => void
  setSidebarStyle: (style: SidebarStyleOption) => void
  setBorderRadius: (value: BorderRadiusOption) => void
  setFontSize: (value: FontSizeOption) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const defaultState = {
  mode: 'system' as ThemeMode,
  primaryColor: 'blue' as 'blue' | 'cyan',
  sidebarStyle: 'glass' as SidebarStyleOption,
  borderRadius: 'medium' as BorderRadiusOption,
  fontSize: 'medium' as FontSizeOption,
}

export function ThemeProviderWrapper({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(defaultState.mode)
  const [primaryColor, setPrimaryColor] = useState<'blue' | 'cyan'>(defaultState.primaryColor)
  const [sidebarStyle, setSidebarStyle] = useState<SidebarStyleOption>(defaultState.sidebarStyle)
  const [borderRadius, setBorderRadius] = useState<BorderRadiusOption>(defaultState.borderRadius)
  const [fontSize, setFontSize] = useState<FontSizeOption>(defaultState.fontSize)
  const [resolvedMode, setResolvedMode] = useState<PaletteMode>('light')

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const resolveMode = (): PaletteMode => {
      if (mode === 'system') {
        return media.matches ? 'dark' : 'light'
      }
      return mode
    }

    const update = () => setResolvedMode(resolveMode())
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [mode])

  const theme = useMemo(
    () => createCraftTheme({
      mode: resolvedMode,
      primaryColor,
      sidebarStyle,
      borderRadius,
      fontSize,
    }),
    [resolvedMode, primaryColor, sidebarStyle, borderRadius, fontSize],
  )

  const value = useMemo(
    () => ({
      mode,
      primaryColor,
      sidebarStyle,
      borderRadius,
      fontSize,
      setMode,
      setPrimaryColor,
      setSidebarStyle,
      setBorderRadius,
      setFontSize,
    }),
    [mode, primaryColor, sidebarStyle, borderRadius, fontSize],
  )

  return (
    <ThemeContext.Provider value={value}>
      <CacheProvider value={cacheRtl}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </CacheProvider>
    </ThemeContext.Provider>
  )
}

export function useThemeSettings() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useThemeSettings must be used within ThemeProviderWrapper')
  }
  return context
}
