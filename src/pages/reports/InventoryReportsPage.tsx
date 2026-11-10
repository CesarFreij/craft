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

const reportTypes: readonly ReportType[] = ['inventory_valuation', 'inventory_adjustments', 'movements']

function summaryValue(
  summary: Array<{ label: string; value: number | string }>,
  label: string,
): number {
  const value = summary.find((metric) => metric.label === label)?.value
  return typeof value === 'number' ? value : Number(value ?? 0)
}

export function InventoryReportsPage() {
  const range = useReportDateRange()
  const { data, loading, error, refresh } = useReportsData(reportTypes, range.filters)
  const valuation = data.inventory_valuation
  const adjustments = data.inventory_adjustments
  const movements = data.movements

  return (
    <ReportPageShell title="تقارير المخزون" description="المخزون" range={range} loading={loading} error={error} onRetry={refresh}>
      <ReportMetricCards metrics={[
        { label: 'قيمة المخزون بمتوسط التكلفة', value: summaryValue(valuation?.report.summary ?? [], 'إجمالي القيمة') },
        { label: 'إجمالي الكمية', value: summaryValue(valuation?.report.summary ?? [], 'إجمالي الكمية'), kind: 'number' },
        { label: 'عدد تسويات الجرد', value: summaryValue(adjustments?.report.summary ?? [], 'عدد التسويات'), kind: 'number' },
        { label: 'قيمة فروقات الجرد', value: summaryValue(adjustments?.report.summary ?? [], 'قيمة فروقات الجرد'), accent: '#FBBF24' },
      ]} />
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2, mb: 2 }}>
        {movements ? <ReportBarChart title="حركة المخزون حسب الفترة" data={movements.report.chartData} series={movements.report.chartSeries} /> : null}
        {adjustments ? <ReportBarChart title="فروقات التسويات الجردية" data={adjustments.report.chartData} series={adjustments.report.chartSeries} valueKind="number" /> : null}
      </Box>
      <Paper elevation={0} sx={{ ...dashboardPanelSx, mb: 2 }}>
        <ReportSectionTitle title="تقييم المخزون" subtitle="القيمة الدفترية محسوبة بمتوسط التكلفة لكل مادة ومخزن." />
        <ReportDataTable
          rows={valuation?.rows ?? []}
          columns={[
            { key: 'warehouseName', label: 'المخزن' },
            { key: 'materialNumber', label: 'رقم المادة' },
            { key: 'materialName', label: 'المادة' },
            { key: 'quantity', label: 'الكمية', kind: 'number', align: 'left' },
            { key: 'unit', label: 'الوحدة' },
            { key: 'averageCost', label: 'متوسط التكلفة', kind: 'currency', align: 'left' },
            { key: 'stockValue', label: 'قيمة المخزون', kind: 'currency', align: 'left' },
          ]}
        />
      </Paper>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
        <Paper elevation={0} sx={dashboardPanelSx}>
          <ReportSectionTitle title="التسويات الجردية" subtitle="الفرق الفعلي والقيمة على أساس تكلفة المادة." />
          <ReportDataTable
            rows={adjustments?.rows ?? []}
            columns={[
              { key: 'reference', label: 'رقم التسوية' },
              { key: 'date', label: 'التاريخ', kind: 'date' },
              { key: 'warehouseName', label: 'المخزن' },
              { key: 'materialName', label: 'المادة' },
              { key: 'systemQuantity', label: 'دفترية', kind: 'number', align: 'left' },
              { key: 'countedQuantity', label: 'فعلية', kind: 'number', align: 'left' },
              { key: 'difference', label: 'الفرق', kind: 'number', align: 'left' },
              { key: 'differenceValue', label: 'قيمة الفرق', kind: 'currency', align: 'left' },
            ]}
          />
        </Paper>
        <Paper elevation={0} sx={dashboardPanelSx}>
          <ReportSectionTitle title="حركة المخزون" subtitle="الوارد والصادر وتكلفة الحركة." />
          <ReportDataTable
            rows={movements?.rows ?? []}
            columns={[
              { key: 'reference', label: 'المرجع' },
              { key: 'date', label: 'التاريخ', kind: 'date' },
              { key: 'type', label: 'نوع الحركة' },
              { key: 'materialName', label: 'المادة' },
              { key: 'quantityIn', label: 'وارد', kind: 'number', align: 'left' },
              { key: 'quantityOut', label: 'صادر', kind: 'number', align: 'left' },
              { key: 'movementValue', label: 'قيمة الحركة', kind: 'currency', align: 'left' },
            ]}
          />
        </Paper>
      </Box>
    </ReportPageShell>
  )
}
