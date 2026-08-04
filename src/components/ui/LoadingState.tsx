import { Box, CircularProgress, Typography } from '@mui/material'

export function LoadingState() {
  return (
    <Box sx={{ p: 6, display: 'grid', placeItems: 'center', gap: 2, background: '#fff', borderRadius: 4, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
      <CircularProgress color="primary" />
      <Typography sx={{ color: '#475569' }}>جارٍ تحميل البيانات ...</Typography>
    </Box>
  )
}
