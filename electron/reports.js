function normalizeNumber(value) {
  const num = Number(value ?? 0)
  return Number.isFinite(num) ? num : 0
}

function readNumber(db, sql, params = []) {
  const value = db.exec(sql, params)[0]?.values?.[0]?.[0]
  return Number(value ?? 0)
}

function getBaseReportPayload(reportType, filters = {}) {
  const page = Math.max(0, Number(filters.page ?? 0))
  const pageSize = Math.min(1000, Math.max(1, Number(filters.pageSize ?? 10)))

  return {
    reportType,
    page,
    pageSize,
    warehouseId: String(filters.warehouseId ?? '').trim() || null,
    materialId: String(filters.materialId ?? '').trim() || null,
    fromDate: String(filters.fromDate ?? '').trim() || null,
    toDate: String(filters.toDate ?? '').trim() || null,
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
  const { warehouseId, materialId, fromDate, toDate, page, pageSize } = options

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
        { label: 'إجمالي القيمة', value: totalValue, prefix: 'ر.س ' },
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
      chartData: chartDataRows.map((row) => ({ label: String(row[0] ?? ''), value: normalizeNumber(row[1]) })),
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
        { label: 'إجمالي القيمة', value: totalValue, prefix: 'ر.س ' },
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
      chartData: chartDataRows.map((row) => ({ label: String(row[0] ?? ''), value: normalizeNumber(row[1]) })),
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
              pi.net_total,
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

    const chartDataRows = db.exec(
      `SELECT substr(pi.date, 1, 7) AS label, SUM(pi.net_total) AS value
       FROM purchase_invoices pi
       ${where}
       GROUP BY substr(pi.date, 1, 7)
       ORDER BY label ASC`,
      params
    )[0]?.values ?? []

    const summaryNet = readNumber(db, `SELECT COALESCE(SUM(pi.net_total), 0) FROM purchase_invoices pi ${where}`, params)
    const summaryPaid = readNumber(db, `SELECT COALESCE(SUM(COALESCE((SELECT SUM(pp.amount) FROM purchase_payments pp WHERE pp.invoice_id = pi.id), 0)), 0) FROM purchase_invoices pi ${where}`, params)

    return {
      reportType,
      summary: [
        { label: 'عدد الفواتير', value: total },
        { label: 'إجمالي المشتريات', value: summaryNet, prefix: 'ر.س ' },
        { label: 'المبالغ المدفوعة', value: summaryPaid, prefix: 'ر.س ' },
      ],
      rows: rows.map((row) => ({
        id: row[0] ?? '',
        invoiceNumber: row[1] ?? '',
        date: row[2] ?? '',
        supplierName: row[3] ?? '',
        warehouseName: row[4] ?? '',
        netTotal: normalizeNumber(row[5]),
        paidAmount: normalizeNumber(row[6]),
        remainingAmount: normalizeNumber(row[7]),
        status: row[8] ?? '',
      })),
      chartData: chartDataRows.map((row) => ({ label: String(row[0] ?? ''), value: normalizeNumber(row[1]) })),
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
              si.net_total,
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

    const chartDataRows = db.exec(
      `SELECT substr(si.date, 1, 7) AS label, SUM(si.net_total) AS value
       FROM sales_invoices si
       ${where}
       GROUP BY substr(si.date, 1, 7)
       ORDER BY label ASC`,
      params
    )[0]?.values ?? []

    const summaryNet = readNumber(db, `SELECT COALESCE(SUM(si.net_total), 0) FROM sales_invoices si ${where}`, params)
    const summaryPaid = readNumber(db, `SELECT COALESCE(SUM(COALESCE((SELECT SUM(sp.amount) FROM sales_payments sp WHERE sp.invoice_id = si.id), 0)), 0) FROM sales_invoices si ${where}`, params)

    return {
      reportType,
      summary: [
        { label: 'عدد الفواتير', value: total },
        { label: 'إجمالي المبيعات', value: summaryNet, prefix: 'ر.س ' },
        { label: 'المبالغ المستلمة', value: summaryPaid, prefix: 'ر.س ' },
      ],
      rows: rows.map((row) => {
        const netTotal = normalizeNumber(row[5])
        const paidAmount = normalizeNumber(row[7])

        return {
          id: row[0] ?? '',
          invoiceNumber: row[1] ?? '',
          date: row[2] ?? '',
          customerName: row[3] ?? '',
          warehouseName: row[4] ?? '',
          netTotal,
          paidAmount,
          remainingAmount: Math.max(netTotal - paidAmount, 0),
          status: row[8] ?? '',
        }
      }),
      chartData: chartDataRows.map((row) => ({ label: String(row[0] ?? ''), value: normalizeNumber(row[1]) })),
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
    const chartDataRows = db.exec(
      `SELECT substr(d.date, 1, 7) AS label,
              SUM(CASE WHEN COALESCE(sm.quantity_in, 0) > 0 THEN COALESCE(sm.quantity_in, 0) * COALESCE(sm.cost, 0) ELSE COALESCE(sm.quantity_out, 0) * COALESCE(sm.cost, 0) END) AS value
       FROM stock_movements sm
       LEFT JOIN stock_movement_documents d ON d.reference = sm.document_reference
       ${where}
       GROUP BY substr(d.date, 1, 7)
       ORDER BY label ASC`,
      params
    )[0]?.values ?? []

    return {
      reportType,
      summary: [
        { label: 'عدد الحركات', value: total },
        { label: 'قيمة الوارد', value: incomingValue, prefix: 'ر.س ' },
        { label: 'قيمة الصادر', value: outgoingValue, prefix: 'ر.س ' },
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
      chartData: chartDataRows.map((row) => ({ label: String(row[0] ?? ''), value: normalizeNumber(row[1]) })),
      pagination: buildPagination(total, page, pageSize),
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
              po.total_production_cost, po.unit_production_cost
       FROM production_orders po
       LEFT JOIN materials m ON m.id = po.product_material_id
       LEFT JOIN warehouses w ON w.id = po.output_warehouse_id
       ${where}
       ORDER BY po.date DESC, po.order_number DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, page * pageSize]
    )[0]?.values ?? []

    const chartDataRows = db.exec(
      `SELECT substr(po.date, 1, 7) AS label, SUM(po.total_production_cost) AS value
       FROM production_orders po
       ${where}
       GROUP BY substr(po.date, 1, 7)
       ORDER BY label ASC`,
      params
    )[0]?.values ?? []

    return {
      reportType,
      summary: [
        { label: 'عدد الأوامر', value: total },
        { label: 'الإنتاج الفعلي', value: readNumber(db, `SELECT COALESCE(SUM(actual_output_quantity),0) FROM production_orders po ${where}`, params) },
        { label: 'تكلفة الإنتاج', value: readNumber(db, `SELECT COALESCE(SUM(total_production_cost),0) FROM production_orders po ${where}`, params), prefix: 'ر.س ' },
      ],
      rows: rows.map((row) => ({
        id: row[0] ?? '',
        orderNumber: row[1] ?? '',
        date: row[2] ?? '',
        productName: row[3] ?? '',
        warehouseName: row[4] ?? '',
        plannedOutputQuantity: normalizeNumber(row[5]),
        actualOutputQuantity: normalizeNumber(row[6]),
        materialCostTotal: normalizeNumber(row[7]),
        laborCost: normalizeNumber(row[8]),
        totalProductionCost: normalizeNumber(row[9]),
        unitProductionCost: normalizeNumber(row[10]),
      })),
      chartData: chartDataRows.map((row) => ({ label: String(row[0] ?? ''), value: normalizeNumber(row[1]) })),
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
              po.total_production_cost, po.unit_production_cost
       FROM production_orders po
       LEFT JOIN materials m ON m.id = po.product_material_id
       LEFT JOIN warehouses w ON w.id = po.output_warehouse_id
       ${where}
       ORDER BY po.date DESC, po.order_number DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, page * pageSize]
    )[0]?.values ?? []

    const totalCost = readNumber(db, `SELECT COALESCE(SUM(total_production_cost), 0) FROM production_orders po ${where}`, params)
    const totalLabor = readNumber(db, `SELECT COALESCE(SUM(labor_cost), 0) FROM production_orders po ${where}`, params)
    const totalMaterials = readNumber(db, `SELECT COALESCE(SUM(material_cost_total), 0) FROM production_orders po ${where}`, params)
    const chartDataRows = db.exec(
      `SELECT substr(po.date, 1, 7) AS label, SUM(po.total_production_cost) AS value
       FROM production_orders po
       ${where}
       GROUP BY substr(po.date, 1, 7)
       ORDER BY label ASC`,
      params
    )[0]?.values ?? []

    return {
      reportType,
      summary: [
        { label: 'عدد الأوامر', value: total },
        { label: 'تكلفة المواد', value: totalMaterials, prefix: 'ر.س ' },
        { label: 'تكلفة الأجور', value: totalLabor, prefix: 'ر.س ' },
        { label: 'إجمالي التكلفة', value: totalCost, prefix: 'ر.س ' },
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
      chartData: chartDataRows.map((row) => ({ label: String(row[0] ?? ''), value: normalizeNumber(row[1]) })),
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
              pi.net_total,
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
      paidAmount: normalizeNumber(row[6]),
      remainingAmount: normalizeNumber(row[7]),
      status: row[8] ?? '',
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
              si.net_total,
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
      const returnTotal = normalizeNumber(row[6])
      const paidAmount = normalizeNumber(row[7])
      return {
        id: row[0] ?? '',
        invoiceNumber: row[1] ?? '',
        date: row[2] ?? '',
        customerName: row[3] ?? '',
        warehouseName: row[4] ?? '',
        netTotal,
        returnTotal,
        netAfterReturns: Math.max(netTotal - returnTotal, 0),
        paidAmount,
        remainingAmount: Math.max(netTotal - returnTotal - paidAmount, 0),
        status: row[8] ?? '',
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
              po.total_production_cost, po.unit_production_cost
       FROM production_orders po
       LEFT JOIN materials m ON m.id = po.product_material_id
       LEFT JOIN warehouses w ON w.id = po.output_warehouse_id
       ${where}
       ORDER BY po.date DESC, po.order_number DESC`,
      params
    )[0]?.values ?? []

    return rows.map((row) => ({
      id: row[0] ?? '',
      orderNumber: row[1] ?? '',
      date: row[2] ?? '',
      productName: row[3] ?? '',
      warehouseName: row[4] ?? '',
      plannedOutputQuantity: normalizeNumber(row[5]),
      actualOutputQuantity: normalizeNumber(row[6]),
      materialCostTotal: normalizeNumber(row[7]),
      laborCost: normalizeNumber(row[8]),
      totalProductionCost: normalizeNumber(row[9]),
      unitProductionCost: normalizeNumber(row[10]),
    }))
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
              po.total_production_cost, po.unit_production_cost
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
