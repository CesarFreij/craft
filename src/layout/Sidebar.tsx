import { Box, Divider, IconButton, Typography } from '@mui/material'
import { motion } from 'framer-motion'
import { FiHome, FiDatabase, FiBox, FiShoppingBag, FiPackage, FiFileText, FiBarChart2, FiSettings, FiChevronLeft } from 'react-icons/fi'
import { Link, useLocation } from 'react-router-dom'

export const SIDEBAR_EXPANDED_WIDTH = 282
export const SIDEBAR_COLLAPSED_WIDTH = 96

const navItems = [
  { label: 'الرئيسية', path: '/', icon: FiHome },
  { label: 'دليل المواد', path: '/materials', icon: FiDatabase },
  { label: 'المخازن والجرد', path: '/inventory', icon: FiBox },
  { label: 'المشتريات والموردين', path: '/purchases', icon: FiShoppingBag },
  { label: 'التصنيع والإنتاج', path: '/manufacturing', icon: FiPackage },
  { label: 'المبيعات والعملاء', path: '/sales', icon: FiFileText },
  { label: 'التقارير', path: '/reports', icon: FiBarChart2 },
  { label: 'الإعدادات', path: '/settings', icon: FiSettings },
]

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const location = useLocation()

  return (
    <Box
      component={motion.aside}
      initial={false}
      animate={{ width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH }}
      transition={{ type: 'spring', stiffness: 180, damping: 20 }}
      sx={{
        position: 'fixed',
        zIndex: '2',
        top: 70,
        insetInlineStart: 0,
        insetInlineEnd: 'auto',
        bottom: 0,
        height: 'calc(100vh - 70px)',
        borderInlineStart: '1px solid rgba(15, 23, 42, 0.08)',
        background: 'linear-gradient(135deg, #0a3697 0%, #0a6fcb 50%, #0cdbeb 100%)',
        boxShadow: '0 24px 60px rgba(15, 23, 42, 0.1)',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', px: 2, py: 3, gap: 2.4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between' }}>
          {!collapsed && <Typography sx={{ fontWeight: 700, fontSize: 20, color: '#fff' }}>القائمة الرئيسية</Typography>}
          <IconButton
            aria-label={collapsed ? 'فتح القائمة' : 'إغلاق القائمة'}
            onClick={onToggle}
            size="small"
            sx={{
              borderRadius: 2.2,
              width: 36,
              height: 36,
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'rgba(255, 255, 255, 0.2)',
              color: '#fff',
              border: '1px solid rgba(37, 99, 235, 0.12)',
              '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.25)', transform: 'translateY(-1px)' },
            }}
          >
            <motion.span animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
              <FiChevronLeft size={18} style={{display: 'flex'}} />
            </motion.span>
          </IconButton>
        </Box>
        <Divider sx={{border: '1px solid rgba(255, 255, 255, 0.25)'}} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
          {navItems.map((item) => {
            const active = location.pathname === item.path
            const Icon = item.icon
            return (
              <Box
                key={item.path}
                component={Link}
                to={item.path}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  gap: collapsed ? 0 : 1.2,
                  borderRadius: 2.8,
                  background: active ? 'rgba(255,255,255,0.2)' : 'transparent',
                  boxShadow: active ? '0 12px 30px rgba(37, 99, 235, 0.18)' : 'none',
                  transition: 'all 0.25s ease',
                  textDecoration: 'none',
                  margin: collapsed ? 'auto' : 0,
                  '&:hover': {
                    background: 'rgba(255,255,255,0.12)',
                    color: '#fff',
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: 2.2,
                    background: active ? 'rgba(255,255,255,0.16)' : 'rgba(15, 23, 42, 0.04)',
                    color:'#fff',
                    flexShrink: 0,
                    mx: collapsed ? 'auto' : 0,
                  }}
                >
                  <Icon size={18} />
                </Box>
                {!collapsed && <Typography sx={{ fontWeight: 600, fontSize: 14, lineHeight: 1.2, color: '#fff' }}>{item.label}</Typography>}
              </Box>
            )
          })}
        </Box>

        <Box sx={{ flex: 1 }} />

      </Box>
    </Box>
  )
}
