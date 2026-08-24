import { Box, Typography } from '@mui/material'
import { motion } from 'framer-motion'

interface PageHeaderProps {
  title: string
  breadcrumb: string
  actions?: React.ReactNode
}

export function PageHeader({ title, breadcrumb, actions }: PageHeaderProps) {
  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      sx={{
        mb: 2.2,
        px: 2.2,
        py: 1.45,
        borderRadius: 3,
        background: 'linear-gradient(-135deg, #0a3697 0%, #0cdbeb 100%)',
        boxShadow: '0 10px 28px rgba(2, 6, 23, 0.14)',
      }}
    >
      <Typography
        sx={{
          fontSize: 22,
          fontWeight: 700,
          lineHeight: 1.25,
          mb: 0.25,
          color: '#fff',
        }}
      >
        {title}
      </Typography>

      <Typography
        sx={{
          color: 'rgba(255, 255, 255, 0.82)',
          fontSize: 12,
          lineHeight: 1.5,
          mb: actions ? 1.2 : 0,
        }}
      >
        {breadcrumb}
      </Typography>

      {actions && (
        <Box
          sx={{
            display: 'flex',
            gap: 1.2,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          {actions}
        </Box>
      )}
    </Box>
  )
}