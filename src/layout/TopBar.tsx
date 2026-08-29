import { useEffect, useState } from 'react'
import {  Box, Typography } from '@mui/material'
import { motion } from 'framer-motion'
import { SIDEBAR_EXPANDED_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from './Sidebar'
import craftImage from '../assets/craft-no-background.png'

const levantineMonths = [
  'كانون الثاني',
  'شباط',
  'آذار',
  'نيسان',
  'أيار',
  'حزيران',
  'تموز',
  'آب',
  'أيلول',
  'تشرين الأول',
  'تشرين الثاني',
  'كانون الأول',
]

const levantineWeekdays = [
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
]

const arabicNumber = new Intl.NumberFormat('ar-SY', {
  useGrouping: false,
})

function formatTime(date: Date) {
  return date.toLocaleTimeString('ar-SY', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDate(date: Date) {
  const weekday = levantineWeekdays[date.getDay()]
  const day = arabicNumber.format(date.getDate())
  const month = levantineMonths[date.getMonth()]
  const year = arabicNumber.format(date.getFullYear())

  return `${weekday}، ${day} ${month} ${year}`
}

export function TopBar({ sidebarOffset, collapsed }: { sidebarOffset?: number, collapsed: boolean }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000)

    return () => window.clearInterval(interval)
  }, [])

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

        // بما أن الـSidebar موجود على اليمين في RTL،
        // نحجز مساحته من اليمين بدل دفع الشعار الموجود على اليسار.
        paddingInlineStart: {
          xs: 2,
          md: `${sidebarOffset ?? SIDEBAR_EXPANDED_WIDTH}px`,
        },
        paddingInlineEnd: { xs: 2, sm: 3, md: 4 },

        transition: 'padding-inline-start 250ms ease',
        background: ' rgba(2,6,23,.22)',
        backdropFilter: 'blur(22px) saturate(120%)',
        WebkitBackdropFilter: 'blur(22px) saturate(120%)',
        borderBottom: '1px solid rgba(103,232,249,.14)',
        boxShadow: '0 8px 30px rgba(2,6,23,.22)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        color: '#F8FAFC',
        overflow: 'hidden',

        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: 0,
          right: '50%',
          transform: collapsed ? `translateX(calc(-50% - ${SIDEBAR_COLLAPSED_WIDTH/2}px))` : `translateX(calc(-50% - ${SIDEBAR_EXPANDED_WIDTH/2}px))`,
          width: '18%',
          height: '1px',
          background:
            'linear-gradient(90deg, transparent, rgba(34,211,238,.82), transparent)',
          boxShadow: '0 0 16px rgba(34,211,238,.65)',
          pointerEvents: 'none',
        },
      }}
    >
      {/* اليمين: التاريخ والوقت + حالة الاتصال + الأدوات */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 0.8, sm: 1.2 },
          minWidth: 0,
          direction: 'rtl',
          paddingLeft: '28px'
        }}
      >
        <Box
          sx={{
            textAlign: 'right',
            minWidth: { xs: 130, sm: 190 },
            px: 0.5,
          }}
        >
          <Typography
            sx={{
              fontWeight: 800,
              color: 'rgba(248,250,252,.96)',
              whiteSpace: 'nowrap',
              textAlign: 'start',
              fontSize: '22px'
            }}
          >
            {formatDate(now)}
          </Typography>

          <Typography
            sx={{
              mt: 0.2,
              color: 'rgba(203,213,225,.72)',
              fontSize: 16,
              fontWeight: 650,
              textAlign: 'start'
            }}
          >
            {formatTime(now)}
          </Typography>
        </Box>

      </Box>

      {/* اليسار: شعار CRAFT واسم البرنامج */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.2,
          direction: 'ltr',
          flexShrink: 0,
        }}
      >

        <Box sx={{ direction: 'ltr' }}>
          <Typography
            sx={{
              fontWeight: 950,
              fontSize: 22,
              lineHeight: 1,
              letterSpacing: 15,
              color: '#FFFFFF',
              textAlign: 'right'
            }}
          >
            CRAFT
          </Typography>

          <Typography
            sx={{
              display: { xs: 'none', sm: 'block' },
              mt: 0.45,
              color: 'rgba(203,213,225,.66)',
              fontSize: 11.5,
              direction: 'rtl',
            }}
          >
            نظام إدارة المخازن والتصنيع
          </Typography>
        </Box>
        <Box
          component="img"
          src={craftImage}
          alt="CRAFT"
          sx={{
            width: 55,
            height: 55,
            objectFit: 'contain',
            // borderRadius: '50%',
            background: 'transparent',
            filter: 'drop-shadow(0 5px 12px rgba(34,211,238,.12))',
          }}
        />
      </Box>
    </Box>
  )
}
