import { Box, Typography } from '@mui/material'
import type { InvoicePrintItem } from '../../types/invoicePrint'

interface InvoiceDetailsTableProps {
  items: InvoicePrintItem[]
  productionMode?: boolean
}

function formatNumber(value: number | undefined): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0))
}

const cellSx = {
  border: '1px solid rgba(15, 23, 42, 0.12)',
  p: 1.15,
  textAlign: 'center',
  color: '#0F172A',
  overflowWrap: 'anywhere',
}

export function InvoiceDetailsTable({ items, productionMode = false }: InvoiceDetailsTableProps) {
  const headers = productionMode
    ? ['المادة', 'الكمية المخططة', 'الكمية المصروفة', 'التكلفة']
    : ['#', 'رقم المادة', 'اسم المادة', 'الوحدة', 'الكمية', 'السعر', 'الإجمالي']

  return (
    <Box
      dir="rtl"
      sx={{
        overflow: 'hidden',
        border: '1px solid rgba(15, 23, 42, 0.12)',
        borderRadius: '10px',
        background: '#FFFFFF',
        '@media print': {
          overflow: 'visible',
          border: 'none',
          borderRadius: 0,
        },
      }}
    >
      <Box
        component="table"
        sx={{
          width: '100%',
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
          fontSize: 13,
          '@media print': {
            breakInside: 'auto',
            pageBreakInside: 'auto',
          },
        }}
      >
        <Box
          component="thead"
          sx={{
            '@media print': {
              display: 'table-header-group',
            },
          }}
        >
          <Box component="tr" sx={{ background: 'rgba(15, 23, 42, 0.045)' }}>
            {headers.map((header) => (
              <Box
                component="th"
                key={header}
                sx={{
                  border: '1px solid rgba(15, 23, 42, 0.12)',
                  p: 1.15,
                  textAlign: 'center',
                  fontWeight: 800,
                  color: '#0F172A',
                  whiteSpace: 'nowrap',
                }}
              >
                {header}
              </Box>
            ))}
          </Box>
        </Box>

        <Box
          component="tbody"
          sx={{
            '@media print': {
              display: 'table-row-group',
            },
          }}
        >
          {items.length === 0 ? (
            <Box component="tr">
              <Box component="td" colSpan={productionMode ? 4 : 7} sx={{ p: 2, textAlign: 'center', color: '#64748B' }}>
                لا توجد عناصر.
              </Box>
            </Box>
          ) : (
            items.map((item, index) => (
              <Box
                component="tr"
                key={item.id ?? `${item.code ?? item.name}-${index}`}
                sx={{
                  background: index % 2 === 0 ? '#FFFFFF' : 'rgba(148, 163, 184, 0.035)',
                  breakInside: 'avoid',
                  pageBreakInside: 'avoid',
                  '@media print': {
                    breakInside: 'avoid',
                    pageBreakInside: 'avoid',
                  },
                }}
              >
                {productionMode ? (
                  <>
                    <Box component="td" sx={cellSx}>{item.name}</Box>
                    <Box component="td" sx={cellSx}>{formatNumber(item.plannedQuantity)}</Box>
                    <Box component="td" sx={cellSx}>{formatNumber(item.actualQuantity)}</Box>
                    <Box component="td" sx={cellSx}>{formatNumber(item.cost ?? item.total)}</Box>
                  </>
                ) : (
                  <>
                    <Box component="td" sx={cellSx}>{index + 1}</Box>
                    <Box component="td" sx={cellSx}>{item.code || '—'}</Box>
                    <Box component="td" sx={{ ...cellSx }}>{item.name}</Box>
                    <Box component="td" sx={cellSx}>{item.unit || '—'}</Box>
                    <Box component="td" sx={cellSx}>{formatNumber(item.quantity)}</Box>
                    <Box component="td" sx={cellSx}>{formatNumber(item.price)}</Box>
                    <Box component="td" sx={cellSx}>{formatNumber(item.total)}</Box>
                  </>
                )}
              </Box>
            ))
          )}
        </Box>
      </Box>

      {items.some((item) => item.notes?.trim()) ? (
        <Box sx={{ borderTop: '1px solid rgba(15, 23, 42, 0.12)', p: 1.5 }}>
          <Typography sx={{ fontWeight: 700, color: '#0F172A', mb: 0.75, fontSize: 12.5 }}>
            ملاحظات العناصر
          </Typography>
          {items
            .filter((item) => item.notes?.trim())
            .map((item, index) => (
              <Typography key={`${item.id ?? item.name}-${index}`} sx={{ color: '#475569', fontSize: 12, mb: 0.25 }}>
                {item.name}: {item.notes}
              </Typography>
            ))}
        </Box>
      ) : null}
    </Box>
  )
}
