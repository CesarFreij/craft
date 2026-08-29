import { createContext } from 'react'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

interface NotificationOptions {
  message: string
  type?: NotificationType
  autoHideDuration?: number
}

export interface NotificationApi {
  showNotification: (options: NotificationOptions) => void
  success: (message: string, autoHideDuration?: number) => void
  error: (message: string, autoHideDuration?: number) => void
  warning: (message: string, autoHideDuration?: number) => void
  info: (message: string, autoHideDuration?: number) => void
}

export const NotificationContext = createContext<NotificationApi | undefined>(undefined)