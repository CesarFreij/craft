import { Box } from '@mui/material'
import { MaterialCatalog } from '../components/materials/MaterialCatalog'

export function MaterialsPage() {
  return (
    <Box sx={{ height: '100%', minHeight: 0 }}>
      <MaterialCatalog />
    </Box>
  )
}
