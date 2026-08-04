import { Box, Typography } from '@mui/material'

interface StatusBadgeProps {
  label: string
  color: string
}

export function StatusBadge({ label, color }: StatusBadgeProps) {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 2, py: 0.75, borderRadius: 2, background: `${color}1A`, color, fontWeight: 700, fontSize: 12 }}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
      <Typography>{label}</Typography>
    </Box>
  )
}
