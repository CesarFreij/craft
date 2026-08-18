import { Box, Paper, Typography } from '@mui/material'
import { motion } from 'framer-motion'

interface SectionCardProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  children: React.ReactNode
}

export function SectionCard({ title, subtitle, actions, children }: SectionCardProps) {
  return (
    <Paper
      component={motion.section}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      sx={{ p: 3, borderRadius: 4, backgroundColor: '#FFFFFF', boxShadow: 'none', border: '1px solid #E2E8F0' }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: 16 }}>{title}</Typography>
          {subtitle && <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 0.5 }}>{subtitle}</Typography>}
        </Box>
        {actions && (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-start' }}>
            {actions}
          </Box>
        )}
      </Box>
      {children}
    </Paper>
  )
}
