import { Box, Typography } from '@mui/material'

interface StatusBadgeProps {
  label: string
  color: string
}

export function StatusBadge({ label, color }: StatusBadgeProps) {
  return (
    <Box sx={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 0.75,
      minWidth: 0,
      px: 1.25,
      py: 0.4,
      borderRadius: 999,
      background: `${color}1A`,
      color,
      fontSize: '0.85em',
      fontWeight: 400,
      whiteSpace: 'nowrap',
    }}>
      <Box sx={{ width: 8, height: 8, flexShrink: 0, borderRadius: '50%', background: color }} />
      <Typography sx={{ whiteSpace: 'nowrap', fontSize: 'inherit', fontWeight: 400 }}>{label}</Typography>
    </Box>
  )
}
