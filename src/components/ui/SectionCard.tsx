import { Box, Paper, Typography } from '@mui/material'
import { motion } from 'framer-motion'

interface SectionCardProps {
  title: string
  subtitle?: string
  children: React.ReactNode
}

export function SectionCard({ title, subtitle, children }: SectionCardProps) {
  return (
    <Paper
      component={motion.section}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      sx={{ p: 3, borderRadius: 4, background: '#fff', boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)' }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: 16 }}>{title}</Typography>
          {subtitle && <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 0.5 }}>{subtitle}</Typography>}
        </Box>
      </Box>
      {children}
    </Paper>
  )
}
