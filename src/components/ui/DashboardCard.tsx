import { Box, Typography, useTheme } from '@mui/material'
import { motion } from 'framer-motion'

interface DashboardCardProps {
  title: string
  value: string
  label: string
  gradient: string
  icon: React.ReactNode
}

export function DashboardCard({ title, value, label, gradient, icon }: DashboardCardProps) {
  const theme = useTheme()
  return (
    <Box
      component={motion.article}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 4,
        backgroundColor: '#FFFFFF',
        boxShadow: 'none',
        border: '1px solid #E2E8F0',
        p: 3,
        minHeight: 170,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: theme.palette.text.secondary }}>{title}</Typography>
          <Typography sx={{ fontSize: 34, fontWeight: 800, mt: 1, lineHeight: 1 }}>{value}</Typography>
        </Box>
        <Box sx={{ width: 56, height: 56, borderRadius: 16, background: gradient, display: 'grid', placeItems: 'center', color: '#fff' }}>
          {icon}
        </Box>
      </Box>
      <Typography sx={{ color: '#64748B', fontSize: 13, mt: 2 }}>{label}</Typography>
      <Box sx={{ position: 'absolute', inset: 0, background: gradient, opacity: 0.08, pointerEvents: 'none' }} />
    </Box>
  )
}
