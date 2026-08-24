import { useEffect, useMemo, useState } from 'react'
import { Avatar, Box, IconButton, Typography } from '@mui/material'
import { FiBell, FiSettings, FiWifi } from 'react-icons/fi'
import { motion } from 'framer-motion'
import { SIDEBAR_EXPANDED_WIDTH } from './Sidebar'
import craftImage from '../assets/craft-removebg-preview.png'

const statusMap = {
  online: { label: 'متصل', color: '#22C55E' },
  offline: { label: 'غير متصل', color: '#EF4444' },
  syncing: { label: 'جارٍ المزامنة', color: '#F59E0B' },
} as const

type ConnectionStatus = keyof typeof statusMap

function formatTime(date: Date) {
  return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(date: Date) {
  return date.toLocaleDateString('ar-EG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function TopBar({ sidebarOffset }: { sidebarOffset?: number }) {
  const [now, setNow] = useState(new Date())
  const [status, setStatus] = useState<ConnectionStatus>('online')

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000)
    const updateStatus = () => setStatus(navigator.onLine ? 'online' : 'offline')
    updateStatus()
    window.addEventListener('online', updateStatus)
    window.addEventListener('offline', updateStatus)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('online', updateStatus)
      window.removeEventListener('offline', updateStatus)
    }
  }, [])

  const badge = useMemo(() => statusMap[status], [status])

  return (
    <Box
      component={motion.header}
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      sx={{
        position: 'fixed',
        insetInline: 0,
        top: 0,
        zIndex: 1200,
        height: 70,
        px: { xs: 2, sm: 3, md: 4 },
        paddingInlineEnd: `${sidebarOffset ?? SIDEBAR_EXPANDED_WIDTH}px`,
        transition: 'padding-inline-end 250ms ease',
        backdropFilter: 'blur(20px)',
        background: 'rgba(255,255,255,0.82)',
        borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 10px 24px rgba(15, 23, 42, 0.04)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box component="img" src={craftImage} sx={{ width: 44, height: 44, borderRadius: 2.2, background: 'transparent' }} />
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: 17, lineHeight: 1.1 }}>CRAFT</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>نظام إدارة المخازن والتصنيع</Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.4, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.6, py: 1, borderRadius: 3, border: '1px solid rgba(37, 99, 235, 0.12)', background: 'rgba(255,255,255,0.9)' }}>
          <FiWifi size={17} color={badge.color} />
          <Typography sx={{ color: badge.color, fontWeight: 700, fontSize: 13 }}>{badge.label}</Typography>
        </Box>
        <Box sx={{ textAlign: 'right', minWidth: 170, px: 0.5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{formatDate(now)}</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>{formatTime(now)}</Typography>
        </Box>
        <IconButton size="medium" sx={{ borderRadius: 2.2, width: 40, height: 40, background: 'rgba(15, 23, 42, 0.04)', color: '#1F2937', '&:hover': { background: 'rgba(37, 99, 235, 0.09)', color: '#1D4ED8' } }}>
          <FiBell size={17} />
        </IconButton>
        <IconButton size="medium" sx={{ borderRadius: 2.2, width: 40, height: 40, background: 'rgba(15, 23, 42, 0.04)', color: '#1F2937', '&:hover': { background: 'rgba(37, 99, 235, 0.09)', color: '#1D4ED8' } }}>
          <FiSettings size={17} />
        </IconButton>
        <Avatar sx={{ width: 42, height: 42, bgcolor: '#06B6D4', color: '#fff', fontSize: 15, fontWeight: 700, boxShadow: '0 10px 24px rgba(6, 182, 212, 0.2)' }}>A</Avatar>
      </Box>
    </Box>
  )
}
