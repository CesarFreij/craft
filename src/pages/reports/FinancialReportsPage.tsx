import { Box, Paper, Typography } from '@mui/material'
import type { ReportExportRow, ReportType } from '../../services/reportsService'
import {
  ReportBarChart,
  ReportDataTable,
  ReportMetricCards,
  ReportPageShell,
  ReportSectionTitle,
} from './ReportsShared'
import { dashboardPanelSx, useReportDateRange, useReportsData } from './ReportsData'

const reportTypes: readonly ReportType[] = ['sales', 'purchases', 'movements', 'cash_flow']
const debtReportTypes: readonly ReportType[] = ['sales', 'purchases']

function getSummaryValue(
  summary: Array<{ label: string; value: number | string }>,
  label: string,
): number {
  const value = summary.find((metric) => metric.label === label)?.value
  return typeof value === 'number' ? value : Number(value ?? 0)
}

function numberValue(row: ReportExportRow, field: string): number {
  const value = row[field]
  return typeof value === 'number' ? value : 0
}

function ageInDays(dateValue: ReportExportRow[string], asOf: string): number {
  if (typeof dateValue !== 'string' || !dateValue || !asOf) return 0
  const invoiceDate = new Date(`${dateValue.slice(0, 10)}T12:00:00`)
  const cutoffDate = new Date(`${asOf.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(invoiceDate.getTime()) || Number.isNaN(cutoffDate.getTime())) return 0
  return Math.max(0, Math.floor((cutoffDate.getTime() - invoiceDate.getTime()) / 86_400_000))
}

function buildAging(rows: ReportExportRow[], balanceField: string, asOf: string) {
  const buckets = [
    { label: '0–30 يوماً', minimum: 0, maximum: 30, amount: 0, invoices: 0 },
    { label: '31–60 يوماً', minimum: 31, maximum: 60, amount: 0, invoices: 0 },
    { label: '61–90 يوماً', minimum: 61, maximum: 90, amount: 0, invoices: 0 },
    { label: 'أكثر من 90 يوماً', minimum: 91, maximum: Number.POSITIVE_INFINITY, amount: 0, invoices: 0 },
  ]
  rows.forEach((row) => {
    const balance = numberValue(row, balanceField)
    if (balance <= 0) return
    const age = ageInDays(row.date, asOf)
    const bucket = buckets.find((item) => age >= item.minimum && age <= item.maximum)
    if (bucket) {
      bucket.amount += balance
      bucket.invoices += 1
    }
  })
  return buckets
}

function AgingTable({ title, rows, balanceField, asOf }: {
  title: string
  rows: ReportExportRow[]
  balanceField: string
  asOf: string
}) {
  const buckets = buildAging(rows, balanceField, asOf)
  return (
    <Paper elevation={0} sx={dashboardPanelSx}>
      <ReportSectionTitle title={title} subtitle={`العمر محسوب من تاريخ الفاتورة حتى ${asOf}`} />
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 1, alignItems: 'center' }}>
        <Typography sx={agingHeaderSx}>الفترة</Typography>
        <Typography sx={agingHeaderSx}>الفواتير</Typography>
        <Typography sx={agingHeaderSx}>الرصيد</Typography>
        {buckets.map((bucket) => (
          <AgingRow key={bucket.label} label={bucket.label} count={bucket.invoices} amount={bucket.amount} />
        ))}
        <Box sx={{ gridColumn: '1 / -1', mt: 0.5, pt: 1.25, borderTop: '1px solid rgba(255,255,255,.12)', display: 'flex', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="body1" sx={{ fontWeight: 850 }}>الإجمالي المستحق</Typography>
          <Typography variant="body1" sx={{ fontWeight: 850, direction: 'ltr' }}>
            {new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(buckets.reduce((sum, bucket) => sum + bucket.amount, 0))}
          </Typography>
        </Box>
      </Box>
    </Paper>
  )
}

function AgingRow({ label, count, amount }: { label: string; count: number; amount: number }) {
  return (
    <>
      <Typography variant="body2" sx={{ py: 0.9 }}>{label}</Typography>
      <Typography variant="body2" sx={{ py: 0.9, textAlign: 'center' }}>{count}</Typography>
      <Typography variant="body2" sx={{ py: 0.9, textAlign: 'left', direction: 'ltr', fontWeight: 700 }}>{new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(amount)}</Typography>
    </>
  )
}

const agingHeaderSx = {
  py: 0.8,
  color: 'rgba(255,255,255,.52) !important',
  fontWeight: 750,
  borderBottom: '1px solid rgba(255,255,255,.09)',
}

export function FinancialReportsPage() {
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
  const movements = data.movements
  const cashFlow = data.cash_flow
  const salesRows = (sales?.rows ?? []).map((row) => ({
    ...row,
    netAfterReturns: Number(row.netAfterReturns ?? (Number(row.netTotal ?? row.grossTotal ?? 0) - Number(row.returnTotal ?? 0))),
  }))
  const purchaseRows = (purchases?.rows ?? []).map((row) => ({
    ...row,
    netAfterReturns: Number(row.netAfterReturns ?? (Number(row.netTotal ?? row.grossTotal ?? 0) - Number(row.returnTotal ?? 0))),
  }))
  const receivableRows = debtData.sales?.rows ?? []
  const payableRows = debtData.purchases?.rows ?? []
  const netSales = getSummaryValue(sales?.report.summary ?? [], 'صافي المبيعات')
  const collections = getSummaryValue(cashFlow?.report.summary ?? [], 'إجمالي التحصيلات الفعلية')
  const collectionRate = netSales > 0 ? (collections / netSales) * 100 : 0
  const receivables = receivableRows.reduce((sum, row) => sum + numberValue(row, 'remainingAmount'), 0)
  const payables = payableRows.reduce((sum, row) => sum + numberValue(row, 'remainingAmount'), 0)
  const expectedLiquidity = receivables - payables
  const salesCostOfGoods = (movements?.rows ?? []).reduce((total, row) => {
    const movementType = row.type
    const movementValue = numberValue(row, 'movementValue')
    if (movementType === 'sale') return total + movementValue
    if (movementType === 'sale_return') return total - movementValue
    return total
  }, 0)
  const grossProfit = netSales - salesCostOfGoods

  return (
    <ReportPageShell title="التقارير المالية" description="المالية" range={range} loading={loading} error={error} onRetry={refresh}>
      <ReportMetricCards metrics={[
        { label: 'صافي المبيعات بعد المرتجعات', value: netSales },
        { label: 'إجمالي التحصيلات الفعلية', value: collections },
        { label: 'نسبة التحصيل الفعلي', value: collectionRate, kind: 'percent', accent: '#86EFAC' },
        { label: 'ذمم العملاء المستحقة', value: receivables, accent: '#FBBF24' },
        { label: 'ذمم الموردين المستحقة', value: payables, accent: '#A5B4FC' },
        { label: 'صافي السيولة المتوقعة', value: expectedLiquidity, accent: expectedLiquidity >= 0 ? '#86EFAC' : '#FCA5A5' },
      ]} />
      <Paper elevation={0} sx={{ ...dashboardPanelSx, mb: 2 }}>
        <ReportSectionTitle title="مجمل الربح حسب تكلفة حركة المخزون" subtitle="صافي المبيعات بعد المرتجعات مطروحاً منه تكلفة حركات البيع ناقص تكلفة حركات مردود البيع. لا يمثل صافي الربح بعد المصاريف التشغيلية." />
        <Typography variant="h4" sx={{ color: grossProfit >= 0 ? '#86EFAC !important' : '#FCA5A5 !important', fontWeight: 850, direction: 'ltr', textAlign: 'right' }}>
          {new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(grossProfit)}
        </Typography>
      </Paper>
      {cashFlow ? <Box sx={{ mb: 2 }}><ReportBarChart title="التدفقات النقدية حسب تاريخ الدفع" data={cashFlow.report.chartData} series={cashFlow.report.chartSeries} /></Box> : null}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 2, mb: 2 }}>
        <AgingTable title="أعمار ديون العملاء" rows={receivableRows} balanceField="remainingAmount" asOf={range.toDate} />
        <AgingTable title="أعمار ذمم الموردين" rows={payableRows} balanceField="remainingAmount" asOf={range.toDate} />
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
        <Paper elevation={0} sx={dashboardPanelSx}>
          <ReportSectionTitle title="فواتير المبيعات والتحصيل" subtitle="تتضمن قيمة المردودات وصافي الفاتورة بعد المرتجعات" />
          <ReportDataTable
            rows={salesRows}
            columns={[
              { key: 'invoiceNumber', label: 'رقم الفاتورة' },
              { key: 'date', label: 'التاريخ', kind: 'date' },
              { key: 'customerName', label: 'العميل' },
              { key: 'netAfterReturns', label: 'صافي بعد المرتجعات', kind: 'currency', align: 'left' },
              { key: 'paidAmount', label: 'التحصيل', kind: 'currency', align: 'left' },
              { key: 'remainingAmount', label: 'المتبقي', kind: 'currency', align: 'left' },
            ]}
          />
        </Paper>
        <Paper elevation={0} sx={dashboardPanelSx}>
          <ReportSectionTitle title="فواتير الموردين والمبالغ المستحقة" subtitle="الرصيد بعد مردودات المشتريات والدفعات، دون المصاريف الإضافية." />
          <ReportDataTable
            rows={purchaseRows}
            columns={[
              { key: 'invoiceNumber', label: 'رقم الفاتورة' },
              { key: 'date', label: 'التاريخ', kind: 'date' },
              { key: 'supplierName', label: 'المورد' },
              { key: 'netAfterReturns', label: 'الصافي بعد المرتجعات', kind: 'currency', align: 'left' },
              { key: 'returnTotal', label: 'مردودات', kind: 'currency', align: 'left' },
              { key: 'expenses', label: 'مصاريف إضافية', kind: 'currency', align: 'left' },
              { key: 'remainingAmount', label: 'ذمة المورد', kind: 'currency', align: 'left' },
            ]}
          />
        </Paper>
      </Box>
    </ReportPageShell>
  )
}
