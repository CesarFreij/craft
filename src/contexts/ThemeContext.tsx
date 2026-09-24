/* eslint-disable react-refresh/only-export-components */

import { CacheProvider } from '@emotion/react'
import createCache from '@emotion/cache'
import rtlPlugin from 'stylis-plugin-rtl'
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { CssBaseline, ThemeProvider } from '@mui/material'
import type { PaletteMode } from '@mui/material'
import { loadSettings, saveSettings } from '../services/settingsService'
import type {
  AppSettings,
  BorderRadiusOption,
  FontSizeOption,
  PrimaryColorOption,
  SidebarStyleOption,
  ThemeMode,
} from '../services/settingsService'
import { createCraftTheme } from '../theme/theme'
import { ThemeContext } from './ThemeContextStore'

export { useThemeSettings } from './ThemeContextStore'

const cacheRtl = createCache({ key: 'mui-rtl', stylisPlugins: [rtlPlugin] })

export function ThemeProviderWrapper({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())
  const { mode, primaryColor, sidebarStyle, borderRadius, fontSize } = settings
  const [resolvedMode, setResolvedMode] = useState<PaletteMode>('light')

  const persistTheme = (patch: Partial<AppSettings>) => {
    setSettings((current) => saveSettings({ ...current, ...patch }))
  }

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
    () =>
      createCraftTheme({
        mode: resolvedMode,
        primaryColor,
        sidebarStyle,
        borderRadius,
        fontSize,
      }),
    [resolvedMode, primaryColor, sidebarStyle, borderRadius, fontSize],
  )

  useEffect(() => {
    const fontSizeMap: Record<FontSizeOption, number> = {
      small: 13,
      default: 14,
      medium: 15,
      large: 16,
      extraLarge: 17,
    }

    document.documentElement.style.fontSize = `${fontSizeMap[fontSize]}px`
    document.documentElement.style.setProperty('--app-font-size', `${fontSizeMap[fontSize]}px`)

    return () => {
      document.documentElement.style.fontSize = '14px'
      document.documentElement.style.removeProperty('--app-font-size')
    }
  }, [fontSize])

  const value = useMemo(
    () => ({
      mode,
      primaryColor,
      sidebarStyle,
      borderRadius,
      fontSize,
      setMode: (nextMode: ThemeMode) => {
        persistTheme({ mode: nextMode })
      },
      setPrimaryColor: (nextColor: PrimaryColorOption) => {
        persistTheme({ primaryColor: nextColor })
      },
      setSidebarStyle: (nextStyle: SidebarStyleOption) => {
        persistTheme({ sidebarStyle: nextStyle })
      },
      setBorderRadius: (nextRadius: BorderRadiusOption) => {
        persistTheme({ borderRadius: nextRadius })
      },
      setFontSize: (nextFontSize: FontSizeOption) => {
        persistTheme({ fontSize: nextFontSize })
      },
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
