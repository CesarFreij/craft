import { Box } from '@mui/material'
import { SectionCard } from '../components/ui/SectionCard'

export function PurchasesPage() {
  return (
    <Box>
      <SectionCard title="سجل المشتريات" subtitle="ملخص الأوامر والفواتير">
        <Box sx={{ minHeight: 320, display: 'grid', placeItems: 'center', color: '#64748B' }}>
          عرض الفواتير وإحصائيات المشتريات
        </Box>
      </SectionCard>
    </Box>
  )
}
