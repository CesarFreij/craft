import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { PageHeader } from '../components/ui/PageHeader'
import { SectionCard } from '../components/ui/SectionCard'
import { ReportTable } from '../components/ui/ReportTable'
import { inventoryService, type WarehouseRecord } from '../services/inventoryService'
import { materialsService, type MaterialRecord } from '../services/materialsService'
import { reportsService, type ReportFilters, type ReportType } from '../services/reportsService'
import { formatDateDMY, formatDisplayNumber, toInternalDate } from '../utils/displayFormatting'
import { getUserFriendlyErrorMessage } from '../utils/errorMessages'

const REPORT_DEFINITIONS: Array<{ key: ReportType; label: string; subtitle: string; supportedFilters: Array<'warehouseId' | 'materialId' | 'fromDate' | 'toDate'> }> = [
  { key: 'stock_balances', label: 'رصيد المخازن', subtitle: 'الحركات الحالية لكل مادة ومخزن', supportedFilters: ['warehouseId', 'materialId'] },
  { key: 'inventory_valuation', label: 'تقييم المخزون', subtitle: 'قيمة المخزون حسب السعر المتوسط', supportedFilters: ['warehouseId', 'materialId'] },
  { key: 'purchases', label: 'المشتريات', subtitle: 'ملخص فواتير المشتريات', supportedFilters: ['warehouseId', 'materialId', 'fromDate', 'toDate'] },
  { key: 'sales', label: 'المبيعات', subtitle: 'ملخص فواتير المبيعات', supportedFilters: ['warehouseId', 'materialId', 'fromDate', 'toDate'] },
  { key: 'movements', label: 'حركات المخزون', subtitle: 'سجل الحركات اليومية', supportedFilters: ['warehouseId', 'materialId', 'fromDate', 'toDate'] },
  { key: 'production', label: 'الإنتاج', subtitle: 'أوامر الإنتاج والتكلفة', supportedFilters: ['warehouseId', 'materialId', 'fromDate', 'toDate'] },
  { key: 'production_cost', label: 'تكلفة الإنتاج', subtitle: 'تكلفة المواد والأجور والمنتج النهائي', supportedFilters: ['warehouseId', 'materialId', 'fromDate', 'toDate'] },
]

type ReportFilterKey = 'warehouseId' | 'materialId' | 'fromDate' | 'toDate'

type ReportFilterState = {
  warehouseId: string
  materialId: string
  fromDate: string
  toDate: string
}

const EMPTY_REPORT_FILTERS: ReportFilterState = {
  warehouseId: '',
  materialId: '',
  fromDate: '',
  toDate: '',
}

function sanitizeFilters(filters: ReportFilterState, type: ReportType): ReportFilterState {
  const supported = new Set<ReportFilterKey>(
    REPORT_DEFINITIONS.find((item) => item.key === type)?.supportedFilters ?? [],
  )

  return {
    warehouseId: supported.has('warehouseId') ? filters.warehouseId : '',
    materialId: supported.has('materialId') ? filters.materialId : '',
    fromDate: supported.has('fromDate') ? filters.fromDate : '',
    toDate: supported.has('toDate') ? filters.toDate : '',
  }
}

function flattenMaterials(materials: MaterialRecord[]): MaterialRecord[] {
  const result: MaterialRecord[] = []

  const walk = (items: MaterialRecord[]) => {
    for (const item of items) {
      if ((item.status ?? 'active') !== 'deleted') {
        result.push(item)
      }
      if (item.children?.length) {
        walk(item.children)
      }
    }
  }

  walk(materials)
  return result
}

function MiniBarChart({ data }: { data: Array<{ label: string; value: number }> }) {
  if (!data.length) {
    return (
      <Box sx={{ minHeight: 180, display: 'grid', placeItems: 'center', color: '#64748B' }}>
        لا توجد بيانات للرسوم البيانية في هذا الفاصل الزمني.
      </Box>
    )
  }

  const maxValue = Math.max(...data.map((point) => point.value), 1)

  return (
    <Box sx={{ display: 'flex', alignItems: 'end', gap: 1.5, height: 180, mt: 2, px: 1 }}>
      {data.map((point) => (
        <Box key={`${point.label}-${point.value}`} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{formatDisplayNumber(point.value, 0)}</Typography>
          <Box
            sx={{
              width: '100%',
              maxWidth: 48,
              height: `${Math.max(18, (point.value / maxValue) * 100)}%`,
              borderRadius: '12px 12px 0 0',
              background: 'linear-gradient(180deg, #60a5fa 0%, #2563eb 100%)',
              minHeight: 18,
            }}
          />
          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{point.label}</Typography>
        </Box>
      ))}
    </Box>
  )
}

export function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('stock_balances')
  const [draftFilters, setDraftFilters] = useState<ReportFilterState>({ ...EMPTY_REPORT_FILTERS })
  const [appliedFilters, setAppliedFilters] = useState<ReportFilterState>({ ...EMPTY_REPORT_FILTERS })
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [warehouses, setWarehouses] = useState<WarehouseRecord[]>([])
  const [materials, setMaterials] = useState<MaterialRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [report, setReport] = useState<null | {
    summary: Array<{ label: string; value: number | string; prefix?: string; suffix?: string }>
    rows: Array<Record<string, unknown>>
    chartData: Array<{ label: string; value: number }>
    pagination: { page: number; totalCount: number; pageSize: number; totalPages: number }
    generatedAt: string
  }>(null)

  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        const [warehouseList, materialList] = await Promise.all([
          inventoryService.listWarehouses(),
          materialsService.listMaterials(),
        ])
        setWarehouses(warehouseList)
        setMaterials(flattenMaterials(materialList))
      } catch (loadError) {
        setError(getUserFriendlyErrorMessage(loadError, 'تعذر تحميل بيانات التقارير'))
      }
    }

    void loadReferenceData()
  }, [])


  const selectedReportDefinition = useMemo(
    () => REPORT_DEFINITIONS.find((item) => item.key === reportType) ?? REPORT_DEFINITIONS[0],
    [reportType],
  )

  const supportedFilters = selectedReportDefinition.supportedFilters
  const hasActiveFilters = Boolean(appliedFilters.warehouseId || appliedFilters.materialId || appliedFilters.fromDate || appliedFilters.toDate)

  const buildReportFilters = (filters: ReportFilterState, includePagination = true): ReportFilters => {
    const supported = sanitizeFilters(filters, reportType)

    return {
      warehouseId: supported.warehouseId || undefined,
      materialId: supported.materialId || undefined,
      fromDate: toInternalDate(supported.fromDate) || undefined,
      toDate: toInternalDate(supported.toDate) || undefined,
      ...(includePagination ? { page, pageSize } : {}),
    }
  }

  useEffect(() => {
    let cancelled = false

    const loadReport = async () => {
      await Promise.resolve()

      if (cancelled) return

      setLoading(true)
      setError('')

      const supported = sanitizeFilters(appliedFilters, reportType)
      const requestFilters: ReportFilters = {
        warehouseId: supported.warehouseId || undefined,
        materialId: supported.materialId || undefined,
        fromDate: toInternalDate(supported.fromDate) || undefined,
        toDate: toInternalDate(supported.toDate) || undefined,
        page,
        pageSize,
      }

      try {
        const response = await reportsService.getReport(reportType, requestFilters)

        if (cancelled) return

        setReport({
          summary: response.summary,
          rows: response.rows,
          chartData: response.chartData,
          pagination: response.pagination,
          generatedAt: response.generatedAt,
        })
      } catch (fetchError) {
        if (cancelled) return

        setError(getUserFriendlyErrorMessage(fetchError, 'تعذر تحميل التقرير'))
        setReport(null)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadReport()

    return () => {
      cancelled = true
    }
  }, [reportType, appliedFilters, page, pageSize])

  const clearFilters = () => {
    const nextFilters = { warehouseId: '', materialId: '', fromDate: '', toDate: '' }
    setDraftFilters(nextFilters)
    setAppliedFilters(sanitizeFilters(nextFilters, reportType))
    setPage(0)
  }

  const handleApplyFilters = () => {
    const nextFilters = sanitizeFilters(draftFilters, reportType)
    setAppliedFilters(nextFilters)
    setPage(0)
  }

  const handleReportTypeChange = (nextType: ReportType) => {
    setPage(0)
    const nextDraftFilters = sanitizeFilters(draftFilters, nextType)
    const nextAppliedFilters = sanitizeFilters(appliedFilters, nextType)
    setDraftFilters(nextDraftFilters)
    setAppliedFilters(nextAppliedFilters)
    setReportType(nextType)
  }

  const columns = useMemo(() => {
    if (reportType === 'stock_balances' || reportType === 'inventory_valuation') {
      return [
        { key: 'materialNumber', label: 'رقم المادة' },
        { key: 'materialName', label: 'اسم المادة' },
        { key: 'warehouseName', label: 'المخزن' },
        { key: 'quantity', label: 'الكمية', render: (value: unknown) => formatDisplayNumber(Number(value ?? 0), 2) },
        { key: 'averageCost', label: 'متوسط التكلفة', render: (value: unknown) => `${formatDisplayNumber(Number(value ?? 0), 2)} ر.س` },
        { key: 'stockValue', label: 'القيمة', render: (value: unknown) => `${formatDisplayNumber(Number(value ?? 0), 2)} ر.س` },
      ]
    }

    if (reportType === 'purchases') {
      return [
        { key: 'invoiceNumber', label: 'رقم الفاتورة' },
        { key: 'date', label: 'التاريخ', render: (value: unknown) => formatDateDMY(String(value ?? '')) },
        { key: 'supplierName', label: 'المورد' },
        { key: 'warehouseName', label: 'المخزن' },
        { key: 'netTotal', label: 'الإجمالي', render: (value: unknown) => `${formatDisplayNumber(Number(value ?? 0), 2)} ر.س` },
        { key: 'paidAmount', label: 'المدفوع', render: (value: unknown) => `${formatDisplayNumber(Number(value ?? 0), 2)} ر.س` },
        { key: 'remainingAmount', label: 'المتبقي', render: (value: unknown) => `${formatDisplayNumber(Number(value ?? 0), 2)} ر.س` },
      ]
    }

    if (reportType === 'sales') {
      return [
        { key: 'invoiceNumber', label: 'رقم الفاتورة' },
        { key: 'date', label: 'التاريخ', render: (value: unknown) => formatDateDMY(String(value ?? '')) },
        { key: 'customerName', label: 'العميل' },
        { key: 'warehouseName', label: 'المخزن' },
        { key: 'netTotal', label: 'إجمالي الفاتورة', render: (value: unknown) => `${formatDisplayNumber(Number(value ?? 0), 2)} ر.س` },
        { key: 'paidAmount', label: 'المستلم', render: (value: unknown) => `${formatDisplayNumber(Number(value ?? 0), 2)} ر.س` },
        { key: 'remainingAmount', label: 'المتبقي', render: (value: unknown) => `${formatDisplayNumber(Number(value ?? 0), 2)} ر.س` },
      ]
    }

    if (reportType === 'movements') {
      return [
        { key: 'reference', label: 'رقم المستند' },
        { key: 'date', label: 'التاريخ', render: (value: unknown) => formatDateDMY(String(value ?? '')) },
        { key: 'type', label: 'نوع الحركة' },
        { key: 'warehouseName', label: 'المخزن' },
        { key: 'materialNumber', label: 'رقم المادة' },
        { key: 'materialName', label: 'المادة' },
        { key: 'unit', label: 'الوحدة' },
        { key: 'quantityIn', label: 'الوارد', render: (value: unknown) => formatDisplayNumber(Number(value ?? 0), 2) },
        { key: 'quantityOut', label: 'الصادر', render: (value: unknown) => formatDisplayNumber(Number(value ?? 0), 2) },
        { key: 'cost', label: 'التكلفة', render: (value: unknown) => `${formatDisplayNumber(Number(value ?? 0), 2)} ر.س` },
        { key: 'movementValue', label: 'قيمة الحركة', render: (value: unknown) => `${formatDisplayNumber(Number(value ?? 0), 2)} ر.س` },
        { key: 'notes', label: 'ملاحظات' },
      ]
    }

    if (reportType === 'production_cost') {
      return [
        { key: 'orderNumber', label: 'رقم الأمر' },
        { key: 'date', label: 'التاريخ', render: (value: unknown) => formatDateDMY(String(value ?? '')) },
        { key: 'productName', label: 'المنتج' },
        { key: 'warehouseName', label: 'المخزن' },
        { key: 'plannedOutputQuantity', label: 'الكمية المخططة', render: (value: unknown) => formatDisplayNumber(Number(value ?? 0), 2) },
        { key: 'actualOutputQuantity', label: 'الكمية الفعلية', render: (value: unknown) => formatDisplayNumber(Number(value ?? 0), 2) },
        { key: 'materialCostTotal', label: 'تكلفة المواد', render: (value: unknown) => `${formatDisplayNumber(Number(value ?? 0), 2)} ر.س` },
        { key: 'laborCost', label: 'الأجور', render: (value: unknown) => `${formatDisplayNumber(Number(value ?? 0), 2)} ر.س` },
        { key: 'totalProductionCost', label: 'إجمالي التكلفة', render: (value: unknown) => `${formatDisplayNumber(Number(value ?? 0), 2)} ر.س` },
        { key: 'unitProductionCost', label: 'تكلفة الوحدة', render: (value: unknown) => `${formatDisplayNumber(Number(value ?? 0), 2)} ر.س` },
      ]
    }

    return [
      { key: 'orderNumber', label: 'رقم الأمر' },
      { key: 'date', label: 'التاريخ', render: (value: unknown) => formatDateDMY(String(value ?? '')) },
      { key: 'productName', label: 'المنتج' },
      { key: 'warehouseName', label: 'المخزن' },
      { key: 'plannedOutputQuantity', label: 'الكمية المخططة', render: (value: unknown) => formatDisplayNumber(Number(value ?? 0), 2) },
      { key: 'actualOutputQuantity', label: 'الكمية الفعلية', render: (value: unknown) => formatDisplayNumber(Number(value ?? 0), 2) },
      { key: 'materialCostTotal', label: 'تكلفة المواد', render: (value: unknown) => `${formatDisplayNumber(Number(value ?? 0), 2)} ر.س` },
      { key: 'laborCost', label: 'الأجور', render: (value: unknown) => `${formatDisplayNumber(Number(value ?? 0), 2)} ر.س` },
      { key: 'totalProductionCost', label: 'إجمالي التكلفة', render: (value: unknown) => `${formatDisplayNumber(Number(value ?? 0), 2)} ر.س` },
      { key: 'unitProductionCost', label: 'تكلفة الوحدة', render: (value: unknown) => `${formatDisplayNumber(Number(value ?? 0), 2)} ر.س` },
    ]
  }, [reportType])

  const handleDownloadCsv = async () => {
    try {
      const exportRows = await reportsService.getReportExportRows(reportType, buildReportFilters(appliedFilters, false))

      if (!exportRows.length) {
        return
      }

      const header = columns.map((column) => column.label).join(',')
      const rows = exportRows.map((row) =>
        columns
          .map((column) => {
            const raw = row[column.key]
            const value = raw == null ? '' : String(raw).replace(/,/g, '،')
            return `"${value}"`
          })
          .join(',')
      )

      const csvContent = `\uFEFF${[header, ...rows].join('\n')}`
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${reportType}.csv`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (downloadError) {
      setError(getUserFriendlyErrorMessage(downloadError, 'تعذر تصدير التقرير إلى CSV'))
    }
  }

  return (
    <Box className="report-page-root">
      <style>
        {`
          @media print {
            body * { visibility: hidden !important; }
            .report-page-root, .report-page-root * { visibility: visible !important; }
            .report-page-root {
              position: static !important;
              overflow: visible !important;
              width: 100% !important;
              max-width: none !important;
            }
            .report-page-actions,
            .report-page-controls,
            .report-page-toolbar,
            .report-page-table-shell .MuiTablePagination-root,
            .report-page-pagination {
              display: none !important;
            }
            .report-page-table-shell {
              overflow: visible !important;
            }
          }
        `}
      </style>
      <PageHeader
        title="التقارير"
        breadcrumb="لوحة التقارير • تحليلات حقيقية من قاعدة البيانات"
        actions={
          <Box className="report-page-toolbar" sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {hasActiveFilters && (
              <Button variant="text" onClick={clearFilters}>
                مسح الفلاتر
              </Button>
            )}
            <Button variant="contained" className="report-page-actions" onClick={() => window.print()}>
              طباعة
            </Button>
            <Button variant="outlined" className="report-page-actions" onClick={handleDownloadCsv} disabled={!report?.rows?.length}>
              تصدير CSV
            </Button>
          </Box>
        }
      />

      <SectionCard title={selectedReportDefinition.label} subtitle={selectedReportDefinition.subtitle}>
        <Stack className="report-page-controls" direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3, flexWrap: 'wrap' }}>
          <FormControl sx={{ minWidth: 220 }}>
            <InputLabel>نوع التقرير</InputLabel>
            <Select value={reportType} label="نوع التقرير" onChange={(event) => handleReportTypeChange(event.target.value as ReportType)}>
              {REPORT_DEFINITIONS.map((item) => (
                <MenuItem key={item.key} value={item.key}>{item.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {supportedFilters.includes('warehouseId') && (
            <Autocomplete
              options={warehouses}
              value={warehouses.find((item) => item.id === draftFilters.warehouseId) ?? null}
              onChange={(_, value) => { setPage(0); setDraftFilters((prev) => ({ ...prev, warehouseId: value?.id ?? '' })) }}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              sx={{ minWidth: 220, flex: 1 }}
              renderInput={(params) => <TextField {...params} label="المخزن" />}
            />
          )}

          {supportedFilters.includes('materialId') && (
            <Autocomplete
              options={materials}
              value={materials.find((item) => item.id === draftFilters.materialId) ?? null}
              onChange={(_, value) => { setPage(0); setDraftFilters((prev) => ({ ...prev, materialId: value?.id ?? '' })) }}
              getOptionLabel={(option) => `${option.materialNumber} - ${option.name}`}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              sx={{ minWidth: 260, flex: 1 }}
              renderInput={(params) => <TextField {...params} label="المادة" />}
            />
          )}

          {supportedFilters.includes('fromDate') && (
            <TextField
              label="من تاريخ"
              type="date"
              value={draftFilters.fromDate}
              onChange={(event) => { setPage(0); setDraftFilters((prev) => ({ ...prev, fromDate: event.target.value })) }}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ minWidth: 180 }}
            />
          )}
          {supportedFilters.includes('toDate') && (
            <TextField
              label="إلى تاريخ"
              type="date"
              value={draftFilters.toDate}
              onChange={(event) => { setPage(0); setDraftFilters((prev) => ({ ...prev, toDate: event.target.value })) }}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ minWidth: 180 }}
            />
          )}

          <Button variant="contained" onClick={handleApplyFilters}>
            تطبيق
          </Button>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {loading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, gap: 2, mb: 3 }}>
              {(report?.summary ?? []).map((item) => (
                <Box key={item.label} sx={{ border: '1px solid #E2E8F0', borderRadius: 3, p: 2, backgroundColor: '#F8FAFC' }}>
                  <Typography sx={{ color: 'text.secondary', fontSize: 12, mb: 0.5 }}>{item.label}</Typography>
                  <Typography sx={{ fontWeight: 700, fontSize: 24 }}>
                    {item.prefix ?? ''}{typeof item.value === 'number' ? formatDisplayNumber(item.value, 2) : item.value}{item.suffix ?? ''}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography sx={{ fontWeight: 700, mb: 1 }}>الرسم البياني</Typography>
              <Box sx={{ border: '1px solid #E2E8F0', borderRadius: 3, p: 2, backgroundColor: '#F8FAFC' }}>
                <MiniBarChart data={report?.chartData ?? []} />
              </Box>
            </Box>

            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
              <Chip label={`عدد الصفوف: ${report?.pagination.totalCount ?? 0}`} />
              <Chip label={`الصفحة: ${((report?.pagination.page ?? 0) + 1)} / ${Math.max(report?.pagination.totalPages ?? 0, 1)}`} />
              <Chip label={`تاريخ التحديث: ${report ? formatDateDMY(report.generatedAt) : ''}`} />
            </Stack>

            <Box className="report-page-table-shell">
              <ReportTable
                columns={columns}
                rows={report?.rows ?? []}
                totalCount={report?.pagination.totalCount ?? 0}
                page={report?.pagination.page ?? 0}
                pageSize={pageSize}
                onPageChange={(nextPage) => setPage(nextPage)}
                onRowsPerPageChange={(nextPageSize) => { setPageSize(nextPageSize); setPage(0) }}
                loading={loading}
              />
            </Box>
          </>
        )}
      </SectionCard>
    </Box>
  )
}
