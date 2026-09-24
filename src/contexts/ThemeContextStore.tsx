import { createContext, useContext } from 'react'
import type {
  BorderRadiusOption,
  FontSizeOption,
  PrimaryColorOption,
  SidebarStyleOption,
  ThemeMode,
} from '../services/settingsService'

export interface ThemeContextValue {
  mode: ThemeMode
  primaryColor: PrimaryColorOption
  sidebarStyle: SidebarStyleOption
  borderRadius: BorderRadiusOption
  fontSize: FontSizeOption
  setMode: (mode: ThemeMode) => void
  setPrimaryColor: (color: PrimaryColorOption) => void
  setSidebarStyle: (style: SidebarStyleOption) => void
  setBorderRadius: (value: BorderRadiusOption) => void
  setFontSize: (value: FontSizeOption) => void
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function useThemeSettings() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useThemeSettings must be used within ThemeProviderWrapper')
  }

  return context
}
