import React from 'react'
import { Box, Button } from '@mui/material'
import { FiPlus } from 'react-icons/fi'

interface MaterialToolbarProps {
  onAddMain: () => void
  onAddSub: () => void
  canAddSub: boolean
}

export const MaterialToolbar: React.FC<MaterialToolbarProps> = ({
  onAddMain,
  onAddSub,
  canAddSub,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        p: 2,
        borderBottom: '1px solid rgba(255, 255, 255, 0.14)',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      <Button
        variant="contained"
        color="primary"
        startIcon={<FiPlus />}
        onClick={onAddMain}
        sx={{
          borderRadius: '12px',
          textTransform: 'none',
          fontWeight: 700,
          px: 2.25,
        }}
      >
        إضافة مادة رئيسية
      </Button>

      <Button
        variant="outlined"
        color="primary"
        startIcon={<FiPlus />}
        onClick={onAddSub}
        disabled={!canAddSub}
        sx={{
          borderRadius: '12px',
          textTransform: 'none',
          fontWeight: 700,
          px: 2.25,
          color: '#93C5FD',
          borderColor: 'rgba(96, 165, 250, 0.46)',
          '&:hover': {
            borderColor: '#60A5FA',
            background: 'rgba(96, 165, 250, 0.10)',
          },
          '&.Mui-disabled': {
            background: 'rgba(148, 163, 184, 0.08)',
            color: 'rgba(203, 213, 225, 0.38)',
            borderColor: 'rgba(148, 163, 184, 0.16)',
          },
        }}
      >
        إضافة مادة فرعية
      </Button>
    </Box>
  )
}
