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
import { SectionCard } from '../components/ui/SectionCard'
import { PageHeader } from '../components/ui/PageHeader'
import { SearchField } from '../components/ui/SearchField'
import { inventoryService, type WarehouseRecord } from '../services/inventoryService'
import { materialsService, type MaterialRecord } from '../services/materialsService'
import { loadCompanyPrintSettings } from '../services/companyPrintSettingsService'
import {
  purchasesService,
  suppliersService,
  type DiscountType,
  type PaymentStatus,
  type PurchaseInvoiceDetails,
  type PurchaseInvoiceListItem,
  type PurchaseInvoiceStatus,
  type SupplierRecord,
} from '../services/purchasesService'
import type { InvoicePrintData } from '../types/invoicePrint'
import { useLocation, useNavigate } from 'react-router-dom'
import { getUserFriendlyErrorMessage } from '../utils/errorMessages'
import { formatDateDMY, formatDisplayNumber, toInternalDate } from '../utils/displayFormatting'


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

type InvoiceLine = {
  key: string
  materialId: string
  quantity: number | ''
  unitPrice: number | ''
  notes: string
}

type SupplierForm = {
  id?: string
  code: string
  name: string
  phone: string
  address: string
  notes: string
  status: 'active' | 'inactive'
}

const paymentStatusLabel: Record<PaymentStatus, string> = {
  unpaid: 'غير مدفوع',
  partial: 'مدفوع جزئياً',
  paid: 'مدفوع بالكامل',
}

function currency(value: number): string {
  return formatDisplayNumber(value, 2)
}

function DateFilterField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
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
        value={value ? formatDateDMY(value) : ''}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onClick={openDatePicker}
        placeholder="DD/MM/YYYY"
        slotProps={{
          htmlInput: {
            inputMode: 'numeric',
            pattern: '[0-9\\/]*'
          },
          inputLabel: {
            shrink,
            // keep the rest-state label clear of the reserved calendar icon zone
            sx: {
              '&:not(.MuiInputLabel-shrink)': {
                transform: 'translate(46px, 16px) scale(1)',
              },
            },
          },
          input: {
            startAdornment: (
              <InputAdornment position="start" sx={{ marginInlineEnd: 1 }}>
                <IconButton
                  size="small"
                  onClick={openDatePicker}
                  edge="start"
                  aria-label="اختيار التاريخ"
                  sx={{
                    color: '#E2E8F0',
                    background: 'transparent',
                    '&:hover': {
                      color: '#67E8F9',
                      background: 'transparent',
                    },
                  }}
                >
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
        style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, opacity: 0, pointerEvents: 'none', colorScheme: 'dark' }}
        tabIndex={-1}
        aria-hidden="true"
      />
    </Box>
  )
}

function flattenSubStockMaterials(nodes: MaterialRecord[]): MaterialRecord[] {
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

function createEmptyLine(): InvoiceLine {
  return {
    key: crypto.randomUUID(),
    materialId: '',
    quantity: '',
    unitPrice: '',
    notes: '',
  }
}

export function PurchasesPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([])
  const [activeSuppliers, setActiveSuppliers] = useState<SupplierRecord[]>([])
  const [activeWarehouses, setActiveWarehouses] = useState<WarehouseRecord[]>([])
  const [materialOptions, setMaterialOptions] = useState<MaterialRecord[]>([])
  const [invoices, setInvoices] = useState<PurchaseInvoiceListItem[]>([])

  const location = useLocation()
  const navigate = useNavigate()
  const isSuppliersPage = location.pathname === '/suppliers'
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('')

  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [supplierPage, setSupplierPage] = useState(0)
  const [supplierRowsPerPage, setSupplierRowsPerPage] = useState(10)

  const [suppliersOpen, setSuppliersOpen] = useState(false)
  const [supplierFormOpen, setSupplierFormOpen] = useState(false)
  const [supplierFormError, setSupplierFormError] = useState('')
  const [supplierForm, setSupplierForm] = useState<SupplierForm>({
    code: '',
    name: '',
    phone: '',
    address: '',
    notes: '',
    status: 'active',
  })
  const [supplierToDelete, setSupplierToDelete] = useState<SupplierRecord | null>(null)
  const [supplierDeleteError, setSupplierDeleteError] = useState('')

  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false)
  const [invoiceFormError, setInvoiceFormError] = useState('')
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null)
  const [editingInvoiceStatus, setEditingInvoiceStatus] = useState<PurchaseInvoiceStatus | null>(null)
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [invoiceSupplierId, setInvoiceSupplierId] = useState('')
  const [invoiceWarehouseId, setInvoiceWarehouseId] = useState('')
  const [discountType, setDiscountType] = useState<DiscountType>('none')
  const [discountValue, setDiscountValue] = useState<number | ''>(0)
  const [invoiceExpenses, setInvoiceExpenses] = useState<number | ''>(0)
  const [invoiceNotes, setInvoiceNotes] = useState('')
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLine[]>([createEmptyLine()])

  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoiceDetails | null>(null)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'deleteDraft' | 'deleteApprovedInvoice'
    invoiceId: string
    invoiceNumber: string
  } | null>(null)
  const [invoiceDeleteError, setInvoiceDeleteError] = useState('')
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [paymentForm, setPaymentForm] = useState({ date: '', amount: '', notes: '' })
  const [paymentDeleteConfirm, setPaymentDeleteConfirm] = useState<{
    paymentId: string
    paymentDate: string
    paymentAmount: number
  } | null>(null)
  const [paymentDeleteError, setPaymentDeleteError] = useState('')

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
    if (!invoiceDialogOpen || !invoiceFormError) {
      return
    }

    scrollInvoiceDialogToTop()
  }, [invoiceDialogOpen, invoiceFormError, scrollInvoiceDialogToTop])

  const subtotal = useMemo(() => {
    return invoiceLines.reduce((sum, line) => {
      const quantity = typeof line.quantity === 'number' ? line.quantity : 0
      const unitPrice = typeof line.unitPrice === 'number' ? line.unitPrice : 0
      return sum + quantity * unitPrice
    }, 0)
  }, [invoiceLines])

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

  const invoiceExpensesAmount = useMemo(() => (typeof invoiceExpenses === 'number' ? invoiceExpenses : 0), [invoiceExpenses])
  const netTotal = useMemo(() => subtotal - discountAmount + invoiceExpensesAmount, [subtotal, discountAmount, invoiceExpensesAmount])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [allSuppliers, onlyActiveSuppliers, warehouses, materials] = await Promise.all([
        suppliersService.list(),
        suppliersService.listActive(),
        inventoryService.listWarehouses(),
        materialsService.listMaterials(),
      ])
      setSuppliers(allSuppliers)
      setActiveSuppliers(onlyActiveSuppliers)
      setActiveWarehouses(warehouses.filter((warehouse) => warehouse.status === 'active'))
      setMaterialOptions(flattenSubStockMaterials(materials))
      const list = await purchasesService.listInvoices({
        reference: search || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        supplierId: supplierFilter || undefined,
        warehouseId: warehouseFilter || undefined,
      })
      setInvoices(list)
    } catch (error) {
      console.error('LOAD PURCHASES DATA FAILED', error)
    } finally {
      setLoading(false)
    }
  }, [search, fromDate, toDate, supplierFilter, warehouseFilter])

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadData()
    }, 0)

    return () => window.clearTimeout(timerId)
  }, [loadData])

  const reloadInvoices = useCallback(async () => {
    const list = await purchasesService.listInvoices({
      reference: search || undefined,
      fromDate: toInternalDate(fromDate) || undefined,
      toDate: toInternalDate(toDate) || undefined,
      supplierId: supplierFilter || undefined,
      warehouseId: warehouseFilter || undefined,
    })
    setInvoices(list)
  }, [search, fromDate, toDate, supplierFilter, warehouseFilter])

  const buildPurchaseExportData = useCallback((): InvoicePrintData | null => {
    if (!selectedInvoice) {
      return null
    }

    return {
      documentType: 'purchase',
      title: 'فاتورة مشتريات',
      documentNumber: selectedInvoice.invoiceNumber,
      date: formatDateDMY(selectedInvoice.date),
      partyLabel: 'المورد',
      partyName: selectedInvoice.supplierName,
      warehouseName: selectedInvoice.warehouseName,
      referenceLabel: 'رقم فاتورة المورد',
      referenceValue: selectedInvoice.supplierInvoiceNumber || '—',
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
      additionalFees: selectedInvoice.expenses ?? 0,
      total: selectedInvoice.netTotal,
    }
  }, [selectedInvoice])

  const handleExportPdf = useCallback(() => {
    const exportData = buildPurchaseExportData()
    if (!exportData) {
      return
    }

    const latestSettings = loadCompanyPrintSettings()
    navigate('/invoice-preview', {
      state: {
        invoiceData: exportData,
        settings: latestSettings,
      },
    })
  }, [buildPurchaseExportData, navigate])

  const materialById = useMemo(() => {
    return new Map(materialOptions.map((item) => [item.id, item]))
  }, [materialOptions])

  const validateInvoiceForm = useCallback((): string | null => {
    if (!invoiceDate) return 'تاريخ الفاتورة مطلوب.'
    if (!invoiceSupplierId) return 'اختر المورد.'
    if (!invoiceWarehouseId) return 'اختر المخزن.'
    if (!invoiceLines.length) return 'أضف مادة واحدة على الأقل إلى الفاتورة.'

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
      return 'قيمة الحسم لا يمكن أن تتجاوز إجمالي الفاتورة.'
    }

    return null
  }, [invoiceDate, invoiceSupplierId, invoiceWarehouseId, invoiceLines, materialById, discountValue, discountType, discountAmount, subtotal])

  const buildInvoicePayload = useCallback(() => {
    return {
      invoiceNumber,
      supplierInvoiceNumber,
      date: toInternalDate(invoiceDate),
      supplierId: invoiceSupplierId,
      warehouseId: invoiceWarehouseId,
      discountType,
      discountValue: typeof discountValue === 'number' ? discountValue : 0,
      expenses: typeof invoiceExpenses === 'number' ? invoiceExpenses : 0,
      notes: invoiceNotes,
      items: invoiceLines.map((line) => ({
        materialId: line.materialId,
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
        notes: line.notes,
      })),
    }
  }, [invoiceNumber, supplierInvoiceNumber, invoiceDate, invoiceSupplierId, invoiceWarehouseId, discountType, discountValue, invoiceNotes, invoiceLines, invoiceExpenses])

  const resetInvoiceForm = useCallback(async () => {
    const draftData = await purchasesService.getNextDraftData()
    setInvoiceNumber(draftData.invoiceNumber)
    setInvoiceDate(draftData.date)
    setSupplierInvoiceNumber('')
    setInvoiceSupplierId('')
    setInvoiceWarehouseId('')
    setDiscountType('none')
    setDiscountValue(0)
    setInvoiceExpenses(0)
    setInvoiceNotes('')
    setInvoiceLines([createEmptyLine()])
    setEditingInvoiceId(null)
    setEditingInvoiceStatus('draft')
    setInvoiceFormError('')
  }, [])

  const openCreateInvoiceDialog = useCallback(async () => {
    try {
      await resetInvoiceForm()
      setInvoiceDialogOpen(true)
    } catch (error) {
      console.error('OPEN CREATE INVOICE DIALOG FAILED', error)
      setInvoiceFormError(getUserFriendlyErrorMessage(error, 'تعذر فتح شاشة الفاتورة.'))
      scrollInvoiceDialogToTop()
    }
  }, [resetInvoiceForm, scrollInvoiceDialogToTop])

  const openEditInvoiceDialog = useCallback(async (invoiceId: string) => {
    try {
      const invoice = await purchasesService.getInvoiceById(invoiceId)
      if (invoice.status !== 'draft' && invoice.status !== 'completed') {
        return
      }
      setEditingInvoiceId(invoice.id)
      setEditingInvoiceStatus(invoice.status)
      setInvoiceNumber(invoice.invoiceNumber)
      setSupplierInvoiceNumber(invoice.supplierInvoiceNumber ?? '')
      setInvoiceDate(invoice.date)
      setInvoiceSupplierId(invoice.supplierId)
      setInvoiceWarehouseId(invoice.warehouseId)
      setDiscountType(invoice.discountType)
      setDiscountValue(invoice.discountValue)
      setInvoiceExpenses(invoice.expenses ?? 0)
      setInvoiceNotes(invoice.notes ?? '')
      setInvoiceLines(
        invoice.items.map((item) => ({
          key: item.id,
          materialId: item.materialId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          notes: item.notes ?? '',
        }))
      )
      setInvoiceFormError('')
      setInvoiceDialogOpen(true)
    } catch (error) {
      console.error('OPEN EDIT INVOICE DIALOG FAILED', error)
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
          await purchasesService.updateApproved(editingInvoiceId, payload)
        } else {
          await purchasesService.updateDraft(editingInvoiceId, payload)
        }
      } else {
        await purchasesService.createDraft(payload)
      }
      setInvoiceDialogOpen(false)
      await loadData()
    } catch (error) {
      console.error('SAVE PURCHASE DRAFT FAILED', error)
      setInvoiceFormError(getUserFriendlyErrorMessage(error, 'تعذر حفظ مسودة الفاتورة. يرجى المحاولة مرة أخرى.'))
      scrollInvoiceDialogToTop()
    } finally {
      setSaving(false)
    }
  }, [validateInvoiceForm, buildInvoicePayload, editingInvoiceId, editingInvoiceStatus, loadData, scrollInvoiceDialogToTop])

  const completeDraft = useCallback(async () => {
    const validationError = validateInvoiceForm()
    if (validationError) {
      setInvoiceFormError(validationError)
      scrollInvoiceDialogToTop()
      return
    }

    try {
      setSaving(true)
      setInvoiceFormError('')
      let targetInvoiceId = editingInvoiceId
      if (!targetInvoiceId) {
        const created = await purchasesService.createDraft(buildInvoicePayload())
        targetInvoiceId = created.id
        setEditingInvoiceId(created.id)
      } else {
        await purchasesService.updateDraft(targetInvoiceId, buildInvoicePayload())
      }
      await purchasesService.complete(targetInvoiceId)
      setInvoiceDialogOpen(false)
      await loadData()
    } catch (error) {
      console.error('APPROVE PURCHASE FAILED', error)
      setInvoiceFormError(getUserFriendlyErrorMessage(error, 'تعذر اعتماد الفاتورة. يرجى مراجعة البيانات والمحاولة مرة أخرى.'))
      scrollInvoiceDialogToTop()
    } finally {
      setSaving(false)
    }
  }, [validateInvoiceForm, editingInvoiceId, buildInvoicePayload, loadData, scrollInvoiceDialogToTop])

  const deleteDraft = useCallback(async (invoiceId: string): Promise<boolean> => {
    try {
      setInvoiceDeleteError('')
      await purchasesService.deleteDraft(invoiceId)
      await reloadInvoices()
      return true
    } catch (error) {
      console.error('DELETE PURCHASE DRAFT FAILED', error)
      setInvoiceDeleteError(
        getUserFriendlyErrorMessage(
          error,
          'تعذر حذف مسودة فاتورة الشراء. قد تكون الفاتورة مرتبطة ببيانات أخرى أو لم تعد قابلة للحذف.',
        ),
      )
      return false
    }
  }, [reloadInvoices])

  const deleteApprovedInvoice = useCallback(async (invoiceId: string): Promise<boolean> => {
    try {
      setInvoiceDeleteError('')
      await purchasesService.deleteApproved(invoiceId)
      await reloadInvoices()
      if (detailsOpen && selectedInvoice?.id === invoiceId) {
        const refreshed = await purchasesService.getInvoiceById(invoiceId)
        setSelectedInvoice(refreshed)
      }
      return true
    } catch (error) {
      console.error('DELETE APPROVED PURCHASE INVOICE FAILED', error)
      setInvoiceDeleteError(
        getUserFriendlyErrorMessage(
          error,
          'تعذر حذف فاتورة الشراء. قد تكون مرتبطة بمرتجع أو دفعات أو حركات أخرى تمنع حذفها.',
        ),
      )
      return false
    }
  }, [reloadInvoices, detailsOpen, selectedInvoice])

  const openPaymentDialog = useCallback(() => {
    if (!selectedInvoice) {
      return
    }
    setPaymentError('')
    setPaymentForm({
      date: toInternalDate(selectedInvoice.date || new Date().toISOString().slice(0, 10)),
      amount: '',
      notes: '',
    })
    setPaymentDialogOpen(true)
  }, [selectedInvoice])

  const submitPayment = useCallback(async () => {
    if (!selectedInvoice) {
      return
    }

    const amount = Number(paymentForm.amount)
    if (!paymentForm.date) {
      setPaymentError('تاريخ الدفعة مطلوب.')
      return
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError('قيمة الدفعة يجب أن تكون أكبر من صفر.')
      return
    }
    if (amount > selectedInvoice.remainingAmount + 0.000001) {
      setPaymentError('لا يمكن تسجيل دفعة تتجاوز المبلغ المتبقي على الفاتورة.')
      return
    }

    try {
      setPaymentError('')
      await purchasesService.addPayment(selectedInvoice.id, {
        date: toInternalDate(paymentForm.date),
        amount,
        notes: paymentForm.notes,
      })
      setPaymentDialogOpen(false)
      const refreshed = await purchasesService.getInvoiceById(selectedInvoice.id)
      setSelectedInvoice(refreshed)
      await reloadInvoices()
    } catch (error) {
      console.error('ADD PURCHASE PAYMENT FAILED', error)
      setPaymentError(getUserFriendlyErrorMessage(error, 'تعذر تسجيل الدفعة.'))
    }
  }, [paymentForm, reloadInvoices, selectedInvoice])

  const deletePayment = useCallback(async (paymentId: string): Promise<boolean> => {
    try {
      setPaymentDeleteError('')
      await purchasesService.deletePayment(paymentId)
      if (selectedInvoice) {
        const refreshed = await purchasesService.getInvoiceById(selectedInvoice.id)
        setSelectedInvoice(refreshed)
      }
      await reloadInvoices()
      setPaymentDeleteConfirm(null)
      return true
    } catch (error) {
      console.error('DELETE PURCHASE PAYMENT FAILED', error)
      setPaymentDeleteError(
        getUserFriendlyErrorMessage(
          error,
          'تعذر حذف الدفعة. قد تكون الدفعة أو الفاتورة مرتبطة بعملية أخرى تمنع الحذف.',
        ),
      )
      return false
    }
  }, [reloadInvoices, selectedInvoice])

  const openDetails = useCallback(async (invoiceId: string) => {
    try {
      const details = await purchasesService.getInvoiceById(invoiceId)
      setSelectedInvoice(details)
      setDetailsOpen(true)
    } catch (error) {
      console.error('OPEN PURCHASE DETAILS FAILED', error)
    }
  }, [])

  const filteredRows = useMemo(() => {
    return invoices.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
  }, [invoices, page, rowsPerPage])

  const paymentRows = useMemo(() => {
    if (!selectedInvoice?.payments?.length) {
      return []
    }

    let runningTotal = 0
    return [...selectedInvoice.payments]
      .sort((first, second) => new Date(first.date).getTime() - new Date(second.date).getTime())
      .map((payment) => {
        runningTotal += Number(payment.amount ?? 0)
        return {
          ...payment,
          remainingAfterThisPayment: Math.max(Number(selectedInvoice.netTotal ?? 0) - runningTotal, 0),
          netTotal: Number(selectedInvoice.netTotal ?? 0),
        }
      })
  }, [selectedInvoice])

  const selectedSupplier = activeSuppliers.find((item) => item.id === invoiceSupplierId) ?? null
  const selectedWarehouse = activeWarehouses.find((item) => item.id === invoiceWarehouseId) ?? null

  return (
    <Box sx={craftPageGlassSx}>
      <PageHeader
        title={isSuppliersPage ? 'الموردين' : 'المشتريات والموردين'}
        breadcrumb={isSuppliersPage ? 'إدارة الموردين' : 'إدارة الموردين وفواتير المشتريات'}
      />

      {isSuppliersPage ? (
        <SectionCard title="قائمة الموردين" actions={
            <Button variant="contained" startIcon={<FiPlus />} onClick={() => setSupplierFormOpen(true)}>إضافة مورد</Button>
        }>
          <Box sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 800 }}>
              <TableHead>
                <TableRow sx={{ background: 'rgba(255, 255, 255, 0.055)', textAlignLast: 'center' }}>
                  <TableCell>رقم المورد</TableCell>
                  <TableCell>اسم المورد</TableCell>
                  <TableCell>الهاتف</TableCell>
                  <TableCell>العنوان</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {suppliers
                  .slice(
                    supplierPage * supplierRowsPerPage,
                    supplierPage * supplierRowsPerPage + supplierRowsPerPage,
                  )
                  .map((supplier) => (
                  <TableRow key={supplier.id} sx={{ textAlignLast: 'center' }}>
                    <TableCell>{supplier.code}</TableCell>
                    <TableCell>{supplier.name}</TableCell>
                    <TableCell>{supplier.phone || '__'}</TableCell>
                    <TableCell>{supplier.address || '__'}</TableCell>
                    <TableCell>{supplier.status === 'active' ? 'فعال' : 'غير فعال'}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <IconButton size="small" onClick={() => {
                          setSupplierForm({
                            id: supplier.id,
                            code: supplier.code,
                            name: supplier.name,
                            phone: supplier.phone ?? '',
                            address: supplier.address ?? '',
                            notes: supplier.notes ?? '',
                            status: supplier.status,
                          })
                          setSupplierFormError('')
                          setSupplierFormOpen(true)
                        }} color="primary">
                          <FiEdit2 />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => {
                          setSupplierDeleteError('')
                          setSupplierToDelete(supplier)
                        }}>
                          <FiTrash2 />
                        </IconButton>
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
              count={suppliers.length}
              page={supplierPage}
              onPageChange={(_, newPage) => setSupplierPage(newPage)}
              rowsPerPage={supplierRowsPerPage}
              onRowsPerPageChange={(event) => {
                setSupplierRowsPerPage(Number(event.target.value))
                setSupplierPage(0)
              }}
            />
          </Box>
        </SectionCard>
      ) : (
        <SectionCard title="سجل فواتير المشتريات" actions={
          <Button variant="contained" startIcon={<FiPlus />} onClick={() => void openCreateInvoiceDialog()}>فاتورة شراء جديدة</Button>
        }>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', mb: 2 }}>
            <Tooltip title="بحث برقم الفاتورة أو اسم المورد" arrow>
                <Box>
                    <SearchField
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value)
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
          <TextField select label="المورد" value={supplierFilter} onChange={(e) => { setSupplierFilter(e.target.value); setPage(0) }} slotProps={darkSelectSlotProps}>
            <MenuItem value="">الكل</MenuItem>
            {suppliers.map((supplier) => (
              <MenuItem key={supplier.id} value={supplier.id}>{supplier.code} - {supplier.name}</MenuItem>
            ))}
          </TextField>
          <TextField select label="المخزن" value={warehouseFilter} onChange={(e) => { setWarehouseFilter(e.target.value); setPage(0) }} slotProps={darkSelectSlotProps}>
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
                setSupplierFilter('')
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
            <Table sx={{ minWidth: 1100 }}>
              <TableHead>
                <TableRow sx={{ background: 'rgba(255, 255, 255, 0.055)', textAlignLast: 'center' }}>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>التاريخ</TableCell>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>رقم الفاتورة</TableCell>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>رقم فاتورة المورد</TableCell>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>المورد</TableCell>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>المخزن</TableCell>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الإجمالي</TableCell>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الحسم</TableCell>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>المصاريف الإضافية</TableCell>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الصافي</TableCell>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>حالة الدفع</TableCell>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow key={row.id} sx={{ textAlignLast: 'center' }}>
                    <TableCell sx={{ textAlign: 'center' }}>{formatDateDMY(row.date)}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{row.invoiceNumber}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{row.supplierInvoiceNumber || '__'}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{row.supplierName}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{row.warehouseName}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{currency(row.subtotal)}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{currency(row.discountAmount)}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{currency(row.expenses ?? 0)}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{currency(row.netTotal)}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{paymentStatusLabel[row.paymentStatus]}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
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
        <DialogTitle>
          {confirmAction?.type === 'deleteDraft' ? 'تأكيد حذف المسودة' : 'تأكيد حذف الفاتورة'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'grid', gap: 1.5 }}>
          {invoiceDeleteError ? <Alert severity="error" sx={craftErrorAlertSx}>{invoiceDeleteError}</Alert> : null}
          <Typography>
            {confirmAction?.type === 'deleteDraft'
              ? `هل أنت متأكد من حذف فاتورة الشراء رقم ${confirmAction.invoiceNumber}؟ لا يمكن التراجع عن الحذف.`
              : `هل أنت متأكد من حذف فاتورة الشراء رقم ${confirmAction?.invoiceNumber ?? ''} بشكل نهائي؟ سيتم إزالة أثرها من المخزون والدفعات.`}
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

      <Dialog open={suppliersOpen} onClose={() => setSuppliersOpen(false)} maxWidth="lg" fullWidth slotProps={craftDialogSlotProps}>
        <DialogTitle>دليل الموردين</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography sx={{ fontWeight: 700 }}>قائمة الموردين</Typography>
            <Button
              variant="contained"
              startIcon={<FiPlus />}
              onClick={() => {
                setSupplierForm({ code: '', name: '', phone: '', address: '', notes: '', status: 'active' })
                setSupplierFormError('')
                setSupplierFormOpen(true)
              }}
            >
              إضافة مورد
            </Button>
          </Box>
          <Table>
            <TableHead>
              <TableRow sx={{ background: 'rgba(255, 255, 255, 0.055)', textAlignLast: 'center' }}>
                <TableCell>رقم المورد</TableCell>
                <TableCell>اسم المورد</TableCell>
                <TableCell>الهاتف</TableCell>
                <TableCell>العنوان</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {suppliers.map((supplier) => (
                <TableRow key={supplier.id} sx={{ textAlignLast: 'center' }}>
                  <TableCell>{supplier.code}</TableCell>
                  <TableCell>{supplier.name}</TableCell>
                  <TableCell>{supplier.phone || '__'}</TableCell>
                  <TableCell>{supplier.address || '__'}</TableCell>
                  <TableCell>{supplier.status === 'active' ? 'فعال' : 'غير فعال'}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSupplierForm({
                            id: supplier.id,
                            code: supplier.code,
                            name: supplier.name,
                            phone: supplier.phone ?? '',
                            address: supplier.address ?? '',
                            notes: supplier.notes ?? '',
                            status: supplier.status,
                          })
                          setSupplierFormError('')
                          setSupplierFormOpen(true)
                        }}
                        color="primary"
                      >
                        <FiEdit2 />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          setSupplierDeleteError('')
                          setSupplierToDelete(supplier)
                        }}
                      >
                        <FiTrash2 />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuppliersOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(supplierToDelete)} onClose={() => { setSupplierToDelete(null); setSupplierDeleteError('') }} maxWidth="sm" fullWidth slotProps={craftDialogSlotProps}>
        <DialogTitle>تأكيد حذف المورد</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {supplierDeleteError ? <Alert severity="error" sx={craftErrorAlertSx}>{supplierDeleteError}</Alert> : null}
          <Typography>
            {supplierToDelete ? `هل أنت متأكد من حذف المورد «${supplierToDelete.name}» رقم ${supplierToDelete.code}؟ لا يمكن التراجع عن الحذف.` : ''}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setSupplierToDelete(null); setSupplierDeleteError('') }}>تراجع</Button>
          <Button
            variant="contained"
            color="error"
            onClick={async () => {
              if (!supplierToDelete) return

              try {
                setSupplierDeleteError('')
                await suppliersService.delete(supplierToDelete.id)
                setSupplierToDelete(null)
                await loadData()
              } catch (error) {
                console.error('DELETE SUPPLIER FAILED', error)
                setSupplierDeleteError(getUserFriendlyErrorMessage(error, 'تعذر حذف المورد. قد يكون مرتبطاً بفواتير أو حركات أخرى، لذلك لا يمكن حذفه حالياً.'))
              }
            }}
          >
            حذف
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={supplierFormOpen} onClose={() => setSupplierFormOpen(false)} maxWidth="sm" fullWidth slotProps={craftDialogSlotProps}>
        <DialogTitle>{supplierForm.id ? 'تعديل مورد' : 'إضافة مورد'}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '12px !important' }}>
          {supplierFormError ? <Alert severity="error" sx={craftErrorAlertSx}>{supplierFormError}</Alert> : null}
          <TextField label="رقم المورد" value={supplierForm.code} onChange={(event) => setSupplierForm((prev) => ({ ...prev, code: event.target.value }))} required />
          <TextField label="اسم المورد" value={supplierForm.name} onChange={(event) => setSupplierForm((prev) => ({ ...prev, name: event.target.value }))} required />
          <TextField label="الهاتف" value={supplierForm.phone} onChange={(event) => setSupplierForm((prev) => ({ ...prev, phone: event.target.value }))} />
          <TextField label="العنوان" value={supplierForm.address} onChange={(event) => setSupplierForm((prev) => ({ ...prev, address: event.target.value }))} />
          <TextField label="ملاحظات" value={supplierForm.notes} onChange={(event) => setSupplierForm((prev) => ({ ...prev, notes: event.target.value }))} multiline minRows={2} />
          <TextField select label="الحالة" value={supplierForm.status} onChange={(event) => setSupplierForm((prev) => ({ ...prev, status: event.target.value as 'active' | 'inactive' }))} slotProps={darkSelectSlotProps}>
            <MenuItem value="active">فعال</MenuItem>
            <MenuItem value="inactive">غير فعال</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSupplierFormOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (!supplierForm.code.trim() || !supplierForm.name.trim()) {
                setSupplierFormError('رقم المورد واسم المورد مطلوبان.')
                return
              }

              try {
                setSupplierFormError('')
                const payload = {
                  code: supplierForm.code.trim(),
                  name: supplierForm.name.trim(),
                  phone: supplierForm.phone.trim(),
                  address: supplierForm.address.trim(),
                  notes: supplierForm.notes.trim(),
                  status: supplierForm.status,
                }
                if (supplierForm.id) {
                  await suppliersService.update(supplierForm.id, payload)
                } else {
                  await suppliersService.create(payload)
                }
                setSupplierFormOpen(false)
                await loadData()
              } catch (error) {
                console.error('SAVE SUPPLIER FAILED', error)
                setSupplierFormError(getUserFriendlyErrorMessage(error, 'تعذر حفظ بيانات المورد.'))
              }
            }}
          >
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={invoiceDialogOpen} onClose={() => {
        setInvoiceDialogOpen(false)
        setEditingInvoiceStatus(null)
        setEditingInvoiceId(null)
      }} fullWidth maxWidth="lg" slotProps={craftInvoiceDialogSlotProps}>
        <DialogTitle>{editingInvoiceId ? 'تعديل مسودة فاتورة شراء' : 'فاتورة شراء جديدة'}</DialogTitle>
        <DialogContent
          ref={invoiceDialogContentRef}
          sx={{ display: 'grid', gap: 2, pt: '12px !important' }}
        >
          {invoiceFormError ? <Alert severity="error" sx={craftErrorAlertSx}>{invoiceFormError}</Alert> : null}

          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
            <TextField label="رقم الفاتورة" value={invoiceNumber} slotProps={{ input: { readOnly: true } }} />
            <TextField label="رقم فاتورة المورد" value={supplierInvoiceNumber} onChange={(event) => setSupplierInvoiceNumber(event.target.value)} />
            <TextField
            label="التاريخ"
            type="text"
            value={invoiceDate ? formatDateDMY(invoiceDate) : ''}
            onChange={(event) => setInvoiceDate(event.target.value)}
            placeholder="DD/MM/YYYY"
            slotProps={{ htmlInput: { 
              inputMode: 'numeric',
              pattern: '[0-9\\/]*'
              },
              inputLabel: { shrink: true }
            }}
            required
          />
            <Autocomplete
              options={activeSuppliers}
              getOptionLabel={(option) => `${option.code} - ${option.name}`}
              value={selectedSupplier}
              onChange={(_, value) => setInvoiceSupplierId(value?.id ?? '')}
              slotProps={{ paper: { sx: darkPopupPaperSx } }}
              renderInput={(params) => <TextField {...params} label="المورد" required />}
            />
            <Autocomplete
              options={activeWarehouses}
              getOptionLabel={(option) => option.name}
              value={selectedWarehouse}
              onChange={(_, value) => setInvoiceWarehouseId(value?.id ?? '')}
              slotProps={{ paper: { sx: darkPopupPaperSx } }}
              renderInput={(params) => <TextField {...params} label="المخزن" required />}
            />
          </Box>

          <TextField label="ملاحظات" value={invoiceNotes} onChange={(event) => setInvoiceNotes(event.target.value)} multiline minRows={2} />

          <SectionCard title="مواد الفاتورة">
            <Box sx={{ display: 'grid', gap: 2 }}>
              {invoiceLines.map((line) => {
                const material = line.materialId ? materialById.get(line.materialId) ?? null : null
                const lineTotal = (typeof line.quantity === 'number' ? line.quantity : 0) * (typeof line.unitPrice === 'number' ? line.unitPrice : 0)

                return (
                  <Box key={line.key} sx={{
                      p: 2,
                      borderRadius: '14px',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      background: 'rgba(255, 255, 255, 0.035)',
                    }}>
                    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', alignItems: 'center' }}>
                      <Autocomplete
                        options={materialOptions}
                        value={material}
                        getOptionLabel={(option) => `${option.materialNumber} - ${option.name}`}
                        onChange={(_, value) => {
                          setInvoiceLines((prev) => prev.map((item) => item.key === line.key ? { ...item, materialId: value?.id ?? '' } : item))
                        }}
                        slotProps={{ paper: { sx: darkPopupPaperSx } }}
                        renderInput={(params) => <TextField {...params} label="المادة" required />}
                      />
                      <TextField label="الوحدة" value={material?.unit ?? ''} slotProps={{ input: { readOnly: true } }} />
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
                        label="سعر الشراء"
                        type="number"
                        value={line.unitPrice}
                        onChange={(event) => {
                          const raw = event.target.value
                          setInvoiceLines((prev) => prev.map((item) => item.key === line.key ? { ...item, unitPrice: raw === '' ? '' : Number(raw) } : item))
                        }}
                        slotProps={{ htmlInput: { min: 0, step: 1 } }}
                        required
                      />
                      <TextField label="الإجمالي" value={currency(lineTotal)} slotProps={{ input: { readOnly: true } }} />
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

          <SectionCard title="الحسم والإجماليات">
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
              <TextField select label="نوع الحسم" value={discountType} onChange={(event) => setDiscountType(event.target.value as DiscountType)} slotProps={darkSelectSlotProps}>
                <MenuItem value="none">بدون حسم</MenuItem>
                <MenuItem value="percentage">نسبة مئوية</MenuItem>
                <MenuItem value="fixed">مبلغ ثابت</MenuItem>
              </TextField>
              <TextField
                label="قيمة الحسم"
                type="number"
                value={discountValue}
                onChange={(event) => {
                  const raw = event.target.value
                  setDiscountValue(raw === '' ? '' : Number(raw))
                }}
                slotProps={{
                  htmlInput: {
                    min: 0,
                    max: discountType === 'percentage' ? 100 : undefined,
                    step: 1,
                  },
                }}
              />
              <TextField
                label="مصاريف إضافية"
                type="number"
                value={invoiceExpenses}
                onChange={(event) => {
                  const raw = event.target.value
                  setInvoiceExpenses(raw === '' ? '' : Number(raw))
                }}
                slotProps={{ htmlInput: { min: 0, step: 1 } }}
              />
            </Box>
            <Table sx={{ mt: 2, width: '100%', minWidth: 620, '& td, & th': { textAlign: 'center' } }}>
              <TableHead>
                <TableRow sx={{ background: 'rgba(255, 255, 255, 0.055)', textAlignLast: 'center' }}>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الإجمالي قبل الحسم</TableCell>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الحسم</TableCell>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>المصاريف الإضافية</TableCell>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الصافي النهائي</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow sx={{ textAlignLast: 'center' }}>
                  <TableCell sx={{ textAlign: 'center' }}>{currency(subtotal)}</TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>{currency(discountAmount)}</TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>{currency(invoiceExpensesAmount)}</TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>{currency(netTotal)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </SectionCard>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInvoiceDialogOpen(false)}>إلغاء</Button>
          {editingInvoiceId && editingInvoiceStatus === 'completed' ? (
            <Button variant="contained" color="primary" onClick={() => void saveDraft()} disabled={saving}>
              {saving ? <CircularProgress size={18} /> : 'حفظ التعديلات'}
            </Button>
          ) : (
            <Button variant="contained" color="primary" startIcon={<FiCheckCircle />} onClick={() => void completeDraft()} disabled={saving}>
              {saving ? <CircularProgress size={18} /> : 'اعتماد الفاتورة'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} fullWidth maxWidth="lg" slotProps={craftDialogSlotProps}>
        <DialogTitle>تفاصيل فاتورة الشراء</DialogTitle>
        <DialogContent>
          {!selectedInvoice ? (
            <Box sx={{ display: 'grid', placeItems: 'center', p: 4 }}><CircularProgress /></Box>
          ) : (
            <Box sx={{ display: 'grid', gap: 2 }}>
              <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
                <Box>رقم الفاتورة: <strong>{selectedInvoice.invoiceNumber}</strong></Box>
                <Box>رقم فاتورة المورد: <strong>{selectedInvoice.supplierInvoiceNumber || '__'}</strong></Box>
                <Box>التاريخ: <strong>{formatDateDMY(selectedInvoice.date)}</strong></Box>
                <Box>المورد: <strong>{selectedInvoice.supplierName}</strong></Box>
                <Box>المخزن: <strong>{selectedInvoice.warehouseName}</strong></Box>
              </Box>

              <Table>
                <TableHead>
                  <TableRow sx={{ background: 'rgba(255, 255, 255, 0.055)', textAlignLast: 'center' }}>
                    <TableCell>المادة</TableCell>
                    <TableCell>الوحدة</TableCell>
                    <TableCell>الكمية</TableCell>
                    <TableCell>سعر الشراء</TableCell>
                    <TableCell>الإجمالي</TableCell>
                    <TableCell>ملاحظات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedInvoice.items.map((item) => (
                    <TableRow key={item.id} sx={{textAlignLast: 'center'}}>
                      <TableCell>{item.materialNumber} - {item.materialName}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{currency(item.unitPrice)}</TableCell>
                      <TableCell>{currency(item.lineTotal)}</TableCell>
                      <TableCell>{item.notes?.trim() ? item.notes : '__'}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>ملاحظات الفاتورة</TableCell>
                    <TableCell colSpan={5} sx={{ textAlign: 'center' }}>{selectedInvoice.notes?.trim() ? selectedInvoice.notes : '__'}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <Table sx={{ width: '100%', minWidth: 620, '& td, & th': { textAlign: 'center' } }}>
                <TableHead>
                  <TableRow sx={{ background: 'rgba(255, 255, 255, 0.055)', textAlignLast: 'center' }}>
                    <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الإجمالي قبل الحسم</TableCell>
                    <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الحسم</TableCell>
                    <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>المصاريف الإضافية</TableCell>
                    <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الصافي النهائي</TableCell>
                    <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>المدفوع</TableCell>
                    <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>المتبقي</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow sx={{ textAlignLast: 'center' }}>
                    <TableCell sx={{ textAlign: 'center' }}>{currency(selectedInvoice.subtotal)}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{currency(selectedInvoice.discountAmount)}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{currency(selectedInvoice.expenses ?? 0)}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{currency(selectedInvoice.netTotal)}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{currency(selectedInvoice.paidAmount)}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{currency(selectedInvoice.remainingAmount)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <Box sx={{ display: 'grid', gap: 1 }}>
                <Box>حالة الدفع: <strong>{paymentStatusLabel[selectedInvoice.paymentStatus]}</strong></Box>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, flexWrap: 'wrap' }}>
                <Button variant="contained" onClick={() => { void handleExportPdf() }}>تصدير PDF</Button>
                {selectedInvoice.status === 'completed' ? (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => {
                      setDetailsOpen(false)
                      navigate(`/purchase-returns?invoiceId=${selectedInvoice.id}`)
                    }}
                  >
                    إنشاء مرتجع شراء
                  </Button>
                ) : null}
                <Tooltip
                  title={
                    selectedInvoice.paymentStatus === 'paid' || selectedInvoice.remainingAmount <= 0
                      ? 'الفاتورة مدفوعة بالكامل'
                      : ''
                  }
                  arrow
                >
                  <Box
                    component="span"
                    sx={{
                      display: 'inline-flex',
                      cursor:
                        selectedInvoice.paymentStatus === 'paid' || selectedInvoice.remainingAmount <= 0
                          ? 'not-allowed'
                          : 'pointer',
                    }}
                  >
                    <Button
                      variant="contained"
                      startIcon={<FiCheckCircle />}
                      onClick={openPaymentDialog}
                      disabled={
                        selectedInvoice.paymentStatus === 'paid' ||
                        selectedInvoice.remainingAmount <= 0
                      }
                      sx={{
                        background: '#66bb6a',
                        '&:hover': {
                          background: '#66bb6a',
                        },
                        '&.Mui-disabled': {
                          backgroundColor: 'success.main',
                          color: 'common.white',
                          opacity: 0.8,
                          boxShadow: 'none',
                        },
                      }}
                    >
                      تسجيل دفعة
                    </Button>
                  </Box>
                </Tooltip>
              </Box>
              {paymentRows.length > 0 ? (
                <Box>
                  <Typography sx={{ fontWeight: 700, mb: 1 }}>سجل المدفوعات</Typography>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ background: 'rgba(255, 255, 255, 0.055)', textAlignLast: 'center' }}>
                        <TableCell>التاريخ</TableCell>
                        <TableCell>المبلغ</TableCell>
                        <TableCell>الملاحظات</TableCell>
                        <TableCell>الإجراء</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paymentRows.map((payment) => (
                        <TableRow key={payment.id} sx={{ textAlignLast: 'center' }}>
                          <TableCell>{formatDateDMY(payment.date)}</TableCell>
                          <TableCell>{currency(payment.amount)}</TableCell>
                          <TableCell>{payment.notes || '__'}</TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                setPaymentDeleteError('')
                                setPaymentDeleteConfirm({
                                  paymentId: payment.id,
                                  paymentDate: payment.date,
                                  paymentAmount: payment.amount,
                                })
                              }}
                            >
                              <FiTrash2 />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              ) : (
                <Typography color="text.secondary">لا توجد دفعات مسجلة على هذه الفاتورة.</Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="sm" fullWidth slotProps={craftDialogSlotProps}>
        <DialogTitle>تسجيل دفعة للفاتورة</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '12px !important' }}>
          {paymentError ? <Alert severity="error" sx={craftErrorAlertSx}>{paymentError}</Alert> : null}
          <TextField
            label="تاريخ الدفعة"
            type="text"
            value={paymentForm.date ? formatDateDMY(paymentForm.date) : ''}
            onChange={(event) => setPaymentForm((prev) => ({ ...prev, date: event.target.value }))}
            placeholder="DD/MM/YYYY"
            slotProps={{
              htmlInput: {
                inputMode: 'numeric',
                pattern: '[0-9\\/]*'
              },
              inputLabel: { shrink: true,}
            }}
          />
          <TextField
            label="المبلغ"
            type="number"
            value={paymentForm.amount}
            onChange={(event) => setPaymentForm((prev) => ({ ...prev, amount: event.target.value }))}
            slotProps={{ htmlInput: { min: 0, step: 1 } }}
          />
          <TextField
            label="ملاحظات"
            value={paymentForm.notes}
            onChange={(event) => setPaymentForm((prev) => ({ ...prev, notes: event.target.value }))}
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" color="primary" startIcon={<FiCheckCircle />} onClick={() => void submitPayment()}>حفظ الدفعة</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(paymentDeleteConfirm)}
        onClose={() => {
          setPaymentDeleteConfirm(null)
          setPaymentDeleteError('')
        }}
        maxWidth="sm"
        fullWidth
        slotProps={craftDialogSlotProps}
      >
        <DialogTitle>تأكيد حذف الدفعة</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'grid', gap: 1.5 }}>
          {paymentDeleteError ? <Alert severity="error" sx={craftErrorAlertSx}>{paymentDeleteError}</Alert> : null}
          <Typography>
            هل أنت متأكد من حذف دفعة بتاريخ {paymentDeleteConfirm ? formatDateDMY(paymentDeleteConfirm.paymentDate) : ''} بقيمة {paymentDeleteConfirm ? currency(paymentDeleteConfirm.paymentAmount) : ''}؟
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setPaymentDeleteConfirm(null); setPaymentDeleteError('') }}>إلغاء</Button>
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
