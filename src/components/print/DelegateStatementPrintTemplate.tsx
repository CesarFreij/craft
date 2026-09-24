import { useMemo } from 'react'
import { Box, Typography } from '@mui/material'
import { formatCurrencyValue, formatDateDMY, formatNumberBySettings, getLocalDateYMD } from '../../utils/displayFormatting'
import type { CompanyPrintSettings, InvoicePrintData } from '../../types/invoicePrint'

export interface DelegateStatementInvoice {
  invoiceNumber: string
  date: string
  commissionPercentage?: number
  commissionAmount?: number
  debit?: number
  credit?: number
  paymentMethod?: string
  notes?: string
}

export interface DelegateStatementPayment {
  date: string
  amount: number
  notes?: string
  paymentMethod?: string
}

export interface DelegateStatementPrintData extends InvoicePrintData {
  printKind: 'delegate-statement'
  delegateCode: string
  delegateName: string
  delegatePhone: string
  delegateAddress: string
  relatedInvoices: DelegateStatementInvoice[]
  delegatePayments: DelegateStatementPayment[]
  totalCommission: number
  totalPaid: number
  remainingBalance: number
  startDate?: string
  endDate?: string
}

interface DelegateStatementPrintTemplateProps {
  data: DelegateStatementPrintData
  settings: CompanyPrintSettings
}

function money(value: number | undefined): string {
  return formatCurrencyValue(value ?? 0, 'price')
}

function priceNum(value: number | undefined): string {
  return formatNumberBySettings(value ?? 0, 'price')
}

function getPreviousDayDateString(dateStr: string): string {
  if (!dateStr) return ''
  const cleanStr = dateStr.split('T')[0]
  const parts = cleanStr.split('-')
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1
    const day = parseInt(parts[2], 10)
    const d = new Date(year, month, day - 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const da = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${da}`
  }
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  d.setDate(d.getDate() - 1)
  return getLocalDateYMD(d)
}

function ValueRow({
  label,
  value,
  bold = false,
  bordered = true,
}: {
  label: string
  value: string
  bold?: boolean
  bordered?: boolean
}) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '50% 50%',
        minHeight: 31,
        ...(bordered
          ? {
              border: '1px solid #C7CCD2',
              borderTop: 0,
            }
          : {}),
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 0.75,
          fontSize: 12.5,
          fontWeight: bold ? 900 : 800,
          direction: 'ltr',
          textAlign: 'right',
        }}
      >
        {label}
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 0.75,
          fontSize: 12.5,
          fontWeight: bold ? 900 : 700,
          fontVariantNumeric: 'tabular-nums',
          borderLeft: bordered ? '1px solid #C7CCD2' : 0,
        }}
      >
        {value}
      </Box>
    </Box>
  )
}

const tableSx = {
  width: '100%',
  borderCollapse: 'collapse',
  tableLayout: 'fixed',
  color: '#111827',
  '& th, & td': {
    border: '1px solid #BFC5CC',
    px: 0.75,
    py: 0.72,
    fontSize: 12.5,
    lineHeight: 1.35,
    verticalAlign: 'middle',
    textAlign: 'center',
  },
  '& th': { fontWeight: 800, background: '#FFFFFF', color: '#111827', whiteSpace: 'nowrap' },
  '& td': { fontWeight: 500, background: '#FFFFFF' },
}

export function DelegateStatementPrintTemplate({
  data,
  settings,
}: DelegateStatementPrintTemplateProps) {
  const companyName = settings.companyName?.trim() ?? ''
  const companyAddress = settings.address?.trim() ?? ''
  const companyPhone = settings.phone?.trim() ?? ''
  const companyEmail = settings.email?.trim() ?? ''
  const companyTaxNumber = settings.taxNumber?.trim() ?? ''
  const hasLogo = Boolean(settings.logoDataUrl?.trim())

  const entries = useMemo(() => {
    const invoicesAsEntries = (data.relatedInvoices || []).map((inv) => ({
      id: `inv-${inv.invoiceNumber}`,
      debit: inv.debit ?? 0,
      credit: inv.credit ?? inv.commissionAmount ?? 0,
      paymentMethod: inv.paymentMethod || '',
      invoiceNumber: inv.invoiceNumber || '',
      commissionPercentage:
        inv.commissionPercentage !== undefined && inv.commissionPercentage !== null
          ? `${inv.commissionPercentage}%`
          : '',
      notes: inv.notes || '',
      date: inv.date,
    }))

    const paymentsAsEntries = (data.delegatePayments || []).map((p) => ({
      id: `pay-${p.date}-${p.amount}`,
      debit: p.amount ?? 0,
      credit: 0,
      paymentMethod: p.paymentMethod || '',
      invoiceNumber: '',
      commissionPercentage: '',
      notes: p.notes || '',
      date: p.date,
    }))

    const all = [...invoicesAsEntries, ...paymentsAsEntries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    )

    if (data.startDate) {
      const startMs = new Date(data.startDate).getTime()
      const priorEntries = all.filter((entry) => new Date(entry.date).getTime() < startMs)
      const carryOverBalance = priorEntries.reduce((sum, item) => sum + (item.credit - item.debit), 0)

      const filtered = all.filter((entry) => {
        const entryMs = new Date(entry.date).getTime()
        if (data.endDate) {
          const endMs = new Date(data.endDate).getTime() + (24 * 60 * 60 * 1000 - 1)
          return entryMs >= startMs && entryMs <= endMs
        }
        return entryMs >= startMs
      })

      const prevDateStr = getPreviousDayDateString(data.startDate)
      const safeCarryOver = Number(carryOverBalance) || 0
      const carryOverDebit = safeCarryOver < 0 ? Math.abs(safeCarryOver) : 0
      const carryOverCredit = safeCarryOver > 0 ? safeCarryOver : 0

      filtered.unshift({
        id: 'carried-forward-balance',
        debit: carryOverDebit,
        credit: carryOverCredit,
        paymentMethod: '',
        invoiceNumber: '',
        commissionPercentage: '',
        notes: 'رصيد مدور',
        date: prevDateStr,
      })
      return filtered
    } else if (data.endDate) {
      const endMs = new Date(data.endDate).getTime() + (24 * 60 * 60 * 1000 - 1)
      return all.filter((entry) => new Date(entry.date).getTime() <= endMs)
    }

    return all
  }, [data.relatedInvoices, data.delegatePayments, data.startDate, data.endDate])

  const formattedStartDate = data.startDate ? formatDateDMY(data.startDate) : formatDateDMY('2026-01-01')
  const formattedEndDate = data.endDate
    ? formatDateDMY(data.endDate)
    : formatDateDMY(getLocalDateYMD())

  return (
    <Box
      dir="rtl"
      className="craft-print-visible"
      sx={{
        width: '100%',
        minHeight: '297mm',
        background: '#FFFFFF',
        color: '#111827',
        boxSizing: 'border-box',
        padding: '12mm 12mm 14mm',
        fontFamily: 'Tajawal, Tahoma, Arial, sans-serif',
        '@media print': {
          background: '#FFFFFF !important',
          boxShadow: 'none !important',
          border: 'none !important',
          padding: '12mm 12mm 14mm',
        },
        '@page': { size: 'A4', margin: 0 },
      }}
    >
      {/* أعلى الفاتورة: الشعار يسار وبيانات الشركة يمين */}
      <Box
        sx={{
          display: 'flex',
          direction: 'rtl',
          justifyContent: 'space-between',
          alignItems: 'stretch',
          gap: 4,
          mb: 1.6,
        }}
      >
        <Box sx={{ width: 210, position: 'relative', flexShrink: 0 }}>
          {hasLogo ? (
            <Box
              component="img"
              src={settings.logoDataUrl}
              alt="شعار الشركة"
              sx={{
                display: 'block',
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                objectPosition: 'right center',
              }}
            />
          ) : null}
        </Box>
        <Box dir="rtl" sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: 20,
              lineHeight: 1.2,
              fontWeight: 900,
              color: '#111827',
              mb: 1,
            }}
          >
            {data.title || 'تقرير المندوب'}
          </Typography>
          {companyName ? (
            <Typography
              sx={{
                fontSize: 18,
                lineHeight: 1.35,
                fontWeight: 900,
                color: '#111827',
                mb: 0.6,
              }}
            >
              {companyName}
            </Typography>
          ) : null}
          <Box sx={{ display: 'grid', gap: 0.35 }}>
            {companyAddress ? (
              <Typography
                sx={{
                  fontSize: 12.5,
                  lineHeight: 1.55,
                  color: '#111827',
                  whiteSpace: 'pre-line',
                }}
              >
                {companyAddress}
              </Typography>
            ) : null}
            {companyPhone ? (
              <Typography sx={{ fontSize: 12.5, color: '#111827' }}>
                موبايل :{' '}
                <Box component="span" dir="ltr" sx={{ unicodeBidi: 'embed' }}>
                  {companyPhone}
                </Box>
              </Typography>
            ) : null}
            {companyEmail ? (
              <Typography sx={{ fontSize: 12, color: '#475569' }}>
                <Box component="span" dir="ltr" sx={{ unicodeBidi: 'embed' }}>
                  {companyEmail}
                </Box>
              </Typography>
            ) : null}
            {companyTaxNumber ? (
              <Typography sx={{ fontSize: 12, color: '#475569' }}>
                الرقم الضريبي:{' '}
                <Box component="span" dir="ltr" sx={{ unicodeBidi: 'isolate' }}>
                  {companyTaxNumber}
                </Box>
              </Typography>
            ) : null}
          </Box>
        </Box>
      </Box>

      {/* قسم اسم المندوب والتاريخ في المنتصف */}
      <Box
        sx={{
          borderTop: '1px solid #D4D7DB',
          pt: 1.7,
          mb: 2.1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          direction: 'rtl',
          gap: 0.75,
        }}
      >
        <Typography sx={{ fontSize: 14, fontWeight: 900, color: '#111827' }}>
          اسم المندوب: {data.delegateName || ''} / {data.delegateCode || ''}
        </Typography>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
          التاريخ من: {formattedStartDate} إلى: {formattedEndDate}
        </Typography>
      </Box>

      {/* جدول البيانات الرئيسي للمندوب */}
      <Box component="table" dir="rtl" sx={tableSx}>
        <Box component="thead">
          <Box component="tr">
            <Box component="th">مدين</Box>
            <Box component="th">دائن</Box>
            <Box component="th">طريقة الدفع</Box>
            <Box component="th">رقم الفاتورة</Box>
            <Box component="th">نسبة العمولة</Box>
            <Box component="th">الملاحظات</Box>
            <Box component="th">التاريخ</Box>
          </Box>
        </Box>
        <Box component="tbody">
          {entries.length > 0 ? (
            entries.map((entry, index) => (
              <Box component="tr" key={`${entry.id}-${index}`}>
                <Box component="td">{entry.debit > 0 ? priceNum(entry.debit) : ''}</Box>
                <Box component="td">
                  {entry.id === 'carried-forward-balance' && entry.debit === 0 && entry.credit === 0
                    ? priceNum(0)
                    : entry.credit > 0
                      ? priceNum(entry.credit)
                      : ''}
                </Box>
                <Box component="td">{entry.paymentMethod?.trim() || ''}</Box>
                <Box component="td">{entry.invoiceNumber || ''}</Box>
                <Box component="td">{entry.commissionPercentage}</Box>
                <Box component="td">{entry.notes?.trim() || ''}</Box>
                <Box component="td">{entry.date ? formatDateDMY(entry.date) : ''}</Box>
              </Box>
            ))
          ) : (
            <Box component="tr">
              <Box component="td" colSpan={7}>
                لا توجد بيانات متعلقة بهذا المندوب
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      {/* الخلاصة أسفل اليسار */}
      <Box
        className="invoice-summary"
        sx={{
          mt: 1.6,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 310px',
          direction: 'ltr',
          gap: 5,
          alignItems: 'start',
        }}
      >
        <Box>
          {data.notes?.trim() ? (
            <Box className="invoice-document-notes" sx={{ maxWidth: 430, pt: 0.7 }}>
              <Typography
                sx={{
                  fontWeight: 900,
                  color: '#111827',
                  mb: 0.5,
                  fontSize: 12.5,
                }}
              >
                ملاحظات:
              </Typography>
              <Typography
                sx={{
                  color: '#475569',
                  fontSize: 12,
                  lineHeight: 1.65,
                  whiteSpace: 'pre-line',
                }}
              >
                {data.notes}
              </Typography>
            </Box>
          ) : null}
        </Box>

        <Box dir="ltr" sx={{ direction: 'ltr' }}>
          <Box sx={{ borderTop: '1px solid #C7CCD2' }}>
            <ValueRow label="اجمالي العمولات" value={money(data.totalCommission)} bold />
            <ValueRow label="القيمة المدفوعة" value={money(data.totalPaid)} bold />
            <ValueRow label="القيمة المستحقة" value={money(data.remainingBalance)} bold />
          </Box>
        </Box>
      </Box>
    </Box>
  )
}