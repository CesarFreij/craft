import React, { useState } from 'react'
import { Box } from '@mui/material'

interface ResizableDividerProps {
  treeWidth: number
  onTreeWidthChange: (width: number) => void
}

export const ResizableDivider: React.FC<ResizableDividerProps> = ({
  onTreeWidthChange,
}) => {
  const [isDragging, setIsDragging] = useState(false)

  React.useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const container = document.querySelector('[data-resizable-container]')
      if (!container) return

      const rect = container.getBoundingClientRect()
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100
      const constrainedWidth = Math.max(30, Math.min(70, newWidth))

      onTreeWidthChange(constrainedWidth)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, onTreeWidthChange])

  return (
    <Box
      onMouseDown={() => setIsDragging(true)}
      sx={{
        width: 4,
        flexShrink: 0,
        cursor: 'col-resize',
        borderRadius: '999px',
        bgcolor: isDragging
          ? '#67E8F9'
          : 'rgba(255, 255, 255, 0.16)',
        boxShadow: isDragging
          ? '0 0 0 3px rgba(34, 211, 238, 0.10)'
          : 'none',
        transition: isDragging
          ? 'none'
          : 'background-color 160ms ease, box-shadow 160ms ease',
        '&:hover': {
          bgcolor: '#67E8F9',
          boxShadow: '0 0 0 3px rgba(34, 211, 238, 0.08)',
        },
      }}
    />
  )
}
