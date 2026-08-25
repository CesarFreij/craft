export type ReportType =
  | 'stock_balances'
  | 'inventory_valuation'
  | 'purchases'
  | 'sales'
  | 'movements'
  | 'production'
  | 'production_cost'

export type ReportPeriod =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'custom'

export interface ReportFilters {
  warehouseId?: string
  materialId?: string
  fromDate?: string
  toDate?: string
  period?: ReportPeriod
  page?: number
  pageSize?: number
}

export interface ReportMetric {
  label: string
  value: number | string
  prefix?: string
  suffix?: string
}

export interface ReportChartSeries {
  key: string
  label: string
}

export interface ReportChartPoint {
  label: string
  values: Record<string, number>
}

export interface ReportPagination {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export interface ReportApiResponse {
  reportType: ReportType
  summary: ReportMetric[]
  rows: Array<Record<string, string | number | boolean | null>>
  chartSeries: ReportChartSeries[]
  chartData: ReportChartPoint[]
  pagination: ReportPagination
  generatedAt: string
}

export type ReportExportRow =
  Record<string, string | number | boolean | null>

declare global {
  interface Window {
    craftReportsAPI?: {
      getReport(
        reportType: ReportType,
        filters?: ReportFilters
      ): Promise<ReportApiResponse>

      getReportExportRows(
        reportType: ReportType,
        filters?: ReportFilters
      ): Promise<ReportExportRow[]>
    }
  }
}

function getReportsAPI() {
  if (!window.craftReportsAPI) {
    throw new Error(
      'craftReportsAPI is not available. Check preload or IPC setup.'
    )
  }

  return window.craftReportsAPI
}

export const reportsService = {
  getReport(
    reportType: ReportType,
    filters: ReportFilters = {}
  ) {
    return getReportsAPI().getReport(reportType, filters)
  },

  getReportExportRows(
    reportType: ReportType,
    filters: ReportFilters = {}
  ) {
    return getReportsAPI().getReportExportRows(reportType, filters)
  },
}
