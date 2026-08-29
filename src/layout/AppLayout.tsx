import { Box } from '@mui/material'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Sidebar, SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_EXPANDED_WIDTH } from './Sidebar'
import { TopBar } from './TopBar'
import craftImage from '../assets/craft.png'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const isHomePage = location.pathname === '/'
  const sidebarOffset = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        overflow: 'hidden',
        bgcolor: '#07142F',
      }}
    >
      {/* الواجهة الأساسية */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          minHeight: '100vh',
        }}
      >
        <TopBar sidebarOffset={sidebarOffset} collapsed={collapsed} />

        <Box
          component="main"
          sx={{
            height: '100vh',
            minHeight: 0,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'space-between',
          }}
        >
          <Sidebar
            collapsed={collapsed}
            onToggle={() => setCollapsed((prev) => !prev)}
          />

          <Box
            component={motion.section}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            sx={{
              position: 'relative',
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
            {!isHomePage ? (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 0,
                  overflow: 'hidden',
                  pointerEvents: 'none',
                  bgcolor: '#0B1636',
                }}
              >
                <Box
                  component="img"
                  src={craftImage}
                  alt=""
                  sx={{
                    position: 'absolute',
                    width: '1920px',
                    height: '1080px',
                    maxWidth: 'none',
                    maxHeight: 'none',
                    top: 'calc(50% + 45px)',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    objectFit: 'cover',
                    userSelect: 'none',
                    pointerEvents: 'none',
                  }}
                />

                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    background: `
                      linear-gradient(
                        90deg,
                        rgba(3, 14, 45, 0.98) 0%,
                        rgba(5, 24, 65, 0.88) 34%,
                        rgba(5, 27, 72, 0.48) 68%,
                        rgba(2, 12, 34, 0.18) 100%
                      )
                    `,
                  }}
                />

                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(180deg, rgba(15,23,42,0.04) 0%, rgba(15,23,42,0.06) 55%, rgba(2,6,23,0.34) 100%)',
                  }}
                />

                <Box
                  sx={{
                    position: 'absolute',
                    insetInlineEnd: '-11%',
                    top: '-31%',
                    width: '52vw',
                    height: '52vw',
                    maxWidth: 760,
                    maxHeight: 760,
                    borderRadius: '50%',
                    border: '1px solid rgba(96, 165, 250, 0.18)',
                    boxShadow:
                      '0 0 0 50px rgba(37,99,235,0.035), 0 0 0 110px rgba(6,182,212,0.025)',
                  }}
                />
              </Box>
            ) : null}

            <Box
              sx={{
                position: 'relative',
                zIndex: 1,
                flex: 1,
                minHeight: 0,
                overflowY: isHomePage ? 'hidden' : 'auto',
                overflowX: 'hidden',
                padding: isHomePage ? 0 : '24px',
                background: 'transparent',
                marginTop: isHomePage ? 0 : '70px',
                paddingTop: isHomePage ? 0 : '24px',
                '&::-webkit-scrollbar-track': {
                  marginTop: '70px !important',
                },
              }}
            >
              {children}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
