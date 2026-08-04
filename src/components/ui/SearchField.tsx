import { InputAdornment, OutlinedInput, useTheme } from '@mui/material'
import { FiSearch } from 'react-icons/fi'

interface SearchFieldProps {
  placeholder?: string
}

export function SearchField({ placeholder = 'ابحث هنا...' }: SearchFieldProps) {
  const theme = useTheme()
  return (
    <OutlinedInput
      placeholder={placeholder}
      fullWidth
      sx={{
        borderRadius: 3,
        background: '#F8FAFC',
        borderColor: 'rgba(15, 23, 42, 0.08)',
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: 'rgba(15, 23, 42, 0.08)',
        },
      }}
      startAdornment={
        <InputAdornment position="start">
          <FiSearch color={theme.palette.text.secondary} />
        </InputAdornment>
      }
    />
  )
}
