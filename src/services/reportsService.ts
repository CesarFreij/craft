export type ReportType =
  | 'stock_balances'
  | 'inventory_valuation'
  | 'purchases'
  | 'sales'
  | 'movements'
  | 'production'
  | 'production_cost'

export interface ReportFilters {
  warehouseId?: string
  materialId?: string
  fromDate?: string
  toDate?: string
  page?: number
  pageSize?: number
}

export interface ReportMetric {
  label: string
  value: number | string
  prefix?: string
  suffix?: string
}

export interface ReportChartPoint {
  label: string
  value: number
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
  chartData: ReportChartPoint[]
  pagination: ReportPagination
  generatedAt: string
}

export type ReportExportRow = Record<string, string | number | boolean | null>

declare global {
  interface Window {
    craftReportsAPI?: {
      getReport: (reportType: ReportType, filters?: ReportFilters) => Promise<ReportApiResponse>
      getReportExportRows: (reportType: ReportType, filters?: ReportFilters) => Promise<ReportExportRow[]>
    }
  }
}

function getReportsAPI() {
  if (!window.craftReportsAPI) {
    throw new Error('craftReportsAPI is not available. Check preload or IPC setup.')
  }

  return window.craftReportsAPI
}

export const reportsService = {
  async getReport(reportType: ReportType, filters: ReportFilters = {}): Promise<ReportApiResponse> {
    return getReportsAPI().getReport(reportType, filters)
  },
  async getReportExportRows(reportType: ReportType, filters: ReportFilters = {}): Promise<ReportExportRow[]> {
    return getReportsAPI().getReportExportRows(reportType, filters)
  },
}
