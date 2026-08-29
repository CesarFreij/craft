import { Alert, Snackbar } from '@mui/material'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { NotificationContext } from './NotificationContextValue'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

interface NotificationItem {
  id: number
  message: string
  type: NotificationType
  autoHideDuration?: number
}

interface NotificationOptions {
  message: string
  type?: NotificationType
  autoHideDuration?: number
}

interface NotificationApi {
  showNotification: (options: NotificationOptions) => void
  success: (message: string, autoHideDuration?: number) => void
  error: (message: string, autoHideDuration?: number) => void
  warning: (message: string, autoHideDuration?: number) => void
  info: (message: string, autoHideDuration?: number) => void
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [activeItem, setActiveItem] = useState<NotificationItem | null>(null)

  const showNotification = useCallback(
    ({ message, type = 'info', autoHideDuration = 3200 }: NotificationOptions) => {
      setActiveItem({
        id: Date.now() + Math.random(),
        message,
        type,
        autoHideDuration,
      })
    },
    [],
  )

  const notify = useMemo<NotificationApi>(
    () => ({
      showNotification,
      success: (message, autoHideDuration) => {
        showNotification({ message, type: 'success', autoHideDuration })
      },
      error: (message, autoHideDuration) => {
        showNotification({ message, type: 'error', autoHideDuration })
      },
      warning: (message, autoHideDuration) => {
        showNotification({ message, type: 'warning', autoHideDuration })
      },
      info: (message, autoHideDuration) => {
        showNotification({ message, type: 'info', autoHideDuration })
      },
    }),
    [showNotification],
  )

  const handleClose = () => {
    setActiveItem(null)
  }

  return (
    <NotificationContext.Provider value={notify}>
      {children}
      <Snackbar
        key={activeItem?.id ?? 'notification-empty'}
        open={Boolean(activeItem)}
        autoHideDuration={activeItem?.autoHideDuration ?? 3200}
        onClose={(_, reason) => {
          if (reason === 'clickaway') return
          handleClose()
        }}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ mt: 7, minWidth: { xs: 'calc(100% - 32px)', sm: 420 } }}
      >
        <Alert
          severity={
            activeItem?.type === 'error'
              ? 'error'
              : activeItem?.type === 'success'
                ? 'success'
                : activeItem?.type === 'warning'
                  ? 'warning'
                  : 'info'
          }
          onClose={handleClose}
          sx={
            activeItem?.type === 'error'
              ? {
                  background: 'rgb(92 18 18 / 50%) !important',
                  color: '#FEE2E2 !important',
                  border: '1px solid rgba(248, 113, 113, 0.58)',
                  borderRadius: '14px',
                  '& .MuiAlert-icon': { color: '#FCA5A5' },
                  '& .MuiAlert-message': { color: '#FFFFFF', fontWeight: 700 },
                }
              : activeItem?.type === 'success'
                ? {
                    background: 'rgba(20,83,45,.34) !important',
                    color: '#DCFCE7 !important',
                    border: '1px solid rgba(74,222,128,.34)',
                    borderRadius: '14px',
                    '& .MuiAlert-icon': { color: '#86EFAC' },
                    '& .MuiAlert-message': { color: '#DCFCE7', fontWeight: 700 },
                  }
                : {
                    borderRadius: '14px',
                    background: 'rgba(8,47,73,.92)',
                    color: '#E0F2FE',
                    border: '1px solid rgba(125,211,252,.28)',
                    '& .MuiAlert-icon': { color: '#7DD3FC' },
                    '& .MuiAlert-message': { color: '#E0F2FE', fontWeight: 700 },
                  }
          }
        >
          {activeItem?.message ?? ''}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  )
}
