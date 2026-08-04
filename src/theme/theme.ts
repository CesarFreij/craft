import type { PaletteMode } from '@mui/material'
import { createTheme } from '@mui/material/styles'
import type { BorderRadiusOption, FontSizeOption, SidebarStyleOption } from '../contexts/ThemeContext'

interface ThemeOptions {
  mode: PaletteMode
  primaryColor: 'blue' | 'cyan'
  sidebarStyle: SidebarStyleOption
  borderRadius: BorderRadiusOption
  fontSize: FontSizeOption
}

const paletteVariants = {
  blue: {
    main: '#1D4ED8',
    light: '#2563EB',
    accent: '#06B6D4',
  },
  cyan: {
    main: '#0EA5E9',
    light: '#22D3EE',
    accent: '#2DD4BF',
  },
}

const radiusMap: Record<BorderRadiusOption, number> = {
  small: 12,
  medium: 18,
  large: 26,
}

const fontSizeMap: Record<FontSizeOption, number> = {
  small: 13,
  medium: 15,
  large: 17,
}

export function createCraftTheme(options: ThemeOptions) {
  const palette = paletteVariants[options.primaryColor]
  const primary = {
    main: palette.main,
    light: palette.light,
  }

  return createTheme({
    direction: 'rtl',
    palette: {
      mode: options.mode,
      primary,
      secondary: {
        main: '#22D3EE',
      },
      background: {
        default: '#F4F7FA',
        paper: '#FFFFFF',
      },
      text: {
        primary: '#111827',
        secondary: '#4B5563',
      },
    },
    shape: {
      borderRadius: radiusMap[options.borderRadius],
    },
    typography: {
      fontFamily: "'Inter', 'Noto Kufi Arabic', 'Segoe UI', sans-serif",
      fontSize: fontSizeMap[options.fontSize], 
      button: {
        textTransform: 'none',
      },
      allVariants: {
        color: '#1F2937',
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            background: '#F4F7FA',
          },
          '*': {
            scrollbarGutter: 'stable',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backdropFilter: 'blur(18px)',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: radiusMap[options.borderRadius],
            boxShadow: '0 28px 80px rgba(15, 23, 42, 0.08)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: radiusMap[options.borderRadius],
          },
        },
      },
    },
  })
}
