import { useCallback, useEffect, useState } from 'react'
import {
  reportsService,
  type ReportApiResponse,
  type ReportExportRow,
  type ReportFilters,
  type ReportType,
} from '../../services/reportsService'
import { getLocalDateYMD } from '../../utils/displayFormatting'

export const dashboardPanelSx = {
  p: { xs: 1.75, sm: 2.25 },
  minWidth: 0,
  borderRadius: '18px',
  background: 'rgba(248, 250, 252, 0.10)',
  backdropFilter: 'blur(36px) saturate(120%)',
  WebkitBackdropFilter: 'blur(18px) saturate(120%)',
  border: '1px solid rgba(255, 255, 255, 0.10)',
  boxShadow: '0 18px 45px rgba(2, 6, 23, 0.16)',
  color: 'rgba(255, 255, 255, 0.92)',
  backgroundImage: 'none',
}

export const craftPageGlassSx = {
  '& .MuiPaper-root': { color: 'rgba(255,255,255,.92)', backgroundImage: 'none' },
  '& .MuiTypography-root': { color: 'rgba(255,255,255,.92)' },
  '& td, & th, & .MuiTableCell-root': {
    whiteSpace: 'nowrap',
    wordBreak: 'normal',
    overflowWrap: 'normal',
    boxSizing: 'border-box',
    verticalAlign: 'middle',
    textAlign: 'center',
  },
  '& .MuiTableCell-root': {
    color: 'rgba(255,255,255,.84)',
    borderBottomColor: 'rgba(255,255,255,.08)',
  },
  '& .MuiOutlinedInput-root': {
    color: '#fff',
    background: 'rgba(255,255,255,.06)',
    borderRadius: '12px',
    '& fieldset': { borderColor: 'rgba(255,255,255,.16)' },
    '&:hover fieldset': { borderColor: 'rgba(103,232,249,.48)' },
  },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,.68)' },
}

export type ReportDateRange = {
  fromDate: string
  toDate: string
  period: ReportDatePeriod
}

export type ReportDatePeriod = 'weekly' | 'monthly' | 'yearly' | 'custom'

function getPeriodDates(period: Exclude<ReportDatePeriod, 'custom'>, now = new Date()) {
  const toDate = getLocalDateYMD(now)
  let startDate: Date
  if (period === 'weekly') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7), 12)
  } else if (period === 'yearly') {
    startDate = new Date(now.getFullYear(), 0, 1, 12)
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1, 12)
  }
  return { fromDate: getLocalDateYMD(startDate), toDate }
}

export function useReportDateRange(): ReportDateRange & {
  setFromDate: (value: string) => void
  setToDate: (value: string) => void
  setPeriod: (value: ReportDatePeriod) => void
  filters: ReportFilters
} {
  const [period, setPeriodState] = useState<ReportDatePeriod>('monthly')
  const [fromDate, setFromDateState] = useState(() => getPeriodDates('monthly').fromDate)
  const [toDate, setToDateState] = useState(() => getLocalDateYMD())
  const setPeriod = useCallback((value: ReportDatePeriod) => {
    setPeriodState(value)
    if (value !== 'custom') {
      const dates = getPeriodDates(value)
      setFromDateState(dates.fromDate)
      setToDateState(dates.toDate)
    }
  }, [])
  const setFromDate = useCallback((value: string) => {
    setPeriodState('custom')
    setFromDateState(value)
  }, [])
  const setToDate = useCallback((value: string) => {
    setPeriodState('custom')
    setToDateState(value)
  }, [])
  return {
    fromDate,
    toDate,
    period,
    setFromDate,
    setToDate,
    setPeriod,
    filters: { fromDate, toDate, period, page: 0, pageSize: 1000 },
  }
}

export type ReportDataset = {
  report: ReportApiResponse
  rows: ReportExportRow[]
}

type ReportState = {
  queryKey: string
  data: Partial<Record<ReportType, ReportDataset>>
  loading: boolean
  error: string
}

export function useReportsData(
  reportTypes: readonly ReportType[],
  filters: ReportFilters,
) {
  const [state, setState] = useState<ReportState>({ queryKey: '', data: {}, loading: true, error: '' })
  const [retryCount, setRetryCount] = useState(0)
  const refresh = useCallback(() => setRetryCount((count) => count + 1), [])
  const fromDate = filters.fromDate ?? ''
  const toDate = filters.toDate ?? ''
  const period = filters.period ?? 'custom'
  const invalidRange = Boolean(fromDate && toDate && fromDate > toDate)
  const rangeError = 'تاريخ البداية يجب أن يسبق تاريخ النهاية أو يساويه.'
  const queryKey = `${reportTypes.join('|')}:${fromDate}:${toDate}:${period}:${retryCount}`

  useEffect(() => {
    if (invalidRange) return
    let isCurrent = true
    const requestFilters: ReportFilters = {
      fromDate,
      toDate,
      period,
      page: 0,
      pageSize: 1000,
    }
    const requests = reportTypes.map(async (reportType) => {
      const [report, rows] = await Promise.all([
        reportsService.getReport(reportType, requestFilters),
        reportsService.getReportExportRows(reportType, requestFilters),
      ])
      return [reportType, { report, rows }] as const
    })

    void Promise.all(requests)
      .then((entries) => {
        if (!isCurrent) return
        const data: Partial<Record<ReportType, ReportDataset>> = {}
        entries.forEach(([reportType, dataset]) => { data[reportType] = dataset })
        setState({ queryKey, data, loading: false, error: '' })
      })
      .catch((error: unknown) => {
        if (!isCurrent) return
        const message = error instanceof Error ? error.message : 'تعذر تحميل بيانات التقارير.'
        setState({ queryKey, data: {}, loading: false, error: message })
      })

    return () => { isCurrent = false }
  }, [reportTypes, fromDate, toDate, period, retryCount, invalidRange, queryKey])

  return {
    data: state.data,
    loading: invalidRange ? false : state.queryKey !== queryKey || state.loading,
    error: invalidRange ? rangeError : state.queryKey === queryKey ? state.error : '',
    refresh,
  }
}
