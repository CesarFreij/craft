import { Box, Paper, Typography } from '@mui/material'
import {
  ReportBarChart,
  ReportPageShell,
  ReportSectionTitle,
} from './ReportsShared'
import { dashboardPanelSx, useReportDateRange, useReportsData } from './ReportsData'
import type { ReportExportRow, ReportType } from '../../services/reportsService'
import { formatCurrencyValue } from '../../utils/displayFormatting'

const reportTypes: readonly ReportType[] = [
  'sales',
  'purchases',
  'inventory_valuation',
  'production_cost',
  'cash_flow',
]
const debtReportTypes: readonly ReportType[] = ['sales', 'purchases']

function summaryValue(
  rows: Array<{ label: string; value: number | string }>,
  label: string,
): number {
  const value = rows.find((metric) => metric.label === label)?.value
  return typeof value === 'number' ? value : Number(value ?? 0)
}

function sumRows(rows: ReportExportRow[], field: string): number {
  return rows.reduce((total, row) => total + (typeof row[field] === 'number' ? row[field] : 0), 0)
}

export function ReportsDashboardPage() {
  const range = useReportDateRange()
  const periodReports = useReportsData(reportTypes, range.filters)
  const debtReports = useReportsData(debtReportTypes, {
    fromDate: '2000-01-01',
    toDate: range.toDate,
    period: 'custom',
    page: 0,
    pageSize: 1000,
  })
  const { data } = periodReports
  const debtData = debtReports.data
  const loading = periodReports.loading || debtReports.loading
  const error = periodReports.error || debtReports.error
  const refresh = () => {
    periodReports.refresh()
    debtReports.refresh()
  }
  const sales = data.sales
  const purchases = data.purchases
  const valuation = data.inventory_valuation
  const production = data.production_cost
  const cashFlow = data.cash_flow
  const metrics = [
    { label: 'صافي المبيعات بعد المرتجعات', value: summaryValue(sales?.report.summary ?? [], 'صافي المبيعات') },
    { label: 'التحصيلات الفعلية', value: summaryValue(cashFlow?.report.summary ?? [], 'إجمالي التحصيلات الفعلية') },
    { label: 'ذمم العملاء', value: sumRows(debtData.sales?.rows ?? [], 'remainingAmount') },
    { label: 'ذمم الموردين', value: sumRows(debtData.purchases?.rows ?? [], 'remainingAmount') },
    { label: 'قيمة المخزون بمتوسط التكلفة', value: summaryValue(valuation?.report.summary ?? [], 'إجمالي القيمة') },
    { label: 'تكلفة الإنتاج المسجلة', value: summaryValue(production?.report.summary ?? [], 'إجمالي التكلفة') },
  ]

  return (
    <ReportPageShell
      title="لوحة القيادة المالية"
      description="لوحة القيادة"
      range={range}
      loading={loading}
      error={error}
      onRetry={refresh}
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 1.5, mb: 2 }}>
        {metrics.map((metric) => (
          <Paper key={metric.label} elevation={0} sx={{ ...dashboardPanelSx, height: '100%' }}>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,.72) !important' }}>{metric.label}</Typography>
            <Typography variant="h4" sx={{ mt: 1, color: '#67E8F9 !important', fontWeight: 850, direction: 'ltr', textAlign: 'right' }}>
              {formatCurrencyValue(metric.value)}
            </Typography>
          </Paper>
        ))}
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
        {cashFlow ? <ReportBarChart title="التدفقات النقدية حسب تاريخ الدفع" data={cashFlow.report.chartData} series={cashFlow.report.chartSeries} /> : null}
        <Paper elevation={0} sx={dashboardPanelSx}>
          <ReportSectionTitle title="ملخص الفترة" subtitle="مؤشرات مستخرجة من تقارير المبيعات والمشتريات الفعلية" />
          <SummaryRow label="إجمالي المبيعات قبل المرتجعات" value={summaryValue(sales?.report.summary ?? [], 'إجمالي المبيعات قبل المرتجعات')} />
          <SummaryRow label="مردودات المبيعات" value={summaryValue(sales?.report.summary ?? [], 'مردودات المبيعات')} />
          <SummaryRow label="المصاريف الإضافية للمشتريات" value={sumRows(purchases?.rows ?? [], 'expenses')} />
          <SummaryRow label="تكلفة المواد المصروفة" value={summaryValue(production?.report.summary ?? [], 'تكلفة المواد المصروفة فعلياً')} />
          <Typography variant="body2" sx={{ mt: 2, p: 1.2, borderRadius: 2, color: 'rgba(255,255,255,.68) !important', background: 'rgba(103,232,249,.055)', lineHeight: 1.7 }}>
            لا تشمل هذه اللوحة المصروفات العامة أو الأرصدة الافتتاحية غير المتاحة ضمن تقارير الخدمات الحالية.
          </Typography>
        </Paper>
      </Box>
    </ReportPageShell>
  )
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, py: 1, borderBottom: '1px solid rgba(255,255,255,.07)' }}>
      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,.75) !important' }}>{label}</Typography>
      <Typography variant="body1" sx={{ fontWeight: 750, direction: 'ltr' }}>{formatCurrencyValue(value)}</Typography>
    </Box>
  )
}
