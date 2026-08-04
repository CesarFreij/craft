import { Button } from '@mui/material'
import type { ButtonProps } from '@mui/material'
import { motion } from 'framer-motion'

export function AnimatedButton(props: ButtonProps) {
  return (
    <Button
      component={motion.button}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 18 }}
      {...props}
    />
  )
}
