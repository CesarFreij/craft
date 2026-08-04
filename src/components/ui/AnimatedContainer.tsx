import { Box } from '@mui/material'
import { motion } from 'framer-motion'

export function AnimatedContainer({ children }: { children: React.ReactNode }) {
  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      sx={{ width: '100%' }}
    >
      {children}
    </Box>
  )
}
