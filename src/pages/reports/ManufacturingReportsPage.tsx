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

const reportTypes: readonly ReportType[] = ['production', 'production_cost']

function summaryValue(
  summary: Array<{ label: string; value: number | string }>,
  label: string,
): number {
  const value = summary.find((metric) => metric.label === label)?.value
  return typeof value === 'number' ? value : Number(value ?? 0)
}

function numeric(row: ReportExportRow, key: string): number {
  const value = Number(row[key] ?? 0)
  return Number.isFinite(value) ? value : 0
}

export function ManufacturingReportsPage() {
  const range = useReportDateRange()
  const { data, loading, error, refresh } = useReportsData(reportTypes, range.filters)
  const orders = data.production
  const costs = data.production_cost
  const productionCost = costs?.report.summary ?? []
  const costRows = (costs?.rows ?? []).map((row) => {
    const planned = numeric(row, 'plannedMaterialCost')
    const actualValue = Number(row.actualIssuedMaterialCost ?? row.materialCostTotal ?? 0)
    const actual = Number.isFinite(actualValue) ? actualValue : 0
    const variance = planned - actual
    return {
      ...row,
      actualIssuedMaterialCost: actual,
      materialCostVariance: variance,
      materialCostVariancePercent: planned > 0 ? (variance / planned) * 100 : 0,
    }
  })

  return (
    <ReportPageShell title="تقارير التصنيع" description="التصنيع" range={range} loading={loading} error={error} onRetry={refresh}>
      <ReportMetricCards metrics={[
        { label: 'عدد أوامر الإنتاج', value: summaryValue(orders?.report.summary ?? [], 'عدد الأوامر'), kind: 'number' },
        { label: 'تكلفة المواد المخططة', value: summaryValue(productionCost, 'تكلفة المواد المخططة') },
        { label: 'تكلفة المواد المصروفة فعلياً', value: summaryValue(productionCost, 'تكلفة المواد المصروفة فعلياً') },
        { label: 'انحراف تكلفة المواد', value: summaryValue(productionCost, 'انحراف تكلفة المواد'), accent: '#FBBF24' },
      ]} />
      {costs ? <Box sx={{ mb: 2 }}><ReportBarChart title="تكلفة التصنيع عبر الفترة" data={costs.report.chartData} series={costs.report.chartSeries} /></Box> : null}
      <Paper elevation={0} sx={{ ...dashboardPanelSx, mb: 2 }}>
        <ReportSectionTitle title="انحراف المواد حسب أمر الإنتاج" subtitle="التكلفة المخططة محسوبة من الكميات المخططة بأسعار تكلفة الصرف المسجلة؛ المقارنة تعزل أثر فرق الكمية." />
        <ReportDataTable
          rows={costRows}
          columns={[
            { key: 'orderNumber', label: 'رقم الأمر' },
            { key: 'date', label: 'التاريخ', kind: 'date' },
            { key: 'productName', label: 'المنتج' },
            { key: 'plannedMaterialCost', label: 'تكلفة المواد المخططة', kind: 'currency', align: 'left' },
            { key: 'actualIssuedMaterialCost', label: 'تكلفة المواد المصروفة', kind: 'currency', align: 'left' },
            { key: 'materialCostVariance', label: 'الانحراف', kind: 'variance', align: 'left' },
            { key: 'materialCostVariancePercent', label: 'نسبة الانحراف %', kind: 'percent', align: 'left' },
            { key: 'laborCost', label: 'الأجور', kind: 'currency', align: 'left' },
            { key: 'totalProductionCost', label: 'إجمالي التكلفة الفعلية', kind: 'currency', align: 'left' },
          ]}
        />
      </Paper>
      <Paper elevation={0} sx={dashboardPanelSx}>
        <ReportSectionTitle title="أوامر الإنتاج" subtitle="الكميات المخططة والمنفذة وتكلفة الإنتاج المسجلة." />
        <ReportDataTable
          rows={orders?.rows ?? []}
          columns={[
            { key: 'orderNumber', label: 'رقم الأمر' },
            { key: 'date', label: 'التاريخ', kind: 'date' },
            { key: 'productName', label: 'المنتج' },
            { key: 'warehouseName', label: 'مخزن الإنتاج' },
            { key: 'plannedOutputQuantity', label: 'الكمية المخططة', kind: 'number', align: 'left' },
            { key: 'actualOutputQuantity', label: 'الكمية الفعلية', kind: 'number', align: 'left' },
            { key: 'totalProductionCost', label: 'التكلفة الفعلية', kind: 'currency', align: 'left' },
            { key: 'unitProductionCost', label: 'تكلفة الوحدة', kind: 'currency', align: 'left' },
          ]}
        />
        <Typography variant="body2" sx={{ mt: 1.5, color: 'rgba(255,255,255,.68) !important' }}>
          بيانات أوامر التشغيل تحت التنفيذ غير متاحة في عقد خدمة التقارير الحالي، لذلك لا تعرض هنا كأرصدة WIP غير دقيقة.
        </Typography>
      </Paper>
    </ReportPageShell>
  )
}
