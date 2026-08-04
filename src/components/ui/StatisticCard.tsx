import { Box, Typography } from '@mui/material'
import { motion } from 'framer-motion'

interface StatisticCardProps {
  title: string
  value: string
  subtitle: string
}

export function StatisticCard({ title, value, subtitle }: StatisticCardProps) {
  return (
    <Box
      component={motion.div}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      sx={{
        p: 3,
        borderRadius: 3,
        background: '#F8FAFC',
        border: '1px solid rgba(15, 23, 42, 0.06)',
        minWidth: 220,
      }}
    >
      <Typography sx={{ color: 'text.secondary', fontSize: 12, fontWeight: 700 }}>{title}</Typography>
      <Typography sx={{ fontSize: 28, fontWeight: 800, mt: 1 }}>{value}</Typography>
      <Typography sx={{ color: '#64748B', fontSize: 13, mt: 1 }}>{subtitle}</Typography>
    </Box>
  )
}
