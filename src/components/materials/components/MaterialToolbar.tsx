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
        gap: 2,
        p: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Button
        variant="contained"
        color="primary"
        startIcon={<FiPlus />}
        onClick={onAddMain}
        sx={{
          borderRadius: 1.5,
          textTransform: 'none',
          fontWeight: 600,
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
          borderRadius: 1.5,
          textTransform: 'none',
          fontWeight: 600,
        }}
      >
        إضافة مادة فرعية
      </Button>
    </Box>
  )
}
