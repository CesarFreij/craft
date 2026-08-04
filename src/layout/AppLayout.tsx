import { Box } from '@mui/material'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { Sidebar, SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_EXPANDED_WIDTH } from './Sidebar'
import { TopBar } from './TopBar'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const sidebarOffset = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH

  return (
    <Box sx={{ minHeight: '100vh', background: '#fff' }}>
      <TopBar sidebarOffset={sidebarOffset} />
      <Box
        component="main"
        sx={{
          pt: '70px',
          minHeight: 'calc(100vh - 70px)',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((prev) => !prev)} />
        <Box
          component={motion.section}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          sx={{
            flex: 1,
            p: { xs: 2, sm: 3, md: 4 },
            overflowY: 'auto',
            minHeight: 'calc(100vh - 86px)',
            marginInlineStart: `${sidebarOffset}px`,
            transition: 'margin-inline-start 250ms ease',
            boxSizing: 'border-box',
            minWidth: 0,
            overflowX: 'hidden',
            width: `calc(100% - ${sidebarOffset}px)`,
            paddingRight: '0px !important',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  )
}
