function normalizeNumber(value) {
  const num = Number(value ?? 0)
  return Number.isFinite(num) ? num : 0
}

function parseAdjustmentReportNotes(rawNotes) {
  const raw = typeof rawNotes === 'string' ? rawNotes.trim() : ''
  if (!raw) {
    return { snapshot: null, lineNotes: '' }
  }

  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { snapshot: null, lineNotes: raw }
    }

    const snapshot = parsed.snapshot && typeof parsed.snapshot === 'object' && !Array.isArray(parsed.snapshot)
      ? parsed.snapshot
      : null
    const lineNotes = typeof parsed.lineNotes === 'string' ? parsed.lineNotes.trim() : ''

    return { snapshot, lineNotes }
  } catch {
    return { snapshot: null, lineNotes: raw }
  }
}

function mapAdjustmentReportRow(row) {
  const quantityIn = normalizeNumber(row[7])
  const quantityOut = normalizeNumber(row[8])
  const movementCost = normalizeNumber(row[9])
  const parsedNotes = parseAdjustmentReportNotes(row[10])
  const snapshot = parsedNotes.snapshot

  const fallbackDifference = quantityIn - quantityOut
  const systemQuantity = snapshot && Number.isFinite(Number(snapshot.systemQuantity))
    ? Number(snapshot.systemQuantity)
    : 0
  const countedQuantity = snapshot && Number.isFinite(Number(snapshot.countedQuantity))
    ? Number(snapshot.countedQuantity)
    : systemQuantity + fallbackDifference
  const difference = snapshot && Number.isFinite(Number(snapshot.difference))
    ? Number(snapshot.difference)
    : fallbackDifference
  const unitCost = snapshot && Number.isFinite(Number(snapshot.unitCost))
    ? Number(snapshot.unitCost)
    : movementCost

  return {
    movementId: row[0] ?? '',
    reference: row[1] ?? '',
    date: row[2] ?? '',
    warehouseName: row[3] ?? '',
    materialNumber: row[4] ?? '',
    materialName: row[5] ?? '',
    unit: row[6] ?? '',
    systemQuantity,
    countedQuantity,
    difference,
    unitCost,
    differenceValue: Math.abs(difference) * unitCost,
    notes: parsedNotes.lineNotes || row[11] || '',
  }
}

function readNumber(db, sql, params = []) {
  const value = db.exec(sql, params)[0]?.values?.[0]?.[0]
  return Number(value ?? 0)
}

const REPORT_PERIODS = new Set(['daily', 'weekly', 'monthly', 'yearly', 'custom'])

function formatLocalDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseLocalDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ''))
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0)
  return Number.isNaN(date.getTime()) ? null : date
}

function resolvePeriodDateRange(period, fromDate, toDate) {
  if (period === 'custom') {
    return { fromDate, toDate }
  }

  const today = new Date()
  today.setHours(12, 0, 0, 0)

  if (period === 'daily') {
    const value = formatLocalDate(today)
    return { fromDate: value, toDate: value }
  }

  if (period === 'weekly') {
    const monday = new Date(today)
    const day = monday.getDay()
    const diffToMonday = day === 0 ? -6 : 1 - day
    monday.setDate(monday.getDate() + diffToMonday)

    const sunday = new Date(monday)
    sunday.setDate(sunday.getDate() + 6)

    return {
      fromDate: formatLocalDate(monday),
      toDate: formatLocalDate(sunday),
    }
  }

  if (period === 'monthly') {
    return {
      fromDate: formatLocalDate(new Date(today.getFullYear(), today.getMonth(), 1, 12)),
      toDate: formatLocalDate(new Date(today.getFullYear(), today.getMonth() + 1, 0, 12)),
    }
  }

  if (period === 'yearly') {
    return {
      fromDate: `${today.getFullYear()}-01-01`,
      toDate: `${today.getFullYear()}-12-31`,
    }
  }

  return { fromDate, toDate }
}

function resolveChartGranularity(period, fromDate, toDate) {
  if (period === 'yearly') return 'month'
  if (period === 'daily' || period === 'weekly' || period === 'monthly') return 'day'

  if (period === 'custom') {
    const start = parseLocalDate(fromDate)
    const end = parseLocalDate(toDate)
    if (!start || !end) return 'month'

    const days = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000))
    if (days <= 62) return 'day'
    if (days <= 730) return 'month'
    return 'year'
  }

  return 'month'
}

function getDateBucketExpression(dateField, granularity) {
  if (granularity === 'day') return `substr(${dateField}, 1, 10)`
  if (granularity === 'year') return `substr(${dateField}, 1, 4)`
  return `substr(${dateField}, 1, 7)`
}

function buildBucketLabels(fromDate, toDate, granularity) {
  const start = parseLocalDate(fromDate)
  const end = parseLocalDate(toDate)
  if (!start || !end || start > end) return []

  const labels = []
  const cursor = new Date(start)

  if (granularity === 'year') {
    cursor.setMonth(0, 1)
    while (cursor <= end) {
      labels.push(String(cursor.getFullYear()))
      cursor.setFullYear(cursor.getFullYear() + 1)
    }
    return labels
  }

  if (granularity === 'month') {
    cursor.setDate(1)
    while (cursor <= end) {
      labels.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`)
      cursor.setMonth(cursor.getMonth() + 1)
    }
    return labels
  }

  while (cursor <= end) {
    labels.push(formatLocalDate(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  return labels
}

function buildChartData(chartRows, series, fromDate, toDate, granularity) {
  const mapped = new Map()

  for (const row of chartRows) {
    const label = String(row[0] ?? '')
    const values = {}
    series.forEach((item, index) => {
      values[item.key] = normalizeNumber(row[index + 1])
    })
    mapped.set(label, { label, values })
  }

  const buckets = buildBucketLabels(fromDate, toDate, granularity)
  if (buckets.length === 0) {
    return Array.from(mapped.values())
  }

  return buckets.map((label) => {
    const existing = mapped.get(label)
    if (existing) return existing

    const values = {}
    series.forEach((item) => {
      values[item.key] = 0
    })
    return { label, values }
  })
}

function getBaseReportPayload(reportType, filters = {}) {
  const page = Math.max(0, Number(filters.page ?? 0))
  const pageSize = Math.min(1000, Math.max(1, Number(filters.pageSize ?? 10)))
  const requestedPeriod = String(filters.period ?? 'weekly').trim()
  const period = REPORT_PERIODS.has(requestedPeriod) ? requestedPeriod : 'weekly'
  const requestedFromDate = String(filters.fromDate ?? '').trim() || null
  const requestedToDate = String(filters.toDate ?? '').trim() || null
  const range = resolvePeriodDateRange(period, requestedFromDate, requestedToDate)

  return {
    reportType,
    page,
    pageSize,
    warehouseId: String(filters.warehouseId ?? '').trim() || null,
    materialId: String(filters.materialId ?? '').trim() || null,
    fromDate: range.fromDate,
    toDate: range.toDate,
    period,
    chartGranularity: resolveChartGranularity(period, range.fromDate, range.toDate),
  }
}

function buildPagination(totalCount, page, pageSize) {
  const safeTotalCount = Number.isFinite(totalCount) ? Math.max(0, totalCount) : 0
  const safePageSize = Math.max(1, Number(pageSize) || 10)
  const totalPages = safeTotalCount === 0 ? 0 : Math.max(1, Math.ceil(safeTotalCount / safePageSize))

  return {
    page: Math.max(0, Number(page) || 0),
    pageSize: safePageSize,
    totalCount: safeTotalCount,
    totalPages,
  }
}

function addWhereClause(clauses, params, condition, value) {
  if (!value) return
  clauses.push(condition)
  params.push(value)
}

function buildMaterialFilterClause() {
  return ["m.status <> 'deleted'", 'COALESCE(m.is_non_stock, 0) = 0']
}

function buildDateRangeClauses(clauses, params, dateField, fromDate, toDate) {
  addWhereClause(clauses, params, `${dateField} >= ?`, fromDate)
  addWhereClause(clauses, params, `${dateField} <= ?`, toDate)
}

function buildFilteredStockQuery(baseTable, alias, warehouseId, materialId, fromDate, toDate, dateField = 'date') {
  const clauses = [...buildMaterialFilterClause()]
  const params = []
  addWhereClause(clauses, params, `${alias}.warehouse_id = ?`, warehouseId)
  addWhereClause(clauses, params, `${alias}.material_id = ?`, materialId)
  if (fromDate || toDate) {
    buildDateRangeClauses(clauses, params, `${baseTable}.${dateField}`, fromDate, toDate)
  }
  return { clauses, params }
}

function buildWarehouseChartData(db, rowsQuery, params) {
  return db.exec(rowsQuery, params)[0]?.values ?? []
}

export function getReportData(db, reportType, filters = {}) {
  const options = getBaseReportPayload(reportType, filters)
  const { warehouseId, materialId, fromDate, toDate, page, pageSize, chartGranularity } = options

  if (reportType === 'stock_balances') {
    const clauses = [...buildMaterialFilterClause()]
    const params = []
    addWhereClause(clauses, params, 'sl.warehouse_id = ?', warehouseId)
    addWhereClause(clauses, params, 'sl.material_id = ?', materialId)

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
    const totalRows = readNumber(db, `SELECT COUNT(*) FROM stock_levels sl LEFT JOIN materials m ON m.id = sl.material_id ${where}`, params)
    const rows = db.exec(
      `SELECT sl.warehouse_id, w.name AS warehouse_name, sl.material_id, m.material_number, m.name AS material_name,
              COALESCE(sl.quantity, 0) AS quantity,
              COALESCE(sl.average_cost, 0) AS average_cost,
              COALESCE(sl.quantity, 0) * COALESCE(sl.average_cost, 0) AS stock_value,
              m.unit
       FROM stock_levels sl
       LEFT JOIN warehouses w ON w.id = sl.warehouse_id
       LEFT JOIN materials m ON m.id = sl.material_id
       ${where}
       ORDER BY w.name, m.material_number
       LIMIT ? OFFSET ?`,
      [...params, pageSize, page * pageSize]
    )[0]?.values ?? []

    const totalQty = readNumber(db, `SELECT COALESCE(SUM(COALESCE(sl.quantity, 0)), 0) FROM stock_levels sl LEFT JOIN materials m ON m.id = sl.material_id ${where}`, params)
    const totalValue = readNumber(db, `SELECT COALESCE(SUM(COALESCE(sl.quantity, 0) * COALESCE(sl.average_cost, 0)), 0) FROM stock_levels sl LEFT JOIN materials m ON m.id = sl.material_id ${where}`, params)
    const materialCount = readNumber(db, `SELECT COUNT(DISTINCT sl.material_id) FROM stock_levels sl LEFT JOIN materials m ON m.id = sl.material_id ${where}`, params)
    const warehouseCount = readNumber(db, `SELECT COUNT(DISTINCT sl.warehouse_id) FROM stock_levels sl LEFT JOIN materials m ON m.id = sl.material_id ${where}`, params)
    const chartDataRows = db.exec(
      `SELECT w.name AS label, SUM(COALESCE(sl.quantity, 0) * COALESCE(sl.average_cost, 0)) AS value
       FROM stock_levels sl
       LEFT JOIN warehouses w ON w.id = sl.warehouse_id
       LEFT JOIN materials m ON m.id = sl.material_id
       ${where}
       GROUP BY w.id, w.name
       ORDER BY w.name ASC`,
      params
    )[0]?.values ?? []

    return {
      reportType,
      summary: [
        { label: 'إجمالي الكمية', value: totalQty },
        { label: 'إجمالي القيمة', value: totalValue },
        { label: 'عدد المواد', value: materialCount },
        { label: 'عدد المخازن', value: warehouseCount },
      ],
      rows: rows.map((row) => ({
        warehouseId: row[0] ?? '',
        warehouseName: row[1] ?? '',
        materialId: row[2] ?? '',
        materialNumber: row[3] ?? '',
        materialName: row[4] ?? '',
        quantity: normalizeNumber(row[5]),
        averageCost: normalizeNumber(row[6]),
        stockValue: normalizeNumber(row[7]),
        unit: row[8] ?? '',
      })),
      chartSeries: [{ key: 'stockValue', label: 'قيمة المخزون' }],
      chartData: chartDataRows.map((row) => ({
        label: String(row[0] ?? ''),
        values: { stockValue: normalizeNumber(row[1]) },
      })),
      pagination: buildPagination(totalRows, page, pageSize),
      generatedAt: new Date().toISOString(),
    }
  }

  if (reportType === 'inventory_valuation') {
    const clauses = [...buildMaterialFilterClause()]
    const params = []
    addWhereClause(clauses, params, 'sl.warehouse_id = ?', warehouseId)
    addWhereClause(clauses, params, 'sl.material_id = ?', materialId)

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
    const totalRows = readNumber(db, `SELECT COUNT(*) FROM stock_levels sl LEFT JOIN materials m ON m.id = sl.material_id ${where}`, params)
    const rows = db.exec(
      `SELECT w.name AS warehouse_name, m.material_number, m.name AS material_name,
              COALESCE(sl.quantity, 0) AS quantity,
              COALESCE(sl.average_cost, 0) AS average_cost,
              COALESCE(sl.quantity, 0) * COALESCE(sl.average_cost, 0) AS stock_value,
              m.unit
       FROM stock_levels sl
       LEFT JOIN warehouses w ON w.id = sl.warehouse_id
       LEFT JOIN materials m ON m.id = sl.material_id
       ${where}
       ORDER BY w.name, m.material_number
       LIMIT ? OFFSET ?`,
      [...params, pageSize, page * pageSize]
    )[0]?.values ?? []

    const totalQty = readNumber(db, `SELECT COALESCE(SUM(COALESCE(sl.quantity, 0)), 0) FROM stock_levels sl LEFT JOIN materials m ON m.id = sl.material_id ${where}`, params)
    const totalValue = readNumber(db, `SELECT COALESCE(SUM(COALESCE(sl.quantity, 0) * COALESCE(sl.average_cost, 0)), 0) FROM stock_levels sl LEFT JOIN materials m ON m.id = sl.material_id ${where}`, params)
    const materialCount = readNumber(db, `SELECT COUNT(DISTINCT sl.material_id) FROM stock_levels sl LEFT JOIN materials m ON m.id = sl.material_id ${where}`, params)
    const warehouseCount = readNumber(db, `SELECT COUNT(DISTINCT sl.warehouse_id) FROM stock_levels sl LEFT JOIN materials m ON m.id = sl.material_id ${where}`, params)
    const chartDataRows = db.exec(
      `SELECT w.name AS label, SUM(COALESCE(sl.quantity, 0) * COALESCE(sl.average_cost, 0)) AS value
       FROM stock_levels sl
       LEFT JOIN warehouses w ON w.id = sl.warehouse_id
       LEFT JOIN materials m ON m.id = sl.material_id
       ${where}
       GROUP BY w.id, w.name
       ORDER BY w.name ASC`,
      params
    )[0]?.values ?? []

    return {
      reportType,
      summary: [
        { label: 'إجمالي الكمية', value: totalQty },
        { label: 'إجمالي القيمة', value: totalValue },
        { label: 'عدد المواد', value: materialCount },
        { label: 'عدد المخازن', value: warehouseCount },
      ],
      rows: rows.map((row) => ({
        warehouseName: row[0] ?? '',
        materialNumber: row[1] ?? '',
        materialName: row[2] ?? '',
        quantity: normalizeNumber(row[3]),
        averageCost: normalizeNumber(row[4]),
        stockValue: normalizeNumber(row[5]),
        unit: row[6] ?? '',
      })),
      chartSeries: [{ key: 'stockValue', label: 'قيمة المخزون' }],
      chartData: chartDataRows.map((row) => ({
        label: String(row[0] ?? ''),
        values: { stockValue: normalizeNumber(row[1]) },
      })),
      pagination: buildPagination(totalRows, page, pageSize),
      generatedAt: new Date().toISOString(),
    }
  }

  if (reportType === 'purchases') {
    const clauses = ['pi.status = ?']
    const params = ['completed']
    addWhereClause(clauses, params, 'pi.warehouse_id = ?', warehouseId)
    addWhereClause(clauses, params, 'EXISTS (SELECT 1 FROM purchase_invoice_items pii WHERE pii.invoice_id = pi.id AND pii.material_id = ?)', materialId)
    buildDateRangeClauses(clauses, params, 'pi.date', fromDate, toDate)

    const where = `WHERE ${clauses.join(' AND ')}`
    const total = readNumber(db, `SELECT COUNT(*) FROM purchase_invoices pi ${where}`, params)
    const rows = db.exec(
      `SELECT pi.id, pi.invoice_number, pi.date, s.name AS supplier_name, w.name AS warehouse_name,
              pi.net_total, COALESCE(pi.expenses, 0) AS expenses,
              COALESCE((SELECT SUM(pp.amount) FROM purchase_payments pp WHERE pp.invoice_id = pi.id), 0) AS paid_amount,
              COALESCE(pi.net_total - (SELECT COALESCE(SUM(pp.amount), 0) FROM purchase_payments pp WHERE pp.invoice_id = pi.id), 0) AS remaining_amount,
              pi.status
       FROM purchase_invoices pi
       LEFT JOIN suppliers s ON s.id = pi.supplier_id
       LEFT JOIN warehouses w ON w.id = pi.warehouse_id
       ${where}
       ORDER BY pi.date DESC, pi.invoice_number DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, page * pageSize]
    )[0]?.values ?? []

    const chartSeries = [
      { key: 'total', label: 'إجمالي المشتريات' },
      { key: 'expenses', label: 'المصاريف الإضافية' },
      { key: 'paid', label: 'المدفوع' },
      { key: 'remaining', label: 'المتبقي' },
    ]
    const bucketExpression = getDateBucketExpression('pi.date', chartGranularity)
    const chartDataRows = db.exec(
      `SELECT ${bucketExpression} AS label,
              SUM(COALESCE(pi.net_total, 0)) AS total_value,
              SUM(COALESCE(pi.expenses, 0)) AS expenses_value,
              SUM(COALESCE((SELECT SUM(pp.amount) FROM purchase_payments pp WHERE pp.invoice_id = pi.id), 0)) AS paid_value,
              SUM(
                CASE
                  WHEN COALESCE(pi.net_total, 0) - COALESCE((SELECT SUM(pp.amount) FROM purchase_payments pp WHERE pp.invoice_id = pi.id), 0) > 0
                    THEN COALESCE(pi.net_total, 0) - COALESCE((SELECT SUM(pp.amount) FROM purchase_payments pp WHERE pp.invoice_id = pi.id), 0)
                  ELSE 0
                END
              ) AS remaining_value
       FROM purchase_invoices pi
       ${where}
       GROUP BY ${bucketExpression}
       ORDER BY label ASC`,
      params
    )[0]?.values ?? []

    const summaryNet = readNumber(db, `SELECT COALESCE(SUM(pi.net_total), 0) FROM purchase_invoices pi ${where}`, params)
    const summaryExpenses = readNumber(db, `SELECT COALESCE(SUM(pi.expenses), 0) FROM purchase_invoices pi ${where}`, params)
    const summaryPaid = readNumber(db, `SELECT COALESCE(SUM(COALESCE((SELECT SUM(pp.amount) FROM purchase_payments pp WHERE pp.invoice_id = pi.id), 0)), 0) FROM purchase_invoices pi ${where}`, params)
    return {
      reportType,
      summary: [
        { label: 'عدد الفواتير', value: total },
        { label: 'إجمالي المشتريات', value: summaryNet },
        { label: 'المصاريف الإضافية', value: summaryExpenses },
        { label: 'المبالغ المدفوعة', value: summaryPaid },
      ],
      rows: rows.map((row) => ({
        id: row[0] ?? '',
        invoiceNumber: row[1] ?? '',
        date: row[2] ?? '',
        supplierName: row[3] ?? '',
        warehouseName: row[4] ?? '',
        netTotal: normalizeNumber(row[5]),
        expenses: normalizeNumber(row[6]),
        paidAmount: normalizeNumber(row[7]),
        remainingAmount: normalizeNumber(row[8]),
        status: row[9] ?? '',
      })),
      chartSeries,
      chartData: buildChartData(chartDataRows, chartSeries, fromDate, toDate, chartGranularity),
      pagination: buildPagination(total, page, pageSize),
      generatedAt: new Date().toISOString(),
    }
  }

  if (reportType === 'sales') {
    const clauses = ['si.status = ?']
    const params = ['completed']
    addWhereClause(clauses, params, 'si.warehouse_id = ?', warehouseId)
    addWhereClause(clauses, params, 'EXISTS (SELECT 1 FROM sales_invoice_items sii WHERE sii.invoice_id = si.id AND sii.material_id = ?)', materialId)
    buildDateRangeClauses(clauses, params, 'si.date', fromDate, toDate)

    const where = `WHERE ${clauses.join(' AND ')}`
    const total = readNumber(db, `SELECT COUNT(*) FROM sales_invoices si ${where}`, params)
    const rows = db.exec(
      `SELECT si.id, si.invoice_number, si.date, c.name AS customer_name, w.name AS warehouse_name,
              si.net_total, COALESCE(si.customer_additional_fees, 0) AS customer_additional_fees,
              COALESCE((SELECT SUM(sr.net_total) FROM sales_returns sr WHERE sr.sales_invoice_id = si.id), 0) AS return_total,
              COALESCE((SELECT SUM(sp.amount) FROM sales_payments sp WHERE sp.invoice_id = si.id), 0) AS paid_amount,
              si.status
       FROM sales_invoices si
       LEFT JOIN customers c ON c.id = si.customer_id
       LEFT JOIN warehouses w ON w.id = si.warehouse_id
       ${where}
       ORDER BY si.date DESC, si.invoice_number DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, page * pageSize]
    )[0]?.values ?? []

    const chartSeries = [
      { key: 'total', label: 'إجمالي المبيعات' },
      { key: 'fees', label: 'رسوم إضافية على العميل' },
      { key: 'paid', label: 'المستلم' },
      { key: 'remaining', label: 'المتبقي' },
    ]
    const bucketExpression = getDateBucketExpression('si.date', chartGranularity)
    const chartDataRows = db.exec(
      `SELECT ${bucketExpression} AS label,
              SUM(COALESCE(si.net_total, 0)) AS total_value,
              SUM(COALESCE(si.customer_additional_fees, 0)) AS fees_value,
              SUM(COALESCE((SELECT SUM(sp.amount) FROM sales_payments sp WHERE sp.invoice_id = si.id), 0)) AS paid_value,
              SUM(
                CASE
                  WHEN COALESCE(si.net_total, 0) - COALESCE((SELECT SUM(sp.amount) FROM sales_payments sp WHERE sp.invoice_id = si.id), 0) > 0
                    THEN COALESCE(si.net_total, 0) - COALESCE((SELECT SUM(sp.amount) FROM sales_payments sp WHERE sp.invoice_id = si.id), 0)
                  ELSE 0
                END
              ) AS remaining_value
       FROM sales_invoices si
       ${where}
       GROUP BY ${bucketExpression}
       ORDER BY label ASC`,
      params
    )[0]?.values ?? []

    const summaryNet = readNumber(db, `SELECT COALESCE(SUM(si.net_total), 0) FROM sales_invoices si ${where}`, params)
    const summaryFees = readNumber(db, `SELECT COALESCE(SUM(si.customer_additional_fees), 0) FROM sales_invoices si ${where}`, params)
    const summaryPaid = readNumber(db, `SELECT COALESCE(SUM(COALESCE((SELECT SUM(sp.amount) FROM sales_payments sp WHERE sp.invoice_id = si.id), 0)), 0) FROM sales_invoices si ${where}`, params)
    return {
      reportType,
      summary: [
        { label: 'عدد الفواتير', value: total },
        { label: 'إجمالي المبيعات', value: summaryNet },
        { label: 'رسوم إضافية على العميل', value: summaryFees },
        { label: 'المبالغ المستلمة', value: summaryPaid },
      ],
      rows: rows.map((row) => {
        const netTotal = normalizeNumber(row[5])
        const paidAmount = normalizeNumber(row[8])

        return {
          id: row[0] ?? '',
          invoiceNumber: row[1] ?? '',
          date: row[2] ?? '',
          customerName: row[3] ?? '',
          warehouseName: row[4] ?? '',
          netTotal,
          customerAdditionalFees: normalizeNumber(row[6]),
          paidAmount,
          remainingAmount: Math.max(netTotal - paidAmount, 0),
          status: row[9] ?? '',
        }
      }),
      chartSeries,
      chartData: buildChartData(chartDataRows, chartSeries, fromDate, toDate, chartGranularity),
      pagination: buildPagination(total, page, pageSize),
      generatedAt: new Date().toISOString(),
    }
  }

  if (reportType === 'movements') {
    const clauses = ['d.status = ?']
    const params = ['completed']
    addWhereClause(clauses, params, 'sm.warehouse_id = ?', warehouseId)
    addWhereClause(clauses, params, 'sm.material_id = ?', materialId)
    buildDateRangeClauses(clauses, params, 'd.date', fromDate, toDate)

    const where = `WHERE ${clauses.join(' AND ')}`
    const total = readNumber(db, `SELECT COUNT(*) FROM stock_movements sm LEFT JOIN stock_movement_documents d ON d.reference = sm.document_reference ${where}`, params)
    const rows = db.exec(
      `SELECT sm.id, d.reference, d.type, d.date, m.material_number, m.name AS material_name, sm.quantity_in, sm.quantity_out,
              w.name AS warehouse_name, COALESCE(sm.cost, 0) AS cost, m.unit, sm.notes
       FROM stock_movements sm
       LEFT JOIN stock_movement_documents d ON d.reference = sm.document_reference
       LEFT JOIN materials m ON m.id = sm.material_id
       LEFT JOIN warehouses w ON w.id = sm.warehouse_id
       ${where}
       ORDER BY d.date DESC, d.reference DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, page * pageSize]
    )[0]?.values ?? []

    const incomingValue = readNumber(db, `SELECT COALESCE(SUM(COALESCE(sm.quantity_in, 0) * COALESCE(sm.cost, 0)), 0) FROM stock_movements sm LEFT JOIN stock_movement_documents d ON d.reference = sm.document_reference ${where}`, params)
    const outgoingValue = readNumber(db, `SELECT COALESCE(SUM(COALESCE(sm.quantity_out, 0) * COALESCE(sm.cost, 0)), 0) FROM stock_movements sm LEFT JOIN stock_movement_documents d ON d.reference = sm.document_reference ${where}`, params)

    const chartSeries = [
      { key: 'incoming', label: 'قيمة الوارد' },
      { key: 'outgoing', label: 'قيمة الصادر' },
      { key: 'difference', label: 'الفرق' },
    ]
    const bucketExpression = getDateBucketExpression('d.date', chartGranularity)
    const chartDataRows = db.exec(
      `SELECT ${bucketExpression} AS label,
              SUM(COALESCE(sm.quantity_in, 0) * COALESCE(sm.cost, 0)) AS incoming_value,
              SUM(COALESCE(sm.quantity_out, 0) * COALESCE(sm.cost, 0)) AS outgoing_value,
              ABS(
                SUM(COALESCE(sm.quantity_in, 0) * COALESCE(sm.cost, 0)) -
                SUM(COALESCE(sm.quantity_out, 0) * COALESCE(sm.cost, 0))
              ) AS difference_value
       FROM stock_movements sm
       LEFT JOIN stock_movement_documents d ON d.reference = sm.document_reference
       ${where}
       GROUP BY ${bucketExpression}
       ORDER BY label ASC`,
      params
    )[0]?.values ?? []

    return {
      reportType,
      summary: [
        { label: 'عدد الحركات', value: total },
        { label: 'قيمة الوارد', value: incomingValue },
        { label: 'قيمة الصادر', value: outgoingValue },
      ],
      rows: rows.map((row) => {
        const quantityIn = normalizeNumber(row[6])
        const quantityOut = normalizeNumber(row[7])
        const cost = normalizeNumber(row[9])
        const movementValue = normalizeNumber((quantityIn > 0 ? quantityIn : quantityOut) * cost)

        return {
          movementId: row[0] ?? '',
          reference: row[1] ?? '',
          type: row[2] ?? '',
          date: row[3] ?? '',
          materialNumber: row[4] ?? '',
          materialName: row[5] ?? '',
          warehouseName: row[8] ?? '',
          unit: row[10] ?? '',
          quantityIn,
          quantityOut,
          cost,
          movementValue,
          notes: row[11] ?? '',
        }
      }),
      chartSeries,
      chartData: buildChartData(chartDataRows, chartSeries, fromDate, toDate, chartGranularity),
      pagination: buildPagination(total, page, pageSize),
      generatedAt: new Date().toISOString(),
    }
  }

  if (reportType === 'inventory_adjustments') {
    const clauses = [
      "d.status = 'completed'",
      "d.type = 'adjustment'",
      "sm.type IN ('adjustment_in', 'adjustment_out')",
      "d.reference NOT LIKE 'OPENING-%'",
    ]
    const params = []
    addWhereClause(clauses, params, 'sm.warehouse_id = ?', warehouseId)
    addWhereClause(clauses, params, 'sm.material_id = ?', materialId)
    buildDateRangeClauses(clauses, params, 'd.date', fromDate, toDate)

    const where = `WHERE ${clauses.join(' AND ')}`
    const fromSql = `FROM stock_movements sm
      LEFT JOIN stock_movement_documents d ON d.reference = sm.document_reference
      LEFT JOIN materials m ON m.id = sm.material_id
      LEFT JOIN warehouses w ON w.id = sm.warehouse_id`

    const totalRows = readNumber(db, `SELECT COUNT(*) ${fromSql} ${where}`, params)
    const adjustmentCount = readNumber(db, `SELECT COUNT(DISTINCT d.reference) ${fromSql} ${where}`, params)
    const totalIncrease = readNumber(db, `SELECT COALESCE(SUM(COALESCE(sm.quantity_in, 0)), 0) ${fromSql} ${where}`, params)
    const totalShortage = readNumber(db, `SELECT COALESCE(SUM(COALESCE(sm.quantity_out, 0)), 0) ${fromSql} ${where}`, params)
    const totalDifferenceValue = readNumber(
      db,
      `SELECT COALESCE(SUM((COALESCE(sm.quantity_in, 0) + COALESCE(sm.quantity_out, 0)) * COALESCE(sm.cost, 0)), 0) ${fromSql} ${where}`,
      params,
    )

    const rows = db.exec(
      `SELECT sm.id, d.reference, d.date, w.name AS warehouse_name,
              m.material_number, m.name AS material_name, COALESCE(sm.unit, m.unit, '') AS unit,
              COALESCE(sm.quantity_in, 0) AS quantity_in,
              COALESCE(sm.quantity_out, 0) AS quantity_out,
              COALESCE(sm.cost, 0) AS cost,
              sm.notes AS line_notes,
              d.notes AS document_notes
       ${fromSql}
       ${where}
       ORDER BY d.date DESC, d.reference DESC, sm.rowid ASC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, page * pageSize],
    )[0]?.values ?? []

    const chartSeries = [
      { key: 'increase', label: 'زيادة الجرد' },
      { key: 'shortage', label: 'نقص الجرد' },
    ]
    const bucketExpression = getDateBucketExpression('d.date', chartGranularity)
    const chartDataRows = db.exec(
      `SELECT ${bucketExpression} AS label,
              SUM(COALESCE(sm.quantity_in, 0)) AS increase_quantity,
              SUM(COALESCE(sm.quantity_out, 0)) AS shortage_quantity
       ${fromSql}
       ${where}
       GROUP BY ${bucketExpression}
       ORDER BY label ASC`,
      params,
    )[0]?.values ?? []

    return {
      reportType,
      summary: [
        { label: 'عدد التسويات', value: adjustmentCount },
        { label: 'إجمالي الزيادة', value: totalIncrease },
        { label: 'إجمالي النقص', value: totalShortage },
        { label: 'قيمة فروقات الجرد', value: totalDifferenceValue },
      ],
      rows: rows.map(mapAdjustmentReportRow),
      chartSeries,
      chartData: buildChartData(chartDataRows, chartSeries, fromDate, toDate, chartGranularity),
      pagination: buildPagination(totalRows, page, pageSize),
      generatedAt: new Date().toISOString(),
    }
  }

  if (reportType === 'production') {
    const clauses = []
    const params = []
    addWhereClause(clauses, params, 'po.output_warehouse_id = ?', warehouseId)
    addWhereClause(clauses, params, 'po.product_material_id = ?', materialId)
    buildDateRangeClauses(clauses, params, 'po.date', fromDate, toDate)

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
    const total = readNumber(db, `SELECT COUNT(*) FROM production_orders po ${where}`, params)
    const rows = db.exec(
      `SELECT po.id, po.order_number, po.date, m.name AS product_name, w.name AS warehouse_name,
              po.planned_output_quantity, po.actual_output_quantity, po.material_cost_total, po.labor_cost,
              COALESCE(po.material_cost_total, 0) + COALESCE(po.labor_cost, 0) AS total_production_cost,
              CASE
                WHEN COALESCE(po.actual_output_quantity, 0) > 0
                  THEN (COALESCE(po.material_cost_total, 0) + COALESCE(po.labor_cost, 0)) / po.actual_output_quantity
                ELSE 0
              END AS unit_production_cost
       FROM production_orders po
       LEFT JOIN materials m ON m.id = po.product_material_id
       LEFT JOIN warehouses w ON w.id = po.output_warehouse_id
       ${where}
       ORDER BY po.date DESC, po.order_number DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, page * pageSize]
    )[0]?.values ?? []

    const chartSeries = [
      { key: 'planned', label: 'الإنتاج المخطط' },
      { key: 'actual', label: 'الإنتاج الفعلي' },
      { key: 'difference', label: 'الفرق' },
    ]
    const bucketExpression = getDateBucketExpression('po.date', chartGranularity)
    const chartDataRows = db.exec(
      `SELECT ${bucketExpression} AS label,
              SUM(COALESCE(po.planned_output_quantity, 0)) AS planned_value,
              SUM(COALESCE(po.actual_output_quantity, 0)) AS actual_value,
              ABS(
                SUM(COALESCE(po.planned_output_quantity, 0)) -
                SUM(COALESCE(po.actual_output_quantity, 0))
              ) AS difference_value
       FROM production_orders po
       ${where}
       GROUP BY ${bucketExpression}
       ORDER BY label ASC`,
      params
    )[0]?.values ?? []

    const plannedTotal = readNumber(db, `SELECT COALESCE(SUM(planned_output_quantity),0) FROM production_orders po ${where}`, params)
    const actualTotal = readNumber(db, `SELECT COALESCE(SUM(actual_output_quantity),0) FROM production_orders po ${where}`, params)
    return {
      reportType,
      summary: [
        { label: 'عدد الأوامر', value: total },
        { label: 'الإنتاج المخطط', value: plannedTotal },
        { label: 'الإنتاج الفعلي', value: actualTotal },
        {
          label: 'تكلفة الإنتاج',
          value: readNumber(
            db,
            `SELECT COALESCE(SUM(COALESCE(material_cost_total, 0) + COALESCE(labor_cost, 0)), 0)
             FROM production_orders po ${where}`,
            params,
          ),
        },
      ],
      rows: rows.map((row) => {
        const plannedOutputQuantity = normalizeNumber(row[5])
        const actualOutputQuantity = normalizeNumber(row[6])

        return {
          id: row[0] ?? '',
          orderNumber: row[1] ?? '',
          date: row[2] ?? '',
          productName: row[3] ?? '',
          warehouseName: row[4] ?? '',
          plannedOutputQuantity,
          actualOutputQuantity,
          outputDifference: plannedOutputQuantity - actualOutputQuantity,
          materialCostTotal: normalizeNumber(row[7]),
          laborCost: normalizeNumber(row[8]),
          totalProductionCost: normalizeNumber(row[9]),
          unitProductionCost: normalizeNumber(row[10]),
        }
      }),
      chartSeries,
      chartData: buildChartData(chartDataRows, chartSeries, fromDate, toDate, chartGranularity),
      pagination: buildPagination(total, page, pageSize),
      generatedAt: new Date().toISOString(),
    }
  }

  if (reportType === 'production_cost') {
    const clauses = []
    const params = []
    addWhereClause(clauses, params, 'po.output_warehouse_id = ?', warehouseId)
    addWhereClause(clauses, params, 'po.product_material_id = ?', materialId)
    buildDateRangeClauses(clauses, params, 'po.date', fromDate, toDate)

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
    const total = readNumber(db, `SELECT COUNT(*) FROM production_orders po ${where}`, params)
    const rows = db.exec(
      `SELECT po.order_number, po.date, m.name AS product_name, w.name AS warehouse_name,
              po.planned_output_quantity, po.actual_output_quantity, po.material_cost_total, po.labor_cost,
              COALESCE(po.material_cost_total, 0) + COALESCE(po.labor_cost, 0) AS total_production_cost,
              CASE
                WHEN COALESCE(po.actual_output_quantity, 0) > 0
                  THEN (COALESCE(po.material_cost_total, 0) + COALESCE(po.labor_cost, 0)) / po.actual_output_quantity
                ELSE 0
              END AS unit_production_cost
       FROM production_orders po
       LEFT JOIN materials m ON m.id = po.product_material_id
       LEFT JOIN warehouses w ON w.id = po.output_warehouse_id
       ${where}
       ORDER BY po.date DESC, po.order_number DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, page * pageSize]
    )[0]?.values ?? []

    const totalLabor = readNumber(db, `SELECT COALESCE(SUM(labor_cost), 0) FROM production_orders po ${where}`, params)
    const totalMaterials = readNumber(db, `SELECT COALESCE(SUM(material_cost_total), 0) FROM production_orders po ${where}`, params)
    const totalCost = totalMaterials + totalLabor

    const chartSeries = [
      { key: 'materials', label: 'تكلفة المواد' },
      { key: 'labor', label: 'تكلفة الأجور' },
      { key: 'total', label: 'إجمالي التكلفة' },
    ]
    const bucketExpression = getDateBucketExpression('po.date', chartGranularity)
    const chartDataRows = db.exec(
      `SELECT ${bucketExpression} AS label,
              SUM(COALESCE(po.material_cost_total, 0)) AS material_value,
              SUM(COALESCE(po.labor_cost, 0)) AS labor_value,
              SUM(COALESCE(po.material_cost_total, 0) + COALESCE(po.labor_cost, 0)) AS total_value
       FROM production_orders po
       ${where}
       GROUP BY ${bucketExpression}
       ORDER BY label ASC`,
      params
    )[0]?.values ?? []

    return {
      reportType,
      summary: [
        { label: 'عدد الأوامر', value: total },
        { label: 'تكلفة المواد', value: totalMaterials },
        { label: 'تكلفة الأجور', value: totalLabor },
        { label: 'إجمالي التكلفة', value: totalCost },
      ],
      rows: rows.map((row) => ({
        orderNumber: row[0] ?? '',
        date: row[1] ?? '',
        productName: row[2] ?? '',
        warehouseName: row[3] ?? '',
        plannedOutputQuantity: normalizeNumber(row[4]),
        actualOutputQuantity: normalizeNumber(row[5]),
        materialCostTotal: normalizeNumber(row[6]),
        laborCost: normalizeNumber(row[7]),
        totalProductionCost: normalizeNumber(row[8]),
        unitProductionCost: normalizeNumber(row[9]),
      })),
      chartSeries,
      chartData: buildChartData(chartDataRows, chartSeries, fromDate, toDate, chartGranularity),
      pagination: buildPagination(total, page, pageSize),
      generatedAt: new Date().toISOString(),
    }
  }

  throw new Error(`Unsupported report type: ${reportType}`)
}

export function getReportExportRows(db, reportType, filters = {}) {
  const options = getBaseReportPayload(reportType, filters)
  const { warehouseId, materialId, fromDate, toDate } = options

  if (reportType === 'stock_balances') {
    const clauses = [...buildMaterialFilterClause()]
    const params = []
    addWhereClause(clauses, params, 'sl.warehouse_id = ?', warehouseId)
    addWhereClause(clauses, params, 'sl.material_id = ?', materialId)
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''

    const rows = db.exec(
      `SELECT sl.warehouse_id, w.name AS warehouse_name, sl.material_id, m.material_number, m.name AS material_name,
              COALESCE(sl.quantity, 0) AS quantity,
              COALESCE(sl.average_cost, 0) AS average_cost,
              COALESCE(sl.quantity, 0) * COALESCE(sl.average_cost, 0) AS stock_value,
              m.unit
       FROM stock_levels sl
       LEFT JOIN warehouses w ON w.id = sl.warehouse_id
       LEFT JOIN materials m ON m.id = sl.material_id
       ${where}
       ORDER BY w.name, m.material_number`,
      params
    )[0]?.values ?? []

    return rows.map((row) => ({
      warehouseId: row[0] ?? '',
      warehouseName: row[1] ?? '',
      materialId: row[2] ?? '',
      materialNumber: row[3] ?? '',
      materialName: row[4] ?? '',
      quantity: normalizeNumber(row[5]),
      averageCost: normalizeNumber(row[6]),
      stockValue: normalizeNumber(row[7]),
      unit: row[8] ?? '',
    }))
  }

  if (reportType === 'inventory_valuation') {
    const clauses = [...buildMaterialFilterClause()]
    const params = []
    addWhereClause(clauses, params, 'sl.warehouse_id = ?', warehouseId)
    addWhereClause(clauses, params, 'sl.material_id = ?', materialId)
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''

    const rows = db.exec(
      `SELECT w.name AS warehouse_name, m.material_number, m.name AS material_name,
              COALESCE(sl.quantity, 0) AS quantity,
              COALESCE(sl.average_cost, 0) AS average_cost,
              COALESCE(sl.quantity, 0) * COALESCE(sl.average_cost, 0) AS stock_value,
              m.unit
       FROM stock_levels sl
       LEFT JOIN warehouses w ON w.id = sl.warehouse_id
       LEFT JOIN materials m ON m.id = sl.material_id
       ${where}
       ORDER BY w.name, m.material_number`,
      params
    )[0]?.values ?? []

    return rows.map((row) => ({
      warehouseName: row[0] ?? '',
      materialNumber: row[1] ?? '',
      materialName: row[2] ?? '',
      quantity: normalizeNumber(row[3]),
      averageCost: normalizeNumber(row[4]),
      stockValue: normalizeNumber(row[5]),
      unit: row[6] ?? '',
    }))
  }

  if (reportType === 'purchases') {
    const clauses = ['pi.status = ?']
    const params = ['completed']
    addWhereClause(clauses, params, 'pi.warehouse_id = ?', warehouseId)
    addWhereClause(clauses, params, 'EXISTS (SELECT 1 FROM purchase_invoice_items pii WHERE pii.invoice_id = pi.id AND pii.material_id = ?)', materialId)
    buildDateRangeClauses(clauses, params, 'pi.date', fromDate, toDate)
    const where = `WHERE ${clauses.join(' AND ')}`

    const rows = db.exec(
      `SELECT pi.id, pi.invoice_number, pi.date, s.name AS supplier_name, w.name AS warehouse_name,
              pi.net_total, COALESCE(pi.expenses, 0) AS expenses,
              COALESCE((SELECT SUM(pp.amount) FROM purchase_payments pp WHERE pp.invoice_id = pi.id), 0) AS paid_amount,
              COALESCE(pi.net_total - (SELECT COALESCE(SUM(pp.amount), 0) FROM purchase_payments pp WHERE pp.invoice_id = pi.id), 0) AS remaining_amount,
              pi.status
       FROM purchase_invoices pi
       LEFT JOIN suppliers s ON s.id = pi.supplier_id
       LEFT JOIN warehouses w ON w.id = pi.warehouse_id
       ${where}
       ORDER BY pi.date DESC, pi.invoice_number DESC`,
      params
    )[0]?.values ?? []

    return rows.map((row) => ({
      id: row[0] ?? '',
      invoiceNumber: row[1] ?? '',
      date: row[2] ?? '',
      supplierName: row[3] ?? '',
      warehouseName: row[4] ?? '',
      netTotal: normalizeNumber(row[5]),
      expenses: normalizeNumber(row[6]),
      paidAmount: normalizeNumber(row[7]),
      remainingAmount: normalizeNumber(row[8]),
      status: row[9] ?? '',
    }))
  }

  if (reportType === 'sales') {
    const clauses = ['si.status = ?']
    const params = ['completed']
    addWhereClause(clauses, params, 'si.warehouse_id = ?', warehouseId)
    addWhereClause(clauses, params, 'EXISTS (SELECT 1 FROM sales_invoice_items sii WHERE sii.invoice_id = si.id AND sii.material_id = ?)', materialId)
    buildDateRangeClauses(clauses, params, 'si.date', fromDate, toDate)
    const where = `WHERE ${clauses.join(' AND ')}`

    const rows = db.exec(
      `SELECT si.id, si.invoice_number, si.date, c.name AS customer_name, w.name AS warehouse_name,
              si.net_total, COALESCE(si.customer_additional_fees, 0) AS customer_additional_fees,
              COALESCE((SELECT SUM(sr.net_total) FROM sales_returns sr WHERE sr.sales_invoice_id = si.id), 0) AS return_total,
              COALESCE((SELECT SUM(sp.amount) FROM sales_payments sp WHERE sp.invoice_id = si.id), 0) AS paid_amount,
              si.status
       FROM sales_invoices si
       LEFT JOIN customers c ON c.id = si.customer_id
       LEFT JOIN warehouses w ON w.id = si.warehouse_id
       ${where}
       ORDER BY si.date DESC, si.invoice_number DESC`,
      params
    )[0]?.values ?? []

    return rows.map((row) => {
      const netTotal = normalizeNumber(row[5])
      const customerAdditionalFees = normalizeNumber(row[6])
      const paidAmount = normalizeNumber(row[8])

      return {
        id: row[0] ?? '',
        invoiceNumber: row[1] ?? '',
        date: row[2] ?? '',
        customerName: row[3] ?? '',
        warehouseName: row[4] ?? '',
        netTotal,
        customerAdditionalFees,
        paidAmount,
        remainingAmount: Math.max(netTotal - paidAmount, 0),
        status: row[9] ?? '',
      }
    })
  }

  if (reportType === 'movements') {
    const clauses = ['d.status = ?']
    const params = ['completed']
    addWhereClause(clauses, params, 'sm.warehouse_id = ?', warehouseId)
    addWhereClause(clauses, params, 'sm.material_id = ?', materialId)
    buildDateRangeClauses(clauses, params, 'd.date', fromDate, toDate)
    const where = `WHERE ${clauses.join(' AND ')}`

    const rows = db.exec(
      `SELECT sm.id, d.reference, d.type, d.date, m.material_number, m.name AS material_name, sm.quantity_in, sm.quantity_out,
              w.name AS warehouse_name, COALESCE(sm.cost, 0) AS cost, m.unit, sm.notes
       FROM stock_movements sm
       LEFT JOIN stock_movement_documents d ON d.reference = sm.document_reference
       LEFT JOIN materials m ON m.id = sm.material_id
       LEFT JOIN warehouses w ON w.id = sm.warehouse_id
       ${where}
       ORDER BY d.date DESC, d.reference DESC`,
      params
    )[0]?.values ?? []

    return rows.map((row) => {
      const quantityIn = normalizeNumber(row[6])
      const quantityOut = normalizeNumber(row[7])
      const cost = normalizeNumber(row[9])
      return {
        movementId: row[0] ?? '',
        reference: row[1] ?? '',
        type: row[2] ?? '',
        date: row[3] ?? '',
        materialNumber: row[4] ?? '',
        materialName: row[5] ?? '',
        warehouseName: row[8] ?? '',
        unit: row[10] ?? '',
        quantityIn,
        quantityOut,
        cost,
        movementValue: normalizeNumber((quantityIn > 0 ? quantityIn : quantityOut) * cost),
        notes: row[11] ?? '',
      }
    })
  }

  if (reportType === 'inventory_adjustments') {
    const clauses = [
      "d.status = 'completed'",
      "d.type = 'adjustment'",
      "sm.type IN ('adjustment_in', 'adjustment_out')",
      "d.reference NOT LIKE 'OPENING-%'",
    ]
    const params = []
    addWhereClause(clauses, params, 'sm.warehouse_id = ?', warehouseId)
    addWhereClause(clauses, params, 'sm.material_id = ?', materialId)
    buildDateRangeClauses(clauses, params, 'd.date', fromDate, toDate)
    const where = `WHERE ${clauses.join(' AND ')}`

    const rows = db.exec(
      `SELECT sm.id, d.reference, d.date, w.name AS warehouse_name,
              m.material_number, m.name AS material_name, COALESCE(sm.unit, m.unit, '') AS unit,
              COALESCE(sm.quantity_in, 0) AS quantity_in,
              COALESCE(sm.quantity_out, 0) AS quantity_out,
              COALESCE(sm.cost, 0) AS cost,
              sm.notes AS line_notes,
              d.notes AS document_notes
       FROM stock_movements sm
       LEFT JOIN stock_movement_documents d ON d.reference = sm.document_reference
       LEFT JOIN materials m ON m.id = sm.material_id
       LEFT JOIN warehouses w ON w.id = sm.warehouse_id
       ${where}
       ORDER BY d.date DESC, d.reference DESC, sm.rowid ASC`,
      params,
    )[0]?.values ?? []

    return rows.map(mapAdjustmentReportRow)
  }

  if (reportType === 'production') {
    const clauses = []
    const params = []
    addWhereClause(clauses, params, 'po.output_warehouse_id = ?', warehouseId)
    addWhereClause(clauses, params, 'po.product_material_id = ?', materialId)
    buildDateRangeClauses(clauses, params, 'po.date', fromDate, toDate)
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''

    const rows = db.exec(
      `SELECT po.id, po.order_number, po.date, m.name AS product_name, w.name AS warehouse_name,
              po.planned_output_quantity, po.actual_output_quantity, po.material_cost_total, po.labor_cost,
              COALESCE(po.material_cost_total, 0) + COALESCE(po.labor_cost, 0) AS total_production_cost,
              CASE
                WHEN COALESCE(po.actual_output_quantity, 0) > 0
                  THEN (COALESCE(po.material_cost_total, 0) + COALESCE(po.labor_cost, 0)) / po.actual_output_quantity
                ELSE 0
              END AS unit_production_cost
       FROM production_orders po
       LEFT JOIN materials m ON m.id = po.product_material_id
       LEFT JOIN warehouses w ON w.id = po.output_warehouse_id
       ${where}
       ORDER BY po.date DESC, po.order_number DESC`,
      params
    )[0]?.values ?? []

    return rows.map((row) => {
      const plannedOutputQuantity = normalizeNumber(row[5])
      const actualOutputQuantity = normalizeNumber(row[6])

      return {
        id: row[0] ?? '',
        orderNumber: row[1] ?? '',
        date: row[2] ?? '',
        productName: row[3] ?? '',
        warehouseName: row[4] ?? '',
        plannedOutputQuantity,
        actualOutputQuantity,
        outputDifference: plannedOutputQuantity - actualOutputQuantity,
        materialCostTotal: normalizeNumber(row[7]),
        laborCost: normalizeNumber(row[8]),
        totalProductionCost: normalizeNumber(row[9]),
        unitProductionCost: normalizeNumber(row[10]),
      }
    })
  }

  if (reportType === 'production_cost') {
    const clauses = []
    const params = []
    addWhereClause(clauses, params, 'po.output_warehouse_id = ?', warehouseId)
    addWhereClause(clauses, params, 'po.product_material_id = ?', materialId)
    buildDateRangeClauses(clauses, params, 'po.date', fromDate, toDate)
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''

    const rows = db.exec(
      `SELECT po.order_number, po.date, m.name AS product_name, w.name AS warehouse_name,
              po.planned_output_quantity, po.actual_output_quantity, po.material_cost_total, po.labor_cost,
              COALESCE(po.material_cost_total, 0) + COALESCE(po.labor_cost, 0) AS total_production_cost,
              CASE
                WHEN COALESCE(po.actual_output_quantity, 0) > 0
                  THEN (COALESCE(po.material_cost_total, 0) + COALESCE(po.labor_cost, 0)) / po.actual_output_quantity
                ELSE 0
              END AS unit_production_cost
       FROM production_orders po
       LEFT JOIN materials m ON m.id = po.product_material_id
       LEFT JOIN warehouses w ON w.id = po.output_warehouse_id
       ${where}
       ORDER BY po.date DESC, po.order_number DESC`,
      params
    )[0]?.values ?? []

    return rows.map((row) => ({
      orderNumber: row[0] ?? '',
      date: row[1] ?? '',
      productName: row[2] ?? '',
      warehouseName: row[3] ?? '',
      plannedOutputQuantity: normalizeNumber(row[4]),
      actualOutputQuantity: normalizeNumber(row[5]),
      materialCostTotal: normalizeNumber(row[6]),
      laborCost: normalizeNumber(row[7]),
      totalProductionCost: normalizeNumber(row[8]),
      unitProductionCost: normalizeNumber(row[9]),
    }))
  }

  throw new Error(`Unsupported report type: ${reportType}`)
}
