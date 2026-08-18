import { Box, Typography } from '@mui/material'
import { motion } from 'framer-motion'

interface PageHeaderProps {
  title: string
  breadcrumb: string
  actions?: React.ReactNode
}

export function PageHeader({ title, breadcrumb, actions }: PageHeaderProps) {
  return (
    <Box component={motion.div} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} sx={{ mb: 3, p: 2.2, borderRadius: 3.5, background: 'linear-gradient(135deg, #0a3697 0%, #0cdbeb 100%)', border: '1px solid #E2E8F0', boxShadow: 'none' }}>
      <Typography sx={{ fontSize: 24, fontWeight: 'bold', mb: 0.4, color: '#fff' }}>{title}</Typography>
      <Typography sx={{ color: '#fff', fontSize: 12.5, mb: actions ? 1.8 : 0 }}>{breadcrumb}</Typography>
      {actions && (
        <Box sx={{ display: 'flex', gap: 1.2, flexWrap: 'wrap', alignItems: 'center' }}>{actions}</Box>
      )}
    </Box>
  )
}
