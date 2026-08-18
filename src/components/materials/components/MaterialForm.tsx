import React from 'react'
import { Box, TextField, FormControlLabel, Switch } from '@mui/material'
import type { MaterialNode, MaterialType, FormValues } from '../types/Material'

interface MaterialFormProps {
  node: MaterialNode
  onUpdate: (nodeId: string, updates: Partial<MaterialNode>) => void
  onDelete: (nodeId: string) => void
  onEdit: () => void
}

export const MaterialForm: React.FC<MaterialFormProps> = ({
  node,
  onUpdate,
  onDelete,
  onEdit,
}) => {
  return (
    <Box sx={{ p: 3, overflow: 'auto', flex: 1 }}>
      <Box sx={{ display: 'grid', gap: 2 }}>
        {node.type === 'main' && (
          <>
            <TextField
              label="عائدية المادة"
              value={node.returnability || ''}
              fullWidth
              disabled
              variant="outlined"
            />
            <TextField
              label="رقم المادة"
              value={node.materialNumber}
              fullWidth
              disabled
              variant="outlined"
            />
            <TextField
              label="اسم المادة"
              value={node.name}
              fullWidth
              disabled
              variant="outlined"
            />
            <TextField
              label="ملاحظات"
              value={node.notes || ''}
              fullWidth
              multiline
              minRows={4}
              disabled
              variant="outlined"
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
            />
            <TextField
              label="رقم المادة"
              value={node.materialNumber}
              fullWidth
              disabled
              variant="outlined"
            />
            <TextField
              label="اسم المادة"
              value={node.name}
              fullWidth
              disabled
              variant="outlined"
            />
            <TextField
              label="الوحدة"
              value={node.unit || ''}
              fullWidth
              disabled
              variant="outlined"
            />
            <TextField
              label="سعر التكلفة"
              value={node.costPrice || ''}
              fullWidth
              disabled
              variant="outlined"
            />
            <TextField
              label="سعر البيع الأول"
              value={node.price1 || ''}
              fullWidth
              disabled
              variant="outlined"
            />
            <TextField
              label="سعر البيع الثاني"
              value={node.price2 || ''}
              fullWidth
              disabled
              variant="outlined"
            />
            <TextField
              label="سعر البيع الثالث"
              value={node.price3 || ''}
              fullWidth
              disabled
              variant="outlined"
            />
            <FormControlLabel
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
            />
          </>
        )}
      </Box>
    </Box>
  )
}
