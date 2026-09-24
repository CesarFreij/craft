import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
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
import { FiCalendar, FiCheckCircle, FiEdit2, FiEye, FiPlus, FiTrash2 } from 'react-icons/fi'
import { PageHeader } from '../components/ui/PageHeader'
import { SearchField } from '../components/ui/SearchField'
import { SectionCard } from '../components/ui/SectionCard'
import { inventoryService, type StockBalanceRecord, type WarehouseRecord } from '../services/inventoryService'
import { materialsService, type MaterialRecord } from '../services/materialsService'
import { loadCompanyPrintSettings } from '../services/companyPrintSettingsService'
import {
  customersService,
  delegatesService,
  salesService,
  type CustomerRecord,
  type DelegateRecord,
  type DiscountType,
  type PaymentStatus,
  type SalesInvoiceDetails,
  type SalesInvoiceListItem,
  type SalesInvoiceStatus,
} from '../services/purchasesService'
import type { InvoicePrintData } from '../types/invoicePrint'
import { useLocation, useNavigate } from 'react-router-dom'
import { loadSettings } from '../services/settingsService'
import { getUserFriendlyErrorMessage } from '../utils/errorMessages'
import { formatCurrencyValue, formatDateDMY, getLocalDateTimeString, formatNumberBySettings, toInternalDate } from '../utils/displayFormatting'
import { useNotifications } from '../contexts/useNotifications'

function getLocalTodayISO(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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
  return getLocalTodayISOFromDate(d)
}

function getLocalTodayISOFromDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
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
      slotProps: {
        paper: {
          sx: darkPopupPaperSx,
        },
      },
    },
  },
}

const craftPageGlassSx = {
  '& input[type="date"], & input[type="datetime-local"]': {
    colorScheme: 'dark',
  },
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
  '& .MuiButton-text': {
    color: '#CBD5E1',
  },
  '& .MuiButton-text.MuiButton-colorError': {
    color: '#FCA5A5',
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

const craftInvoiceDialogSlotProps = craftDialogSlotProps

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

type SaleLine = {
  key: string
  materialId: string
  unit: string
  quantity: number | ''
  unitPrice: number | ''
  notes: string
}

type InvoicePrintDataWithDiscount = InvoicePrintData & {
  discountType?: DiscountType
  discountValue?: number
}

type CustomerForm = {
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
  type: 'invoice' | 'payment' | 'return'
  paymentId?: string
  paymentSource?: 'invoice' | 'account' | 'return'
  debit: number
  credit: number
  paymentMethod: string
  invoiceNumber: string
  notes: string
  date: string
}

type StatementReturn = {
  id: string
  returnNumber: string
  date: string
  amount: number
  notes?: string
  payments: Array<{ id: string; date: string; amount: number; paymentMethod?: string; notes?: string }>
}

function createEmptyCustomerForm(): CustomerForm {
  return { code: '', name: '', phone: '', address: '', notes: '', status: 'active' }
}

type InvoiceDelegateForm = {
  delegateId: string
  commissionPercentage: number | ''
  notes: string
}

type InvoicePaymentForm = {
  key: string
  amount: number | ''
  paymentMethod: string
  notes: string
}

const paymentStatusLabel: Record<PaymentStatus, string> = {
  unpaid: 'غير مدفوع',
  partial: 'مدفوع جزئياً',
  paid: 'مدفوع بالكامل',
}

function currency(value: number): string {
  return formatCurrencyValue(value, 'price')
}

function priceSym(value: number): string {
  return formatCurrencyValue(value, 'price')
}

function priceNum(value: number | undefined): string {
  return formatNumberBySettings(Number(value ?? 0), 'price')
}

function formatDiscountPercentage(value: number | ''): string {
  const numericValue = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return `${numericValue}%`
}

function DateFilterField({ label, value, onChange, required = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  const [focused, setFocused] = useState(false)
  const nativeDateInputRef = useRef<HTMLInputElement>(null)
  const shrink = Boolean(value) || focused

  const openDatePicker = () => {
    const input = nativeDateInputRef.current
    if (!input) return
    if (typeof input.showPicker === 'function') {
      input.showPicker()
    } else {
      input.focus()
    }
  }

  return (
    <Box sx={{ position: 'relative' }}>
      <TextField
        label={label}
        type="text"
        fullWidth
        required={required}
        value={value ? formatDateDMY(value) : ''}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onClick={openDatePicker}
        placeholder="DD/MM/YYYY"
        slotProps={{ 
          htmlInput: { 
            inputMode: 'numeric',
            pattern: '[0-9\\/]*',
          },
          inputLabel: {
            shrink,
            sx: {
              '&:not(.MuiInputLabel-shrink)': {
                transform: 'translate(46px, 16px) scale(1)',
              },
            },
          },
          input: {
            startAdornment: (
              <InputAdornment position="start" sx={{ marginInlineEnd: 1 }}>
                <IconButton size="small" onClick={openDatePicker} edge="start" aria-label="اختيار التاريخ" sx={{ color: '#E2E8F0', background: 'transparent', '&:hover': { color: '#67E8F9', background: 'transparent' } }}>
                  <FiCalendar />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />
      <input
        ref={nativeDateInputRef}
        type="date"
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 0,
          height: 0,
          opacity: 0,
          pointerEvents: 'none',
          colorScheme: 'dark',
        }}
        tabIndex={-1}
        aria-hidden="true"
      />
    </Box>
  )
}

function flattenSellableMaterials(nodes: MaterialRecord[]): MaterialRecord[] {
  const result: MaterialRecord[] = []
  const walk = (items: MaterialRecord[]) => {
    for (const item of items) {
      if (item.type === 'sub' && !item.isNonStock && (item.status ?? 'active') !== 'deleted') {
        result.push(item)
      }
      if (item.children?.length) {
        walk(item.children)
      }
    }
  }
  walk(nodes)
  return result
}

function createEmptyLine(): SaleLine {
  return {
    key: crypto.randomUUID(),
    materialId: '',
    unit: '',
    quantity: '',
    unitPrice: '',
    notes: '',
  }
}

export function SalesPage() {
  const notify = useNotifications()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [activeCustomers, setActiveCustomers] = useState<CustomerRecord[]>([])
  const [activeDelegates, setActiveDelegates] = useState<DelegateRecord[]>([])
  const [activeWarehouses, setActiveWarehouses] = useState<WarehouseRecord[]>([])
  const [warehouseBalances, setWarehouseBalances] = useState<StockBalanceRecord[]>([])
  const [warehouseBalancesLoading, setWarehouseBalancesLoading] = useState(false)
  const [materialOptions, setMaterialOptions] = useState<MaterialRecord[]>([])
  const [invoices, setInvoices] = useState<SalesInvoiceListItem[]>([])

  const location = useLocation()
  const isCustomersPage = location.pathname === '/customers'
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [customerFilter, setCustomerFilter] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('')

  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [customerPage, setCustomerPage] = useState(0)
  const [customerRowsPerPage, setCustomerRowsPerPage] = useState(10)

  const [customerFormOpen, setCustomerFormOpen] = useState(false)
  const [customerFormError, setCustomerFormError] = useState('')
  const [customerForm, setCustomerForm] = useState<CustomerForm>(createEmptyCustomerForm)
  const [customerToDelete, setCustomerToDelete] = useState<CustomerRecord | null>(null)
  const [customerDeleteError, setCustomerDeleteError] = useState('')
  
  // Statement Dialog States
  const [customerStatementOpen, setCustomerStatementOpen] = useState(false)
  const [statementLoading, setStatementLoading] = useState(false)
  const [customerStatementEntity, setCustomerStatementEntity] = useState<CustomerRecord | null>(null)
  const [customerStatementInvoices, setCustomerStatementInvoices] = useState<Array<{ id: string; invoiceNumber: string; date: string; amount: number; notes?: string }>>([])
  const [customerStatementPayments, setCustomerStatementPayments] = useState<Array<{ id: string; invoiceNumber?: string; date: string; amount: number; paymentMethod?: string; notes?: string; source?: 'invoice' | 'account' }>>([])
    const [customerStatementReturns, setCustomerStatementReturns] = useState<StatementReturn[]>([])
  const [statementPaymentDialogOpen, setStatementPaymentDialogOpen] = useState(false)
  const [statementPaymentError, setStatementPaymentError] = useState('')
  const [statementPaymentForm, setStatementPaymentForm] = useState({ date: '', amount: '', paymentMethod: '', notes: '' })
  const [paymentToDelete, setPaymentToDelete] = useState<{ paymentId: string; source: 'account' | 'invoice' | 'return'; date: string; amount: number } | null>(null)
  const [paymentDeleteError, setPaymentDeleteError] = useState('')
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')
  const [quickFilter, setQuickFilter] = useState('')

  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false)
  const [invoiceFormError, setInvoiceFormError] = useState('')
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null)
  const [editingInvoiceStatus, setEditingInvoiceStatus] = useState<SalesInvoiceStatus | null>(null)
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [invoiceCustomerId, setInvoiceCustomerId] = useState('')
  const [invoiceDelegates, setInvoiceDelegates] = useState<InvoiceDelegateForm[]>([])
  const [invoiceWarehouseId, setInvoiceWarehouseId] = useState('')
  const [discountType, setDiscountType] = useState<DiscountType>('none')
  const [discountValue, setDiscountValue] = useState<number | ''>(0)
  const [invoiceNotes, setInvoiceNotes] = useState('')
  const [invoiceLines, setInvoiceLines] = useState<SaleLine[]>([createEmptyLine()])
  const [materialWarehouseHintLineKey, setMaterialWarehouseHintLineKey] = useState<string | null>(null)
  const [materialPickerOpenKey, setMaterialPickerOpenKey] = useState<string | null>(null)
  const seedInvoiceDelegateRowRef = useRef(false)

  const [invoicePayments, setInvoicePayments] = useState<InvoicePaymentForm[]>([])
  const [directPaymentDialogOpen, setDirectPaymentDialogOpen] = useState(false)
  const [directPaymentForm, setDirectPaymentForm] = useState({ amount: '', paymentMethod: '', notes: '' })
  const [directPaymentError, setDirectPaymentError] = useState('')

  const navigate = useNavigate()

  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoiceDetails | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ type: 'deleteDraft' | 'deleteApprovedInvoice'; invoiceId: string; invoiceNumber: string } | null>(null)
  const [invoiceDeleteError, setInvoiceDeleteError] = useState('')
  const [paymentDeleteConfirm, setPaymentDeleteConfirm] = useState<{ paymentId: string; paymentDate: string; paymentAmount: number } | null>(null)
  const [paymentDeleteErrorState, setPaymentDeleteErrorState] = useState('')

  const invoiceDialogContentRef = useRef<HTMLDivElement | null>(null)

  const scrollInvoiceDialogToTop = useCallback(() => {
    const scrollToTop = () => {
      const content = invoiceDialogContentRef.current
      if (content) {
        content.scrollTop = 0
        content.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
        const dialogPaper = content.closest<HTMLElement>('.MuiDialog-paper')
        if (dialogPaper) {
          dialogPaper.scrollTop = 0
          dialogPaper.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
        }
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
    }
    window.requestAnimationFrame(() => {
      scrollToTop()
      window.requestAnimationFrame(scrollToTop)
    })
    window.setTimeout(scrollToTop, 80)
  }, [])

  useEffect(() => {
    if (!invoiceDialogOpen || !invoiceFormError) return
    scrollInvoiceDialogToTop()
  }, [invoiceDialogOpen, invoiceFormError, scrollInvoiceDialogToTop])

  const subtotal = useMemo(
    () => invoiceLines.reduce((sum, line) => {
      const quantity = typeof line.quantity === 'number' ? line.quantity : 0
      const unitPrice = typeof line.unitPrice === 'number' ? line.unitPrice : 0
      return sum + quantity * unitPrice
    }, 0),
    [invoiceLines]
  )

  const discountAmount = useMemo(() => {
    const value = typeof discountValue === 'number' ? discountValue : 0
    if (discountType === 'percentage') {
      return (subtotal * value) / 100
    }
    if (discountType === 'fixed') {
      return value
    }
    return 0
  }, [discountType, discountValue, subtotal])

  const netTotal = useMemo(() => Math.max(subtotal - discountAmount, 0), [subtotal, discountAmount])
  
  const totalDirectPayments = useMemo(() => invoicePayments.reduce((sum, p) => sum + (typeof p.amount === 'number' ? p.amount : 0), 0), [invoicePayments])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [allCustomers, activeCustomersList, activeDelegatesList, warehouses, materials] = await Promise.all([
        customersService.list(),
        customersService.listActive(),
        delegatesService.listActive(),
        inventoryService.listWarehouses(),
        materialsService.listMaterials(),
      ])
      setCustomers(allCustomers)
      setActiveCustomers(activeCustomersList)
      setActiveDelegates(activeDelegatesList)
      setActiveWarehouses(warehouses.filter((warehouse) => warehouse.status === 'active'))
      setMaterialOptions(flattenSellableMaterials(materials))

      const list = await salesService.listInvoices({
        reference: search || undefined,
        fromDate: toInternalDate(fromDate) || undefined,
        toDate: toInternalDate(toDate) || undefined,
        customerId: customerFilter || undefined,
        warehouseId: warehouseFilter || undefined,
      })
      setInvoices(list)
    } catch (error) {
      console.error('LOAD SALES DATA FAILED', error)
    } finally {
      setLoading(false)
    }
  }, [search, fromDate, toDate, customerFilter, warehouseFilter])

  useEffect(() => {
    const timerId = window.setTimeout(() => void loadData(), 0)
    return () => window.clearTimeout(timerId)
  }, [loadData])

  useEffect(() => {
    if (invoiceDialogOpen && !editingInvoiceId && seedInvoiceDelegateRowRef.current && invoiceDelegates.length === 0 && activeDelegates.length > 0) {
      setInvoiceDelegates([{ delegateId: '', commissionPercentage: 0, notes: '' }])
      seedInvoiceDelegateRowRef.current = false
    }
  }, [invoiceDialogOpen, editingInvoiceId, invoiceDelegates.length, activeDelegates.length])

  const reloadInvoices = useCallback(async () => {
    const list = await salesService.listInvoices({
      reference: search || undefined,
      fromDate: toInternalDate(fromDate) || undefined,
      toDate: toInternalDate(toDate) || undefined,
      customerId: customerFilter || undefined,
      warehouseId: warehouseFilter || undefined,
    })
    setInvoices(list)
  }, [search, fromDate, toDate, customerFilter, warehouseFilter])

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

  const { ledgerEntries, totalCredit, totalDebit, remainingBalance } = useMemo(() => {
    const allInvoices: LedgerEntry[] = customerStatementInvoices.map((inv) => ({
      id: `inv-${inv.id}`,
      type: 'invoice',
      debit: inv.amount, 
      credit: 0,
      paymentMethod: '',
      invoiceNumber: inv.invoiceNumber,
      notes: inv.notes || '',
      date: inv.date,
    }))

    const allPayments: LedgerEntry[] = customerStatementPayments.map((p) => ({
      id: `pay-${p.id}`,
      type: 'payment',
      paymentId: p.id,
      paymentSource: p.source ?? (p.invoiceNumber ? 'invoice' : 'account'),
      debit: 0,
      credit: p.amount,
      paymentMethod: p.paymentMethod || '',
      invoiceNumber: p.invoiceNumber || '',
      notes: p.notes || '',
      date: p.date,
    }))

    const returnEntries: LedgerEntry[] = customerStatementReturns.flatMap((returnRecord) => [
      {
        id: `return-${returnRecord.id}`,
        type: 'return',
        debit: 0,
        credit: returnRecord.amount,
        paymentMethod: '',
        invoiceNumber: returnRecord.returnNumber,
        notes: returnRecord.notes || '',
        date: returnRecord.date,
      },
      ...returnRecord.payments.map((payment) => ({
        id: `return-payment-${payment.id}`,
        type: 'payment' as const,
        paymentId: payment.id,
        paymentSource: 'return' as const,
        debit: payment.amount,
        credit: 0,
        paymentMethod: payment.paymentMethod || '',
        invoiceNumber: returnRecord.returnNumber,
        notes: payment.notes || '',
        date: payment.date,
      })),
    ])

    const all = [...allInvoices, ...allPayments, ...returnEntries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    )

    let carryOverBalance = 0
    let filteredEntries = all

    if (startDateFilter) {
      const startMs = new Date(startDateFilter).getTime()

      const priorEntries = all.filter((entry) => new Date(entry.date).getTime() < startMs)
      carryOverBalance = priorEntries.reduce((sum, item) => sum + (item.debit - item.credit), 0)

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

      const carryOverDebit = safeCarryOver > 0 ? safeCarryOver : 0
      const carryOverCredit = safeCarryOver < 0 ? Math.abs(safeCarryOver) : 0

      finalEntries.unshift({
        id: 'carried-forward-balance',
        type: 'invoice',
        debit: carryOverDebit,
        credit: carryOverCredit,
        paymentMethod: '',
        invoiceNumber: '',
        notes: 'رصيد مدور',
        date: prevDateStr,
      })
    }

    const calcDebit = finalEntries.reduce((sum, inv) => sum + inv.debit, 0)
    const calcCredit = finalEntries.reduce((sum, p) => sum + p.credit, 0)

    return {
      ledgerEntries: finalEntries,
      totalDebit: calcDebit,
      totalCredit: calcCredit,
      remainingBalance: calcDebit - calcCredit,
    }
  }, [customerStatementInvoices, customerStatementPayments, customerStatementReturns, startDateFilter, endDateFilter])

  const openCustomerStatement = useCallback(async (customer: CustomerRecord) => {
    setCustomerStatementEntity(customer)
    setCustomerStatementOpen(true)
    setStatementLoading(true)
    setStartDateFilter('')
    setEndDateFilter('')
    setQuickFilter('')

    try {
      const summaries = await salesService.listInvoices({ customerId: customer.id, status: 'completed' })
      const details = await Promise.all(summaries.map((invoice) => salesService.getInvoiceById(invoice.id)))

      const invs = details.map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        date: invoice.date,
        amount: Math.max(Number(invoice.subtotal ?? 0) - Number(invoice.discountAmount ?? 0), 0),
        notes: invoice.notes,
      }))

      const invoicePays = details.flatMap(inv => (inv.payments ?? []).map(p => ({
        ...p,
        invoiceNumber: inv.invoiceNumber,
        source: 'invoice' as const,
      })))
      const accountPays = await customersService.listPayments(customer.id)
      const returnSummaries = await salesService.listReturns({ customerId: customer.id })
      const returnDetails = await Promise.all(returnSummaries.map((summary) => salesService.getReturnById(summary.id)))
      const returnEntries = returnDetails.map((returnRecord) => ({
        id: returnRecord.id,
        returnNumber: returnRecord.returnNumber,
        date: returnRecord.date,
        amount: returnRecord.netTotal,
        notes: returnRecord.notes,
        payments: returnRecord.payments,
      }))
      const pays = [...invoicePays, ...accountPays.filter((payment) => !payment.referenceType).map((payment) => ({ ...payment, invoiceNumber: '', source: 'account' as const }))]

      setCustomerStatementInvoices(invs)
      setCustomerStatementPayments(pays)
      setCustomerStatementReturns(returnEntries)
    } catch (error) {
      console.error('OPEN CUSTOMER STATEMENT FAILED', error)
      notify.error(getUserFriendlyErrorMessage(error, 'تعذر تحميل بيانات كشف الحساب.'))
    } finally {
      setStatementLoading(false)
    }
  }, [notify])

  const submitStatementPayment = useCallback(async () => {
    if (!customerStatementEntity) return

    const amount = Number(statementPaymentForm.amount)
    if (!statementPaymentForm.date) {
      setStatementPaymentError('تاريخ الدفعة مطلوب.')
      return
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setStatementPaymentError('مبلغ الدفعة يجب أن يكون أكبر من صفر.')
      return
    }
    if (!statementPaymentForm.paymentMethod) {
      setStatementPaymentError('طريقة الدفع مطلوبة.')
      return
    }

    try {
      setStatementPaymentError('')
      await customersService.createPayment({
        customerId: customerStatementEntity.id,
        date: toInternalDate(statementPaymentForm.date) || statementPaymentForm.date,
        amount,
        paymentMethod: statementPaymentForm.paymentMethod,
        notes: statementPaymentForm.notes.trim(),
      })
      setStatementPaymentDialogOpen(false)
      notify.success('تم تسديد الدفعة من العميل بنجاح.')
      await openCustomerStatement(customerStatementEntity)
    } catch (error) {
      console.error('SAVE CUSTOMER STATEMENT PAYMENT FAILED', error)
      const message = getUserFriendlyErrorMessage(error, 'تعذر حفظ دفعة العميل.')
      setStatementPaymentError(message)
      notify.error(message)
    }
  }, [customerStatementEntity, notify, openCustomerStatement, statementPaymentForm])

  const handleDeleteCustomerPayment = useCallback(async () => {
    if (!customerStatementEntity || !paymentToDelete) return

    try {
      setPaymentDeleteError('')
      if (paymentToDelete.source === 'account') {
        await customersService.deletePayment(paymentToDelete.paymentId)
      } else if (paymentToDelete.source === 'return') {
        await salesService.deleteReturnPayment(paymentToDelete.paymentId)
      } else {
        await salesService.deletePayment(paymentToDelete.paymentId)
      }
      setPaymentToDelete(null)
      await openCustomerStatement(customerStatementEntity)
      notify.success('تم حذف الدفعة بنجاح.')
    } catch (error) {
      console.error('DELETE CUSTOMER STATEMENT PAYMENT FAILED', error)
      const message = getUserFriendlyErrorMessage(error, 'تعذر حذف الدفعة.')
      setPaymentDeleteError(message)
      notify.error(message)
    }
  }, [customerStatementEntity, notify, openCustomerStatement, paymentToDelete])

  const handleExportCustomerStatementPdf = useCallback(async () => {
    if (!customerStatementEntity) return
    const settings = await loadCompanyPrintSettings()

    navigate('/invoice-preview', {
      state: {
        invoiceData: {
          printKind: 'customer-statement',
          documentType: 'sales',
          title: 'كشف حساب عميل',
          documentNumber: customerStatementEntity.code,
          date: getLocalDateTimeString(),
          partyLabel: 'العميل',
          partyName: customerStatementEntity.name,
          items: [],
          subtotal: totalDebit,
          discount: 0,
          total: remainingBalance,
          entityCode: customerStatementEntity.code,
          entityName: customerStatementEntity.name,
          entityPhone: customerStatementEntity.phone ?? '',
          entityAddress: customerStatementEntity.address ?? '',
          paymentMethod: '',
          ledgerEntries: ledgerEntries,
          totalCredit,
          totalDebit,
          remainingBalance,
          startDate: startDateFilter,
          endDate: endDateFilter,
        },
        settings,
      },
    })
  }, [
    navigate,
    customerStatementEntity,
    ledgerEntries,
    totalCredit,
    totalDebit,
    remainingBalance,
    startDateFilter,
    endDateFilter,
  ])

  const buildSalesExportData = useCallback((): InvoicePrintDataWithDiscount | null => {
    if (!selectedInvoice) return null
    const paymentMethodOrder = loadSettings().paymentMethods
    const normalizedPaymentMethod = (selectedInvoice.payments ?? []).length === 0
      ? '—'
      : (selectedInvoice.payments ?? [])
          .map((payment, originalIndex) => ({
            payment,
            originalIndex,
            method: String(payment.paymentMethod ?? '').trim() || '—',
          }))
          .sort((first, second) => {
            const firstIndex = paymentMethodOrder.indexOf(first.method)
            const secondIndex = paymentMethodOrder.indexOf(second.method)
            const firstOrder = firstIndex === -1 ? Number.MAX_SAFE_INTEGER : firstIndex
            const secondOrder = secondIndex === -1 ? Number.MAX_SAFE_INTEGER : secondIndex
            if (firstOrder !== secondOrder) {
              return firstOrder - secondOrder
            }
            return first.originalIndex - second.originalIndex
          })
          .map(({ payment, method }) => {
            return `${method}\t${currency(Number(payment.amount ?? 0))}`
          })
          .join('\n')

    return {
      documentType: 'sales',
      title: 'فاتورة مبيعات',
      documentNumber: selectedInvoice.invoiceNumber,
      date: formatDateDMY(selectedInvoice.date),
      partyLabel: 'العميل',
      partyName: selectedInvoice.customerName,
      partyNumber: selectedInvoice.customerCode,
      warehouseName: selectedInvoice.warehouseName,
      notes: selectedInvoice.notes,
      items: selectedInvoice.items.map((item) => ({
        id: item.id,
        code: item.materialNumber,
        name: item.materialName,
        unit: item.unit,
        quantity: item.quantity,
        price: item.unitPrice,
        total: item.lineTotal,
      })),
      subtotal: selectedInvoice.subtotal,
      discount: selectedInvoice.discountAmount,
      discountType: selectedInvoice.discountType,
      discountValue: selectedInvoice.discountValue,
      additionalFees: 0,
      delegateNames: (selectedInvoice.delegates ?? []).map((delegate) => delegate.delegateName),
      total: selectedInvoice.netTotal,
      paymentMethod: normalizedPaymentMethod,
      paymentStatus: paymentStatusLabel[selectedInvoice.paymentStatus],
      paidAmount: selectedInvoice.paidAmount,
      remainingAmount: selectedInvoice.remainingAmount,
    }
  }, [selectedInvoice])

  const handleExportPdf = useCallback(async () => {
    const exportData = buildSalesExportData()
    if (!exportData) return
    const latestSettings = await loadCompanyPrintSettings()
    navigate('/invoice-preview', {
      state: {
        invoiceData: exportData,
        settings: latestSettings,
      },
    })
  }, [buildSalesExportData, navigate])

  const materialById = useMemo(() => new Map(materialOptions.map((item) => [item.id, item])), [materialOptions])

  const warehouseBalanceByMaterial = useMemo(() => {
    const map = new Map<string, StockBalanceRecord>()
    for (const balance of warehouseBalances) {
      map.set(balance.id, balance)
    }
    return map
  }, [warehouseBalances])

  const validateInvoiceForm = useCallback((): string | null => {
    const appSettings = loadSettings()

    if (!invoiceDate) return 'تاريخ الفاتورة مطلوب.'
    if (!invoiceCustomerId) return 'اختر العميل.'
    if (!invoiceWarehouseId) return 'اختر المخزن.'
    if (!invoiceLines.length) return 'أضف مادة واحدة على الأقل إلى الفاتورة.'

    for (const delegate of invoiceDelegates) {
      if (!delegate.delegateId) return 'اختر المندوب.'
      const percentage = typeof delegate.commissionPercentage === 'number' ? delegate.commissionPercentage : Number.NaN
      if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) return 'نسبة المندوب يجب أن تكون بين 0 و100.'
      const selectedDelegate = activeDelegates.find((item) => item.id === delegate.delegateId)
      if (!selectedDelegate || selectedDelegate.status !== 'active') {
        return 'المندوب غير موجود أو غير فعال.'
      }
    }

    const seen = new Set<string>()
    for (const line of invoiceLines) {
      if (!line.materialId || !materialById.has(line.materialId)) {
        return 'المادة غير موجودة في دليل المواد. أضف المادة أولاً من دليل المواد ثم أعد المحاولة.'
      }
      if (seen.has(line.materialId)) {
        return 'المادة مضافة مسبقاً إلى الفاتورة.'
      }
      seen.add(line.materialId)

      const quantity = typeof line.quantity === 'number' ? line.quantity : Number.NaN
      if (Number.isNaN(quantity) || quantity <= 0) {
        return 'يجب أن تكون كمية المادة أكبر من صفر.'
      }

      if (!appSettings.allowNegativeStock) {
        const balance = Number(warehouseBalanceByMaterial.get(line.materialId)?.quantity ?? 0)
        if (quantity > balance + 0.000001) {
          return `الرصيد المتوفر للمادة غير كافٍ في المخزن. الكمية المطلوبة: ${formatNumberBySettings(quantity, 'quantity')}، الرصيد المتوفر: ${formatNumberBySettings(balance, 'quantity')}.`
        }
      }

      const unitPrice = typeof line.unitPrice === 'number' ? line.unitPrice : Number.NaN
      if (Number.isNaN(unitPrice) || unitPrice < 0) {
        return 'لا يمكن إدخال قيمة سالبة.'
      }
    }

    const discountNumericValue = typeof discountValue === 'number' ? discountValue : 0
    if (discountNumericValue < 0) {
      return 'لا يمكن إدخال قيمة سالبة.'
    }

    if (discountType === 'percentage' && discountNumericValue > 100) {
      return 'قيمة الحسم بالنسبة المئوية يجب أن تكون بين 0 و100.'
    }

    if (discountAmount > subtotal) {
      return 'قيمة الحسم لا يمكن أن تتجاوز الإجمالي.'
    }

    return null
  }, [invoiceDate, invoiceCustomerId, invoiceWarehouseId, invoiceLines, invoiceDelegates, materialById, discountValue, discountType, discountAmount, subtotal, warehouseBalanceByMaterial, activeDelegates])

  const buildInvoicePayload = useCallback(() => {
    return {
      invoiceNumber,
      date: toInternalDate(invoiceDate),
      customerId: invoiceCustomerId,
      warehouseId: invoiceWarehouseId,
      discountType,
      discountValue: typeof discountValue === 'number' ? discountValue : 0,
      delegates: invoiceDelegates.map((delegate) => ({
        delegateId: delegate.delegateId,
        commissionPercentage: typeof delegate.commissionPercentage === 'number' ? delegate.commissionPercentage : 0,
        notes: delegate.notes ?? '',
      })),
      notes: invoiceNotes,
      items: invoiceLines.map((line) => ({
        materialId: line.materialId,
        unit: line.unit,
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
        notes: line.notes,
      })),
    }
  }, [invoiceNumber, invoiceDate, invoiceCustomerId, invoiceWarehouseId, discountType, discountValue, invoiceNotes, invoiceLines, invoiceDelegates])

  const resetInvoiceForm = useCallback(async () => {
    const draftData = await salesService.getNextDraftData()
    setInvoiceNumber(draftData.invoiceNumber)
    setInvoiceDate(getLocalTodayISO())
    setInvoiceCustomerId('')
    setInvoiceDelegates([])
    seedInvoiceDelegateRowRef.current = true
    setInvoiceWarehouseId('')
    setWarehouseBalances([])
    setWarehouseBalancesLoading(false)
    setDiscountType('none')
    setDiscountValue(0)
    setInvoiceNotes('')
    setInvoiceLines([createEmptyLine()])
    setInvoicePayments([])
    setMaterialWarehouseHintLineKey(null)
    setMaterialPickerOpenKey(null)
    setEditingInvoiceId(null)
    setEditingInvoiceStatus('draft')
    setInvoiceFormError('')
  }, [])

  const openCreateInvoiceDialog = useCallback(async () => {
    try {
      await resetInvoiceForm()
      setInvoiceDialogOpen(true)
    } catch (error) {
      console.error('OPEN CREATE SALES INVOICE DIALOG FAILED', error)
      setInvoiceFormError(getUserFriendlyErrorMessage(error, 'تعذر فتح شاشة الفاتورة.'))
      scrollInvoiceDialogToTop()
    }
  }, [resetInvoiceForm, scrollInvoiceDialogToTop])

  const openEditInvoiceDialog = useCallback(async (invoiceId: string) => {
    try {
      const invoice = await salesService.getInvoiceById(invoiceId)
      if (invoice.status !== 'draft' && invoice.status !== 'completed') {
        return
      }
      setEditingInvoiceId(invoice.id)
      setEditingInvoiceStatus(invoice.status)
      seedInvoiceDelegateRowRef.current = false
      setInvoiceNumber(invoice.invoiceNumber)
      setInvoiceDate(invoice.date)
      setInvoiceCustomerId(invoice.customerId)
      setInvoiceDelegates((invoice.delegates ?? []).map((delegate) => ({
        delegateId: delegate.delegateId,
        commissionPercentage: delegate.commissionPercentage,
        notes: delegate.notes ?? '',
      })))
      setInvoiceWarehouseId(invoice.warehouseId)

      setWarehouseBalancesLoading(true)
      try {
        const balances = await inventoryService.getBalancesByWarehouse(invoice.warehouseId)
        setWarehouseBalances(balances)
      } finally {
        setWarehouseBalancesLoading(false)
      }

      setDiscountType(invoice.discountType)
      setDiscountValue(invoice.discountValue)
      setInvoiceNotes(invoice.notes ?? '')
      setInvoiceLines(invoice.items.map((item) => ({
        key: item.id,
        materialId: item.materialId,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        notes: item.notes ?? '',
      })))
      setInvoicePayments([])
      setInvoiceFormError('')
      setInvoiceDialogOpen(true)
    } catch (error) {
      console.error('OPEN EDIT SALES INVOICE DIALOG FAILED', error)
      setInvoiceFormError(getUserFriendlyErrorMessage(error, 'تعذر فتح بيانات الفاتورة.'))
      scrollInvoiceDialogToTop()
      setInvoiceDialogOpen(true)
    }
  }, [scrollInvoiceDialogToTop])

  const saveDraft = useCallback(async () => {
    const validationError = validateInvoiceForm()
    if (validationError) {
      setInvoiceFormError(validationError)
      scrollInvoiceDialogToTop()
      return
    }

    try {
      setSaving(true)
      setInvoiceFormError('')
      const payload = buildInvoicePayload()
      if (editingInvoiceId) {
        if (editingInvoiceStatus === 'completed') {
          await salesService.updateApproved(editingInvoiceId, payload)
        } else {
          await salesService.updateDraft(editingInvoiceId, payload)
        }
        notify.info('تم تعديل الفاتورة بنجاح.')
      } else {
        await salesService.createDraft(payload)
        notify.success('تمت إضافة فاتورة البيع بنجاح.')
      }
      setInvoiceDialogOpen(false)
      await loadData()
    } catch (error) {
      console.error('SAVE SALES DRAFT FAILED', error)
      setInvoiceFormError(getUserFriendlyErrorMessage(error, 'تعذر حفظ مسودة الفاتورة. يرجى المحاولة مرة أخرى.'))
      scrollInvoiceDialogToTop()
    } finally {
      setSaving(false)
    }
  }, [validateInvoiceForm, buildInvoicePayload, editingInvoiceId, editingInvoiceStatus, loadData, scrollInvoiceDialogToTop, notify])

  const completeDraft = useCallback(async () => {
    const validationError = validateInvoiceForm()
    if (validationError) {
      setInvoiceFormError(validationError)
      scrollInvoiceDialogToTop()
      return
    }

    if (totalDirectPayments > netTotal + 0.000001) {
      setInvoiceFormError('اجمالي الدفعات يتجاوز الصافي المستحق.')
      scrollInvoiceDialogToTop()
      return
    }

    try {
      setSaving(true)
      setInvoiceFormError('')
      let targetInvoiceId = editingInvoiceId
      if (!targetInvoiceId) {
        const created = await salesService.createDraft(buildInvoicePayload())
        targetInvoiceId = created.id
        setEditingInvoiceId(created.id)
      } else {
        await salesService.updateDraft(targetInvoiceId, buildInvoicePayload())
      }
      await salesService.complete(targetInvoiceId)
      
      for (const p of invoicePayments) {
        if (typeof p.amount === 'number' && p.amount > 0) {
          await salesService.addPayment(targetInvoiceId, {
            date: toInternalDate(invoiceDate),
            amount: p.amount,
            paymentMethod: p.paymentMethod,
            notes: p.notes
          })
        }
      }

      setInvoiceDialogOpen(false)
      await loadData()
      notify.success('تم اعتماد الفاتورة بنجاح.')
    } catch (error) {
      console.error('APPROVE SALES FAILED', error)
      setInvoiceFormError(getUserFriendlyErrorMessage(error, 'تعذر اعتماد الفاتورة. يرجى مراجعة البيانات والمحاولة مرة أخرى.'))
      scrollInvoiceDialogToTop()
    } finally {
      setSaving(false)
    }
  }, [validateInvoiceForm, totalDirectPayments, netTotal, editingInvoiceId, buildInvoicePayload, invoicePayments, invoiceDate, loadData, scrollInvoiceDialogToTop, notify])

  const deleteDraft = useCallback(async (invoiceId: string): Promise<boolean> => {
    try {
      setInvoiceDeleteError('')
      await salesService.deleteDraft(invoiceId)
      await reloadInvoices()
      notify.error('تم حذف مسودة الفاتورة بنجاح.')
      return true
    } catch (error) {
      console.error('DELETE SALES DRAFT FAILED', error)
      setInvoiceDeleteError(
        getUserFriendlyErrorMessage(
          error,
          'تعذر حذف مسودة فاتورة البيع. قد تكون الفاتورة مرتبطة ببيانات أخرى أو لم تعد قابلة للحذف.',
        ),
      )
      return false
    }
  }, [reloadInvoices, notify])

  const deleteApprovedInvoice = useCallback(async (invoiceId: string): Promise<boolean> => {
    try {
      setInvoiceDeleteError('')
      await salesService.deleteApproved(invoiceId)
      await reloadInvoices()
      if (detailsOpen && selectedInvoice?.id === invoiceId) {
        const refreshed = await salesService.getInvoiceById(invoiceId)
        setSelectedInvoice(refreshed)
      }
      notify.error('تم حذف الفاتورة بنجاح.')
      return true
    } catch (error) {
      console.error('DELETE APPROVED SALES INVOICE FAILED', error)
      setInvoiceDeleteError(
        getUserFriendlyErrorMessage(
          error,
          'تعذر حذف فاتورة البيع. قد تكون مرتبطة بمرتجع أو دفعات أو حركات أخرى تمنع حذفها.',
        ),
      )
      return false
    }
  }, [reloadInvoices, detailsOpen, selectedInvoice, notify])

  const deletePayment = useCallback(async (paymentId: string): Promise<boolean> => {
    try {
      setPaymentDeleteErrorState('')
      await salesService.deletePayment(paymentId)
      if (selectedInvoice) {
        const refreshed = await salesService.getInvoiceById(selectedInvoice.id)
        setSelectedInvoice(refreshed)
      }
      await reloadInvoices()
      setPaymentDeleteConfirm(null)
      notify.error('تم حذف الدفعة بنجاح.')
      return true
    } catch (error) {
      console.error('DELETE SALES PAYMENT FAILED', error)
      setPaymentDeleteErrorState(
        getUserFriendlyErrorMessage(
          error,
          'تعذر حذف الدفعة. قد تكون الدفعة أو الفاتورة مرتبطة بعملية أخرى تمنع الحذف.',
        ),
      )
      return false
    }
  }, [reloadInvoices, selectedInvoice, notify])

  const openDetails = useCallback(async (invoiceId: string) => {
    try {
      const details = await salesService.getInvoiceById(invoiceId)
      setSelectedInvoice(details)
      setDetailsOpen(true)
    } catch (error) {
      console.error('OPEN SALES DETAILS FAILED', error)
    }
  }, [])

  const filteredRows = useMemo(() => {
    return invoices.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
  }, [invoices, page, rowsPerPage])

  const paymentRows = useMemo(() => {
    if (!selectedInvoice?.payments?.length) return []
    let runningTotal = 0
    return [...selectedInvoice.payments]
      .sort((first, second) => new Date(first.date).getTime() - new Date(second.date).getTime())
      .map((payment) => {
        runningTotal += Number(payment.amount ?? 0)
        return {
          ...payment,
          remainingAfterThisPayment: Math.max(Number(selectedInvoice.netAfterReturns ?? selectedInvoice.netTotal ?? 0) - runningTotal, 0),
          netTotal: Number(selectedInvoice.netAfterReturns ?? selectedInvoice.netTotal ?? 0),
        }
      })
  }, [selectedInvoice])

  const selectedCustomer = activeCustomers.find((item) => item.id === invoiceCustomerId) ?? null
  const selectedWarehouse = activeWarehouses.find((item) => item.id === invoiceWarehouseId) ?? null

  const saveCustomer = useCallback(async () => {
    const code = customerForm.code.trim()
    const name = customerForm.name.trim()
    if (!code || !name) {
      setCustomerFormError('رقم العميل واسم العميل مطلوبان.')
      return
    }

    const duplicateCustomer = customers.find(
      (customer) => customer.id !== customerForm.id && customer.code.trim() === code,
    )
    if (duplicateCustomer) {
      setCustomerFormError('رقم العميل مستخدم مسبقاً.')
      return
    }

    try {
      setCustomerFormError('')
      if (customerForm.id) {
        await customersService.update(customerForm.id, {
          ...customerForm,
          code,
          name,
          phone: customerForm.phone,
          address: customerForm.address,
          notes: customerForm.notes,
          status: customerForm.status,
        })
        notify.info('تم تعديل بيانات العميل بنجاح.')
      } else {
        await customersService.create({
          code,
          name,
          phone: customerForm.phone,
          address: customerForm.address,
          notes: customerForm.notes,
          status: customerForm.status,
        })
        notify.success('تمت إضافة العميل بنجاح.')
      }
      setCustomerFormOpen(false)
      setCustomerForm(createEmptyCustomerForm())
      await loadData()
    } catch (error) {
      console.error('SAVE CUSTOMER FAILED', error)
      setCustomerFormError(getUserFriendlyErrorMessage(error, 'تعذر حفظ بيانات العميل.'))
    }
  }, [customerForm, customers, loadData, notify])

  return (
    <Box sx={craftPageGlassSx}>
      <PageHeader
        title={isCustomersPage ? 'العملاء' : 'المبيعات والعملاء'}
        breadcrumb={isCustomersPage ? 'إدارة العملاء' : 'إدارة العملاء وفواتير المبيعات'}
      />

      {isCustomersPage ? (
        <SectionCard title="قائمة العملاء" actions={
          <Button
            variant="contained"
            startIcon={<FiPlus />}
            onClick={() => {
              setCustomerForm(createEmptyCustomerForm())
              setCustomerFormError('')
              setCustomerFormOpen(true)
            }}
          >إضافة عميل</Button>
        }>
          <Box sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 800 }}>
              <TableHead>
                <TableRow sx={{ background: 'rgba(255, 255, 255, 0.055)', textAlignLast: 'center' }}>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>رقم العميل</TableCell>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>اسم العميل</TableCell>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الهاتف</TableCell>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>العنوان</TableCell>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الحالة</TableCell>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customers
                  .slice(
                    customerPage * customerRowsPerPage,
                    customerPage * customerRowsPerPage + customerRowsPerPage,
                  )
                  .map((customer) => (
                  <TableRow key={customer.id} sx={{ textAlignLast: 'center' }}>
                    <TableCell sx={{ textAlign: 'center' }}>{customer.code}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{customer.name}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{customer.phone || ''}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{customer.address || ''}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{customer.status === 'active' ? 'فعال' : 'غير فعال'}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <Tooltip title="كشف حساب العميل">
                          <IconButton size="small" color="secondary" onClick={() => void openCustomerStatement(customer)}>
                            <FiEye />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="تعديل">
                          <IconButton size="small" color="primary" onClick={() => {
                            setCustomerForm({
                              id: customer.id,
                              code: customer.code,
                              name: customer.name,
                              phone: customer.phone ?? '',
                              address: customer.address ?? '',
                              notes: customer.notes ?? '',
                              status: customer.status ?? 'active',
                            })
                            setCustomerFormError('')
                            setCustomerFormOpen(true)
                          }}>
                            <FiEdit2 />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="حذف">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setCustomerDeleteError('')
                              setCustomerToDelete(customer)
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
              count={customers.length}
              page={customerPage}
              onPageChange={(_, newPage) => setCustomerPage(newPage)}
              rowsPerPage={customerRowsPerPage}
              onRowsPerPageChange={(event) => {
                setCustomerRowsPerPage(Number(event.target.value))
                setCustomerPage(0)
              }}
            />
          </Box>
        </SectionCard>
        
      ) : (
        <SectionCard title="سجل فواتير المبيعات" actions={
          <Button variant="contained" startIcon={<FiPlus />} onClick={() => void openCreateInvoiceDialog()}>فاتورة بيع جديدة</Button>
        }>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', mb: 2 }}>
          <Tooltip title="بحث برقم الفاتورة أو اسم العميل" arrow>
            <Box>
              <SearchField
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(0)
                }}
              />
            </Box>
          </Tooltip>
          <DateFilterField
            label="من تاريخ"
            value={fromDate}
            onChange={(value) => { setFromDate(toInternalDate(value)); setPage(0) }}
          />
          <DateFilterField
            label="إلى تاريخ"
            value={toDate}
            onChange={(value) => { setToDate(toInternalDate(value)); setPage(0) }}
          />
          <TextField select label="العميل" value={customerFilter} onChange={(event) => { setCustomerFilter(event.target.value); setPage(0) }} slotProps={darkSelectSlotProps}>
            <MenuItem value="">الكل</MenuItem>
            {customers.map((customer) => (
              <MenuItem key={customer.id} value={customer.id}>{customer.code} - {customer.name}</MenuItem>
            ))}
          </TextField>
          <TextField select label="المخزن" value={warehouseFilter} onChange={(event) => { setWarehouseFilter(event.target.value); setPage(0) }} slotProps={darkSelectSlotProps}>
            <MenuItem value="">الكل</MenuItem>
            {activeWarehouses.map((warehouse) => (
              <MenuItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</MenuItem>
            ))}
          </TextField>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Button
              variant="outlined"
              onClick={() => {
                setSearch('')
                setFromDate('')
                setToDate('')
                setCustomerFilter('')
                setWarehouseFilter('')
                setPage(0)
              }}
            >
              مسح الفلاتر
            </Button>
          </Box>
        </Box>

        <Box sx={{ overflowX: 'auto' }}>
          {loading ? (
            <Box sx={{ display: 'grid', placeItems: 'center', p: 4 }}><CircularProgress /></Box>
          ) : (
            <Table sx={{ width: '100%', minWidth: 1000 }}>
              <TableHead>
                <TableRow sx={{ background: 'rgba(255, 255, 255, 0.055)', textAlignLast: 'center' }}>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>التاريخ</TableCell>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>رقم الفاتورة</TableCell>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>العميل</TableCell>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>المخزن</TableCell>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الاجمالي</TableCell>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الحسم</TableCell>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الصافي</TableCell>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>حالة الدفع</TableCell>
                  <TableCell
                    sx={{
                      textAlign: 'center',
                      fontWeight: 700,
                      width: 130,
                      minWidth: 130,
                      maxWidth: 130,
                      px: 1,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    الإجراءات
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow key={row.id} sx={{ textAlignLast: 'center' }}>
                    <TableCell sx={{ textAlign: 'center' }}>{formatDateDMY(row.date)}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{row.invoiceNumber}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{row.customerName}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{row.warehouseName}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{priceNum(row.subtotal)}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{priceNum(row.discountAmount)}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{priceNum(row.netTotal)}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{paymentStatusLabel[row.paymentStatus]}</TableCell>
                    <TableCell
                      sx={{
                        textAlign: 'center',
                        width: 130,
                        minWidth: 130,
                        maxWidth: 130,
                        px: 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          gap: 0.5,
                          justifyContent: 'center',
                          alignItems: 'center',
                          flexWrap: 'nowrap',
                        }}
                      >
                        <Tooltip title="عرض">
                          <IconButton size="small" color="secondary" onClick={() => void openDetails(row.id)}>
                            <FiEye />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="تعديل الفاتورة">
                          <IconButton size="small" color="primary" onClick={() => void openEditInvoiceDialog(row.id)}>
                            <FiEdit2 />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="حذف الفاتورة">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setInvoiceDeleteError('')
                              setConfirmAction({ type: 'deleteApprovedInvoice', invoiceId: row.id, invoiceNumber: row.invoiceNumber })
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
          )}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <TablePagination
            component="div"
            count={invoices.length}
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
      )}

      {/* Customer Statement Dialog */}
      <Dialog
        open={customerStatementOpen}
        onClose={() => setCustomerStatementOpen(false)}
        fullWidth
        maxWidth="lg"
        slotProps={craftDialogSlotProps}
      >
        <DialogTitle>كشف حساب عميل</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '12px !important' }}>
          {statementLoading || !customerStatementEntity ? (
            <Box sx={{ display: 'grid', placeItems: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gap: 2 }}>
              <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
                <Box>
                  رقم العميل: <strong>{customerStatementEntity.code}</strong>
                </Box>
                <Box>
                  اسم العميل: <strong>{customerStatementEntity.name}</strong>
                </Box>
                <Box>
                  الهاتف: <strong>{customerStatementEntity.phone || ''}</strong>
                </Box>
                <Box>
                  العنوان: <strong>{customerStatementEntity.address || ''}</strong>
                </Box>
                <Box>
                  الحالة: <strong>{customerStatementEntity.status === 'active' ? 'فعال' : 'غير فعال'}</strong>
                </Box>
              </Box>

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
                  لا توجد حركات مسجلة لهذا العميل في الفترة المحددة.
                </Typography>
              ) : (
                <Table sx={{ width: '100%' }}>
                  <TableHead>
                    <TableRow sx={{ background: 'rgba(255, 255, 255, 0.055)', textAlignLast: 'center' }}>
                      <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>مدين</TableCell>
                      <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>دائن</TableCell>
                      <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>طريقة الدفع</TableCell>
                      <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>رقم الفاتورة</TableCell>
                      <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الملاحظات</TableCell>
                      <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>التاريخ</TableCell>
                      <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الإجراءات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ledgerEntries.map((entry, index) => (
                      <TableRow key={`${entry.id}-${index}`} sx={{ textAlignLast: 'center' }}>
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
                        <TableCell sx={{ textAlign: 'center' }}>{entry.notes}</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>{formatDateDMY(entry.date)}</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          {entry.type === 'payment' ? (
                            <Tooltip title="حذف الدفعة">
                              <IconButton size="small" color="error" onClick={() => {
                                setPaymentDeleteError('')
                                setPaymentToDelete({
                                  paymentId: entry.paymentId ?? entry.id.replace(/^pay-/, ''),
                                  source: entry.paymentSource ?? 'account',
                                  date: entry.date,
                                  amount: entry.debit || entry.credit,
                                })
                              }}>
                                <FiTrash2 />
                              </IconButton>
                            </Tooltip>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              <Table sx={{ width: '100%', minWidth: 620, '& td, & th': { textAlign: 'center' } }}>
                <TableHead>
                  <TableRow sx={{ background: 'rgba(255, 255, 255, 0.055)', textAlignLast: 'center' }}>
                    <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الاجمالي</TableCell>
                    <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>المدفوع</TableCell>
                    <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الرصيد</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow sx={{ textAlignLast: 'center' }}>
                    <TableCell sx={{ textAlign: 'center' }}>{currency(totalDebit)}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{currency(totalCredit)}</TableCell>
                    <TableCell sx={{ textAlign: 'center', color: remainingBalance > 0 ? '#67E8F9' : 'inherit' }}>
                      {currency(remainingBalance)}
                    </TableCell>
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
            disabled={statementLoading}
            onClick={() => {
              setStatementPaymentError('')
              setStatementPaymentForm({
                date: getLocalTodayISO(),
                amount: remainingBalance > 0 ? String(remainingBalance) : '',
                paymentMethod: loadSettings().paymentMethods[0] ?? '',
                notes: '',
              })
              setStatementPaymentDialogOpen(true)
            }}
            sx={{
              background: '#66bb6a',
              '&:hover': { background: '#66bb6a' },
            }}
          >
            قبض دفعة
          </Button>
          <Button variant="contained" onClick={handleExportCustomerStatementPdf}>
            تصدير PDF
          </Button>
          <Button onClick={() => setCustomerStatementOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={statementPaymentDialogOpen} onClose={() => setStatementPaymentDialogOpen(false)} maxWidth="sm" fullWidth slotProps={craftDialogSlotProps}>
        <DialogTitle>قبض دفعة</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '12px !important' }}>
          {statementPaymentError ? <Alert severity="error" sx={craftErrorAlertSx}>{statementPaymentError}</Alert> : null}
          <DateFilterField
            label="تاريخ الدفعة"
            value={statementPaymentForm.date}
            onChange={(value) => setStatementPaymentForm((prev) => ({ ...prev, date: toInternalDate(value) }))}
            required
          />
          <TextField
            select
            label="طريقة الدفع"
            value={statementPaymentForm.paymentMethod}
            onChange={(event) => setStatementPaymentForm((prev) => ({ ...prev, paymentMethod: event.target.value }))}
            slotProps={darkSelectSlotProps}
            required
          >
            {loadSettings().paymentMethods.map((method) => (
              <MenuItem key={method} value={method}>{method}</MenuItem>
            ))}
          </TextField>
          <TextField label="المبلغ" type="number" value={statementPaymentForm.amount} onChange={(event) => setStatementPaymentForm((prev) => ({ ...prev, amount: event.target.value }))} slotProps={{ htmlInput: { min: 0, step: 1 } }} required />
          <TextField label="ملاحظات" value={statementPaymentForm.notes} onChange={(event) => setStatementPaymentForm((prev) => ({ ...prev, notes: event.target.value }))} multiline minRows={2} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatementPaymentDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" color="primary" startIcon={<FiCheckCircle />} onClick={() => void submitStatementPayment()}>حفظ الدفعة</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(paymentToDelete)}
        onClose={() => { setPaymentToDelete(null); setPaymentDeleteError('') }}
        maxWidth="sm"
        fullWidth
        slotProps={craftDialogSlotProps}
      >
        <DialogTitle>تأكيد حذف الدفعة</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'grid', gap: 1.5 }}>
          {paymentDeleteError ? <Alert severity="error" sx={craftErrorAlertSx}>{paymentDeleteError}</Alert> : null}
          <Typography>
            هل أنت متأكد من حذف الدفعة بتاريخ {paymentToDelete ? formatDateDMY(paymentToDelete.date) : ''} بقيمة {paymentToDelete ? currency(paymentToDelete.amount) : ''}؟
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setPaymentToDelete(null); setPaymentDeleteError('') }}>إلغاء</Button>
          <Button variant="contained" color="error" onClick={() => void handleDeleteCustomerPayment()}>حذف</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(confirmAction)}
        onClose={() => {
          setConfirmAction(null)
          setInvoiceDeleteError('')
        }}
        maxWidth="sm"
        fullWidth
        slotProps={craftDialogSlotProps}
      >
        <DialogTitle>{confirmAction?.type === 'deleteDraft' ? 'تأكيد حذف المسودة' : 'تأكيد حذف الفاتورة'}</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'grid', gap: 1.5 }}>
          {invoiceDeleteError ? <Alert severity="error" sx={craftErrorAlertSx}>{invoiceDeleteError}</Alert> : null}
          <Typography>
            {confirmAction?.type === 'deleteDraft'
              ? `هل أنت متأكد من حذف فاتورة البيع رقم ${confirmAction.invoiceNumber}؟ لا يمكن التراجع عن الحذف.`
              : `هل أنت متأكد من حذف فاتورة البيع رقم ${confirmAction?.invoiceNumber ?? ''} بشكل نهائي؟ سيتم إزالة أثرها من المخزون والدفعات.`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setConfirmAction(null); setInvoiceDeleteError('') }}>إلغاء</Button>
          <Button
            variant="contained"
            color="error"
            onClick={async () => {
              if (!confirmAction) return
              const deleted = confirmAction.type === 'deleteDraft'
                ? await deleteDraft(confirmAction.invoiceId)
                : await deleteApprovedInvoice(confirmAction.invoiceId)

              if (deleted) {
                setConfirmAction(null)
                setInvoiceDeleteError('')
              }
            }}
          >
            {confirmAction?.type === 'deleteDraft' ? 'حذف' : 'حذف نهائي'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(customerToDelete)} onClose={() => { setCustomerToDelete(null); setCustomerDeleteError('') }} maxWidth="sm" fullWidth slotProps={craftDialogSlotProps}>
        <DialogTitle>تأكيد حذف العميل</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {customerDeleteError ? <Alert severity="error" sx={craftErrorAlertSx}>{customerDeleteError}</Alert> : null}
          <Typography>
            {customerToDelete ? `هل أنت متأكد من حذف العميل «${customerToDelete.name}» رقم ${customerToDelete.code}؟ لا يمكن التراجع عن الحذف.` : ''}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCustomerToDelete(null); setCustomerDeleteError('') }}>تراجع</Button>
          <Button
            variant="contained"
            color="error"
            onClick={async () => {
              if (!customerToDelete) return

              try {
                setCustomerDeleteError('')
                await customersService.delete(customerToDelete.id)
                setCustomerToDelete(null)
                await loadData()
                notify.error('تم حذف العميل بنجاح.')
              } catch (error) {
                console.error('DELETE CUSTOMER FAILED', error)
                setCustomerDeleteError(getUserFriendlyErrorMessage(error, 'تعذر حذف العميل. قد يكون مرتبطاً بفواتير أو حركات أخرى، لذلك لا يمكن حذفه حالياً.'))
              }
            }}
          >
            حذف
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={customerFormOpen} onClose={() => setCustomerFormOpen(false)} maxWidth="sm" fullWidth slotProps={craftDialogSlotProps}>
        <DialogTitle>{customerForm.id ? 'تعديل عميل' : 'إضافة عميل'}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '12px !important' }}>
          {customerFormError ? <Alert severity="error" sx={craftErrorAlertSx}>{customerFormError}</Alert> : null}
          <TextField label="رقم العميل" value={customerForm.code} onChange={(event) => setCustomerForm((prev) => ({ ...prev, code: event.target.value }))} required />
          <TextField label="اسم العميل" value={customerForm.name} onChange={(event) => setCustomerForm((prev) => ({ ...prev, name: event.target.value }))} required />
          <TextField label="الهاتف" value={customerForm.phone} onChange={(event) => setCustomerForm((prev) => ({ ...prev, phone: event.target.value }))} />
          <TextField label="العنوان" value={customerForm.address} onChange={(event) => setCustomerForm((prev) => ({ ...prev, address: event.target.value }))} />
          <TextField label="ملاحظات" value={customerForm.notes} onChange={(event) => setCustomerForm((prev) => ({ ...prev, notes: event.target.value }))} multiline minRows={2} />
          <TextField select label="الحالة" value={customerForm.status} onChange={(event) => setCustomerForm((prev) => ({ ...prev, status: event.target.value as 'active' | 'inactive' }))} slotProps={darkSelectSlotProps}>
            <MenuItem value="active">فعال</MenuItem>
            <MenuItem value="inactive">غير فعال</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomerFormOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={() => void saveCustomer()}>حفظ</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={invoiceDialogOpen} onClose={() => {
        setInvoiceDialogOpen(false)
        setEditingInvoiceStatus(null)
        setEditingInvoiceId(null)
      }} fullWidth maxWidth="lg" slotProps={craftInvoiceDialogSlotProps}>
        <DialogTitle>{editingInvoiceId ? 'تعديل مسودة فاتورة بيع' : 'فاتورة بيع جديدة'}</DialogTitle>
        <DialogContent
          ref={invoiceDialogContentRef}
          sx={{ display: 'grid', gap: 2, pt: '12px !important' }}
        >
          {invoiceFormError ? <Alert severity="error" sx={craftErrorAlertSx}>{invoiceFormError}</Alert> : null}

          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
            <TextField label="رقم الفاتورة" value={invoiceNumber} slotProps={{ input: { readOnly: true } }} />
            <DateFilterField
              label="التاريخ"
              value={invoiceDate}
              onChange={(value) => setInvoiceDate(toInternalDate(value))}
              required
            />
            <Autocomplete
              options={activeCustomers}
              getOptionLabel={(option) => `${option.code} - ${option.name}`}
              value={selectedCustomer}
              onChange={(_, value) => setInvoiceCustomerId(value?.id ?? '')}
              slotProps={{ paper: { sx: darkPopupPaperSx } }}
              renderInput={(params) => <TextField {...params} label="العميل" required />}
            />
            <Autocomplete
              options={activeWarehouses}
              getOptionLabel={(option) => option.name}
              value={selectedWarehouse}
              onChange={(_, value) => {
                const warehouseId = value?.id ?? ''
                setInvoiceWarehouseId(warehouseId)
                setWarehouseBalances([])
                setMaterialWarehouseHintLineKey(null)
                setMaterialPickerOpenKey(null)
                setInvoiceFormError('')

                if (!warehouseId) {
                  setWarehouseBalancesLoading(false)
                  return
                }

                setWarehouseBalancesLoading(true)
                void inventoryService
                  .getBalancesByWarehouse(warehouseId)
                  .then((balances) => {
                    setWarehouseBalances(balances)
                  })
                  .catch((error) => {
                    console.error('LOAD SALES WAREHOUSE BALANCES FAILED', error)
                    setWarehouseBalances([])
                    setInvoiceFormError(
                      getUserFriendlyErrorMessage(error, 'تعذر تحميل متوسطات أسعار المخزن.'),
                    )
                    scrollInvoiceDialogToTop()
                  })
                  .finally(() => {
                    setWarehouseBalancesLoading(false)
                  })
              }}
              slotProps={{ paper: { sx: darkPopupPaperSx } }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="المخزن"
                  required
                  helperText={warehouseBalancesLoading ? 'جارٍ تحميل متوسطات أسعار المخزن...' : ''}
                />
              )}
            />
          </Box>

          <TextField label="ملاحظات" value={invoiceNotes} onChange={(event) => setInvoiceNotes(event.target.value)} multiline minRows={2} />

          <SectionCard title="المناديب">
            <Box sx={{ display: 'grid', gap: 1.5 }}>
              {invoiceDelegates.map((invoiceDelegate, index) => (
                <Box key={`${invoiceDelegate.delegateId}-${index}`} sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: '2fr 1fr 1.8fr auto', alignItems: 'center' }}>
                  <TextField
                    select
                    label="المندوب"
                    value={invoiceDelegate.delegateId}
                    onChange={(event) => setInvoiceDelegates((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, delegateId: event.target.value } : item))}
                    slotProps={darkSelectSlotProps}
                  >
                    <MenuItem value="">اختر المندوب</MenuItem>
                    {activeDelegates.filter((delegate) => delegate.id === invoiceDelegate.delegateId || !invoiceDelegates.some((item) => item.delegateId === delegate.id)).map((delegate) => (
                      <MenuItem key={delegate.id} value={delegate.id}>{delegate.code} - {delegate.name}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="النسبة (%)"
                    type="number"
                    value={invoiceDelegate.commissionPercentage}
                    onChange={(event) => setInvoiceDelegates((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, commissionPercentage: event.target.value === '' ? '' : Number(event.target.value) } : item))}
                    slotProps={{ htmlInput: { min: 0, max: 100, step: 1 } }}
                  />
                  <TextField
                    label="ملاحظات"
                    value={invoiceDelegate.notes}
                    onChange={(event) => setInvoiceDelegates((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, notes: event.target.value } : item))}
                    multiline
                    minRows={1}
                  />
                  <IconButton
                  color="error"
                    onClick={() => setInvoiceDelegates((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                  >
                    <FiTrash2 />
                  </IconButton>
                </Box>
              ))}
              <Button
                variant="outlined"
                startIcon={<FiPlus />}
                disabled={activeDelegates.length === invoiceDelegates.length}
                onClick={() => {
                  const next = activeDelegates.find((delegate) => !invoiceDelegates.some((item) => item.delegateId === delegate.id))
                  if (next) setInvoiceDelegates((prev) => [...prev, { delegateId: next.id, commissionPercentage: 0, notes: '' }])
                }}
              >
                إضافة مندوب
              </Button>
            </Box>
          </SectionCard>

          <SectionCard title="مواد الفاتورة">
            <Box sx={{ display: 'grid', gap: 2 }}>
              {invoiceLines.map((line) => {
                const material = materialById.get(line.materialId) ?? null
                const lineTotal = (typeof line.quantity === 'number' ? line.quantity : 0) * (typeof line.unitPrice === 'number' ? line.unitPrice : 0)

                return (
                  <Box key={line.key} sx={{ p: 2, borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.14)', background: 'rgba(255, 255, 255, 0.035)' }}>
                    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', alignItems: 'center' }}>
                      <Autocomplete
                        options={materialOptions}
                        value={material}
                        disabled={warehouseBalancesLoading}
                        open={materialPickerOpenKey === line.key}
                        slotProps={{ paper: { sx: darkPopupPaperSx } }}
                        onOpen={() => {
                          if (!invoiceWarehouseId) {
                            setMaterialWarehouseHintLineKey(line.key)
                            setMaterialPickerOpenKey(null)
                            return
                          }

                          setMaterialWarehouseHintLineKey(null)
                          setMaterialPickerOpenKey(line.key)
                        }}
                        onClose={() => {
                          setMaterialPickerOpenKey((current) => current === line.key ? null : current)
                        }}
                        getOptionLabel={(option) => option?.name ?? ''}
                        onChange={(_, value) => {
                          if (!value) {
                            setInvoiceLines((prev) => prev.map((item) => item.key === line.key ? { ...item, materialId: '', unit: '', unitPrice: '', quantity: item.quantity || '' } : item))
                            return
                          }

                          if (!invoiceWarehouseId) {
                            setInvoiceFormError('اختر المخزن أولاً حتى يتم تحميل متوسط سعر المادة.')
                            scrollInvoiceDialogToTop()
                            return
                          }

                          if (invoiceLines.some((current) => current.key !== line.key && current.materialId === value.id)) {
                            setInvoiceFormError('المادة مضافة مسبقاً إلى الفاتورة.')
                            return
                          }

                          const settings = loadSettings()
                          const balance = warehouseBalanceByMaterial.get(value.id)
                          const averageCost = Number(balance?.averageCost ?? 0)

                          let defaultUnitPrice = 0

                          if (settings.defaultSalesPriceType === 'average') {
                            defaultUnitPrice = Number.isFinite(averageCost) ? averageCost : 0
                          } else if (settings.defaultSalesPriceType === 'price1') {
                            defaultUnitPrice = Number(value.price1 ?? 0)
                          } else if (settings.defaultSalesPriceType === 'price2') {
                            defaultUnitPrice = Number(value.price2 ?? 0)
                          } else if (settings.defaultSalesPriceType === 'price3') {
                            defaultUnitPrice = Number(value.price3 ?? 0)
                          }

                          setInvoiceLines((prev) => prev.map((item) => item.key === line.key ? {
                            ...item,
                            materialId: value.id,
                            unit: value.unit ?? '',
                            unitPrice: defaultUnitPrice,
                            quantity: typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1,
                          } : item))
                          setMaterialWarehouseHintLineKey(null)
                          setInvoiceFormError('')
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="المادة"
                            required
                            onClick={() => {
                              if (!invoiceWarehouseId) {
                                setMaterialWarehouseHintLineKey(line.key)
                              }
                            }}
                            helperText={
                              !invoiceWarehouseId && materialWarehouseHintLineKey === line.key
                                ? 'اختر المخزن أولاً ليظهر متوسط سعر المادة.'
                                : warehouseBalancesLoading
                                  ? 'جارٍ تحميل متوسطات الأسعار...'
                                  : ''
                            }
                          />
                        )}
                      />
                      <TextField label="الوحدة" value={line.unit} slotProps={{ input: { readOnly: true } }} />
                      <TextField
                        label="الكمية"
                        type="number"
                        value={line.quantity}
                        onChange={(event) => {
                          const raw = event.target.value
                          setInvoiceLines((prev) => prev.map((item) => item.key === line.key ? { ...item, quantity: raw === '' ? '' : Number(raw) } : item))
                        }}
                        slotProps={{ htmlInput: { min: 0, step: 1 } }}
                        required
                      />
                      <TextField
                        label="سعر البيع"
                        type="number"
                        value={line.unitPrice}
                        onChange={(event) => {
                          const raw = event.target.value
                          setInvoiceLines((prev) => prev.map((item) => item.key === line.key ? { ...item, unitPrice: raw === '' ? '' : Number(raw) } : item))
                        }}
                        slotProps={{ htmlInput: { min: 0, step: 1 } }}
                        required
                      />
                      <TextField label="الاجمالي" value={priceNum(lineTotal)} slotProps={{ input: { readOnly: true } }} />
                    </Box>
                    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr auto', mt: 2 }}>
                      <TextField
                        label="ملاحظات"
                        value={line.notes}
                        onChange={(event) => {
                          const value = event.target.value
                          setInvoiceLines((prev) => prev.map((item) => item.key === line.key ? { ...item, notes: value } : item))
                        }}
                        fullWidth
                      />
                      <Button color="error" onClick={() => setInvoiceLines((prev) => prev.filter((item) => item.key !== line.key))} disabled={invoiceLines.length === 1}>
                        حذف السطر
                      </Button>
                    </Box>
                  </Box>
                )
              })}

              <Button variant="outlined" startIcon={<FiPlus />} onClick={() => setInvoiceLines((prev) => [...prev, createEmptyLine()])}>
                إضافة مادة
              </Button>
            </Box>
          </SectionCard>

          <SectionCard title="الحسم والاجماليات">
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
              <TextField
                select
                label="نوع الحسم"
                value={discountType}
                onChange={(event) => {
                  const nextDiscountType = event.target.value as DiscountType
                  setDiscountType(nextDiscountType)
                  setDiscountValue(0)
                }}
                slotProps={darkSelectSlotProps}
              >
                <MenuItem value="none">بدون حسم</MenuItem>
                <MenuItem value="percentage">نسبة مئوية</MenuItem>
                <MenuItem value="fixed">مبلغ ثابت</MenuItem>
              </TextField>
              <TextField
                label={discountType === 'percentage' ? 'نسبة الحسم (%)' : 'قيمة الحسم'}
                type="number"
                value={discountValue}
                disabled={discountType === 'none'}
                onChange={(event) => {
                  const raw = event.target.value
                  setDiscountValue(raw === '' ? '' : Number(raw))
                }}
                slotProps={{
                  htmlInput: { min: 0, max: discountType === 'percentage' ? 100 : undefined, step: 1 },
                  input: discountType === 'percentage'
                    ? { endAdornment: <InputAdornment position="end">%</InputAdornment> }
                    : undefined,
                }}
              />
            </Box>
            <Table sx={{ mt: 2, width: '100%', minWidth: discountType === 'percentage' ? 760 : 620, '& td, & th': { textAlign: 'center' } }}>
              <TableHead>
                <TableRow sx={{ background: 'rgba(255, 255, 255, 0.055)', textAlignLast: 'center' }}>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الاجمالي قبل الحسم</TableCell>
                  {discountType === 'percentage' ? (
                    <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>نسبة الحسم</TableCell>
                  ) : null}
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>قيمة الحسم</TableCell>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الصافي</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow sx={{ textAlignLast: 'center' }}>
                  <TableCell sx={{ textAlign: 'center' }}>{priceSym(subtotal)}</TableCell>
                  {discountType === 'percentage' ? (
                    <TableCell sx={{ textAlign: 'center' }}>{formatDiscountPercentage(discountValue)}</TableCell>
                  ) : null}
                  <TableCell sx={{ textAlign: 'center' }}>{priceSym(discountAmount)}</TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>{priceSym(netTotal)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </SectionCard>

          {(!editingInvoiceId || editingInvoiceStatus === 'draft') && (
            <SectionCard title="سند قبض">
              <Box sx={{ display: 'grid', gap: 2 }}>
                {invoicePayments.length > 0 && (
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ background: 'rgba(255, 255, 255, 0.055)' }}>
                        <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>المبلغ</TableCell>
                        <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>طريقة الدفع</TableCell>
                        <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>ملاحظات</TableCell>
                        <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>إجراء</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invoicePayments.map((p, idx) => (
                        <TableRow key={idx}>
                          <TableCell sx={{ textAlign: 'center' }}>{currency(Number(p.amount))}</TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>{p.paymentMethod}</TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>{p.notes}</TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            <IconButton color="error" size="small" onClick={() => setInvoicePayments(prev => prev.filter((_, i) => i !== idx))}><FiTrash2 /></IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                <Box>
                  <Button variant="outlined" onClick={() => {
                    const remaining = Math.max(netTotal - totalDirectPayments, 0)
                    setDirectPaymentForm({ amount: remaining > 0 ? String(remaining) : '', paymentMethod: loadSettings().paymentMethods[0] || '', notes: '' })
                    setDirectPaymentError('')
                    setDirectPaymentDialogOpen(true)
                  }}>
                    قبض دفعة
                  </Button>
                </Box>
              </Box>
            </SectionCard>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setInvoiceDialogOpen(false)}>إلغاء</Button>
          {editingInvoiceId && editingInvoiceStatus === 'completed' ? (
            <Button variant="contained" onClick={() => void saveDraft()} disabled={saving}>{saving ? <CircularProgress size={18} /> : 'حفظ التعديلات'}</Button>
          ) : (
            <Button variant="contained" startIcon={<FiCheckCircle />} onClick={() => void completeDraft()} disabled={saving}>
              {saving ? <CircularProgress size={18} /> : 'اعتماد الفاتورة'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} fullWidth maxWidth="lg" slotProps={craftDialogSlotProps}>
        <DialogTitle>تفاصيل فاتورة البيع</DialogTitle>
        <DialogContent>
          {!selectedInvoice ? (
            <Box sx={{ display: 'grid', placeItems: 'center', p: 4 }}><CircularProgress /></Box>
          ) : (
            <Box sx={{ display: 'grid', gap: 2 }}>
              <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
                <Box>رقم الفاتورة: <strong>{selectedInvoice.invoiceNumber}</strong></Box>
                <Box>التاريخ: <strong>{formatDateDMY(selectedInvoice.date)}</strong></Box>
                <Box>العميل: <strong>{selectedInvoice.customerName}</strong></Box>
                <Box>المخزن: <strong>{selectedInvoice.warehouseName}</strong></Box>
                <Box>حالة الدفع: <strong>{paymentStatusLabel[selectedInvoice.paymentStatus]}</strong></Box>
              </Box>

              <Table>
                <TableHead>
                  <TableRow sx={{ background: 'rgba(255, 255, 255, 0.055)', textAlignLast: 'center' }}>
                    <TableCell sx={{ textAlign: 'center' }}>المادة</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>الوحدة</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>الكمية</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>سعر البيع</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>الاجمالي</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>ملاحظات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedInvoice.items.map((item) => (
                    <TableRow key={item.id} sx={{ textAlignLast: 'center' }}>
                      <TableCell sx={{ textAlign: 'center' }}>{item.materialNumber} - {item.materialName}</TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>{item.unit}</TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>{item.quantity}</TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>{priceNum(item.unitPrice)}</TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>{priceNum(item.lineTotal)}</TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>{item.notes?.trim() ? item.notes : ''}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>ملاحظات الفاتورة</TableCell>
                    <TableCell colSpan={5} sx={{ textAlign: 'center' }}>{selectedInvoice.notes?.trim() ? selectedInvoice.notes : ''}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {(selectedInvoice.delegates ?? []).length > 0 ? (
                <Table>
                  <TableHead><TableRow sx={{ textAlignLast: 'center' }}><TableCell sx={{ textAlign: 'center' }}>المندوب</TableCell><TableCell sx={{ textAlign: 'center' }}>نسبة العمولة</TableCell><TableCell sx={{ textAlign: 'center' }}>ملاحظات</TableCell><TableCell sx={{ textAlign: 'center' }}>مبلغ العمولة</TableCell></TableRow></TableHead>
                  <TableBody>
                    {selectedInvoice.delegates.map((delegate) => (
                      <TableRow key={delegate.delegateId} sx={{ textAlignLast: 'center' }}>
                        <TableCell sx={{ textAlign: 'center' }}>{delegate.delegateName}</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>{delegate.commissionPercentage}%</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>{delegate.notes?.trim() ? delegate.notes : ''}</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>{currency((selectedInvoice.netTotal * delegate.commissionPercentage) / 100)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : null}

              <Table sx={{ width: '100%', minWidth: selectedInvoice.discountType === 'percentage' ? 760 : 620, '& td, & th': { textAlign: 'center' } }}>
                <TableHead>
                  <TableRow sx={{ background: 'rgba(255, 255, 255, 0.055)', textAlignLast: 'center' }}>
                    <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الاجمالي قبل الحسم</TableCell>
                    {selectedInvoice.discountType === 'percentage' ? (
                      <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>نسبة الحسم</TableCell>
                    ) : null}
                    <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>قيمة الحسم</TableCell>
                    <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الصافي</TableCell>
                    <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>المدفوع</TableCell>
                    <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>المتبقي</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow sx={{ textAlignLast: 'center' }}>
                    <TableCell sx={{ textAlign: 'center' }}>{priceSym(selectedInvoice.subtotal)}</TableCell>
                    {selectedInvoice.discountType === 'percentage' ? (
                      <TableCell sx={{ textAlign: 'center' }}>{formatDiscountPercentage(selectedInvoice.discountValue)}</TableCell>
                    ) : null}
                    <TableCell sx={{ textAlign: 'center' }}>{priceSym(selectedInvoice.discountAmount)}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{priceSym(selectedInvoice.netTotal)}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{priceSym(selectedInvoice.paidAmount)}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{priceSym(selectedInvoice.remainingAmount)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {selectedInvoice.customerCredit > 0 ? (
                <Box sx={{ fontWeight: 700, color: 'success.main' }}>
                  رصيد لصالح العميل: {currency(selectedInvoice.customerCredit)}
                </Box>
              ) : null}

              <SectionCard title="سجل الدفعات">
                {selectedInvoice.payments.length === 0 ? (
                  <Typography>لا توجد دفعات مسجلة.</Typography>
                ) : (
                  <Table>
                    <TableHead>
                      <TableRow sx={{ background: 'rgba(255, 255, 255, 0.055)', textAlignLast: 'center' }}>
                        <TableCell sx={{ textAlign: 'center' }}>التاريخ</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>المبلغ</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>طريقة الدفع</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>الملاحظات</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>الإجراءات</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paymentRows.map((payment) => (
                        <TableRow key={payment.id} sx={{ textAlignLast: 'center' }}>
                          <TableCell sx={{ textAlign: 'center' }}>{formatDateDMY(payment.date)}</TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>{priceNum(Number(payment.amount))}</TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>{payment.paymentMethod || '—'}</TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>{payment.notes || ''}</TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                setPaymentDeleteErrorState('')
                                setPaymentDeleteConfirm({ paymentId: payment.id, paymentDate: payment.date, paymentAmount: Number(payment.amount ?? 0) })
                              }}
                            >
                              <FiTrash2 />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </SectionCard>
            </Box>
            )}
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => { void handleExportPdf() }} disabled={!selectedInvoice}>تصدير PDF</Button>
          {selectedInvoice?.status === 'completed' ? (
            <Button
              variant="outlined"
              color="primary"
              onClick={() => {
                if (!selectedInvoice) return
                setDetailsOpen(false)
                navigate(`/sales-returns?invoiceId=${selectedInvoice.id}`)
              }}
            >
              إنشاء مرتجع بيع
            </Button>
          ) : null}
          <Button onClick={() => setDetailsOpen(false)}>إلغاء</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={directPaymentDialogOpen} onClose={() => setDirectPaymentDialogOpen(false)} maxWidth="sm" fullWidth slotProps={craftDialogSlotProps}>
        <DialogTitle>قبض دفعة</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '12px !important' }}>
          {directPaymentError ? <Alert severity="error" sx={craftErrorAlertSx}>{directPaymentError}</Alert> : null}
          <TextField
            select
            label="طريقة الدفع"
            value={directPaymentForm.paymentMethod}
            onChange={(e) => setDirectPaymentForm((prev: typeof directPaymentForm) => ({ ...prev, paymentMethod: e.target.value }))}
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
            value={directPaymentForm.amount}
            onChange={(e) => setDirectPaymentForm((prev: typeof directPaymentForm) => ({ ...prev, amount: e.target.value }))}
            slotProps={{ htmlInput: { min: 0, step: 1 } }}
            required
          />
          <TextField
            label="ملاحظات"
            value={directPaymentForm.notes}
            onChange={(e) => setDirectPaymentForm((prev: typeof directPaymentForm) => ({ ...prev, notes: e.target.value }))}
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDirectPaymentDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" color="primary" startIcon={<FiCheckCircle />} onClick={() => {
            const amount = Number(directPaymentForm.amount)
            if (!directPaymentForm.paymentMethod) {
              setDirectPaymentError('طريقة الدفع مطلوبة.')
              return
            }
            if (!Number.isFinite(amount) || amount <= 0) {
              setDirectPaymentError('المبلغ يجب أن يكون أكبر من صفر.')
              return
            }
            const maxAllowed = netTotal - totalDirectPayments + 0.000001
            if (amount > maxAllowed) {
              setDirectPaymentError('اجمالي الدفعات يتجاوز الصافي المستحق.')
              return
            }
            setInvoicePayments(prev => [...prev, {
              key: crypto.randomUUID(),
              amount,
              paymentMethod: directPaymentForm.paymentMethod,
              notes: directPaymentForm.notes
            }])
            setDirectPaymentDialogOpen(false)
          }}>
            قبض الدفعة
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(paymentDeleteConfirm)}
        onClose={() => {
          setPaymentDeleteConfirm(null)
          setPaymentDeleteErrorState('')
        }}
        maxWidth="sm"
        fullWidth
        slotProps={craftDialogSlotProps}
      >
        <DialogTitle>حذف دفعة</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'grid', gap: 1.5 }}>
          {paymentDeleteErrorState ? <Alert severity="error" sx={craftErrorAlertSx}>{paymentDeleteErrorState}</Alert> : null}
          <Typography>هل أنت متأكد من حذف الدفعة بتاريخ {paymentDeleteConfirm ? formatDateDMY(paymentDeleteConfirm.paymentDate) : ''} بمبلغ {paymentDeleteConfirm ? priceSym(paymentDeleteConfirm.paymentAmount) : ''}؟</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setPaymentDeleteConfirm(null); setPaymentDeleteErrorState('') }}>إلغاء</Button>
          <Button
            variant="contained"
            color="error"
            onClick={async () => {
              if (!paymentDeleteConfirm) return
              await deletePayment(paymentDeleteConfirm.paymentId)
            }}
          >
            حذف
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}