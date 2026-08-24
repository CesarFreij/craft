import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
} from '@mui/material'
import type { DialogState } from '../types/Material'

interface MaterialDialogsProps {
  dialog: DialogState
  onClose: () => void
  onSubmit: (values: Record<string, unknown>) => void
}

const craftDialogSlotProps = {
  backdrop: {
    sx: {
      backgroundColor: 'rgba(2, 6, 23, 0.62)',
      backdropFilter: 'blur(5px)',
      WebkitBackdropFilter: 'blur(5px)',
    },
  },
  paper: {
    sx: {
      borderRadius: '18px',
      background: 'rgba(8, 22, 48, 0.97) !important',
      backgroundColor: 'rgba(8, 22, 48, 0.97) !important',
      backgroundImage: 'none !important',
      backdropFilter: 'blur(28px) saturate(125%)',
      WebkitBackdropFilter: 'blur(28px) saturate(125%)',
      border: '1px solid rgba(148, 197, 255, 0.16)',
      boxShadow: '0 28px 72px rgba(2, 6, 23, 0.46)',
      color: 'rgba(255, 255, 255, 0.92)',
      overflow: 'hidden',

      '& .MuiDialogTitle-root': {
        color: 'rgba(255, 255, 255, 0.96)',
        fontWeight: 800,
        px: 3,
        pt: 2.5,
        pb: 1.2,
      },

      '& .MuiDialogContent-root': {
        color: 'rgba(255, 255, 255, 0.88)',
        borderColor: 'rgba(255, 255, 255, 0.12)',
      },

      '& .MuiButton-text': {
        color: '#CBD5E1',
      },
    },
  },
}

export const MaterialDialogs: React.FC<MaterialDialogsProps> = ({
  dialog,
  onClose,
  onSubmit,
}) => {
  return (
    <Dialog
      open={dialog.open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={craftDialogSlotProps}
    >
      <DialogTitle>{dialog.title}</DialogTitle>

      {dialog.subtitle && (
        <Box
          sx={{
            px: 3,
            pb: 1,
            color: 'rgba(255, 255, 255, 0.72)',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {dialog.subtitle}
        </Box>
      )}

      <DialogContent dividers sx={{ minHeight: 200 }}>
        {/* Dialog content will go here */}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button
          onClick={() => onSubmit({})}
          variant="contained"
          color="primary"
          sx={{ borderRadius: '12px', px: 2.5 }}
        >
          حفظ
        </Button>
      </DialogActions>
    </Dialog>
  )
}
