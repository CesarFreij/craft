import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { FiCalendar, FiEdit2, FiEye, FiPlus, FiTrash2 } from 'react-icons/fi'
import {
  adjustmentService,
  inventoryService,
  type StockAdjustmentPayload,
  type StockBalanceRecord,
  type StockMovementDetails,
  type WarehouseRecord,
} from '../services/inventoryService'
import { materialsService, type MaterialRecord } from '../services/materialsService'
import { PageHeader } from '../components/ui/PageHeader'
import { SectionCard } from '../components/ui/SectionCard'
import { getUserFriendlyErrorMessage } from '../utils/errorMessages'
import { formatCurrencyValue, formatDateDMY, formatNumberBySettings, toInternalDate } from '../utils/displayFormatting'
import { useNotifications } from '../contexts/useNotifications'


const darkPopupPaperSx = {
  mt: 0.75,
  borderRadius: '14px',
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

function DateFilterField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
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
      input.click()
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
        sx={{
          '& .MuiInputBase-input': {
            textAlign: 'end',
            direction: 'ltr',
            color: 'rgba(255, 255, 255, 0.92)',
            WebkitTextFillColor: 'rgba(255, 255, 255, 0.92)',
          },
        }}
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
              <InputAdornment position="start" sx={{ marginInlineEnd: 0 }}>
                <IconButton
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation()
                    openDatePicker()
                  }}
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

type AdjustmentLineItem = {
  materialId: string
  unit: string
  systemQuantity: number
  countedQuantity: string
  notes: string
  unitCost: string
}

type AdjustmentRecord = {
  reference: string
  date: string
  warehouseSummary?: string
  itemCount?: number
  documentNotes?: string
}

type MovementDetailItem = NonNullable<StockMovementDetails['items']>[number]

type AdjustmentDetailItem = MovementDetailItem & {
  systemQuantity?: number
  countedQuantity?: number
  unitCost?: number
}

const emptyLine = (): AdjustmentLineItem => ({
  materialId: '',
  unit: '',
  systemQuantity: 0,
  countedQuantity: '',
  notes: '',
  unitCost: '',
})

const roundTo2 = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100

const formatNumber2 = (value: number | string | null | undefined): string => {
  return formatNumberBySettings(value, 'quantity')
}

const normalizeNumberInput = (value: string): string => {
  if (value.trim() === '') return ''
  const number = Number(value)
  return Number.isFinite(number) ? formatNumber2(roundTo2(number)) : value
}

const adjustmentEditableFieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '14px',
    background: 'rgba(255, 255, 255, 0.07)',
    color: 'rgba(255, 255, 255, 0.92)',
    '&:hover': {
      background: 'rgba(255, 255, 255, 0.09)',
    },
    '& fieldset': {
      borderColor: 'rgba(255, 255, 255, 0.18)',
      borderWidth: 1,
    },
    '&:hover fieldset': {
      borderColor: 'rgba(103, 232, 249, 0.55)',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#67E8F9',
      borderWidth: 1.5,
    },
  },
  '& .MuiInputBase-input': {
    color: 'rgba(255, 255, 255, 0.92)',
    WebkitTextFillColor: 'rgba(255, 255, 255, 0.92)',
  },
  '& input[type="number"]': {
    colorScheme: 'dark',
  },
  '& input[type="number"]::-webkit-inner-spin-button, & input[type="number"]::-webkit-outer-spin-button': {
    opacity: 0.88,
    cursor: 'pointer',
  },
  '& input[type="number"]::-webkit-inner-spin-button:hover, & input[type="number"]::-webkit-outer-spin-button:hover': {
    opacity: 1,
  },
  '& .MuiSelect-icon': {
    color: 'rgba(255, 255, 255, 0.78)',
  },
}

function sanitizeAdjustmentNote(rawNote: string | null | undefined): string {
  if (!rawNote || typeof rawNote !== 'string') {
    return ''
  }

  const trimmed = rawNote.trim()
  if (!trimmed) {
    return ''
  }

  try {
    const parsed = JSON.parse(trimmed)
    if (
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      'snapshot' in parsed &&
      'lineNotes' in parsed
    ) {
      const lineNotes = typeof parsed.lineNotes === 'string' ? parsed.lineNotes.trim() : ''
      return lineNotes
    }
  } catch {
    return rawNote
  }

  return rawNote
}

function getDifferenceLabel(value: number): string {
  const normalized = roundTo2(value)
  if (normalized > 0) return 'زيادة جرد'
  if (normalized < 0) return 'نقص جرد'
  return 'بدون فرق'
}

function getAdjustmentItemValues(item: AdjustmentDetailItem) {
  const quantityIn = Number(item.quantityIn ?? 0)
  const quantityOut = Number(item.quantityOut ?? 0)
  const systemQuantity = Number(item.systemQuantity ?? 0)
  const countedQuantity =
    item.countedQuantity !== undefined
      ? Number(item.countedQuantity)
      : systemQuantity + quantityIn - quantityOut
  const unitCost = Number(item.unitCost ?? item.cost ?? 0)

  return {
    systemQuantity,
    countedQuantity,
    difference: roundTo2(countedQuantity - systemQuantity),
    unitCost,
  }
}

export default function StockAdjustmentsPage() {
  const notify = useNotifications()
  const [warehouses, setWarehouses] = useState<WarehouseRecord[]>([])
  const [materials, setMaterials] = useState<MaterialRecord[]>([])
  const [balances, setBalances] = useState<StockBalanceRecord[]>([])
  const [records, setRecords] = useState<AdjustmentRecord[]>([])

  const [selectedWarehouse, setSelectedWarehouse] = useState('')
  const [documentDate, setDocumentDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [documentNotes, setDocumentNotes] = useState('')
  const [items, setItems] = useState<AdjustmentLineItem[]>([emptyLine()])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingReference, setEditingReference] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  const [detailDocument, setDetailDocument] = useState<StockMovementDetails | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const [deleteReference, setDeleteReference] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const adjustmentDialogContentRef = useRef<HTMLDivElement | null>(null)

  const scrollAdjustmentErrorToTop = useCallback(() => {
    const scrollToTop = () => {
      const content = adjustmentDialogContentRef.current

      if (formOpen && content) {
        content.scrollTop = 0
        content.scrollTo({ top: 0, left: 0, behavior: 'smooth' })

        const dialogPaper = content.closest<HTMLElement>('.MuiDialog-paper')
        if (dialogPaper) {
          dialogPaper.scrollTop = 0
          dialogPaper.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
        }

        return
      }

      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
    }

    window.requestAnimationFrame(() => {
      scrollToTop()
      window.requestAnimationFrame(scrollToTop)
    })

    window.setTimeout(scrollToTop, 80)
  }, [formOpen])

  useEffect(() => {
    if (!errorMessage) return
    scrollAdjustmentErrorToTop()
  }, [errorMessage, scrollAdjustmentErrorToTop])


  const materialOptions = useMemo(() => {
    const flattened: MaterialRecord[] = []

    const walk = (nodes: MaterialRecord[]) => {
      for (const item of nodes) {
        if (item.type === 'sub' && !item.isNonStock && (item.status ?? 'active') !== 'deleted') {
          flattened.push(item)
        }

        if (item.children?.length) {
          walk(item.children)
        }
      }
    }

    walk(materials)
    return flattened
  }, [materials])

  const balanceByMaterial = useMemo(() => {
    const map = new Map<string, StockBalanceRecord>()

    for (const balance of balances) {
      map.set(balance.id, balance)
    }

    return map
  }, [balances])

  useEffect(() => {
    let active = true

    void Promise.all([
      inventoryService.listWarehouses(),
      materialsService.listMaterials(),
      adjustmentService.list(),
    ])
      .then(([warehousesData, materialsData, adjustmentsData]) => {
        if (!active) return

        setWarehouses(warehousesData)
        setMaterials(materialsData)
        setRecords(
          (adjustmentsData as AdjustmentRecord[]).map((record) => ({
            ...record,
            documentNotes: sanitizeAdjustmentNote(record.documentNotes),
          })),
        )
      })
      .catch((error: unknown) => {
        if (!active) return
        setErrorMessage(getUserFriendlyErrorMessage(error, 'تعذر تحميل تسويات الجرد.'))
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const refreshRecords = async () => {
    const adjustmentsData = await adjustmentService.list()
    setRecords(
      (adjustmentsData as AdjustmentRecord[]).map((record) => ({
        ...record,
        documentNotes: sanitizeAdjustmentNote(record.documentNotes),
      })),
    )
  }

  const refreshWarehouseBalances = async (warehouseId: string) => {
    if (!warehouseId) {
      setBalances([])
      return
    }

    const warehouseBalances = await inventoryService.getBalancesByWarehouse(warehouseId)
    setBalances(warehouseBalances)
  }

  const resetForm = () => {
    setSelectedWarehouse('')
    setDocumentDate(new Date().toISOString().slice(0, 10))
    setDocumentNotes('')
    setItems([emptyLine()])
    setEditingReference(null)
    setBalances([])
    setErrorMessage('')
  }

  const closeForm = () => {
    setFormOpen(false)
    resetForm()
  }

  const openCreateForm = () => {
    resetForm()
    setFormOpen(true)
  }

  const updateItem = (index: number, partial: Partial<AdjustmentLineItem>) => {
    setItems((prev) =>
      prev.map((item, itemIndex) => (itemIndex === index ? { ...item, ...partial } : item)),
    )
  }

  const addLine = () => {
    setItems((prev) => [...prev, emptyLine()])
  }

  const removeLine = (index: number) => {
    setItems((prev) => {
      if (prev.length === 1) return prev
      return prev.filter((_, itemIndex) => itemIndex !== index)
    })
  }

  const handleWarehouseChange = async (warehouseId: string) => {
    setSelectedWarehouse(warehouseId)
    setErrorMessage('')

    if (!warehouseId) {
      setBalances([])
      setItems([emptyLine()])
      return
    }

    try {
      await refreshWarehouseBalances(warehouseId)

      if (!editingReference) {
        setItems([emptyLine()])
      }
    } catch (error) {
      setErrorMessage(getUserFriendlyErrorMessage(error, 'تعذر تحميل أرصدة المخزن.'))
      scrollAdjustmentErrorToTop()
    }
  }

  const handleMaterialChange = (index: number, materialId: string) => {
    const material = materialOptions.find((item) => item.id === materialId)
    const balance = materialId ? balanceByMaterial.get(materialId) : undefined
    const averageCost = Number(balance?.averageCost ?? 0)

    updateItem(index, {
      materialId,
      unit: material?.unit ?? balance?.unit ?? '',
      systemQuantity: Number(balance?.quantity ?? 0),
      countedQuantity: '',
      unitCost: averageCost > 0 ? formatNumber2(averageCost) : '',
    })
  }

  const validateForm = () => {
    if (!selectedWarehouse) {
      return 'يجب اختيار المخزن.'
    }

    if (!documentDate) {
      return 'يجب تحديد تاريخ التسوية.'
    }

    if (items.length === 0 || items.every((item) => !item.materialId)) {
      return 'يجب إضافة مادة واحدة على الأقل.'
    }

    const usedMaterialIds = new Set<string>()

    for (const item of items) {
      if (!item.materialId) {
        return 'توجد مادة غير محددة في أحد البنود.'
      }

      if (usedMaterialIds.has(item.materialId)) {
        return 'لا يمكن تكرار نفس المادة أكثر من مرة في التسوية.'
      }

      usedMaterialIds.add(item.materialId)

      if (item.countedQuantity.trim() === '') {
        return 'يجب إدخال الكمية الفعلية لكل مادة.'
      }

      const countedQuantity = Number(item.countedQuantity)

      if (!Number.isFinite(countedQuantity) || countedQuantity < 0) {
        return 'الكمية الفعلية يجب أن تكون رقماً صحيحاً وألا تكون سالبة.'
      }

      const difference = roundTo2(countedQuantity - item.systemQuantity)

      if (difference > 0) {
        const unitCost = Number(item.unitCost)

        if (item.unitCost.trim() === '' || !Number.isFinite(unitCost) || unitCost < 0) {
          return 'يجب إدخال تكلفة تسوية صحيحة عند وجود زيادة جرد دون تكلفة معروفة.'
        }
      }
    }

    return ''
  }

  const submitAdjustment = async () => {
    const validation = validateForm()

    if (validation) {
      setErrorMessage(validation)
      scrollAdjustmentErrorToTop()
      return
    }

    const payload: StockAdjustmentPayload = {
      reference: editingReference ?? undefined,
      date: documentDate,
      warehouseId: selectedWarehouse,
      notes: documentNotes.trim(),
      items: items.map((item) => ({
        materialId: item.materialId,
        countedQuantity: roundTo2(Number(item.countedQuantity)),
        unit: item.unit,
        unitCost: item.unitCost.trim() === '' ? undefined : roundTo2(Number(item.unitCost)),
        notes: item.notes.trim(),
      })),
    }

    try {
      setSaving(true)
      setErrorMessage('')

      if (editingReference) {
        await adjustmentService.update(editingReference, payload)
        notify.info('تم تعديل تسوية الجرد بنجاح.')
      } else {
        await adjustmentService.create(payload)
        notify.success('تمت إضافة تسوية جرد بنجاح.')
      }

      await refreshRecords()
      closeForm()
    } catch (error) {
      setErrorMessage(getUserFriendlyErrorMessage(error, 'تعذر حفظ تسوية الجرد.'))
      scrollAdjustmentErrorToTop()
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async (reference: string) => {
    try {
      setErrorMessage('')

      const document = await adjustmentService.getByReference(reference)

      if (!document) {
        setErrorMessage('تعذر العثور على تسوية الجرد المطلوبة.')
        return
      }

      const detailItems = (document.items ?? []) as AdjustmentDetailItem[]
      const warehouseId = detailItems[0]?.warehouseId ?? ''

      const preparedItems: AdjustmentLineItem[] = detailItems.map((item) => {
        const values = getAdjustmentItemValues(item)

        return {
          materialId: item.materialId ?? '',
          unit: item.unit ?? '',
          systemQuantity: values.systemQuantity,
          countedQuantity: formatNumber2(values.countedQuantity),
          notes: sanitizeAdjustmentNote(item.notes),
          unitCost: values.unitCost > 0 ? formatNumber2(values.unitCost) : '',
        }
      })

      setEditingReference(reference)
      setSelectedWarehouse(warehouseId)
      setDocumentDate(
        document.date
          ? toInternalDate(document.date)
          : new Date().toISOString().slice(0, 10),
      )
      setDocumentNotes(sanitizeAdjustmentNote(document.notes))
      setItems(preparedItems.length > 0 ? preparedItems : [emptyLine()])

      await refreshWarehouseBalances(warehouseId)
      setFormOpen(true)
    } catch (error) {
      setErrorMessage(getUserFriendlyErrorMessage(error, 'تعذر تحميل بيانات التسوية للتعديل.'))
    }
  }

  const openDetails = async (reference: string) => {
    try {
      setErrorMessage('')

      const document = await adjustmentService.getByReference(reference)

      if (!document) {
        setErrorMessage('تعذر العثور على تفاصيل التسوية المطلوبة.')
        return
      }

      setDetailDocument({
        ...document,
        notes: sanitizeAdjustmentNote(document.notes),
        items: (document.items ?? []).map((item) => ({
          ...item,
          notes: sanitizeAdjustmentNote(item.notes),
        })),
      })
      setDetailOpen(true)
    } catch (error) {
      setErrorMessage(getUserFriendlyErrorMessage(error, 'تعذر عرض تفاصيل التسوية.'))
    }
  }

  const confirmDelete = async () => {
    if (!deleteReference) return

    try {
      setDeleting(true)
      setErrorMessage('')

      await adjustmentService.delete(deleteReference)
      await refreshRecords()

      if (editingReference === deleteReference) {
        closeForm()
      }

      setDeleteReference(null)
      notify.error('تم حذف تسوية الجرد بنجاح.')
    } catch (error) {
      setErrorMessage(getUserFriendlyErrorMessage(error, 'تعذر حذف تسوية الجرد.'))
    } finally {
      setDeleting(false)
    }
  }

  const displayedRecords = records.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  )

  return (
    <Box sx={craftPageGlassSx}>
      <PageHeader
        title="تسويات الجرد"
        breadcrumb="إدارة المستودعات / تسويات الجرد"
      />

      {errorMessage && !formOpen && !deleteReference ? (
        <Alert severity="error" sx={{ ...craftErrorAlertSx, mb: 2 }}>
          {errorMessage}
        </Alert>
      ) : null}

      <SectionCard
        title="سجل تسويات الجرد"
        subtitle="عرض وإدارة تسويات المخزون المسجلة"
        actions={
          <Button
            variant="contained"
            startIcon={<FiPlus />}
            onClick={openCreateForm}
          >
            تسوية جرد جديدة
          </Button>
        }
      >
        {loading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
            <CircularProgress size={30} />
          </Box>
        ) : (
          <>
            <Box sx={{ overflowX: 'auto' }}>
              <Table sx={{ minWidth: 850 }}>
                <TableHead sx={{ background: 'rgba(255, 255, 255, 0.055)' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>رقم التسوية</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>المخزن</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>عدد البنود</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الملاحظات</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 150 }}>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {displayedRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ textAlign: 'center', py: 5, color: 'rgba(255, 255, 255, 0.68)' }}>
                        لا توجد تسويات جرد مسجلة.
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedRecords.map((record) => (
                      <TableRow key={record.reference} hover>
                        <TableCell>{formatDateDMY(record.date)}</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'rgba(255, 255, 255, 0.88)' }}>
                          {record.reference}
                        </TableCell>
                        <TableCell>{record.warehouseSummary || '—'}</TableCell>
                        <TableCell>{formatNumberBySettings(record.itemCount ?? 0, 'quantity')}</TableCell>
                        <TableCell>{record.documentNotes?.trim() || '__'}</TableCell>
                        <TableCell>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 0.5,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <Tooltip title="عرض التفاصيل">
                              <IconButton
                                size="small"
                                color="secondary"
                                onClick={() => {
                                  void openDetails(record.reference)
                                }}
                              >
                                <FiEye size={16} />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="تعديل">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => {
                                  void handleEdit(record.reference)
                                }}
                              >
                                <FiEdit2 size={16} />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="حذف">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => setDeleteReference(record.reference)}
                              >
                                <FiTrash2 size={16} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Box>

            <TablePagination
              component="div"
              count={records.length}
              page={page}
              onPageChange={(_, nextPage) => setPage(nextPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(Number(event.target.value))
                setPage(0)
              }}
            />
          </>
        )}
      </SectionCard>

      <Dialog
        open={formOpen}
        onClose={saving ? undefined : closeForm}
        maxWidth="xl"
        fullWidth
        slotProps={craftDialogSlotProps}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {editingReference
            ? `تعديل تسوية الجرد ${editingReference}`
            : 'تسوية جرد جديدة'}
        </DialogTitle>

        <DialogContent ref={adjustmentDialogContentRef} dividers>
          <Box sx={{ display: 'grid', gap: 2.25 }}>
            {errorMessage ? <Alert severity="error" sx={craftErrorAlertSx}>{errorMessage}</Alert> : null}

            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              }}
            >
              <TextField
                select
                label="المخزن"
                value={selectedWarehouse}
                onChange={(event) => {
                  void handleWarehouseChange(event.target.value)
                }}
                fullWidth
                slotProps={{
                  select: {
                    MenuProps: {
                      slotProps: {
                        paper: {
                          sx: darkPopupPaperSx,
                        },
                      },
                    },
                  },
                }}
              >
                <MenuItem value="">اختر المخزن</MenuItem>
                {warehouses
                  .filter((warehouse) => warehouse.status !== 'deleted')
                  .map((warehouse) => (
                    <MenuItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </MenuItem>
                  ))}
              </TextField>

              <DateFilterField
                label="التاريخ"
                value={documentDate}
                onChange={(value) => setDocumentDate(toInternalDate(value))}
              />
            </Box>

            <TextField
              label="ملاحظات التسوية"
              value={documentNotes}
              onChange={(event) => setDocumentNotes(event.target.value)}
              multiline
              minRows={2}
              fullWidth
            />

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Typography sx={{ fontWeight: 800, color: 'rgba(255, 255, 255, 0.94)' }}>
                بنود التسوية
              </Typography>

              <Button
                variant="outlined"
                startIcon={<FiPlus />}
                onClick={addLine}
                disabled={!selectedWarehouse}
              >
                إضافة بند
              </Button>
            </Box>

            <Box
              sx={{
                overflowX: 'auto',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                borderRadius: '14px',
              }}
            >
              <Table size="small" sx={{ minWidth: 1250 }}>
                <TableHead sx={{ background: 'rgba(255, 255, 255, 0.055)' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, minWidth: 220 }}>المادة</TableCell>
                    <TableCell sx={{ fontWeight: 700, minWidth: 100 }}>الوحدة</TableCell>
                    <TableCell sx={{ fontWeight: 700, minWidth: 120 }}>رصيد النظام</TableCell>
                    <TableCell sx={{ fontWeight: 700, minWidth: 140 }}>الكمية الفعلية</TableCell>
                    <TableCell sx={{ fontWeight: 700, minWidth: 110 }}>الفرق</TableCell>
                    <TableCell sx={{ fontWeight: 700, minWidth: 120 }}>نوع الفرق</TableCell>
                    <TableCell sx={{ fontWeight: 700, minWidth: 140 }}>تكلفة الوحدة</TableCell>
                    <TableCell sx={{ fontWeight: 700, minWidth: 190 }}>ملاحظات</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 70 }} />
                  </TableRow>
                </TableHead>

                <TableBody>
                  {items.map((item, index) => {
                    const countedNumber =
                      item.countedQuantity.trim() === ''
                        ? null
                        : Number(item.countedQuantity)

                    const difference =
                      countedNumber === null || !Number.isFinite(countedNumber)
                        ? null
                        : roundTo2(countedNumber - item.systemQuantity)

                    const selectedElsewhere = new Set(
                      items
                        .filter((_, itemIndex) => itemIndex !== index)
                        .map((line) => line.materialId)
                        .filter(Boolean),
                    )

                    return (
                      <TableRow key={`${item.materialId || 'line'}-${index}`}>
                        <TableCell>
                          <TextField
                            select
                            size="small"
                            value={item.materialId}
                            onChange={(event) =>
                              handleMaterialChange(index, event.target.value)
                            }
                            fullWidth
                            disabled={!selectedWarehouse}
                            sx={adjustmentEditableFieldSx}
                            slotProps={{
                              select: {
                                MenuProps: {
                                  slotProps: {
                                    paper: {
                                      sx: darkPopupPaperSx,
                                    },
                                  },
                                },
                              },
                            }}
                          >
                            <MenuItem value="">اختر مادة</MenuItem>
                            {materialOptions.map((material) => (
                              <MenuItem
                                key={material.id}
                                value={material.id}
                                disabled={selectedElsewhere.has(material.id)}
                              >
                                {material.materialNumber} - {material.name}
                              </MenuItem>
                            ))}
                          </TextField>
                        </TableCell>

                        <TableCell>
                          <TextField
                            size="small"
                            value={item.unit || '—'}
                            fullWidth
                            slotProps={{ input: { readOnly: true } }}
                          />
                        </TableCell>

                        <TableCell>
                          <TextField
                            size="small"
                            value={formatNumber2(item.systemQuantity)}
                            fullWidth
                            slotProps={{ input: { readOnly: true } }}
                          />
                        </TableCell>

                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={item.countedQuantity}
                            onChange={(event) =>
                              updateItem(index, { countedQuantity: event.target.value })
                            }
                            onBlur={() =>
                              updateItem(index, {
                                countedQuantity: normalizeNumberInput(item.countedQuantity),
                              })
                            }
                            fullWidth
                            slotProps={{
                              htmlInput: {
                                min: 0,
                                step: 1,
                              },
                            }}
                            sx={adjustmentEditableFieldSx}
                          />
                        </TableCell>

                        <TableCell>
                          <TextField
                            size="small"
                            value={difference === null ? '' : formatNumber2(difference)}
                            fullWidth
                            slotProps={{ input: { readOnly: true } }}
                          />
                        </TableCell>

                        <TableCell>
                          <Typography
                            sx={{
                              fontSize: 13,
                              fontWeight: 750,
                              color:
                                difference === null
                                  ? 'rgba(255, 255, 255, 0.68)'
                                  : difference > 0
                                    ? '#6EE7B7'
                                    : difference < 0
                                      ? '#FCA5A5'
                                      : '#CBD5E1',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {difference === null ? '—' : getDifferenceLabel(difference)}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={item.unitCost}
                            onChange={(event) =>
                              updateItem(index, { unitCost: event.target.value })
                            }
                            onBlur={() =>
                              updateItem(index, {
                                unitCost: normalizeNumberInput(item.unitCost),
                              })
                            }
                            fullWidth
                            slotProps={{
                              htmlInput: {
                                min: 0,
                                step: 1,
                              },
                            }}
                            sx={adjustmentEditableFieldSx}
                          />
                        </TableCell>

                        <TableCell>
                          <TextField
                            size="small"
                            value={item.notes}
                            onChange={(event) =>
                              updateItem(index, { notes: event.target.value })
                            }
                            fullWidth
                            sx={adjustmentEditableFieldSx}
                          />
                        </TableCell>

                        <TableCell align="center">
                          <Tooltip title="إزالة البند">
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                disabled={items.length === 1}
                                onClick={() => removeLine(index)}
                              >
                                <FiTrash2 size={16} />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={closeForm} disabled={saving}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              void submitAdjustment()
            }}
            disabled={saving}
          >
            {saving ? (
              <CircularProgress size={18} />
            ) : editingReference ? (
              'حفظ التعديلات'
            ) : (
              'اعتماد التسوية'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        maxWidth="lg"
        fullWidth
        slotProps={craftDialogSlotProps}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>تفاصيل تسوية الجرد</DialogTitle>

        <DialogContent dividers>
          {detailDocument ? (
            <Box sx={{ display: 'grid', gap: 2.5 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                  gap: 1.5,
                  p: 2,
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  borderRadius: '14px',
                  background: 'rgba(255, 255, 255, 0.045)',
                }}
              >
                <Typography>
                  <strong>رقم التسوية:</strong> {detailDocument.reference}
                </Typography>
                <Typography>
                  <strong>التاريخ:</strong> {formatDateDMY(detailDocument.date ?? '')}
                </Typography>
                <Typography>
                  <strong>المخزن:</strong>{' '}
                  {detailDocument.items?.[0]?.warehouseName ?? '—'}
                </Typography>
                <Typography>
                  <strong>الملاحظات:</strong> {detailDocument.notes?.trim() || '__'}
                </Typography>
              </Box>

              <Box sx={{ overflowX: 'auto' }}>
                <Table sx={{ minWidth: 1050 }}>
                  <TableHead sx={{ background: 'rgba(255, 255, 255, 0.055)' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>المادة</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>الوحدة</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>رصيد النظام</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>الكمية الفعلية</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>الفرق</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>نوع الفرق</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>تكلفة الوحدة</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>ملاحظات</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {((detailDocument.items ?? []) as AdjustmentDetailItem[]).map(
                      (item, index) => {
                        const values = getAdjustmentItemValues(item)

                        return (
                          <TableRow key={`${item.materialId ?? 'line'}-${index}`}>
                            <TableCell>
                              {item.materialName || item.materialId || '—'}
                            </TableCell>
                            <TableCell>{item.unit || '—'}</TableCell>
                            <TableCell>{formatNumberBySettings(values.systemQuantity, 'quantity')}</TableCell>
                            <TableCell>{formatNumberBySettings(values.countedQuantity, 'quantity')}</TableCell>
                            <TableCell>{formatNumberBySettings(values.difference, 'quantity')}</TableCell>
                            <TableCell>{getDifferenceLabel(values.difference)}</TableCell>
                            <TableCell>{formatCurrencyValue(values.unitCost)}</TableCell>
                            <TableCell>{item.notes?.trim() || '__'}</TableCell>
                          </TableRow>
                        )
                      },
                    )}
                  </TableBody>
                </Table>
              </Box>
            </Box>
          ) : (
            <Box sx={{ py: 3, textAlign: 'center', color: 'rgba(255, 255, 255, 0.68)' }}>
              لا توجد تفاصيل.
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(deleteReference)}
        onClose={deleting ? undefined : () => setDeleteReference(null)}
        maxWidth="xs"
        fullWidth
        slotProps={craftDialogSlotProps}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>حذف تسوية الجرد</DialogTitle>

        <DialogContent>
          <Typography>
            هل أنت متأكد من حذف التسوية <strong>{deleteReference}</strong>؟
          </Typography>
          <Typography sx={{ mt: 1, color: '#FCA5A5', fontSize: 13 }}>
            سيتم عكس أثر التسوية على المخزون حسب منطق الحذف الموجود في النظام.
          </Typography>

          {errorMessage ? (
            <Alert severity="error" sx={{ ...craftErrorAlertSx, mt: 2 }}>
              {errorMessage}
            </Alert>
          ) : null}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDeleteReference(null)} disabled={deleting}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              void confirmDelete()
            }}
            disabled={deleting}
          >
            {deleting ? <CircularProgress size={18} /> : 'حذف'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
