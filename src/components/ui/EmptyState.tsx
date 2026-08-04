import { Box, Button, Typography } from '@mui/material'

interface EmptyStateProps {
  title: string
  description: string
  actionLabel?: string
}

export function EmptyState({ title, description, actionLabel = 'إنشاء جديد' }: EmptyStateProps) {
  return (
    <Box sx={{ p: 6, borderRadius: 4, background: 'rgba(37, 99, 235, 0.04)', textAlign: 'center' }}>
      <Typography sx={{ fontSize: 18, fontWeight: 700, mb: 1 }}>{title}</Typography>
      <Typography sx={{ color: '#475569', mb: 3 }}>{description}</Typography>
      <Button variant="contained">{actionLabel}</Button>
    </Box>
  )
}
