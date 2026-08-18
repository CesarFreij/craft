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
      sx={{ p: 3, borderRadius: 3, backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: 'none' }}
    >
      <Typography sx={{ fontSize: 13, color: '#64748B', mb: 1 }}>{title}</Typography>
      <Typography sx={{ fontSize: 28, fontWeight: 800 }}>{value}</Typography>
      <Typography sx={{ color: '#475569', mt: 1, fontSize: 13 }}>{subtitle}</Typography>
    </Box>
  )
}
