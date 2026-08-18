import { InputAdornment, OutlinedInput, useTheme } from '@mui/material'
import type { SxProps, Theme } from '@mui/material'
import { FiSearch } from 'react-icons/fi'

interface SearchFieldProps {
  placeholder?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  sx?: SxProps<Theme>
}

export function SearchField({ placeholder = 'ابحث هنا...', value, onChange, sx }: SearchFieldProps) {
  const theme = useTheme()
  return (
    <OutlinedInput
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      fullWidth
      sx={{
        borderRadius: 3,
        background: '#F8FAFC',
        borderColor: 'rgba(15, 23, 42, 0.08)',
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: 'rgba(15, 23, 42, 0.08)',
        },
        ...sx,
      }}
      startAdornment={
        <InputAdornment position="start">
          <FiSearch color={theme.palette.text.secondary} />
        </InputAdornment>
      }
    />
  )
}
