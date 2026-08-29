import { Box, Typography } from '@mui/material'
import { formatCurrencyValue } from '../../utils/displayFormatting'

interface InvoiceSummaryProps {
  subtotal: number
  discount: number
  total: number
  notes?: string
}

export function InvoiceSummary({ subtotal, discount, total, notes }: InvoiceSummaryProps) {
  return (
    <Box dir="rtl" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mt: 2, flexWrap: 'wrap' }}>
      <Box sx={{ flex: 1, minWidth: 220, display: 'grid', alignItems: 'center' }}>
        {notes && notes.trim() ? (
          <Box sx={{ border: '1px solid rgba(15, 23, 42, 0.12)', borderRadius: 2, background: 'rgba(15, 23, 42, 0.02)', p: 1.5 }}>
            <Typography sx={{ fontWeight: 700, color: '#0f172a', mb: 0.5 }}>ملاحظات</Typography>
            <Typography sx={{ color: '#475569', fontSize: 13 }}>{notes}</Typography>
          </Box>
        ) : null}
      </Box>

      <Box sx={{ minWidth: 260, width: { xs: '100%', sm: 'auto' }, border: '1px solid rgba(15, 23, 42, 0.12)', borderRadius: 2, background: '#fff', p: 2 }}>
        <Box sx={{ display: 'grid', gap: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, color: '#334155' }}>
            <Typography sx={{ fontWeight: 700 }}>المجموع:</Typography>
            <Typography>{formatCurrencyValue(subtotal, 'price')}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, color: '#334155' }}>
            <Typography sx={{ fontWeight: 700 }}>الخصم:</Typography>
            <Typography>{formatCurrencyValue(discount, 'price')}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, color: '#0f172a', borderTop: '1px solid rgba(15, 23, 42, 0.12)', pt: 1 }}>
            <Typography sx={{ fontWeight: 800 }}>الإجمالي النهائي:</Typography>
            <Typography sx={{ fontWeight: 800 }}>{formatCurrencyValue(total, 'price')}</Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
