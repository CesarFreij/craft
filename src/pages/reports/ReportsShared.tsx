import { Component, type ErrorInfo, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  useTheme,
} from '@mui/material'
import { FiDownload, FiRotateCw, FiSearch } from 'react-icons/fi'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '../../components/ui/PageHeader'
import {
  type ReportChartPoint,
  type ReportChartSeries,
  type ReportExportRow,
} from '../../services/reportsService'
import { formatCurrencyValue } from '../../utils/displayFormatting'
import { downloadExcelTable } from '../../utils/tableExport'
import { craftPageGlassSx, dashboardPanelSx, type ReportDatePeriod, type ReportDateRange } from './ReportsData'

class ReportRenderBoundary extends Component<
  { children: ReactNode; onRetry: () => void },
  { error: Error | null }
> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Report page rendering failed.', error, errorInfo)
  }

  render() {
    if (this.state.error) {
      return (
        <Alert
          severity="error"
          action={<Button color="inherit" size="small" onClick={() => { this.setState({ error: null }); this.props.onRetry() }}>إعادة المحاولة</Button>}
          sx={{ color: '#FEE2E2', bgcolor: 'rgba(127,29,29,.48)', border: '1px solid rgba(248,113,113,.48)', '& .MuiAlert-message': { color: '#FEE2E2' } }}
        >
          تعذر عرض التقرير: {this.state.error.message}
        </Alert>
      )
    }
    return this.props.children
  }
}

export function ReportPageShell({
  title,
  description,
  range,
  loading,
  error,
  onRetry,
  children,
}: {
  title: string
  description: string
  range: ReportDateRange & {
    setFromDate: (value: string) => void
    setToDate: (value: string) => void
    setPeriod: (value: ReportDatePeriod) => void
  }
  loading: boolean
  error: string
  onRetry: () => void
  children: ReactNode
}) {
  return (
    <Box sx={{
      ...craftPageGlassSx,
      width: '100%',
      m: 0,
      p: 0,
      '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#67E8F9' },
      '& .MuiInputLabel-root.Mui-focused': { color: '#67E8F9' },
      '& .MuiButton-root.Mui-focusVisible, & .MuiIconButton-root.Mui-focusVisible': { color: '#67E8F9' },
      '& .MuiMenuItem-root.Mui-selected': { color: '#67E8F9', bgcolor: 'rgba(103,232,249,.12)' },
      '& .MuiMenuItem-root.Mui-selected:hover': { bgcolor: 'rgba(103,232,249,.2)' },
      '& .MuiButton-root:focus-visible, & .MuiIconButton-root:focus-visible': {
        outline: '2px solid #67E8F9',
        outlineOffset: 2,
      },
    }}>
      <PageHeader title={title} breadcrumb={`التقارير التحليلية / ${description}`} />
      <Paper elevation={0} sx={{ ...dashboardPanelSx, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap', direction: 'rtl' }}>
          <Button
            onClick={onRetry}
            disabled={loading}
            startIcon={<FiRotateCw />}
            sx={{ color: '#67E8F9', fontWeight: 750, '&:hover': { bgcolor: 'rgba(103,232,249,.08)' } }}
          >
            تحديث
          </Button>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 1, flexWrap: 'wrap' }}>
            {range.period === 'custom' ? (
              <>
                <TextField
                  label="إلى تاريخ"
                  type="date"
                  size="small"
                  value={range.toDate}
                  onChange={(event) => range.setToDate(event.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{
                    colorScheme: 'dark',
                    '& input': { colorScheme: 'dark', cursor: 'pointer' },
                    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#67E8F9' },
                    '& input::-webkit-calendar-picker-indicator': { filter: 'brightness(0) invert(1)', cursor: 'pointer' },
                  }}
                />
                <TextField
                  label="من تاريخ"
                  type="date"
                  size="small"
                  value={range.fromDate}
                  onChange={(event) => range.setFromDate(event.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{
                    colorScheme: 'dark',
                    '& input': { colorScheme: 'dark', cursor: 'pointer' },
                    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#67E8F9' },
                    '& input::-webkit-calendar-picker-indicator': { filter: 'brightness(0) invert(1)', cursor: 'pointer' },
                  }}
                />
              </>
            ) : null}
            <FormControl size="small" sx={{ minWidth: 132 }}>
              <InputLabel id="report-period-label">الفترة</InputLabel>
              <Select
                labelId="report-period-label"
                value={range.period}
                label="الفترة"
                onChange={(event) => range.setPeriod(event.target.value as ReportDatePeriod)}
                sx={{
                  color: '#fff',
                  borderRadius: '14px !important',
                  '& .MuiOutlinedInput-notchedOutline': { borderRadius: '14px' },
                  '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,.7)' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#67E8F9' },
                }}
                MenuProps={{
                  sx: {
                    '& .MuiPaper-root': { bgcolor: '#101B36', color: '#fff', borderRadius: '14px !important' },
                    '& .MuiMenuItem-root.Mui-selected': { color: '#67E8F9', bgcolor: 'rgba(103,232,249,.12)' },
                    '& .MuiMenuItem-root.Mui-selected:hover': { bgcolor: 'rgba(103,232,249,.2)' },
                  },
                }}
              >
                <MenuItem value="custom">مخصص</MenuItem>
                <MenuItem value="weekly">أسبوعي</MenuItem>
                <MenuItem value="monthly">شهري</MenuItem>
                <MenuItem value="yearly">سنوي</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Paper>
      {error ? (
        <Alert
          severity="error"
          action={<Button color="inherit" size="small" onClick={onRetry}>إعادة المحاولة</Button>}
          sx={{ mb: 2, color: '#FEE2E2', bgcolor: 'rgba(127,29,29,.48)', border: '1px solid rgba(248,113,113,.48)', '& .MuiAlert-message': { color: '#FEE2E2' } }}
        >
          تعذر تحميل التقارير: {error}
        </Alert>
      ) : null}
      {loading ? (
        <Paper elevation={0} sx={{ ...dashboardPanelSx, height: '100%', display: 'grid', placeItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <CircularProgress size={22} sx={{ color: '#67E8F9' }} />
            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,.72) !important' }}>جارٍ تحميل بيانات التقارير...</Typography>
          </Box>
        </Paper>
      ) : error ? null : (
        <ReportRenderBoundary onRetry={onRetry}>
          {children}
        </ReportRenderBoundary>
      )}
    </Box>
  )
}

export function ReportSectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Box sx={{ mb: 1.75 }}>
      <Typography variant="h6" sx={{ fontWeight: 850 }}>{title}</Typography>
      {subtitle ? <Typography variant="body2" sx={{ mt: 0.4, color: 'rgba(255,255,255,.56) !important' }}>{subtitle}</Typography> : null}
    </Box>
  )
}

export function ReportMetricCards({
  metrics,
}: {
  metrics: Array<{ label: string; value: string | number; hint?: string; accent?: string; kind?: 'currency' | 'number' | 'percent' }>
}) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 1.5, mb: 2 }}>
      {metrics.map((metric) => (
        <Paper key={metric.label} elevation={0} sx={{ ...dashboardPanelSx, height: '100%' }}>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,.58) !important' }}>{metric.label}</Typography>
          <Typography variant="h4" sx={{ mt: 1, fontWeight: 850, color: `${metric.accent ?? '#67E8F9'} !important`, direction: 'ltr', textAlign: 'right' }}>
            {typeof metric.value === 'number'
              ? metric.kind === 'number'
                ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(metric.value)
                : metric.kind === 'percent'
                  ? `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(metric.value)}%`
                  : formatCurrencyValue(metric.value)
              : metric.value}
          </Typography>
          {metric.hint ? <Typography variant="body2" sx={{ mt: 0.6, color: 'rgba(255,255,255,.5) !important' }}>{metric.hint}</Typography> : null}
        </Paper>
      ))}
    </Box>
  )
}

export type ReportColumn = {
  key: string
  label: string
  kind?: 'currency' | 'number' | 'date' | 'percent' | 'variance'
  align?: 'left' | 'right' | 'center'
}

export function ReportDataTable({
  rows,
  columns,
  title = 'التقرير',
  emptyMessage = 'لا توجد بيانات ضمن الفترة المحددة.',
}: {
  rows: ReportExportRow[]
  columns: ReportColumn[]
  title?: string
  emptyMessage?: string
}) {
  const theme = useTheme()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    if (!query) return rows
    return rows.filter((row) => Object.values(row).some((value) => String(value ?? '').toLocaleLowerCase().includes(query)))
  }, [rows, search])
  const visibleRows = filteredRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
  const summaryLabelColumn = Math.max(0, columns.findIndex((column) => !['currency', 'number', 'percent', 'variance'].includes(column.kind ?? '')))
  const totals = useMemo(() => filteredRows.reduce<Record<string, number>>((result, row) => {
    columns.forEach((column) => {
      if (column.kind !== 'currency' && column.kind !== 'number' && column.kind !== 'variance') return
      const value = Number(row[column.key] ?? 0)
      if (Number.isFinite(value)) result[column.key] = (result[column.key] ?? 0) + value
    })
    return result
  }, {}), [columns, filteredRows])
  const numericValue = (value: ReportExportRow[string]) => {
    if (value === null || value === undefined || value === '') return null
    const number = Number(value)
    return Number.isFinite(number) ? number : null
  }
  const formatValue = (value: ReportExportRow[string], kind?: ReportColumn['kind']) => {
    if (value === null || value === undefined || value === '') return ''
    const number = numericValue(value)
    if (kind === 'currency' && number !== null) return formatCurrencyValue(number)
    if ((kind === 'number' || kind === 'variance') && number !== null) {
      return kind === 'variance'
        ? formatCurrencyValue(number)
        : new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(number)
    }
    if (kind === 'percent' && number !== null) return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(number)}%`
    if (kind === 'date' && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      const [, year, month, day] = /^(\d{4})-(\d{2})-(\d{2})/.exec(value) ?? []
      return `${day}/${month}/${year}`
    }
    return String(value)
  }
  const exportRows = filteredRows.map((row) => columns.map((column) => row[column.key] ?? null))
  const download = () => downloadExcelTable({
    title,
    headers: columns.map((column) => column.label),
    rows: exportRows,
    fileName: `${title.replace(/[\\/:*?"<>|]/g, '-')}.xlsx`,
    sheetName: title.slice(0, 31),
  })
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.25, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          value={search}
          onChange={(event) => { setSearch(event.target.value); setPage(0) }}
          placeholder="بحث سريع..."
          aria-label="بحث في صفوف الجدول"
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><FiSearch aria-hidden="true" /></InputAdornment> } }}
          sx={{ minWidth: { xs: '100%', sm: 240 } }}
        />
        <Button
          size="small"
          variant="outlined"
          startIcon={<FiDownload />}
          disabled={filteredRows.length === 0}
          onClick={download}
          sx={{ color: '#67E8F9', borderColor: 'rgba(103,232,249,.38)' }}
        >
          تصدير Excel
        </Button>
      </Box>
      <TableContainer sx={{ width: '100%', overflowX: 'auto', borderRadius: 1 }}>
      <Table size="small" stickyHeader sx={{
        width: '100%',
        minWidth: 'max-content',
        tableLayout: 'auto',
        '& td, & th, & .MuiTableCell-root': {
          whiteSpace: 'nowrap',
          wordBreak: 'normal',
          overflowWrap: 'normal',
          boxSizing: 'border-box',
          verticalAlign: 'middle',
          textAlign: 'center',
        },
        '& .MuiTableCell-root': { fontSize: theme.typography.body2.fontSize },
      }}>
        <TableHead sx={{ zIndex: 2 }}>
          <TableRow sx={{
            '& th': {
              color: 'rgba(255,255,255,.72)',
              bgcolor: 'transparent',
              fontWeight: 750,
              whiteSpace: 'nowrap',
              wordBreak: 'normal',
              borderBottomColor: 'rgba(255,255,255,.14)',
              zIndex: 2,
            },
          }}>
            {columns.map((column) => <TableCell key={column.key} align={column.align ?? 'right'}>{column.label}</TableCell>)}
          </TableRow>
        </TableHead>
        <TableBody>
          {visibleRows.length === 0 ? (
            <TableRow><TableCell colSpan={columns.length} align="center" sx={{ py: 4, color: 'rgba(255,255,255,.55) !important' }}>{search ? 'لا توجد نتائج مطابقة للبحث.' : emptyMessage}</TableCell></TableRow>
          ) : visibleRows.map((row, index) => (
            <TableRow key={String(row.id ?? row.orderNumber ?? row.reference ?? row.invoiceNumber ?? index)} hover>
              {columns.map((column) => {
                const value = numericValue(row[column.key])
                const semanticColor = (column.kind === 'variance' || column.kind === 'percent') && value !== null
                  ? value >= 0 ? '#86EFAC' : '#FCA5A5'
                  : undefined
                return (
                  <TableCell
                    key={column.key}
                    align={column.align ?? 'right'}
                    sx={{
                      whiteSpace: 'nowrap',
                      wordBreak: 'normal',
                      direction: ['currency', 'number', 'percent', 'variance'].includes(column.kind ?? '') ? 'ltr' : undefined,
                      color: semanticColor,
                    }}
                  >
                    {formatValue(row[column.key], column.kind)}
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
        {filteredRows.length > 0 ? (
          <TableFooter sx={{ position: 'sticky', bottom: 0, zIndex: 1 }}>
            <TableRow sx={{
              '& td': {
                color: '#67E8F9',
                bgcolor: 'transparent',
                borderTop: '1px solid rgba(103,232,249,.3)',
                fontWeight: 800,
                whiteSpace: 'nowrap',
                wordBreak: 'normal',
                zIndex: 1,
              },
            }}>
              {columns.map((column, index) => {
                const total = totals[column.key]
                const value = column.kind === 'percent' || total === undefined
                  ? ''
                  : column.kind === 'currency' || column.kind === 'variance'
                    ? formatCurrencyValue(total)
                    : new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(total)
                return (
                  <TableCell key={column.key} align={column.align ?? 'right'} sx={{ whiteSpace: 'nowrap', wordBreak: 'normal', overflowWrap: 'normal', boxSizing: 'border-box', verticalAlign: 'middle', textAlign: 'center', direction: 'ltr' }}>
                    {index === summaryLabelColumn ? 'الإجمالي' : value}
                  </TableCell>
                )
              })}
            </TableRow>
          </TableFooter>
        ) : null}
      </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={filteredRows.length}
        page={page}
        onPageChange={(_, nextPage) => setPage(nextPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(event) => { setRowsPerPage(Number(event.target.value)); setPage(0) }}
        rowsPerPageOptions={[10, 25, 50]}
        labelRowsPerPage="الصفوف:"
        sx={{ color: 'rgba(255,255,255,.68)', '& .MuiTablePagination-selectIcon': { color: 'inherit' }, '& .MuiIconButton-root': { color: 'inherit' } }}
      />
    </Box>
  )
}

export function ReportBarChart({
  title,
  data,
  series,
  valueKind = 'currency',
}: {
  title: string
  data: ReportChartPoint[]
  series: ReportChartSeries[]
  valueKind?: 'currency' | 'number' | 'percent'
}) {
  const theme = useTheme()
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const [availableWidth, setAvailableWidth] = useState(760)
  const [zoom, setZoom] = useState(100)
  const [fitToScreen, setFitToScreen] = useState(false)
  const colors = ['#67E8F9', '#818CF8', '#34D399', '#FBBF24', '#F472B6']
  const chartRows: Array<{ label: string; [key: string]: string | number }> = data.map((point) => ({ label: point.label, ...point.values }))
  useEffect(() => {
    const element = viewportRef.current
    if (!element) return
    const updateWidth = () => setAvailableWidth(Math.max(76, Math.floor(element.getBoundingClientRect().width) - 76))
    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const adjustZoom = (change: number) => {
    setFitToScreen(false)
    setZoom((current) => Math.min(250, Math.max(50, current + change)))
  }
  const step = fitToScreen && chartRows.length > 0
    ? availableWidth / chartRows.length
    : 160 * zoom / 100
  const groupWidth = step * 0.82
  const barGap = 4
  const barWidth = Math.max(4, Math.min(60, (groupWidth - barGap * Math.max(0, series.length - 1)) / Math.max(1, series.length)))
  const chartWidth = fitToScreen
    ? Math.max(1, availableWidth)
    : Math.max(760, chartRows.length * step)
  const maxDomain = Math.max(1, ...chartRows.flatMap((row) => series.map((item) => Number(row[item.key] ?? 0))).filter(Number.isFinite))
  const yAxisTicks = Array.from({ length: 5 }, (_, index) => (maxDomain * index) / 4)
  const formatChartValue = (value: unknown) => {
    if (typeof value !== 'number') return String(value)
    if (valueKind === 'currency') return formatCurrencyValue(value)
    const formatted = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value)
    return valueKind === 'percent' ? `${formatted}%` : formatted
  }
  return (
    <Paper elevation={0} sx={{ ...dashboardPanelSx, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', mb: 1.75 }}>
        <Typography variant="h6" sx={{ fontWeight: 850 }}>{title}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Button size="small" onClick={() => setFitToScreen((value) => !value)} sx={{ color: fitToScreen ? '#67E8F9' : 'rgba(255,255,255,.7)', minWidth: 0 }}>
            احتواء بالشاشة
          </Button>
          <IconButton size="small" aria-label="تصغير المخطط" disabled={zoom <= 50} onClick={() => adjustZoom(-10)} sx={{ color: '#67E8F9' }}>−</IconButton>
          <Typography variant="caption" sx={{ minWidth: 38, textAlign: 'center', direction: 'ltr' }}>{zoom}%</Typography>
          <IconButton size="small" aria-label="تكبير المخطط" disabled={zoom >= 250} onClick={() => adjustZoom(10)} sx={{ color: '#67E8F9' }}>+</IconButton>
        </Box>
      </Box>
      {chartRows.length === 0 ? (
        <Typography variant="body1" sx={{ py: 8, textAlign: 'center', color: 'rgba(255,255,255,.52) !important' }}>لا توجد بيانات للرسم ضمن الفترة المحددة.</Typography>
      ) : (
        <Box
          ref={viewportRef}
          onWheel={(event) => {
            if (!event.ctrlKey) return
            event.preventDefault()
            adjustZoom(event.deltaY < 0 ? 10 : -10)
          }}
          style={{ display: 'flex', flexDirection: 'row', direction: 'ltr', width: '100%', height: 300, overflow: 'hidden' }}
        >
          <Box sx={{ position: 'relative', width: 76, flexShrink: 0, height: '100%', borderRight: '1px solid rgba(255,255,255,.1)' }}>
            <Box sx={{ position: 'absolute', top: 8, right: 4, bottom: 30, left: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              {[...yAxisTicks].reverse().map((tick) => (
                <Typography key={tick} variant="caption" sx={{ color: 'rgba(255,255,255,.72)', direction: 'ltr', textAlign: 'right', lineHeight: 1 }}>
                  {formatChartValue(tick)}
                </Typography>
              ))}
            </Box>
          </Box>
          <Box sx={{ flex: 1, minWidth: 0, height: '100%', overflowX: 'auto', overflowY: 'hidden' }}>
            <Box sx={{ width: `${chartWidth}px`, minWidth: '100%', height: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartRows} barGap={barGap} barCategoryGap={`${Math.max(8, Math.round((step - groupWidth) / 2))}px`} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,.72)' }} axisLine={false} tickLine={false} />
                  <YAxis hide width={72} domain={[0, maxDomain]} ticks={yAxisTicks} />
                  <Tooltip
                    cursor={{ fill: 'rgba(103, 232, 249, 0.08)' }}
                    contentStyle={{ background: '#0B1636', border: '1px solid rgba(103,232,249,.24)', borderRadius: 12, color: '#fff', direction: 'rtl', fontFamily: theme.typography.fontFamily }}
                    formatter={(value) => [formatChartValue(value), '']}
                    labelStyle={{ color: '#67E8F9', direction: 'rtl', unicodeBidi: 'plaintext' }}
                    itemStyle={{ direction: 'rtl', unicodeBidi: 'plaintext' }}
                  />
                  {series.map((item, index) => (
                    <Bar
                      key={item.key}
                      dataKey={item.key}
                      name={item.label}
                      fill={colors[index % colors.length]}
                      barSize={barWidth}
                      radius={[4, 4, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Box>
        </Box>
      )}
      <Box sx={{ display: 'flex', gap: 1.75, flexWrap: 'wrap', justifyContent: 'center', mt: 1 }}>
        {series.map((item, index) => (
          <Box key={item.key} sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: colors[index % colors.length] }} />
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,.72) !important' }}>{item.label}</Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  )
}
