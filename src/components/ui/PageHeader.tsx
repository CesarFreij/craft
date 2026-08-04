import { Box, Typography } from '@mui/material'
import { motion } from 'framer-motion'

interface PageHeaderProps {
  title: string
  breadcrumb: string
  actions?: React.ReactNode
}

export function PageHeader({ title, breadcrumb, actions }: PageHeaderProps) {
  return (
    <Box component={motion.div} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} sx={{ mb: 3, p: 2.2, borderRadius: 3.5, background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(15, 23, 42, 0.06)', boxShadow: '0 16px 40px rgba(15, 23, 42, 0.05)' }}>
      <Typography sx={{ fontSize: 24, fontWeight: 800, mb: 0.4, color: '#111827' }}>{title}</Typography>
      <Typography sx={{ color: 'text.secondary', fontSize: 12.5, mb: actions ? 1.8 : 0 }}>{breadcrumb}</Typography>
      {actions && (
        <Box sx={{ display: 'flex', gap: 1.2, flexWrap: 'wrap', alignItems: 'center' }}>{actions}</Box>
      )}
    </Box>
  )
}
