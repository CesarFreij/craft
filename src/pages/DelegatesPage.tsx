import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { FiCheckCircle, FiEdit2, FiEye, FiPlus, FiTrash2 } from 'react-icons/fi'
import { PageHeader } from '../components/ui/PageHeader'
import { SectionCard } from '../components/ui/SectionCard'
import { delegatesService, salesService, type DelegatePayment, type DelegateRecord } from '../services/purchasesService'
import { useNotifications } from '../contexts/useNotifications'
import { getUserFriendlyErrorMessage } from '../utils/errorMessages'
import { formatCurrencyValue, formatDateDMY, getLocalDateTimeString, getLocalDateYMD, toInternalDate, formatNumberBySettings } from '../utils/displayFormatting'
import { loadCompanyPrintSettings } from '../services/companyPrintSettingsService'
import { loadSettings } from '../services/settingsService'

type DelegateForm = {
  id?: string
  code: string
  name: string
  phone: string
  address: string
  notes: string
  status: 'active' | 'inactive'
}

type LedgerEntry = {
  id: string
  type: 'invoice' | 'payment'
  debit: number
  credit: number
  paymentMethod: string
  invoiceNumber: string
  commissionPercentage: string
  notes: string
  date: string
  paymentId?: string
}

const emptyForm: DelegateForm = { code: '', name: '', phone: '', address: '', notes: '', status: 'active' }

function currency(value: number): string {
  return formatCurrencyValue(value, 'price')
}

function priceNum(value: number | undefined): string {
  return formatNumberBySettings(Number(value ?? 0), 'price')
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

const darkPopupPaperSx = {
  mt: 0.75,
  borderRadius: '12px',
  background: 'rgba(8, 22, 48, 0.97)',
  backdropFilter: 'blur(22px) saturate(125%)',
  WebkitBackdropFilter: 'blur(22px) saturate(125%)',
  border: '1px solid rgba(255, 255, 255, 0.14)',
  boxShadow: '0 20px 50px rgba(2, 6, 23, 0.38)',
  color: 'rgba(255, 255, 255, 0.92)',
  backgroundImage: 'none',
  '& .MuiMenuItem-root, & .MuiAutocomplete-option': {
    color: 'rgba(255, 255, 255, 0.88)',
    borderRadius: '8px',
    mx: 0.5,
    my: 0.25,
    '&:hover': {
      background: 'rgba(56, 189, 248, 0.10)',
    },
    '&.Mui-selected, &[aria-selected="true"]': {
      color: '#67E8F9',
      background: 'rgba(34, 211, 238, 0.13)',
    },
  },
}

const darkSelectSlotProps = {
  select: {
    MenuProps: {
      slotProps: { paper: { sx: darkPopupPaperSx } },
    },
  },
}

const craftPageGlassSx = {
  '& .MuiPaper-root:not(.MuiAlert-root)': {
    background: 'rgba(248, 250, 252, 0.10) !important',
    backdropFilter: 'blur(36px) saturate(120%)',
    WebkitBackdropFilter: 'blur(18px) saturate(120%)',
    boxShadow: '0 18px 45px rgba(2, 6, 23, 0.16) !important',
    border: 'none !important',
    borderRadius: '18px',
    color: 'rgba(255, 255, 255, 0.92)',
    backgroundImage: 'none !important',
  },
  '& .MuiTypography-root': {
    color: 'rgba(255, 255, 255, 0.92)',
  },
  '& .MuiInputBase-root': {
    background: 'rgba(255, 255, 255, 0.07)',
    color: 'rgba(255, 255, 255, 0.92)',
    borderRadius: '14px',
  },
  '& .MuiInputBase-input': {
    color: 'rgba(255, 255, 255, 0.92)',
    WebkitTextFillColor: 'rgba(255, 255, 255, 0.92)',
  },
  '& .MuiInputBase-input::placeholder': {
    color: 'rgba(255, 255, 255, 0.58)',
    opacity: 1,
  },
  '& .MuiInputLabel-root': {
    color: 'rgba(255, 255, 255, 0.72)',
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: '#67E8F9',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(103, 232, 249, 0.55)',
  },
  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: '#67E8F9',
    borderWidth: 1.5,
  },
  '& .MuiSelect-icon, & .MuiAutocomplete-popupIndicator, & .MuiAutocomplete-clearIndicator': {
    color: 'rgba(255, 255, 255, 0.78)',
  },
  '& .MuiInputAdornment-root .MuiIconButton-root': {
    color: 'rgba(255, 255, 255, 0.82)',
  },
  '& .MuiTable-root': {
    background: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.18)',
  },
  '& .MuiTableHead-root .MuiTableRow-root': {
    background: 'rgba(255, 255, 255, 0.055)',
  },
  '& .MuiTableBody-root .MuiTableRow-root': {
    background: 'rgba(255, 255, 255, 0.022)',
  },
  '& .MuiTableBody-root .MuiTableRow-root:hover': {
    background: 'rgba(255, 255, 255, 0.055)',
  },
  '& .MuiTableCell-root': {
    color: 'rgba(255, 255, 255, 0.88)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
  },
  '& .MuiTableHead-root .MuiTableCell-root': {
    color: 'rgba(255, 255, 255, 0.94)',
    fontWeight: 700,
  },
  '& .MuiTablePagination-root': {
    color: 'rgba(255, 255, 255, 0.96)',
  },
  '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
    color: 'rgba(255, 255, 255, 0.92)',
    fontWeight: 600,
  },
  '& .MuiTablePagination-select, & .MuiTablePagination-selectIcon': {
    color: 'rgba(255, 255, 255, 0.96)',
  },
  '& .MuiTablePagination-actions .MuiIconButton-root': {
    color: 'rgba(255, 255, 255, 0.96)',
  },
  '& .MuiTablePagination-actions .MuiIconButton-root.Mui-disabled': {
    color: 'rgba(255, 255, 255, 0.32)',
  },
  '& .MuiIconButton-colorPrimary': {
    color: '#60A5FA',
  },
  '& .MuiButton-outlined': {
    color: '#93C5FD',
    borderColor: 'rgba(96, 165, 250, 0.46)',
  },
  '& .MuiButton-outlined:hover': {
    borderColor: '#60A5FA',
    background: 'rgba(96, 165, 250, 0.10)',
  },
  '& .MuiCircularProgress-root': {
    color: '#67E8F9',
  },
}

const craftDialogSlotProps = {
  backdrop: {
    sx: {
      backgroundColor: 'rgba(2, 6, 23, 0.62)',
      backdropFilter: 'blur(5px)',
      WebkitBackdropFilter: 'blur(5px)',
    },
  },
  paper: {
    sx: {
      borderRadius: '18px',
      background:
        'linear-gradient(145deg, rgba(10, 27, 61, 0.97) 0%, rgba(8, 45, 78, 0.95) 100%)',
      backdropFilter: 'blur(28px) saturate(125%)',
      WebkitBackdropFilter: 'blur(28px) saturate(125%)',
      border: '1px solid rgba(148, 197, 255, 0.16)',
      boxShadow: '0 28px 72px rgba(2, 6, 23, 0.46)',
      color: 'rgba(255, 255, 255, 0.92)',
      backgroundImage: 'none',
      overflow: 'hidden',
      '& input[type="date"], & input[type="datetime-local"]': {
        colorScheme: 'dark',
      },

      '& .MuiDialogTitle-root': {
        color: 'rgba(255, 255, 255, 0.96)',
        fontWeight: 800,
        px: 3,
        pt: 2.5,
        pb: 1.2,
      },
      '& .MuiDialogContent-root': {
        color: 'rgba(255, 255, 255, 0.88)',
      },
      '& .MuiTypography-root': {
        color: 'rgba(255, 255, 255, 0.88)',
      },
      '& strong': {
        color: 'rgba(255, 255, 255, 0.96)',
      },
      '& .MuiOutlinedInput-root': {
        borderRadius: '14px',
        background: 'rgba(255, 255, 255, 0.07)',
        color: 'rgba(255, 255, 255, 0.92)',

        '&:hover': {
          background: 'rgba(255, 255, 255, 0.09)',
        },
        '&:hover .MuiOutlinedInput-notchedOutline': {
          borderColor: 'rgba(103, 232, 249, 0.55)',
        },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
          borderColor: '#67E8F9',
          borderWidth: 1.5,
        },
      },
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: 'rgba(203, 213, 225, 0.22)',
      },
      '& .MuiInputBase-input': {
        color: 'rgba(255, 255, 255, 0.92)',
        WebkitTextFillColor: 'rgba(255, 255, 255, 0.92)',
      },
      '& .MuiInputBase-input.Mui-disabled': {
        WebkitTextFillColor: 'rgba(255, 255, 255, 0.48)',
      },
      '& .MuiInputBase-input::placeholder': {
        color: 'rgba(255, 255, 255, 0.56)',
        opacity: 1,
      },
      '& .MuiInputLabel-root': {
        color: 'rgba(226, 232, 240, 0.72)',
      },
      '& .MuiInputLabel-root.Mui-focused': {
        color: '#67E8F9',
      },
      '& .MuiSelect-icon, & .MuiAutocomplete-popupIndicator, & .MuiAutocomplete-clearIndicator': {
        color: 'rgba(255, 255, 255, 0.78)',
      },
      '& .MuiInputAdornment-root .MuiIconButton-root': {
        color: 'rgba(255, 255, 255, 0.82)',
      },
      '& input[type="date"]': {
        colorScheme: 'dark',
      },
      '& input[type="number"]': {
        colorScheme: 'dark',
      },
      '& input[type="number"]::-webkit-inner-spin-button, & input[type="number"]::-webkit-outer-spin-button': {
        opacity: 0.88,
        cursor: 'pointer',
      },
      '& .MuiDialogContent-root .MuiPaper-root:not(.MuiAlert-root)': {
        background: 'rgba(255, 255, 255, 0.045) !important',
        border: '1px solid rgba(255, 255, 255, 0.14) !important',
        boxShadow: 'none !important',
        color: 'rgba(255, 255, 255, 0.92)',
        backgroundImage: 'none !important',
      },
      '& .MuiTable-root': {
        background: 'transparent',
        border: '1px solid rgba(255, 255, 255, 0.18)',
      },
      '& .MuiTableHead-root .MuiTableRow-root': {
        background: 'rgba(255, 255, 255, 0.055)',
      },
      '& .MuiTableBody-root .MuiTableRow-root': {
        background: 'rgba(255, 255, 255, 0.022)',
      },
      '& .MuiTableBody-root .MuiTableRow-root:hover': {
        background: 'rgba(255, 255, 255, 0.055)',
      },
      '& .MuiTableCell-root': {
        color: 'rgba(255, 255, 255, 0.88)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
      },
      '& .MuiTableHead-root .MuiTableCell-root': {
        color: 'rgba(255, 255, 255, 0.94)',
        fontWeight: 700,
      },
      '& .MuiButton-outlined': {
        color: '#93C5FD',
        borderColor: 'rgba(96, 165, 250, 0.46)',
      },
      '& .MuiButton-outlined:hover': {
        borderColor: '#60A5FA',
        background: 'rgba(96, 165, 250, 0.10)',
      },
      '& .MuiButton-text': {
        color: '#CBD5E1',
      },
      '& .MuiButton-text.MuiButton-colorError': {
        color: '#FCA5A5',
      },
      '& .MuiCircularProgress-root': {
        color: '#67E8F9',
      },
    },
  },
}

const craftErrorAlertSx = {
  background: 'rgb(92 18 18 / 50%) !important',
  backgroundColor: 'rgb(92 18 18 / 50%) !important',
  color: '#FEE2E2 !important',
  border: '1px solid rgba(248, 113, 113, 0.58)',
  borderRadius: '14px',
  '& .MuiAlert-icon': {
    color: '#FCA5A5',
  },
  '& .MuiAlert-message': {
    color: '#FEE2E2',
    fontWeight: 700,
  },
}

export function DelegatesPage() {
  const notify = useNotifications()
  const navigate = useNavigate()
  const [delegates, setDelegates] = useState<DelegateRecord[]>([])
  const [form, setForm] = useState<DelegateForm>(emptyForm)
  const [formOpen, setFormOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [delegateToDelete, setDelegateToDelete] = useState<DelegateRecord | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null)
  const [paymentDeleteError, setPaymentDeleteError] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [selectedDelegate, setSelectedDelegate] = useState<DelegateRecord | null>(null)
  const [delegateDetailsOpen, setDelegateDetailsOpen] = useState(false)
  const [delegateInvoices, setDelegateInvoices] = useState<
    Array<{
      id: string
      invoiceNumber: string
      date: string
      commissionPercentage: number
      commissionAmount: number
      notes?: string
    }>
  >([])
  const [delegatePayments, setDelegatePayments] = useState<DelegatePayment[]>([])
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [delegatePaymentsLoading, setDelegatePaymentsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState('')
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [paymentForm, setPaymentForm] = useState({ date: '', amount: '', paymentMethod: '', notes: '' })

  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')
  const [quickFilter, setQuickFilter] = useState('')

  const handleQuickFilterChange = (filterType: string) => {
    setQuickFilter(filterType)
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()

    if (filterType === 'current_month') {
      const start = new Date(year, month, 1)
      const end = new Date(year, month + 1, 0)
      const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`
      const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
      setStartDateFilter(startStr)
      setEndDateFilter(endStr)
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

  const currentPayments = useMemo(() => {
    return delegatePayments
  }, [delegatePayments])

  const { ledgerEntries, totalCredit, totalDebit, remainingBalance } = useMemo(() => {
    const allInvoices: LedgerEntry[] = delegateInvoices.map((inv) => ({
      id: `inv-${inv.id}`,
      type: 'invoice',
      debit: 0,
      credit: inv.commissionAmount,
      paymentMethod: '',
      invoiceNumber: inv.invoiceNumber,
      commissionPercentage: `${inv.commissionPercentage}%`,
      notes: inv.notes || '',
      date: inv.date,
    }))

    const allPayments: LedgerEntry[] = currentPayments.map((p) => ({
      id: `pay-${p.id}`,
      type: 'payment',
      debit: p.amount,
      credit: 0,
      paymentMethod: p.paymentMethod || '',
      invoiceNumber: '',
      commissionPercentage: '',
      notes: p.notes || '',
      date: p.date,
      paymentId: p.id,
    }))

    const all = [...allInvoices, ...allPayments].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    )

    let carryOverBalance = 0
    let filteredEntries = all

    if (startDateFilter) {
      const startMs = new Date(startDateFilter).getTime()

      const priorEntries = all.filter((entry) => new Date(entry.date).getTime() < startMs)
      carryOverBalance = priorEntries.reduce((sum, item) => sum + (item.credit - item.debit), 0)

      filteredEntries = all.filter((entry) => {
        const entryMs = new Date(entry.date).getTime()
        if (endDateFilter) {
          const endMs = new Date(endDateFilter).getTime() + (24 * 60 * 60 * 1000 - 1)
          return entryMs >= startMs && entryMs <= endMs
        }
        return entryMs >= startMs
      })
    } else if (endDateFilter) {
      const endMs = new Date(endDateFilter).getTime() + (24 * 60 * 60 * 1000 - 1)
      filteredEntries = all.filter((entry) => new Date(entry.date).getTime() <= endMs)
    }

    const finalEntries = [...filteredEntries]

    if (startDateFilter) {
      const prevDateStr = getPreviousDayDateString(startDateFilter)
      const safeCarryOver = Number(carryOverBalance) || 0

      const carryOverDebit = safeCarryOver < 0 ? Math.abs(safeCarryOver) : 0
      const carryOverCredit = safeCarryOver > 0 ? safeCarryOver : 0

      finalEntries.unshift({
        id: 'carried-forward-balance',
        type: 'invoice',
        debit: carryOverDebit,
        credit: carryOverCredit,
        paymentMethod: '',
        invoiceNumber: '',
        commissionPercentage: '',
        notes: 'رصيد مدور',
        date: prevDateStr,
      })
    }

    const calcCredit = finalEntries.reduce((sum, inv) => sum + inv.credit, 0)
    const calcDebit = finalEntries.reduce((sum, p) => sum + p.debit, 0)

    return {
      ledgerEntries: finalEntries,
      totalCredit: calcCredit,
      totalDebit: calcDebit,
      remainingBalance: calcCredit - calcDebit,
    }
  }, [delegateInvoices, currentPayments, startDateFilter, endDateFilter])

  const handleExportDelegatePdf = useCallback(async () => {
    if (!selectedDelegate) return
    const settings = await loadCompanyPrintSettings()

    navigate('/invoice-preview', {
      state: {
        invoiceData: {
          printKind: 'delegate-statement',
          documentType: 'production',
          title: 'تقرير المندوب',
          documentNumber: selectedDelegate.code,
          date: getLocalDateTimeString(),
          partyLabel: 'المندوب',
          partyName: selectedDelegate.name,
          items: [],
          subtotal: totalCredit,
          discount: 0,
          total: totalCredit,
          delegateCode: selectedDelegate.code,
          delegateName: selectedDelegate.name,
          delegatePhone: selectedDelegate.phone ?? '',
          delegateAddress: selectedDelegate.address ?? '',
          paymentMethod: loadSettings().paymentMethods.join('، '),
          relatedInvoices: delegateInvoices,
          delegatePayments: currentPayments,
          totalCommission: totalCredit,
          totalPaid: totalDebit,
          remainingBalance: remainingBalance,
          startDate: startDateFilter,
          endDate: endDateFilter,
        },
        settings,
      },
    })
  }, [
    currentPayments,
    delegateInvoices,
    navigate,
    remainingBalance,
    selectedDelegate,
    totalCredit,
    totalDebit,
    startDateFilter,
    endDateFilter,
  ])

  const loadDelegates = useCallback(async () => {
    try {
      setDelegates(await delegatesService.list())
    } catch (error) {
      setFormError(getUserFriendlyErrorMessage(error, 'تعذر تحميل بيانات المندوبين.'))
    }
  }, [])

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadDelegates()
    }, 0)
    return () => window.clearTimeout(timerId)
  }, [loadDelegates])

  const loadDelegatePayments = useCallback(async (delegateId: string) => {
    setDelegatePaymentsLoading(true)
    try {
      const payments = await delegatesService.getPayments(delegateId)
      setDelegatePayments(payments)
      return payments
    } finally {
      setDelegatePaymentsLoading(false)
    }
  }, [])

  const openDelegateDetails = useCallback(async (delegate: DelegateRecord) => {
    setSelectedDelegate(delegate)
    setDelegateDetailsOpen(true)
    setDetailsLoading(true)
    setDetailsError('')
    setPaymentError('')
    setDelegatePayments([])
    setStartDateFilter('')
    setEndDateFilter('')
    setQuickFilter('')

    try {
      const [invoices, payments] = await Promise.all([
        salesService.listInvoices({}),
        loadDelegatePayments(delegate.id),
      ])
      setDelegatePayments(payments)
      const related = await Promise.all(
        invoices.map(async (invoice) => {
          try {
            const details = await salesService.getInvoiceById(invoice.id)
            const delegateInfo = details.delegates?.find((item) => item.delegateId === delegate.id)
            if (!delegateInfo) {
              return null
            }

            const commissionAmount = Number(
              ((details.netTotal * Number(delegateInfo.commissionPercentage ?? 0)) / 100).toFixed(2),
            )
            return {
              id: details.id,
              invoiceNumber: details.invoiceNumber,
              date: details.date,
              commissionPercentage: Number(delegateInfo.commissionPercentage ?? 0),
              commissionAmount,
              notes: delegateInfo.notes ?? '',
            }
          } catch (error) {
            console.error('LOAD DELEGATE INVOICE DETAILS FAILED', error)
            return null
          }
        }),
      )

      setDelegateInvoices(
        related.filter(Boolean) as Array<{
          id: string
          invoiceNumber: string
          date: string
          commissionPercentage: number
          commissionAmount: number
          notes?: string
        }>,
      )
    } catch (error) {
      console.error('OPEN DELEGATE DETAILS FAILED', error)
      setDetailsError(getUserFriendlyErrorMessage(error, 'تعذر تحميل تفاصيل المندوب.'))
    } finally {
      setDetailsLoading(false)
    }
  }, [loadDelegatePayments])

  const closeDelegateDetails = useCallback(() => {
    setDelegateDetailsOpen(false)
    setSelectedDelegate(null)
    setDelegatePayments([])
    setDetailsError('')
    setPaymentDialogOpen(false)
    setPaymentError('')
    setPaymentForm({ date: '', amount: '', paymentMethod: '', notes: '' })
    setStartDateFilter('')
    setEndDateFilter('')
    setQuickFilter('')
  }, [])

  const saveDelegatePayment = useCallback(async () => {
    if (!selectedDelegate) {
      return
    }

    const amount = Number(paymentForm.amount)
    if (!paymentForm.date) {
      setPaymentError('تاريخ الدفعة مطلوب.')
      return
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError('مبلغ الدفعة يجب أن يكون أكبر من صفر.')
      return
    }
    if (!paymentForm.paymentMethod) {
      setPaymentError('طريقة الدفع مطلوبة.')
      return
    }

    try {
      setPaymentError('')
      await delegatesService.createPayment({
        delegateId: selectedDelegate.id,
        date: toInternalDate(paymentForm.date) || paymentForm.date,
        amount,
        paymentMethod: paymentForm.paymentMethod,
        notes: paymentForm.notes.trim(),
      })
      await loadDelegatePayments(selectedDelegate.id)
      setPaymentDialogOpen(false)
      setPaymentForm({ date: '', amount: '', paymentMethod: '', notes: '' })
      notify.success('تم تسديد الدفعة للمندوب بنجاح.')
    } catch (error) {
      console.error('SAVE DELEGATE PAYMENT FAILED', error)
      const message = getUserFriendlyErrorMessage(error, 'تعذر حفظ دفعة المندوب.')
      setPaymentError(message)
      notify.error(message)
    }
  }, [selectedDelegate, paymentForm, loadDelegatePayments, notify])

  const handleDeleteDelegatePayment = useCallback(async () => {
    if (!selectedDelegate || !paymentToDelete) return
    try {
      setPaymentDeleteError('')
      await delegatesService.deletePayment(paymentToDelete)
      await loadDelegatePayments(selectedDelegate.id)
      setPaymentToDelete(null)
      notify.success('تم حذف الدفعة بنجاح.')
    } catch (error) {
      console.error('DELETE DELEGATE PAYMENT FAILED', error)
      const message = getUserFriendlyErrorMessage(error, 'تعذر حذف دفعة المندوب.')
      setPaymentDeleteError(message)
      notify.error(message)
    }
  }, [selectedDelegate, paymentToDelete, loadDelegatePayments, notify])

  const saveDelegate = useCallback(async () => {
    const code = form.code.trim()
    const name = form.name.trim()
    if (!code || !name) {
      setFormError('رقم المندوب واسم المندوب مطلوبان.')
      return
    }

    const duplicate = delegates.find((d) => d.id !== form.id && d.code.trim() === code)
    if (duplicate) {
      setFormError('رقم المندوب مستخدم مسبقاً.')
      return
    }

    if (form.id && form.status === 'inactive') {
      try {
        const invoices = await salesService.listInvoices({})
        let hasInvoicesUsage = false

        for (const invoice of invoices) {
          const details = await salesService.getInvoiceById(invoice.id)
          if ((details.delegates ?? []).some((item) => item.delegateId === form.id)) {
            hasInvoicesUsage = true
            break
          }
        }

        if (hasInvoicesUsage) {
          setFormError('لا يمكن تحويل حالة المندوب إلى غير فعال لأنه مستخدم في فواتير مبيعات مسجلة.')
          return
        }
      } catch (error) {
        console.error('CHECK DELEGATE USAGE FAILED', error)
        setFormError(getUserFriendlyErrorMessage(error, 'تعذر التحقق من استخدام المندوب في الفواتير.'))
        return
      }
    }

    try {
      setFormError('')
      if (form.id) {
        await delegatesService.update(form.id, {
          ...form,
          code,
          name,
          phone: form.phone,
          address: form.address,
          notes: form.notes,
          status: form.status,
        })
        notify.info('تم تعديل بيانات المندوب بنجاح.')
      } else {
        await delegatesService.create({
          code,
          name,
          phone: form.phone,
          address: form.address,
          notes: form.notes,
          status: form.status,
        })
        notify.success('تمت إضافة المندوب بنجاح.')
      }
      setFormOpen(false)
      setForm(emptyForm)
      await loadDelegates()
    } catch (error) {
      console.error('SAVE DELEGATE FAILED', error)
      setFormError(getUserFriendlyErrorMessage(error, 'تعذر حفظ بيانات المندوب.'))
    }
  }, [form, delegates, loadDelegates, notify])

  const handleDeleteDelegate = useCallback(async () => {
    if (!delegateToDelete) return
    try {
      setDeleteError('')
      await delegatesService.delete(delegateToDelete.id)
      setDelegateToDelete(null)
      await loadDelegates()
      notify.error('تم حذف المندوب بنجاح.')
    } catch (error) {
      console.error('DELETE DELEGATE FAILED', error)
      setDeleteError(
        getUserFriendlyErrorMessage(error, 'تعذر حذف المندوب. قد يكون مرتبطاً بفواتير أو عمليات أخرى.'),
      )
    }
  }, [delegateToDelete, loadDelegates, notify])

  return (
    <Box sx={craftPageGlassSx}>
      <PageHeader title="المناديب" breadcrumb="إدارة المندوبين وتفاصيل العمولات" />

      <SectionCard
        title="قائمة المندوبين"
        actions={
          <Button
            variant="contained"
            startIcon={<FiPlus />}
            onClick={() => {
              setForm(emptyForm)
              setFormError('')
              setFormOpen(true)
            }}
          >
            إضافة مندوب
          </Button>
        }
      >
        <Box sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow sx={{ background: 'rgba(255, 255, 255, 0.055)', textAlignLast: 'center' }}>
                <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>رقم المندوب</TableCell>
                <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>اسم المندوب</TableCell>
                <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الهاتف</TableCell>
                <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>العنوان</TableCell>
                <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الحالة</TableCell>
                <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {delegates
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((delegate) => (
                  <TableRow key={delegate.id} sx={{ textAlignLast: 'center' }}>
                    <TableCell sx={{ textAlign: 'center' }}>{delegate.code}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{delegate.name}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{delegate.phone || ''}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{delegate.address || ''}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      {delegate.status === 'active' ? 'فعال' : 'غير فعال'}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <Tooltip title="عرض">
                          <IconButton
                            size="small"
                            color="secondary"
                            onClick={() => void openDelegateDetails(delegate)}
                          >
                            <FiEye />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="تعديل">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => {
                              setForm({
                                id: delegate.id,
                                code: delegate.code,
                                name: delegate.name,
                                phone: delegate.phone ?? '',
                                address: delegate.address ?? '',
                                notes: delegate.notes ?? '',
                                status: delegate.status ?? 'active',
                              })
                              setFormError('')
                              setFormOpen(true)
                            }}
                          >
                            <FiEdit2 />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="حذف">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setDeleteError('')
                              setDelegateToDelete(delegate)
                            }}
                          >
                            <FiTrash2 />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <TablePagination
            component="div"
            count={delegates.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(Number(event.target.value))
              setPage(0)
            }}
          />
        </Box>
      </SectionCard>

      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={craftDialogSlotProps}
      >
        <DialogTitle>{form.id ? 'تعديل بيانات مندوب' : 'إضافة مندوب جديد'}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '12px !important' }}>
          {formError ? <Alert severity="error" sx={craftErrorAlertSx}>{formError}</Alert> : null}
          <TextField
            label="رقم المندوب"
            value={form.code}
            onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
            required
          />
          <TextField
            label="اسم المندوب"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
          <TextField
            label="الهاتف"
            value={form.phone}
            onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
          />
          <TextField
            label="العنوان"
            value={form.address}
            onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
          />
          <TextField
            label="الملاحظات"
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            multiline
            minRows={2}
          />
          <TextField
            select
            label="الحالة"
            value={form.status}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, status: event.target.value as 'active' | 'inactive' }))
            }
            slotProps={darkSelectSlotProps}
          >
            <MenuItem value="active">فعال</MenuItem>
            <MenuItem value="inactive">غير فعال</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={() => void saveDelegate()}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(delegateToDelete)}
        onClose={() => {
          setDelegateToDelete(null)
          setDeleteError('')
        }}
        maxWidth="sm"
        fullWidth
        slotProps={craftDialogSlotProps}
      >
        <DialogTitle>تأكيد حذف المندوب</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {deleteError ? <Alert severity="error" sx={craftErrorAlertSx}>{deleteError}</Alert> : null}
          <Typography>
            {delegateToDelete
              ? `هل أنت متأكد من حذف المندوب «${delegateToDelete.name}» رقم ${delegateToDelete.code}؟ لا يمكن التراجع عن هذا الإجراء.`
              : ''}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDelegateToDelete(null)
              setDeleteError('')
            }}
          >
            تراجع
          </Button>
          <Button variant="contained" color="error" onClick={() => void handleDeleteDelegate()}>
            حذف
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(paymentToDelete)}
        onClose={() => {
          setPaymentToDelete(null)
          setPaymentDeleteError('')
        }}
        maxWidth="sm"
        fullWidth
        slotProps={craftDialogSlotProps}
      >
        <DialogTitle>تأكيد حذف الدفعة</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {paymentDeleteError ? <Alert severity="error" sx={craftErrorAlertSx}>{paymentDeleteError}</Alert> : null}
          <Typography>
            هل أنت متأكد من حذف هذه الدفعة؟ لا يمكن التراجع عن هذا الإجراء.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setPaymentToDelete(null)
              setPaymentDeleteError('')
            }}
          >
            تراجع
          </Button>
          <Button variant="contained" color="error" onClick={() => void handleDeleteDelegatePayment()}>
            حذف
          </Button>
        </DialogActions>
      </Dialog>

      {/* نافذة عرض تفاصيل المندوب */}
      <Dialog
        open={delegateDetailsOpen}
        onClose={closeDelegateDetails}
        fullWidth
        maxWidth="lg"
        slotProps={craftDialogSlotProps}
      >
        <DialogTitle>تفاصيل المندوب</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '12px !important' }}>
          {detailsError ? <Alert severity="error" sx={craftErrorAlertSx}>{detailsError}</Alert> : null}
          {detailsLoading || !selectedDelegate ? (
            <Box sx={{ display: 'grid', placeItems: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gap: 2 }}>
              <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
                <Box>
                  رقم المندوب: <strong>{selectedDelegate.code}</strong>
                </Box>
                <Box>
                  اسم المندوب: <strong>{selectedDelegate.name}</strong>
                </Box>
                <Box>
                  الهاتف: <strong>{selectedDelegate.phone || ''}</strong>
                </Box>
                <Box>
                  العنوان: <strong>{selectedDelegate.address || ''}</strong>
                </Box>
                <Box>
                  الحالة: <strong>{selectedDelegate.status === 'active' ? 'فعال' : 'غير فعال'}</strong>
                </Box>
              </Box>

              {/* شريط فلترة التواريخ مع قائمة الفلترة السريعة */}
              <Box
                sx={{
                  display: 'flex',
                  gap: 2,
                  alignItems: 'center',
                  background: 'rgba(255, 255, 255, 0.04)',
                  p: 1.5,
                  borderRadius: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <TextField
                  select
                  label="فلترة سريعة"
                  size="small"
                  value={quickFilter}
                  onChange={(e) => handleQuickFilterChange(e.target.value)}
                  sx={{ minWidth: 140 }}
                  slotProps={darkSelectSlotProps}
                >
                  <MenuItem value="">مخصص</MenuItem>
                  <MenuItem value="current_month">الشهر الحالي</MenuItem>
                  <MenuItem value="current_year">العام الحالي</MenuItem>
                  <MenuItem value="last_year">العام الماضي</MenuItem>
                </TextField>

                <TextField
                  label="من تاريخ"
                  type="date"
                  size="small"
                  value={startDateFilter}
                  onChange={(e) => {
                    setStartDateFilter(e.target.value)
                    setQuickFilter('')
                  }}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  label="إلى تاريخ"
                  type="date"
                  size="small"
                  value={endDateFilter}
                  onChange={(e) => {
                    setEndDateFilter(e.target.value)
                    setQuickFilter('')
                  }}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                {(startDateFilter || endDateFilter || quickFilter) && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setStartDateFilter('')
                      setEndDateFilter('')
                      setQuickFilter('')
                    }}
                  >
                    إعادة ضبط
                  </Button>
                )}
              </Box>

              {ledgerEntries.length === 0 ? (
                <Typography sx={{ color: 'rgba(255, 255, 255, 0.88)' }}>
                  لا توجد حركات مسجلة لهذا المندوب في الفترة المحددة.
                </Typography>
              ) : (
                <Table sx={{ width: '100%' }}>
                  <TableHead>
                    <TableRow sx={{ background: 'rgba(255, 255, 255, 0.055)', textAlignLast: 'center' }}>
                      <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>مدين</TableCell>
                      <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>دائن</TableCell>
                      <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>طريقة الدفع</TableCell>
                      <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>رقم الفاتورة</TableCell>
                      <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>نسبة العمولة</TableCell>
                      <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الملاحظات</TableCell>
                      <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>التاريخ</TableCell>
                      <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الإجراءات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ledgerEntries.map((entry) => (
                      <TableRow key={entry.id} sx={{ textAlignLast: 'center' }}>
                        <TableCell sx={{ textAlign: 'center' }}>
                          {entry.debit > 0 ? priceNum(entry.debit) : ''}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          {entry.id === 'carried-forward-balance' && entry.debit === 0 && entry.credit === 0
                            ? priceNum(0)
                            : entry.credit > 0
                              ? priceNum(entry.credit)
                              : ''}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>{entry.paymentMethod}</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>{entry.invoiceNumber}</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>{entry.commissionPercentage}</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>{entry.notes}</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>{formatDateDMY(entry.date)}</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          {entry.type === 'payment' && entry.paymentId ? (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                setPaymentDeleteError('')
                                setPaymentToDelete(entry.paymentId!)
                              }}
                            >
                              <FiTrash2 />
                            </IconButton>
                          ) : (
                            ''
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              <Table sx={{ width: '100%', minWidth: 620, '& td, & th': { textAlign: 'center' } }}>
                <TableHead>
                  <TableRow sx={{ background: 'rgba(255, 255, 255, 0.055)', textAlignLast: 'center' }}>
                    <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الإجمالي</TableCell>
                    <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>المدفوع</TableCell>
                    <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الرصيد</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow sx={{ textAlignLast: 'center' }}>
                    <TableCell sx={{ textAlign: 'center' }}>{currency(totalCredit)}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{currency(totalDebit)}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{currency(remainingBalance)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            startIcon={<FiCheckCircle />}
            disabled={delegatePaymentsLoading}
            onClick={() => {
              setPaymentError('')
              setPaymentForm({
                date: getLocalDateYMD(),
                amount: remainingBalance > 0 ? String(remainingBalance) : '',
                paymentMethod: loadSettings().paymentMethods[0] ?? '',
                notes: '',
              })
              setPaymentDialogOpen(true)
            }}
            sx={{
              background: '#66bb6a',
              '&:hover': { background: '#66bb6a' },
              '&.Mui-disabled': {
                backgroundColor: '#66bb6a',
                color: 'rgba(255, 255, 255, 0.72)',
                opacity: 0.55,
                cursor: 'not-allowed',
                pointerEvents: 'auto',
              },
            }}
          >
            تسديد دفعة
          </Button>
          <Button variant="contained" onClick={handleExportDelegatePdf}>
            تصدير PDF
          </Button>
          <Button onClick={closeDelegateDetails}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={craftDialogSlotProps}
      >
        <DialogTitle>تسديد دفعة</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '12px !important' }}>
          {paymentError ? <Alert severity="error" sx={craftErrorAlertSx}>{paymentError}</Alert> : null}
          <TextField
            label="التاريخ"
            type="date"
            value={paymentForm.date}
            onChange={(event) => setPaymentForm((prev) => ({ ...prev, date: event.target.value }))}
            slotProps={{
              inputLabel: { shrink: true },
            }}
            required
          />
          <TextField
            select
            label="طريقة الدفع"
            value={paymentForm.paymentMethod}
            onChange={(event) => setPaymentForm((prev) => ({ ...prev, paymentMethod: event.target.value }))}
            slotProps={darkSelectSlotProps}
            required
          >
            {loadSettings().paymentMethods.map((method) => (
              <MenuItem key={method} value={method}>{method}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="المبلغ"
            type="number"
            value={paymentForm.amount}
            onChange={(event) => {
              const value = event.target.value
              setPaymentForm((prev) => ({ ...prev, amount: value }))
              if (paymentError) {
                setPaymentError('')
              }
            }}
            slotProps={{ htmlInput: { min: 0, step: 1 } }}
            required
          />
          <TextField
            label="الملاحظات"
            value={paymentForm.notes}
            onChange={(event) => setPaymentForm((prev) => ({ ...prev, notes: event.target.value }))}
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" startIcon={<FiCheckCircle />} onClick={saveDelegatePayment}>
            حفظ الدفعة
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}