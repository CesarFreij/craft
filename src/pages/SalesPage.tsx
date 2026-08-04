import { Box } from '@mui/material'
import { SectionCard } from '../components/ui/SectionCard'

export function SalesPage() {
  return (
    <Box>
      <SectionCard title="ملخص المبيعات" subtitle="أداء العملاء والصفقات">
        <Box sx={{ minHeight: 320, display: 'grid', placeItems: 'center', color: '#64748B' }}>
          محتوى المبيعات والتقارير التفصيلية
        </Box>
      </SectionCard>
    </Box>
  )
}
