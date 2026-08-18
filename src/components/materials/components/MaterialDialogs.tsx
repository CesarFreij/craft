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
  onSubmit: (values: any) => void
}

export const MaterialDialogs: React.FC<MaterialDialogsProps> = ({
  dialog,
  onClose,
  onSubmit,
}) => {
  return (
    <Dialog open={dialog.open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{dialog.title}</DialogTitle>
      {dialog.subtitle && (
        <Box sx={{ px: 3, color: 'text.secondary', fontSize: 14 }}>
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
        >
          حفظ
        </Button>
      </DialogActions>
    </Dialog>
  )
}
