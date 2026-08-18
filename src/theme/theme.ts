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
        // App background: very light gray (global content background)
        default: '#F7F8FA',
        // Cards / papers remain white
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
            background: '#F7F8FA',
          },
          '#root, #app': {
            background: '#F7F8FA',
          },
          table: {
            borderCollapse: 'collapse',
          },
          'table th, table td': {
            border: '1px solid #E2E8F0',
            verticalAlign: 'middle',
          },
        },
      },
      MuiTable: {
        styleOverrides: {
          root: {
            borderCollapse: 'collapse',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: '#FFFFFF',
            backgroundImage: 'none',
            boxShadow: 'none',
            border: '1px solid #E2E8F0',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: radiusMap[options.borderRadius],
            backgroundColor: '#FFFFFF',
            boxShadow: 'none',
            border: '1px solid #E2E8F0',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            boxShadow: '0 2px 4px rgba(15, 23, 42, 0.05)',
            border: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
          },
        },
      },
      MuiPopover: {
        styleOverrides: {
          paper: {
            boxShadow: '0 2px 4px rgba(15, 23, 42, 0.05)',
            border: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
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
      MuiTableCell: {
        styleOverrides: {
          root: {
            border: '1px solid #E2E8F0',
            verticalAlign: 'middle',
            textAlign: 'center',
            textAlignLast: 'center',
          },
          head: {
            fontWeight: 700,
          },
        },
      },
    },
  })
}
