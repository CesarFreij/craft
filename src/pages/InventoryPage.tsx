import { Box } from '@mui/material'
import { SectionCard } from '../components/ui/SectionCard'

export function InventoryPage() {
  return (
    <Box>

      <SectionCard title="حالة الجرد" subtitle="مؤشرات المخازن الرئيسية">
        <Box sx={{ minHeight: 320, display: 'grid', placeItems: 'center', color: '#64748B' }}>
          مخطط الجرد البياني سيتم عرضه هنا
        </Box>
      </SectionCard>
    </Box>
  )
}
