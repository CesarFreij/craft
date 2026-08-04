import { Box } from '@mui/material'
import { SectionCard } from '../components/ui/SectionCard'

export function ReportsPage() {
  return (
    <Box>
      <SectionCard title="لوحة التقارير" subtitle="مؤشرات الأداء والمقاييس">
        <Box sx={{ minHeight: 320, display: 'grid', placeItems: 'center', color: '#64748B' }}>
          هنا ستُعرض الرسوم البيانية وتفاصيل الأداء
        </Box>
      </SectionCard>
    </Box>
  )
}
