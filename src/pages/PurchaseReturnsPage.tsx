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
  Typography,
} from '@mui/material'
import { FiCalendar, FiEdit2, FiEye, FiPlus, FiTrash2 } from 'react-icons/fi'
import { useLocation, useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/ui/PageHeader'
import { SectionCard } from '../components/ui/SectionCard'
import {
  purchasesService,
  type PurchaseInvoiceDetails,
  type PurchaseInvoiceListItem,
  type PurchaseReturnRecord,
  type ReturnPaymentInput,
} from '../services/purchasesService'
import { formatCurrencyValue, formatDateDMY, getLocalDateYMD, formatNumberBySettings, toInternalDate } from '../utils/displayFormatting'
import { getUserFriendlyErrorMessage } from '../utils/errorMessages'
import { loadCompanyPrintSettings } from '../services/companyPrintSettingsService'
import type { InvoicePrintData } from '../types/invoicePrint'
import { useNotifications } from '../contexts/useNotifications'
import { loadSettings } from '../services/settingsService'
import { FiCheckCircle } from 'react-icons/fi'

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

type ReturnLineForm = {
  key: string
  materialId: string
  materialName: string
  unit: string
  unitPrice: number
  availableQuantity: number
  quantity: number
}

function currency(value: number): string {
  return formatCurrencyValue(value, 'price')
}

function priceNum(value: number | undefined): string {
  return formatNumberBySettings(Number(value ?? 0), 'price')
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

export function PurchaseReturnsPage() {
  const notify = useNotifications()
  const location = useLocation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [returns, setReturns] = useState<Array<{ id: string; returnNumber: string; date: string; supplierId: string; supplierName: string; warehouseId: string; warehouseName: string; purchaseInvoiceId: string; purchaseInvoiceNumber: string; netTotal: number; status: string }>>([])
  const [invoices, setInvoices] = useState<PurchaseInvoiceListItem[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('')
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoiceDetails | null>(null)
  const [returnDate, setReturnDate] = useState('')
  const [returnNotes, setReturnNotes] = useState('')
  const [returnLines, setReturnLines] = useState<ReturnLineForm[]>([])
  const [returnError, setReturnError] = useState('')
  const [saving, setSaving] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedReturn, setSelectedReturn] = useState<PurchaseReturnRecord | null>(null)
  const [editingReturnId, setEditingReturnId] = useState<string | null>(null)
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [returnPaymentDialogOpen, setReturnPaymentDialogOpen] = useState(false)
  const [returnPaymentError, setReturnPaymentError] = useState('')
  const [returnPaymentTargetId, setReturnPaymentTargetId] = useState<string | null>(null)
  const [pendingReturnPayments, setPendingReturnPayments] = useState<ReturnPaymentInput[]>([])
  const [returnPaymentDeleteConfirm, setReturnPaymentDeleteConfirm] = useState<{ id: string; date: string; amount: number } | null>(null)
  const [returnPaymentForm, setReturnPaymentForm] = useState<ReturnPaymentInput>({
    date: getLocalDateYMD(),
    amount: 0,
    paymentMethod: loadSettings().paymentMethods[0] ?? '',
    notes: '',
  })
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const returnDialogContentRef = useRef<HTMLDivElement | null>(null)

  const scrollReturnDialogToTop = useCallback(() => {
    const scrollToTop = () => {
      const content = returnDialogContentRef.current

      if (content) {
        content.scrollTop = 0
        content.scrollTo({ top: 0, left: 0, behavior: 'smooth' })

        const dialogPaper = content.closest<HTMLElement>('.MuiDialog-paper')
        if (dialogPaper) {
          dialogPaper.scrollTop = 0
          dialogPaper.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
        }
      }
    }

    window.requestAnimationFrame(() => {
      scrollToTop()
      window.requestAnimationFrame(scrollToTop)
    })

    window.setTimeout(scrollToTop, 80)
  }, [])

  useEffect(() => {
    if (!dialogOpen || !returnError) {
      return
    }

    scrollReturnDialogToTop()
  }, [dialogOpen, returnError, scrollReturnDialogToTop])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [invoiceList, returnList] = await Promise.all([
        purchasesService.listInvoices(),
        purchasesService.listReturns(),
      ])
      setInvoices(invoiceList)
      setReturns(returnList)
    } catch (error) {
      console.error('LOAD PURCHASE RETURNS FAILED', error)
      setReturnError(getUserFriendlyErrorMessage(error, 'تعذر تحميل بيانات مرتجعات الشراء.'))
    } finally {
      setLoading(false)
    }
  }, [])

  const openCreateDialog = useCallback(async (invoiceId?: string) => {
    setReturnError('')
    setDialogOpen(true)
    setReturnDate(getLocalDateYMD())
    setReturnNotes('')
    setEditingReturnId(null)
    setPendingReturnPayments([])

    if (!invoiceId) {
      setSelectedInvoiceId('')
      setSelectedInvoice(null)
      setReturnLines([])
      return
    }

    try {
      const invoice = await purchasesService.getInvoiceById(invoiceId)
      const returnList = await purchasesService.listReturns()
      const alreadyReturned = new Map<string, number>()

      for (const returnSummary of returnList.filter((item) => item.purchaseInvoiceId === invoiceId)) {
        const details = await purchasesService.getReturnById(returnSummary.id)
        for (const detailItem of details.items) {
          alreadyReturned.set(detailItem.materialId, (alreadyReturned.get(detailItem.materialId) ?? 0) + detailItem.quantity)
        }
      }

      const lines = invoice.items
        .map((item) => {
          const used = alreadyReturned.get(item.materialId) ?? 0
          const availableQuantity = Math.max(item.quantity - used, 0)
          if (availableQuantity <= 0) return null

          return {
            key: item.id || `${item.materialId}-${item.materialNumber}`,
            materialId: item.materialId,
            materialName: item.materialName,
            unit: item.unit,
            unitPrice: item.unitPrice,
            availableQuantity,
            quantity: availableQuantity,
          }
        })
        .filter((item): item is ReturnLineForm => Boolean(item))

      setSelectedInvoiceId(invoice.id)
      setSelectedInvoice(invoice)
      setReturnLines(lines)
    } catch (error) {
      console.error('OPEN CREATE PURCHASE RETURN FAILED', error)
      setReturnError(getUserFriendlyErrorMessage(error, 'تعذر فتح نموذج مرتجع الشراء.'))
    }
  }, [])

const openEditReturn = useCallback(async (returnId: string) => {
    try {
      const details = await purchasesService.getReturnById(returnId)
      const invoice = await purchasesService.getInvoiceById(details.purchaseInvoiceId)
      const excludeCurrent = details.items.reduce<Record<string, number>>((acc, item) => {
        acc[item.materialId] = (acc[item.materialId] ?? 0) + item.quantity
        return acc
      }, {})
      const returnList = await purchasesService.listReturns()
      const otherReturnTotals = new Map<string, number>()

      for (const summary of returnList.filter((item) => item.purchaseInvoiceId === details.purchaseInvoiceId && item.id !== returnId)) {
        const current = await purchasesService.getReturnById(summary.id)
        for (const detailItem of current.items) {
          otherReturnTotals.set(detailItem.materialId, (otherReturnTotals.get(detailItem.materialId) ?? 0) + detailItem.quantity)
        }
      }

      const lines = invoice.items.map((item) => {
        const alreadyReturned = otherReturnTotals.get(item.materialId) ?? 0
        const currentQty = excludeCurrent[item.materialId] ?? 0
        const availableQuantity = Math.max(item.quantity - alreadyReturned, 0)
        return {
          key: item.id || `${item.materialId}-${item.materialNumber}`,
          materialId: item.materialId,
          materialName: item.materialName,
          unit: item.unit,
          unitPrice: item.unitPrice,
          availableQuantity,
          quantity: currentQty, // 👈 تم الحل هنا: وضع الكمية المحفوظة فقط
        }
      }).filter((item) => item.availableQuantity > 0 || item.quantity > 0) // 👈 إخفاء المواد غير المتاحة والتي لم ترجع

      setEditingReturnId(returnId)
      setSelectedInvoiceId(details.purchaseInvoiceId)
      setSelectedInvoice(invoice)
      setReturnDate(details.date)
      setReturnNotes(details.notes ?? '')
      setReturnLines(lines)
      setPendingReturnPayments([])
      setDialogOpen(true)
      setReturnError('')
    } catch (error) {
      console.error('OPEN EDIT PURCHASE RETURN FAILED', error)
      setReturnError(getUserFriendlyErrorMessage(error, 'تعذر فتح بيانات مرتجع الشراء للتعديل.'))
    }
  }, [])

  useEffect(() => {
  const timerId = window.setTimeout(() => {
    void loadData()
  }, 0)

  return () => window.clearTimeout(timerId)
}, [loadData])

useEffect(() => {
  const timerId = window.setTimeout(() => {
    const params = new URLSearchParams(location.search)
    const invoiceId = params.get('invoiceId')

    if (invoiceId) {
      void openCreateDialog(invoiceId)
    }
  }, 0)

  return () => window.clearTimeout(timerId)
}, [location.search, openCreateDialog])

  const resetDialog = useCallback(() => {
    setDialogOpen(false)
    setSelectedInvoiceId('')
    setSelectedInvoice(null)
    setReturnDate('')
    setReturnNotes('')
    setReturnLines([])
    setReturnError('')
    setEditingReturnId(null)
    setPendingReturnPayments([])
  }, [])

  const handleDelete = useCallback(async (returnId: string) => {
    try {
      await purchasesService.deleteReturn(returnId)
      await loadData()
      notify.error('تم حذف مرتجع الشراء بنجاح.')
    } catch (error) {
      console.error('DELETE PURCHASE RETURN FAILED', error)
      setReturnError(getUserFriendlyErrorMessage(error, 'تعذر حذف مرتجع الشراء.'))
    }
  }, [loadData, notify])

  const confirmSaveReturn = useCallback(async () => {
    if (!selectedInvoiceId) {
      setReturnError('يجب اختيار فاتورة شراء أصلية أولاً.')
      return
    }

    const payloadItems = returnLines
      .filter((line) => Number(line.quantity) > 0 && Number(line.quantity) <= line.availableQuantity)
      .map((line) => ({
        materialId: line.materialId,
        quantity: Number(line.quantity),
        unit: line.unit,
        unitPrice: Number(line.unitPrice),
      }))

    if (payloadItems.length === 0) {
      setReturnError('يجب إدخال كمية إرجاع صحيحة للمواد.')
      return
    }

    try {
      setSaving(true)
      setReturnError('')
      const savedReturn = editingReturnId
        ? await purchasesService.updateReturn(editingReturnId, {
          date: toInternalDate(returnDate || getLocalDateYMD()),
          supplierId: selectedInvoice?.supplierId ?? '',
          warehouseId: selectedInvoice?.warehouseId ?? '',
          purchaseInvoiceId: selectedInvoiceId,
          notes: returnNotes,
          items: payloadItems,
        })
        : await purchasesService.createReturn({
          date: toInternalDate(returnDate || getLocalDateYMD()),
          supplierId: selectedInvoice?.supplierId ?? '',
          warehouseId: selectedInvoice?.warehouseId ?? '',
          purchaseInvoiceId: selectedInvoiceId,
          notes: returnNotes,
          items: payloadItems,
        })

      if (pendingReturnPayments.length > 0) {
        await Promise.all(pendingReturnPayments.map((payment) =>
          purchasesService.createReturnPayment(savedReturn.id, payment),
        ))
      }

      if (editingReturnId) {
        notify.info('تم تعديل مرتجع الشراء بنجاح.')
      } else {
        notify.success('تم إنشاء مرتجع الشراء بنجاح.')
      }
      await loadData()
      resetDialog()
      navigate('/purchase-returns')
    } catch (error) {
      console.error('SAVE PURCHASE RETURN FAILED', error)
      setReturnError(getUserFriendlyErrorMessage(error, 'تعذر حفظ مرتجع الشراء.'))
    } finally {
      setSaving(false)
      setSaveConfirmOpen(false)
    }
  }, [editingReturnId, loadData, navigate, notify, pendingReturnPayments, resetDialog, returnDate, returnLines, returnNotes, selectedInvoice, selectedInvoiceId])

  const openCreateReturnPaymentDialog = () => {
    setReturnPaymentTargetId(null)
    setReturnPaymentError('')
    const returnTotal = returnLines.reduce((sum, line) => sum + Number(line.quantity) * Number(line.unitPrice), 0)
    const pendingPaid = pendingReturnPayments.reduce((sum, payment) => sum + Number(payment.amount), 0)
    setReturnPaymentForm({
      date: getLocalDateYMD(),
      amount: Math.max(returnTotal - pendingPaid, 0),
      paymentMethod: loadSettings().paymentMethods[0] ?? '',
      notes: '',
    })
    setReturnPaymentDialogOpen(true)
  }

  const openDetailsReturnPaymentDialog = () => {
    if (!selectedReturn) return
    setReturnPaymentTargetId(selectedReturn.id)
    setReturnPaymentError('')
    const paid = selectedReturn.payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
    setReturnPaymentForm({
      date: getLocalDateYMD(),
      amount: Math.max(Number(selectedReturn.netTotal) - paid, 0),
      paymentMethod: loadSettings().paymentMethods[0] ?? '',
      notes: '',
    })
    setReturnPaymentDialogOpen(true)
  }

  const deleteSelectedReturnPayment = async () => {
    if (!selectedReturn || !returnPaymentDeleteConfirm) return
    try {
      await purchasesService.deleteReturnPayment(returnPaymentDeleteConfirm.id)
      setSelectedReturn(await purchasesService.getReturnById(selectedReturn.id))
      setReturnPaymentDeleteConfirm(null)
      notify.success('تم حذف دفعة المرتجع بنجاح.')
    } catch (error) {
      setReturnError(getUserFriendlyErrorMessage(error, 'تعذر حذف دفعة المرتجع.'))
    }
  }

  const submitReturnPayment = async () => {
    if (!returnPaymentForm.date || !Number.isFinite(Number(returnPaymentForm.amount)) || Number(returnPaymentForm.amount) <= 0 || !returnPaymentForm.paymentMethod) {
      setReturnPaymentError('أدخل تاريخاً ومبلغاً صحيحاً واختر طريقة الدفع.')
      return
    }

    const payment = { ...returnPaymentForm, date: toInternalDate(returnPaymentForm.date), amount: Number(returnPaymentForm.amount) }
    try {
      setReturnPaymentError('')
      if (returnPaymentTargetId) {
        await purchasesService.createReturnPayment(returnPaymentTargetId, payment)
        const refreshed = await purchasesService.getReturnById(returnPaymentTargetId)
        setSelectedReturn(refreshed)
      } else {
        setPendingReturnPayments((previous) => [...previous, payment])
      }
      setReturnPaymentDialogOpen(false)
    } catch (error) {
      setReturnPaymentError(getUserFriendlyErrorMessage(error, 'تعذر حفظ سند القبض.'))
    }
  }

  const openReturnDetails = useCallback(async (returnId: string) => {
    try {
      const details = await purchasesService.getReturnById(returnId)
      setSelectedReturn(details)
      setDetailsOpen(true)
    } catch (error) {
      console.error('OPEN PURCHASE RETURN DETAILS FAILED', error)
      setReturnError(getUserFriendlyErrorMessage(error, 'تعذر فتح تفاصيل مرتجع الشراء.'))
    }
  }, [])

  const selectedInvoiceOption = useMemo(
    () => invoices.find((invoice) => invoice.id === selectedInvoiceId) ?? null,
    [invoices, selectedInvoiceId],
  )

  const buildPurchaseReturnExportData = useCallback((): InvoicePrintData | null => {
    if (!selectedReturn) {
      return null
    }

    const subtotal = (selectedReturn.items ?? []).reduce(
      (sum, item) => sum + Number(item.lineTotal ?? 0),
      0,
    )
    const paidAmount = selectedReturn.payments.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0)

    return {
      documentType: 'purchase_return' as InvoicePrintData['documentType'],
      title: 'مرتجع مشتريات',
      documentNumber: selectedReturn.returnNumber,
      date: formatDateDMY(selectedReturn.date),

      partyLabel: 'المورد',
      partyName: selectedReturn.supplierName,
      partyNumber: selectedReturn.supplierCode,
      partyPhone: selectedReturn.supplierPhone,

      referenceLabel: 'فاتورة المشتريات',
      referenceValue: selectedReturn.purchaseInvoiceNumber,

      notes: selectedReturn.notes ?? '',

      items: (selectedReturn.items ?? []).map((item) => ({
        id: item.id,
        materialNumber: item.materialNumber ?? '',
        name: item.materialName,
        unit: item.unit ?? '',
        quantity: Number(item.quantity ?? 0),
        price: Number(item.unitPrice ?? 0),
        total: Number(item.lineTotal ?? 0),
      })),

      subtotal,
      discount: 0,
      total: Number(selectedReturn.netTotal ?? subtotal),
      paymentMethod: selectedReturn.payments
        .map((payment) => `${payment.paymentMethod || '—'}\t${currency(payment.amount)}`)
        .join('\n'),
      paidAmount,
      remainingAmount: Math.max(Number(selectedReturn.netTotal ?? subtotal) - paidAmount, 0),
    }
  }, [selectedReturn])

  const handleExportPdf = useCallback(async () => {
    const exportData = buildPurchaseReturnExportData()

    if (!exportData) {
      return
    }

    const latestSettings = await loadCompanyPrintSettings()

    navigate('/invoice-preview', {
      state: {
        invoiceData: exportData,
        settings: latestSettings,
      },
    })
  }, [buildPurchaseReturnExportData, navigate])

  return (
    <Box sx={craftPageGlassSx}>
      <PageHeader
        title="سجل مرتجعات الشراء"
        breadcrumb="المشتريات / مرتجعات الشراء"
      />

      <SectionCard 
        title="سجل المرتجعات" subtitle="مرتجعات الشراء المرتبطة بالفواتير الأصلية فقط"
        actions={
          <Button variant="contained" startIcon={<FiPlus />} onClick={() => void openCreateDialog()}>
            مرتجع جديد
          </Button>
        }
      >
        {loading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', p: 3 }}><CircularProgress /></Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 1000 }}>
              <TableHead>
                <TableRow sx={{ background: 'rgba(255, 255, 255, 0.055)' }}>
                  <TableCell>رقم المرتجع</TableCell>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>المورد</TableCell>
                  <TableCell>فاتورة المشتريات</TableCell>
                  <TableCell>المخزن</TableCell>
                  <TableCell>الإجمالي</TableCell>
                  <TableCell>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {returns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Typography sx={{ color: 'rgba(255, 255, 255, 0.72)', py: 2 }}>لا توجد مرتجعات شراء مسجلة حالياً.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  returns
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.returnNumber}</TableCell>
                      <TableCell>{formatDateDMY(item.date)}</TableCell>
                      <TableCell>{item.supplierName}</TableCell>
                      <TableCell>{item.purchaseInvoiceNumber}</TableCell>
                      <TableCell>{item.warehouseName}</TableCell>
                      <TableCell>{priceNum(item.netTotal)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                          <IconButton size="small" color="secondary" onClick={() => void openReturnDetails(item.id)}>
                            <FiEye />
                          </IconButton>
                          <IconButton size="small" color="primary" onClick={() => void openEditReturn(item.id)}>
                            <FiEdit2 />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => setDeleteConfirmId(item.id)}>
                            <FiTrash2 />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <TablePagination
            component="div"
            count={returns.length}
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

      <Dialog open={dialogOpen} onClose={() => resetDialog()} maxWidth="lg" fullWidth slotProps={craftDialogSlotProps}>
        <DialogTitle>إنشاء مرتجع شراء</DialogTitle>
        <DialogContent
          ref={returnDialogContentRef}
          sx={{ display: 'grid', gap: 2, pt: '12px !important' }}
        >
          {returnError ? <Alert severity="error" sx={craftErrorAlertSx}>
            {returnError}
          </Alert> : null}

          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <Autocomplete
              options={invoices}
              value={selectedInvoiceOption}
              getOptionLabel={(option) => `${option.invoiceNumber} - ${option.supplierName}`}
              onChange={(_, value) => {
                if (!value) {
                  setSelectedInvoiceId('')
                  setSelectedInvoice(null)
                  setReturnLines([])
                  return
                }
                void openCreateDialog(value.id)
              }}
              slotProps={{ paper: { sx: darkPopupPaperSx } }}
              renderInput={(params) => <TextField {...params} label="فاتورة المشتريات" required />}
            />
            <DateFilterField
              label="التاريخ"
              value={returnDate}
              onChange={(value) => setReturnDate(toInternalDate(value))}
            />
          </Box>

          {selectedInvoice ? (
            <Box sx={{ display: 'grid', gap: 1.5 }}>
              <Typography><strong>المورد:</strong> {selectedInvoice.supplierName}</Typography>
              <Typography><strong>المخزن:</strong> {selectedInvoice.warehouseName}</Typography>
            </Box>
          ) : null}

          {returnLines.length > 0 ? (
            <Table>
              <TableHead>
                <TableRow sx={{ background: 'rgba(255, 255, 255, 0.055)' }}>
                  <TableCell>المادة</TableCell>
                  <TableCell>الوحدة</TableCell>
                  <TableCell>الكمية المتبقية للإرجاع</TableCell>
                  <TableCell>سعر الوحدة</TableCell>
                  <TableCell>كمية المرتجع</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {returnLines.map((line) => (
                  <TableRow key={line.key}>
                    <TableCell>{line.materialName}</TableCell>
                    <TableCell>{line.unit}</TableCell>
                    <TableCell>{line.availableQuantity}</TableCell>
                    <TableCell>{priceNum(line.unitPrice)}</TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        value={line.quantity}
                        onChange={(event) => {
                          const rawValue = Number(event.target.value)
                          setReturnLines((prev) => prev.map((item) => item.key === line.key
                            ? {
                                ...item,
                                quantity: Number.isFinite(rawValue) ? Math.min(Math.max(rawValue, 0), item.availableQuantity) : 0,
                              }
                            : item,
                          ))
                        }}
                        slotProps={{
                            htmlInput: {
                                min: 0,
                                max: line.availableQuantity,
                                step: 1,
                            },
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : selectedInvoice ? (
            <Typography sx={{ color: 'rgba(255, 255, 255, 0.72)' }}>
              تم إرجاع كامل مواد هذه الفاتورة، ولم يتبقَ شيء متاح للإرجاع.
            </Typography>
          ) : (
            <Typography sx={{ color: 'rgba(255, 255, 255, 0.72)' }}>
              يرجى اختيار فاتورة أصلية لعرض المواد المتاحة للإرجاع.
            </Typography>
          )}

          <TextField
            label="ملاحظات"
            value={returnNotes}
            onChange={(event) => setReturnNotes(event.target.value)}
            multiline
            minRows={2}
          />

          <SectionCard title="سند قبض">
            <Box sx={{ display: 'grid', gap: 1.5 }}>
              {pendingReturnPayments.map((payment, index) => (
                <Typography key={`${payment.date}-${index}`}>
                  {formatDateDMY(payment.date)} - {priceNum(payment.amount)} - {payment.paymentMethod}
                </Typography>
              ))}
              <Button variant="outlined" onClick={openCreateReturnPaymentDialog} sx={{ width: 'fit-content' }}>
                قبض دفعة
              </Button>
            </Box>
          </SectionCard>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            onClick={() => setSaveConfirmOpen(true)}
            disabled={saving || !selectedInvoiceId || returnLines.length === 0}
            sx={{
              '&.Mui-disabled': {
                background: 'rgba(148, 163, 184, 0.12)',
                color: 'rgba(203, 213, 225, 0.42)',
                border: '1px solid rgba(148, 163, 184, 0.16)',
                boxShadow: 'none',
              },
            }}
          >
            {saving ? 'جارٍ الحفظ...' : 'حفظ المرتجع'}
          </Button>
          <Button onClick={() => resetDialog()}>إلغاء</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={saveConfirmOpen} onClose={() => setSaveConfirmOpen(false)} maxWidth="sm" fullWidth slotProps={craftDialogSlotProps}>
        <DialogTitle>تأكيد حفظ مرتجع الشراء</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography>هل أنت متأكد من اعتماد مرتجع الشراء؟ سيتم تحديث المخزون بناءً على الكميات المرتجعة.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveConfirmOpen(false)}>تراجع</Button>
          <Button variant="contained" onClick={() => void confirmSaveReturn()}>تأكيد وحفظ</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteConfirmId)} onClose={() => setDeleteConfirmId(null)} maxWidth="sm" fullWidth slotProps={craftDialogSlotProps}>
        <DialogTitle>حذف مرتجع الشراء</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography>هل أنت متأكد من حذف مرتجع الشراء؟ سيتم عكس أثره على المخزون.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmId(null)}>تراجع</Button>
          <Button variant="contained" color="error" onClick={async () => {
            if (!deleteConfirmId) return
            await handleDelete(deleteConfirmId)
            setDeleteConfirmId(null)
          }}>حذف</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="lg" fullWidth slotProps={craftDialogSlotProps}>
        <DialogTitle>تفاصيل مرتجع الشراء</DialogTitle>
        <DialogContent>
          {!selectedReturn ? (
            <Box sx={{ display: 'grid', placeItems: 'center', p: 4 }}><CircularProgress /></Box>
          ) : (
            <Box sx={{ display: 'grid', gap: 2 }}>
              <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <Box>رقم المرتجع: <strong>{selectedReturn.returnNumber}</strong></Box>
                <Box>التاريخ: <strong>{formatDateDMY(selectedReturn.date)}</strong></Box>
                <Box>المورد: <strong>{selectedReturn.supplierName}</strong></Box>
                <Box>رقم فاتورة المشتريات: <strong>{selectedReturn.purchaseInvoiceNumber}</strong></Box>
                <Box>المخزن: <strong>{selectedReturn.warehouseName}</strong></Box>
              </Box>

              <Table>
                <TableHead>
                  <TableRow sx={{ background: 'rgba(255, 255, 255, 0.055)' }}>
                    <TableCell>المادة</TableCell>
                    <TableCell>الوحدة</TableCell>
                    <TableCell>الكمية المرتجعة</TableCell>
                    <TableCell>تكلفة الوحدة</TableCell>
                    <TableCell>الإجمالي</TableCell>
                    <TableCell>ملاحظات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedReturn.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.materialNumber} - {item.materialName}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{priceNum(item.unitPrice)}</TableCell>
                      <TableCell>{priceNum(item.lineTotal)}</TableCell>
                      <TableCell>{item.notes?.trim() ? item.notes : ''}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>ملاحظات المرتجع</TableCell>
                    <TableCell colSpan={5} sx={{ textAlign: 'center' }}>{selectedReturn.notes?.trim() ? selectedReturn.notes : ''}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap', mt: 1 }}>
                <Table sx={{ minWidth: 420, '& td, & th': { textAlign: 'center' } }}>
                  <TableHead><TableRow><TableCell>الاجمالي</TableCell><TableCell>المقبوض</TableCell><TableCell>المتبقي</TableCell></TableRow></TableHead>
                  <TableBody><TableRow>
                    <TableCell>{currency(selectedReturn.netTotal)}</TableCell>
                    <TableCell>{currency(selectedReturn.payments.reduce((sum, payment) => sum + Number(payment.amount), 0))}</TableCell>
                    <TableCell>{currency(Math.max(Number(selectedReturn.netTotal) - selectedReturn.payments.reduce((sum, payment) => sum + Number(payment.amount), 0), 0))}</TableCell>
                  </TableRow></TableBody>
                </Table>
              </Box>
              <SectionCard title="سجل الدفعات">
                {selectedReturn.payments.length === 0 ? (
                  <Typography>لا توجد دفعات مرتبطة بهذا المرتجع.</Typography>
                ) : (
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>التاريخ</TableCell>
                        <TableCell>المبلغ</TableCell>
                        <TableCell>طريقة الدفع</TableCell>
                        <TableCell>الملاحظات</TableCell>
                        <TableCell>الإجراءات</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedReturn.payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{formatDateDMY(payment.date)}</TableCell>
                          <TableCell>{priceNum(payment.amount)}</TableCell>
                          <TableCell>{payment.paymentMethod || ''}</TableCell>
                          <TableCell>{payment.notes || ''}</TableCell>
                          <TableCell>
                            <IconButton size="small" color="error" onClick={() => setReturnPaymentDeleteConfirm({ id: payment.id, date: payment.date, amount: payment.amount })}>
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
        <DialogActions sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" sx={{ background: '#66bb6a', '&:hover': { background: '#66bb6a' }}} startIcon={<FiCheckCircle />} onClick={openDetailsReturnPaymentDialog}>قبض دفعة</Button>
          <Button variant="contained" onClick={() => { void handleExportPdf() }}>تصدير PDF</Button>
          <Button onClick={() => setDetailsOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={returnPaymentDialogOpen} onClose={() => setReturnPaymentDialogOpen(false)} maxWidth="sm" fullWidth slotProps={craftDialogSlotProps}>
        <DialogTitle>سند قبض</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '12px !important' }}>
          {returnPaymentError ? <Alert severity="error" sx={craftErrorAlertSx}>{returnPaymentError}</Alert> : null}
          <DateFilterField
            label="تاريخ الدفعة"
            value={returnPaymentForm.date}
            onChange={(value) => setReturnPaymentForm((previous) => ({ ...previous, date: value }))}
          />
          <TextField
            label="المبلغ"
            type="number"
            value={returnPaymentForm.amount}
            onChange={(event) => setReturnPaymentForm((previous) => ({ ...previous, amount: Number(event.target.value) }))}
            slotProps={{ htmlInput: { min: 0, step: 1 } }}
          />
          <TextField
            select
            label="طريقة الدفع"
            value={returnPaymentForm.paymentMethod}
            onChange={(event) => setReturnPaymentForm((previous) => ({ ...previous, paymentMethod: event.target.value }))}
            slotProps={{ select: { MenuProps: { slotProps: { paper: { sx: darkPopupPaperSx } } } } }}
          >
            {loadSettings().paymentMethods.map((method) => <MenuItem key={method} value={method}>{method}</MenuItem>)}
          </TextField>
          <TextField
            label="ملاحظات"
            value={returnPaymentForm.notes ?? ''}
            onChange={(event) => setReturnPaymentForm((previous) => ({ ...previous, notes: event.target.value }))}
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReturnPaymentDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" startIcon={<FiCheckCircle />} onClick={() => void submitReturnPayment()}>حفظ سند القبض</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(returnPaymentDeleteConfirm)} onClose={() => setReturnPaymentDeleteConfirm(null)} maxWidth="xs" fullWidth slotProps={craftDialogSlotProps}>
        <DialogTitle>تأكيد حذف الدفعة</DialogTitle>
        <DialogContent>
          <Typography>هل أنت متأكد من حذف الدفعة بقيمة {returnPaymentDeleteConfirm ? priceNum(returnPaymentDeleteConfirm.amount) : ''}؟</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReturnPaymentDeleteConfirm(null)}>إلغاء</Button>
          <Button color="error" variant="contained" onClick={() => void deleteSelectedReturnPayment()}>حذف</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}