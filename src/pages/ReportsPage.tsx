import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  FiActivity,
  FiBarChart2,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiLayers,
  FiPackage,
  FiPieChart,
  FiShoppingCart,
  FiTrendingDown,
  FiTrendingUp,
} from 'react-icons/fi'
import { PageHeader } from '../components/ui/PageHeader'
import { ReportTable, type ReportTableColumn } from '../components/ui/ReportTable'
import {
  reportsService,
  type ReportApiResponse,
  type ReportChartPoint,
  type ReportChartSeries,
  type ReportFilters,
  type ReportMetric,
  type ReportPeriod,
  type ReportType,
} from '../services/reportsService'
import { inventoryService, type WarehouseRecord } from '../services/inventoryService'
import { materialsService, type MaterialRecord } from '../services/materialsService'
import {
  formatCurrencyValue,
  formatDateDMY,
  formatNumberBySettings,
  toInternalDate,
} from '../utils/displayFormatting'
import { getUserFriendlyErrorMessage } from '../utils/errorMessages'
import { useNotifications } from '../contexts/useNotifications'

type ReportConfig = {
  label: string
  subtitle: string
  chartTitle: string
  distributionTitle: string
  supportsDate: boolean
  columns: ReportTableColumn[]
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
  '& .MuiMenuItem-root': {
    color: 'rgba(255, 255, 255, 0.88)',
    borderRadius: '8px',
    mx: 0.5,
    my: 0.25,
    '&:hover': {
      background: 'rgba(56, 189, 248, 0.10)',
    },
    '&.Mui-selected': {
      color: '#67E8F9',
      background: 'rgba(34, 211, 238, 0.13)',
    },
    '&.Mui-selected:hover': {
      background: 'rgba(34, 211, 238, 0.18)',
    },
  },
}

const darkSelectSlotProps = {
  select: {
    MenuProps: {
      slotProps: {
        paper: { sx: darkPopupPaperSx },
      },
    },
  },
}

const scrollableMaterialSelectSlotProps = {
  select: {
    MenuProps: {
      slotProps: {
        paper: {
          sx: {
            ...darkPopupPaperSx,
            maxHeight: 340,
            overflowY: 'auto',
            overflowX: 'hidden',
          },
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

  '& .MuiSelect-icon': {
    color: 'rgba(255, 255, 255, 0.78)',
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

const dashboardPanelSx = {
  p: 2.25,
  borderRadius: '18px',
  background: 'rgba(248, 250, 252, 0.10)',
  backdropFilter: 'blur(36px) saturate(120%)',
  WebkitBackdropFilter: 'blur(18px) saturate(120%)',
  border: '1px solid rgba(255, 255, 255, 0.10)',
  boxShadow: '0 18px 45px rgba(2, 6, 23, 0.16)',
  color: 'rgba(255, 255, 255, 0.92)',
  backgroundImage: 'none',
}

const money = (value: unknown) => {
  return formatCurrencyValue(Number(value ?? 0))
}

const number2 = (value: unknown) => {
  return formatNumberBySettings(Number(value ?? 0), 'quantity')
}

const dateCell = (value: unknown) => formatDateDMY(String(value ?? ''))

const productionDifferenceCell = (value: unknown) => {
  const difference = Number(value ?? 0)

  if (!Number.isFinite(difference) || Math.abs(difference) < 0.000001) {
    return (
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.6,
          minWidth: 90,
          px: 1,
          py: 0.45,
          borderRadius: '999px',
          color: '#86EFAC',
          background: 'rgba(34,197,94,.10)',
          border: '1px solid rgba(134,239,172,.20)',
          fontWeight: 800,
        }}
      >
        <FiCheckCircle size={14} />
        مطابق
      </Box>
    )
  }

  const isShortage = difference > 0
  const absoluteDifference = Math.abs(difference)
  const DifferenceIcon = isShortage ? FiTrendingDown : FiTrendingUp

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.6,
        minWidth: 110,
        px: 1,
        py: 0.45,
        borderRadius: '999px',
        color: isShortage ? '#FCA5A5' : '#86EFAC',
        background: isShortage ? 'rgba(239,68,68,.10)' : 'rgba(34,197,94,.10)',
        border: isShortage
          ? '1px solid rgba(252,165,165,.22)'
          : '1px solid rgba(134,239,172,.20)',
        fontWeight: 800,
        direction: 'rtl',
      }}
    >
      <DifferenceIcon size={14} />
      {isShortage
        ? `نقص ${number2(absoluteDifference)}`
        : `زيادة ${number2(absoluteDifference)}`}
    </Box>
  )
}


const adjustmentDifferenceCell = (value: unknown) => {
  const difference = Number(value ?? 0)

  if (!Number.isFinite(difference) || Math.abs(difference) < 0.000001) {
    return (
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.6,
          minWidth: 90,
          px: 1,
          py: 0.45,
          borderRadius: '999px',
          color: '#86EFAC',
          background: 'rgba(34,197,94,.10)',
          border: '1px solid rgba(134,239,172,.20)',
          fontWeight: 800,
        }}
      >
        <FiCheckCircle size={14} />
        مطابق
      </Box>
    )
  }

  const isIncrease = difference > 0
  const absoluteDifference = Math.abs(difference)
  const DifferenceIcon = isIncrease ? FiTrendingUp : FiTrendingDown

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.6,
        minWidth: 110,
        px: 1,
        py: 0.45,
        borderRadius: '999px',
        color: isIncrease ? '#86EFAC' : '#FCA5A5',
        background: isIncrease ? 'rgba(34,197,94,.10)' : 'rgba(239,68,68,.10)',
        border: isIncrease
          ? '1px solid rgba(134,239,172,.20)'
          : '1px solid rgba(252,165,165,.22)',
        fontWeight: 800,
        direction: 'rtl',
      }}
    >
      <DifferenceIcon size={14} />
      {isIncrease
        ? `زيادة ${number2(absoluteDifference)}`
        : `نقص ${number2(absoluteDifference)}`}
    </Box>
  )
}

const reportConfigs: Record<ReportType, ReportConfig> = {
  stock_balances: {
    label: 'أرصدة المخزون',
    subtitle: 'عرض كميات وقيم المخزون الحالية حسب المخزن والمادة',
    chartTitle: 'قيمة المخزون حسب المخزن',
    distributionTitle: 'توزيع قيمة المخزون',
    supportsDate: false,
    columns: [
      { key: 'warehouseName', label: 'المخزن' },
      { key: 'materialNumber', label: 'رقم المادة' },
      { key: 'materialName', label: 'المادة' },
      { key: 'unit', label: 'الوحدة' },
      { key: 'quantity', label: 'الكمية', render: number2 },
      { key: 'averageCost', label: 'متوسط التكلفة', render: money },
      { key: 'stockValue', label: 'قيمة المخزون', render: money },
    ],
  },
  inventory_valuation: {
    label: 'تقييم المخزون',
    subtitle: 'تحليل القيمة الدفترية الحالية للمخزون',
    chartTitle: 'قيمة المخزون حسب المخزن',
    distributionTitle: 'توزيع التقييم',
    supportsDate: false,
    columns: [
      { key: 'warehouseName', label: 'المخزن' },
      { key: 'materialNumber', label: 'رقم المادة' },
      { key: 'materialName', label: 'المادة' },
      { key: 'unit', label: 'الوحدة' },
      { key: 'quantity', label: 'الكمية', render: number2 },
      { key: 'averageCost', label: 'متوسط التكلفة', render: money },
      { key: 'stockValue', label: 'القيمة', render: money },
    ],
  },
  purchases: {
    label: 'المشتريات',
    subtitle: 'تحليل فواتير المشتريات والمدفوع والمتبقي',
    chartTitle: 'المشتريات والمدفوع والمصاريف عبر الفترة',
    distributionTitle: 'حالة سداد المشتريات',
    supportsDate: true,
    columns: [
      { key: 'invoiceNumber', label: 'رقم الفاتورة' },
      { key: 'date', label: 'التاريخ', render: dateCell },
      { key: 'supplierName', label: 'المورد' },
      { key: 'warehouseName', label: 'المخزن' },
      { key: 'netTotal', label: 'الإجمالي', render: money },
      { key: 'expenses', label: 'المصاريف الإضافية', render: money },
      { key: 'paidAmount', label: 'المدفوع', render: money },
      { key: 'remainingAmount', label: 'المتبقي', render: money },
    ],
  },
  sales: {
    label: 'المبيعات',
    subtitle: 'تحليل فواتير المبيعات والتحصيلات',
    chartTitle: 'المبيعات والتحصيلات عبر الفترة',
    distributionTitle: 'حالة تحصيل المبيعات',
    supportsDate: true,
    columns: [
      { key: 'invoiceNumber', label: 'رقم الفاتورة' },
      { key: 'date', label: 'التاريخ', render: dateCell },
      { key: 'customerName', label: 'العميل' },
      { key: 'warehouseName', label: 'المخزن' },
      { key: 'netTotal', label: 'الإجمالي', render: money },
      { key: 'customerAdditionalFees', label: 'رسوم إضافية على العميل', render: money },
      { key: 'paidAmount', label: 'المستلم', render: money },
      { key: 'remainingAmount', label: 'المتبقي', render: money },
    ],
  },
  movements: {
    label: 'حركات المخزون',
    subtitle: 'تحليل الوارد والصادر وقيمة الحركات',
    chartTitle: 'الوارد والصادر عبر الفترة',
    distributionTitle: 'توزيع قيمة الحركة',
    supportsDate: true,
    columns: [
      { key: 'reference', label: 'المرجع' },
      { key: 'date', label: 'التاريخ', render: dateCell },
      { key: 'type', label: 'النوع' },
      { key: 'materialNumber', label: 'رقم المادة' },
      { key: 'materialName', label: 'المادة' },
      { key: 'warehouseName', label: 'المخزن' },
      { key: 'quantityIn', label: 'وارد', render: number2 },
      { key: 'quantityOut', label: 'صادر', render: number2 },
      { key: 'movementValue', label: 'قيمة الحركة', render: money },
    ],
  },
  inventory_adjustments: {
    label: 'تسويات الجرد',
    subtitle: 'عرض فروقات الجرد المعتمدة بين الرصيد الدفتري والكمية الفعلية',
    chartTitle: 'الزيادة والنقص في تسويات الجرد عبر الفترة',
    distributionTitle: 'توزيع فروقات الجرد',
    supportsDate: true,
    columns: [
      { key: 'reference', label: 'رقم التسوية' },
      { key: 'date', label: 'التاريخ', render: dateCell },
      { key: 'warehouseName', label: 'المخزن' },
      { key: 'materialNumber', label: 'رقم المادة' },
      { key: 'materialName', label: 'المادة' },
      { key: 'unit', label: 'الوحدة' },
      { key: 'systemQuantity', label: 'الكمية الدفترية', render: number2 },
      { key: 'countedQuantity', label: 'الكمية الفعلية', render: number2 },
      { key: 'difference', label: 'الفرق', render: adjustmentDifferenceCell },
      { key: 'unitCost', label: 'تكلفة الوحدة', render: money },
      { key: 'differenceValue', label: 'قيمة الفرق', render: money },
      { key: 'notes', label: 'ملاحظات' },
    ],
  },
  production: {
    label: 'الإنتاج',
    subtitle: 'مقارنة المخطط والفعلي وتكلفة أوامر الإنتاج',
    chartTitle: 'الإنتاج المخطط والفعلي عبر الفترة',
    distributionTitle: 'تحقيق خطة الإنتاج',
    supportsDate: true,
    columns: [
      { key: 'orderNumber', label: 'رقم الأمر' },
      { key: 'date', label: 'التاريخ', render: dateCell },
      { key: 'productName', label: 'المنتج' },
      { key: 'warehouseName', label: 'مخزن الإنتاج' },
      { key: 'plannedOutputQuantity', label: 'المخطط', render: number2 },
      { key: 'actualOutputQuantity', label: 'الفعلي', render: number2 },
      { key: 'outputDifference', label: 'الفرق', render: productionDifferenceCell },
      { key: 'totalProductionCost', label: 'إجمالي التكلفة', render: money },
      { key: 'unitProductionCost', label: 'تكلفة الوحدة', render: money },
    ],
  },
  production_cost: {
    label: 'تكلفة الإنتاج',
    subtitle: 'تحليل تكلفة المواد والأجور وإجمالي تكلفة التصنيع',
    chartTitle: 'مكونات تكلفة الإنتاج عبر الفترة',
    distributionTitle: 'مكونات تكلفة الإنتاج',
    supportsDate: true,
    columns: [
      { key: 'orderNumber', label: 'رقم الأمر' },
      { key: 'date', label: 'التاريخ', render: dateCell },
      { key: 'productName', label: 'المنتج' },
      { key: 'warehouseName', label: 'المخزن' },
      { key: 'materialCostTotal', label: 'تكلفة المواد', render: money },
      { key: 'laborCost', label: 'تكلفة الأجور', render: money },
      { key: 'totalProductionCost', label: 'الإجمالي', render: money },
      { key: 'unitProductionCost', label: 'تكلفة الوحدة', render: money },
    ],
  },
}

const visibleReportTypes: ReportType[] = (
  Object.keys(reportConfigs) as ReportType[]
).filter((type) => type !== 'inventory_valuation')

function getReportTypeFromSearch(search: string): ReportType {
  const requestedType = new URLSearchParams(search).get('type') as ReportType | null

  return requestedType && visibleReportTypes.includes(requestedType)
    ? requestedType
    : 'sales'
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
  const nativeDateInputRef = useRef<HTMLInputElement>(null)

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
        fullWidth
        value={value ? formatDateDMY(value) : ''}
        onClick={openDatePicker}
        slotProps={{
          input: {
            readOnly: true,
            startAdornment: (
              <InputAdornment position="start">
                <IconButton
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation()
                    openDatePicker()
                  }}
                  sx={{
                    color: '#E2E8F0',
                    background: 'transparent',
                    '&:hover': {
                      color: '#67E8F9',
                      background: 'transparent',
                    },
                  }}
                >
                  <FiCalendar size={17} />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
        sx={{
          colorScheme: 'dark',
          '& .MuiInputBase-root': {
            background: 'rgba(255, 255, 255, 0.07)',
          },
          '& .MuiInputBase-input': {
            textAlign: 'end',
            direction: 'ltr',
          },
        }}
      />

      <input
        ref={nativeDateInputRef}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{
          position: 'absolute',
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

type MetricIndicator = {
  tone: 'positive' | 'negative' | 'neutral'
  icon: 'increase' | 'decrease' | 'settled' | 'pending'
  text: string
}

function isFinancialMetric(reportType: ReportType, label: string) {
  const financialLabels: Partial<Record<ReportType, Set<string>>> = {
    stock_balances: new Set(['إجمالي القيمة']),
    inventory_valuation: new Set(['إجمالي القيمة']),
    purchases: new Set([
      'إجمالي المشتريات',
      'المصاريف الإضافية',
      'المبالغ المدفوعة',
    ]),
    sales: new Set([
      'إجمالي المبيعات',
      'رسوم إضافية على العميل',
      'المبالغ المستلمة',
    ]),
    movements: new Set(['قيمة الوارد', 'قيمة الصادر']),
    inventory_adjustments: new Set(['قيمة فروقات الجرد']),
    production: new Set(['تكلفة الإنتاج']),
    production_cost: new Set([
      'تكلفة المواد',
      'تكلفة الأجور',
      'إجمالي التكلفة',
    ]),
  }

  return financialLabels[reportType]?.has(label) ?? false
}

function metricNumericValue(
  summary: ReportMetric[],
  label: string,
) {
  const metric = summary.find((item) => item.label === label)
  const value = Number(metric?.value ?? 0)
  return Number.isFinite(value) ? value : 0
}

function getMetricIndicator(
  reportType: ReportType,
  metric: ReportMetric,
  summary: ReportMetric[],
): MetricIndicator | null {
  if (reportType === 'production' && metric.label === 'الإنتاج الفعلي') {
    const planned = metricNumericValue(summary, 'الإنتاج المخطط')
    const actual = metricNumericValue(summary, 'الإنتاج الفعلي')
    const difference = actual - planned

    if (Math.abs(difference) < 0.000001) {
      return {
        tone: 'neutral',
        icon: 'settled',
        text: '0 مطابق للمخطط',
      }
    }

    if (difference > 0) {
      return {
        tone: 'positive',
        icon: 'increase',
        text: `+${number2(difference)} زيادة عن المخطط`,
      }
    }

    return {
      tone: 'negative',
      icon: 'decrease',
      text: `−${number2(Math.abs(difference))} نقص عن المخطط`,
    }
  }

  if (reportType === 'purchases' && metric.label === 'المبالغ المدفوعة') {
    const total = metricNumericValue(summary, 'إجمالي المشتريات')
    const paid = metricNumericValue(summary, 'المبالغ المدفوعة')
    const difference = paid - total

    if (Math.abs(difference) < 0.000001) {
      return {
        tone: 'neutral',
        icon: 'settled',
        text: '0 مسدد بالكامل',
      }
    }

    if (difference > 0) {
      return {
        tone: 'positive',
        icon: 'increase',
        text: `+${number2(difference)} زيادة دفع`,
      }
    }

    return {
      tone: 'negative',
      icon: 'pending',
      text: `−${number2(Math.abs(difference))} متبقي للسداد`,
    }
  }

  if (reportType === 'sales' && metric.label === 'المبالغ المستلمة') {
    const total = metricNumericValue(summary, 'إجمالي المبيعات')
    const received = metricNumericValue(summary, 'المبالغ المستلمة')
    const difference = received - total

    if (Math.abs(difference) < 0.000001) {
      return {
        tone: 'neutral',
        icon: 'settled',
        text: '0 مستلم بالكامل',
      }
    }

    if (difference > 0) {
      return {
        tone: 'positive',
        icon: 'increase',
        text: `+${number2(difference)} زيادة تحصيل`,
      }
    }

    return {
      tone: 'negative',
      icon: 'pending',
      text: `−${number2(Math.abs(difference))} متبقي للتحصيل`,
    }
  }

  if (reportType === 'movements' && metric.label === 'قيمة الوارد') {
    const incoming = metricNumericValue(summary, 'قيمة الوارد')
    const outgoing = metricNumericValue(summary, 'قيمة الصادر')
    const difference = incoming - outgoing

    if (Math.abs(difference) < 0.000001) {
      return {
        tone: 'neutral',
        icon: 'settled',
        text: '0 حركة متوازنة',
      }
    }

    if (difference > 0) {
      return {
        tone: 'positive',
        icon: 'increase',
        text: `+${number2(difference)} صافي وارد`,
      }
    }

    return {
      tone: 'negative',
      icon: 'decrease',
      text: `−${number2(Math.abs(difference))} صافي صادر`,
    }
  }

  return null
}

function MetricCard({
  metric,
  index,
  reportType,
  summary,
}: {
  metric: ReportMetric
  index: number
  reportType: ReportType
  summary: ReportMetric[]
}) {
  const icons = [FiTrendingUp, FiShoppingCart, FiPackage, FiActivity]
  const Icon = icons[index % icons.length]
  const indicator = getMetricIndicator(reportType, metric, summary)

  const indicatorStyles = indicator
    ? indicator.tone === 'positive'
      ? {
          color: '#86EFAC',
          background: 'rgba(34,197,94,.10)',
          border: '1px solid rgba(134,239,172,.20)',
        }
      : indicator.tone === 'negative'
        ? {
            color: '#FCA5A5',
            background: 'rgba(239,68,68,.10)',
            border: '1px solid rgba(252,165,165,.22)',
          }
        : {
            color: '#86EFAC',
            background: 'rgba(34,197,94,.08)',
            border: '1px solid rgba(134,239,172,.18)',
          }
    : null

  const IndicatorIcon =
    indicator?.icon === 'increase'
      ? FiTrendingUp
      : indicator?.icon === 'decrease'
        ? FiTrendingDown
        : indicator?.icon === 'pending'
          ? FiClock
          : FiCheckCircle

  return (
    <Paper
      elevation={0}
      sx={{
        ...dashboardPanelSx,
        minHeight: 126,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            color: 'rgba(226, 232, 240, 0.76) !important',
            fontSize: 13,
            fontWeight: 700,
            mb: 1,
          }}
        >
          {metric.label}
        </Typography>

        <Typography
          sx={{
            color: 'rgba(255, 255, 255, 0.98) !important',
            fontSize: { xs: 22, lg: 27 },
            fontWeight: 850,
            direction: 'ltr',
            textAlign: 'right',
          }}
        >
          {metric.prefix ?? ''}
          {typeof metric.value === 'number'
            ? isFinancialMetric(reportType, metric.label)
              ? money(metric.value)
              : number2(metric.value)
            : metric.value}
          {metric.suffix ?? ''}
        </Typography>

        {indicator && indicatorStyles ? (
          <Box
            sx={{
              mt: 1,
              width: 'fit-content',
              maxWidth: '100%',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.7,
              px: 1,
              py: 0.48,
              borderRadius: '999px',
              fontSize: 11.5,
              fontWeight: 800,
              lineHeight: 1,
              whiteSpace: 'nowrap',
              ...indicatorStyles,
            }}
          >
            <IndicatorIcon size={14} />
            <Box component="span" sx={{ direction: 'rtl' }}>
              {indicator.text}
            </Box>
          </Box>
        ) : null}
      </Box>

      <Box
        sx={{
          width: 54,
          height: 54,
          borderRadius: '16px',
          display: 'grid',
          placeItems: 'center',
          color: '#67E8F9',
          background: 'rgba(34, 211, 238, 0.11)',
          border: '1px solid rgba(103, 232, 249, 0.18)',
          flexShrink: 0,
        }}
      >
        <Icon size={25} />
      </Box>
    </Paper>
  )
}

function formatCompact(value: number) {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return number2(value)
}


const reportPeriodLabels: Record<ReportPeriod, string> = {
  daily: 'يومي',
  weekly: 'أسبوعي',
  monthly: 'شهري',
  yearly: 'سنوي',
  custom: 'مخصص',
}

function formatDateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getPresetDateRange(period: ReportPeriod) {
  const today = new Date()
  today.setHours(12, 0, 0, 0)

  if (period === 'daily') {
    const value = formatDateValue(today)
    return { fromDate: value, toDate: value }
  }

  if (period === 'weekly') {
    const monday = new Date(today)
    const day = monday.getDay()
    const diffToMonday = day === 0 ? -6 : 1 - day
    monday.setDate(monday.getDate() + diffToMonday)

    const sunday = new Date(monday)
    sunday.setDate(sunday.getDate() + 6)

    return {
      fromDate: formatDateValue(monday),
      toDate: formatDateValue(sunday),
    }
  }

  if (period === 'monthly') {
    return {
      fromDate: formatDateValue(new Date(today.getFullYear(), today.getMonth(), 1, 12)),
      toDate: formatDateValue(new Date(today.getFullYear(), today.getMonth() + 1, 0, 12)),
    }
  }

  if (period === 'yearly') {
    return {
      fromDate: `${today.getFullYear()}-01-01`,
      toDate: `${today.getFullYear()}-12-31`,
    }
  }

  return { fromDate: '', toDate: '' }
}

function formatChartLabel(label: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(label)) {
    const [year, month, day] = label.split('-')
    return `${day}/${month}/${year}`
  }

  if (/^\d{4}-\d{2}$/.test(label)) {
    const [year, month] = label.split('-')
    return `${month}/${year}`
  }

  return label
}

function ReportBarChart({
  data,
  series,
  title,
}: {
  data: ReportChartPoint[]
  series: ReportChartSeries[]
  title: string
}) {
  const palette = ['#22D3EE', '#3B82F6', '#8B5CF6', '#14B8A6']
  const safeSeries = series.length > 0 ? series : [{ key: 'value', label: 'القيمة' }]
  const width = Math.max(760, data.length * Math.max(72, safeSeries.length * 28 + 24) + 100)
  const height = 330
  const padding = { top: 46, right: 20, bottom: 62, left: 64 }
  const values = data.flatMap((item) =>
    safeSeries.map((itemSeries) =>
      Math.max(0, Number(item.values?.[itemSeries.key] ?? 0)),
    ),
  )
  const maxValue = Math.max(...values, 1)
  const innerWidth = width - padding.left - padding.right
  const innerHeight = height - padding.top - padding.bottom
  const step = data.length > 0 ? innerWidth / data.length : innerWidth
  const groupWidth = Math.min(step * 0.78, Math.max(44, safeSeries.length * 28))
  const barGap = safeSeries.length > 1 ? 4 : 0
  const barWidth = Math.max(
    8,
    Math.min(28, (groupWidth - barGap * (safeSeries.length - 1)) / safeSeries.length),
  )
  const actualGroupWidth =
    barWidth * safeSeries.length + barGap * Math.max(0, safeSeries.length - 1)
  const gridLevels = [0, 0.25, 0.5, 0.75, 1]

  return (
    <Paper elevation={0} sx={{ ...dashboardPanelSx, minHeight: 410 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          gap: 1.5,
          mb: 1.5,
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FiBarChart2 color="#67E8F9" />
          <Typography sx={{ fontWeight: 800, fontSize: 16 }}>{title}</Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, flexWrap: 'wrap' }}>
          {safeSeries.map((itemSeries, index) => (
            <Box
              key={itemSeries.key}
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.65 }}
            >
              <Box
                sx={{
                  width: 9,
                  height: 9,
                  borderRadius: '3px',
                  background: palette[index % palette.length],
                }}
              />
              <Typography
                sx={{
                  fontSize: 11.5,
                  color: 'rgba(255,255,255,.72) !important',
                  fontWeight: 700,
                }}
              >
                {itemSeries.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {data.length === 0 ? (
        <Box
          sx={{
            height: 300,
            display: 'grid',
            placeItems: 'center',
            color: 'rgba(255, 255, 255, 0.62)',
          }}
        >
          لا توجد بيانات كافية للرسم البياني.
        </Box>
      ) : (
        <Box sx={{ overflowX: 'auto', overflowY: 'hidden' }}>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            width="100%"
            height="330"
            role="img"
            aria-label={title}
            style={{ display: 'block', minWidth: 620 }}
          >
            {gridLevels.map((level) => {
              const y = padding.top + innerHeight - innerHeight * level

              return (
                <g key={level}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke="rgba(255,255,255,.12)"
                    strokeDasharray="4 5"
                  />
                  <text
                    x={padding.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    fill="rgba(255,255,255,.56)"
                    fontSize="11"
                  >
                    {formatCompact(maxValue * level)}
                  </text>
                </g>
              )
            })}

            {data.map((item, index) => {
              const groupStart =
                padding.left +
                index * step +
                (step - actualGroupWidth) / 2

              return (
                <g key={`${item.label}-${index}`}>
                  {safeSeries.map((itemSeries, seriesIndex) => {
                    const value = Math.max(
                      0,
                      Number(item.values?.[itemSeries.key] ?? 0),
                    )
                    const barHeight = (value / maxValue) * innerHeight
                    const x = groupStart + seriesIndex * (barWidth + barGap)
                    const y = padding.top + innerHeight - barHeight

                    return (
                      <rect
                        key={`${item.label}-${itemSeries.key}`}
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barHeight}
                        rx="5"
                        fill={palette[seriesIndex % palette.length]}
                        opacity="0.92"
                      >
                        <title>{`${itemSeries.label}: ${number2(value)}`}</title>
                      </rect>
                    )
                  })}

                  <text
                    x={padding.left + index * step + step / 2}
                    y={height - 20}
                    textAnchor="middle"
                    fill="rgba(255,255,255,.64)"
                    fontSize="10"
                  >
                    {formatChartLabel(item.label)}
                  </text>
                </g>
              )
            })}
          </svg>
        </Box>
      )}
    </Paper>
  )
}

type ReportDistributionPoint = {
  label: string
  value: number
}

type ReportDistributionModel = {
  title: string
  centerLabel: string
  centerValue: number
  valueKind: 'number' | 'money'
  description?: string
  data: ReportDistributionPoint[]
}

function collapseDistributionPoints(
  data: ReportDistributionPoint[],
  maxVisible = 6,
) {
  const safeData = data
    .map((item) => ({
      label: item.label || 'غير محدد',
      value: Math.max(0, Number(item.value ?? 0)),
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)

  if (safeData.length <= maxVisible) return safeData

  const visible = safeData.slice(0, maxVisible - 1)
  const otherValue = safeData
    .slice(maxVisible - 1)
    .reduce((sum, item) => sum + item.value, 0)

  return [
    ...visible,
    {
      label: 'أخرى',
      value: otherValue,
    },
  ]
}

function buildReportDistributionModel(
  reportType: ReportType,
  summary: ReportMetric[],
  chartData: ReportChartPoint[],
  chartSeries: ReportChartSeries[],
  fallbackTitle: string,
): ReportDistributionModel {
  if (reportType === 'stock_balances' || reportType === 'inventory_valuation') {
    const stockSeries = chartSeries.find((item) => item.key === 'stockValue')
      ?? chartSeries[0]

    const data = stockSeries
      ? collapseDistributionPoints(
          chartData.map((item) => ({
            label: item.label,
            value: Number(item.values?.[stockSeries.key] ?? 0),
          })),
        )
      : []

    return {
      title: fallbackTitle,
      centerLabel: 'إجمالي القيمة',
      centerValue: metricNumericValue(summary, 'إجمالي القيمة'),
      valueKind: 'money',
      description: 'أكبر حصص قيمة المخزون حسب المخزن',
      data,
    }
  }

  if (reportType === 'purchases') {
    const total = metricNumericValue(summary, 'إجمالي المشتريات')
    const paid = metricNumericValue(summary, 'المبالغ المدفوعة')
    const settled = Math.min(Math.max(paid, 0), Math.max(total, 0))
    const remaining = Math.max(total - paid, 0)

    return {
      title: fallbackTitle,
      centerLabel: 'إجمالي المشتريات',
      centerValue: total,
      valueKind: 'money',
      description: 'نسبة المسدد والمتبقي من إجمالي فواتير الفترة',
      data: [
        { label: 'مسدد', value: settled },
        { label: 'متبقي', value: remaining },
      ],
    }
  }

  if (reportType === 'sales') {
    const total = metricNumericValue(summary, 'إجمالي المبيعات')
    const received = metricNumericValue(summary, 'المبالغ المستلمة')
    const collected = Math.min(Math.max(received, 0), Math.max(total, 0))
    const remaining = Math.max(total - received, 0)

    return {
      title: fallbackTitle,
      centerLabel: 'إجمالي المبيعات',
      centerValue: total,
      valueKind: 'money',
      description: 'نسبة المحصل والمتبقي من إجمالي فواتير الفترة',
      data: [
        { label: 'محصل', value: collected },
        { label: 'متبقي', value: remaining },
      ],
    }
  }

  if (reportType === 'movements') {
    const incoming = metricNumericValue(summary, 'قيمة الوارد')
    const outgoing = metricNumericValue(summary, 'قيمة الصادر')

    return {
      title: fallbackTitle,
      centerLabel: 'إجمالي الحركة',
      centerValue: incoming + outgoing,
      valueKind: 'money',
      description: 'مقارنة حصة قيمة الوارد بقيمة الصادر',
      data: [
        { label: 'وارد', value: incoming },
        { label: 'صادر', value: outgoing },
      ],
    }
  }

  if (reportType === 'inventory_adjustments') {
    const increase = metricNumericValue(summary, 'إجمالي الزيادة')
    const shortage = metricNumericValue(summary, 'إجمالي النقص')

    return {
      title: fallbackTitle,
      centerLabel: 'إجمالي الفروقات',
      centerValue: increase + shortage,
      valueKind: 'number',
      description: 'مقارنة كميات الزيادة بكميات النقص الناتجة عن تسويات الجرد',
      data: [
        { label: 'زيادة جرد', value: increase },
        { label: 'نقص جرد', value: shortage },
      ],
    }
  }

  if (reportType === 'production') {
    const planned = metricNumericValue(summary, 'الإنتاج المخطط')
    const actual = metricNumericValue(summary, 'الإنتاج الفعلي')

    if (actual <= planned) {
      return {
        title: fallbackTitle,
        centerLabel: 'الإنتاج المخطط',
        centerValue: planned,
        valueKind: 'number',
        description: 'المنجز فعلياً مقابل الكمية المتبقية من الخطة',
        data: [
          { label: 'إنتاج فعلي', value: actual },
          { label: 'نقص عن المخطط', value: Math.max(planned - actual, 0) },
        ],
      }
    }

    return {
      title: fallbackTitle,
      centerLabel: 'الإنتاج الفعلي',
      centerValue: actual,
      valueKind: 'number',
      description: 'الكمية المخططة والزيادة المحققة فوق الخطة',
      data: [
        { label: 'ضمن المخطط', value: planned },
        { label: 'زيادة عن المخطط', value: Math.max(actual - planned, 0) },
      ],
    }
  }

  if (reportType === 'production_cost') {
    const materials = metricNumericValue(summary, 'تكلفة المواد')
    const labor = metricNumericValue(summary, 'تكلفة الأجور')
    const total = metricNumericValue(summary, 'إجمالي التكلفة')

    return {
      title: fallbackTitle,
      centerLabel: 'إجمالي التكلفة',
      centerValue: total,
      valueKind: 'money',
      description: 'تركيب إجمالي تكلفة الإنتاج من المواد والأجور',
      data: [
        { label: 'تكلفة المواد', value: materials },
        { label: 'تكلفة الأجور', value: labor },
      ],
    }
  }

  return {
    title: fallbackTitle,
    centerLabel: 'الإجمالي',
    centerValue: 0,
    valueKind: 'number',
    data: [],
  }
}

function ReportDistributionChart({
  data,
  title,
  centerLabel,
  centerValue,
  valueKind,
  description,
}: ReportDistributionModel) {
  const safeData = data
    .map((item) => ({
      ...item,
      value: Math.max(0, Number(item.value ?? 0)),
    }))
    .filter((item) => item.value > 0)

  const distributionTotal = safeData.reduce((sum, item) => sum + item.value, 0)
  const palette = [
    '#22D3EE',
    '#3B82F6',
    '#8B5CF6',
    '#14B8A6',
    '#F59E0B',
    '#EC4899',
  ]

  const radius = 68
  const circumference = 2 * Math.PI * radius

  const segments = safeData.map((item, index) => {
    const percentage =
      distributionTotal > 0 ? (item.value / distributionTotal) * 100 : 0

    const previousPercentage =
      distributionTotal > 0
        ? safeData
            .slice(0, index)
            .reduce(
              (sum, previousItem) =>
                sum + (previousItem.value / distributionTotal) * 100,
              0,
            )
        : 0

    const segmentLength = circumference * (percentage / 100)
    const dashOffset = -(circumference * previousPercentage) / 100

    return {
      ...item,
      percentage,
      segmentLength,
      dashOffset,
      color: palette[index % palette.length],
    }
  })

  return (
    <Paper
      elevation={0}
      sx={{
        ...dashboardPanelSx,
        minHeight: 410,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FiPieChart color="#67E8F9" />
          <Typography sx={{ fontWeight: 800, fontSize: 16 }}>
            {title}
          </Typography>
        </Box>

        {description ? (
          <Typography
            sx={{
              mt: 0.55,
              fontSize: 11.5,
              color: 'rgba(255,255,255,.56) !important',
            }}
          >
            {description}
          </Typography>
        ) : null}
      </Box>

      {segments.length === 0 ? (
        <Box
          sx={{
            flex: 1,
            minHeight: 290,
            display: 'grid',
            placeItems: 'center',
            color: 'rgba(255, 255, 255, 0.62)',
          }}
        >
          لا توجد بيانات كافية للتوزيع.
        </Box>
      ) : (
        <Box
          sx={{
            flex: 1,
            minHeight: 290,
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: '190px minmax(0, 1fr)',
            },
            alignItems: 'center',
            gap: 2.5,
          }}
        >
          <Box
            sx={{
              width: 184,
              height: 184,
              position: 'relative',
              justifySelf: 'center',
              filter: 'drop-shadow(0 18px 24px rgba(2,6,23,.24))',
            }}
          >
            <svg
              viewBox="0 0 184 184"
              width="184"
              height="184"
              role="img"
              aria-label={title}
              style={{ display: 'block' }}
            >
              <circle
                cx="92"
                cy="92"
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,.08)"
                strokeWidth="22"
              />

              {segments.map((item) => (
                <circle
                  key={item.label}
                  cx="92"
                  cy="92"
                  r={radius}
                  fill="none"
                  stroke={item.color}
                  strokeWidth="22"
                  strokeDasharray={`${item.segmentLength} ${circumference - item.segmentLength}`}
                  strokeDashoffset={item.dashOffset}
                  transform="rotate(-90 92 92)"
                  style={{
                    transition:
                      'stroke-dasharray .24s ease, stroke-dashoffset .24s ease',
                  }}
                >
                  <title>
                    {`${item.label}: ${valueKind === 'money' ? money(item.value) : number2(item.value)} (${item.percentage.toFixed(1)}%)`}
                  </title>
                </circle>
              ))}
            </svg>

            <Box
              sx={{
                position: 'absolute',
                inset: 28,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                textAlign: 'center',
                background: 'rgba(8,22,48,.97)',
                border: '1px solid rgba(255,255,255,.10)',
                boxShadow: 'inset 0 0 28px rgba(2,6,23,.16)',
                px: 1,
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,.58) !important',
                    fontWeight: 750,
                    lineHeight: 1.25,
                  }}
                >
                  {centerLabel}
                </Typography>
                <Typography
                  sx={{
                    mt: 0.55,
                    fontSize: 18,
                    fontWeight: 900,
                    direction: 'ltr',
                    color: 'rgba(255,255,255,.98) !important',
                    lineHeight: 1.15,
                  }}
                >
                  {valueKind === 'money' ? money(centerValue) : formatCompact(centerValue)}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gap: 1 }}>
            {segments.map((item) => (
              <Box
                key={item.label}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '10px minmax(0,1fr) auto',
                  alignItems: 'center',
                  gap: 1,
                  minHeight: 36,
                  px: 1,
                  py: 0.65,
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,.035)',
                  border: '1px solid rgba(255,255,255,.06)',
                }}
              >
                <Box
                  sx={{
                    width: 9,
                    height: 9,
                    borderRadius: '3px',
                    background: item.color,
                  }}
                />

                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: 12,
                      color: 'rgba(255,255,255,.80) !important',
                      fontWeight: 750,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.label}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.15,
                      fontSize: 10.5,
                      color: 'rgba(255,255,255,.48) !important',
                      direction: 'ltr',
                      textAlign: 'right',
                    }}
                  >
                    {valueKind === 'money' ? money(item.value) : number2(item.value)}
                  </Typography>
                </Box>

                <Typography
                  sx={{
                    fontSize: 12,
                    color: '#67E8F9 !important',
                    fontWeight: 850,
                    direction: 'ltr',
                  }}
                >
                  {item.percentage.toFixed(1)}%
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Paper>
  )
}

function flattenMaterials(records: MaterialRecord[]) {
  const result: MaterialRecord[] = []

  const walk = (items: MaterialRecord[]) => {
    for (const item of items) {
      if (
        item.type === 'sub' &&
        (item.status ?? 'active') !== 'deleted'
      ) {
        result.push(item)
      }

      if (item.children?.length) {
        walk(item.children)
      }
    }
  }

  walk(records)
  return result
}

function escapeXml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function excelColumnName(index: number) {
  let value = index + 1
  let name = ''

  while (value > 0) {
    const remainder = (value - 1) % 26
    name = String.fromCharCode(65 + remainder) + name
    value = Math.floor((value - 1) / 26)
  }

  return name
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff

  for (let index = 0; index < bytes.length; index += 1) {
    crc ^= bytes[index]

    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
    }
  }

  return (crc ^ 0xffffffff) >>> 0
}

function writeUint16(target: Uint8Array, offset: number, value: number) {
  target[offset] = value & 0xff
  target[offset + 1] = (value >>> 8) & 0xff
}

function writeUint32(target: Uint8Array, offset: number, value: number) {
  target[offset] = value & 0xff
  target[offset + 1] = (value >>> 8) & 0xff
  target[offset + 2] = (value >>> 16) & 0xff
  target[offset + 3] = (value >>> 24) & 0xff
}

function concatBytes(chunks: Uint8Array[]) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0

  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }

  return result
}

function createStoredZip(files: Array<{ name: string; content: string }>) {
  const encoder = new TextEncoder()
  const localChunks: Uint8Array[] = []
  const centralChunks: Uint8Array[] = []
  let localOffset = 0

  for (const file of files) {
    const nameBytes = encoder.encode(file.name)
    const dataBytes = encoder.encode(file.content)
    const checksum = crc32(dataBytes)

    const localHeader = new Uint8Array(30 + nameBytes.length)
    writeUint32(localHeader, 0, 0x04034b50)
    writeUint16(localHeader, 4, 20)
    writeUint16(localHeader, 6, 0)
    writeUint16(localHeader, 8, 0)
    writeUint16(localHeader, 10, 0)
    writeUint16(localHeader, 12, 0)
    writeUint32(localHeader, 14, checksum)
    writeUint32(localHeader, 18, dataBytes.length)
    writeUint32(localHeader, 22, dataBytes.length)
    writeUint16(localHeader, 26, nameBytes.length)
    writeUint16(localHeader, 28, 0)
    localHeader.set(nameBytes, 30)

    localChunks.push(localHeader, dataBytes)

    const centralHeader = new Uint8Array(46 + nameBytes.length)
    writeUint32(centralHeader, 0, 0x02014b50)
    writeUint16(centralHeader, 4, 20)
    writeUint16(centralHeader, 6, 20)
    writeUint16(centralHeader, 8, 0)
    writeUint16(centralHeader, 10, 0)
    writeUint16(centralHeader, 12, 0)
    writeUint16(centralHeader, 14, 0)
    writeUint32(centralHeader, 16, checksum)
    writeUint32(centralHeader, 20, dataBytes.length)
    writeUint32(centralHeader, 24, dataBytes.length)
    writeUint16(centralHeader, 28, nameBytes.length)
    writeUint16(centralHeader, 30, 0)
    writeUint16(centralHeader, 32, 0)
    writeUint16(centralHeader, 34, 0)
    writeUint16(centralHeader, 36, 0)
    writeUint32(centralHeader, 38, 0)
    writeUint32(centralHeader, 42, localOffset)
    centralHeader.set(nameBytes, 46)

    centralChunks.push(centralHeader)
    localOffset += localHeader.length + dataBytes.length
  }

  const centralDirectory = concatBytes(centralChunks)
  const endRecord = new Uint8Array(22)
  writeUint32(endRecord, 0, 0x06054b50)
  writeUint16(endRecord, 4, 0)
  writeUint16(endRecord, 6, 0)
  writeUint16(endRecord, 8, files.length)
  writeUint16(endRecord, 10, files.length)
  writeUint32(endRecord, 12, centralDirectory.length)
  writeUint32(endRecord, 16, localOffset)
  writeUint16(endRecord, 20, 0)

  return concatBytes([...localChunks, centralDirectory, endRecord])
}

function buildExcelWorkbook(
  columns: ReportTableColumn[],
  rows: Record<string, unknown>[],
  sheetName: string,
) {
  const safeSheetName = (sheetName || 'التقرير')
    .replace(/[\\/*?:[\]]/g, ' ')
    .trim()
    .slice(0, 31) || 'التقرير'

  const allRows: unknown[][] = [
    columns.map((column) => column.label),
    ...rows.map((row) => columns.map((column) => row[column.key])),
  ]

  const columnWidths = columns.map((column, columnIndex) => {
    const maxLength = allRows.reduce((max, row) => {
      const text = String(row[columnIndex] ?? '')
      return Math.max(max, text.length)
    }, column.label.length)

    return Math.min(34, Math.max(12, maxLength + 3))
  })

  const rowXml = allRows.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => {
      const reference = `${excelColumnName(columnIndex)}${rowIndex + 1}`

      if (rowIndex > 0 && typeof value === 'number' && Number.isFinite(value)) {
        return `<c r="${reference}" s="2"><v>${value}</v></c>`
      }

      return `<c r="${reference}" t="inlineStr" s="${rowIndex === 0 ? 1 : 0}"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`
    }).join('')

    return `<row r="${rowIndex + 1}">${cells}</row>`
  }).join('')

  const lastColumn = excelColumnName(Math.max(0, columns.length - 1))
  const lastRow = Math.max(1, allRows.length)

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:${lastColumn}${lastRow}"/>
  <sheetViews>
    <sheetView workbookViewId="0" rightToLeft="1">
      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="20"/>
  <cols>
    ${columnWidths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join('')}
  </cols>
  <sheetData>${rowXml}</sheetData>
  <autoFilter ref="A1:${lastColumn}${lastRow}"/>
</worksheet>`

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <bookViews><workbookView/></bookViews>
  <sheets><sheet name="${escapeXml(safeSheetName)}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><name val="Arial"/></font>
    <font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Arial"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0B2948"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border/>
    <border>
      <left style="thin"><color rgb="FFD7E3F0"/></left>
      <right style="thin"><color rgb="FFD7E3F0"/></right>
      <top style="thin"><color rgb="FFD7E3F0"/></top>
      <bottom style="thin"><color rgb="FFD7E3F0"/></bottom>
    </border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="3">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="4" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"><alignment horizontal="center" vertical="center"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`

  const files = [
    {
      name: '[Content_Types].xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
    },
    {
      name: '_rels/.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    { name: 'xl/workbook.xml', content: workbookXml },
    {
      name: 'xl/_rels/workbook.xml.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    },
    { name: 'xl/styles.xml', content: stylesXml },
    { name: 'xl/worksheets/sheet1.xml', content: sheetXml },
  ]

  const bytes = createStoredZip(files)

  return new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}


export function ReportsPage() {
  const notify = useNotifications()
  const location = useLocation()
  const reportType = useMemo(
    () => getReportTypeFromSearch(location.search),
    [location.search],
  )
  const initialWeeklyRange = getPresetDateRange('weekly')
  const [warehouseId, setWarehouseId] = useState('')
  const [materialId, setMaterialId] = useState('')
  const [period, setPeriod] = useState<ReportPeriod>('weekly')
  const [fromDate, setFromDate] = useState(initialWeeklyRange.fromDate)
  const [toDate, setToDate] = useState(initialWeeklyRange.toDate)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  const [warehouses, setWarehouses] = useState<WarehouseRecord[]>([])
  const [materialOptions, setMaterialOptions] = useState<MaterialRecord[]>([])
  const [report, setReport] = useState<ReportApiResponse | null>(null)

  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const config = reportConfigs[reportType]

  const automaticFilters = useMemo<ReportFilters>(() => ({
    warehouseId: warehouseId || undefined,
    materialId: materialId || undefined,
    ...(config.supportsDate
      ? {
          period,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        }
      : {}),
  }), [
    warehouseId,
    materialId,
    config.supportsDate,
    period,
    fromDate,
    toDate,
  ])

  useEffect(() => {
    let active = true

    void Promise.all([
      inventoryService.listWarehouses(),
      materialsService.listMaterials(),
    ])
      .then(([warehouseRows, materialRows]) => {
        if (!active) return
        setWarehouses(
          warehouseRows.filter((warehouse) => warehouse.status !== 'deleted'),
        )
        setMaterialOptions(flattenMaterials(materialRows))
      })
      .catch((error: unknown) => {
        if (!active) return
        setErrorMessage(
          getUserFriendlyErrorMessage(error, 'تعذر تحميل خيارات التقارير.'),
        )
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true

    const customRangeIsIncomplete =
      config.supportsDate && period === 'custom' && (!fromDate || !toDate)
    const customRangeIsInvalid =
      config.supportsDate &&
      period === 'custom' &&
      Boolean(fromDate) &&
      Boolean(toDate) &&
      fromDate > toDate

    if (customRangeIsIncomplete || customRangeIsInvalid) {
      return () => {
        active = false
      }
    }

    void reportsService
      .getReport(reportType, {
        ...automaticFilters,
        page,
        pageSize,
      })
      .then((response) => {
        if (!active) return
        setReport(response)
      })
      .catch((error: unknown) => {
        if (!active) return
        setErrorMessage(
          getUserFriendlyErrorMessage(error, 'تعذر تحميل التقرير.'),
        )
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [
    reportType,
    automaticFilters,
    page,
    pageSize,
    config.supportsDate,
    period,
    fromDate,
    toDate,
  ])

  const handlePeriodChange = (nextPeriod: ReportPeriod) => {
    setPeriod(nextPeriod)
    setErrorMessage('')
    setPage(0)

    if (nextPeriod === 'custom') {
      setLoading(false)
      setFromDate('')
      setToDate('')
      return
    }

    setLoading(true)
    const range = getPresetDateRange(nextPeriod)
    setFromDate(range.fromDate)
    setToDate(range.toDate)
  }

  const handleExport = async () => {
    try {
      setExporting(true)
      setErrorMessage('')

      if (config.supportsDate && period === 'custom') {
        if (!fromDate || !toDate) {
          setErrorMessage('حدد تاريخ البداية وتاريخ النهاية قبل تصدير التقرير.')
          return
        }

        if (fromDate > toDate) {
          setErrorMessage('تاريخ البداية يجب أن يكون قبل تاريخ النهاية أو مساوياً له.')
          return
        }
      }

      const exportRows = await reportsService.getReportExportRows(reportType, {
        ...automaticFilters,
      })

      if (exportRows.length === 0) {
        setErrorMessage('لا توجد بيانات ضمن الفلاتر الحالية لتصديرها إلى Excel.')
        return
      }

      const excelBlob = buildExcelWorkbook(
        config.columns,
        exportRows as Record<string, unknown>[],
        config.label,
      )

      const url = URL.createObjectURL(excelBlob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `craft-${reportType}-${new Date().toISOString().slice(0, 10)}.xlsx`
      anchor.click()
      URL.revokeObjectURL(url)
      notify.success('تم تصدير ملف Excel بنجاح.')
    } catch (error) {
      setErrorMessage(
        getUserFriendlyErrorMessage(error, 'تعذر تصدير التقرير إلى Excel.'),
      )
    } finally {
      setExporting(false)
    }
  }

  const summary = report?.summary ?? []
  const visibleSummary = summary
    .filter(
      (metric) =>
        !(
          (reportType === 'stock_balances' || reportType === 'inventory_valuation') &&
          metric.label === 'عدد المخازن' &&
          Boolean(warehouseId)
        ),
    )
    .map((metric) => {
      if (
        (reportType === 'stock_balances' || reportType === 'inventory_valuation') &&
        metric.label === 'عدد المخازن' &&
        !warehouseId
      ) {
        return {
          ...metric,
          value: warehouses.length,
        }
      }

      return metric
    })
  const chartData = report?.chartData ?? []
  const chartSeries = report?.chartSeries ?? []
  const distributionModel = buildReportDistributionModel(
    reportType,
    summary,
    chartData,
    chartSeries,
    config.distributionTitle,
  )
  const rows = (report?.rows ?? []) as Record<string, unknown>[]
  const pagination = report?.pagination

  const generatedAtLabel = (() => {
    if (!report?.generatedAt) return ''
    const date = new Date(report.generatedAt)

    return Number.isNaN(date.getTime())
      ? ''
      : date.toLocaleString('ar')
  })()

  return (
    <Box sx={craftPageGlassSx}>
      <PageHeader
        title="التقارير"
        breadcrumb="التقارير / لوحة التحليل"
      />

      {errorMessage ? (
        <Alert severity="error" sx={{ ...craftErrorAlertSx, mb: 2 }}>
          {errorMessage}
        </Alert>
      ) : null}

      <Paper elevation={0} sx={{ ...dashboardPanelSx, mb: 2 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              lg: config.supportsDate
                ? period === 'custom'
                  ? '1fr 1fr 1fr 1fr 1fr auto'
                  : '1fr 1fr 1fr auto'
                : '1fr 1fr auto',
            },
            gap: 1.5,
            alignItems: 'center',
          }}
        >
          <TextField
            select
            label="المخزن"
            value={warehouseId}
            onChange={(event) => {
              setLoading(true)
              setWarehouseId(event.target.value)
              setPage(0)
              setErrorMessage('')
            }}
            fullWidth
            slotProps={darkSelectSlotProps}
          >
            <MenuItem value="">جميع المخازن</MenuItem>
            {warehouses.map((warehouse) => (
              <MenuItem key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="المادة"
            value={materialId}
            onChange={(event) => {
              setLoading(true)
              setMaterialId(event.target.value)
              setPage(0)
              setErrorMessage('')
            }}
            fullWidth
            slotProps={scrollableMaterialSelectSlotProps}
          >
            <MenuItem value="">جميع المواد</MenuItem>
            {materialOptions.map((material) => (
              <MenuItem key={material.id} value={material.id}>
                {material.materialNumber} - {material.name}
              </MenuItem>
            ))}
          </TextField>

          {config.supportsDate ? (
            <TextField
              select
              label="الفترة"
              value={period}
              onChange={(event) =>
                handlePeriodChange(event.target.value as ReportPeriod)
              }
              fullWidth
              slotProps={darkSelectSlotProps}
            >
              {(Object.keys(reportPeriodLabels) as ReportPeriod[]).map((item) => (
                <MenuItem key={item} value={item}>
                  {reportPeriodLabels[item]}
                </MenuItem>
              ))}
            </TextField>
          ) : null}

          {config.supportsDate && period === 'custom' ? (
            <>
              <DateFilterField
                label="من تاريخ"
                value={fromDate}
                onChange={(value) => {
                  const nextFromDate = toInternalDate(value)
                  setFromDate(nextFromDate)
                  setPage(0)

                  if (!nextFromDate || !toDate) {
                    setLoading(false)
                    setErrorMessage('')
                    return
                  }

                  if (nextFromDate > toDate) {
                    setLoading(false)
                    setErrorMessage('تاريخ البداية يجب أن يكون قبل تاريخ النهاية أو مساوياً له.')
                    return
                  }

                  setErrorMessage('')
                  setLoading(true)
                }}
              />

              <DateFilterField
                label="إلى تاريخ"
                value={toDate}
                onChange={(value) => {
                  const nextToDate = toInternalDate(value)
                  setToDate(nextToDate)
                  setPage(0)

                  if (!fromDate || !nextToDate) {
                    setLoading(false)
                    setErrorMessage('')
                    return
                  }

                  if (fromDate > nextToDate) {
                    setLoading(false)
                    setErrorMessage('تاريخ البداية يجب أن يكون قبل تاريخ النهاية أو مساوياً له.')
                    return
                  }

                  setErrorMessage('')
                  setLoading(true)
                }}
              />
            </>
          ) : null}

          <Button
            variant="outlined"
            startIcon={exporting ? <CircularProgress size={16} /> : <FiDownload />}
            onClick={() => {
              void handleExport()
            }}
            disabled={exporting}
            sx={{
              minHeight: 54,
              borderRadius: '14px',
              px: 2.2,
              fontWeight: 750,
              whiteSpace: 'nowrap',
              color: '#93C5FD',
              borderColor: 'rgba(96,165,250,.46)',
              '&:hover': {
                borderColor: '#60A5FA',
                background: 'rgba(96,165,250,.10)',
              },
            }}
          >
            تصدير Excel
          </Button>
        </Box>
      </Paper>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            xl: `repeat(${Math.max(1, Math.min(visibleSummary.length, 4))}, minmax(0, 1fr))`,
          },
          gap: 1.5,
          mb: 2,
        }}
      >
        {visibleSummary.map((metric, index) => (
          <MetricCard
            key={`${metric.label}-${index}`}
            metric={metric}
            index={index}
            reportType={reportType}
            summary={summary}
          />
        ))}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', xl: '1.55fr 0.95fr' },
          gap: 2,
          mb: 2,
        }}
      >
        <ReportBarChart
          data={chartData}
          series={chartSeries}
          title={config.chartTitle}
        />
        <ReportDistributionChart {...distributionModel} />
      </Box>

      <Paper elevation={0} sx={{ ...dashboardPanelSx }}>
        <Box
          sx={{
            mb: 1.5,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 1,
            flexDirection: { xs: 'column', sm: 'row' },
          }}
        >
          <Box>
            <Typography sx={{ fontWeight: 850, fontSize: 16 }}>
              تفاصيل التقرير
            </Typography>

            {generatedAtLabel ? (
              <Typography
                sx={{
                  mt: 0.35,
                  color: 'rgba(255,255,255,.58) !important',
                  fontSize: 11.5,
                }}
              >
                آخر توليد: {generatedAtLabel}
              </Typography>
            ) : null}
          </Box>

          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.75,
              px: 1.25,
              py: 0.65,
              borderRadius: '999px',
              color: '#67E8F9',
              background: 'rgba(34,211,238,.09)',
              border: '1px solid rgba(103,232,249,.16)',
            }}
          >
            <FiLayers size={14} />
            <Typography
              sx={{
                fontSize: 11.5,
                color: '#67E8F9 !important',
                fontWeight: 700,
              }}
            >
              {pagination?.totalCount ?? 0} سجل
            </Typography>
          </Box>
        </Box>

        <ReportTable
          columns={config.columns}
          rows={rows}
          totalCount={pagination?.totalCount ?? 0}
          page={pagination?.page ?? page}
          pageSize={pagination?.pageSize ?? pageSize}
          loading={loading}
          onPageChange={(nextPage: number) => {
            setLoading(true)
            setErrorMessage('')
            setPage(nextPage)
          }}
          onRowsPerPageChange={(nextPageSize: number) => {
            setLoading(true)
            setErrorMessage('')
            setPageSize(nextPageSize)
            setPage(0)
          }}
        />
      </Paper>
    </Box>
  )
}
