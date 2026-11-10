import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  TableContainer,
  TablePagination,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { FiCalendar, FiPlus, FiEye, FiEdit2, FiTrash2 } from 'react-icons/fi'
import { PageHeader } from '../components/ui/PageHeader'
import { SectionCard } from '../components/ui/SectionCard'
import { inventoryService, type StockBalanceRecord, type WarehouseRecord } from '../services/inventoryService'
import { materialsService, type MaterialRecord } from '../services/materialsService'
import { loadCompanyPrintSettings } from '../services/companyPrintSettingsService'
import {
  manufacturingService,
  type ManufacturingRecipeRecord,
  type ProductionOrderPayload,
  type ProductionOrderRecord,
} from '../services/manufacturingService'
import type { InvoicePrintData } from '../types/invoicePrint'
import { getUserFriendlyErrorMessage } from '../utils/errorMessages'
import { formatDateDMY, getLocalDateYMD, toInternalDate, formatNumberBySettings, roundNumberBySettings } from '../utils/displayFormatting'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../contexts/useNotifications'

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
      overflowX: 'clip',

      '& .MuiDialogTitle-root': {
        color: 'rgba(255, 255, 255, 0.96)',
        fontWeight: 800,
        px: 3,
        pt: 2.5,
        pb: 1.2,
      },

      '& .MuiDialogContent-root': {
        color: 'rgba(255, 255, 255, 0.88)',
        minWidth: 0,
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        gridTemplateColumns: 'minmax(0, 1fr)',
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

const craftHtmlTableSx = {
  width: '100%',
  minWidth: 'max-content',
  borderCollapse: 'collapse',
  background: 'transparent',
  tableLayout: 'auto',
  border: '1px solid rgba(255, 255, 255, 0.18)',
  '& thead': {
    background: 'rgba(255, 255, 255, 0.055)',
  },
  '& tbody tr': {
    background: 'rgba(255, 255, 255, 0.022)',
  },
  '& tbody tr:hover': {
    background: 'rgba(255, 255, 255, 0.055)',
  },
  '& td, & th': {
    border: '1px solid rgba(255, 255, 255, 0.18)',
    whiteSpace: 'nowrap',
    wordBreak: 'normal',
    overflowWrap: 'normal',
    boxSizing: 'border-box',
    verticalAlign: 'middle',
    textAlign: 'center',
  },
  '& th': {
    color: 'rgba(255, 255, 255, 0.94)',
    fontWeight: 700,
  },
  '& td': {
    color: 'rgba(255, 255, 255, 0.88)',
    fontWeight: 400,
  },
}

const tableScrollSx = {
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
  overflowX: 'auto',
  display: 'block',
}

const craftInfoAlertSx = {
  background: 'rgba(8, 145, 178, 0.16)',
  color: '#CFFAFE',
  border: '1px solid rgba(34, 211, 238, 0.26)',
  borderRadius: '14px',
  '& .MuiAlert-icon': {
    color: '#67E8F9',
  },
  '& .MuiAlert-message': {
    color: '#CFFAFE',
    fontWeight: 600,
  },
}

const blendedFieldSx = {
  width: '100%',
  '& .MuiOutlinedInput-root': {
    background: 'transparent',
    borderRadius: '8px',
    '& fieldset': {
      borderColor: 'rgba(255, 255, 255, 0.12)',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(255, 255, 255, 0.25)',
    },
    '&.Mui-focused fieldset': { borderColor: '#67E8F9 !important' },
  },
  '& input': { textAlign: 'center' },
}

const materialFieldSx = { ...blendedFieldSx, minWidth: 170 }
const unitFieldSx = { ...blendedFieldSx, minWidth: 75 }
const quantityFieldSx = { ...blendedFieldSx, minWidth: 105 }
const warehouseFieldSx = { ...blendedFieldSx, minWidth: 120 }

type OrderFormItem = {
  id: string
  recipeItemId?: string
  materialId: string
  warehouseId: string
  plannedQuantity: string
  actualQuantity: string
  actualQuantityEdited: boolean
  notes: string
  unit: string
}

type OrderFormState = {
  recipeId: string
  outputWarehouseId: string
  plannedOutputQuantity: string
  actualOutputQuantity: string
  laborCost: string
  date: string
  notes: string
  defaultInputWarehouseId: string
  items: OrderFormItem[]
}

const emptyFormState: OrderFormState = {
  recipeId: '',
  outputWarehouseId: '',
  plannedOutputQuantity: '',
  actualOutputQuantity: '',
  laborCost: '0',
  date: getLocalDateYMD(),
  notes: '',
  defaultInputWarehouseId: '',
  items: [],
}

function formatMaterialLabel(material: MaterialRecord): string {
  return `${material.materialNumber} - ${material.name}`
}

function formatNumber(value: number | string | null | undefined): string {
  return formatNumberBySettings(value, 'quantity')
}

function roundQuantity(value: number): number {
  return roundNumberBySettings(value, 'quantity')
}

function roundCurrency(value: number): number {
  return roundNumberBySettings(value, 'currency')
}

function formatEditableQuantity(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return ''
  }

  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? String(roundQuantity(numericValue)) : ''
}

function formatEditableCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return ''
  }

  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? String(roundCurrency(numericValue)) : ''
}

function editableNumberString(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return ''
  }

  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? String(numericValue) : ''
}

function formatCurrency(value: number | string | null | undefined): string {
  return formatNumberBySettings(value, 'currency')
}

function getMaterialUnitCost(
  material: MaterialRecord | undefined,
  warehouseId: string,
  balances: StockBalanceRecord[],
): number {
  if (!material) {
    return 0
  }

  const materialBalances = balances.filter((balance) => balance.materialNumber === material.materialNumber)
  const warehouseCost = materialBalances.find((balance) =>
    balance.warehouseId === warehouseId &&
    Number.isFinite(balance.averageCost) &&
    balance.averageCost > 0,
  )?.averageCost
  const weightedBalances = materialBalances.filter((balance) =>
    Number.isFinite(balance.quantity) &&
    balance.quantity > 0 &&
    Number.isFinite(balance.averageCost) &&
    balance.averageCost > 0,
  )
  const totalQuantity = weightedBalances.reduce((sum, balance) => sum + balance.quantity, 0)
  const weightedCost = totalQuantity > 0
    ? weightedBalances.reduce((sum, balance) => sum + balance.quantity * balance.averageCost, 0) / totalQuantity
    : Number.NaN
  const fallbackCost = Number(material.costPrice ?? 0)

  if (warehouseCost !== undefined) {
    return warehouseCost
  }

  return Number.isFinite(weightedCost) ? weightedCost : Number.isFinite(fallbackCost) ? fallbackCost : 0
}

function formatSignedNumber(value: number | string | null | undefined): string {
  const numericValue = roundQuantity(Number(value ?? 0))

  if (!Number.isFinite(numericValue) || numericValue === 0) {
    return formatNumber(0)
  }

  return `${numericValue > 0 ? '+' : ''}${formatNumberBySettings(numericValue, 'quantity')}`
}

function flattenStockableMaterials(nodes: MaterialRecord[]): MaterialRecord[] {
  const result: MaterialRecord[] = []

  const walk = (items: MaterialRecord[]) => {
    for (const item of items) {
      if (
        item.type === 'sub' &&
        !item.isNonStock &&
        (item.status ?? 'active') === 'active'
      ) {
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
              <InputAdornment
                position="start"
                sx={{
                  marginInlineEnd: 0,
                  color: '#E2E8F0',
                }}
              >
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

export function ProductionOrdersPage() {
  const notify = useNotifications()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<ProductionOrderRecord[]>([])
  const [recipes, setRecipes] = useState<ManufacturingRecipeRecord[]>([])
  const [materials, setMaterials] = useState<MaterialRecord[]>([])
  const [stockBalances, setStockBalances] = useState<StockBalanceRecord[]>([])
  const [warehouses, setWarehouses] = useState<WarehouseRecord[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [newOrderOpen, setNewOrderOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrderRecord | null>(null)
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null)
  const [editingOrderNumber, setEditingOrderNumber] = useState('')
  const [orderNumberPreview, setOrderNumberPreview] = useState('PRD-000001')
  const [form, setForm] = useState<OrderFormState>(emptyFormState)
  const [deleteErrorMessage, setDeleteErrorMessage] = useState('')
  const [selectedRecipe, setSelectedRecipe] = useState<ManufacturingRecipeRecord | null>(null)
  const [isRecipeLoading, setIsRecipeLoading] = useState(false)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const isEditMode = Boolean(editingOrderId)
  const dialogOrderNumber = isEditMode ? editingOrderNumber : orderNumberPreview

  const buildProductionExportData = useCallback((): InvoicePrintData | null => {
    if (!selectedOrder) {
      return null
    }

    return {
      documentType: 'production',
      title: 'أمر إنتاج',
      documentNumber: selectedOrder.orderNumber,
      date: formatDateDMY(selectedOrder.date),
      partyLabel: 'المنتج النهائي',
      partyName: selectedOrder.productName,
      referenceLabel: 'نموذج التصنيع',
      referenceValue: selectedOrder.recipeName,
      productName: selectedOrder.productName,
      productQuantity: selectedOrder.actualOutputQuantity,
      notes: selectedOrder.notes,
      items: [
        ...(selectedOrder.inputs ?? []).map((input) => ({
          id: input.id,
          name: input.materialName,
          unit: input.unit || '',
          quantity: input.actualQuantity,
          plannedQuantity: input.plannedQuantity,
          actualQuantity: input.actualQuantity,
          cost: input.totalCost,
        })),
        {
          id: `${selectedOrder.id}-labor`,
          name: 'تكلفة الأجور',
          unit: '',
          quantity: 0,
          plannedQuantity: 0,
          actualQuantity: 0,
          cost: Number(selectedOrder.laborCost ?? 0),
        },
      ],
      subtotal: roundCurrency((selectedOrder.inputs ?? []).reduce((sum, input) => sum + Number(input.totalCost ?? 0), 0) + Number(selectedOrder.laborCost ?? 0)),
      discount: 0,
      total: Number(selectedOrder.totalProductionCost ?? 0),
      productionMode: true,
    }
  }, [selectedOrder])

  const handleExportPdf = useCallback(async () => {
    const exportData = buildProductionExportData()
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
  }, [buildProductionExportData, navigate])

  const manufacturingMaterials = useMemo(
    () => flattenStockableMaterials(materials),
    [materials],
  )
  const availableRecipes = useMemo(
    () => recipes.filter((recipe) => recipe.status === 'active' || recipe.id === form.recipeId),
    [recipes, form.recipeId],
  )
  const estimatedMaterialCost = roundCurrency(form.items.reduce((sum, item) => {
    const quantity = Number(item.actualQuantity || 0)
    const material = manufacturingMaterials.find((entry) => entry.id === item.materialId)
    return sum + roundCurrency((Number.isFinite(quantity) ? quantity : 0) * getMaterialUnitCost(material, item.warehouseId, stockBalances))
  }, 0))
  const estimatedTotalCost = roundCurrency(estimatedMaterialCost + Number(form.laborCost || 0))
  const actualOutputQuantity = Number(form.actualOutputQuantity)
  const estimatedUnitProductionCost = actualOutputQuantity > 0
    ? roundCurrency(estimatedTotalCost / actualOutputQuantity)
    : ''

  const handleAddMaterial = () => {
    setForm((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          id: `${Date.now()}-${Math.random()}`,
          materialId: '',
          warehouseId: current.defaultInputWarehouseId,
          plannedQuantity: '0',
          actualQuantity: '',
          actualQuantityEdited: true,
          notes: '',
          unit: '',
        },
      ],
    }))
  }

  const handleResetMaterialsToRecipe = () => {
    setForm((current) => ({
      ...current,
      items: syncRecipeItems(
        selectedRecipe,
        current.plannedOutputQuantity,
        current.actualOutputQuantity,
        [],
        current.defaultInputWarehouseId,
        false,
      ),
    }))
  }

  const loadData = async () => {
    const [allOrders, allRecipes, allMaterials, allWarehouses, allBalances] = await Promise.all([
      manufacturingService.listProductionOrders(),
      manufacturingService.listRecipes(),
      materialsService.listMaterials(),
      inventoryService.listWarehouses(),
      inventoryService.getBalancesByWarehouse(null),
    ])

    setOrders(allOrders)
    setRecipes(allRecipes)
    setMaterials(allMaterials)
    setWarehouses(allWarehouses)
    setStockBalances(allBalances)
  }

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadData()
    }, 0)

    return () => window.clearTimeout(timerId)
  }, [])

  const syncRecipeItems = (
    recipe: ManufacturingRecipeRecord | null,
    nextPlannedOutputQuantity: string,
    nextActualOutputQuantity: string,
    currentItems: OrderFormItem[],
    defaultWarehouseId: string,
    preserveEditedActual = true,
  ): OrderFormItem[] => {
    if (!recipe?.items?.length) {
      return []
    }

    const plannedOutput = Number(nextPlannedOutputQuantity)
    const actualOutput = Number(nextActualOutputQuantity)
    const standardOutput = Number(recipe.standardOutputQuantity)

    const hasValidStandardOutput =
      Number.isFinite(standardOutput) &&
      standardOutput > 0

    const plannedFactor =
      Number.isFinite(plannedOutput) &&
      plannedOutput > 0 &&
      hasValidStandardOutput
        ? plannedOutput / standardOutput
        : 1

    const actualFactor =
      Number.isFinite(actualOutput) &&
      actualOutput > 0 &&
      hasValidStandardOutput
        ? actualOutput / standardOutput
        : plannedFactor

    const recipeItems = recipe.items.map((item, index) => {
      const previousItem = currentItems.find((entry) => entry.materialId === item.materialId)
      const recipeQuantity = Number(item.quantity ?? 0)
      const plannedQuantity = roundQuantity(recipeQuantity * plannedFactor)
      const calculatedActualQuantity = roundQuantity(recipeQuantity * actualFactor)

      const keepEditedActual =
        preserveEditedActual &&
        Boolean(previousItem?.actualQuantityEdited)

      return {
        id: previousItem?.id ?? `${recipe.id}-${item.id ?? index}`,
        recipeItemId: item.id,
        materialId: item.materialId,
        warehouseId: previousItem?.warehouseId || defaultWarehouseId || '',
        plannedQuantity: formatEditableQuantity(plannedQuantity),
        actualQuantity: keepEditedActual
          ? previousItem?.actualQuantity ?? formatEditableQuantity(calculatedActualQuantity)
          : formatEditableQuantity(calculatedActualQuantity),
        actualQuantityEdited: keepEditedActual,
        notes: previousItem?.notes ?? item.notes ?? '',
        unit: item.unit || previousItem?.unit || '',
      }
    })
    const recipeMaterialIds = new Set(recipe.items.map((item) => item.materialId))
    const additionalItems = currentItems.filter(
      (item) => !item.recipeItemId && !recipeMaterialIds.has(item.materialId),
    )

    return [...recipeItems, ...additionalItems]
  }

  const handleRecipeChange = async (recipeOption: ManufacturingRecipeRecord | null) => {
    const nextRecipeId = recipeOption?.id ?? ''

    setErrorMessage('')
    setSelectedRecipe(null)
    setForm((current) => ({
      ...current,
      recipeId: nextRecipeId,
      items: [],
    }))

    if (!nextRecipeId) {
      setIsRecipeLoading(false)
      return
    }

    try {
      setIsRecipeLoading(true)
      const recipe = await manufacturingService.getRecipeById(nextRecipeId)

      if (!recipe) {
        setErrorMessage('نموذج التصنيع غير موجود أو لا يحتوي على بيانات صالحة.')
        return
      }

      setSelectedRecipe(recipe)
      setForm((current) => {
        if (current.recipeId !== nextRecipeId) {
          return current
        }

        const plannedBasis = current.plannedOutputQuantity || String(recipe.standardOutputQuantity)
        const actualBasis = current.actualOutputQuantity || plannedBasis

        return {
          ...current,
          items: syncRecipeItems(
            recipe,
            plannedBasis,
            actualBasis,
            [],
            current.defaultInputWarehouseId,
            false,
          ),
        }
      })
    } catch (error) {
      setSelectedRecipe(null)
      setForm((current) => current.recipeId === nextRecipeId ? { ...current, items: [] } : current)
      setErrorMessage(getUserFriendlyErrorMessage(error, 'تعذر تحميل تفاصيل نموذج التصنيع.'))
    } finally {
      setIsRecipeLoading(false)
    }
  }

  const openNewOrder = async () => {
    const nextNumber = await manufacturingService.getNextProductionOrderNumber()
    setOrderNumberPreview(nextNumber)
    setSelectedRecipe(null)
    setIsRecipeLoading(false)
    setForm({ ...emptyFormState })
    setErrorMessage('')
    setNewOrderOpen(true)
  }

  const handleCloseOrderDialog = () => {
    setNewOrderOpen(false)
    setSelectedRecipe(null)
    setIsRecipeLoading(false)
    setEditingOrderId(null)
    setEditingOrderNumber('')
    setForm({ ...emptyFormState })
    setErrorMessage('')
  }

  const openEditOrder = async (orderId: string) => {
    try {
      setErrorMessage('')
      setIsRecipeLoading(true)
      setSelectedRecipe(null)
      setEditingOrderId(orderId)

      const order = await manufacturingService.getProductionOrderById(orderId)
      if (!order) {
        setErrorMessage('أمر الإنتاج غير موجود.')
        return
      }

      setSelectedOrder(order)
      setEditingOrderNumber(order.orderNumber)

      const recipe = await manufacturingService.getRecipeById(order.recipeId)
      if (!recipe) {
        setErrorMessage('نموذج التصنيع غير موجود أو لا يحتوي على بيانات صالحة.')
        return
      }

      setSelectedRecipe(recipe)

      const nextForm: OrderFormState = {
        recipeId: order.recipeId,
        outputWarehouseId: order.outputWarehouseId,
        plannedOutputQuantity: editableNumberString(order.plannedOutputQuantity),
        actualOutputQuantity: editableNumberString(order.actualOutputQuantity),
        laborCost: editableNumberString(order.laborCost ?? 0),
        date: order.date,
        notes: order.notes ?? '',
        defaultInputWarehouseId: order.inputs?.[0]?.warehouseId ?? '',
        items: (order.inputs ?? []).map((input) => ({
          id: input.id,
          recipeItemId: input.recipeItemId ?? undefined,
          materialId: input.materialId,
          warehouseId: input.warehouseId,
          plannedQuantity: editableNumberString(input.plannedQuantity),
          actualQuantity: editableNumberString(input.actualQuantity),
          actualQuantityEdited: true,
          notes: input.notes ?? '',
          unit: input.unit || '',
        })),
      }

      setForm((current) => ({
        ...current,
        ...nextForm,
      }))
      setNewOrderOpen(true)
    } catch (error) {
      setErrorMessage(getUserFriendlyErrorMessage(error, 'تعذر تحميل تفاصيل أمر الإنتاج.'))
    } finally {
      setIsRecipeLoading(false)
    }
  }

  const openOrderDetails = async (orderId: string) => {
    try {
      setErrorMessage('')
      const order = await manufacturingService.getProductionOrderById(orderId)
      if (!order) {
        setErrorMessage('أمر الإنتاج غير موجود.')
        return
      }

      setSelectedOrder(order)
      setDetailsOpen(true)
    } catch (error) {
      setErrorMessage(getUserFriendlyErrorMessage(error, 'تعذر تحميل تفاصيل أمر الإنتاج.'))
    }
  }

  const validateForm = (): string | null => {
    if (!form.recipeId) {
      return 'يجب اختيار نموذج التصنيع.'
    }

    if (isRecipeLoading) {
      return 'جارٍ تحميل مواد نموذج التصنيع، يرجى الانتظار.'
    }

    if (!selectedRecipe) {
      return 'جارٍ تحميل مواد نموذج التصنيع، يرجى الانتظار.'
    }

    if (!selectedRecipe.items || selectedRecipe.items.length === 0) {
      return 'نموذج التصنيع لا يحتوي على مواد أولية.'
    }

    if (!form.outputWarehouseId) {
      return 'يجب اختيار مخزن المنتج النهائي.'
    }

    const planned = Number(form.plannedOutputQuantity)
    const actual = Number(form.actualOutputQuantity)
    const laborCost = Number(form.laborCost)
    if (!Number.isFinite(planned) || planned <= 0) {
      return 'يجب أن تكون الكمية المخططة أكبر من صفر.'
    }
    if (!Number.isFinite(actual) || actual <= 0) {
      return 'يجب أن تكون الكمية الفعلية أكبر من صفر.'
    }
    if (!Number.isFinite(laborCost) || laborCost < 0) {
      return 'تكلفة الأجور يجب أن تكون صفراً أو قيمة موجبة.'
    }

    if (form.items.length === 0) {
      return 'يجب إضافة مادة أولية واحدة على الأقل.'
    }

    const seenMaterialIds = new Set<string>()
    for (const item of form.items) {
      if (!item.materialId) {
        return 'توجد مادة أولية غير محددة.'
      }
      if (item.materialId === selectedRecipe.productMaterialId) {
        return 'لا يمكن استخدام المنتج النهائي نفسه كمادة أولية.'
      }
      if (seenMaterialIds.has(item.materialId)) {
        return 'لا يمكن تكرار المادة الأولية في أكثر من سطر.'
      }
      if (!item.warehouseId) {
        return 'كل مادة أولية تحتاج إلى مخزن صرف.'
      }
      const qty = Number(item.actualQuantity)
      if (!Number.isFinite(qty) || qty <= 0) {
        return 'كل مادة أولية يجب أن تحتوي على كمية فعلية أكبر من صفر.'
      }
      seenMaterialIds.add(item.materialId)
    }

    return null
  }

  const handleSaveOrder = async () => {
    const validationMessage = validateForm()
    if (validationMessage) {
      setErrorMessage(validationMessage)
      return
    }

    const payload: ProductionOrderPayload = {
      recipeId: form.recipeId,
      outputWarehouseId: form.outputWarehouseId,
      plannedOutputQuantity: roundQuantity(Number(form.plannedOutputQuantity)),
      actualOutputQuantity: roundQuantity(Number(form.actualOutputQuantity)),
      laborCost: roundCurrency(Number(form.laborCost || 0)),
      date: form.date,
      notes: form.notes.trim(),
      items: form.items.map((item) => ({
        recipeItemId: item.recipeItemId ?? null,
        materialId: item.materialId,
        warehouseId: item.warehouseId,
        plannedQuantity: roundQuantity(Number(item.plannedQuantity || 0)),
        actualQuantity: roundQuantity(Number(item.actualQuantity)),
        unit: item.unit,
        notes: item.notes.trim(),
      })),
    }

    try {
      setErrorMessage('')
      if (isEditMode && editingOrderId) {
        await manufacturingService.updateProductionOrder(editingOrderId, payload)
        notify.info('تم تعديل أمر الإنتاج بنجاح.')
      } else {
        await manufacturingService.createProductionOrder(payload)
        notify.success('تم إنشاء أمر الإنتاج بنجاح.')
      }
      await loadData()
      handleCloseOrderDialog()
    } catch (error) {
      const message = isEditMode
        ? 'تعذر حفظ تعديلات أمر الإنتاج. يرجى المحاولة مرة أخرى.'
        : 'تعذر إنشاء أمر الإنتاج. يرجى المحاولة مرة أخرى.'
      setErrorMessage(getUserFriendlyErrorMessage(error, message))
    }
  }

  const handleDeleteOrder = async (orderId: string) => {
    try {
      setErrorMessage('')
      await manufacturingService.deleteProductionOrder(orderId)
      setDeleteConfirmId(null)
      setDeleteErrorMessage('')
      setSelectedOrder(null)
      setDetailsOpen(false)
      await loadData()
      notify.error('تم حذف أمر الإنتاج بنجاح.')
    } catch (error) {
      const message = getUserFriendlyErrorMessage(error, 'لا يمكن حذف أمر الإنتاج لأنه مرتبط بنموذج تصنيع أو تم استخدامه في الإنتاج.')
      setDeleteErrorMessage(message)
    }
  }

  return (
    <Box sx={craftPageGlassSx}>
      <PageHeader title="أوامر الإنتاج" breadcrumb="إنشاء واعتماد أوامر إنتاج فعليّة مع أثر المخزون" />

      <SectionCard
        title="سجل أوامر الإنتاج"
        actions={
          <Button variant="contained" startIcon={<FiPlus />} onClick={() => { void openNewOrder() }}>
            أمر إنتاج جديد
          </Button>
        }
      >
        <Box sx={tableScrollSx}>
          <Box component="table" sx={craftHtmlTableSx}>
            <Box component="thead" sx={{ background: 'rgba(255, 255, 255, 0.055)' }}>
              <Box component="tr">
                <Box component="th" sx={{ p: 2, textAlign: 'center', fontWeight: 700 }}>رقم الأمر</Box>
                <Box component="th" sx={{ p: 2, textAlign: 'center', fontWeight: 700 }}>التاريخ</Box>
                <Box component="th" sx={{ p: 2, textAlign: 'center', fontWeight: 700 }}>النموذج</Box>
                <Box component="th" sx={{ p: 2, textAlign: 'center', fontWeight: 700 }}>المنتج</Box>
                <Box component="th" sx={{ p: 2, textAlign: 'center', fontWeight: 700 }}>كمية الإنتاج</Box>
                <Box component="th" sx={{ p: 2, textAlign: 'center', fontWeight: 700 }}>المخزن</Box>
                <Box component="th" sx={{ p: 2, textAlign: 'center', fontWeight: 700 }}>الأجور</Box>
                <Box component="th" sx={{ p: 2, textAlign: 'center', fontWeight: 700 }}>التكلفة</Box>
                <Box component="th" sx={{ p: 2, textAlign: 'center', fontWeight: 700 }}>تكلفة الوحدة</Box>
                <Box component="th" sx={{ p: 1, textAlign: 'center', fontWeight: 700 }}>الإجراءات</Box>
              </Box>
            </Box>
            <Box component="tbody">
              {orders.length === 0 ? (
                <Box component="tr">
                  <Box component="td" colSpan={10} sx={{ p: 3, textAlign: 'center', color: 'rgba(255, 255, 255, 0.72)' }}>
                    لا توجد أوامر إنتاج.
                  </Box>
                </Box>
              ) : null}
              {orders
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((order) => (
                <Box component="tr" key={order.id} sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.18)', background: 'rgba(255, 255, 255, 0.022)' }}>
                  <Box component="td" sx={{ p: 2, textAlign: 'center' }}>{order.orderNumber}</Box>
                  <Box component="td" sx={{ p: 2, textAlign: 'center' }}>{formatDateDMY(order.date)}</Box>
                  <Box component="td" sx={{ p: 2, textAlign: 'center' }}>{order.recipeName}</Box>
                  <Box component="td" sx={{ p: 2, textAlign: 'center' }}>{order.productName}</Box>
                  <Box component="td" sx={{ p: 2, textAlign: 'center' }}>{formatNumber(order.actualOutputQuantity)}</Box>
                  <Box component="td" sx={{ p: 2, textAlign: 'center' }}>{order.outputWarehouseName}</Box>
                  <Box component="td" sx={{ p: 2, textAlign: 'center' }}>{formatCurrency(order.laborCost)}</Box>
                  <Box component="td" sx={{ p: 2, textAlign: 'center' }}>{formatCurrency(order.totalProductionCost)}</Box>
                  <Box component="td" sx={{ p: 2, textAlign: 'center' }}>{formatCurrency(order.unitProductionCost)}</Box>
                  <Box component="td" sx={{ p: 1, textAlign: 'center' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.5, flexWrap: 'nowrap' }}>

                      <Tooltip title="عرض">
                        <IconButton size="small" color="secondary" onClick={() => { void openOrderDetails(order.id) }}>
                          <FiEye />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="تعديل">
                        <IconButton size="small" color="primary" onClick={() => { void openEditOrder(order.id) }}>
                          <FiEdit2 />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="حذف">
                        <IconButton size="small" color="error" onClick={() => setDeleteConfirmId(order.id)}>
                          <FiTrash2 />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <TablePagination
            component="div"
            count={orders.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            labelRowsPerPage="الصفوف:"
            onRowsPerPageChange={(event) => {
              setRowsPerPage(Number(event.target.value))
              setPage(0)
            }}
          />
        </Box>
      </SectionCard>

      <Dialog
        open={newOrderOpen}
        onClose={handleCloseOrderDialog}
        maxWidth="lg"
        fullWidth
        slotProps={craftDialogSlotProps}
      >
        <DialogTitle>{isEditMode ? 'تعديل أمر الإنتاج' : 'إنشاء أمر إنتاج جديد'}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', minWidth: 0, maxWidth: '100%', overflowX: 'hidden' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', minWidth: 0, maxWidth: '100%', gap: 2, paddingTop: '12px' }}>
            {errorMessage ? <Alert severity="error" sx={craftErrorAlertSx}>{errorMessage}</Alert> : null}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' }, minWidth: 0, maxWidth: '100%', gap: 2 }}>
              <TextField label="رقم الأمر" value={dialogOrderNumber} slotProps={{ input: { readOnly: true } }} />
              <DateFilterField
                label="تاريخ الأمر"
                value={form.date}
                onChange={(value) => setForm((current) => ({ ...current, date: toInternalDate(value) }))}
              />
              <Autocomplete
                options={availableRecipes}
                getOptionLabel={(option) => option.name}
                value={availableRecipes.find((recipe) => recipe.id === form.recipeId) ?? null}
                onChange={(_, value) => {
                  void handleRecipeChange(value)
                }}
                slotProps={{ paper: { sx: darkPopupPaperSx } }}
                renderInput={(params) => <TextField {...params} label="نموذج التصنيع" />}
              />
              <TextField
                select
                label="مخزن المنتج النهائي"
                value={form.outputWarehouseId}
                onChange={(event) => setForm((current) => ({ ...current, outputWarehouseId: event.target.value }))}
                slotProps={darkSelectSlotProps}
              >
                {warehouses.filter((warehouse) => warehouse.status !== 'deleted').map((warehouse) => (
                  <MenuItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</MenuItem>
                ))}
              </TextField>
              <TextField
                label="الكمية المخططة"
                type="number"
                value={form.plannedOutputQuantity}
                onChange={(event) => {
                  const nextValue = event.target.value
                  setForm((current) => ({
                    ...current,
                    plannedOutputQuantity: nextValue,
                    items: selectedRecipe
                      ? syncRecipeItems(
                          selectedRecipe,
                          nextValue,
                          current.actualOutputQuantity,
                          current.items,
                          current.defaultInputWarehouseId,
                          true,
                        )
                      : current.items,
                  }))
                }}
                onBlur={() => {
                  setForm((current) => ({
                    ...current,
                    plannedOutputQuantity: current.plannedOutputQuantity
                      ? formatEditableQuantity(current.plannedOutputQuantity)
                      : '',
                  }))
                }}
                slotProps={{ htmlInput: { min: 0, step: 'any' } }}
              />
              <TextField
                label="الكمية الفعلية"
                type="number"
                value={form.actualOutputQuantity}
                onChange={(event) => {
                  const nextValue = event.target.value
                  setForm((current) => ({
                    ...current,
                    actualOutputQuantity: nextValue,
                    items: selectedRecipe
                      ? syncRecipeItems(
                          selectedRecipe,
                          current.plannedOutputQuantity,
                          nextValue,
                          current.items,
                          current.defaultInputWarehouseId,
                          false,
                        )
                      : current.items,
                  }))
                }}
                onBlur={() => {
                  setForm((current) => ({
                    ...current,
                    actualOutputQuantity: current.actualOutputQuantity
                      ? formatEditableQuantity(current.actualOutputQuantity)
                      : '',
                  }))
                }}
                slotProps={{ htmlInput: { min: 0, step: 'any' } }}
              />
              <TextField
                label="تكلفة الأجور الفعلية"
                type="number"
                value={form.laborCost}
                onChange={(event) => setForm((current) => ({ ...current, laborCost: event.target.value }))}
                onBlur={() => {
                  setForm((current) => ({
                    ...current,
                    laborCost: current.laborCost ? formatEditableCurrency(current.laborCost) : '',
                  }))
                }}
                slotProps={{ htmlInput: { min: 0, step: 'any' } }}
              />
              <TextField
                select
                label="المخزن الافتراضي للمواد الأولية"
                value={form.defaultInputWarehouseId}
                slotProps={darkSelectSlotProps}
                onChange={(event) => {
                  const warehouseId = event.target.value
                  setForm((current) => ({
                    ...current,
                    defaultInputWarehouseId: warehouseId,
                    items: current.items.map((item) => ({
                      ...item,
                      warehouseId,
                    })),
                  }))
                }}
              >
                <MenuItem value="">بدون مخزن افتراضي</MenuItem>
                {warehouses.filter((warehouse) => warehouse.status !== 'deleted').map((warehouse) => (
                  <MenuItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</MenuItem>
                ))}
              </TextField>
            </Box>

            {selectedRecipe && (
              <Box sx={{ p: 2, minWidth: 0, maxWidth: '100%', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.14)', borderRadius: '14px', background: 'rgba(255, 255, 255, 0.035)' }}>
                <Typography sx={{ fontWeight: 700, mb: 1 }}>{selectedRecipe.name}</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.72)' }}>الكمية القياسية: {selectedRecipe.standardOutputQuantity} | المنتج: {selectedRecipe.productName}</Typography>
              </Box>
            )}

            {isRecipeLoading ? (
              <Alert severity="info" sx={craftInfoAlertSx}>جارٍ تحميل مواد نموذج التصنيع، يرجى الانتظار.</Alert>
            ) : null}

            {selectedRecipe && selectedRecipe.items && selectedRecipe.items.length > 0 ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', minWidth: 0, maxWidth: '100%', gap: 2 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', minWidth: 0, maxWidth: '100%', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <Typography sx={{ fontWeight: 700 }}>المواد الأولية</Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Button variant="outlined" startIcon={<FiPlus />} onClick={handleAddMaterial}>إضافة مادة أولية</Button>
                      <Button variant="outlined" onClick={handleResetMaterialsToRecipe}>إعادة ضبط حسب النموذج</Button>
                    </Box>
                  </Box>
                  <TableContainer sx={{ width: '100%', maxWidth: '100%', minWidth: 0, display: 'block', overflowX: 'auto', overflowY: 'hidden' }}>
                    <Box component="table" sx={{ ...craftHtmlTableSx, '& th, & td': { p: 0.75 }, '& .MuiInputBase-root': { minWidth: 'max-content' } }}>
                      <Box component="thead" sx={{ background: 'rgba(255, 255, 255, 0.055)' }}>
                        <Box component="tr">
                          <Box component="th">المادة</Box>
                          <Box component="th">الوحدة</Box>
                          <Box component="th">الكمية حسب النموذج</Box>
                          <Box component="th">الاستهلاك الفعلي</Box>
                          <Box component="th">تكلفة الوحدة التقديرية</Box>
                          <Box component="th">إجمالي التكلفة التقديرية للسطر</Box>
                          <Box component="th">مخزن الصرف</Box>
                          <Box component="th">الإجراءات</Box>
                        </Box>
                      </Box>
                      <Box component="tbody">
                        {form.items.map((item) => {
                          const material = manufacturingMaterials.find((entry) => entry.id === item.materialId)
                          return (
                            <Box component="tr" key={item.id} sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.18)', textAlignLast: 'center' }}>
                            <Box component="td">
                              {item.recipeItemId ? (
                                <TextField value={material ? formatMaterialLabel(material) : ''} slotProps={{ input: { readOnly: true } }} size="small" fullWidth sx={materialFieldSx} />
                              ) : (
                                <Autocomplete
                                  options={manufacturingMaterials}
                                  getOptionLabel={formatMaterialLabel}
                                  isOptionEqualToValue={(option, value) => option.id === value.id}
                                  value={material ?? null}
                                  onChange={(_, selectedMaterial) => {
                                    setForm((current) => ({
                                      ...current,
                                      items: current.items.map((entry) => entry.id === item.id
                                        ? {
                                            ...entry,
                                            materialId: selectedMaterial?.id ?? '',
                                            unit: selectedMaterial?.unit ?? '',
                                          }
                                        : entry),
                                    }))
                                  }}
                                  slotProps={{ paper: { sx: darkPopupPaperSx } }}
                                  renderInput={(params) => <TextField {...params} size="small" fullWidth sx={materialFieldSx} />}
                                  fullWidth
                                />
                              )}
                            </Box>
                            <Box component="td">
                              <TextField value={item.unit || material?.unit || ''} slotProps={{ input: { readOnly: true } }} size="small" fullWidth sx={unitFieldSx} />
                            </Box>
                            <Box component="td">
                              <TextField value={formatNumber(item.plannedQuantity)} slotProps={{ input: { readOnly: true } }} size="small" fullWidth sx={quantityFieldSx} />
                            </Box>
                            <Box component="td">
                              <TextField
                                value={item.actualQuantity}
                                type="number"
                                size="small"
                                fullWidth
                                onChange={(event) => {
                                  setForm((current) => ({
                                    ...current,
                                    items: current.items.map((entry) => entry.id === item.id
                                      ? { ...entry, actualQuantity: event.target.value, actualQuantityEdited: true }
                                      : entry),
                                  }))
                                }}
                                onBlur={() => {
                                  setForm((current) => ({
                                    ...current,
                                    items: current.items.map((entry) => entry.id === item.id
                                      ? {
                                          ...entry,
                                          actualQuantity: entry.actualQuantity
                                            ? formatEditableQuantity(entry.actualQuantity)
                                            : '',
                                        }
                                      : entry),
                                  }))
                                }}
                                slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                                sx={quantityFieldSx}
                              />
                            </Box>
                            <Box component="td">
                              {formatCurrency(getMaterialUnitCost(material, item.warehouseId, stockBalances))}
                            </Box>
                            <Box component="td">
                              {formatCurrency(roundCurrency(Number(item.actualQuantity || 0) * getMaterialUnitCost(material, item.warehouseId, stockBalances)))}
                            </Box>
                            <Box component="td">
                              <TextField
                                select
                                value={item.warehouseId}
                                size="small"
                                fullWidth
                                slotProps={darkSelectSlotProps}
                                sx={warehouseFieldSx}
                                onChange={(event) => {
                                  setForm((current) => ({
                                    ...current,
                                    items: current.items.map((entry) => entry.id === item.id ? { ...entry, warehouseId: event.target.value } : entry),
                                  }))
                                }}
                              >
                                {warehouses.filter((warehouse) => warehouse.status !== 'deleted').map((warehouse) => (
                                  <MenuItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</MenuItem>
                                ))}
                              </TextField>
                            </Box>
                            <Box component="td">
                              <Button size="small" color="error" sx={{ minWidth: 0, px: 0.5 }} onClick={() => {
                                setForm((current) => ({
                                  ...current,
                                  items: current.items.filter((entry) => entry.id !== item.id),
                                }))
                              }}>حذف</Button>
                            </Box>
                          </Box>
                          )
                        })}
                      </Box>
                    </Box>
                    </TableContainer>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(4, minmax(0, 1fr))' }, minWidth: 0, maxWidth: '100%', gap: 2, mt: 2 }}>
                    <TextField label="إجمالي تكلفة المواد التقديرية" value={formatCurrency(estimatedMaterialCost)} slotProps={{ input: { readOnly: true } }} fullWidth />
                    <TextField label="تكلفة الأجور الفعلية" value={formatCurrency(form.laborCost || 0)} slotProps={{ input: { readOnly: true } }} fullWidth />
                    <TextField label="إجمالي التكلفة المتوقعة" value={formatCurrency(estimatedTotalCost)} slotProps={{ input: { readOnly: true } }} fullWidth />
                    <TextField label="تكلفة الوحدة المنتجة المتوقعة" value={estimatedUnitProductionCost === '' ? '' : formatCurrency(estimatedUnitProductionCost)} slotProps={{ input: { readOnly: true } }} fullWidth />
                  </Box>
                </Box>
              </Box>
            ) : null}

            <TextField
              label="ملاحظات الأمر"
              multiline
              minRows={3}
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            />

          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseOrderDialog}>إلغاء</Button>
          <Button variant="contained" onClick={() => { void handleSaveOrder() }}>{isEditMode ? 'حفظ التعديلات' : 'حفظ الأمر'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(deleteConfirmId)}
        onClose={() => {
          setDeleteErrorMessage('')
          setDeleteConfirmId(null)
        }}
        maxWidth="sm"
        fullWidth
        slotProps={craftDialogSlotProps}
      >
        <DialogTitle>تأكيد حذف أمر الإنتاج</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', minWidth: 0, maxWidth: '100%', overflowX: 'hidden', gap: 2 }}>
          {deleteErrorMessage ? <Alert severity="error" sx={craftErrorAlertSx}>{deleteErrorMessage}</Alert> : null}
          <Typography>
            هل أنت متأكد من حذف هذا الأمر؟ سيتم إلغاء أثر المخزون والتكلفة المرتبط به.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDeleteErrorMessage('')
            setDeleteConfirmId(null)
          }}>تراجع</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              if (!deleteConfirmId) return
              void handleDeleteOrder(deleteConfirmId)
            }}
          >
            حذف
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={detailsOpen}
        onClose={() => {
          setDetailsOpen(false)
        }}
        maxWidth="xl"
        fullWidth
        slotProps={craftDialogSlotProps}
      >
        <DialogTitle>تفاصيل أمر الإنتاج</DialogTitle>
        <DialogContent dividers sx={{ minWidth: 0, maxWidth: '100%', overflowX: 'hidden' }}>
          {selectedOrder ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', minWidth: 0, maxWidth: '100%', gap: 2 }}>
              <Box sx={tableScrollSx}>
                <Box component="table" sx={craftHtmlTableSx}>
                  <Box component="thead" sx={{ background: 'rgba(255, 255, 255, 0.055)' }}>
                    <Box component="tr">
                      <Box component="th" sx={{ p: 1.25, textAlign: 'center', fontWeight: 700 }}>رقم الأمر</Box>
                      <Box component="th" sx={{ p: 1.25, textAlign: 'center', fontWeight: 700 }}>نموذج التصنيع</Box>
                      <Box component="th" sx={{ p: 1.25, textAlign: 'center', fontWeight: 700 }}>المنتج</Box>
                      <Box component="th" sx={{ p: 1.25, textAlign: 'center', fontWeight: 700 }}>مخزن المنتج النهائي</Box>
                      <Box component="th" sx={{ p: 1.25, textAlign: 'center', fontWeight: 700 }}>الكمية المخططة</Box>
                      <Box component="th" sx={{ p: 1.25, textAlign: 'center', fontWeight: 700 }}>الكمية الناتجة فعليًا</Box>
                      <Box component="th" sx={{ p: 1.25, textAlign: 'center', fontWeight: 700 }}>تكلفة المواد</Box>
                      <Box component="th" sx={{ p: 1.25, textAlign: 'center', fontWeight: 700 }}>تكلفة الأجور</Box>
                      <Box component="th" sx={{ p: 1.25, textAlign: 'center', fontWeight: 700 }}>إجمالي تكلفة الإنتاج</Box>
                      <Box component="th" sx={{ p: 1.25, textAlign: 'center', fontWeight: 700 }}>تكلفة الوحدة المنتجة</Box>
                    </Box>
                  </Box>
                  <Box component="tbody">
                    <Box component="tr">
                      <Box component="td" sx={{ p: 1.25, textAlign: 'center' }}>{selectedOrder.orderNumber}</Box>
                      <Box component="td" sx={{ p: 1.25, textAlign: 'center' }}>{selectedOrder.recipeName}</Box>
                      <Box component="td" sx={{ p: 1.25, textAlign: 'center' }}>{selectedOrder.productName}</Box>
                      <Box component="td" sx={{ p: 1.25, textAlign: 'center' }}>{selectedOrder.outputWarehouseName}</Box>
                      <Box component="td" sx={{ p: 1.25, textAlign: 'center' }}>{formatNumber(selectedOrder.plannedOutputQuantity)}</Box>
                      <Box component="td" sx={{ p: 1.25, textAlign: 'center' }}>{formatNumber(selectedOrder.actualOutputQuantity)}</Box>
                      <Box component="td" sx={{ p: 1.25, textAlign: 'center' }}>{formatCurrency(selectedOrder.materialCostTotal)}</Box>
                      <Box component="td" sx={{ p: 1.25, textAlign: 'center' }}>{formatCurrency(selectedOrder.laborCost)}</Box>
                      <Box component="td" sx={{ p: 1.25, textAlign: 'center' }}>{formatCurrency(selectedOrder.totalProductionCost)}</Box>
                      <Box component="td" sx={{ p: 1.25, textAlign: 'center' }}>{formatCurrency(selectedOrder.unitProductionCost)}</Box>
                    </Box>
                  </Box>
                </Box>
              </Box>

              <Typography sx={{ fontWeight: 700 }}>المواد الأولية والتكلفة</Typography>

              {selectedOrder.inputs && selectedOrder.inputs.length > 0 ? (
                <Box sx={tableScrollSx}>
                  <Box component="table" sx={craftHtmlTableSx}>
                    <Box component="thead" sx={{ background: 'rgba(255, 255, 255, 0.055)' }}>
                      <Box component="tr">
                        <Box component="th" sx={{ p: 1.25, textAlign: 'center', fontWeight: 700 }}>المادة</Box>
                        <Box component="th" sx={{ p: 1.25, textAlign: 'center', fontWeight: 700 }}>المخزن</Box>
                        <Box component="th" sx={{ p: 1.25, textAlign: 'center', fontWeight: 700 }}>الوحدة</Box>
                        <Box component="th" sx={{ p: 1.25, textAlign: 'center', fontWeight: 700 }}>الكمية المخططة</Box>
                        <Box component="th" sx={{ p: 1.25, textAlign: 'center', fontWeight: 700 }}>الاستهلاك الفعلي</Box>
                        <Box component="th" sx={{ p: 1.25, textAlign: 'center', fontWeight: 700 }}>الفرق</Box>
                        <Box component="th" sx={{ p: 1.25, textAlign: 'center', fontWeight: 700 }}>تكلفة الوحدة</Box>
                        <Box component="th" sx={{ p: 1.25, textAlign: 'center', fontWeight: 700 }}>إجمالي التكلفة</Box>
                      </Box>
                    </Box>
                    <Box component="tbody">
                      {selectedOrder.inputs.map((input) => {
                        const plannedQuantity = Number(input.plannedQuantity ?? 0)
                        const actualQuantity = Number(input.actualQuantity ?? 0)
                        const difference = roundQuantity(actualQuantity - plannedQuantity)
                        const differenceText = formatSignedNumber(difference)

                        return (
                          <Box component="tr" key={input.id}>
                            <Box component="td" sx={{ p: 1.25, textAlign: 'center' }}>{input.materialName}</Box>
                            <Box component="td" sx={{ p: 1.25, textAlign: 'center' }}>{input.warehouseName}</Box>
                            <Box component="td" sx={{ p: 1.25, textAlign: 'center' }}>{input.unit || ''}</Box>
                            <Box component="td" sx={{ p: 1.25, textAlign: 'center' }}>{formatNumber(input.plannedQuantity)}</Box>
                            <Box component="td" sx={{ p: 1.25, textAlign: 'center' }}>{formatNumber(input.actualQuantity)}</Box>
                            <Box component="td" sx={{ p: 1.25, textAlign: 'center', color: difference > 0 ? '#FCA5A5' : difference < 0 ? '#86EFAC' : 'inherit' }}>{differenceText}</Box>
                            <Box component="td" sx={{ p: 1.25, textAlign: 'center' }}>{formatCurrency(input.unitCost)}</Box>
                            <Box component="td" sx={{ p: 1.25, textAlign: 'center' }}>{formatCurrency(input.totalCost)}</Box>
                          </Box>
                        )
                      })}
                    </Box>
                  </Box>
                </Box>
              ) : (
                <Alert severity="info" sx={craftInfoAlertSx}>لا توجد مواد أولية مسجلة لهذا الأمر.</Alert>
              )}

              {selectedOrder.notes?.trim() ? (
                <Box sx={{ p: 1.5, border: '1px solid #E2E8F0', borderRadius: 1, background: 'rgba(255, 255, 255, 0.055)' }}>
                  <Typography sx={{ fontWeight: 700, mb: 0.5 }}>ملاحظات أمر الإنتاج</Typography>
                  <Typography variant="body2">{selectedOrder.notes}</Typography>
                </Box>
              ) : null}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" onClick={() => { void handleExportPdf() }}>تصدير PDF</Button>
          <Button onClick={() => {
            setDetailsOpen(false)
          }}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
