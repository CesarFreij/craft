import { useMemo, useState } from 'react'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material'
import type { DialogProps } from '@mui/material/Dialog'
import { formatCurrencyValue, formatDateDMY, getLocalDateTimeString } from '../utils/displayFormatting'
import { loadCompanyPrintSettings } from '../services/companyPrintSettingsService'
import type { AccountStatementEntity, AccountStatementInvoice, AccountStatementKind } from '../types/accountStatement'
import { useNavigate } from 'react-router-dom'

type Props = {
  open: boolean
  onClose: () => void
  entity: AccountStatementEntity | null
  kind: AccountStatementKind
  invoices: AccountStatementInvoice[]
  slotProps?: DialogProps['slotProps']
}

type LedgerEntry = {
  id: string
  type: 'invoice' | 'payment'
  debit: number
  credit: number
  paymentMethod: string
  documentNumber: string
  notes: string
  date: string
}

function money(value: number) { return formatCurrencyValue(value, 'price') }
function getPreviousDayDateString(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day - 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function AccountStatementDialog({ open, onClose, entity, kind, invoices, slotProps }: Props) {
  const navigate = useNavigate()
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')
  const [quickFilter, setQuickFilter] = useState('')
  const isSupplier = kind === 'supplier-statement'

  const handleQuickFilterChange = (filterType: string) => {
    setQuickFilter(filterType)
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()

    if (filterType === 'current_month') {
      const start = new Date(year, month, 1)
      const end = new Date(year, month + 1, 0)
      const startString = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`
      const endString = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
      setStartDateFilter(startString)
      setEndDateFilter(endString)
    } else if (filterType === 'current_year') {
      setStartDateFilter(`${year}-01-01`)
      setEndDateFilter(`${year}-12-31`)
    } else if (filterType === 'last_year') {
      setStartDateFilter(`${year - 1}-01-01`)
      setEndDateFilter(`${year - 1}-12-31`)
    } else {
      setStartDateFilter('')
      setEndDateFilter('')
    }
  }

  const ledger = useMemo(() => {
    const entries: LedgerEntry[] = invoices.flatMap((invoice) => [
      {
        id: `invoice-${invoice.id}`,
        type: 'invoice' as const,
        debit: isSupplier ? 0 : invoice.amount,
        credit: isSupplier ? invoice.amount : 0,
        paymentMethod: '',
        documentNumber: invoice.invoiceNumber,
        notes: invoice.notes ?? '',
        date: invoice.date,
      },
      ...invoice.payments.map((payment) => ({
        id: `payment-${payment.id}`,
        type: 'payment' as const,
        debit: isSupplier ? payment.amount : 0,
        credit: isSupplier ? 0 : payment.amount,
        paymentMethod: payment.paymentMethod ?? '',
        documentNumber: '',
        notes: payment.notes ?? '',
        date: payment.date,
      })),
    ]).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const balanceOf = (entry: LedgerEntry) => isSupplier ? entry.credit - entry.debit : entry.debit - entry.credit
    const start = startDateFilter ? new Date(`${startDateFilter}T00:00:00`).getTime() : null
    const end = endDateFilter ? new Date(`${endDateFilter}T23:59:59.999`).getTime() : Number.POSITIVE_INFINITY
    const prior = start === null
      ? 0
      : entries
          .filter((entry) => new Date(entry.date).getTime() < start)
          .reduce((sum, entry) => sum + balanceOf(entry), 0)
    const visible = start === null ? entries.filter((entry) => new Date(entry.date).getTime() <= end) : entries.filter((entry) => {
      const time = new Date(entry.date).getTime()
      return time >= start && time <= end
    })

    if (start === null) return visible
    visible.unshift({
      id: 'carried-forward-balance',
      type: 'invoice',
      debit: isSupplier ? (prior < 0 ? Math.abs(prior) : 0) : (prior > 0 ? prior : 0),
      credit: isSupplier ? (prior > 0 ? prior : 0) : (prior < 0 ? Math.abs(prior) : 0),
      paymentMethod: '',
      documentNumber: '',
      notes: 'رصيد مدور',
      date: getPreviousDayDateString(startDateFilter),
    })
    return visible
  }, [invoices, isSupplier, startDateFilter, endDateFilter])

  const totalDebit = ledger.reduce((sum, entry) => sum + entry.debit, 0)
  const totalCredit = ledger.reduce((sum, entry) => sum + entry.credit, 0)
  const remainingBalance = isSupplier ? totalCredit - totalDebit : totalDebit - totalCredit

  const exportStatement = async () => {
    if (!entity) return
    const settings = await loadCompanyPrintSettings()
    navigate('/invoice-preview', {
      state: {
        invoiceData: {
          printKind: kind,
          statementKind: kind,
          documentType: isSupplier ? 'purchase' : 'sales',
          title: isSupplier ? 'كشف حساب مورد' : 'كشف حساب عميل',
          documentNumber: entity.code,
          date: getLocalDateTimeString(),
          partyLabel: isSupplier ? 'المورد' : 'العميل',
          partyName: entity.name,
          partyNumber: entity.code,
          items: [],
          subtotal: totalDebit,
          discount: 0,
          total: remainingBalance,
          entityCode: entity.code,
          entityName: entity.name,
          entityPhone: entity.phone ?? '',
          entityAddress: entity.address ?? '',
          relatedInvoices: invoices,
          totalDebit,
          totalCredit,
          remainingBalance,
          startDate: startDateFilter,
          endDate: endDateFilter,
        },
        settings,
      },
    })
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth slotProps={slotProps}>
      <DialogTitle>{isSupplier ? 'كشف حساب المورد' : 'كشف حساب العميل'}</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: 2 }}>
        {entity ? <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}><Box>الرقم: <strong>{entity.code}</strong></Box><Box>الاسم: <strong>{entity.name}</strong></Box><Box>الهاتف: <strong>{entity.phone ?? ''}</strong></Box></Box> : null}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', background: 'rgba(255, 255, 255, 0.04)', p: 1.5, borderRadius: '12px', flexWrap: 'wrap' }}>
          <TextField select label="فلترة سريعة" size="small" value={quickFilter} onChange={(event) => handleQuickFilterChange(event.target.value)} sx={{ minWidth: 140 }}>
            <MenuItem value="">مخصص</MenuItem><MenuItem value="current_month">الشهر الحالي</MenuItem><MenuItem value="current_year">العام الحالي</MenuItem><MenuItem value="last_year">العام الماضي</MenuItem>
          </TextField>
          <TextField label="من تاريخ" type="date" size="small" value={startDateFilter} onChange={(event) => { setStartDateFilter(event.target.value); setQuickFilter('') }} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField label="إلى تاريخ" type="date" size="small" value={endDateFilter} onChange={(event) => { setEndDateFilter(event.target.value); setQuickFilter('') }} slotProps={{ inputLabel: { shrink: true } }} />
          {(startDateFilter || endDateFilter || quickFilter) ? <Button variant="outlined" size="small" onClick={() => { setStartDateFilter(''); setEndDateFilter(''); setQuickFilter('') }}>إعادة ضبط</Button> : null}
        </Box>
        {ledger.length === 0 ? <Typography>لا توجد حركات مسجلة في الفترة المحددة.</Typography> : <Table sx={{ width: '100%' }}><TableHead><TableRow sx={{ background: 'rgba(255, 255, 255, 0.055)', textAlignLast: 'center' }}><TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>مدين</TableCell><TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>دائن</TableCell><TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>طريقة الدفع</TableCell><TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>رقم المستند</TableCell><TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الملاحظات</TableCell><TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>التاريخ</TableCell></TableRow></TableHead><TableBody>{ledger.map((entry) => <TableRow key={entry.id} sx={{ textAlignLast: 'center' }}><TableCell sx={{ textAlign: 'center' }}>{entry.debit > 0 ? money(entry.debit) : ''}</TableCell><TableCell sx={{ textAlign: 'center' }}>{entry.id === 'carried-forward-balance' && entry.debit === 0 && entry.credit === 0 ? money(0) : entry.credit > 0 ? money(entry.credit) : ''}</TableCell><TableCell sx={{ textAlign: 'center' }}>{entry.paymentMethod}</TableCell><TableCell sx={{ textAlign: 'center' }}>{entry.documentNumber}</TableCell><TableCell sx={{ textAlign: 'center' }}>{entry.notes}</TableCell><TableCell sx={{ textAlign: 'center' }}>{formatDateDMY(entry.date)}</TableCell></TableRow>)}</TableBody></Table>}
        <Table sx={{ width: '100%', minWidth: 620, '& td, & th': { textAlign: 'center' } }}><TableHead><TableRow><TableCell>إجمالي المدين</TableCell><TableCell>إجمالي الدائن</TableCell><TableCell>الرصيد</TableCell></TableRow></TableHead><TableBody><TableRow><TableCell>{money(totalDebit)}</TableCell><TableCell>{money(totalCredit)}</TableCell><TableCell>{money(remainingBalance)}</TableCell></TableRow></TableBody></Table>
      </DialogContent>
      <DialogActions><Button onClick={exportStatement} variant="contained">تصدير PDF</Button><Button onClick={onClose}>إغلاق</Button></DialogActions>
    </Dialog>
  )
}
