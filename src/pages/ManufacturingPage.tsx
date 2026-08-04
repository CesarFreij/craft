import { Box } from '@mui/material'
import { SectionCard } from '../components/ui/SectionCard'

export function ManufacturingPage() {
  return (
    <Box>

      <SectionCard title="لوحة الإنتاج" subtitle="متابعة سير التصنيع">
        <Box sx={{ minHeight: 320, display: 'grid', placeItems: 'center', color: '#64748B' }}>
          رؤية متكاملة لجدول الإنتاج
        </Box>
      </SectionCard>
    </Box>
  )
}
