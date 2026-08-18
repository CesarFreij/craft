import React, { useState } from 'react'
import { Box } from '@mui/material'

interface ResizableDividerProps {
  treeWidth: number
  onTreeWidthChange: (width: number) => void
}

export const ResizableDivider: React.FC<ResizableDividerProps> = ({
  treeWidth,
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
        cursor: 'col-resize',
        bgcolor: isDragging ? 'primary.main' : 'divider',
        transition: isDragging ? 'none' : 'bgcolor 0.2s ease',
        '&:hover': {
          bgcolor: 'primary.main',
        },
      }}
    />
  )
}
