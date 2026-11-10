import { Box, Paper } from '@mui/material'
import type { ReportType } from '../../services/reportsService'
import {
  ReportBarChart,
  ReportDataTable,
  ReportMetricCards,
  ReportPageShell,
  ReportSectionTitle,
} from './ReportsShared'
import { dashboardPanelSx, useReportDateRange, useReportsData } from './ReportsData'

const reportTypes: readonly ReportType[] = ['sales', 'purchases']

function summaryValue(
  summary: Array<{ label: string; value: number | string }>,
  label: string,
): number {
  const value = summary.find((metric) => metric.label === label)?.value
  return typeof value === 'number' ? value : Number(value ?? 0)
}

function sumRows(rows: Array<Record<string, string | number | boolean | null>>, field: string): number {
  return rows.reduce((total, row) => total + (typeof row[field] === 'number' ? row[field] : 0), 0)
}

export function SalesPurchasesReportsPage() {
  const range = useReportDateRange()
  const { data, loading, error, refresh } = useReportsData(reportTypes, range.filters)
  const sales = data.sales
  const purchases = data.purchases
  const purchaseRows = purchases?.rows ?? []
  const salesRows = sales?.rows ?? []

  return (
    <ReportPageShell title="حركة المبيعات والمشتريات" description="حركة المبيعات والمشتريات" range={range} loading={loading} error={error} onRetry={refresh}>
      <ReportMetricCards metrics={[
        { label: 'صافي المبيعات بعد المرتجعات', value: summaryValue(sales?.report.summary ?? [], 'صافي المبيعات') },
        { label: 'تحصيلات المبيعات', value: summaryValue(sales?.report.summary ?? [], 'المبالغ المستلمة') },
        { label: 'صافي المشتريات بعد المرتجعات', value: sumRows(purchaseRows, 'netAfterReturns') },
        { label: 'مصاريف الشحن والتكاليف الإضافية', value: sumRows(purchaseRows, 'expenses'), accent: '#FBBF24' },
      ]} />
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2, mb: 2 }}>
        {sales ? <ReportBarChart title="المبيعات والتحصيلات" data={sales.report.chartData} series={sales.report.chartSeries} /> : null}
        {purchases ? <ReportBarChart title="المشتريات والدفعات والمصاريف" data={purchases.report.chartData} series={purchases.report.chartSeries} /> : null}
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
        <Paper elevation={0} sx={dashboardPanelSx}>
          <ReportSectionTitle title="تفاصيل المبيعات" subtitle="صافي المبيعات بعد خصم مردودات كل فاتورة." />
          <ReportDataTable
            rows={salesRows}
            columns={[
              { key: 'invoiceNumber', label: 'رقم الفاتورة' },
              { key: 'date', label: 'التاريخ', kind: 'date' },
              { key: 'customerName', label: 'العميل' },
              { key: 'netTotal', label: 'الإجمالي', kind: 'currency', align: 'left' },
              { key: 'returnTotal', label: 'المرتجعات', kind: 'currency', align: 'left' },
              { key: 'netAfterReturns', label: 'الصافي', kind: 'currency', align: 'left' },
              { key: 'paidAmount', label: 'التحصيل', kind: 'currency', align: 'left' },
              { key: 'remainingAmount', label: 'المتبقي', kind: 'currency', align: 'left' },
            ]}
          />
        </Paper>
        <Paper elevation={0} sx={dashboardPanelSx}>
          <ReportSectionTitle title="تفاصيل المشتريات" subtitle="يُفصل بند المصروفات الإضافية عن صافي فاتورة المورد ورصيدها." />
          <ReportDataTable
            rows={purchaseRows}
            columns={[
              { key: 'invoiceNumber', label: 'رقم الفاتورة' },
              { key: 'date', label: 'التاريخ', kind: 'date' },
              { key: 'supplierName', label: 'المورد' },
              { key: 'netTotal', label: 'إجمالي الفاتورة', kind: 'currency', align: 'left' },
              { key: 'returnTotal', label: 'المردودات', kind: 'currency', align: 'left' },
              { key: 'netAfterReturns', label: 'الصافي بعد المرتجعات', kind: 'currency', align: 'left' },
              { key: 'expenses', label: 'مصروفات إضافية', kind: 'currency', align: 'left' },
              { key: 'paidAmount', label: 'المدفوع للمورد', kind: 'currency', align: 'left' },
              { key: 'remainingAmount', label: 'رصيد المورد', kind: 'currency', align: 'left' },
            ]}
          />
        </Paper>
      </Box>
    </ReportPageShell>
  )
}
