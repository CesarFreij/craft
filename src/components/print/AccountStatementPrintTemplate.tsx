import { useMemo } from 'react'
import { Box, Typography } from '@mui/material'
import { formatCurrencyValue, formatDateDMY, formatNumberBySettings, getLocalDateYMD } from '../../utils/displayFormatting'
import type { CompanyPrintSettings } from '../../types/invoicePrint'
import type { AccountStatementPrintData } from '../../types/accountStatement'

interface AccountStatementPrintTemplateProps {
  data: AccountStatementPrintData
  settings: CompanyPrintSettings
}

function money(value: number | undefined): string {
  return formatCurrencyValue(value ?? 0, 'price')
}

function priceNum(value: number | undefined): string {
  return formatNumberBySettings(value ?? 0, 'price')
}

function previousDay(date: string): string {
  if (!date) return ''
  const value = new Date(`${date}T00:00:00`)
  value.setDate(value.getDate() - 1)
  return getLocalDateYMD(value)
}

const tableSx = {
  width: '100%',
  minWidth: 'max-content',
  borderCollapse: 'collapse',
  tableLayout: 'auto',
  color: '#111827',
  '& th, & td': {
    border: '1px solid #BFC5CC',
    px: 0.75,
    py: 0.72,
    lineHeight: 1.35,
    verticalAlign: 'middle',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    wordBreak: 'normal',
    overflowWrap: 'normal',
    boxSizing: 'border-box',
  },
  '& th': { fontWeight: 800, background: '#FFFFFF', color: '#111827' },
  '& td': { fontWeight: 500, background: '#FFFFFF' },
  '& thead': { display: 'table-header-group' },
  '& tr': { pageBreakInside: 'avoid', breakInside: 'avoid' },
}

function ValueRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '50% 50%', minHeight: 31, border: '1px solid #C7CCD2', borderTop: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', px: 0.75, fontSize: 12.5, fontWeight: 800, direction: 'ltr', textAlign: 'right' }}>
        {label}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', px: 0.75, fontSize: 12.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums', borderLeft: '1px solid #C7CCD2' }}>
        {value}
      </Box>
    </Box>
  )
}

export function AccountStatementPrintTemplate({ data, settings }: AccountStatementPrintTemplateProps) {
  const isSupplier = data.statementKind === 'supplier-statement'
  
  const entries = useMemo(() => {
    if (data.ledgerEntries?.length) {
      return data.ledgerEntries.map((entry) => ({
        ...entry,
        type: entry.type ?? 'invoice',
        documentNumber: entry.documentNumber ?? entry.invoiceNumber ?? '',
      }))
    }

    const relatedInvoices = data.relatedInvoices ?? []
    const invoices = relatedInvoices.map((invoice) => ({
      id: `invoice-${invoice.id}`,
      type: 'invoice' as const,
      debit: isSupplier ? 0 : invoice.amount,
      credit: isSupplier ? invoice.amount : 0,
      paymentMethod: '',
      documentNumber: invoice.invoiceNumber,
      notes: invoice.notes ?? '',
      date: invoice.date,
    }))
    const payments = relatedInvoices.flatMap((invoice) => invoice.payments.map((payment) => ({
      id: `payment-${payment.id}`,
      type: 'payment' as const,
      debit: isSupplier ? payment.amount : 0,
      credit: isSupplier ? 0 : payment.amount,
      paymentMethod: payment.paymentMethod ?? '',
      documentNumber: '',
      notes: payment.notes ?? '',
      date: payment.date,
    })))
    const all = [...invoices, ...payments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    if (!data.startDate) return all
    const start = new Date(`${data.startDate}T00:00:00`).getTime()
    const end = data.endDate ? new Date(`${data.endDate}T23:59:59.999`).getTime() : Number.POSITIVE_INFINITY
    const balanceOf = (entry: typeof all[number]) => isSupplier
      ? entry.credit - entry.debit - (entry.type === 'payment' ? entry.credit : 0)
      : entry.debit - entry.credit
    const prior = all.reduce((sum, entry) => sum + balanceOf(entry), 0)
    const before = all.filter((entry) => new Date(entry.date).getTime() < start)
      .reduce((sum, entry) => sum + balanceOf(entry), 0)
    const filtered = all.filter((entry) => new Date(entry.date).getTime() >= start && new Date(entry.date).getTime() <= end)
    const balance = Number(before) || 0
    filtered.unshift({
      id: 'carried-forward-balance',
      type: 'invoice' as const,
      debit: isSupplier ? (balance < 0 ? Math.abs(balance) : 0) : (balance > 0 ? balance : 0),
      credit: isSupplier ? (balance > 0 ? balance : 0) : (balance < 0 ? Math.abs(balance) : 0),
      paymentMethod: '',
      documentNumber: '',
      notes: 'رصيد مدور',
      date: previousDay(data.startDate),
    })
    void prior
    return filtered
  }, [data.ledgerEntries, data.relatedInvoices, data.startDate, data.endDate, isSupplier])
  const statementTotals = useMemo(() => {
    const gross = entries.reduce(
      (sum, entry) => entry.type === 'invoice' && entry.id !== 'carried-forward-balance'
        ? sum + (isSupplier ? entry.credit : entry.debit)
        : sum,
      0,
    )
    const returns = entries.reduce(
      (sum, entry) => entry.type === 'return'
        ? sum + (isSupplier ? entry.debit : entry.credit)
        : sum,
      0,
    )
    const payments = entries.reduce(
      (sum, entry) => entry.type === 'payment'
        ? sum + (isSupplier ? entry.debit : entry.credit)
        : sum,
      0,
    )
    const balance = isSupplier
      ? entries.reduce(
          (sum, entry) => sum + entry.credit - entry.debit - (entry.type === 'payment' ? entry.credit : 0),
          0,
        )
      : data.remainingBalance
    return {
      net: Math.max(gross - returns, 0),
      payments,
      balance,
    }
  }, [data.remainingBalance, entries, isSupplier])

  const start = data.startDate ? formatDateDMY(data.startDate) : formatDateDMY('2026-01-01')
  const end = data.endDate ? formatDateDMY(data.endDate) : formatDateDMY(getLocalDateYMD())
  const companyName = settings.companyName?.trim() ?? ''
  const companyAddress = settings.address?.trim() ?? ''
  const companyPhone = settings.phone?.trim() ?? ''
  const companyEmail = settings.email?.trim() ?? ''
  const companyTaxNumber = settings.taxNumber?.trim() ?? ''
  const entityLabel = isSupplier ? 'المورد' : 'العميل'

  return (
    <Box dir="rtl" className="craft-print-visible" sx={{ width: '100%', minHeight: '297mm', background: '#FFFFFF', color: '#111827', boxSizing: 'border-box', padding: '12mm 12mm 14mm', fontFamily: 'Tajawal, Tahoma, Arial, sans-serif', '@media print': { background: '#FFFFFF !important', boxShadow: 'none !important', border: 'none !important', padding: 0 } }}>
      <Box sx={{ display: 'flex', direction: 'rtl', justifyContent: 'space-between', alignItems: 'stretch', gap: 4, mb: 1.6 }}>
        <Box sx={{ width: 210, position: 'relative', flexShrink: 0 }}>
          {settings.logoDataUrl?.trim() ? <Box component="img" src={settings.logoDataUrl} alt="شعار الشركة" sx={{ display: 'block', position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'right center' }} /> : null}
        </Box>
        <Box dir="rtl" sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 20, lineHeight: 1.2, fontWeight: 900, color: '#111827', mb: 1 }}>{data.title}</Typography>
          {companyName ? <Typography sx={{ fontSize: 18, lineHeight: 1.35, fontWeight: 900, color: '#111827', mb: 0.6 }}>{companyName}</Typography> : null}
          <Box sx={{ display: 'grid', gap: 0.35 }}>
            {companyAddress ? <Typography sx={{ fontSize: 12.5, lineHeight: 1.55, color: '#111827', whiteSpace: 'pre-line' }}>{companyAddress}</Typography> : null}
            {companyPhone ? <Typography sx={{ fontSize: 12.5, color: '#111827' }}>موبايل : <Box component="span" dir="ltr" sx={{ unicodeBidi: 'embed' }}>{companyPhone}</Box></Typography> : null}
            {companyEmail ? <Typography sx={{ fontSize: 12, color: '#475569' }}><Box component="span" dir="ltr" sx={{ unicodeBidi: 'embed' }}>{companyEmail}</Box></Typography> : null}
            {companyTaxNumber ? <Typography sx={{ fontSize: 12, color: '#475569' }}>الرقم الضريبي: <Box component="span" dir="ltr" sx={{ unicodeBidi: 'isolate' }}>{companyTaxNumber}</Box></Typography> : null}
          </Box>
        </Box>
      </Box>
      <Box sx={{ borderTop: '1px solid #D4D7DB', pt: 1.7, mb: 2.1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', direction: 'rtl', gap: 0.75 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 900, color: '#111827' }}>{entityLabel}: {data.entityName || ''} / {data.entityCode || ''}</Typography>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>التاريخ من: {start} إلى: {end}</Typography>
      </Box>
      <Box component="table" dir="rtl" sx={tableSx}>
        <Box component="thead"><Box component="tr"><Box component="th">مدين</Box><Box component="th">دائن</Box><Box component="th">نوع الحركة</Box><Box component="th">طريقة الدفع</Box><Box component="th">رقم المستند</Box><Box component="th">الملاحظات</Box><Box component="th">التاريخ</Box></Box></Box>
        <Box component="tbody">
          {entries.length ? entries.map((entry) => <Box component="tr" key={entry.id}><Box component="td">{entry.debit > 0 ? priceNum(entry.debit) : ''}</Box><Box component="td">{entry.credit > 0 ? priceNum(entry.credit) : ''}</Box><Box component="td">{entry.id === 'carried-forward-balance' ? 'رصيد مدور' : entry.type === 'return' ? (isSupplier ? 'مرتجع شراء' : 'مرتجع مبيعات') : entry.type === 'payment' ? (isSupplier ? (entry.debit > 0 ? 'دفعة للمورد' : 'سند قبض من المورد') : (entry.credit > 0 ? 'دفعة من العميل' : 'سند صرف للعميل')) : (isSupplier ? 'فاتورة شراء' : 'فاتورة مبيعات')}</Box><Box component="td">{entry.paymentMethod}</Box><Box component="td">{entry.documentNumber}</Box><Box component="td">{entry.notes}</Box><Box component="td">{formatDateDMY(entry.date)}</Box></Box>) : <Box component="tr"><Box component="td" colSpan={7}>لا توجد حركات مسجلة</Box></Box>}
        </Box>
      </Box>
      <Box className="invoice-summary" sx={{ mt: 1.6, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 310px', direction: 'ltr', gap: 5, alignItems: 'start' }}>
        <Box />
        <Box dir="ltr" sx={{ direction: 'ltr' }}>
          <Box sx={{ borderTop: '1px solid #C7CCD2' }}>
            <ValueRow label={isSupplier ? 'صافي المشتريات' : 'صافي المبيعات'} value={money(statementTotals.net)} />
            <ValueRow label="الدفعات النقدية" value={money(statementTotals.payments)} />
            <ValueRow label="الرصيد" value={money(statementTotals.balance)} />
          </Box>
        </Box>
      </Box>
    </Box>
  )
}