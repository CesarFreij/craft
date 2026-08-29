import { useEffect } from 'react'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material'
import { InvoicePrintTemplate } from './InvoicePrintTemplate'
import { formatCurrencyValue, formatNumberBySettings } from '../../utils/displayFormatting'
import type { CompanyPrintSettings, InvoicePrintData } from '../../types/invoicePrint'

interface PrintPreviewDialogProps {
  open: boolean
  onClose: () => void
  settings: CompanyPrintSettings
  data: InvoicePrintData | null
}

function buildCsv(data: InvoicePrintData): string {
  const headers = data.productionMode ? ['المادة', 'الكمية المخططة', 'الكمية المصروفة', 'التكلفة'] : ['الرقم', 'رقم المادة', 'اسم المادة', 'الوحدة', 'الكمية', 'السعر', 'الإجمالي']
  const rows = data.items.map((item, index) => {
    if (data.productionMode) {
      return [
        item.name,
        formatNumberBySettings(item.plannedQuantity ?? 0, 'quantity'),
        formatNumberBySettings(item.actualQuantity ?? 0, 'quantity'),
        formatCurrencyValue(item.cost ?? item.total ?? 0, 'price'),
      ].join(',')
    }

    return [
      index + 1,
      item.code ?? '',
      item.name,
      item.unit,
      formatNumberBySettings(item.quantity ?? 0, 'quantity'),
      formatCurrencyValue(item.price ?? 0, 'price'),
      formatCurrencyValue(item.total ?? 0, 'price'),
    ].join(',')
  })

  const summary = `\n"المجموع","${formatCurrencyValue(data.subtotal, 'price')}"\n"الخصم","${formatCurrencyValue(data.discount, 'price')}"\n"الإجمالي النهائي","${formatCurrencyValue(data.total, 'price')}"`
  return `"${data.title}","${data.documentNumber}"\n"التاريخ","${data.date}"\n"${data.partyLabel}","${data.partyName}"\n${headers.join(',')}\n${rows.join('\n')}${summary}`
}

export function PrintPreviewDialog({ open, onClose, settings, data }: PrintPreviewDialogProps) {
  useEffect(() => {
    if (!open) {
      return
    }

    const styleId = 'craft-print-preview-style'
    let styleTag = document.getElementById(styleId) as HTMLStyleElement | null

    if (!styleTag) {
      styleTag = document.createElement('style')
      styleTag.id = styleId
      styleTag.textContent = `
        @media print {
          body, html {
            background: #ffffff !important;
            margin: 0 !important;
          }
          body > *:not(.craft-print-visible) {
            display: none !important;
            visibility: hidden !important;
          }
          .craft-print-visible {
            display: block !important;
            visibility: visible !important;
            position: static !important;
            width: 100% !important;
            max-width: none !important;
            background: #ffffff !important;
            box-shadow: none !important;
          }
          .craft-print-visible * {
            visibility: visible !important;
          }
        }
      `
      document.head.appendChild(styleTag)
    }

    return () => {
      const existing = document.getElementById(styleId)
      if (existing) {
        existing.remove()
      }
    }
  }, [open])

  const handleExportCsv = () => {
    if (!data) return

    const csvContent = buildCsv(data)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${data.documentNumber || 'document'}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  if (!data) {
    return null
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth slotProps={{ paper: {sx: { borderRadius: 3 } } }}>
      <DialogTitle sx={{ fontWeight: 800, textAlign: 'right', color: '#0f172a' }}>معاينة الطباعة</DialogTitle>
      <DialogContent dividers sx={{ background: 'rgba(15, 23, 42, 0.03)', p: 2 }}>
        <Box sx={{ background: '#fff', borderRadius: 2, p: 0 }} className="craft-print-visible">
          <InvoicePrintTemplate data={data} settings={settings} />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, display: 'flex', justifyContent: 'space-between', gap: 1 }}>
        <Button onClick={onClose}>إغلاق</Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" onClick={handleExportCsv}>CSV</Button>
        </Box>
      </DialogActions>
    </Dialog>
  )
}
