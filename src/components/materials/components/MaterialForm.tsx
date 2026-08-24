import React from 'react'
import { Box, TextField, FormControlLabel, Switch } from '@mui/material'
import type { MaterialNode } from '../types/Material'

interface MaterialFormProps {
  node: MaterialNode
  onUpdate: (nodeId: string, updates: Partial<MaterialNode>) => void
  onDelete: (nodeId: string) => void
  onEdit: () => void
}

const craftReadOnlyFieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '14px',
    background: 'rgba(255, 255, 255, 0.055)',
    color: 'rgba(255, 255, 255, 0.88)',
  },

  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },

  '& .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },

  '& .MuiInputBase-input.Mui-disabled': {
    WebkitTextFillColor: 'rgba(255, 255, 255, 0.78)',
    color: 'rgba(255, 255, 255, 0.78)',
  },

  '& .MuiInputLabel-root': {
    color: 'rgba(255, 255, 255, 0.72)',
  },

  '& .MuiInputLabel-root.Mui-disabled': {
    color: 'rgba(255, 255, 255, 0.62)',
  },
}

export const MaterialForm: React.FC<MaterialFormProps> = ({
  node,
}) => {
  return (
    <Box
      sx={{
        p: 3,
        overflow: 'auto',
        flex: 1,
        minHeight: 0,
        color: 'rgba(255, 255, 255, 0.92)',
        background: 'transparent',
      }}
    >
      <Box sx={{ display: 'grid', gap: 2 }}>
        {node.type === 'main' && (
          <>
            <TextField
              label="عائدية المادة"
              value={node.returnability || ''}
              fullWidth
              disabled
              variant="outlined"
              sx={craftReadOnlyFieldSx}
            />
            <TextField
              label="رقم المادة"
              value={node.materialNumber}
              fullWidth
              disabled
              variant="outlined"
              sx={craftReadOnlyFieldSx}
            />
            <TextField
              label="اسم المادة"
              value={node.name}
              fullWidth
              disabled
              variant="outlined"
              sx={craftReadOnlyFieldSx}
            />
            <TextField
              label="ملاحظات"
              value={node.notes || ''}
              fullWidth
              multiline
              minRows={4}
              disabled
              variant="outlined"
              sx={craftReadOnlyFieldSx}
            />
          </>
        )}

        {node.type === 'sub' && (
          <>
            <TextField
              label="عائدية المادة"
              value={node.returnability || ''}
              fullWidth
              disabled
              variant="outlined"
              sx={craftReadOnlyFieldSx}
            />
            <TextField
              label="رقم المادة"
              value={node.materialNumber}
              fullWidth
              disabled
              variant="outlined"
              sx={craftReadOnlyFieldSx}
            />
            <TextField
              label="اسم المادة"
              value={node.name}
              fullWidth
              disabled
              variant="outlined"
              sx={craftReadOnlyFieldSx}
            />
            <TextField
              label="الوحدة"
              value={node.unit || ''}
              fullWidth
              disabled
              variant="outlined"
              sx={craftReadOnlyFieldSx}
            />
            <TextField
              label="سعر التكلفة"
              value={node.costPrice || ''}
              fullWidth
              disabled
              variant="outlined"
              sx={craftReadOnlyFieldSx}
            />
            <TextField
              label="سعر البيع الأول"
              value={node.price1 || ''}
              fullWidth
              disabled
              variant="outlined"
              sx={craftReadOnlyFieldSx}
            />
            <TextField
              label="سعر البيع الثاني"
              value={node.price2 || ''}
              fullWidth
              disabled
              variant="outlined"
              sx={craftReadOnlyFieldSx}
            />
            <TextField
              label="سعر البيع الثالث"
              value={node.price3 || ''}
              fullWidth
              disabled
              variant="outlined"
              sx={craftReadOnlyFieldSx}
            />

            <FormControlLabel
              sx={{
                m: 0,
                color: 'rgba(255, 255, 255, 0.78)',
                '& .MuiFormControlLabel-label.Mui-disabled': {
                  color: 'rgba(255, 255, 255, 0.68)',
                },
                '& .MuiSwitch-switchBase.Mui-disabled': {
                  color: node.isNonStock ? '#67E8F9' : 'rgba(203, 213, 225, 0.52)',
                },
                '& .MuiSwitch-switchBase.Mui-disabled + .MuiSwitch-track': {
                  opacity: 1,
                  backgroundColor: node.isNonStock
                    ? 'rgba(34, 211, 238, 0.28)'
                    : 'rgba(148, 163, 184, 0.20)',
                },
              }}
              control={
                <Switch checked={node.isNonStock || false} disabled color="primary" />
              }
              label="مادة لا مخزنية"
            />

            <TextField
              label="ملاحظات"
              value={node.notes || ''}
              fullWidth
              multiline
              minRows={4}
              disabled
              variant="outlined"
              sx={craftReadOnlyFieldSx}
            />
          </>
        )}
      </Box>
    </Box>
  )
}
