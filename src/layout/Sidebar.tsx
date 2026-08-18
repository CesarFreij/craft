import { Box, Collapse, Divider, IconButton, Typography } from '@mui/material'
import { motion } from 'framer-motion'
import { FiHome, FiDatabase, FiBox, FiShoppingBag, FiPackage, FiFileText, FiBarChart2, FiSettings, FiChevronLeft } from 'react-icons/fi'
import { Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'

export const SIDEBAR_EXPANDED_WIDTH = 282
export const SIDEBAR_COLLAPSED_WIDTH = 96

const inventoryMenuItems = [
  { label: 'إضافة مخازن', path: '/inventory/warehouses' },
  { label: 'أرصدة المخازن', path: '/inventory/balances' },
  { label: 'تسوية المخازن', path: '/inventory/adjustments' },
  { label: 'حركات المخازن', path: '/inventory/movements' },
]

const purchasesMenuItems = [
  { label: 'إضافة مورد', path: '/suppliers' },
  { label: 'فاتورة شراء جديدة', path: '/purchases' },
  { label: 'مرتجع شراء', path: '/purchase-returns' },
]

const salesMenuItems = [
  { label: 'إضافة عميل', path: '/customers' },
  { label: 'فاتورة بيع جديدة', path: '/sales' },
  { label: 'مرتجع بيع', path: '/sales-returns' },
]

const manufacturingMenuItems = [
  { label: 'نماذج التصنيع', path: '/manufacturing-recipes' },
  { label: 'أوامر الإنتاج', path: '/manufacturing-orders' },
]

const navItems = [
  { key: 'home', label: 'الرئيسية', path: '/', icon: FiHome },
  { key: 'materials', label: 'دليل المواد', path: '/materials', icon: FiDatabase },
  { key: 'inventory', label: 'إضافة مخازن', path: '/inventory/warehouses', icon: FiBox, submenu: inventoryMenuItems },
  { key: 'purchases', label: 'المشتريات والموردين', path: '/purchases', icon: FiShoppingBag, submenu: purchasesMenuItems },
  { key: 'sales', label: 'المبيعات والعملاء', path: '/sales', icon: FiFileText, submenu: salesMenuItems },
  { key: 'manufacturing', label: 'الإنتاج والتصنيع', path: '/manufacturing', icon: FiPackage, submenu: manufacturingMenuItems },
  { key: 'reports', label: 'التقارير', path: '/reports', icon: FiBarChart2 },
  { key: 'settings', label: 'الإعدادات', path: '/settings', icon: FiSettings },
]

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const location = useLocation()
  const [expandedSection, setExpandedSection] = useState<string | null>('inventory')
  const [activeParentSection, setActiveParentSection] = useState<string | null>('inventory')

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      if (location.pathname.startsWith('/inventory')) {
        setExpandedSection('inventory')
        setActiveParentSection('inventory')
        return
      }

      if (location.pathname === '/suppliers' || location.pathname.startsWith('/purchases') || location.pathname === '/purchase-returns') {
        setExpandedSection('purchases')
        setActiveParentSection('purchases')
        return
      }

      if (location.pathname === '/customers' || location.pathname.startsWith('/sales') || location.pathname === '/sales-returns') {
        setExpandedSection('sales')
        setActiveParentSection('sales')
        return
      }

      if (location.pathname === '/manufacturing' || location.pathname === '/manufacturing-recipes' || location.pathname === '/manufacturing-orders') {
        setExpandedSection('manufacturing')
        setActiveParentSection('manufacturing')
        return
      }

      setExpandedSection(null)
      setActiveParentSection(null)
    }, 0)

    return () => window.clearTimeout(timerId)
  }, [location.pathname])

  const renderNavButton = (item: (typeof navItems)[number]) => {
  const active = item.submenu
    ? activeParentSection === item.key
    : activeParentSection === null && location.pathname === item.path

    const Icon = item.icon
    const isExpanded = item.submenu ? expandedSection === item.key : false

    return (
      <Box key={item.path} sx={{ position: 'relative' }}>
        <Box
          component={item.submenu ? 'button' : Link}
          to={item.submenu ? undefined : item.path}
          onClick={item.submenu ? (event: React.MouseEvent<HTMLElement>) => {
            event.preventDefault()

            setActiveParentSection(item.key)

            if (collapsed) {
              onToggle()
              setExpandedSection(item.key)
              return
            }

            setExpandedSection((current) =>
              current === item.key ? null : item.key
            )
          } : () => {
            setActiveParentSection(null)
          }}
          sx={{
            width: !collapsed ? '100%' : 'fit-content',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: collapsed ? 0 : 1.2,
            borderRadius: 2.8,
            background: active ? 'rgba(255,255,255,0.2)' : 'transparent',
            border: 'none',
            boxShadow: active ? '0 12px 30px rgba(37, 99, 235, 0.18)' : 'none',
            transition: 'all 0.25s ease',
            textDecoration: 'none',
            margin: collapsed ? 'auto' : 0,
            padding: 0,
            color: '#fff',
            cursor: 'pointer',
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
          {!collapsed && (
            <>
              <Typography sx={{ fontWeight: 600, fontSize: 14, lineHeight: 1.2, color: '#fff', flex: 1, textAlign: 'start' }}>{item.label}</Typography>
              {item.submenu && (
                <motion.span animate={{ rotate: isExpanded ? -90 : 0 }} transition={{ duration: 0.2 }} style={{ display: 'flex', color: '#fff', marginLeft: '8px' }}>
                  <FiChevronLeft size={16} />
                </motion.span>
              )}
            </>
          )}
        </Box>

        {item.submenu && !collapsed && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.7, mt: 0.8, pe: 1, ps: 1.4 }}>
              {item.submenu.map((subItem) => {
                const subActive = location.pathname === subItem.path || (subItem.path.includes('?') && location.search.includes(subItem.path.split('?')[1] || ''))

                return (
                  <Box
                    key={subItem.path}
                    component={Link}
                    to={subItem.path}
                    onClick={() => {
                      setExpandedSection(item.key)
                      setActiveParentSection(item.key)
                    }}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      borderRadius: 2,
                      px: 1.2,
                      py: 1,
                      color: '#fff',
                      textDecoration: 'none',
                      background: subActive ? 'rgba(255,255,255,0.14)' : 'rgba(15, 23, 42, 0.06)',
                      fontWeight: 600,
                      fontSize: 13,
                      lineHeight: 1.3,
                      mr: 1,
                      ml: 5,
                      '&:hover': {
                        background: 'rgba(255,255,255,0.14)',
                      },
                    }}
                  >
                    {subItem.label}
                  </Box>
                )
              })}
            </Box>
          </Collapse>
        )}
      </Box>
    )
  }

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
          {navItems.map((item) => renderNavButton(item))}
        </Box>

        <Box sx={{ flex: 1 }} />

      </Box>
    </Box>
  )
}
