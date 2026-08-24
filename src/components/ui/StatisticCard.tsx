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

        background: 'rgba(248, 250, 252, 0.10)',
        backdropFilter: 'blur(18px) saturate(120%)',
        WebkitBackdropFilter: 'blur(18px) saturate(120%)',

        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 18px 45px rgba(2, 6, 23, 0.16)',

        minWidth: 220,
      }}
    >
      <Typography
        sx={{
          color: 'rgba(255, 255, 255, 0.68)',
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {title}
      </Typography>

      <Typography
        sx={{
          color: 'rgba(255, 255, 255, 0.96)',
          fontSize: 28,
          fontWeight: 800,
          mt: 1,
        }}
      >
        {value}
      </Typography>

      <Typography
        sx={{
          color: 'rgba(255, 255, 255, 0.62)',
          fontSize: 13,
          mt: 1,
        }}
      >
        {subtitle}
      </Typography>
    </Box>
  )
}