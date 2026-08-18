import { Box } from '@mui/material'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { Sidebar, SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_EXPANDED_WIDTH } from './Sidebar'
import { TopBar } from './TopBar'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const sidebarOffset = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH

  return (
    <Box sx={{ minHeight: '100vh', background: '#F7F8FA' }}>
      <TopBar sidebarOffset={sidebarOffset} />
      <Box
        component="main"
        sx={{
          pt: '70px',
          height: '100vh',
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'stretch',
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
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minHeight: 0,
            height: '100%',
            marginInlineStart: `${sidebarOffset}px`,
            transition: 'margin-inline-start 250ms ease',
            boxSizing: 'border-box',
            minWidth: 0,
            width: `calc(100% - ${sidebarOffset}px)`,
          }}
        >
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: '24px',
            }}
          >
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
