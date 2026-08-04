import { Box, Typography } from '@mui/material'
import { motion } from 'framer-motion'

interface InfoCardProps {
  title: string
  value: string
  subtitle: string
}

export function InfoCard({ title, value, subtitle }: InfoCardProps) {
  return (
    <Box
      component={motion.article}
      whileHover={{ translateY: -4 }}
      transition={{ duration: 0.3 }}
      sx={{ p: 3, borderRadius: 3, background: '#ffffff', border: '1px solid rgba(15, 23, 42, 0.08)', boxShadow: '0 18px 40px rgba(15, 23, 42, 0.06)' }}
    >
      <Typography sx={{ fontSize: 13, color: '#64748B', mb: 1 }}>{title}</Typography>
      <Typography sx={{ fontSize: 28, fontWeight: 800 }}>{value}</Typography>
      <Typography sx={{ color: '#475569', mt: 1, fontSize: 13 }}>{subtitle}</Typography>
    </Box>
  )
}
