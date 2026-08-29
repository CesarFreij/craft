import type { PaletteMode } from '@mui/material'
import { createTheme } from '@mui/material/styles'

import type {
  BorderRadiusOption,
  FontSizeOption,
  SidebarStyleOption,
} from '../services/settingsService'

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
    light: '#60A5FA',
    accent: '#22D3EE',
  },
  cyan: {
    main: '#0EA5E9',
    light: '#67E8F9',
    accent: '#22D3EE',
  },
}

/*
 * مهم:
 * هاي القيمة هي BASE UNIT للـ sx.
 * borderRadius: 3 في sx = 3 × shape.borderRadius.
 *
 * لذلك لازم تضل صغيرة.
 */
const shapeRadiusMap: Record<BorderRadiusOption, number> = {
  small: 4,
  medium: 60,
  large: 8,
}

/*
 * هاي للـcomponents مباشرة، وبتنكتب px صريحة.
 */
const componentRadiusMap: Record<BorderRadiusOption, string> = {
  small: '10px',
  medium: '18px',
  large: '18px',
}

const popupRadiusMap: Record<BorderRadiusOption, string> = {
  small: '80px',
  medium: '120px',
  large: '160px',
}

const fontSizeMap: Record<FontSizeOption, number> = {
  small: 13,
  medium: 15,
  large: 17,
}

export function createCraftTheme(options: ThemeOptions) {
  const palette = paletteVariants[options.primaryColor]

  return createTheme({
    direction: 'rtl',

    palette: {
      mode: options.mode,

      primary: {
        main: palette.main,
        light: palette.light,
      },

      secondary: {
        main: '#22D3EE',
      },

      background: {
        default: '#06142F',
        paper: '#0F1F3A',
      },

      text: {
        primary: '#F8FAFC',
        secondary: '#CBD5E1',
      },
    },

    shape: {
      borderRadius: shapeRadiusMap[options.borderRadius],
    },

    typography: {
      fontFamily: "'Inter', 'Noto Kufi Arabic', 'Segoe UI', sans-serif",
      fontSize: fontSizeMap[options.fontSize],

      button: {
        textTransform: 'none',
      },
    },

    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            background: '#06142F',
            color: '#F8FAFC',
          },

          '#root, #app': {
            minHeight: '100vh',
          },

          table: {
            borderCollapse: 'collapse',
          },

          /*
           * Scrollbar عام لكل البرنامج:
           * صفحات، جداول، Dialogs، Menus وأي عنصر فيه overflow.
           */
          '*': {
            scrollbarWidth: 'thin',
            scrollbarColor: '#38BDF8 rgba(148, 163, 184, 0.18)',
          },

          '*::-webkit-scrollbar': {
            width: '9px',
            height: '9px',
          },

          '*::-webkit-scrollbar-track': {
            background: 'rgba(148, 163, 184, 0.18)',
            borderRadius: '999px',
          },

          '*::-webkit-scrollbar-thumb': {
            background: '#38BDF8',
            borderRadius: '999px',
            border: '2px solid transparent',
            backgroundClip: 'padding-box',
          },

          '*::-webkit-scrollbar-thumb:hover': {
            background: '#0EA5E9',
            backgroundClip: 'padding-box',
          },

          '*::-webkit-scrollbar-corner': {
            background: 'transparent',
          },
        },
      },

      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },

      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: componentRadiusMap[options.borderRadius],
            textTransform: 'none',
          },
        },
      },

      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: popupRadiusMap[options.borderRadius],
          },
        },
      },

      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: componentRadiusMap[options.borderRadius],
          },
        },
      },

      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: 'rgba(255,255,255,0.68)',

            '&.Mui-focused': {
              color: '#67E8F9',
            },
          },
        },
      },

      /*
       * SELECT / MENU
       */
      MuiMenu: {
        styleOverrides: {
          paper: {
            marginTop: 6,

            borderRadius: popupRadiusMap[options.borderRadius],

            background: 'rgba(8, 22, 48, 0.96)',

            backdropFilter: 'blur(22px) saturate(125%)',
            WebkitBackdropFilter: 'blur(22px) saturate(125%)',

            border: '1px solid rgba(255,255,255,0.12)',

            boxShadow:
              '0 20px 50px rgba(2,6,23,0.38)',

            overflow: 'hidden',
          },

          list: {
            padding: '6px',
          },
        },
      },

      MuiMenuItem: {
        styleOverrides: {
          root: {
            minHeight: 40,

            margin: '2px 0',

            borderRadius: popupRadiusMap[options.borderRadius],

            color: 'rgba(255,255,255,0.88)',

            '&:hover': {
              backgroundColor: 'rgba(56,189,248,0.10)',
              color: '#FFFFFF',
            },

            '&.Mui-selected': {
              backgroundColor: 'rgba(34,211,238,0.13)',
              color: '#67E8F9',
            },

            '&.Mui-selected:hover': {
              backgroundColor: 'rgba(34,211,238,0.18)',
            },
          },
        },
      },

      /*
       * POPOVER
       */
      MuiPopover: {
        styleOverrides: {
          paper: {
            borderRadius: popupRadiusMap[options.borderRadius],

            background: 'rgba(8,22,48,0.96)',

            backdropFilter: 'blur(22px) saturate(125%)',
            WebkitBackdropFilter: 'blur(22px) saturate(125%)',

            border: '1px solid rgba(255,255,255,0.12)',

            boxShadow:
              '0 20px 50px rgba(2,6,23,0.38)',

            color: '#F8FAFC',
          },
        },
      },

      /*
       * AUTOCOMPLETE POPUP
       */
      MuiAutocomplete: {
        styleOverrides: {
          paper: {
            borderRadius: popupRadiusMap[options.borderRadius],

            background: 'rgba(8,22,48,0.96)',

            backdropFilter: 'blur(22px) saturate(125%)',
            WebkitBackdropFilter: 'blur(22px) saturate(125%)',

            border: '1px solid rgba(255,255,255,0.12)',

            boxShadow:
              '0 20px 50px rgba(2,6,23,0.38)',

            color: '#F8FAFC',
          },

          listbox: {
            padding: 6,

            '& .MuiAutocomplete-option': {
              marginBlock: 2,

              borderRadius: popupRadiusMap[options.borderRadius],

              color: 'rgba(255,255,255,0.88)',

              '&[aria-selected="true"]': {
                backgroundColor: 'rgba(34,211,238,0.13)',
                color: '#67E8F9',
              },

              '&.Mui-focused': {
                backgroundColor: 'rgba(56,189,248,0.10)',
              },
            },
          },

          noOptions: {
            color: 'rgba(255,255,255,0.68)',
          },

          loading: {
            color: 'rgba(255,255,255,0.68)',
          },
        },
      },

      /*
       * TOOLTIP
       */
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            background: 'rgba(15,23,42,0.96)',
            color: '#F8FAFC',

            border: '1px solid rgba(255,255,255,0.10)',

            borderRadius: popupRadiusMap[options.borderRadius],

            fontSize: 12,
          },
        },
      },

      /*
       * DIALOG
       *
       * نخليه Light Glass لأن هاد النمط الحالي الموجود بالثيم.
       */
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: componentRadiusMap[options.borderRadius],

            background: 'rgba(248,250,252,0.94)',

            backdropFilter: 'blur(18px) saturate(120%)',
            WebkitBackdropFilter: 'blur(18px) saturate(120%)',

            border: '1px solid rgba(255,255,255,0.62)',

            boxShadow:
              '0 26px 65px rgba(2,6,23,0.28)',

            color: '#0F172A',

            backgroundImage: 'none',
          },
        },
      },

      MuiDialogTitle: {
        styleOverrides: {
          root: {
            color: '#0F172A',
          },
        },
      },

      MuiDialogContent: {
        styleOverrides: {
          root: {
            color: '#0F172A',
          },
        },
      },

      MuiDialogActions: {
        styleOverrides: {
          root: {
            padding: '16px 24px 20px',
          },
        },
      },

      /*
       * TABLE
       */
      MuiTable: {
        styleOverrides: {
          root: {
            borderCollapse: 'collapse',
          },
        },
      },

      MuiTableCell: {
        styleOverrides: {
          root: {
            verticalAlign: 'middle',

            textAlign: 'center',
            textAlignLast: 'center',

            borderColor: 'rgba(255,255,255,0.10)',
          },

          head: {
            fontWeight: 700,
          },
        },
      },

      MuiTablePagination: {
        styleOverrides: {
          root: {
            border: 'none',
          },
        },
      },

      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: 'rgba(255,255,255,0.10)',
          },
        },
      },
    },
  })
}
