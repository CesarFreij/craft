import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { app } from 'electron'
import initSqlJs from 'sql.js'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const sqlWasmModulePath = require.resolve('sql.js/dist/sql-wasm.wasm')
const sqlWasmDir = path.dirname(sqlWasmModulePath)

let SQL = null
let dbInstance = null
let dbDir = null
let dbFile = null

function ensureInvoiceFeeColumns(db) {
  const ensureColumns = (tableName, columns) => {
    const existingColumns = db.exec(`PRAGMA table_info(${tableName})`)[0]?.values ?? []
    const existingNames = new Set(existingColumns.map((column) => String(column[1])))

    for (const column of columns) {
      if (!existingNames.has(column.name)) {
        db.run(`ALTER TABLE ${tableName} ADD COLUMN ${column.name} ${column.definition}`)
      }
    }
  }

  ensureColumns('purchase_invoices', [
    { name: 'expenses', definition: 'REAL NOT NULL DEFAULT 0' },
  ])
  ensureColumns('sales_invoices', [
    { name: 'customer_additional_fees', definition: 'REAL NOT NULL DEFAULT 0' },
  ])
}

export async function initDatabase() {
  console.log('DATABASE INIT: START')

  if (SQL && dbInstance) {
    console.log('DATABASE INIT: already initialized')
    return { dbFile }
  }

  try {
    const appName = app.getName()
    const userData = app.getPath('userData')
    console.log('DATABASE INIT: APP NAME =', appName)
    console.log('DATABASE INIT: USER DATA PATH =', userData)

    console.log('DATABASE INIT: DB DIRECTORY =', path.join(userData, 'craft-data'))
    dbDir = path.join(userData, 'craft-data')
    dbFile = path.join(dbDir, 'materials.sqlite')
    console.log('DATABASE INIT: DB FILE =', dbFile)

    // create directory and test write
    fs.mkdirSync(dbDir, { recursive: true })
    console.log('DATABASE INIT: DIRECTORY CREATED')

    const testFile = path.join(dbDir, 'database-write-test.tmp')
    try {
      fs.writeFileSync(testFile, 'write-test')
      console.log('DATABASE INIT: WRITE TEST START')
      const existsTest = fs.existsSync(testFile)
      const sizeTest = existsTest ? fs.statSync(testFile).size : 0
      console.log('DATABASE INIT: WRITE TEST FILE EXISTS =', existsTest)
      console.log('DATABASE INIT: WRITE TEST FILE SIZE =', sizeTest)
      fs.unlinkSync(testFile)
    } catch (err) {
      console.error('DATABASE INIT: FAILED WRITE TEST', err)
      console.error('DATABASE INIT: FAILED')
      throw err
    }

    console.log('DATABASE INIT: SQL.JS LOADING')
    SQL = await initSqlJs({
      locateFile: (file) => {
        const p = path.join(sqlWasmDir, file)
        console.log('DATABASE INIT: locateFile ->', p)
        try {
          console.log('DATABASE INIT: wasm exists =', fs.existsSync(p))
        } catch (e) {
          console.log('DATABASE INIT: wasm exists check failed', e)
        }
        return p
      },
    })
    console.log('DATABASE INIT: SQL.JS LOADED')

    // open or create DB
    try {
      const fileExists = fs.existsSync(dbFile)
      const fileSize = fileExists ? fs.statSync(dbFile).size : 0

      if (!fileExists || fileSize === 0) {
        console.log('DATABASE INIT: DATABASE OBJECT CREATED (new)')
        dbInstance = new SQL.Database()
        console.log('DATABASE INIT: SCHEMA START')
        initializeSchema(dbInstance)
        ensureInvoiceFeeColumns(dbInstance)
        console.log('DATABASE INIT: SCHEMA COMPLETE')

        console.log('DATABASE INIT: EXPORT START')
        const bytes = dbInstance.export()
        console.log('DATABASE INIT: EXPORT COMPLETE')

        console.log('DATABASE INIT: WRITE START')
        fs.writeFileSync(dbFile, Buffer.from(bytes))
        console.log('DATABASE INIT: WRITE COMPLETE')
      } else {
        console.log('DATABASE INIT: DATABASE OBJECT CREATED (from file)')
        const binary = fs.readFileSync(dbFile)
        dbInstance = new SQL.Database(binary)
        console.log('DATABASE INIT: SCHEMA START')
        initializeSchema(dbInstance)
        ensureInvoiceFeeColumns(dbInstance)
        console.log('DATABASE INIT: SCHEMA COMPLETE')

        // persist any schema changes back to disk
        try {
          console.log('DATABASE INIT: EXPORT START (persist existing)')
          const bytes = dbInstance.export()
          console.log('DATABASE INIT: EXPORT COMPLETE (persist existing)')
          console.log('DATABASE INIT: WRITE START (persist existing)')
          fs.writeFileSync(dbFile, Buffer.from(bytes))
          console.log('DATABASE INIT: WRITE COMPLETE (persist existing)')
        } catch (e) {
          console.error('DATABASE INIT: WARNING - failed to persist existing DB after schema init', e)
        }
      }

      const exists = fs.existsSync(dbFile)
      const size = exists ? fs.statSync(dbFile).size : 0
      console.log('DATABASE INIT: FILE EXISTS =', exists)
      console.log('DATABASE INIT: FILE SIZE =', size)

      console.log('DATABASE INIT: SUCCESS')
      return { dbFile }
    } catch (err) {
      console.error('DATABASE INIT: FAILED during DB open/create', err)
      console.error('DATABASE INIT: FAILED')
      throw err
    }
  } catch (err) {
    console.error('DATABASE INIT: FAILED', err)
    throw err
  }
}

export function getDatabase() {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase() from main before using repository functions.')
  }
  return dbInstance
}

export function resetDatabaseConnection() {
  dbInstance = null
  SQL = null
}

export function getDatabaseFilePath() {
  return dbFile
}

export async function createDatabaseBackup(targetDirectory) {
  await initDatabase()

  if (!dbFile || !fs.existsSync(dbFile)) {
    throw new Error('لا يوجد ملف قاعدة بيانات لعمل نسخة احتياطية.')
  }

  const backupDirectory = targetDirectory && targetDirectory.trim().length > 0 ? targetDirectory : path.dirname(dbFile)
  fs.mkdirSync(backupDirectory, { recursive: true })

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = path.join(backupDirectory, `craft-backup-${timestamp}.sqlite`)
  fs.copyFileSync(dbFile, backupPath)

  return { filePath: backupPath, fileName: path.basename(backupPath) }
}

export async function restoreDatabaseFromBackup(backupFilePath) {
  if (!backupFilePath || !backupFilePath.trim()) {
    throw new Error('لم يتم اختيار ملف النسخة الاحتياطية.')
  }

  if (!fs.existsSync(backupFilePath)) {
    throw new Error('ملف النسخة الاحتياطية غير موجود.')
  }

  await initDatabase()

  if (!dbFile) {
    throw new Error('مسار قاعدة البيانات غير موجود.')
  }

  fs.copyFileSync(backupFilePath, dbFile)
  resetDatabaseConnection()
  await initDatabase()

  return { dbFile }
}

export async function resetDatabase({ confirmationText } = {}) {
  if (typeof confirmationText !== 'string' || confirmationText.trim() !== 'RESET DATABASE') {
    throw new Error('تأكيد إعادة تعيين قاعدة البيانات غير صحيح.')
  }

  await initDatabase()

  if (dbFile && fs.existsSync(dbFile)) {
    fs.unlinkSync(dbFile)
  }

  resetDatabaseConnection()
  await initDatabase()

  return { dbFile }
}

function initializeSchema(db) {
  const ensureColumns = (tableName, columns) => {
    const existingColumns = db.exec(`PRAGMA table_info(${tableName})`)[0]?.values ?? []
    const existingNames = new Set(existingColumns.map((column) => String(column[1])))

    for (const column of columns) {
      if (!existingNames.has(column.name)) {
        db.run(`ALTER TABLE ${tableName} ADD COLUMN ${column.definition}`)
      }
    }
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS materials (
      id TEXT PRIMARY KEY,
      material_number TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      -- optional opening metadata (may be added by migration)
      opening_balance REAL,
      opening_warehouse_id TEXT,
      type TEXT NOT NULL CHECK(type IN ('main', 'sub')),
      parent_id TEXT,
      returnability TEXT,
      unit TEXT,
      cost_price TEXT,
      price1 TEXT,
      price2 TEXT,
      price3 TEXT,
      notes TEXT,
      is_non_stock INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(parent_id) REFERENCES materials(id)
    );

    CREATE INDEX IF NOT EXISTS idx_materials_parent_id
      ON materials(parent_id);

    CREATE INDEX IF NOT EXISTS idx_materials_status
      ON materials(status);

    CREATE INDEX IF NOT EXISTS idx_materials_type
      ON materials(type);

    CREATE INDEX IF NOT EXISTS idx_materials_name
      ON materials(name);

    CREATE INDEX IF NOT EXISTS idx_materials_number
      ON materials(material_number);

    CREATE TABLE IF NOT EXISTS manufacturing_recipes (
      id TEXT PRIMARY KEY,
      recipe_number TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      product_material_id TEXT NOT NULL,
      standard_output_quantity REAL NOT NULL CHECK(standard_output_quantity > 0),
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(product_material_id) REFERENCES materials(id)
    );

    CREATE INDEX IF NOT EXISTS idx_manufacturing_recipes_number
      ON manufacturing_recipes(recipe_number);

    CREATE INDEX IF NOT EXISTS idx_manufacturing_recipes_product
      ON manufacturing_recipes(product_material_id);

    CREATE TABLE IF NOT EXISTS manufacturing_recipe_items (
      id TEXT PRIMARY KEY,
      recipe_id TEXT NOT NULL,
      material_id TEXT NOT NULL,
      quantity REAL NOT NULL CHECK(quantity > 0),
      unit TEXT,
      notes TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(recipe_id) REFERENCES manufacturing_recipes(id) ON DELETE CASCADE,
      FOREIGN KEY(material_id) REFERENCES materials(id)
    );

    CREATE INDEX IF NOT EXISTS idx_manufacturing_recipe_items_recipe
      ON manufacturing_recipe_items(recipe_id);

    CREATE INDEX IF NOT EXISTS idx_manufacturing_recipe_items_material
      ON manufacturing_recipe_items(material_id);

    CREATE TABLE IF NOT EXISTS production_orders (
      id TEXT PRIMARY KEY,
      order_number TEXT NOT NULL UNIQUE,
      date TEXT NOT NULL,
      recipe_id TEXT NOT NULL,
      product_material_id TEXT NOT NULL,
      output_warehouse_id TEXT NOT NULL,
      planned_output_quantity REAL NOT NULL CHECK(planned_output_quantity > 0),
      actual_output_quantity REAL NOT NULL CHECK(actual_output_quantity > 0),
      labor_cost REAL NOT NULL DEFAULT 0,
      material_cost_total REAL NOT NULL DEFAULT 0,
      total_production_cost REAL NOT NULL DEFAULT 0,
      unit_production_cost REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(recipe_id) REFERENCES manufacturing_recipes(id),
      FOREIGN KEY(product_material_id) REFERENCES materials(id),
      FOREIGN KEY(output_warehouse_id) REFERENCES warehouses(id)
    );

    CREATE INDEX IF NOT EXISTS idx_production_orders_number
      ON production_orders(order_number);

    CREATE INDEX IF NOT EXISTS idx_production_orders_recipe
      ON production_orders(recipe_id);

    CREATE TABLE IF NOT EXISTS production_order_inputs (
      id TEXT PRIMARY KEY,
      production_order_id TEXT NOT NULL,
      recipe_item_id TEXT,
      material_id TEXT NOT NULL,
      warehouse_id TEXT NOT NULL,
      unit TEXT,
      planned_quantity REAL NOT NULL DEFAULT 0,
      actual_quantity REAL NOT NULL DEFAULT 0,
      unit_cost REAL NOT NULL DEFAULT 0,
      total_cost REAL NOT NULL DEFAULT 0,
      notes TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(production_order_id) REFERENCES production_orders(id) ON DELETE CASCADE,
      FOREIGN KEY(recipe_item_id) REFERENCES manufacturing_recipe_items(id),
      FOREIGN KEY(material_id) REFERENCES materials(id),
      FOREIGN KEY(warehouse_id) REFERENCES warehouses(id)
    );

    CREATE INDEX IF NOT EXISTS idx_production_order_inputs_order
      ON production_order_inputs(production_order_id);

    CREATE TABLE IF NOT EXISTS production_order_outputs (
      id TEXT PRIMARY KEY,
      production_order_id TEXT NOT NULL,
      material_id TEXT NOT NULL,
      warehouse_id TEXT NOT NULL,
      unit TEXT,
      quantity REAL NOT NULL DEFAULT 0,
      unit_cost REAL NOT NULL DEFAULT 0,
      total_cost REAL NOT NULL DEFAULT 0,
      FOREIGN KEY(production_order_id) REFERENCES production_orders(id) ON DELETE CASCADE,
      FOREIGN KEY(material_id) REFERENCES materials(id),
      FOREIGN KEY(warehouse_id) REFERENCES warehouses(id)
    );

    CREATE INDEX IF NOT EXISTS idx_production_order_outputs_order
      ON production_order_outputs(production_order_id);
  `)

  // Idempotent migration: ensure opening columns exist for older DBs
  try {
    const cols = db.exec(`PRAGMA table_info(materials)`)[0]?.values ?? []
    const colNames = cols.map(c => c[1])
    if (!colNames.includes('opening_balance')) {
      db.run(`ALTER TABLE materials ADD COLUMN opening_balance REAL`)
    }
    if (!colNames.includes('opening_warehouse_id')) {
      db.run(`ALTER TABLE materials ADD COLUMN opening_warehouse_id TEXT`)
    }
  } catch (e) {
    console.warn('Schema migration check for opening columns failed or skipped', e)
  }

  try {
    const cols = db.exec(`PRAGMA table_info(production_orders)`)[0]?.values ?? []
    const colNames = cols.map(c => c[1])
    if (!colNames.includes('labor_cost')) {
      db.run(`ALTER TABLE production_orders ADD COLUMN labor_cost REAL NOT NULL DEFAULT 0`)
    }
    db.run(`UPDATE production_orders SET labor_cost = 0 WHERE labor_cost IS NULL`)
  } catch (e) {
    console.warn('Schema migration check for production_orders labor_cost failed or skipped', e)
  }
  
  // Additional inventory schema: warehouses, stock_movements, stock_levels
  db.exec(`
    CREATE TABLE IF NOT EXISTS warehouses (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      location TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stock_movement_documents (
      id TEXT PRIMARY KEY,
      reference TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL CHECK(type IN ('purchase','sale','purchase_return','sale_return','production','transfer','adjustment')),
      date TEXT NOT NULL,
      from_warehouse_id TEXT,
      to_warehouse_id TEXT,
      notes TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('pending','completed','cancelled')),
      FOREIGN KEY(from_warehouse_id) REFERENCES warehouses(id),
      FOREIGN KEY(to_warehouse_id) REFERENCES warehouses(id)
    );

    CREATE INDEX IF NOT EXISTS idx_stock_movement_documents_reference ON stock_movement_documents(reference);
    CREATE INDEX IF NOT EXISTS idx_stock_movement_documents_type ON stock_movement_documents(type);
    CREATE INDEX IF NOT EXISTS idx_stock_movement_documents_date ON stock_movement_documents(date);

    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      document_reference TEXT,
      type TEXT NOT NULL CHECK(type IN ('purchase','sale','purchase_return','sale_return','production_in','production_out','transfer_in','transfer_out','adjustment_in','adjustment_out')),
      reference TEXT,
      warehouse_id TEXT NOT NULL,
      material_id TEXT NOT NULL,
      quantity_in REAL NOT NULL DEFAULT 0,
      quantity_out REAL NOT NULL DEFAULT 0,
      unit TEXT,
      cost REAL,
      notes TEXT,
      created_at TEXT NOT NULL,
      created_by TEXT,
      FOREIGN KEY(document_reference) REFERENCES stock_movement_documents(reference),
      FOREIGN KEY(warehouse_id) REFERENCES warehouses(id),
      FOREIGN KEY(material_id) REFERENCES materials(id)
    );

    CREATE INDEX IF NOT EXISTS idx_stock_movements_material ON stock_movements(material_id);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_document_reference ON stock_movements(document_reference);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_warehouse ON stock_movements(warehouse_id);

    CREATE TABLE IF NOT EXISTS stock_levels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      warehouse_id TEXT NOT NULL,
      material_id TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 0,
      average_cost REAL NOT NULL DEFAULT 0,
      reserved REAL NOT NULL DEFAULT 0,
      last_updated_at TEXT NOT NULL,
      UNIQUE(warehouse_id, material_id),
      FOREIGN KEY(warehouse_id) REFERENCES warehouses(id),
      FOREIGN KEY(material_id) REFERENCES materials(id)
    );

    CREATE INDEX IF NOT EXISTS idx_stock_levels_wh_mat ON stock_levels(warehouse_id, material_id);

    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(code);
    CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
    CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);

    CREATE TABLE IF NOT EXISTS purchase_invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT NOT NULL UNIQUE,
      supplier_invoice_number TEXT,
      date TEXT NOT NULL,
      supplier_id TEXT NOT NULL,
      warehouse_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','completed','cancelled')),
      subtotal REAL NOT NULL DEFAULT 0,
      discount_type TEXT NOT NULL DEFAULT 'none' CHECK(discount_type IN ('none','percentage','fixed')),
      discount_value REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      net_total REAL NOT NULL DEFAULT 0,
      expenses REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY(warehouse_id) REFERENCES warehouses(id)
    );

    CREATE INDEX IF NOT EXISTS idx_purchase_invoices_number ON purchase_invoices(invoice_number);
    CREATE INDEX IF NOT EXISTS idx_purchase_invoices_date ON purchase_invoices(date);
    CREATE INDEX IF NOT EXISTS idx_purchase_invoices_status ON purchase_invoices(status);
    CREATE INDEX IF NOT EXISTS idx_purchase_invoices_supplier ON purchase_invoices(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_purchase_invoices_warehouse ON purchase_invoices(warehouse_id);

    CREATE TABLE IF NOT EXISTS purchase_invoice_items (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      material_id TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT,
      unit_price REAL NOT NULL DEFAULT 0,
      line_total REAL NOT NULL DEFAULT 0,
      notes TEXT,
      FOREIGN KEY(invoice_id) REFERENCES purchase_invoices(id),
      FOREIGN KEY(material_id) REFERENCES materials(id)
    );

    CREATE INDEX IF NOT EXISTS idx_purchase_invoice_items_invoice ON purchase_invoice_items(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_purchase_invoice_items_material ON purchase_invoice_items(material_id);

    CREATE TABLE IF NOT EXISTS purchase_payments (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(invoice_id) REFERENCES purchase_invoices(id)
    );

    CREATE INDEX IF NOT EXISTS idx_purchase_payments_invoice ON purchase_payments(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_purchase_payments_date ON purchase_payments(date);

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      notes TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(code);
    CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
    CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(is_active);

    CREATE TABLE IF NOT EXISTS sales_invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT NOT NULL UNIQUE,
      date TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      warehouse_id TEXT NOT NULL,
      subtotal REAL NOT NULL DEFAULT 0,
      discount_type TEXT NOT NULL DEFAULT 'none' CHECK(discount_type IN ('none','percentage','fixed')),
      discount_value REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      net_total REAL NOT NULL DEFAULT 0,
      customer_additional_fees REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','completed','cancelled')),
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT,
      cancelled_at TEXT,
      FOREIGN KEY(customer_id) REFERENCES customers(id),
      FOREIGN KEY(warehouse_id) REFERENCES warehouses(id)
    );

    CREATE INDEX IF NOT EXISTS idx_sales_invoices_number ON sales_invoices(invoice_number);
    CREATE INDEX IF NOT EXISTS idx_sales_invoices_date ON sales_invoices(date);
    CREATE INDEX IF NOT EXISTS idx_sales_invoices_status ON sales_invoices(status);
    CREATE INDEX IF NOT EXISTS idx_sales_invoices_customer ON sales_invoices(customer_id);
    CREATE INDEX IF NOT EXISTS idx_sales_invoices_warehouse ON sales_invoices(warehouse_id);

    CREATE TABLE IF NOT EXISTS sales_invoice_items (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      material_id TEXT NOT NULL,
      unit TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL DEFAULT 0,
      line_total REAL NOT NULL DEFAULT 0,
      notes TEXT,
      FOREIGN KEY(invoice_id) REFERENCES sales_invoices(id),
      FOREIGN KEY(material_id) REFERENCES materials(id)
    );

    CREATE INDEX IF NOT EXISTS idx_sales_invoice_items_invoice ON sales_invoice_items(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_sales_invoice_items_material ON sales_invoice_items(material_id);

    CREATE TABLE IF NOT EXISTS sales_payments (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(invoice_id) REFERENCES sales_invoices(id)
    );

    CREATE INDEX IF NOT EXISTS idx_sales_payments_invoice ON sales_payments(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_sales_payments_date ON sales_payments(date);

    CREATE TABLE IF NOT EXISTS purchase_returns (
      id TEXT PRIMARY KEY,
      return_number TEXT NOT NULL UNIQUE,
      date TEXT NOT NULL,
      supplier_id TEXT NOT NULL,
      warehouse_id TEXT NOT NULL,
      purchase_invoice_id TEXT NOT NULL,
      original_invoice_number TEXT,
      notes TEXT,
      subtotal REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      net_total REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY(warehouse_id) REFERENCES warehouses(id),
      FOREIGN KEY(purchase_invoice_id) REFERENCES purchase_invoices(id)
    );

    CREATE TABLE IF NOT EXISTS purchase_return_items (
      id TEXT PRIMARY KEY,
      return_id TEXT NOT NULL,
      material_id TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT,
      unit_price REAL NOT NULL DEFAULT 0,
      line_total REAL NOT NULL DEFAULT 0,
      notes TEXT,
      FOREIGN KEY(return_id) REFERENCES purchase_returns(id),
      FOREIGN KEY(material_id) REFERENCES materials(id)
    );

    CREATE TABLE IF NOT EXISTS sales_returns (
      id TEXT PRIMARY KEY,
      return_number TEXT NOT NULL UNIQUE,
      date TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      warehouse_id TEXT NOT NULL,
      sales_invoice_id TEXT NOT NULL,
      original_invoice_number TEXT,
      notes TEXT,
      subtotal REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      net_total REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(customer_id) REFERENCES customers(id),
      FOREIGN KEY(warehouse_id) REFERENCES warehouses(id),
      FOREIGN KEY(sales_invoice_id) REFERENCES sales_invoices(id)
    );

    CREATE TABLE IF NOT EXISTS sales_return_items (
      id TEXT PRIMARY KEY,
      return_id TEXT NOT NULL,
      material_id TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT,
      unit_price REAL NOT NULL DEFAULT 0,
      line_total REAL NOT NULL DEFAULT 0,
      notes TEXT,
      FOREIGN KEY(return_id) REFERENCES sales_returns(id),
      FOREIGN KEY(material_id) REFERENCES materials(id)
    );
  `)

  // Idempotent migrations for older databases where stock and purchase tables were created with fewer columns.
  try {
    ensureColumns('stock_movement_documents', [
      { name: 'reference', definition: 'reference TEXT' },
      { name: 'type', definition: "type TEXT NOT NULL DEFAULT 'adjustment'" },
      { name: 'date', definition: "date TEXT NOT NULL DEFAULT ''" },
      { name: 'from_warehouse_id', definition: 'from_warehouse_id TEXT' },
      { name: 'to_warehouse_id', definition: 'to_warehouse_id TEXT' },
      { name: 'notes', definition: 'notes TEXT' },
      { name: 'created_by', definition: 'created_by TEXT' },
      { name: 'created_at', definition: 'created_at TEXT' },
      { name: 'status', definition: "status TEXT NOT NULL DEFAULT 'completed'" },
    ])

    ensureColumns('stock_movements', [
      { name: 'document_reference', definition: 'document_reference TEXT' },
      { name: 'type', definition: "type TEXT NOT NULL DEFAULT 'adjustment_in'" },
      { name: 'reference', definition: 'reference TEXT' },
      { name: 'warehouse_id', definition: "warehouse_id TEXT NOT NULL DEFAULT ''" },
      { name: 'material_id', definition: "material_id TEXT NOT NULL DEFAULT ''" },
      { name: 'quantity_in', definition: 'quantity_in REAL NOT NULL DEFAULT 0' },
      { name: 'quantity_out', definition: 'quantity_out REAL NOT NULL DEFAULT 0' },
      { name: 'unit', definition: 'unit TEXT' },
      { name: 'cost', definition: 'cost REAL' },
      { name: 'notes', definition: 'notes TEXT' },
      { name: 'created_at', definition: 'created_at TEXT' },
      { name: 'created_by', definition: 'created_by TEXT' },
    ])

    const stockLevelsColumnsBefore = new Set((db.exec(`PRAGMA table_info(stock_levels)`)[0]?.values ?? []).map((column) => String(column[1])))
    const needsAverageCostBackfill = !stockLevelsColumnsBefore.has('average_cost')

    ensureColumns('stock_levels', [
      { name: 'warehouse_id', definition: "warehouse_id TEXT NOT NULL DEFAULT ''" },
      { name: 'material_id', definition: "material_id TEXT NOT NULL DEFAULT ''" },
      { name: 'quantity', definition: 'quantity REAL NOT NULL DEFAULT 0' },
      { name: 'average_cost', definition: 'average_cost REAL NOT NULL DEFAULT 0' },
      { name: 'reserved', definition: 'reserved REAL NOT NULL DEFAULT 0' },
      { name: 'last_updated_at', definition: 'last_updated_at TEXT' },
    ])

    // one-time backfill: compute average cost for existing balances from the movement ledger
    if (needsAverageCostBackfill) {
      const pairs = db.exec(`SELECT warehouse_id, material_id FROM stock_levels`)[0]?.values ?? []
      for (const [warehouseId, materialId] of pairs) {
        recalculateStockLevel(db, warehouseId, materialId)
      }
    }

    ensureColumns('suppliers', [
      { name: 'code', definition: "code TEXT NOT NULL DEFAULT ''" },
      { name: 'name', definition: "name TEXT NOT NULL DEFAULT ''" },
      { name: 'phone', definition: 'phone TEXT' },
      { name: 'address', definition: 'address TEXT' },
      { name: 'notes', definition: 'notes TEXT' },
      { name: 'status', definition: "status TEXT NOT NULL DEFAULT 'active'" },
      { name: 'created_at', definition: 'created_at TEXT' },
      { name: 'updated_at', definition: 'updated_at TEXT' },
    ])

    ensureColumns('purchase_invoices', [
      { name: 'invoice_number', definition: "invoice_number TEXT NOT NULL DEFAULT ''" },
      { name: 'supplier_invoice_number', definition: 'supplier_invoice_number TEXT' },
      { name: 'date', definition: "date TEXT NOT NULL DEFAULT ''" },
      { name: 'supplier_id', definition: "supplier_id TEXT NOT NULL DEFAULT ''" },
      { name: 'warehouse_id', definition: "warehouse_id TEXT NOT NULL DEFAULT ''" },
      { name: 'status', definition: "status TEXT NOT NULL DEFAULT 'draft'" },
      { name: 'subtotal', definition: 'subtotal REAL NOT NULL DEFAULT 0' },
      { name: 'discount_type', definition: "discount_type TEXT NOT NULL DEFAULT 'none'" },
      { name: 'discount_value', definition: 'discount_value REAL NOT NULL DEFAULT 0' },
      { name: 'discount_amount', definition: 'discount_amount REAL NOT NULL DEFAULT 0' },
      { name: 'net_total', definition: 'net_total REAL NOT NULL DEFAULT 0' },
      { name: 'expenses', definition: 'expenses REAL NOT NULL DEFAULT 0' },
      { name: 'notes', definition: 'notes TEXT' },
      { name: 'created_at', definition: 'created_at TEXT' },
      { name: 'updated_at', definition: 'updated_at TEXT' },
    ])

    ensureColumns('purchase_returns', [
      { name: 'original_invoice_number', definition: 'original_invoice_number TEXT' },
    ])

    ensureColumns('sales_returns', [
      { name: 'original_invoice_number', definition: 'original_invoice_number TEXT' },
    ])

    const purchaseReturnsToBackfill = db.exec(`SELECT id, purchase_invoice_id FROM purchase_returns WHERE original_invoice_number IS NULL OR original_invoice_number = ''`)[0]?.values ?? []
    for (const [returnId, purchaseInvoiceId] of purchaseReturnsToBackfill) {
      if (!returnId || !purchaseInvoiceId) continue
      const invoiceNumberRow = db.exec(`SELECT invoice_number FROM purchase_invoices WHERE id = ?`, [purchaseInvoiceId])[0]?.values?.[0]?.[0]
      if (invoiceNumberRow) {
        db.run(`UPDATE purchase_returns SET original_invoice_number = ? WHERE id = ?`, [String(invoiceNumberRow).trim(), returnId])
      }
    }

    const salesReturnsToBackfill = db.exec(`SELECT id, sales_invoice_id FROM sales_returns WHERE original_invoice_number IS NULL OR original_invoice_number = ''`)[0]?.values ?? []
    for (const [returnId, salesInvoiceId] of salesReturnsToBackfill) {
      if (!returnId || !salesInvoiceId) continue
      const invoiceNumberRow = db.exec(`SELECT invoice_number FROM sales_invoices WHERE id = ?`, [salesInvoiceId])[0]?.values?.[0]?.[0]
      if (invoiceNumberRow) {
        db.run(`UPDATE sales_returns SET original_invoice_number = ? WHERE id = ?`, [String(invoiceNumberRow).trim(), returnId])
      }
    }

    ensureColumns('purchase_invoice_items', [
      { name: 'invoice_id', definition: "invoice_id TEXT NOT NULL DEFAULT ''" },
      { name: 'material_id', definition: "material_id TEXT NOT NULL DEFAULT ''" },
      { name: 'quantity', definition: 'quantity REAL NOT NULL DEFAULT 0' },
      { name: 'unit', definition: 'unit TEXT' },
      { name: 'unit_price', definition: 'unit_price REAL NOT NULL DEFAULT 0' },
      { name: 'line_total', definition: 'line_total REAL NOT NULL DEFAULT 0' },
      { name: 'notes', definition: 'notes TEXT' },
    ])

    ensureColumns('purchase_payments', [
      { name: 'invoice_id', definition: "invoice_id TEXT NOT NULL DEFAULT ''" },
      { name: 'date', definition: "date TEXT NOT NULL DEFAULT ''" },
      { name: 'amount', definition: 'amount REAL NOT NULL DEFAULT 0' },
      { name: 'notes', definition: 'notes TEXT' },
      { name: 'payment_method', definition: "payment_method TEXT NOT NULL DEFAULT ''" },
      { name: 'created_at', definition: "created_at TEXT NOT NULL DEFAULT ''" },
    ])

    ensureColumns('customers', [
      { name: 'code', definition: "code TEXT NOT NULL DEFAULT ''" },
      { name: 'name', definition: "name TEXT NOT NULL DEFAULT ''" },
      { name: 'phone', definition: 'phone TEXT' },
      { name: 'address', definition: 'address TEXT' },
      { name: 'notes', definition: 'notes TEXT' },
      { name: 'is_active', definition: 'is_active INTEGER NOT NULL DEFAULT 1' },
      { name: 'created_at', definition: "created_at TEXT NOT NULL DEFAULT ''" },
      { name: 'updated_at', definition: "updated_at TEXT NOT NULL DEFAULT ''" },
    ])

    ensureColumns('sales_invoices', [
      { name: 'invoice_number', definition: "invoice_number TEXT NOT NULL DEFAULT ''" },
      { name: 'date', definition: "date TEXT NOT NULL DEFAULT ''" },
      { name: 'customer_id', definition: "customer_id TEXT NOT NULL DEFAULT ''" },
      { name: 'warehouse_id', definition: "warehouse_id TEXT NOT NULL DEFAULT ''" },
      { name: 'subtotal', definition: 'subtotal REAL NOT NULL DEFAULT 0' },
      { name: 'discount_type', definition: "discount_type TEXT NOT NULL DEFAULT 'none'" },
      { name: 'discount_value', definition: 'discount_value REAL NOT NULL DEFAULT 0' },
      { name: 'discount_amount', definition: 'discount_amount REAL NOT NULL DEFAULT 0' },
      { name: 'net_total', definition: 'net_total REAL NOT NULL DEFAULT 0' },
      { name: 'customer_additional_fees', definition: 'customer_additional_fees REAL NOT NULL DEFAULT 0' },
      { name: 'status', definition: "status TEXT NOT NULL DEFAULT 'draft'" },
      { name: 'notes', definition: 'notes TEXT' },
      { name: 'created_at', definition: "created_at TEXT NOT NULL DEFAULT ''" },
      { name: 'updated_at', definition: "updated_at TEXT NOT NULL DEFAULT ''" },
      { name: 'completed_at', definition: 'completed_at TEXT' },
      { name: 'cancelled_at', definition: 'cancelled_at TEXT' },
    ])

    ensureColumns('sales_invoice_items', [
      { name: 'invoice_id', definition: "invoice_id TEXT NOT NULL DEFAULT ''" },
      { name: 'material_id', definition: "material_id TEXT NOT NULL DEFAULT ''" },
      { name: 'unit', definition: "unit TEXT NOT NULL DEFAULT ''" },
      { name: 'quantity', definition: 'quantity REAL NOT NULL DEFAULT 0' },
      { name: 'unit_price', definition: 'unit_price REAL NOT NULL DEFAULT 0' },
      { name: 'line_total', definition: 'line_total REAL NOT NULL DEFAULT 0' },
      { name: 'notes', definition: 'notes TEXT' },
    ])

    ensureColumns('sales_payments', [
      { name: 'invoice_id', definition: "invoice_id TEXT NOT NULL DEFAULT ''" },
      { name: 'date', definition: "date TEXT NOT NULL DEFAULT ''" },
      { name: 'amount', definition: 'amount REAL NOT NULL DEFAULT 0' },
      { name: 'notes', definition: 'notes TEXT' },
      { name: 'payment_method', definition: "payment_method TEXT NOT NULL DEFAULT ''" },
      { name: 'created_at', definition: "created_at TEXT NOT NULL DEFAULT ''" },
    ])
  } catch (error) {
    console.error('STOCK/PURCHASE MIGRATION FAILED', error)
    throw error
  }
}

// Warehouses CRUD
export function listWarehouses() {
  const db = getDatabase()
  const rows = db.exec(`SELECT id, code, name, location, notes, status, created_at, updated_at FROM warehouses ORDER BY created_at`)[0]?.values ?? []
  return rows.map((r) => ({
    id: r[0], code: r[1], name: r[2], location: r[3], notes: r[4], status: r[5], createdAt: r[6], updatedAt: r[7]
  }))
}

export function createWarehouse(payload) {
  const db = getDatabase()
  const now = new Date().toISOString()
  const id = payload.id || `wh-${crypto.randomUUID()}`
  const existingCode = db.exec(`SELECT id FROM warehouses WHERE code = ?`, [payload.code])[0]?.values?.[0]?.[0]
  if (existingCode) {
    throw new Error('كود المخزن مستخدم مسبقاً.')
  }
  db.run(`INSERT INTO warehouses (id, code, name, location, notes, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [id, payload.code, payload.name, payload.location ?? '', payload.notes ?? '', payload.status ?? 'active', now, now])
  persistDatabase(db)
  return listWarehouses()
}

export function updateWarehouse(id, payload) {
  const db = getDatabase()
  const now = new Date().toISOString()
  const existingCode = db.exec(`SELECT id FROM warehouses WHERE code = ? AND id <> ?`, [payload.code, id])[0]?.values?.[0]?.[0]
  if (existingCode) {
    throw new Error('كود المخزن مستخدم مسبقاً.')
  }
  db.run(`UPDATE warehouses SET code = ?, name = ?, location = ?, notes = ?, status = ?, updated_at = ? WHERE id = ?`, [payload.code, payload.name, payload.location ?? '', payload.notes ?? '', payload.status ?? 'active', now, id])
  persistDatabase(db)
  return listWarehouses()
}

export function toggleWarehouseStatus(id, status) {
  const db = getDatabase()
  const now = new Date().toISOString()
  db.run(`UPDATE warehouses SET status = ?, updated_at = ? WHERE id = ?`, [status, now, id])
  persistDatabase(db)
  return listWarehouses()
}

function hasWarehouseReferences(db, warehouseId) {
  const movementDocs = db.exec(
    `SELECT COUNT(1) FROM stock_movement_documents WHERE from_warehouse_id = ? OR to_warehouse_id = ?`,
    [warehouseId, warehouseId]
  )[0]?.values?.[0]?.[0] ?? 0

  const movements = db.exec(
    `SELECT COUNT(1) FROM stock_movements WHERE warehouse_id = ?`,
    [warehouseId]
  )[0]?.values?.[0]?.[0] ?? 0

  const stockLevels = db.exec(
    `SELECT COUNT(1) FROM stock_levels WHERE warehouse_id = ?`,
    [warehouseId]
  )[0]?.values?.[0]?.[0] ?? 0

  return Number(movementDocs) + Number(movements) + Number(stockLevels) > 0
}

export function deleteWarehouse(id) {
  const db = getDatabase()
  try {
    db.run('BEGIN')

    const existingWarehouse = db.exec(`SELECT id, code, name FROM warehouses WHERE id = ?`, [id])[0]?.values?.[0]
    if (!existingWarehouse) {
      throw new Error('المخزن غير موجود.')
    }

    if (hasWarehouseReferences(db, id)) {
      throw new Error('لا يمكن حذف المخزن لأنه مرتبط بحركات أو أرصدة مخزنية.')
    }

    db.run(`DELETE FROM warehouses WHERE id = ?`, [id])
    db.run('COMMIT')
    persistDatabase(db)
    return listWarehouses()
  } catch (error) {
    try {
      db.run('ROLLBACK')
    } catch (rollbackError) {
      console.error('Failed to rollback warehouse delete transaction', rollbackError)
    }
    throw error
  }
}

export function hasWarehouseActivity(warehouseId) {
  const db = getDatabase()
  return hasWarehouseReferences(db, warehouseId)
}

function normalizeSupplierRow(row) {
  return {
    id: row[0],
    code: row[1],
    name: row[2],
    phone: row[3] ?? '',
    address: row[4] ?? '',
    notes: row[5] ?? '',
    status: row[6],
    createdAt: row[7],
    updatedAt: row[8],
  }
}

function getSupplierById(db, supplierId) {
  const row = db.exec(
    `SELECT id, code, name, phone, address, notes, status, created_at, updated_at FROM suppliers WHERE id = ?`,
    [supplierId]
  )[0]?.values?.[0]
  return row ? normalizeSupplierRow(row) : null
}

function getWarehouseById(db, warehouseId) {
  const row = db.exec(
    `SELECT id, code, name, location, notes, status, created_at, updated_at FROM warehouses WHERE id = ?`,
    [warehouseId]
  )[0]?.values?.[0]
  if (!row) {
    return null
  }

  return {
    id: row[0],
    code: row[1],
    name: row[2],
    location: row[3] ?? '',
    notes: row[4] ?? '',
    status: row[5],
    createdAt: row[6],
    updatedAt: row[7],
  }
}

function getValidPurchasableMaterial(db, materialId) {
  const row = db.exec(
    `SELECT id, material_number, name, unit, type, is_non_stock, status
     FROM materials
     WHERE id = ?`,
    [materialId]
  )[0]?.values?.[0]

  if (!row) {
    return null
  }

  const isSub = row[4] === 'sub'
  const isStockable = Number(row[5]) !== 1
  const isDeleted = row[6] === 'deleted'

  if (!isSub || !isStockable || isDeleted) {
    return null
  }

  return {
    id: row[0],
    materialNumber: row[1],
    name: row[2],
    unit: row[3] ?? '',
  }
}

function normalizeDiscount(discountType, discountValue, subtotal) {
  const type = discountType ?? 'none'
  const value = Number(discountValue ?? 0)
  if (!['none', 'percentage', 'fixed'].includes(type)) {
    throw new Error('نوع الحسم غير صالح.')
  }
  if (Number.isNaN(value) || value < 0) {
    throw new Error('قيمة الحسم غير صالحة.')
  }

  if (type === 'percentage' && value > 100) {
    throw new Error('قيمة الحسم بالنسبة المئوية يجب أن تكون بين 0 و100.')
  }

  let discountAmount = 0
  if (type === 'percentage') {
    discountAmount = (subtotal * value) / 100
  } else if (type === 'fixed') {
    discountAmount = value
  }

  if (discountAmount > subtotal) {
    throw new Error('قيمة الحسم لا يمكن أن تتجاوز إجمالي الفاتورة.')
  }

  return {
    discountType: type,
    discountValue: value,
    discountAmount,
    netTotal: subtotal - discountAmount,
  }
}

function normalizeAdditionalFeeValue(value, fieldName) {
  const numericValue = Number(value ?? 0)
  if (Number.isNaN(numericValue) || numericValue < 0) {
    throw new Error(`${fieldName} غير صالح.`)
  }
  return normalizeMoney(numericValue)
}

function buildPurchaseNetItemCosts(items, discountType, discountValue, subtotal, expenses = 0) {
  if (!Array.isArray(items) || items.length === 0) {
    return []
  }

  const safeSubtotal = Number(subtotal ?? 0)
  const type = discountType ?? 'none'
  const value = Number(discountValue ?? 0)
  const feeTotal = normalizeMoney(Number(expenses ?? 0))

  if (safeSubtotal <= 0 && feeTotal <= 0) {
    return items.map((item) => ({
      ...item,
      netLineTotal: normalizeMoney(Number(item.lineTotal ?? 0)),
      netUnitPrice: item.quantity > 0 ? normalizeMoney(Number(item.lineTotal ?? 0) / Number(item.quantity)) : 0,
    }))
  }

  const totalGross = items.reduce((sum, item) => sum + Number(item.lineTotal ?? 0), 0)
  const discountAmount = type === 'percentage' ? (safeSubtotal * value) / 100 : type === 'fixed' ? Math.min(Number(value), safeSubtotal) : 0
  const totalNet = normalizeMoney(Math.max(safeSubtotal - discountAmount + feeTotal, 0))

  let adjustedItems = items.map((item, index) => {
    const grossLineTotal = Number(item.lineTotal ?? 0)
    const share = totalGross > 0 ? grossLineTotal / totalGross : 0
    const lineDiscount = type === 'none' || Number(value) <= 0 ? 0 : discountAmount * share
    const lineExpense = totalGross > 0 ? feeTotal * share : feeTotal / Math.max(items.length, 1)
    const rawNetLineTotal = grossLineTotal - lineDiscount + lineExpense
    return {
      ...item,
      netLineTotal: normalizeMoney(rawNetLineTotal),
      netUnitPrice: Number(item.quantity ?? 0) > 0 ? normalizeMoney(rawNetLineTotal / Number(item.quantity)) : 0,
      __index: index,
    }
  })

  const netSum = adjustedItems.reduce((sum, item) => sum + Number(item.netLineTotal ?? 0), 0)
  const diff = normalizeMoney(totalNet - netSum)
  if (Math.abs(diff) > 0 && adjustedItems.length > 0) {
    const lastIndex = adjustedItems.length - 1
    const lastItem = adjustedItems[lastIndex]
    const lastItemNet = normalizeMoney(Number(lastItem.netLineTotal ?? 0) + diff)
    adjustedItems[lastIndex] = {
      ...lastItem,
      netLineTotal: lastItemNet,
      netUnitPrice: Number(lastItem.quantity ?? 0) > 0 ? normalizeMoney(lastItemNet / Number(lastItem.quantity)) : 0,
    }
  }

  return adjustedItems.map((item) => ({
    ...item,
    netLineTotal: normalizeMoney(Number(item.netLineTotal ?? 0)),
    netUnitPrice: Number(item.quantity ?? 0) > 0 ? normalizeMoney(Number(item.netLineTotal ?? 0) / Number(item.quantity)) : 0,
    __index: undefined,
  }))
}

function toInvoiceItemPayload(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('أضف مادة واحدة على الأقل إلى الفاتورة.')
  }

  const seenMaterialIds = new Set()
  return items.map((item, index) => {
    const materialId = String(item.materialId ?? '').trim()
    if (!materialId) {
      throw new Error('المادة غير موجودة في دليل المواد. أضف المادة أولاً من دليل المواد ثم أعد المحاولة.')
    }

    if (seenMaterialIds.has(materialId)) {
      throw new Error('المادة مضافة مسبقاً إلى الفاتورة.')
    }
    seenMaterialIds.add(materialId)

    const quantity = Number(item.quantity)
    if (Number.isNaN(quantity) || quantity <= 0) {
      throw new Error('يجب أن تكون كمية المادة أكبر من صفر.')
    }

    const unitPrice = Number(item.unitPrice)
    if (Number.isNaN(unitPrice) || unitPrice < 0) {
      throw new Error('لا يمكن إدخال قيمة سالبة.')
    }

    return {
      id: item.id ?? `pii-${crypto.randomUUID()}`,
      materialId,
      quantity,
      unitPrice,
      lineTotal: quantity * unitPrice,
      unit: typeof item.unit === 'string' ? item.unit : '',
      notes: typeof item.notes === 'string' ? item.notes.trim() : '',
      order: index,
    }
  })
}

function validatePurchaseInvoiceCore(db, payload) {
  const supplierId = String(payload.supplierId ?? '').trim()
  const warehouseId = String(payload.warehouseId ?? '').trim()
  const date = String(payload.date ?? '').trim()

  if (!date) {
    throw new Error('تاريخ الفاتورة مطلوب.')
  }
  if (!supplierId) {
    throw new Error('اختر المورد.')
  }
  if (!warehouseId) {
    throw new Error('اختر المخزن.')
  }

  const supplier = getSupplierById(db, supplierId)
  if (!supplier || supplier.status !== 'active') {
    throw new Error('المورد غير موجود أو غير فعال.')
  }

  const warehouse = getWarehouseById(db, warehouseId)
  if (!warehouse || warehouse.status !== 'active') {
    throw new Error('المخزن غير موجود أو غير مفعل.')
  }

  const items = toInvoiceItemPayload(payload.items)
  let subtotal = 0
  const validatedItems = items.map((item) => {
    const material = getValidPurchasableMaterial(db, item.materialId)
    if (!material) {
      throw new Error('إحدى المواد غير موجودة أو غير صالحة للشراء. تأكد من دليل المواد.')
    }

    subtotal += item.lineTotal
    return {
      ...item,
      unit: material.unit,
    }
  })

  const discount = normalizeDiscount(payload.discountType, payload.discountValue, subtotal)
  const expenses = normalizeAdditionalFeeValue(payload.expenses, 'مصاريف الفاتورة')
  const costAdjustedItems = buildPurchaseNetItemCosts(validatedItems, discount.discountType, discount.discountValue, subtotal, expenses)

  return {
    supplier,
    warehouse,
    date,
    items: validatedItems.map((item) => {
      const adjusted = costAdjustedItems.find((candidate) => candidate.id === item.id)
      return {
        ...item,
        netLineTotal: adjusted ? adjusted.netLineTotal : normalizeMoney(Number(item.lineTotal ?? 0)),
        netUnitPrice: adjusted ? adjusted.netUnitPrice : normalizeMoney(Number(item.lineTotal ?? 0) / Number(item.quantity || 1)),
      }
    }),
    subtotal,
    ...discount,
    expenses,
    netTotal: normalizeMoney(subtotal - discount.discountAmount + expenses),
    supplierInvoiceNumber: String(payload.supplierInvoiceNumber ?? '').trim(),
    notes: String(payload.notes ?? '').trim(),
  }
}

function buildPurchaseInvoiceDetails(db, invoiceId) {
  const header = db.exec(
    `SELECT
       pi.id,
       pi.invoice_number,
       pi.supplier_invoice_number,
       pi.date,
       pi.supplier_id,
       s.code,
       s.name,
       pi.warehouse_id,
       w.code,
       w.name,
       pi.status,
       pi.subtotal,
       pi.discount_type,
       pi.discount_value,
       pi.discount_amount,
       pi.net_total,
       pi.expenses,
       pi.notes,
       pi.created_at,
       pi.updated_at
     FROM purchase_invoices pi
     LEFT JOIN suppliers s ON s.id = pi.supplier_id
     LEFT JOIN warehouses w ON w.id = pi.warehouse_id
     WHERE pi.id = ?`,
    [invoiceId]
  )[0]?.values?.[0]

  if (!header) {
    return null
  }

  const itemsRows = db.exec(
    `SELECT
       pii.id,
       pii.material_id,
       m.material_number,
       m.name,
       pii.quantity,
       pii.unit,
       pii.unit_price,
       pii.line_total,
       pii.notes
     FROM purchase_invoice_items pii
     LEFT JOIN materials m ON m.id = pii.material_id
     WHERE pii.invoice_id = ?
     ORDER BY pii.rowid`,
    [invoiceId]
  )[0]?.values ?? []

  const paymentSummary = getPurchasePaymentSummary(db, invoiceId, Number(header[15] ?? 0))
  const paymentsRows = db.exec(
    `SELECT id, invoice_id, date, amount, notes, payment_method, created_at
     FROM purchase_payments
     WHERE invoice_id = ?
     ORDER BY date DESC, created_at DESC`,
    [invoiceId]
  )[0]?.values ?? []

  return {
    id: header[0],
    invoiceNumber: header[1],
    supplierInvoiceNumber: header[2] ?? '',
    date: header[3],
    supplierId: header[4],
    supplierCode: header[5] ?? '',
    supplierName: header[6] ?? '',
    warehouseId: header[7],
    warehouseCode: header[8] ?? '',
    warehouseName: header[9] ?? '',
    status: header[10],
    subtotal: Number(header[11] ?? 0),
    discountType: header[12],
    discountValue: Number(header[13] ?? 0),
    discountAmount: Number(header[14] ?? 0),
    netTotal: Number(header[15] ?? 0),
    expenses: Number(header[16] ?? 0),
    paidAmount: paymentSummary.paidAmount,
    remainingAmount: paymentSummary.remainingAmount,
    paymentStatus: paymentSummary.paymentStatus,
    notes: header[17] ?? '',
    createdAt: header[18],
    updatedAt: header[19],
    items: itemsRows.map((row) => ({
      id: row[0],
      materialId: row[1],
      materialNumber: row[2] ?? '',
      materialName: row[3] ?? '',
      quantity: Number(row[4] ?? 0),
      unit: row[5] ?? '',
      unitPrice: Number(row[6] ?? 0),
      lineTotal: Number(row[7] ?? 0),
      notes: row[8] ?? '',
    })),
    payments: paymentsRows.map((row) => ({
      id: row[0],
      invoiceId: row[1],
      date: row[2],
      amount: normalizeMoney(Number(row[3] ?? 0)),
      notes: row[4] ?? '',
      paymentMethod: row[5] ?? '',
      createdAt: row[6],
    })),
  }
}

function normalizeMoney(value) {
  return Number(Math.round((Number(value ?? 0) + Number.EPSILON) * 100) / 100)
}

function normalizeDocumentNote(value) {
  if (typeof value !== 'string') {
    return value == null ? null : String(value).trim() || null
  }
  return value.trim() || null
}

function getPurchasePaymentSummary(db, invoiceId, netTotal) {
  const paidAmount = normalizeMoney(
    db.exec(
      `SELECT COALESCE(SUM(amount), 0) FROM purchase_payments WHERE invoice_id = ?`,
      [invoiceId]
    )[0]?.values?.[0]?.[0] ?? 0
  )

  const remainingAmount = normalizeMoney(Number(netTotal ?? 0) - paidAmount)
  let paymentStatus = 'unpaid'
  if (paidAmount > 0 && paidAmount < Number(netTotal ?? 0)) {
    paymentStatus = 'partial'
  } else if (paidAmount >= Number(netTotal ?? 0)) {
    paymentStatus = 'paid'
  }

  return {
    paidAmount,
    remainingAmount,
    paymentStatus,
  }
}

function buildPurchaseInvoiceList(filter = {}) {
  const db = getDatabase()
  const clauses = []
  const params = []

  if (filter.reference) {
    clauses.push('(pi.invoice_number LIKE ? OR COALESCE(pi.supplier_invoice_number, \"\") LIKE ? OR COALESCE(s.name, \"\") LIKE ?)')
    const likeValue = `%${String(filter.reference).trim()}%`
    params.push(likeValue, likeValue, likeValue)
  }

  if (filter.fromDate) {
    clauses.push('pi.date >= ?')
    params.push(filter.fromDate)
  }
  if (filter.toDate) {
    clauses.push('pi.date <= ?')
    params.push(filter.toDate)
  }
  if (filter.supplierId) {
    clauses.push('pi.supplier_id = ?')
    params.push(filter.supplierId)
  }
  if (filter.warehouseId) {
    clauses.push('pi.warehouse_id = ?')
    params.push(filter.warehouseId)
  }
  if (filter.status) {
    clauses.push('pi.status = ?')
    params.push(filter.status)
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''

  const rows = db.exec(
    `SELECT
       pi.id,
       pi.invoice_number,
       pi.supplier_invoice_number,
       pi.date,
       pi.supplier_id,
       s.name,
       pi.warehouse_id,
       w.name,
       pi.subtotal,
       pi.discount_amount,
       pi.net_total,
       pi.expenses,
       pi.status,
       COALESCE((SELECT SUM(pp.amount) FROM purchase_payments pp WHERE pp.invoice_id = pi.id), 0) AS paid_amount,
       pi.created_at,
       pi.updated_at
     FROM purchase_invoices pi
     LEFT JOIN suppliers s ON s.id = pi.supplier_id
     LEFT JOIN warehouses w ON w.id = pi.warehouse_id
     ${where}
     ORDER BY pi.date DESC, pi.invoice_number DESC`,
    params
  )[0]?.values ?? []

  return rows.map((row) => {
    const netTotal = Number(row[10] ?? 0)
    const expenses = Number(row[11] ?? 0)
    const paidAmount = normalizeMoney(Number(row[13] ?? 0))
    const remainingAmount = normalizeMoney(netTotal - paidAmount)
    const paymentStatus = paidAmount <= 0 ? 'unpaid' : paidAmount < netTotal ? 'partial' : 'paid'

    return {
      id: row[0],
      invoiceNumber: row[1],
      supplierInvoiceNumber: row[2] ?? '',
      date: row[3],
      supplierId: row[4],
      supplierName: row[5] ?? '-',
      warehouseId: row[6],
      warehouseName: row[7] ?? '-',
      subtotal: Number(row[8] ?? 0),
      discountAmount: Number(row[9] ?? 0),
      netTotal,
      expenses,
      paidAmount,
      remainingAmount,
      paymentStatus,
      status: row[12],
      createdAt: row[14],
      updatedAt: row[15],
    }
  })
}

function getNextDocumentNumberFromMax(db, tableName, columnName, prefix) {
  const rows = db.exec(
    `SELECT ${columnName} FROM ${tableName} WHERE ${columnName} LIKE ? ORDER BY ${columnName} ASC`,
    [`${prefix}-%`]
  )[0]?.values ?? []

  let maxNumber = 0

  for (const row of rows) {
    const value = String(row[0] ?? '').trim()
    const match = value.match(new RegExp(`^${prefix}-(\\d+)(?:-DRAFT)?$`, 'i'))
    if (!match) {
      continue
    }

    const parsed = Number(match[1])
    if (Number.isFinite(parsed) && parsed > maxNumber) {
      maxNumber = parsed
    }
  }

  return `${prefix}-${String(maxNumber + 1).padStart(6, '0')}`
}

function getNextPurchaseInvoiceNumber(db) {
  return getNextDocumentNumberFromMax(db, 'purchase_invoices', 'invoice_number', 'PUR')
}

export function listSuppliers() {
  const db = getDatabase()
  const rows = db.exec(
    `SELECT id, code, name, phone, address, notes, status, created_at, updated_at FROM suppliers ORDER BY created_at DESC`
  )[0]?.values ?? []
  return rows.map((row) => normalizeSupplierRow(row))
}

export function createSupplier(payload) {
  const db = getDatabase()
  const code = String(payload.code ?? '').trim()
  const name = String(payload.name ?? '').trim()
  if (!code || !name) {
    throw new Error('رقم المورد واسم المورد مطلوبان.')
  }

  const existing = db.exec(`SELECT id FROM suppliers WHERE code = ?`, [code])[0]?.values?.[0]?.[0]
  if (existing) {
    throw new Error('رقم المورد مستخدم مسبقاً.')
  }

  const id = payload.id ?? `sup-${crypto.randomUUID()}`
  const now = new Date().toISOString()
  db.run(
    `INSERT INTO suppliers (id, code, name, phone, address, notes, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      code,
      name,
      String(payload.phone ?? '').trim(),
      String(payload.address ?? '').trim(),
      String(payload.notes ?? '').trim(),
      payload.status === 'inactive' ? 'inactive' : 'active',
      now,
      now,
    ]
  )
  persistDatabase(db)
  return listSuppliers()
}

export function updateSupplier(id, payload) {
  const db = getDatabase()
  const supplier = getSupplierById(db, id)
  if (!supplier) {
    throw new Error('المورد غير موجود.')
  }

  const code = String(payload.code ?? '').trim()
  const name = String(payload.name ?? '').trim()
  if (!code || !name) {
    throw new Error('رقم المورد واسم المورد مطلوبان.')
  }

  const existing = db.exec(`SELECT id FROM suppliers WHERE code = ? AND id <> ?`, [code, id])[0]?.values?.[0]?.[0]
  if (existing) {
    throw new Error('رقم المورد مستخدم مسبقاً.')
  }

  const now = new Date().toISOString()
  db.run(
    `UPDATE suppliers
     SET code = ?, name = ?, phone = ?, address = ?, notes = ?, status = ?, updated_at = ?
     WHERE id = ?`,
    [
      code,
      name,
      String(payload.phone ?? '').trim(),
      String(payload.address ?? '').trim(),
      String(payload.notes ?? '').trim(),
      payload.status === 'inactive' ? 'inactive' : 'active',
      now,
      id,
    ]
  )
  persistDatabase(db)
  return listSuppliers()
}

export function listActiveSuppliers() {
  return listSuppliers().filter((supplier) => supplier.status === 'active')
}

export function deleteSupplier(id) {
  const db = getDatabase()
  const row = db.exec(`SELECT id FROM suppliers WHERE id = ?`, [id])[0]?.values?.[0]
  if (!row) {
    throw new Error('المورد غير موجود.')
  }

  const usage = db.exec(`SELECT COUNT(1) FROM purchase_invoices WHERE supplier_id = ?`, [id])[0]?.values?.[0]?.[0] ?? 0
  if (Number(usage) > 0) {
    throw new Error('لا يمكن حذف المورد لأنه مرتبط بفواتير مشتريات.')
  }

  db.run(`DELETE FROM suppliers WHERE id = ?`, [id])
  persistDatabase(db)
  return listSuppliers()
}

function normalizeCustomerRow(row) {
  const isActive = row[6] === 1 || row[6] === '1' || row[6] === true || row[6] === 'active'
  return {
    id: row[0],
    code: row[1],
    name: row[2],
    phone: row[3] ?? '',
    address: row[4] ?? '',
    notes: row[5] ?? '',
    status: isActive ? 'active' : 'inactive',
    isActive,
    createdAt: row[7],
    updatedAt: row[8],
  }
}

function getCustomerById(db, customerId) {
  const row = db.exec(
    `SELECT id, code, name, phone, address, notes, is_active, created_at, updated_at FROM customers WHERE id = ?`,
    [customerId]
  )[0]?.values?.[0]
  return row ? normalizeCustomerRow(row) : null
}

function getValidSellableMaterial(db, materialId) {
  const row = db.exec(
    `SELECT id, material_number, name, unit, type, is_non_stock, status
     FROM materials
     WHERE id = ?`,
    [materialId]
  )[0]?.values?.[0]

  if (!row) {
    return null
  }

  const isNonStock = Number(row[5]) === 1
  const isDeleted = row[6] === 'deleted'
  if (isNonStock || isDeleted) {
    return null
  }

  return {
    id: row[0],
    materialNumber: row[1],
    name: row[2],
    unit: row[3] ?? '',
  }
}

function getNextSalesInvoiceNumber(db) {
  return getNextDocumentNumberFromMax(db, 'sales_invoices', 'invoice_number', 'SAL')
}

function validateSalesInvoiceCore(db, payload) {
  const customerId = String(payload.customerId ?? '').trim()
  const warehouseId = String(payload.warehouseId ?? '').trim()
  const date = String(payload.date ?? '').trim()

  if (!date) throw new Error('تاريخ الفاتورة مطلوب.')
  if (!customerId) throw new Error('اختر العميل.')
  if (!warehouseId) throw new Error('اختر المخزن.')

  const customer = getCustomerById(db, customerId)
  if (!customer || customer.status !== 'active') {
    throw new Error('العميل غير موجود أو غير فعال.')
  }

  const warehouse = getWarehouseById(db, warehouseId)
  if (!warehouse || warehouse.status !== 'active') {
    throw new Error('المخزن غير موجود أو غير مفعل.')
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw new Error('أضف مادة واحدة على الأقل إلى الفاتورة.')
  }

  let subtotal = 0
  const validatedItems = payload.items.map((item, index) => {
    const materialId = String(item.materialId ?? '').trim()
    if (!materialId) {
      throw new Error('المادة غير موجودة في دليل المواد. أضف المادة أولاً ثم أعد المحاولة.')
    }

    const material = getValidSellableMaterial(db, materialId)
    if (!material) {
      throw new Error('إحدى المواد غير موجودة أو غير صالحة للبيع.')
    }

    const quantity = Number(item.quantity)
    if (Number.isNaN(quantity) || quantity <= 0) {
      throw new Error('يجب أن تكون كمية المادة أكبر من صفر.')
    }

    const available = computeAvailableQuantity(db, warehouseId, materialId)
    if (available < quantity) {
      throw new Error('الرصيد المتوفر في المخزن غير كافٍ لإتمام العملية.')
    }

    const unitPrice = Number(item.unitPrice)
    if (Number.isNaN(unitPrice) || unitPrice < 0) {
      throw new Error('لا يمكن إدخال قيمة سالبة.')
    }

    const unit = typeof item.unit === 'string' && item.unit.trim() ? item.unit.trim() : material.unit
    const lineTotal = quantity * unitPrice
    subtotal += lineTotal

    return {
      id: item.id ?? `sii-${crypto.randomUUID()}`,
      materialId,
      quantity,
      unitPrice,
      lineTotal,
      unit,
      notes: typeof item.notes === 'string' ? item.notes.trim() : '',
      order: index,
    }
  })

  const discount = normalizeDiscount(payload.discountType, payload.discountValue, subtotal)
  const customerAdditionalFees = normalizeAdditionalFeeValue(payload.customerAdditionalFees, 'رسوم العميل الإضافية')
  return {
    customer,
    warehouse,
    date,
    items: validatedItems,
    subtotal,
    ...discount,
    customerAdditionalFees,
    netTotal: normalizeMoney(subtotal - discount.discountAmount + customerAdditionalFees),
    notes: String(payload.notes ?? '').trim(),
  }
}

function getSalesReturnTotal(db, invoiceId) {
  const total = db.exec(
    `SELECT COALESCE(SUM(net_total), 0) FROM sales_returns WHERE sales_invoice_id = ?`,
    [invoiceId]
  )[0]?.values?.[0]?.[0] ?? 0

  return normalizeMoney(Number(total ?? 0))
}

function getSalesInvoiceFinancialSummary(db, invoiceId, netTotal) {
  const paidAmount = normalizeMoney(
    db.exec(
      `SELECT COALESCE(SUM(amount), 0) FROM sales_payments WHERE invoice_id = ?`,
      [invoiceId]
    )[0]?.values?.[0]?.[0] ?? 0
  )
  const salesReturnTotal = getSalesReturnTotal(db, invoiceId)
  const netAfterReturns = normalizeMoney(Math.max(Number(netTotal ?? 0) - salesReturnTotal, 0))
  const remainingAmount = normalizeMoney(Math.max(netAfterReturns - paidAmount, 0))
  const customerCredit = normalizeMoney(Math.max(paidAmount - netAfterReturns, 0))

  let paymentStatus = 'unpaid'
  if (netAfterReturns <= 0) {
    paymentStatus = 'paid'
  } else if (paidAmount > 0 && paidAmount < netAfterReturns) {
    paymentStatus = 'partial'
  } else if (paidAmount >= netAfterReturns) {
    paymentStatus = 'paid'
  }

  return {
    paidAmount,
    salesReturnTotal,
    netAfterReturns,
    remainingAmount,
    customerCredit,
    paymentStatus,
  }
}

function getSalesPaymentSummary(db, invoiceId, netTotal) {
  return getSalesInvoiceFinancialSummary(db, invoiceId, netTotal)
}

function buildSalesInvoiceDetails(db, invoiceId) {
  const header = db.exec(
    `SELECT
       si.id,
       si.invoice_number,
       si.date,
       si.customer_id,
       c.code,
       c.name,
       si.warehouse_id,
       w.code,
       w.name,
       si.status,
       si.subtotal,
       si.discount_type,
       si.discount_value,
       si.discount_amount,
       si.net_total,
       si.customer_additional_fees,
       si.notes,
       si.created_at,
       si.updated_at
     FROM sales_invoices si
     LEFT JOIN customers c ON c.id = si.customer_id
     LEFT JOIN warehouses w ON w.id = si.warehouse_id
     WHERE si.id = ?`,
    [invoiceId]
  )[0]?.values?.[0]

  if (!header) return null

  const itemsRows = db.exec(
    `SELECT
       sii.id,
       sii.material_id,
       m.material_number,
       m.name,
       sii.quantity,
       sii.unit,
       sii.unit_price,
       sii.line_total,
       sii.notes
     FROM sales_invoice_items sii
     LEFT JOIN materials m ON m.id = sii.material_id
     WHERE sii.invoice_id = ?
     ORDER BY sii.rowid`,
    [invoiceId]
  )[0]?.values ?? []

  const paymentSummary = getSalesInvoiceFinancialSummary(db, invoiceId, Number(header[14] ?? 0))
  const salesReturnsRows = db.exec(
    `SELECT id, return_number, date, net_total
     FROM sales_returns
     WHERE sales_invoice_id = ?
     ORDER BY date DESC, created_at DESC`,
    [invoiceId]
  )[0]?.values ?? []
  const paymentsRows = db.exec(
    `SELECT id, invoice_id, date, amount, notes, payment_method, created_at
     FROM sales_payments
     WHERE invoice_id = ?
     ORDER BY date DESC, created_at DESC`,
    [invoiceId]
  )[0]?.values ?? []

  return {
    id: header[0],
    invoiceNumber: header[1],
    date: header[2],
    customerId: header[3],
    customerCode: header[4] ?? '',
    customerName: header[5] ?? '',
    warehouseId: header[6],
    warehouseCode: header[7] ?? '',
    warehouseName: header[8] ?? '',
    status: header[9],
    subtotal: Number(header[10] ?? 0),
    discountType: header[11],
    discountValue: Number(header[12] ?? 0),
    discountAmount: Number(header[13] ?? 0),
    netTotal: Number(header[14] ?? 0),
    customerAdditionalFees: Number(header[15] ?? 0),
    salesReturnTotal: paymentSummary.salesReturnTotal,
    netAfterReturns: paymentSummary.netAfterReturns,
    paidAmount: paymentSummary.paidAmount,
    remainingAmount: paymentSummary.remainingAmount,
    customerCredit: paymentSummary.customerCredit,
    paymentStatus: paymentSummary.paymentStatus,
    notes: header[16] ?? '',
    createdAt: header[17],
    updatedAt: header[18],
    returns: salesReturnsRows.map((row) => ({
      id: row[0],
      returnNumber: row[1],
      date: row[2],
      netTotal: Number(row[3] ?? 0),
    })),
    items: itemsRows.map((row) => ({
      id: row[0],
      materialId: row[1],
      materialNumber: row[2] ?? '',
      materialName: row[3] ?? '',
      quantity: Number(row[4] ?? 0),
      unit: row[5] ?? '',
      unitPrice: Number(row[6] ?? 0),
      lineTotal: Number(row[7] ?? 0),
      notes: row[8] ?? '',
    })),
    payments: paymentsRows.map((row) => ({
      id: row[0],
      invoiceId: row[1],
      date: row[2],
      amount: normalizeMoney(Number(row[3] ?? 0)),
      notes: row[4] ?? '',
      paymentMethod: row[5] ?? '',
      createdAt: row[6],
    })),
  }
}

function buildSalesInvoiceList(filter = {}) {
  const db = getDatabase()
  const clauses = []
  const params = []

  if (filter.reference) {
    clauses.push('(si.invoice_number LIKE ? OR COALESCE(c.name, "") LIKE ?)')
    const likeValue = `%${String(filter.reference).trim()}%`
    params.push(likeValue, likeValue)
  }

  if (filter.fromDate) {
    clauses.push('si.date >= ?')
    params.push(filter.fromDate)
  }
  if (filter.toDate) {
    clauses.push('si.date <= ?')
    params.push(filter.toDate)
  }
  if (filter.customerId) {
    clauses.push('si.customer_id = ?')
    params.push(filter.customerId)
  }
  if (filter.warehouseId) {
    clauses.push('si.warehouse_id = ?')
    params.push(filter.warehouseId)
  }
  if (filter.status) {
    clauses.push('si.status = ?')
    params.push(filter.status)
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''

  const rows = db.exec(
    `SELECT
       si.id,
       si.invoice_number,
       si.date,
       si.customer_id,
       c.name,
       si.warehouse_id,
       w.name,
       si.subtotal,
       si.discount_amount,
       si.net_total,
       si.customer_additional_fees,
       si.status,
       COALESCE((SELECT SUM(sp.amount) FROM sales_payments sp WHERE sp.invoice_id = si.id), 0) AS paid_amount,
       si.created_at,
       si.updated_at
     FROM sales_invoices si
     LEFT JOIN customers c ON c.id = si.customer_id
     LEFT JOIN warehouses w ON w.id = si.warehouse_id
     ${where}
     ORDER BY si.date DESC, si.invoice_number DESC`,
    params
  )[0]?.values ?? []

  return rows.map((row) => {
    const netTotal = Number(row[9] ?? 0)
    const customerAdditionalFees = Number(row[10] ?? 0)
    const financialSummary = getSalesInvoiceFinancialSummary(db, row[0], netTotal)

    return {
      id: row[0],
      invoiceNumber: row[1],
      date: row[2],
      customerId: row[3],
      customerName: row[4] ?? '-',
      warehouseId: row[5],
      warehouseName: row[6] ?? '-',
      subtotal: Number(row[7] ?? 0),
      discountAmount: Number(row[8] ?? 0),
      netTotal,
      customerAdditionalFees,
      salesReturnTotal: financialSummary.salesReturnTotal,
      netAfterReturns: financialSummary.netAfterReturns,
      paidAmount: financialSummary.paidAmount,
      remainingAmount: financialSummary.remainingAmount,
      customerCredit: financialSummary.customerCredit,
      paymentStatus: financialSummary.paymentStatus,
      status: row[11],
      createdAt: row[13],
      updatedAt: row[14],
    }
  })
}

export function listCustomers() {
  const db = getDatabase()
  const rows = db.exec(
    `SELECT id, code, name, phone, address, notes, is_active, created_at, updated_at FROM customers ORDER BY created_at DESC`
  )[0]?.values ?? []
  return rows.map((row) => normalizeCustomerRow(row))
}

export function createCustomer(payload) {
  const db = getDatabase()
  const code = String(payload.code ?? '').trim()
  const name = String(payload.name ?? '').trim()
  if (!code || !name) {
    throw new Error('رقم العميل واسم العميل مطلوبان.')
  }

  const existing = db.exec(`SELECT id FROM customers WHERE code = ?`, [code])[0]?.values?.[0]?.[0]
  if (existing) {
    throw new Error('رقم العميل مستخدم مسبقاً.')
  }

  const id = payload.id ?? `cust-${crypto.randomUUID()}`
  const now = new Date().toISOString()
  const isActive = payload.status === 'inactive' ? 0 : 1

  db.run(
    `INSERT INTO customers (id, code, name, phone, address, notes, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, code, name, String(payload.phone ?? '').trim(), String(payload.address ?? '').trim(), String(payload.notes ?? '').trim(), isActive, now, now]
  )
  persistDatabase(db)
  return listCustomers()
}

export function updateCustomer(id, payload) {
  const db = getDatabase()
  const customer = getCustomerById(db, id)
  if (!customer) {
    throw new Error('العميل غير موجود.')
  }

  const code = String(payload.code ?? '').trim()
  const name = String(payload.name ?? '').trim()
  if (!code || !name) {
    throw new Error('رقم العميل واسم العميل مطلوبان.')
  }

  const existing = db.exec(`SELECT id FROM customers WHERE code = ? AND id <> ?`, [code, id])[0]?.values?.[0]?.[0]
  if (existing) {
    throw new Error('رقم العميل مستخدم مسبقاً.')
  }

  const now = new Date().toISOString()
  const isActive = payload.status === 'inactive' ? 0 : 1

  db.run(
    `UPDATE customers
     SET code = ?, name = ?, phone = ?, address = ?, notes = ?, is_active = ?, updated_at = ?
     WHERE id = ?`,
    [code, name, String(payload.phone ?? '').trim(), String(payload.address ?? '').trim(), String(payload.notes ?? '').trim(), isActive, now, id]
  )
  persistDatabase(db)
  return listCustomers()
}

export function listActiveCustomers() {
  return listCustomers().filter((customer) => customer.status === 'active')
}

export function deleteCustomer(id) {
  const db = getDatabase()
  const row = db.exec(`SELECT id FROM customers WHERE id = ?`, [id])[0]?.values?.[0]
  if (!row) {
    throw new Error('العميل غير موجود.')
  }

  const usage = db.exec(`SELECT COUNT(1) FROM sales_invoices WHERE customer_id = ?`, [id])[0]?.values?.[0]?.[0] ?? 0
  if (Number(usage) > 0) {
    throw new Error('لا يمكن حذف العميل لأنه مرتبط بفواتير مبيعات.')
  }

  db.run(`DELETE FROM customers WHERE id = ?`, [id])
  persistDatabase(db)
  return listCustomers()
}

export function getNextSalesInvoiceDraftData() {
  const db = getDatabase()
  return {
    invoiceNumber: getNextSalesInvoiceNumber(db),
    date: new Date().toISOString().slice(0, 10),
  }
}

export function listSalesInvoices(filter = {}) {
  return buildSalesInvoiceList(filter)
}

export function getSalesInvoiceById(invoiceId) {
  const db = getDatabase()
  const details = buildSalesInvoiceDetails(db, invoiceId)
  if (!details) {
    throw new Error('فاتورة المبيعات غير موجودة.')
  }
  return details
}

export function createSalesInvoiceDraft(payload) {
  const db = getDatabase()
  const now = new Date().toISOString()
  const invoiceId = payload.id ?? `sinv-${crypto.randomUUID()}`
  let committed = false

  try {
    db.run('BEGIN')

    const validated = validateSalesInvoiceCore(db, payload)
    const invoiceNumber = String(payload.invoiceNumber ?? '').trim() || getNextSalesInvoiceNumber(db)
    const existing = db.exec(`SELECT id FROM sales_invoices WHERE invoice_number = ?`, [invoiceNumber])[0]?.values?.[0]?.[0]
    if (existing) {
      throw new Error('رقم الفاتورة مستخدم مسبقاً.')
    }

    db.run(
      `INSERT INTO sales_invoices (
         id, invoice_number, date, customer_id, warehouse_id, status,
         subtotal, discount_type, discount_value, discount_amount, net_total, customer_additional_fees, notes, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        invoiceId,
        invoiceNumber,
        validated.date,
        validated.customer.id,
        validated.warehouse.id,
        validated.subtotal,
        validated.discountType,
        validated.discountValue,
        validated.discountAmount,
        validated.netTotal,
        validated.customerAdditionalFees,
        validated.notes || null,
        now,
        now,
      ]
    )

    for (const item of validated.items) {
      db.run(
        `INSERT INTO sales_invoice_items (id, invoice_id, material_id, quantity, unit, unit_price, line_total, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)` ,
        [
          item.id,
          invoiceId,
          item.materialId,
          item.quantity,
          item.unit,
          item.unitPrice,
          item.lineTotal,
          item.notes || null,
        ]
      )
    }

    db.run('COMMIT')
    committed = true
    persistDatabase(db)
    return getSalesInvoiceById(invoiceId)
  } catch (error) {
    if (!committed) {
      try { db.run('ROLLBACK') } catch (rollbackError) {
        console.error('ROLLBACK CREATE SALES INVOICE DRAFT FAILED', rollbackError)
      }
    }
    console.error('CREATE SALES INVOICE DRAFT ERROR', error)
    throw error
  }
}

export function updateSalesInvoiceDraft(invoiceId, payload) {
  const db = getDatabase()
  const now = new Date().toISOString()

  try {
    db.run('BEGIN')

    const existing = db.exec(
      `SELECT id, status, invoice_number FROM sales_invoices WHERE id = ?`,
      [invoiceId]
    )[0]?.values?.[0]
    if (!existing) throw new Error('فاتورة المبيعات غير موجودة.')
    if (existing[1] !== 'draft') throw new Error('لا يمكن تعديل فاتورة ليست في حالة مسودة.')

    const validated = validateSalesInvoiceCore(db, payload)
    const invoiceNumber = String(payload.invoiceNumber ?? existing[2]).trim()
    const duplicate = db.exec(
      `SELECT id FROM sales_invoices WHERE invoice_number = ? AND id <> ?`,
      [invoiceNumber, invoiceId]
    )[0]?.values?.[0]?.[0]
    if (duplicate) throw new Error('رقم الفاتورة مستخدم مسبقاً.')

    db.run(
      `UPDATE sales_invoices
       SET invoice_number = ?, date = ?, customer_id = ?, warehouse_id = ?,
           subtotal = ?, discount_type = ?, discount_value = ?, discount_amount = ?, net_total = ?, customer_additional_fees = ?, notes = ?, updated_at = ?
       WHERE id = ?`,
      [
        invoiceNumber,
        validated.date,
        validated.customer.id,
        validated.warehouse.id,
        validated.subtotal,
        validated.discountType,
        validated.discountValue,
        validated.discountAmount,
        validated.netTotal,
        validated.customerAdditionalFees,
        validated.notes || null,
        now,
        invoiceId,
      ]
    )

    db.run(`DELETE FROM sales_invoice_items WHERE invoice_id = ?`, [invoiceId])
    for (const item of validated.items) {
      db.run(
        `INSERT INTO sales_invoice_items (id, invoice_id, material_id, quantity, unit, unit_price, line_total, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)` ,
        [item.id, invoiceId, item.materialId, item.quantity, item.unit, item.unitPrice, item.lineTotal, item.notes || null]
      )
    }

    db.run('COMMIT')
    persistDatabase(db)
    return getSalesInvoiceById(invoiceId)
  } catch (error) {
    try { db.run('ROLLBACK') } catch (rollbackError) {
      console.error('ROLLBACK UPDATE SALES INVOICE DRAFT FAILED', rollbackError)
    }
    console.error('UPDATE SALES INVOICE DRAFT ERROR', error)
    throw error
  }
}

export function updateApprovedSalesInvoice(invoiceId, payload) {
  const db = getDatabase()
  const now = new Date().toISOString()

  try {
    db.run('BEGIN')

    const header = db.exec(
      `SELECT id, invoice_number, date, customer_id, warehouse_id, status
       FROM sales_invoices WHERE id = ?`,
      [invoiceId]
    )[0]?.values?.[0]

    if (!header) throw new Error('فاتورة المبيعات غير موجودة.')
    if (header[5] !== 'completed') throw new Error('لا يمكن تعديل فاتورة غير معتمدة.')

    const invoiceNumber = String(header[1])
    const previousWarehouseId = String(header[4] ?? '').trim()
    const previousItems = db.exec(
      `SELECT material_id, quantity, unit_price, unit, notes
       FROM sales_invoice_items WHERE invoice_id = ? ORDER BY rowid`,
      [invoiceId]
    )[0]?.values ?? []

    const affectedMaterials = new Set(
      previousItems
        .map((row) => String(row[0] ?? '').trim())
        .filter(Boolean)
    )

    db.run(`DELETE FROM stock_movements WHERE document_reference = ?`, [invoiceNumber])
    db.run(`DELETE FROM stock_movement_documents WHERE reference = ?`, [invoiceNumber])

    for (const row of previousItems) {
      const materialId = String(row[0] ?? '').trim()
      if (materialId) {
        recalculateStockLevel(db, previousWarehouseId, materialId)
      }
    }

    const validationWarehouseId = String(payload.warehouseId ?? previousWarehouseId ?? '').trim()
    const requiredQuantities = new Map()
    for (const item of Array.isArray(payload.items) ? payload.items : []) {
      const materialId = String(item.materialId ?? '').trim()
      const warehouseId = String(item.warehouseId ?? validationWarehouseId ?? previousWarehouseId ?? '').trim()
      const quantity = Number(item.quantity ?? 0)
      if (!materialId || !warehouseId || !Number.isFinite(quantity) || quantity <= 0) {
        continue
      }
      const key = `${warehouseId}|${materialId}`
      requiredQuantities.set(key, (requiredQuantities.get(key) ?? 0) + quantity)
    }

    for (const [key, totalQuantity] of requiredQuantities.entries()) {
      const [warehouseId, materialId] = key.split('|')
      if (!warehouseId || !materialId) continue
      const available = computeAvailableQuantity(db, warehouseId, materialId)
      if (available < totalQuantity) {
        throw new Error(`الرصيد المتوفر في المخزن غير كافٍ لإتمام العملية. الكمية المطلوبة: ${totalQuantity}، الرصيد الحالي: ${available}.`)
      }
    }

    const validated = validateSalesInvoiceCore(db, payload)
    for (const item of validated.items) {
      affectedMaterials.add(String(item.materialId))
    }
    const paidAmount = normalizeMoney(
      db.exec(
        `SELECT COALESCE(SUM(amount), 0) FROM sales_payments WHERE invoice_id = ?`,
        [invoiceId]
      )[0]?.values?.[0]?.[0] ?? 0
    )
    if (paidAmount > normalizeMoney(validated.netTotal) + 0.000001) {
      throw new Error('لا يمكن تعديل الفاتورة لأن مجموع الدفعات المسجلة يتجاوز المبلغ الجديد.')
    }

    db.run(
      `UPDATE sales_invoices
       SET date = ?, customer_id = ?, warehouse_id = ?, subtotal = ?, discount_type = ?, discount_value = ?, discount_amount = ?, net_total = ?, customer_additional_fees = ?, notes = ?, updated_at = ?
       WHERE id = ?`,
      [
        validated.date,
        validated.customer.id,
        validated.warehouse.id,
        validated.subtotal,
        validated.discountType,
        validated.discountValue,
        validated.discountAmount,
        validated.netTotal,
        validated.customerAdditionalFees,
        validated.notes || null,
        now,
        invoiceId,
      ]
    )

    db.run(`DELETE FROM sales_invoice_items WHERE invoice_id = ?`, [invoiceId])
    for (const item of validated.items) {
      db.run(
        `INSERT INTO sales_invoice_items (id, invoice_id, material_id, quantity, unit, unit_price, line_total, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [item.id, invoiceId, item.materialId, item.quantity, item.unit, item.unitPrice, item.lineTotal, item.notes || null]
      )
    }

    db.run(
      `INSERT INTO stock_movement_documents (id, reference, type, date, from_warehouse_id, to_warehouse_id, notes, created_by, created_at, status)
       VALUES (?, ?, 'sale', ?, ?, NULL, ?, ?, ?, 'completed')`,
      [`doc-${crypto.randomUUID()}`, invoiceNumber, validated.date, validated.warehouse.id, normalizeDocumentNote(validated.notes), 'sales-module', now]
    )

    for (let index = 0; index < validated.items.length; index++) {
      const item = validated.items[index]
      db.run(
        `INSERT INTO stock_movements (id, document_reference, type, reference, warehouse_id, material_id, quantity_in, quantity_out, unit, cost, notes, created_at, created_by)
         VALUES (?, ?, 'sale', ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)` ,
        [
          `${invoiceNumber}-${index}`,
          invoiceNumber,
          invoiceNumber,
          validated.warehouse.id,
          item.materialId,
          item.quantity,
          item.unit,
          item.unitPrice,
          item.notes || null,
          now,
          'sales-module',
        ]
      )
    }

    for (const materialId of affectedMaterials) {
      recalculateStockLevel(db, validated.warehouse.id, materialId)
    }

    db.run('COMMIT')
    persistDatabase(db)
    return getSalesInvoiceById(invoiceId)
  } catch (error) {
    try { db.run('ROLLBACK') } catch (rollbackError) {
      console.error('ROLLBACK UPDATE APPROVED SALES INVOICE FAILED', rollbackError)
    }
    console.error('UPDATE APPROVED SALES INVOICE ERROR', error)
    throw error
  }
}

export function deleteSalesInvoiceDraft(invoiceId) {
  const db = getDatabase()

  try {
    db.run('BEGIN')
    const existing = db.exec(`SELECT id, status FROM sales_invoices WHERE id = ?`, [invoiceId])[0]?.values?.[0]
    if (!existing) throw new Error('فاتورة المبيعات غير موجودة.')
    if (existing[1] !== 'draft') throw new Error('لا يمكن حذف فاتورة ليست في حالة مسودة.')

    db.run(`DELETE FROM sales_invoice_items WHERE invoice_id = ?`, [invoiceId])
    db.run(`DELETE FROM sales_invoices WHERE id = ?`, [invoiceId])
    db.run('COMMIT')
    persistDatabase(db)
    return listSalesInvoices()
  } catch (error) {
    try { db.run('ROLLBACK') } catch (rollbackError) {
      console.error('ROLLBACK DELETE SALES INVOICE DRAFT FAILED', rollbackError)
    }
    console.error('DELETE SALES INVOICE DRAFT ERROR', error)
    throw error
  }
}

export function deleteSalesInvoice(invoiceId) {
  const db = getDatabase()

  try {
    db.run('BEGIN')

    const header = db.exec(
      `SELECT id, invoice_number, warehouse_id, status FROM sales_invoices WHERE id = ?`,
      [invoiceId]
    )[0]?.values?.[0]

    if (!header) {
      throw new Error('فاتورة المبيعات غير موجودة.')
    }
    if (header[3] !== 'completed') {
      throw new Error('لا يمكن حذف فاتورة غير معتمدة.')
    }

    const invoiceNumber = String(header[1])
    const warehouseId = String(header[2])
    const items = db.exec(
      `SELECT material_id, quantity, unit_price, unit, notes
       FROM sales_invoice_items WHERE invoice_id = ? ORDER BY rowid`,
      [invoiceId]
    )[0]?.values ?? []

    if (items.length === 0) {
      throw new Error('لا يمكن حذف الفاتورة لعدم وجود مواد.')
    }

    db.run(`DELETE FROM sales_payments WHERE invoice_id = ?`, [invoiceId])
    db.run(`DELETE FROM stock_movements WHERE document_reference = ?`, [invoiceNumber])
    db.run(`DELETE FROM stock_movement_documents WHERE reference = ?`, [invoiceNumber])
    db.run(`DELETE FROM sales_invoice_items WHERE invoice_id = ?`, [invoiceId])
    db.run(`DELETE FROM sales_invoices WHERE id = ?`, [invoiceId])

    for (const row of items) {
      const materialId = row[0]
      recalculateStockLevel(db, warehouseId, materialId)
    }

    db.run('COMMIT')
    persistDatabase(db)
    return listSalesInvoices()
  } catch (error) {
    try { db.run('ROLLBACK') } catch (rollbackError) {
      console.error('ROLLBACK DELETE SALES INVOICE FAILED', rollbackError)
    }
    console.error('DELETE SALES INVOICE ERROR', error)
    throw error
  }
}

export function completeSalesInvoice(invoiceId) {
  const db = getDatabase()
  const now = new Date().toISOString()
  let stage = 'start'

  try {
    stage = 'begin'
    db.run('BEGIN')

    stage = 'load-invoice'
    const header = db.exec(
      `SELECT id, invoice_number, date, customer_id, warehouse_id, status, discount_type, discount_value, customer_additional_fees, notes
       FROM sales_invoices WHERE id = ?`,
      [invoiceId]
    )[0]?.values?.[0]

    if (!header) throw new Error('فاتورة المبيعات غير موجودة.')
    if (header[5] === 'completed') throw new Error('الفاتورة معتمدة مسبقاً.')

    stage = 'build-payload'
    const payload = {
      customerId: header[3],
      warehouseId: header[4],
      date: header[2],
      discountType: header[6],
      discountValue: header[7],
      customerAdditionalFees: Number(header[8] ?? 0),
      notes: header[9] ?? null,
      items: db.exec(
        `SELECT material_id, quantity, unit_price, unit, notes
         FROM sales_invoice_items WHERE invoice_id = ? ORDER BY rowid`,
        [invoiceId]
      )[0]?.values?.map((row) => ({
        materialId: row[0],
        quantity: Number(row[1]),
        unitPrice: Number(row[2]),
        unit: row[3] ?? '',
        notes: row[4] ?? '',
      })) ?? [],
    }

    stage = 'validate'
    const validated = validateSalesInvoiceCore(db, payload)
    const movementReference = String(header[1])
    const movementExists = db.exec(
      `SELECT id FROM stock_movement_documents WHERE reference = ?`,
      [movementReference]
    )[0]?.values?.[0]?.[0]
    if (movementExists) throw new Error('لا يمكن اعتماد الفاتورة لأن المرجع مستخدم مسبقاً في حركة مخزنية.')

    stage = 'insert-movement-document'
    db.run(
      `INSERT INTO stock_movement_documents (id, reference, type, date, from_warehouse_id, to_warehouse_id, notes, created_by, created_at, status)
       VALUES (?, ?, 'sale', ?, ?, NULL, ?, ?, ?, 'completed')`,
      [`doc-${crypto.randomUUID()}`, movementReference, validated.date, validated.warehouse.id, normalizeDocumentNote(validated.notes), 'sales-module', now]
    )

    stage = 'insert-movement-lines'
    for (let index = 0; index < validated.items.length; index++) {
      const item = validated.items[index]
      db.run(
        `INSERT INTO stock_movements (id, document_reference, type, reference, warehouse_id, material_id, quantity_in, quantity_out, unit, cost, notes, created_at, created_by)
         VALUES (?, ?, 'sale', ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)` ,
        [
          `${movementReference}-${index}`,
          movementReference,
          movementReference,
          validated.warehouse.id,
          item.materialId,
          item.quantity,
          item.unit,
          item.unitPrice,
          item.notes || null,
          now,
          'sales-module',
        ]
      )
    }

    stage = 'update-stock-levels'
    for (const item of validated.items) {
      recalculateStockLevel(db, validated.warehouse.id, item.materialId)
    }

    stage = 'update-invoice-status'
    db.run(
      `UPDATE sales_invoices
       SET status = 'completed', subtotal = ?, discount_type = ?, discount_value = ?, discount_amount = ?, net_total = ?, customer_additional_fees = ?, updated_at = ?
       WHERE id = ?`,
      [validated.subtotal, validated.discountType, validated.discountValue, validated.discountAmount, validated.netTotal, validated.customerAdditionalFees, now, invoiceId]
    )

    db.run('COMMIT')
    persistDatabase(db)
    return getSalesInvoiceById(invoiceId)
  } catch (error) {
    try { db.run('ROLLBACK') } catch (rollbackError) {
      console.error('ROLLBACK COMPLETE SALES INVOICE FAILED', rollbackError)
    }
    console.error('COMPLETE SALES INVOICE ERROR', { stage, invoiceId, error })
    throw error
  }
}

export function cancelSalesInvoice(invoiceId) {
  const db = getDatabase()
  const now = new Date().toISOString()

  try {
    db.run('BEGIN')

    const header = db.exec(
      `SELECT id, invoice_number, warehouse_id, status FROM sales_invoices WHERE id = ?`,
      [invoiceId]
    )[0]?.values?.[0]
    if (!header) throw new Error('فاتورة المبيعات غير موجودة.')
    if (header[3] === 'cancelled') throw new Error('الفاتورة ملغاة مسبقاً.')
    if (header[3] !== 'completed') throw new Error('لا يمكن إلغاء فاتورة غير معتمدة.')

    const paymentCount = db.exec(
      `SELECT COUNT(1) FROM sales_payments WHERE invoice_id = ?`,
      [invoiceId]
    )[0]?.values?.[0]?.[0] ?? 0
    if (Number(paymentCount) > 0) {
      throw new Error('لا يمكن إلغاء الفاتورة لوجود دفعات مسجلة عليها. احذف الدفعات أولاً ثم أعد المحاولة.')
    }

    const invoiceNumber = String(header[1])
    const warehouseId = String(header[2])
    const items = db.exec(
      `SELECT material_id, quantity, unit_price, unit, notes
       FROM sales_invoice_items WHERE invoice_id = ? ORDER BY rowid`,
      [invoiceId]
    )[0]?.values ?? []

    db.run(
      `UPDATE stock_movement_documents
       SET status = 'cancelled', notes = COALESCE(notes, '') || ' | إلغاء الفاتورة'
       WHERE reference = ?`,
      [invoiceNumber]
    )

    for (let index = 0; index < items.length; index++) {
      const row = items[index]
      const materialId = row[0]
      recalculateStockLevel(db, warehouseId, materialId)
    }

    db.run(`UPDATE sales_invoices SET status = 'cancelled', updated_at = ? WHERE id = ?`, [now, invoiceId])
    db.run('COMMIT')
    persistDatabase(db)
    return getSalesInvoiceById(invoiceId)
  } catch (error) {
    try { db.run('ROLLBACK') } catch (rollbackError) {
      console.error('ROLLBACK CANCEL SALES INVOICE FAILED', rollbackError)
    }
    console.error('CANCEL SALES INVOICE ERROR', error)
    throw error
  }
}

export function addSalesPayment(invoiceId, payload = {}) {
  const db = getDatabase()
  const amount = Number(payload.amount ?? 0)
  const date = String(payload.date ?? '').trim()
  const notes = String(payload.notes ?? '').trim()
  const paymentMethod = String(payload.paymentMethod ?? '').trim()

  if (!invoiceId) throw new Error('لم يتم تحديد الفاتورة.')
  if (!date) throw new Error('تاريخ الدفعة مطلوب.')
  if (!paymentMethod) throw new Error('طريقة الدفع مطلوبة.')
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('قيمة الدفعة يجب أن تكون أكبر من صفر.')

  const invoice = db.exec(
    `SELECT id, status, net_total FROM sales_invoices WHERE id = ?`,
    [invoiceId]
  )[0]?.values?.[0]
  if (!invoice) throw new Error('فاتورة المبيعات غير موجودة.')
  if (invoice[1] !== 'completed') throw new Error('يمكن تسجيل الدفعات فقط على فواتير معتمدة.')

  const summary = getSalesInvoiceFinancialSummary(db, invoiceId, Number(invoice[2] ?? 0))
  if (summary.netAfterReturns <= 0) {
    throw new Error('الفاتورة مسددة بالكامل بعد احتساب مرتجعات البيع.')
  }
  if (amount > Number(summary.remainingAmount ?? 0) + 0.000001) {
    throw new Error('لا يمكن تسجيل دفعة تتجاوز المبلغ المتبقي بعد احتساب مرتجعات البيع.')
  }

  const paymentId = `sp-${crypto.randomUUID()}`
  const createdAt = new Date().toISOString()
  db.run(
    `INSERT INTO sales_payments (id, invoice_id, date, amount, notes, payment_method, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)` ,
    [paymentId, invoiceId, date, normalizeMoney(amount), notes || null, paymentMethod, createdAt]
  )
  persistDatabase(db)

  const payment = db.exec(
    `SELECT id, invoice_id, date, amount, notes, payment_method, created_at FROM sales_payments WHERE id = ?`,
    [paymentId]
  )[0]?.values?.[0]

  if (!payment) throw new Error('تعذر حفظ الدفعة.')

  return {
    id: payment[0],
    invoiceId: payment[1],
    date: payment[2],
    amount: normalizeMoney(Number(payment[3] ?? 0)),
    notes: payment[4] ?? '',
    paymentMethod: payment[5] ?? '',
    createdAt: payment[6],
  }
}

export function deleteSalesPayment(paymentId) {
  const db = getDatabase()
  const payment = db.exec(
    `SELECT id, invoice_id, date, amount, notes, payment_method, created_at FROM sales_payments WHERE id = ?`,
    [paymentId]
  )[0]?.values?.[0]

  if (!payment) throw new Error('الدفع غير موجود.')

  const invoice = db.exec(
    `SELECT id, status FROM sales_invoices WHERE id = ?`,
    [payment[1]]
  )[0]?.values?.[0]
  if (!invoice) throw new Error('الفاتورة المرتبطة بالدفع غير موجودة.')
  if (invoice[1] !== 'completed') throw new Error('لا يمكن حذف دفعة من فاتورة غير معتمدة.')

  db.run(`DELETE FROM sales_payments WHERE id = ?`, [paymentId])
  persistDatabase(db)

  return {
    id: payment[0],
    invoiceId: payment[1],
    date: payment[2],
    amount: normalizeMoney(Number(payment[3] ?? 0)),
    notes: payment[4] ?? '',
    paymentMethod: payment[5] ?? '',
    createdAt: payment[6],
  }
}

export function getNextPurchaseInvoiceDraftData() {
  const db = getDatabase()
  return {
    invoiceNumber: getNextPurchaseInvoiceNumber(db),
    date: new Date().toISOString().slice(0, 10),
  }
}

export function listPurchaseInvoices(filter = {}) {
  return buildPurchaseInvoiceList(filter)
}

export function getPurchaseInvoiceById(invoiceId) {
  const db = getDatabase()
  const details = buildPurchaseInvoiceDetails(db, invoiceId)
  if (!details) {
    throw new Error('فاتورة الشراء غير موجودة.')
  }
  return details
}

export function createPurchaseInvoiceDraft(payload) {
  const db = getDatabase()
  const now = new Date().toISOString()
  const invoiceId = payload.id ?? `pinv-${crypto.randomUUID()}`
  let committed = false

  try {
    db.run('BEGIN')

    const validated = validatePurchaseInvoiceCore(db, payload)
    const invoiceNumber = String(payload.invoiceNumber ?? '').trim() || getNextPurchaseInvoiceNumber(db)
    const existing = db.exec(`SELECT id FROM purchase_invoices WHERE invoice_number = ?`, [invoiceNumber])[0]?.values?.[0]?.[0]
    if (existing) {
      throw new Error('رقم الفاتورة مستخدم مسبقاً.')
    }

    db.run(
      `INSERT INTO purchase_invoices (
         id, invoice_number, supplier_invoice_number, date, supplier_id, warehouse_id, status,
         subtotal, discount_type, discount_value, discount_amount, net_total, expenses, notes, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoiceId,
        invoiceNumber,
        validated.supplierInvoiceNumber || null,
        validated.date,
        validated.supplier.id,
        validated.warehouse.id,
        validated.subtotal,
        validated.discountType,
        validated.discountValue,
        validated.discountAmount,
        validated.netTotal,
        validated.expenses,
        validated.notes || null,
        now,
        now,
      ]
    )

    for (const item of validated.items) {
      db.run(
        `INSERT INTO purchase_invoice_items (id, invoice_id, material_id, quantity, unit, unit_price, line_total, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          invoiceId,
          item.materialId,
          item.quantity,
          item.unit,
          item.unitPrice,
          item.lineTotal,
          item.notes || null,
        ]
      )
    }

    db.run('COMMIT')
    committed = true
    persistDatabase(db)
    return getPurchaseInvoiceById(invoiceId)
  } catch (error) {
    if (!committed) {
      try {
        db.run('ROLLBACK')
      } catch (rollbackError) {
        console.error('ROLLBACK CREATE PURCHASE INVOICE DRAFT FAILED', rollbackError)
      }
    }
    console.error('CREATE PURCHASE INVOICE DRAFT ERROR', error)
    throw error
  }
}

export function updatePurchaseInvoiceDraft(invoiceId, payload) {
  const db = getDatabase()
  const now = new Date().toISOString()

  try {
    db.run('BEGIN')

    const existing = db.exec(
      `SELECT id, status, invoice_number FROM purchase_invoices WHERE id = ?`,
      [invoiceId]
    )[0]?.values?.[0]
    if (!existing) {
      throw new Error('فاتورة الشراء غير موجودة.')
    }
    if (existing[1] !== 'draft') {
      throw new Error('لا يمكن تعديل فاتورة ليست في حالة مسودة.')
    }

    const validated = validatePurchaseInvoiceCore(db, payload)
    const invoiceNumber = String(payload.invoiceNumber ?? existing[2]).trim()
    const duplicate = db.exec(
      `SELECT id FROM purchase_invoices WHERE invoice_number = ? AND id <> ?`,
      [invoiceNumber, invoiceId]
    )[0]?.values?.[0]?.[0]
    if (duplicate) {
      throw new Error('رقم الفاتورة مستخدم مسبقاً.')
    }

    db.run(
      `UPDATE purchase_invoices
       SET invoice_number = ?, supplier_invoice_number = ?, date = ?, supplier_id = ?, warehouse_id = ?,
           subtotal = ?, discount_type = ?, discount_value = ?, discount_amount = ?, net_total = ?, expenses = ?, notes = ?, updated_at = ?
       WHERE id = ?`,
      [
        invoiceNumber,
        validated.supplierInvoiceNumber || null,
        validated.date,
        validated.supplier.id,
        validated.warehouse.id,
        validated.subtotal,
        validated.discountType,
        validated.discountValue,
        validated.discountAmount,
        validated.netTotal,
        validated.expenses,
        validated.notes || null,
        now,
        invoiceId,
      ]
    )

    db.run(`DELETE FROM purchase_invoice_items WHERE invoice_id = ?`, [invoiceId])
    for (const item of validated.items) {
      db.run(
        `INSERT INTO purchase_invoice_items (id, invoice_id, material_id, quantity, unit, unit_price, line_total, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          invoiceId,
          item.materialId,
          item.quantity,
          item.unit,
          item.unitPrice,
          item.lineTotal,
          item.notes || null,
        ]
      )
    }

    db.run('COMMIT')
    persistDatabase(db)
    return getPurchaseInvoiceById(invoiceId)
  } catch (error) {
    try {
      db.run('ROLLBACK')
    } catch (rollbackError) {
      console.error('ROLLBACK UPDATE PURCHASE INVOICE DRAFT FAILED', rollbackError)
    }
    console.error('UPDATE PURCHASE INVOICE DRAFT ERROR', error)
    throw error
  }
}

export function updateApprovedPurchaseInvoice(invoiceId, payload) {
  const db = getDatabase()
  const now = new Date().toISOString()

  try {
    db.run('BEGIN')

    const header = db.exec(
      `SELECT id, invoice_number, date, supplier_id, warehouse_id, status
       FROM purchase_invoices WHERE id = ?`,
      [invoiceId]
    )[0]?.values?.[0]

    if (!header) {
      throw new Error('فاتورة الشراء غير موجودة.')
    }
    if (header[5] !== 'completed') {
      throw new Error('لا يمكن تعديل فاتورة غير معتمدة.')
    }

    const invoiceNumber = String(header[1])
    const previousItems = db.exec(
      `SELECT material_id, quantity, unit_price, unit, notes
       FROM purchase_invoice_items WHERE invoice_id = ? ORDER BY rowid`,
      [invoiceId]
    )[0]?.values ?? []
    const affectedMaterials = new Set(
      previousItems.map((row) => String(row[0]))
    )

    const paidAmount = normalizeMoney(
      db.exec(
        `SELECT COALESCE(SUM(amount), 0) FROM purchase_payments WHERE invoice_id = ?`,
        [invoiceId]
      )[0]?.values?.[0]?.[0] ?? 0
    )

    db.run(`DELETE FROM stock_movements WHERE document_reference = ?`, [invoiceNumber])
    db.run(`DELETE FROM stock_movement_documents WHERE reference = ?`, [invoiceNumber])

    const validated = validatePurchaseInvoiceCore(db, payload)
    for (const item of validated.items) {
      affectedMaterials.add(String(item.materialId))
    }
    if (paidAmount > normalizeMoney(validated.netTotal) + 0.000001) {
      throw new Error('لا يمكن تعديل الفاتورة لأن مجموع الدفعات المسجلة يتجاوز المبلغ الجديد.')
    }

    db.run(
      `UPDATE purchase_invoices
       SET supplier_invoice_number = ?, date = ?, supplier_id = ?, warehouse_id = ?, subtotal = ?, discount_type = ?, discount_value = ?, discount_amount = ?, net_total = ?, expenses = ?, notes = ?, updated_at = ?
       WHERE id = ?`,
      [
        validated.supplierInvoiceNumber || null,
        validated.date,
        validated.supplier.id,
        validated.warehouse.id,
        validated.subtotal,
        validated.discountType,
        validated.discountValue,
        validated.discountAmount,
        validated.netTotal,
        validated.expenses,
        validated.notes || null,
        now,
        invoiceId,
      ]
    )

    db.run(`DELETE FROM purchase_invoice_items WHERE invoice_id = ?`, [invoiceId])
    for (const item of validated.items) {
      db.run(
        `INSERT INTO purchase_invoice_items (id, invoice_id, material_id, quantity, unit, unit_price, line_total, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [item.id, invoiceId, item.materialId, item.quantity, item.unit, item.unitPrice, item.lineTotal, item.notes || null]
      )
    }

    db.run(
      `INSERT INTO stock_movement_documents (id, reference, type, date, from_warehouse_id, to_warehouse_id, notes, created_by, created_at, status)
       VALUES (?, ?, 'purchase', ?, NULL, ?, ?, ?, ?, 'completed')`,
      [`doc-${crypto.randomUUID()}`, invoiceNumber, validated.date, validated.warehouse.id, normalizeDocumentNote(validated.notes), 'purchases-module', now]
    )

    for (let index = 0; index < validated.items.length; index++) {
      const item = validated.items[index]
      const netUnitPrice = Number(item.netUnitPrice ?? item.unitPrice ?? 0)
      db.run(
        `INSERT INTO stock_movements (id, document_reference, type, reference, warehouse_id, material_id, quantity_in, quantity_out, unit, cost, notes, created_at, created_by)
         VALUES (?, ?, 'purchase', ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)` ,
        [
          `${invoiceNumber}-${index}`,
          invoiceNumber,
          invoiceNumber,
          validated.warehouse.id,
          item.materialId,
          item.quantity,
          item.unit,
          netUnitPrice,
          item.notes || null,
          now,
          'purchases-module',
        ]
      )
    }

    for (const materialId of affectedMaterials) {
      recalculateStockLevel(db, validated.warehouse.id, materialId)
    }

    db.run('COMMIT')
    persistDatabase(db)
    return getPurchaseInvoiceById(invoiceId)
  } catch (error) {
    try {
      db.run('ROLLBACK')
    } catch (rollbackError) {
      console.error('ROLLBACK UPDATE APPROVED PURCHASE INVOICE FAILED', rollbackError)
    }
    console.error('UPDATE APPROVED PURCHASE INVOICE ERROR', error)
    throw error
  }
}

export function deletePurchaseInvoiceDraft(invoiceId) {
  const db = getDatabase()

  try {
    db.run('BEGIN')

    const existing = db.exec(`SELECT id, status FROM purchase_invoices WHERE id = ?`, [invoiceId])[0]?.values?.[0]
    if (!existing) {
      throw new Error('فاتورة الشراء غير موجودة.')
    }
    if (existing[1] !== 'draft') {
      throw new Error('لا يمكن حذف فاتورة ليست في حالة مسودة.')
    }

    db.run(`DELETE FROM purchase_invoice_items WHERE invoice_id = ?`, [invoiceId])
    db.run(`DELETE FROM purchase_invoices WHERE id = ?`, [invoiceId])

    db.run('COMMIT')
    persistDatabase(db)
    return listPurchaseInvoices()
  } catch (error) {
    try {
      db.run('ROLLBACK')
    } catch (rollbackError) {
      console.error('ROLLBACK DELETE PURCHASE INVOICE DRAFT FAILED', rollbackError)
    }
    console.error('DELETE PURCHASE INVOICE DRAFT ERROR', error)
    throw error
  }
}

export function deletePurchaseInvoice(invoiceId) {
  const db = getDatabase()

  try {
    db.run('BEGIN')

    const header = db.exec(
      `SELECT id, invoice_number, warehouse_id, status FROM purchase_invoices WHERE id = ?`,
      [invoiceId]
    )[0]?.values?.[0]

    if (!header) {
      throw new Error('فاتورة الشراء غير موجودة.')
    }
    if (header[3] !== 'completed') {
      throw new Error('لا يمكن حذف فاتورة غير معتمدة.')
    }

    const invoiceNumber = String(header[1])
    const warehouseId = String(header[2])
    const items = db.exec(
      `SELECT material_id, quantity, unit_price, unit, notes
       FROM purchase_invoice_items WHERE invoice_id = ? ORDER BY rowid`,
      [invoiceId]
    )[0]?.values ?? []

    if (items.length === 0) {
      throw new Error('لا يمكن حذف الفاتورة لعدم وجود مواد.')
    }

    for (const row of items) {
      const materialId = row[0]
      const qty = Number(row[1] ?? 0)
      const available = computeAvailableQuantity(db, warehouseId, materialId)
      if (available < qty) {
        throw new Error('لا يمكن حذف الفاتورة لأن جزءاً من الكميات المشتراة تم استخدامه أو صرفه من المخزون.')
      }
    }

    db.run(`DELETE FROM purchase_payments WHERE invoice_id = ?`, [invoiceId])
    db.run(`DELETE FROM stock_movements WHERE document_reference = ?`, [invoiceNumber])
    db.run(`DELETE FROM stock_movement_documents WHERE reference = ?`, [invoiceNumber])
    db.run(`DELETE FROM purchase_invoice_items WHERE invoice_id = ?`, [invoiceId])
    db.run(`DELETE FROM purchase_invoices WHERE id = ?`, [invoiceId])

    for (const row of items) {
      const materialId = row[0]
      recalculateStockLevel(db, warehouseId, materialId)
    }

    db.run('COMMIT')
    persistDatabase(db)
    return listPurchaseInvoices()
  } catch (error) {
    try {
      db.run('ROLLBACK')
    } catch (rollbackError) {
      console.error('ROLLBACK DELETE PURCHASE INVOICE FAILED', rollbackError)
    }
    console.error('DELETE PURCHASE INVOICE ERROR', error)
    throw error
  }
}

export function completePurchaseInvoice(invoiceId) {
  const db = getDatabase()
  const now = new Date().toISOString()
  let stage = 'start'

  try {
    stage = 'begin'
    db.run('BEGIN')

    stage = 'load-invoice'
    const header = db.exec(
      `SELECT id, invoice_number, date, supplier_id, warehouse_id, status, discount_type, discount_value, expenses, notes
       FROM purchase_invoices WHERE id = ?`,
      [invoiceId]
    )[0]?.values?.[0]
    if (!header) {
      throw new Error('فاتورة الشراء غير موجودة.')
    }
    if (header[5] === 'completed') {
      throw new Error('الفاتورة معتمدة مسبقاً.')
    }

    stage = 'build-payload'
    const payload = {
      supplierId: header[3],
      warehouseId: header[4],
      date: header[2],
      discountType: header[6],
      discountValue: header[7],
      expenses: Number(header[8] ?? 0),
      supplierInvoiceNumber: null,
      notes: header[9] ?? null,
      items: db.exec(
        `SELECT material_id, quantity, unit_price, unit, notes
         FROM purchase_invoice_items WHERE invoice_id = ? ORDER BY rowid`,
        [invoiceId]
      )[0]?.values?.map((row) => ({
        materialId: row[0],
        quantity: Number(row[1]),
        unitPrice: Number(row[2]),
        unit: row[3] ?? '',
        notes: row[4] ?? '',
      })) ?? [],
    }

    stage = 'validate'
    const validated = validatePurchaseInvoiceCore(db, payload)
    const movementReference = String(header[1])
    const movementExists = db.exec(
      `SELECT id FROM stock_movement_documents WHERE reference = ?`,
      [movementReference]
    )[0]?.values?.[0]?.[0]
    if (movementExists) {
      throw new Error('لا يمكن اعتماد الفاتورة لأن المرجع مستخدم مسبقاً في حركة مخزنية.')
    }

    stage = 'insert-movement-document'
    db.run(
      `INSERT INTO stock_movement_documents (id, reference, type, date, from_warehouse_id, to_warehouse_id, notes, created_by, created_at, status)
       VALUES (?, ?, 'purchase', ?, NULL, ?, ?, ?, ?, 'completed')`,
      [`doc-${crypto.randomUUID()}`, movementReference, validated.date, validated.warehouse.id, normalizeDocumentNote(validated.notes), 'purchases-module', now]
    )

    stage = 'insert-movement-lines'
    for (let index = 0; index < validated.items.length; index++) {
      const item = validated.items[index]
      const netUnitPrice = Number(item.netUnitPrice ?? item.unitPrice ?? 0)
      db.run(
        `INSERT INTO stock_movements (id, document_reference, type, reference, warehouse_id, material_id, quantity_in, quantity_out, unit, cost, notes, created_at, created_by)
         VALUES (?, ?, 'purchase', ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`,
        [
          `${movementReference}-${index}`,
          movementReference,
          movementReference,
          validated.warehouse.id,
          item.materialId,
          item.quantity,
          item.unit,
          netUnitPrice,
          item.notes || null,
          now,
          'purchases-module',
        ]
      )
    }

    stage = 'update-stock-levels'
    for (let index = 0; index < validated.items.length; index++) {
      const item = validated.items[index]
      recalculateStockLevel(db, validated.warehouse.id, item.materialId)
    }

    stage = 'update-invoice-status'
    db.run(
      `UPDATE purchase_invoices
       SET status = 'completed', subtotal = ?, discount_type = ?, discount_value = ?, discount_amount = ?, net_total = ?, expenses = ?, updated_at = ?
       WHERE id = ?`,
      [validated.subtotal, validated.discountType, validated.discountValue, validated.discountAmount, validated.netTotal, validated.expenses, now, invoiceId]
    )

    stage = 'commit'
    db.run('COMMIT')
    persistDatabase(db)

    stage = 'load-result'
    return getPurchaseInvoiceById(invoiceId)
  } catch (error) {
    try {
      db.run('ROLLBACK')
    } catch (rollbackError) {
      console.error('ROLLBACK COMPLETE PURCHASE INVOICE FAILED', rollbackError)
    }
    console.error('COMPLETE PURCHASE INVOICE ERROR', {
      stage,
      invoiceId,
      error,
    })
    throw error
  }
}

export function cancelPurchaseInvoice(invoiceId) {
  const db = getDatabase()
  const now = new Date().toISOString()

  try {
    db.run('BEGIN')

    const header = db.exec(
      `SELECT id, invoice_number, warehouse_id, status FROM purchase_invoices WHERE id = ?`,
      [invoiceId]
    )[0]?.values?.[0]
    if (!header) {
      throw new Error('فاتورة الشراء غير موجودة.')
    }
    if (header[3] === 'cancelled') {
      throw new Error('الفاتورة ملغاة مسبقاً.')
    }
    if (header[3] !== 'completed') {
      throw new Error('لا يمكن إلغاء فاتورة غير معتمدة.')
    }

    const paymentCount = db.exec(
      `SELECT COUNT(1) FROM purchase_payments WHERE invoice_id = ?`,
      [invoiceId]
    )[0]?.values?.[0]?.[0] ?? 0
    if (Number(paymentCount) > 0) {
      throw new Error('لا يمكن إلغاء الفاتورة لوجود دفعات مسجلة عليها. احذف الدفعات أولاً ثم أعد المحاولة.')
    }

    const invoiceNumber = String(header[1])
    const warehouseId = String(header[2])
    const items = db.exec(
      `SELECT material_id, quantity, unit_price, unit, notes
       FROM purchase_invoice_items WHERE invoice_id = ? ORDER BY rowid`,
      [invoiceId]
    )[0]?.values ?? []

    if (items.length === 0) {
      throw new Error('لا يمكن إلغاء الفاتورة لعدم وجود مواد.')
    }

    for (const row of items) {
      const materialId = row[0]
      const qty = Number(row[1] ?? 0)
      const available = computeAvailableQuantity(db, warehouseId, materialId)
      if (available < qty) {
        throw new Error('لا يمكن إلغاء الفاتورة لأن جزءاً من الكميات المشتراة تم استخدامه أو صرفه من المخزون.')
      }
    }

    db.run(
      `UPDATE stock_movement_documents
       SET status = 'cancelled', notes = COALESCE(notes, '') || ' | إلغاء الفاتورة'
       WHERE reference = ?`,
      [invoiceNumber]
    )

    for (let index = 0; index < items.length; index++) {
      const row = items[index]
      const materialId = row[0]
      recalculateStockLevel(db, warehouseId, materialId)
    }

    db.run(`UPDATE purchase_invoices SET status = 'cancelled', updated_at = ? WHERE id = ?`, [now, invoiceId])

    db.run('COMMIT')
    persistDatabase(db)
    return getPurchaseInvoiceById(invoiceId)
  } catch (error) {
    try {
      db.run('ROLLBACK')
    } catch (rollbackError) {
      console.error('ROLLBACK CANCEL PURCHASE INVOICE FAILED', rollbackError)
    }
    console.error('CANCEL PURCHASE INVOICE ERROR', error)
    throw error
  }
}

export function addPurchasePayment(invoiceId, payload = {}) {
  const db = getDatabase()
  const amount = Number(payload.amount ?? 0)
  const date = String(payload.date ?? '').trim()
  const notes = String(payload.notes ?? '').trim()
  const paymentMethod = String(payload.paymentMethod ?? '').trim()

  if (!invoiceId) {
    throw new Error('لم يتم تحديد الفاتورة.')
  }
  if (!date) {
    throw new Error('تاريخ الدفعة مطلوب.')
  }
  if (!paymentMethod) {
    throw new Error('طريقة الدفع مطلوبة.')
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('قيمة الدفعة يجب أن تكون أكبر من صفر.')
  }

  const invoice = db.exec(
    `SELECT id, status, net_total FROM purchase_invoices WHERE id = ?`,
    [invoiceId]
  )[0]?.values?.[0]
  if (!invoice) {
    throw new Error('فاتورة الشراء غير موجودة.')
  }
  if (invoice[1] !== 'completed') {
    throw new Error('يمكن تسجيل الدفعات فقط على فواتير معتمدة.')
  }

  const summary = getPurchasePaymentSummary(db, invoiceId, Number(invoice[2] ?? 0))
  if (amount > Number(summary.remainingAmount ?? 0) + 0.000001) {
    throw new Error('لا يمكن تسجيل دفعة تتجاوز المبلغ المتبقي على الفاتورة.')
  }

  const paymentId = `pp-${crypto.randomUUID()}`
  const createdAt = new Date().toISOString()

  db.run(
    `INSERT INTO purchase_payments (id, invoice_id, date, amount, notes, payment_method, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [paymentId, invoiceId, date, normalizeMoney(amount), notes || null, paymentMethod, createdAt]
  )
  persistDatabase(db)

  const payment = db.exec(
    `SELECT id, invoice_id, date, amount, notes, payment_method, created_at
     FROM purchase_payments WHERE id = ?`,
    [paymentId]
  )[0]?.values?.[0]

  if (!payment) {
    throw new Error('تعذر حفظ الدفعة.')
  }

  return {
    id: payment[0],
    invoiceId: payment[1],
    date: payment[2],
    amount: normalizeMoney(Number(payment[3] ?? 0)),
    notes: payment[4] ?? '',
    paymentMethod: payment[5] ?? '',
    createdAt: payment[6],
  }
}

export function deletePurchasePayment(paymentId) {
  const db = getDatabase()

  const payment = db.exec(
    `SELECT id, invoice_id, date, amount, notes, payment_method, created_at
     FROM purchase_payments WHERE id = ?`,
    [paymentId]
  )[0]?.values?.[0]

  if (!payment) {
    throw new Error('الدفع غير موجود.')
  }

  const invoice = db.exec(
    `SELECT id, status FROM purchase_invoices WHERE id = ?`,
    [payment[1]]
  )[0]?.values?.[0]
  if (!invoice) {
    throw new Error('الفاتورة المرتبطة بالدفع غير موجودة.')
  }
  if (invoice[1] !== 'completed') {
    throw new Error('لا يمكن حذف دفعة من فاتورة غير معتمدة.')
  }

  db.run(`DELETE FROM purchase_payments WHERE id = ?`, [paymentId])
  persistDatabase(db)

  return {
    id: payment[0],
    invoiceId: payment[1],
    date: payment[2],
    amount: normalizeMoney(Number(payment[3] ?? 0)),
    notes: payment[4] ?? '',
    paymentMethod: payment[5] ?? '',
    createdAt: payment[6],
  }
}

function getStockLevel(db, warehouseId, materialId) {
  return db.exec(`SELECT quantity FROM stock_levels WHERE warehouse_id = ? AND material_id = ?`, [warehouseId, materialId])[0]?.values?.[0]?.[0]
}

function ensureMaterialExists(db, materialId) {
  const exists = db.exec(`SELECT 1 FROM materials WHERE id = ? AND status <> 'deleted'`, [materialId])[0]?.values?.[0]?.[0]
  return Boolean(exists)
}

function ensureWarehouseExists(db, warehouseId) {
  const row = db.exec(`SELECT id, status FROM warehouses WHERE id = ?`, [warehouseId])[0]?.values?.[0]
  if (!row) return null
  return { id: row[0], status: row[1] }
}

// Weighted-average costing: purchases/opening/production-in/transfer-in raise the average using their cost,
// sales/adjustment-out/transfer-out only reduce quantity and never change the average.
// Recomputed from the full completed-movement ledger so cancellations (in any order) always land on the correct figures.
function recalculateStockLevel(db, warehouseId, materialId) {
  const now = new Date().toISOString()
  const rows = db.exec(
    `SELECT sm.quantity_in, sm.quantity_out, sm.cost
     FROM stock_movements sm
     JOIN stock_movement_documents smd ON smd.reference = sm.document_reference
     WHERE sm.warehouse_id = ? AND sm.material_id = ? AND smd.status = 'completed'
     ORDER BY sm.created_at ASC, sm.rowid ASC`,
    [warehouseId, materialId]
  )[0]?.values ?? []

  let quantity = 0
  let averageCost = 0

  for (const row of rows) {
    const quantityIn = Number(row[0] ?? 0)
    const quantityOut = Number(row[1] ?? 0)
    const cost = row[2] === null || row[2] === undefined ? null : Number(row[2])

    if (quantityIn > 0) {
      const incomingCost = cost !== null && !Number.isNaN(cost) ? cost : averageCost
      const newQuantity = quantity + quantityIn
      averageCost = newQuantity > 0 ? (quantity * averageCost + quantityIn * incomingCost) / newQuantity : 0
      quantity = newQuantity
    }

    if (quantityOut > 0) {
      quantity -= quantityOut
    }
  }

  db.run(
    `INSERT INTO stock_levels (warehouse_id, material_id, quantity, average_cost, reserved, last_updated_at)
     VALUES (?, ?, ?, ?, 0, ?)
     ON CONFLICT(warehouse_id, material_id) DO UPDATE SET quantity = excluded.quantity, average_cost = excluded.average_cost, last_updated_at = excluded.last_updated_at`,
    [warehouseId, materialId, quantity, averageCost, now]
  )

  return { quantity, averageCost }
}

function getAverageCost(db, warehouseId, materialId) {
  const row = db.exec(`SELECT average_cost FROM stock_levels WHERE warehouse_id = ? AND material_id = ?`, [warehouseId, materialId])[0]?.values?.[0]
  return row ? Number(row[0] ?? 0) : 0
}

function buildAdjustmentReference(db) {
  return generateSequentialReference(db, 'ADJ')
}

function parseAdjustmentSnapshot(rawNotes) {
  if (!rawNotes) return null

  try {
    const parsed = JSON.parse(rawNotes)
    if (parsed && typeof parsed === 'object') {
      if (parsed.snapshot && typeof parsed.snapshot === 'object') {
        return parsed.snapshot
      }
      return parsed
    }
  } catch (error) {
    return null
  }

  return null
}

function normalizeAdjustmentItemNotes(itemNotes, snapshot) {
  const payload = {
    snapshot,
    lineNotes: typeof itemNotes === 'string' ? itemNotes.trim() : '',
  }

  return JSON.stringify(payload)
}

function parseAdjustmentMovementRow(row) {
  const snapshot = parseAdjustmentSnapshot(row.notes)
  return {
    materialId: row.material_id,
    materialNumber: row.material_number,
    materialName: row.material_name,
    warehouseId: row.warehouse_id,
    warehouseName: row.warehouse_name,
    quantityIn: Number(row.quantity_in ?? 0),
    quantityOut: Number(row.quantity_out ?? 0),
    unit: row.unit ?? '',
    cost: row.cost == null ? null : Number(row.cost),
    notes: snapshot && snapshot.lineNotes ? snapshot.lineNotes : row.notes ?? '',
    systemQuantity: snapshot && Number.isFinite(Number(snapshot.systemQuantity)) ? Number(snapshot.systemQuantity) : 0,
    countedQuantity: snapshot && Number.isFinite(Number(snapshot.countedQuantity)) ? Number(snapshot.countedQuantity) : 0,
    difference: snapshot && Number.isFinite(Number(snapshot.difference)) ? Number(snapshot.difference) : 0,
    unitCost: snapshot && Number.isFinite(Number(snapshot.unitCost)) ? Number(snapshot.unitCost) : 0,
  }
}

function parseOpeningCost(value) {
  if (value === undefined || value === null || value === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function computeAvailableQuantity(db, warehouseId, materialId) {
  const qty = getStockLevel(db, warehouseId, materialId)
  return Number(qty ?? 0)
}

function getOriginalInvoiceNumberDisplay(invoiceNumber, originalInvoiceNumber, invoiceExists = true) {

  const currentInvoiceNumber = String(invoiceNumber ?? '').trim()

  if (invoiceExists && currentInvoiceNumber) {
    return currentInvoiceNumber
  }

  return 'تم حذف الفاتورة الأصلية'
}

function generateSequentialReference(db, prefix) {
  const rows = db.exec(
    `SELECT reference FROM stock_movement_documents WHERE reference LIKE ? ORDER BY reference`,
    [`${prefix}-%`]
  )[0]?.values ?? []

  let maxNumber = 0
  for (const row of rows) {
    const value = String(row[0] ?? '')
    const match = value.match(new RegExp(`^${prefix}-(\\d+)$`))
    if (match) {
      const number = Number(match[1])
      if (!Number.isNaN(number) && number > maxNumber) {
        maxNumber = number
      }
    }
  }

  return `${prefix}-${String(maxNumber + 1).padStart(6, '0')}`
}

function validateMovementDocument(db, doc) {
  if (!doc.reference || !String(doc.reference).trim()) {
    throw new Error('A document reference is required.')
  }

  if (!doc.type || !['purchase','sale','purchase_return','sale_return','transfer','adjustment','production'].includes(doc.type)) {
    throw new Error('A valid movement type is required.')
  }

  if (!Array.isArray(doc.items) || doc.items.length === 0) {
    throw new Error('The movement document must contain at least one material line.')
  }

  if (doc.type === 'sale' && !doc.fromWarehouseId) {
    throw new Error('The source warehouse is required for sales.')
  }

  if (doc.type === 'purchase' && !doc.toWarehouseId) {
    throw new Error('The destination warehouse is required for purchases.')
  }

  if (doc.type === 'transfer' && (!doc.fromWarehouseId || !doc.toWarehouseId)) {
    throw new Error('Both source and destination warehouses are required for transfers.')
  }

  if (doc.type === 'transfer' && doc.fromWarehouseId === doc.toWarehouseId) {
    throw new Error('Source and destination warehouses must be different for transfers.')
  }

  if (doc.type === 'adjustment' && !doc.fromWarehouseId && !doc.toWarehouseId) {
    throw new Error('A warehouse is required for adjustments.')
  }

  for (const item of doc.items) {
    if (!item.materialId || !ensureMaterialExists(db, item.materialId)) {
      throw new Error(`Material not found: ${item.materialId}`)
    }

    const materialRow = db.exec(`SELECT id, is_non_stock FROM materials WHERE id = ?`, [item.materialId])[0]?.values?.[0]
    if (materialRow && Number(materialRow[1]) === 1) {
      throw new Error(`Material ${item.materialId} is configured as non-stock and cannot be used in inventory movements.`)
    }

    const quantity = Number(item.quantity)
    if (Number.isNaN(quantity) || quantity === 0) {
      throw new Error(`Invalid quantity for material ${item.materialId}`)
    }
    if (doc.type !== 'adjustment' && quantity < 0) {
      throw new Error(`Quantity must be positive for movement type ${doc.type} and material ${item.materialId}`)
    }
  }
}

function generateReturnReference(db, prefix) {
  const rows = db.exec(
    `SELECT return_number FROM purchase_returns WHERE return_number LIKE ? UNION ALL SELECT return_number FROM sales_returns WHERE return_number LIKE ? UNION ALL SELECT reference FROM stock_movement_documents WHERE reference LIKE ? ORDER BY 1`,
    [`${prefix}-%`, `${prefix}-%`, `${prefix}-%`]
  )[0]?.values ?? []

  let maxNumber = 0
  for (const row of rows) {
    const value = String(row[0] ?? '')
    const match = value.match(new RegExp(`^${prefix}-(\\d+)$`))
    if (match) {
      const number = Number(match[1])
      if (number > maxNumber) maxNumber = number
    }
  }

  return `${prefix}-${String(maxNumber + 1).padStart(6, '0')}`
}

function getPurchaseInvoiceLineCost(db, invoiceId, materialId) {
  const invoiceNumber = db.exec(
    `SELECT invoice_number FROM purchase_invoices WHERE id = ?`,
    [invoiceId]
  )[0]?.values?.[0]?.[0]
  if (!invoiceNumber) return 0

  const cost = db.exec(
    `SELECT cost FROM stock_movements WHERE document_reference = ? AND material_id = ? AND type = 'purchase' ORDER BY rowid DESC LIMIT 1`,
    [invoiceNumber, materialId]
  )[0]?.values?.[0]?.[0]

  return Number(cost ?? 0)
}

function getSalesInvoiceLineCost(db, invoiceId, materialId) {
  const invoiceNumber = db.exec(
    `SELECT invoice_number FROM sales_invoices WHERE id = ?`,
    [invoiceId]
  )[0]?.values?.[0]?.[0]
  if (!invoiceNumber) return 0

  const cost = db.exec(
    `SELECT cost FROM stock_movements WHERE document_reference = ? AND material_id = ? AND type = 'sale' ORDER BY rowid DESC LIMIT 1`,
    [invoiceNumber, materialId]
  )[0]?.values?.[0]?.[0]

  return Number(cost ?? 0)
}

export function listPurchaseReturns(filter = {}) {
  const db = getDatabase()
  const { supplierId, warehouseId, status, fromDate, toDate, reference } = filter
  const clauses = []
  const params = []

  if (supplierId) { clauses.push('pr.supplier_id = ?'); params.push(supplierId) }
  if (warehouseId) { clauses.push('pr.warehouse_id = ?'); params.push(warehouseId) }
  if (status) { clauses.push('pr.status = ?'); params.push(status) }
  if (fromDate) { clauses.push('pr.date >= ?'); params.push(fromDate) }
  if (toDate) { clauses.push('pr.date <= ?'); params.push(toDate) }
  if (reference) { clauses.push('(pr.return_number LIKE ? OR supplier.name LIKE ?)'); params.push(`%${reference}%`, `%${reference}%`) }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''

  const rows = db.exec(
    `SELECT pr.id, pr.return_number, pr.date, pr.supplier_id, supplier.name, pr.warehouse_id, warehouse.name, pr.purchase_invoice_id, pi.invoice_number, pr.original_invoice_number, pr.net_total, pr.status, pr.created_at, pr.updated_at
     FROM purchase_returns pr
     LEFT JOIN suppliers supplier ON supplier.id = pr.supplier_id
     LEFT JOIN warehouses warehouse ON warehouse.id = pr.warehouse_id
     LEFT JOIN purchase_invoices pi ON pi.id = pr.purchase_invoice_id
     ${where}
     ORDER BY pr.date DESC, pr.return_number DESC`,
    params
  )[0]?.values ?? []

  return rows.map((row) => ({
    id: row[0],
    returnNumber: row[1],
    date: row[2],
    supplierId: row[3],
    supplierName: row[4] ?? '-',
    warehouseId: row[5],
    warehouseName: row[6] ?? '-',
    purchaseInvoiceId: row[7],
    purchaseInvoiceNumber: getOriginalInvoiceNumberDisplay(row[8], row[9]),
    netTotal: Number(row[10] ?? 0),
    status: row[11],
    createdAt: row[12],
    updatedAt: row[13],
  }))
}

export function getPurchaseReturnById(returnId) {
  const db = getDatabase()
  const header = db.exec(
    `SELECT pr.id, pr.return_number, pr.date, pr.supplier_id, supplier.name, supplier.code, pr.warehouse_id, warehouse.name, pr.purchase_invoice_id, pi.invoice_number, pr.original_invoice_number, pr.notes, pr.subtotal, pr.discount_amount, pr.net_total, pr.status, pr.created_at, pr.updated_at
     FROM purchase_returns pr
     LEFT JOIN suppliers supplier ON supplier.id = pr.supplier_id
     LEFT JOIN warehouses warehouse ON warehouse.id = pr.warehouse_id
     LEFT JOIN purchase_invoices pi ON pi.id = pr.purchase_invoice_id
     WHERE pr.id = ?`,
    [returnId]
  )[0]?.values?.[0]
  if (!header) throw new Error('مرتجع الشراء غير موجود.')

  const items = db.exec(
    `SELECT pri.id, pri.material_id, m.material_number, m.name, pri.quantity, pri.unit, pri.unit_price, pri.line_total, pri.notes
     FROM purchase_return_items pri
     LEFT JOIN materials m ON m.id = pri.material_id
     WHERE pri.return_id = ? ORDER BY pri.rowid`,
    [returnId]
  )[0]?.values ?? []

  return {
    id: header[0],
    returnNumber: header[1],
    date: header[2],
    supplierId: header[3],
    supplierName: header[4] ?? '',
    supplierCode: header[5] ?? '',
    warehouseId: header[6],
    warehouseName: header[7] ?? '',
    purchaseInvoiceId: header[8],
    purchaseInvoiceNumber: getOriginalInvoiceNumberDisplay(header[9], header[10]),
    notes: header[11] ?? '',
    subtotal: Number(header[12] ?? 0),
    discountAmount: Number(header[13] ?? 0),
    netTotal: Number(header[14] ?? 0),
    status: header[15],
    createdAt: header[16],
    updatedAt: header[17],
    items: items.map((row) => ({
      id: row[0],
      materialId: row[1],
      materialNumber: row[2] ?? '',
      materialName: row[3] ?? '',
      quantity: Number(row[4] ?? 0),
      unit: row[5] ?? '',
      unitPrice: Number(row[6] ?? 0),
      lineTotal: Number(row[7] ?? 0),
      notes: row[8] ?? '',
    })),
  }
}

export function createPurchaseReturn(payload = {}) {
  const db = getDatabase()
  const now = new Date().toISOString()
  const returnId = payload.id ?? `prt-${crypto.randomUUID()}`

  try {
    db.run('BEGIN')

    const supplierId = String(payload.supplierId ?? '').trim()
    const warehouseId = String(payload.warehouseId ?? '').trim()
    const purchaseInvoiceId = String(payload.purchaseInvoiceId ?? '').trim()
    const date = String(payload.date ?? '').trim() || now.slice(0, 10)
    const items = Array.isArray(payload.items) ? payload.items : []

    if (!supplierId || !warehouseId || !purchaseInvoiceId) {
      throw new Error('بيانات مرتجع الشراء غير مكتملة.')
    }
    if (items.length === 0) {
      throw new Error('يجب إدخال مادة واحدة على الأقل في المرتجع.')
    }

    const invoice = db.exec(
      `SELECT id, invoice_number, warehouse_id, supplier_id, status FROM purchase_invoices WHERE id = ?`,
      [purchaseInvoiceId]
    )[0]?.values?.[0]
    if (!invoice) throw new Error('فاتورة الشراء الأصلية غير موجودة.')
    if (invoice[4] !== 'completed') throw new Error('يمكن إنشاء المرتجعات فقط على فواتير مشتريات معتمدة.')
    if (String(invoice[2]) !== warehouseId) throw new Error('المخزن المختار لا يطابق مخزن الفاتورة الأصلية.')
    if (String(invoice[3]) !== supplierId) throw new Error('المورد المختار لا يطابق المورد في الفاتورة الأصلية.')

    const seen = new Set()
    let subtotal = 0
    const prepared = items.map((item) => {
      const materialId = String(item.materialId ?? '').trim()
      const quantity = Number(item.quantity ?? 0)
      if (!materialId) throw new Error('المادة غير موجودة في المرتجع.')
      if (seen.has(materialId)) throw new Error('المادة مكررة في المرتجع.')
      seen.add(materialId)
      if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('كميات المرتجع يجب أن تكون أكبر من صفر.')

      const invoiceItemRow = db.exec(
        `SELECT quantity, unit, unit_price FROM purchase_invoice_items WHERE invoice_id = ? AND material_id = ?`,
        [purchaseInvoiceId, materialId]
      )[0]?.values?.[0]
      if (!invoiceItemRow) throw new Error('المادة غير موجودة في الفاتورة الأصلية.')

      const invoicedQty = Number(invoiceItemRow[0] ?? 0)
      const returnedQty = Number(db.exec(
        `SELECT COALESCE(SUM(pri.quantity), 0) FROM purchase_return_items pri JOIN purchase_returns pr ON pr.id = pri.return_id WHERE pr.purchase_invoice_id = ? AND pri.material_id = ?`,
        [purchaseInvoiceId, materialId]
      )[0]?.values?.[0]?.[0] ?? 0)
      const remainingQty = invoicedQty - returnedQty
      if (quantity > remainingQty + 0.000001) {
        throw new Error(`لا يمكن إرجاع أكثر من ${remainingQty} وحدة من المادة ${materialId}.`)
      }

      const unitPrice = Number(item.unitPrice ?? getPurchaseInvoiceLineCost(db, purchaseInvoiceId, materialId) ?? Number(invoiceItemRow[2] ?? 0))
      const lineTotal = normalizeMoney(quantity * unitPrice)
      subtotal += lineTotal

      return {
        materialId,
        quantity,
        unit: String(item.unit ?? invoiceItemRow[1] ?? '').trim(),
        unitPrice,
        lineTotal,
        notes: String(item.notes ?? '').trim(),
      }
    })

    const returnNumber = String(payload.returnNumber ?? '').trim() || generateReturnReference(db, 'PRT')
    const existingReturn = db.exec(`SELECT 1 FROM purchase_returns WHERE return_number = ?`, [returnNumber])[0]?.values?.[0]?.[0]
    if (existingReturn) throw new Error(`مرجع مرتجع الشراء ${returnNumber} مستخدم مسبقاً.`)

    const returnNotes = normalizeDocumentNote(payload.notes)
    const totalDiscount = 0
    const netTotal = normalizeMoney(subtotal - totalDiscount)
    const originalInvoiceNumber = String(invoice[1] ?? '').trim()

    db.run(
      `INSERT INTO purchase_returns (id, return_number, date, supplier_id, warehouse_id, purchase_invoice_id, original_invoice_number, notes, subtotal, discount_amount, net_total, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?)` ,
      [returnId, returnNumber, date, supplierId, warehouseId, purchaseInvoiceId, originalInvoiceNumber || null, returnNotes, normalizeMoney(subtotal), normalizeMoney(totalDiscount), netTotal, now, now]
    )

    db.run(
      `INSERT INTO stock_movement_documents (id, reference, type, date, from_warehouse_id, to_warehouse_id, notes, created_by, created_at, status)
       VALUES (?, ?, 'purchase_return', ?, ?, NULL, ?, ?, ?, 'completed')`,
      [`doc-${crypto.randomUUID()}`, returnNumber, date, warehouseId, returnNotes, 'purchases-module', now]
    )

    const affectedMaterials = new Set()
    for (const item of prepared) {
      const itemId = `prti-${crypto.randomUUID()}`
      db.run(
        `INSERT INTO purchase_return_items (id, return_id, material_id, quantity, unit, unit_price, line_total, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [itemId, returnId, item.materialId, item.quantity, item.unit || null, normalizeMoney(item.unitPrice), normalizeMoney(item.lineTotal), item.notes || null]
      )

      db.run(
        `INSERT INTO stock_movements (id, document_reference, type, reference, warehouse_id, material_id, quantity_in, quantity_out, unit, cost, notes, created_at, created_by)
         VALUES (?, ?, 'purchase_return', ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`,
        [`${returnNumber}-${item.materialId}`, returnNumber, returnNumber, warehouseId, item.materialId, item.quantity, item.unit || null, normalizeMoney(item.unitPrice), item.notes || null, now, 'purchases-module']
      )

      affectedMaterials.add(item.materialId)
    }

    for (const materialId of affectedMaterials) {
      recalculateStockLevel(db, warehouseId, materialId)
    }

    db.run('COMMIT')
    persistDatabase(db)
    return getPurchaseReturnById(returnId)
  } catch (error) {
    try { db.run('ROLLBACK') } catch (e) {}
    console.error('CREATE PURCHASE RETURN ERROR', error)
    throw error
  }
}

export function updatePurchaseReturn(returnId, payload = {}) {
  const db = getDatabase()
  const now = new Date().toISOString()
  const current = db.exec(
    `SELECT id, return_number, date, supplier_id, warehouse_id, purchase_invoice_id, notes
     FROM purchase_returns WHERE id = ?`,
    [returnId]
  )[0]?.values?.[0]

  if (!current) throw new Error('مرتجع الشراء غير موجود.')

  const safePayload = payload && typeof payload === 'object' ? payload : {}
  const items = Array.isArray(safePayload.items) ? safePayload.items : []
  const allowedSupplierId = String(safePayload.supplierId ?? current[3] ?? '').trim() || String(current[3] ?? '').trim()
  const allowedWarehouseId = String(safePayload.warehouseId ?? current[4] ?? '').trim() || String(current[4] ?? '').trim()
  const allowedInvoiceId = String(safePayload.purchaseInvoiceId ?? current[5] ?? '').trim() || String(current[5] ?? '').trim()
  const returnDate = String(safePayload.date ?? current[2] ?? '').trim() || now.slice(0, 10)
  const originalReturnNumber = String(current[1] ?? '').trim()

  if (!allowedSupplierId || !allowedWarehouseId || !allowedInvoiceId) {
    throw new Error('بيانات مرتجع الشراء غير مكتملة.')
  }
  if (items.length === 0) {
    throw new Error('يجب إدخال مادة واحدة على الأقل في المرتجع.')
  }

  const invoice = db.exec(
    `SELECT id, invoice_number, warehouse_id, supplier_id, status FROM purchase_invoices WHERE id = ?`,
    [allowedInvoiceId]
  )[0]?.values?.[0]
  if (!invoice) throw new Error('فاتورة الشراء الأصلية غير موجودة.')
  if (invoice[4] !== 'completed') throw new Error('يمكن إنشاء المرتجعات فقط على فواتير مشتريات معتمدة.')
  if (String(invoice[2]) !== allowedWarehouseId) throw new Error('المخزن المختار لا يطابق مخزن الفاتورة الأصلية.')
  if (String(invoice[3]) !== allowedSupplierId) throw new Error('المورد المختار لا يطابق المورد في الفاتورة الأصلية.')

  const existingItems = db.exec(
    `SELECT material_id, quantity FROM purchase_return_items WHERE return_id = ?`,
    [returnId]
  )[0]?.values ?? []
  const previousQuantities = new Map(existingItems.map((row) => [String(row[0] ?? '').trim(), Number(row[1] ?? 0)]))

  const seen = new Set()
  let subtotal = 0
  const prepared = items.map((item) => {
    const materialId = String(item.materialId ?? '').trim()
    const quantity = Number(item.quantity ?? 0)
    if (!materialId) throw new Error('المادة غير موجودة في المرتجع.')
    if (seen.has(materialId)) throw new Error('المادة مكررة في المرتجع.')
    seen.add(materialId)
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('كميات المرتجع يجب أن تكون أكبر من صفر.')

    const invoiceItemRow = db.exec(
      `SELECT quantity, unit, unit_price FROM purchase_invoice_items WHERE invoice_id = ? AND material_id = ?`,
      [allowedInvoiceId, materialId]
    )[0]?.values?.[0]
    if (!invoiceItemRow) throw new Error('المادة غير موجودة في الفاتورة الأصلية.')

    const invoicedQty = Number(invoiceItemRow[0] ?? 0)
    const otherReturnsQty = Number(db.exec(
      `SELECT COALESCE(SUM(pri.quantity), 0) FROM purchase_return_items pri JOIN purchase_returns pr ON pr.id = pri.return_id WHERE pr.purchase_invoice_id = ? AND pri.material_id = ? AND pr.id != ?`,
      [allowedInvoiceId, materialId, returnId]
    )[0]?.values?.[0]?.[0] ?? 0)
    const currentQty = previousQuantities.get(materialId) ?? 0
    const remainingQty = invoicedQty - otherReturnsQty
    if (quantity > remainingQty + currentQty + 0.000001) {
      throw new Error(`لا يمكن إرجاع أكثر من ${remainingQty + currentQty} وحدة من المادة ${materialId}.`)
    }

    const unitPrice = Number(item.unitPrice ?? getPurchaseInvoiceLineCost(db, allowedInvoiceId, materialId) ?? Number(invoiceItemRow[2] ?? 0))
    const lineTotal = normalizeMoney(quantity * unitPrice)
    subtotal += lineTotal

    return {
      materialId,
      quantity,
      unit: String(item.unit ?? invoiceItemRow[1] ?? '').trim(),
      unitPrice,
      lineTotal,
      notes: String(item.notes ?? '').trim(),
    }
  })

  try {
    db.run('BEGIN')

    const returnNotes = normalizeDocumentNote(safePayload.notes ?? current[6])
    const netTotal = normalizeMoney(subtotal)

    db.run(`DELETE FROM stock_movements WHERE document_reference = ?`, [originalReturnNumber])
    db.run(`DELETE FROM stock_movement_documents WHERE reference = ?`, [originalReturnNumber])
    db.run(`DELETE FROM purchase_return_items WHERE return_id = ?`, [returnId])

    const affectedMaterials = new Set()
    for (const item of prepared) {
      const itemId = `prti-${crypto.randomUUID()}`
      db.run(
        `INSERT INTO purchase_return_items (id, return_id, material_id, quantity, unit, unit_price, line_total, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)` ,
        [itemId, returnId, item.materialId, item.quantity, item.unit || null, normalizeMoney(item.unitPrice), normalizeMoney(item.lineTotal), item.notes || null]
      )

      db.run(
        `INSERT INTO stock_movements (id, document_reference, type, reference, warehouse_id, material_id, quantity_in, quantity_out, unit, cost, notes, created_at, created_by)
         VALUES (?, ?, 'purchase_return', ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)` ,
        [`${originalReturnNumber}-${item.materialId}`, originalReturnNumber, originalReturnNumber, allowedWarehouseId, item.materialId, item.quantity, item.unit || null, normalizeMoney(item.unitPrice), item.notes || null, now, 'purchases-module']
      )

      affectedMaterials.add(item.materialId)
    }

    const originalInvoiceNumber = String(invoice[1] ?? '').trim()

    db.run(
      `UPDATE purchase_returns
       SET date = ?, supplier_id = ?, warehouse_id = ?, purchase_invoice_id = ?, original_invoice_number = ?, notes = ?, subtotal = ?, discount_amount = 0, net_total = ?, updated_at = ?
       WHERE id = ?`,
      [returnDate, allowedSupplierId, allowedWarehouseId, allowedInvoiceId, originalInvoiceNumber || null, returnNotes, normalizeMoney(subtotal), netTotal, now, returnId]
    )

    db.run(
      `INSERT INTO stock_movement_documents (id, reference, type, date, from_warehouse_id, to_warehouse_id, notes, created_by, created_at, status)
       VALUES (?, ?, 'purchase_return', ?, ?, NULL, ?, ?, ?, 'completed')` ,
      [`doc-${crypto.randomUUID()}`, originalReturnNumber, returnDate, allowedWarehouseId, returnNotes, 'purchases-module', now]
    )

    for (const materialId of affectedMaterials) {
      recalculateStockLevel(db, allowedWarehouseId, materialId)
    }

    db.run('COMMIT')
    persistDatabase(db)
    return getPurchaseReturnById(returnId)
  } catch (error) {
    try { db.run('ROLLBACK') } catch (e) {}
    console.error('UPDATE PURCHASE RETURN ERROR', error)
    throw error
  }
}

export function deletePurchaseReturn(returnId) {
  const db = getDatabase()
  try {
    db.run('BEGIN')
    const row = db.exec(
      `SELECT id, return_number, warehouse_id, purchase_invoice_id FROM purchase_returns WHERE id = ?`,
      [returnId]
    )[0]?.values?.[0]
    if (!row) throw new Error('مرتجع الشراء غير موجود.')

    const items = db.exec(
      `SELECT material_id, quantity, unit_price FROM purchase_return_items WHERE return_id = ?`,
      [returnId]
    )[0]?.values ?? []

    db.run(`DELETE FROM stock_movements WHERE document_reference = ?`, [row[1]])
    db.run(`DELETE FROM stock_movement_documents WHERE reference = ?`, [row[1]])
    db.run(`DELETE FROM purchase_return_items WHERE return_id = ?`, [returnId])
    db.run(`DELETE FROM purchase_returns WHERE id = ?`, [returnId])

    for (const item of items) {
      recalculateStockLevel(db, row[2], item[0])
    }

    db.run('COMMIT')
    persistDatabase(db)
    return listPurchaseReturns()
  } catch (error) {
    try { db.run('ROLLBACK') } catch (e) {}
    console.error('DELETE PURCHASE RETURN ERROR', error)
    throw error
  }
}

export function listSalesReturns(filter = {}) {
  const db = getDatabase()
  const { customerId, warehouseId, status, fromDate, toDate, reference } = filter
  const clauses = []
  const params = []

  if (customerId) { clauses.push('sr.customer_id = ?'); params.push(customerId) }
  if (warehouseId) { clauses.push('sr.warehouse_id = ?'); params.push(warehouseId) }
  if (status) { clauses.push('sr.status = ?'); params.push(status) }
  if (fromDate) { clauses.push('sr.date >= ?'); params.push(fromDate) }
  if (toDate) { clauses.push('sr.date <= ?'); params.push(toDate) }
  if (reference) { clauses.push('(sr.return_number LIKE ? OR customer.name LIKE ?)'); params.push(`%${reference}%`, `%${reference}%`) }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''

  const rows = db.exec(
    `SELECT sr.id, sr.return_number, sr.date, sr.customer_id, customer.name, sr.warehouse_id, warehouse.name, sr.sales_invoice_id, si.invoice_number, sr.original_invoice_number, sr.net_total, sr.status, sr.created_at, sr.updated_at
     FROM sales_returns sr
     LEFT JOIN customers customer ON customer.id = sr.customer_id
     LEFT JOIN warehouses warehouse ON warehouse.id = sr.warehouse_id
     LEFT JOIN sales_invoices si ON si.id = sr.sales_invoice_id
     ${where}
     ORDER BY sr.date DESC, sr.return_number DESC`,
    params
  )[0]?.values ?? []

  return rows.map((row) => ({
    id: row[0],
    returnNumber: row[1],
    date: row[2],
    customerId: row[3],
    customerName: row[4] ?? '-',
    warehouseId: row[5],
    warehouseName: row[6] ?? '-',
    salesInvoiceId: row[7],
    salesInvoiceNumber: getOriginalInvoiceNumberDisplay(row[8], row[9]),
    netTotal: Number(row[10] ?? 0),
    status: row[11],
    createdAt: row[12],
    updatedAt: row[13],
  }))
}

export function getSalesReturnById(returnId) {
  const db = getDatabase()
  const header = db.exec(
    `SELECT sr.id, sr.return_number, sr.date, sr.customer_id, customer.name, customer.code, sr.warehouse_id, warehouse.name, sr.sales_invoice_id, si.invoice_number, sr.original_invoice_number, sr.notes, sr.subtotal, sr.discount_amount, sr.net_total, sr.status, sr.created_at, sr.updated_at
     FROM sales_returns sr
     LEFT JOIN customers customer ON customer.id = sr.customer_id
     LEFT JOIN warehouses warehouse ON warehouse.id = sr.warehouse_id
     LEFT JOIN sales_invoices si ON si.id = sr.sales_invoice_id
     WHERE sr.id = ?`,
    [returnId]
  )[0]?.values?.[0]
  if (!header) throw new Error('مرتجع البيع غير موجود.')

  const items = db.exec(
    `SELECT sri.id, sri.material_id, m.material_number, m.name, sri.quantity, sri.unit, sri.unit_price, sri.line_total, sri.notes
     FROM sales_return_items sri
     LEFT JOIN materials m ON m.id = sri.material_id
     WHERE sri.return_id = ? ORDER BY sri.rowid`,
    [returnId]
  )[0]?.values ?? []

  const returns = db.exec(
    `SELECT id, return_number, date, net_total FROM sales_returns WHERE sales_invoice_id = ? ORDER BY date DESC, created_at DESC`,
    [header[8]]
  )[0]?.values ?? []

  return {
    id: header[0],
    returnNumber: header[1],
    date: header[2],
    customerId: header[3],
    customerName: header[4] ?? '',
    customerCode: header[5] ?? '',
    warehouseId: header[6],
    warehouseName: header[7] ?? '',
    salesInvoiceId: header[8],
    salesInvoiceNumber: getOriginalInvoiceNumberDisplay(header[9], header[10]),
    notes: header[11] ?? '',
    subtotal: Number(header[12] ?? 0),
    discountAmount: Number(header[13] ?? 0),
    netTotal: Number(header[14] ?? 0),
    status: header[15],
    createdAt: header[16],
    updatedAt: header[17],
    returns: returns.map((row) => ({
      id: row[0],
      returnNumber: row[1],
      date: row[2],
      netTotal: Number(row[3] ?? 0),
    })),
    items: items.map((row) => ({
      id: row[0],
      materialId: row[1],
      materialNumber: row[2] ?? '',
      materialName: row[3] ?? '',
      quantity: Number(row[4] ?? 0),
      unit: row[5] ?? '',
      unitPrice: Number(row[6] ?? 0),
      lineTotal: Number(row[7] ?? 0),
      notes: row[8] ?? '',
    })),
  }
}

export function createSalesReturn(payload = {}) {
  const db = getDatabase()
  const now = new Date().toISOString()
  const returnId = payload.id ?? `srt-${crypto.randomUUID()}`

  try {
    db.run('BEGIN')

    const customerId = String(payload.customerId ?? '').trim()
    const warehouseId = String(payload.warehouseId ?? '').trim()
    const salesInvoiceId = String(payload.salesInvoiceId ?? '').trim()
    const date = String(payload.date ?? '').trim() || now.slice(0, 10)
    const items = Array.isArray(payload.items) ? payload.items : []

    if (!customerId || !warehouseId || !salesInvoiceId) throw new Error('بيانات مرتجع البيع غير مكتملة.')
    if (items.length === 0) throw new Error('يجب إدخال مادة واحدة على الأقل في المرتجع.')

    const invoice = db.exec(
      `SELECT id, invoice_number, warehouse_id, customer_id, status, subtotal, discount_type, discount_value, net_total FROM sales_invoices WHERE id = ?`,
      [salesInvoiceId]
    )[0]?.values?.[0]
    if (!invoice) throw new Error('فاتورة البيع الأصلية غير موجودة.')
    if (invoice[4] !== 'completed') throw new Error('يمكن إنشاء المرتجعات فقط على فواتير مبيعات معتمدة.')
    if (String(invoice[2]) !== warehouseId) throw new Error('المخزن المختار لا يطابق مخزن الفاتورة الأصلية.')
    if (String(invoice[3]) !== customerId) throw new Error('العميل المختار لا يطابق العميل في الفاتورة الأصلية.')

    const seen = new Set()
    let subtotal = 0
    const prepared = items.map((item) => {
      const materialId = String(item.materialId ?? '').trim()
      const quantity = Number(item.quantity ?? 0)
      if (!materialId) throw new Error('المادة غير موجودة في المرتجع.')
      if (seen.has(materialId)) throw new Error('المادة مكررة في المرتجع.')
      seen.add(materialId)
      if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('كميات المرتجع يجب أن تكون أكبر من صفر.')

      const invoiceItemRow = db.exec(
        `SELECT quantity, unit, unit_price, line_total FROM sales_invoice_items WHERE invoice_id = ? AND material_id = ?`,
        [salesInvoiceId, materialId]
      )[0]?.values?.[0]
      if (!invoiceItemRow) throw new Error('المادة غير موجودة في الفاتورة الأصلية.')

      const invoicedQty = Number(invoiceItemRow[0] ?? 0)
      const returnedQty = Number(db.exec(
        `SELECT COALESCE(SUM(sri.quantity), 0) FROM sales_return_items sri JOIN sales_returns sr ON sr.id = sri.return_id WHERE sr.sales_invoice_id = ? AND sri.material_id = ?`,
        [salesInvoiceId, materialId]
      )[0]?.values?.[0]?.[0] ?? 0)
      const remainingQty = invoicedQty - returnedQty
      if (quantity > remainingQty + 0.000001) {
        throw new Error(`لا يمكن إرجاع أكثر من ${remainingQty} وحدة من المادة ${materialId}.`)
      }

      const originalLineGross = Number(invoiceItemRow[3] ?? 0)
      const originalQuantity = Number(invoiceItemRow[0] ?? 0)
      const defaultUnitPrice = Number(invoiceItemRow[2] ?? 0)
      const invoiceDiscountType = String(invoice[6] ?? 'none')
      const invoiceDiscountValue = Number(invoice[7] ?? 0)
      const invoiceSubtotal = Number(invoice[5] ?? 0)

      let financialUnitPrice = defaultUnitPrice
      if (invoiceDiscountType === 'percentage' && invoiceDiscountValue > 0) {
        financialUnitPrice = normalizeMoney(defaultUnitPrice * (1 - invoiceDiscountValue / 100))
      } else if (invoiceDiscountType === 'fixed' && invoiceDiscountValue > 0) {
        const baseGross = Number(originalLineGross ?? 0)
        const baseSubtotal = Number(invoiceSubtotal ?? 0)
        const lineDiscount = baseSubtotal > 0 ? normalizeMoney((invoiceDiscountValue * baseGross) / baseSubtotal) : 0
        const lineNet = normalizeMoney(baseGross - lineDiscount)
        financialUnitPrice = originalQuantity > 0 ? normalizeMoney(lineNet / originalQuantity) : defaultUnitPrice
      }

      const inventoryCost = Number(item.unitPrice ?? getSalesInvoiceLineCost(db, salesInvoiceId, materialId) ?? defaultUnitPrice)
      const lineTotal = normalizeMoney(quantity * financialUnitPrice)
      subtotal += lineTotal

      return {
        materialId,
        quantity,
        unit: String(item.unit ?? invoiceItemRow[1] ?? '').trim(),
        unitPrice: financialUnitPrice,
        lineTotal,
        notes: String(item.notes ?? '').trim(),
        inventoryCost,
      }
    })

    const returnNumber = String(payload.returnNumber ?? '').trim() || generateReturnReference(db, 'SRT')
    const existingReturn = db.exec(`SELECT 1 FROM sales_returns WHERE return_number = ?`, [returnNumber])[0]?.values?.[0]?.[0]
    if (existingReturn) throw new Error(`مرجع مرتجع البيع ${returnNumber} مستخدم مسبقاً.`)

    const returnNotes = normalizeDocumentNote(payload.notes)
    const netTotal = normalizeMoney(subtotal)
    const originalInvoiceNumber = String(invoice[1] ?? '').trim()

    db.run(
      `INSERT INTO sales_returns (
        id,
        return_number,
        date,
        customer_id,
        warehouse_id,
        sales_invoice_id,
        original_invoice_number,
        notes,
        subtotal,
        discount_amount,
        net_total,
        status,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?)`,
      [
        returnId,
        returnNumber,
        date,
        customerId,
        warehouseId,
        salesInvoiceId,
        originalInvoiceNumber || null,
        returnNotes,
        normalizeMoney(subtotal),
        normalizeMoney(discount),
        normalizeMoney(netTotal),
        now,
        now
      ]
    )

    db.run(
      `INSERT INTO stock_movement_documents (id, reference, type, date, from_warehouse_id, to_warehouse_id, notes, created_by, created_at, status)
       VALUES (?, ?, 'sale_return', ?, NULL, ?, ?, ?, ?, 'completed')`,
      [`doc-${crypto.randomUUID()}`, returnNumber, date, warehouseId, returnNotes, 'sales-module', now]
    )

    const affectedMaterials = new Set()
    for (const item of prepared) {
      const itemId = `sri-${crypto.randomUUID()}`
      db.run(
        `INSERT INTO sales_return_items (id, return_id, material_id, quantity, unit, unit_price, line_total, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [itemId, returnId, item.materialId, item.quantity, item.unit || null, normalizeMoney(item.unitPrice), normalizeMoney(item.lineTotal), item.notes || null]
      )

      db.run(
        `INSERT INTO stock_movements (id, document_reference, type, reference, warehouse_id, material_id, quantity_in, quantity_out, unit, cost, notes, created_at, created_by)
         VALUES (?, ?, 'sale_return', ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`,
        [`${returnNumber}-${item.materialId}`, returnNumber, returnNumber, warehouseId, item.materialId, item.quantity, item.unit || null, normalizeMoney(item.inventoryCost), item.notes || null, now, 'sales-module']
      )

      affectedMaterials.add(item.materialId)
    }

    for (const materialId of affectedMaterials) {
      recalculateStockLevel(db, warehouseId, materialId)
    }

    db.run('COMMIT')
    persistDatabase(db)
    return getSalesReturnById(returnId)
  } catch (error) {
    try { db.run('ROLLBACK') } catch (e) {}
    console.error('CREATE SALES RETURN ERROR', error)
    throw error
  }
}

export function updateSalesReturn(returnId, payload = {}) {
  const db = getDatabase()
  const now = new Date().toISOString()
  const current = db.exec(
    `SELECT id, return_number, date, customer_id, warehouse_id, sales_invoice_id, notes
     FROM sales_returns WHERE id = ?`,
    [returnId]
  )[0]?.values?.[0]

  if (!current) throw new Error('مرتجع البيع غير موجود.')

  const safePayload = payload && typeof payload === 'object' ? payload : {}
  const items = Array.isArray(safePayload.items) ? safePayload.items : []
  const allowedCustomerId = String(safePayload.customerId ?? current[3] ?? '').trim() || String(current[3] ?? '').trim()
  const allowedWarehouseId = String(safePayload.warehouseId ?? current[4] ?? '').trim() || String(current[4] ?? '').trim()
  const allowedInvoiceId = String(safePayload.salesInvoiceId ?? current[5] ?? '').trim() || String(current[5] ?? '').trim()
  const returnDate = String(safePayload.date ?? current[2] ?? '').trim() || now.slice(0, 10)
  const originalReturnNumber = String(current[1] ?? '').trim()

  if (!allowedCustomerId || !allowedWarehouseId || !allowedInvoiceId) {
    throw new Error('بيانات مرتجع البيع غير مكتملة.')
  }
  if (items.length === 0) {
    throw new Error('يجب إدخال مادة واحدة على الأقل في المرتجع.')
  }

  const invoice = db.exec(
    `SELECT id, invoice_number, warehouse_id, customer_id, status, subtotal, discount_type, discount_value FROM sales_invoices WHERE id = ?`,
    [allowedInvoiceId]
  )[0]?.values?.[0]
  if (!invoice) throw new Error('فاتورة البيع الأصلية غير موجودة.')
  if (invoice[4] !== 'completed') throw new Error('يمكن إنشاء المرتجعات فقط على فواتير مبيعات معتمدة.')
  if (String(invoice[2]) !== allowedWarehouseId) throw new Error('المخزن المختار لا يطابق مخزن الفاتورة الأصلية.')
  if (String(invoice[3]) !== allowedCustomerId) throw new Error('العميل المختار لا يطابق العميل في الفاتورة الأصلية.')

  const existingItems = db.exec(
    `SELECT material_id, quantity FROM sales_return_items WHERE return_id = ?`,
    [returnId]
  )[0]?.values ?? []
  const previousQuantities = new Map(existingItems.map((row) => [String(row[0] ?? '').trim(), Number(row[1] ?? 0)]))

  const seen = new Set()
  let subtotal = 0
  const prepared = items.map((item) => {
    const materialId = String(item.materialId ?? '').trim()
    const quantity = Number(item.quantity ?? 0)
    if (!materialId) throw new Error('المادة غير موجودة في المرتجع.')
    if (seen.has(materialId)) throw new Error('المادة مكررة في المرتجع.')
    seen.add(materialId)
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('كميات المرتجع يجب أن تكون أكبر من صفر.')

    const invoiceItemRow = db.exec(
      `SELECT quantity, unit, unit_price, line_total FROM sales_invoice_items WHERE invoice_id = ? AND material_id = ?`,
      [allowedInvoiceId, materialId]
    )[0]?.values?.[0]
    if (!invoiceItemRow) throw new Error('المادة غير موجودة في الفاتورة الأصلية.')

    const invoicedQty = Number(invoiceItemRow[0] ?? 0)
    const otherReturnsQty = Number(db.exec(
      `SELECT COALESCE(SUM(sri.quantity), 0) FROM sales_return_items sri JOIN sales_returns sr ON sr.id = sri.return_id WHERE sr.sales_invoice_id = ? AND sri.material_id = ? AND sr.id != ?`,
      [allowedInvoiceId, materialId, returnId]
    )[0]?.values?.[0]?.[0] ?? 0)
    const currentQty = previousQuantities.get(materialId) ?? 0
    const remainingQty = invoicedQty - otherReturnsQty
    if (quantity > remainingQty + currentQty + 0.000001) {
      throw new Error(`لا يمكن إرجاع أكثر من ${remainingQty + currentQty} وحدة من المادة ${materialId}.`)
    }

    const originalLineGross = Number(invoiceItemRow[3] ?? 0)
    const originalQuantity = Number(invoiceItemRow[0] ?? 0)
    const defaultUnitPrice = Number(invoiceItemRow[2] ?? 0)
    const invoiceDiscountType = String(invoice[6] ?? 'none')
    const invoiceDiscountValue = Number(invoice[7] ?? 0)
    const invoiceSubtotal = Number(invoice[5] ?? 0)

    let financialUnitPrice = defaultUnitPrice
    if (invoiceDiscountType === 'percentage' && invoiceDiscountValue > 0) {
      financialUnitPrice = normalizeMoney(defaultUnitPrice * (1 - invoiceDiscountValue / 100))
    } else if (invoiceDiscountType === 'fixed' && invoiceDiscountValue > 0) {
      const baseGross = Number(originalLineGross ?? 0)
      const baseSubtotal = Number(invoiceSubtotal ?? 0)
      const lineDiscount = baseSubtotal > 0 ? normalizeMoney((invoiceDiscountValue * baseGross) / baseSubtotal) : 0
      const lineNet = normalizeMoney(baseGross - lineDiscount)
      financialUnitPrice = originalQuantity > 0 ? normalizeMoney(lineNet / originalQuantity) : defaultUnitPrice
    }

    const inventoryCost = Number(item.unitPrice ?? getSalesInvoiceLineCost(db, allowedInvoiceId, materialId) ?? defaultUnitPrice)
    const lineTotal = normalizeMoney(quantity * financialUnitPrice)
    subtotal += lineTotal

    return {
      materialId,
      quantity,
      unit: String(item.unit ?? invoiceItemRow[1] ?? '').trim(),
      unitPrice: financialUnitPrice,
      lineTotal,
      notes: String(item.notes ?? '').trim(),
      inventoryCost,
    }
  })

  try {
    db.run('BEGIN')

    const returnNotes = normalizeDocumentNote(safePayload.notes ?? current[6])
    const netTotal = normalizeMoney(subtotal)

    db.run(`DELETE FROM stock_movements WHERE document_reference = ?`, [originalReturnNumber])
    db.run(`DELETE FROM stock_movement_documents WHERE reference = ?`, [originalReturnNumber])
    db.run(`DELETE FROM sales_return_items WHERE return_id = ?`, [returnId])

    const affectedMaterials = new Set()
    for (const item of prepared) {
      const itemId = `sri-${crypto.randomUUID()}`
      db.run(
        `INSERT INTO sales_return_items (id, return_id, material_id, quantity, unit, unit_price, line_total, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)` ,
        [itemId, returnId, item.materialId, item.quantity, item.unit || null, normalizeMoney(item.unitPrice), normalizeMoney(item.lineTotal), item.notes || null]
      )

      db.run(
        `INSERT INTO stock_movements (id, document_reference, type, reference, warehouse_id, material_id, quantity_in, quantity_out, unit, cost, notes, created_at, created_by)
         VALUES (?, ?, 'sale_return', ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)` ,
        [`${originalReturnNumber}-${item.materialId}`, originalReturnNumber, originalReturnNumber, allowedWarehouseId, item.materialId, item.quantity, item.unit || null, normalizeMoney(item.inventoryCost), item.notes || null, now, 'sales-module']
      )

      affectedMaterials.add(item.materialId)
    }

    const originalInvoiceNumber = String(invoice[1] ?? '').trim()

    db.run(
      `UPDATE sales_returns
       SET date = ?, customer_id = ?, warehouse_id = ?, sales_invoice_id = ?, original_invoice_number = ?, notes = ?, subtotal = ?, discount_amount = 0, net_total = ?, updated_at = ?
       WHERE id = ?`,
      [returnDate, allowedCustomerId, allowedWarehouseId, allowedInvoiceId, originalInvoiceNumber || null, returnNotes, normalizeMoney(subtotal), netTotal, now, returnId]
    )

    db.run(
      `INSERT INTO stock_movement_documents (id, reference, type, date, from_warehouse_id, to_warehouse_id, notes, created_by, created_at, status)
       VALUES (?, ?, 'sale_return', ?, NULL, ?, ?, ?, ?, 'completed')` ,
      [`doc-${crypto.randomUUID()}`, originalReturnNumber, returnDate, allowedWarehouseId, returnNotes, 'sales-module', now]
    )

    for (const materialId of affectedMaterials) {
      recalculateStockLevel(db, allowedWarehouseId, materialId)
    }

    db.run('COMMIT')
    persistDatabase(db)
    return getSalesReturnById(returnId)
  } catch (error) {
    try { db.run('ROLLBACK') } catch (e) {}
    console.error('UPDATE SALES RETURN ERROR', error)
    throw error
  }
}

export function deleteSalesReturn(returnId) {
  const db = getDatabase()
  try {
    db.run('BEGIN')
    const row = db.exec(
      `SELECT id, return_number, warehouse_id FROM sales_returns WHERE id = ?`,
      [returnId]
    )[0]?.values?.[0]
    if (!row) throw new Error('مرتجع البيع غير موجود.')

    const items = db.exec(
      `SELECT material_id, quantity, unit_price FROM sales_return_items WHERE return_id = ?`,
      [returnId]
    )[0]?.values ?? []

    db.run(`DELETE FROM stock_movements WHERE document_reference = ?`, [row[1]])
    db.run(`DELETE FROM stock_movement_documents WHERE reference = ?`, [row[1]])
    db.run(`DELETE FROM sales_return_items WHERE return_id = ?`, [returnId])
    db.run(`DELETE FROM sales_returns WHERE id = ?`, [returnId])

    for (const item of items) {
      recalculateStockLevel(db, row[2], item[0])
    }

    db.run('COMMIT')
    persistDatabase(db)
    return listSalesReturns()
  } catch (error) {
    try { db.run('ROLLBACK') } catch (e) {}
    console.error('DELETE SALES RETURN ERROR', error)
    throw error
  }
}

export function createAdjustmentDocument(payload = {}) {
  const db = getDatabase()
  const now = new Date().toISOString()
  const selectedWarehouseId = String(payload.warehouseId ?? '').trim()
  const notes = typeof payload.notes === 'string' ? payload.notes.trim() : ''
  const date = String(payload.date ?? '').trim() || now.slice(0, 10)
  const items = Array.isArray(payload.items) ? payload.items : []

  if (!selectedWarehouseId) {
    throw new Error('يجب اختيار المخزن قبل اعتماد التسوية.')
  }

  if (!items.length) {
    throw new Error('يجب إضافة بند واحد على الأقل للتسوية.')
  }

  const warehouseRow = db.exec(`SELECT id, status FROM warehouses WHERE id = ?`, [selectedWarehouseId])[0]?.values?.[0]
  if (!warehouseRow || String(warehouseRow[1]) !== 'active') {
    throw new Error('المخزن المحدد غير صالح أو غير نشط.')
  }

  const reference = (String(payload.reference ?? '').trim() || buildAdjustmentReference(db)).toUpperCase()
  const existing = db.exec(`SELECT 1 FROM stock_movement_documents WHERE reference = ?`, [reference])[0]?.values?.[0]?.[0]
  if (existing) {
    throw new Error(`رقم التسوية ${reference} مستخدم مسبقاً.`)
  }

  try {
    db.run('BEGIN')

    const docId = `doc-${crypto.randomUUID()}`
    db.run(
      `INSERT INTO stock_movement_documents (id, reference, type, date, from_warehouse_id, to_warehouse_id, notes, created_by, created_at, status)
       VALUES (?, ?, 'adjustment', ?, NULL, ?, ?, ?, ?, 'completed')`,
      [docId, reference, date, selectedWarehouseId, notes || null, 'local-user', now]
    )

    const affectedMaterials = new Set()

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index]
      const materialId = String(item.materialId ?? '').trim()
      if (!materialId) {
        throw new Error('توجد مادة غير محددة في تسوية الجرد.')
      }
      if (!ensureMaterialExists(db, materialId)) {
        throw new Error(`المادة غير موجودة: ${materialId}`)
      }

      const materialRow = db.exec(`SELECT id, is_non_stock FROM materials WHERE id = ?`, [materialId])[0]?.values?.[0]
      if (materialRow && Number(materialRow[1]) === 1) {
        throw new Error(`المادة ${materialId} غير قابلة للحركة في المخزون.`)
      }

      const systemQuantity = Number(
        db.exec(`SELECT COALESCE(quantity, 0) FROM stock_levels WHERE warehouse_id = ? AND material_id = ?`, [selectedWarehouseId, materialId])[0]?.values?.[0]?.[0] ?? 0
      )
      const countedQuantity = Number(item.countedQuantity ?? 0)
      if (!Number.isFinite(countedQuantity) || countedQuantity < 0) {
        throw new Error(`الكمية الفعلية غير صحيحة للمادة ${materialId}.`)
      }

      const difference = countedQuantity - systemQuantity
      if (difference === 0) {
        continue
      }

      const rawUnitCost = item.unitCost == null || item.unitCost === '' ? getAverageCost(db, selectedWarehouseId, materialId) : Number(item.unitCost)
      const unitCost = Number.isFinite(rawUnitCost) ? Number(rawUnitCost) : 0

      const isIncrease = difference > 0
      const quantityIn = isIncrease ? Math.abs(difference) : 0
      const quantityOut = isIncrease ? 0 : Math.abs(difference)
      const movementType = isIncrease ? 'adjustment_in' : 'adjustment_out'
      const snapshot = {
        systemQuantity,
        countedQuantity,
        difference,
        unitCost,
      }

      db.run(
        `INSERT INTO stock_movements (id, document_reference, type, reference, warehouse_id, material_id, quantity_in, quantity_out, unit, cost, notes, created_at, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
        [`${reference}-${index}`, reference, movementType, reference, selectedWarehouseId, materialId, quantityIn, quantityOut, item.unit ?? null, unitCost, normalizeAdjustmentItemNotes(item.notes, snapshot), now, 'local-user']
      )

      affectedMaterials.add(materialId)
    }

    if (affectedMaterials.size === 0) {
      db.run('ROLLBACK')
      throw new Error('لا توجد فروق في الجرد لتسجيلها.')
    }

    for (const materialId of affectedMaterials) {
      recalculateStockLevel(db, selectedWarehouseId, materialId)
    }

    db.run('COMMIT')
    persistDatabase(db)
    return { reference }
  } catch (error) {
    try { db.run('ROLLBACK') } catch (e) {}
    console.error('CREATE ADJUSTMENT ERROR', error)
    throw error
  }
}

export function updateAdjustmentDocument(reference, payload = {}) {
  const db = getDatabase()
  const normalizedReference = String(reference ?? '').trim()
  if (!normalizedReference) {
    throw new Error('رقم التسوية غير موجود.')
  }

  const safePayload = payload && typeof payload === 'object' ? payload : {}
  const items = Array.isArray(safePayload.items) ? safePayload.items : []

  try {
    const docRow = db.exec(
      `SELECT id, reference, date, from_warehouse_id, to_warehouse_id, notes
       FROM stock_movement_documents
       WHERE reference = ? AND type = 'adjustment'`,
      [normalizedReference]
    )[0]?.values?.[0]

    if (!docRow) {
      throw new Error(`تسوية الجرد ${normalizedReference} غير موجودة.`)
    }

    const previousWarehouseId = String(docRow[3] ?? docRow[4] ?? '').trim()
    const targetWarehouseId = String(safePayload.warehouseId ?? previousWarehouseId ?? '').trim() || previousWarehouseId
    if (!targetWarehouseId) {
      throw new Error('يجب اختيار المخزن قبل تعديل التسوية.')
    }

    const warehouseRow = db.exec(`SELECT id, status FROM warehouses WHERE id = ?`, [targetWarehouseId])[0]?.values?.[0]
    if (!warehouseRow || String(warehouseRow[1]) !== 'active') {
      throw new Error('المخزن المحدد غير صالح أو غير نشط.')
    }

    const previousItems = db.exec(
      `SELECT material_id, quantity_in, quantity_out, unit, cost, notes
       FROM stock_movements WHERE document_reference = ? ORDER BY rowid ASC`,
      [normalizedReference]
    )[0]?.values ?? []

    const previousMaterials = [...new Set(previousItems.map((row) => String(row[0] ?? '').trim()).filter(Boolean))]

    if (!items.length) {
      throw new Error('يجب إضافة بند واحد على الأقل للتسوية.')
    }

    db.run('BEGIN')

    // 1) Reverse the old adjustment completely by removing its movement rows.
    db.run(`DELETE FROM stock_movements WHERE document_reference = ?`, [normalizedReference])
    db.run(`DELETE FROM stock_movement_documents WHERE reference = ?`, [normalizedReference])

    // 2) Recalculate stock_levels after removing the old adjustment effect, returning to the state before that ADJ.
    for (const materialId of previousMaterials) {
      recalculateStockLevel(db, previousWarehouseId, materialId)
    }

    // 3) Recreate the document with the same reference and apply only the new adjustment effect.
    const noteText = typeof safePayload.notes === 'string' ? safePayload.notes.trim() : (docRow[5] ?? '')
    const documentDate = String(safePayload.date ?? docRow[2] ?? '').trim() || new Date().toISOString().slice(0, 10)
    const documentId = `doc-${crypto.randomUUID()}`
    db.run(
      `INSERT INTO stock_movement_documents (id, reference, type, date, from_warehouse_id, to_warehouse_id, notes, created_by, created_at, status)
       VALUES (?, ?, 'adjustment', ?, NULL, ?, ?, ?, ?, 'completed')`,
      [documentId, normalizedReference, documentDate, targetWarehouseId, noteText || null, 'local-user', new Date().toISOString()]
    )

    const affectedMaterials = new Set()

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index]
      const materialId = String(item.materialId ?? '').trim()
      if (!materialId) {
        throw new Error('توجد مادة غير محددة في تسوية الجرد.')
      }
      if (!ensureMaterialExists(db, materialId)) {
        throw new Error(`المادة غير موجودة: ${materialId}`)
      }

      const materialRow = db.exec(`SELECT id, is_non_stock FROM materials WHERE id = ?`, [materialId])[0]?.values?.[0]
      if (materialRow && Number(materialRow[1]) === 1) {
        throw new Error(`المادة ${materialId} غير قابلة للحركة في المخزون.`)
      }

      const systemQuantity = Number(
        db.exec(`SELECT COALESCE(quantity, 0) FROM stock_levels WHERE warehouse_id = ? AND material_id = ?`, [targetWarehouseId, materialId])[0]?.values?.[0]?.[0] ?? 0
      )
      const countedQuantity = Number(item.countedQuantity ?? 0)
      if (!Number.isFinite(countedQuantity) || countedQuantity < 0) {
        throw new Error(`الكمية الفعلية غير صحيحة للمادة ${materialId}.`)
      }

      const difference = countedQuantity - systemQuantity
      if (difference === 0) {
        continue
      }

      const rawUnitCost = item.unitCost == null || item.unitCost === ''
        ? getAverageCost(db, targetWarehouseId, materialId)
        : Number(item.unitCost)
      const unitCost = Number.isFinite(rawUnitCost) ? Number(rawUnitCost) : 0
      const isIncrease = difference > 0
      const quantityIn = isIncrease ? Math.abs(difference) : 0
      const quantityOut = isIncrease ? 0 : Math.abs(difference)
      const movementType = isIncrease ? 'adjustment_in' : 'adjustment_out'
      const snapshot = {
        systemQuantity,
        countedQuantity,
        difference,
        unitCost,
      }

      db.run(
        `INSERT INTO stock_movements (id, document_reference, type, reference, warehouse_id, material_id, quantity_in, quantity_out, unit, cost, notes, created_at, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
        [`${normalizedReference}-${index}`, normalizedReference, movementType, normalizedReference, targetWarehouseId, materialId, quantityIn, quantityOut, item.unit ?? null, unitCost, normalizeAdjustmentItemNotes(item.notes, snapshot), new Date().toISOString(), 'local-user']
      )

      affectedMaterials.add(materialId)
    }

    if (affectedMaterials.size === 0) {
      throw new Error('لا توجد فروق في الجرد لتسجيلها.')
    }

    for (const materialId of affectedMaterials) {
      recalculateStockLevel(db, targetWarehouseId, materialId)
    }

    db.run('COMMIT')
    persistDatabase(db)
    return { reference: normalizedReference }
  } catch (error) {
    try { db.run('ROLLBACK') } catch (e) {}
    console.error('UPDATE ADJUSTMENT ERROR', error)
    throw error
  }
}

export function deleteAdjustmentDocument(reference) {
  const db = getDatabase()
  const normalizedReference = String(reference ?? '').trim()
  if (!normalizedReference) {
    throw new Error('رقم التسوية غير موجود.')
  }

  try {
    db.run('BEGIN')

    const docRow = db.exec(
      `SELECT id, reference, from_warehouse_id, to_warehouse_id
       FROM stock_movement_documents
       WHERE reference = ? AND type = 'adjustment'`,
      [normalizedReference]
    )[0]?.values?.[0]

    if (!docRow) {
      throw new Error(`تسوية الجرد ${normalizedReference} غير موجودة.`)
    }

    const warehouseId = String(docRow[2] ?? docRow[3] ?? '').trim()
    const affectedMaterials = [...new Set((db.exec(
      `SELECT material_id FROM stock_movements WHERE document_reference = ?`,
      [normalizedReference]
    )[0]?.values ?? []).map((row) => String(row[0] ?? '').trim()).filter(Boolean))]

    db.run(`DELETE FROM stock_movements WHERE document_reference = ?`, [normalizedReference])
    db.run(`DELETE FROM stock_movement_documents WHERE reference = ?`, [normalizedReference])

    if (warehouseId) {
      for (const materialId of affectedMaterials) {
        recalculateStockLevel(db, warehouseId, materialId)
      }
    }

    db.run('COMMIT')
    persistDatabase(db)
    return listStockMovements({ type: 'adjustment' })
  } catch (error) {
    try { db.run('ROLLBACK') } catch (e) {}
    console.error('DELETE ADJUSTMENT ERROR', error)
    throw error
  }
}

export function listStockMovements(filter = {}) {
  const db = getDatabase()
  const { type, warehouseId, materialId, reference, status, fromDate, toDate } = filter
  const clauses = []
  const params = []

  if (type) {
    const normalizedType = String(type).trim()

    if (normalizedType === 'production') {
      clauses.push('(d.type = ? OR d.type = ? OR d.type = ?)')
      params.push('production', 'production_in', 'production_out')
    } else if (normalizedType === 'transfer') {
      clauses.push('(d.type = ? OR d.type = ? OR d.type = ?)')
      params.push('transfer', 'transfer_in', 'transfer_out')
    } else if (normalizedType === 'adjustment') {
      clauses.push('(d.type = ? OR d.type = ? OR d.type = ?)')
      params.push('adjustment', 'adjustment_in', 'adjustment_out')
      clauses.push("d.reference NOT LIKE ?")
      params.push('OPENING-%')
    } else if (normalizedType === 'opening') {
      clauses.push('(d.type = ? OR d.type = ? OR d.type = ?)')
      params.push('adjustment', 'adjustment_in', 'adjustment_out')
      clauses.push('d.reference LIKE ?')
      params.push('OPENING-%')
    } else {
      clauses.push('d.type = ?')
      params.push(normalizedType)
    }
  }

  if (warehouseId) {
    clauses.push(`EXISTS (
      SELECT 1
      FROM stock_movements sm2
      WHERE sm2.document_reference = d.reference
        AND sm2.warehouse_id = ?
    )`)
    params.push(warehouseId)
  }

  if (materialId) {
    clauses.push(`EXISTS (
      SELECT 1
      FROM stock_movements sm2
      WHERE sm2.document_reference = d.reference
        AND sm2.material_id = ?
    )`)
    params.push(materialId)
  }

  if (reference) {
    clauses.push('d.reference = ?')
    params.push(reference)
  }

  if (status) {
    clauses.push('d.status = ?')
    params.push(status)
  }

  if (fromDate) {
    clauses.push('d.date >= ?')
    params.push(fromDate)
  }

  if (toDate) {
    clauses.push('d.date <= ?')
    params.push(toDate)
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''

  const sql = `
    SELECT d.reference,
           d.type,
           d.date,
           d.status,
           d.from_warehouse_id,
           d.to_warehouse_id,
           d.notes,
           d.created_by,
           COALESCE(sm_count.item_count, 0) AS item_count,
           COALESCE(wh_summary.warehouse_summary, '__') AS warehouse_summary,
           CASE
             WHEN d.type = 'purchase' THEN supplier.name
             WHEN d.type = 'sale' THEN customer.name
             WHEN d.type = 'purchase_return' THEN pr_supplier.name
             WHEN d.type = 'sale_return' THEN sr_customer.name
             ELSE NULL
           END AS party_name
    FROM stock_movement_documents d
    LEFT JOIN (
      SELECT document_reference, COUNT(*) AS item_count
      FROM stock_movements
      GROUP BY document_reference
    ) sm_count ON sm_count.document_reference = d.reference
    LEFT JOIN (
      SELECT document_reference,
             GROUP_CONCAT(DISTINCT w.name) AS warehouse_summary
      FROM stock_movements sm
      LEFT JOIN warehouses w ON w.id = sm.warehouse_id
      GROUP BY sm.document_reference
    ) wh_summary ON wh_summary.document_reference = d.reference
    LEFT JOIN purchase_invoices pi ON d.type = 'purchase' AND d.reference = pi.invoice_number
    LEFT JOIN suppliers supplier ON supplier.id = pi.supplier_id
    LEFT JOIN purchase_returns pr ON d.type = 'purchase_return' AND d.reference = pr.return_number
    LEFT JOIN suppliers pr_supplier ON pr_supplier.id = pr.supplier_id
    LEFT JOIN sales_invoices si ON d.type = 'sale' AND d.reference = si.invoice_number
    LEFT JOIN customers customer ON customer.id = si.customer_id
    LEFT JOIN sales_returns sr ON d.type = 'sale_return' AND d.reference = sr.return_number
    LEFT JOIN customers sr_customer ON sr_customer.id = sr.customer_id
    ${where}
    ORDER BY d.created_at DESC, d.reference DESC
  `

  const rows = db.exec(sql, params)[0]?.values ?? []
  return rows.map(r => {
    const warehouseSummaryRaw = r[9]
    const warehouseSummary = warehouseSummaryRaw
      ? [...new Set(String(warehouseSummaryRaw).split(',').map(name => name.trim()).filter(Boolean))].join('، ')
      : '__'

    return {
      reference: r[0],
      type: r[1],
      date: r[2],
      status: r[3],
      fromWarehouseId: r[4],
      toWarehouseId: r[5],
      documentNotes: r[6],
      createdBy: r[7],
      itemCount: Number(r[8] ?? 0),
      warehouseSummary,
      partyName: r[10] || null,
    }
  })
}

export function getStockMovementByReference(ref) {
  const db = getDatabase()
  const docRow = db.exec(
    `SELECT d.reference, d.type, d.date, d.status, d.from_warehouse_id, fw.name as from_warehouse_name, d.to_warehouse_id, tw.name as to_warehouse_name, d.notes, d.created_by, d.created_at,
            CASE
              WHEN d.type = 'purchase' THEN supplier.name
              WHEN d.type = 'sale' THEN customer.name
              WHEN d.type = 'purchase_return' THEN pr_supplier.name
              WHEN d.type = 'sale_return' THEN sr_customer.name
              ELSE NULL
            END AS party_name
     FROM stock_movement_documents d
     LEFT JOIN warehouses fw ON fw.id = d.from_warehouse_id
     LEFT JOIN warehouses tw ON tw.id = d.to_warehouse_id
     LEFT JOIN purchase_invoices pi ON d.type = 'purchase' AND d.reference = pi.invoice_number
     LEFT JOIN suppliers supplier ON supplier.id = pi.supplier_id
     LEFT JOIN purchase_returns pr ON d.type = 'purchase_return' AND d.reference = pr.return_number
     LEFT JOIN suppliers pr_supplier ON pr_supplier.id = pr.supplier_id
     LEFT JOIN sales_invoices si ON d.type = 'sale' AND d.reference = si.invoice_number
     LEFT JOIN customers customer ON customer.id = si.customer_id
     LEFT JOIN sales_returns sr ON d.type = 'sale_return' AND d.reference = sr.return_number
     LEFT JOIN customers sr_customer ON sr_customer.id = sr.customer_id
     WHERE d.reference = ?`,
    [ref]
  )[0]?.values?.[0]

  if (!docRow) return null

  const items = db.exec(
    `SELECT sm.material_id, m.material_number, m.name,
            sm.quantity_in,
            sm.quantity_out,
            sm.warehouse_id,
            w.name AS warehouse_name,
            sm.unit, sm.cost, sm.notes
     FROM stock_movements sm
     LEFT JOIN materials m ON m.id = sm.material_id
     LEFT JOIN warehouses w ON w.id = sm.warehouse_id
     WHERE sm.document_reference = ?
     ORDER BY sm.created_at ASC, sm.rowid ASC`,
    [ref]
  )[0]?.values ?? []

  return {
    reference: docRow[0],
    type: docRow[1],
    date: docRow[2],
    status: docRow[3],
    fromWarehouseId: docRow[4],
    fromWarehouseName: docRow[5] ?? null,
    toWarehouseId: docRow[6],
    toWarehouseName: docRow[7] ?? null,
    notes: docRow[8],
    createdBy: docRow[9],
    createdAt: docRow[10],
    partyName: docRow[11] || null,
    items: items.map((r) => {
      const snapshot = parseAdjustmentSnapshot(r[9])
      return {
        materialId: r[0],
        materialNumber: r[1],
        materialName: r[2],
        quantityIn: Number(r[3] ?? 0),
        quantityOut: Number(r[4] ?? 0),
        warehouseId: r[5],
        warehouseName: r[6],
        unit: r[7],
        cost: r[8],
        notes: snapshot && snapshot.lineNotes ? snapshot.lineNotes : (r[9] ?? ''),
        systemQuantity: snapshot && Number.isFinite(Number(snapshot.systemQuantity)) ? Number(snapshot.systemQuantity) : 0,
        countedQuantity: snapshot && Number.isFinite(Number(snapshot.countedQuantity)) ? Number(snapshot.countedQuantity) : 0,
        difference: snapshot && Number.isFinite(Number(snapshot.difference)) ? Number(snapshot.difference) : 0,
        unitCost: snapshot && Number.isFinite(Number(snapshot.unitCost)) ? Number(snapshot.unitCost) : (r[8] == null ? 0 : Number(r[8]))
      }
    })
  }
}

// Create a movement document (multiple items) inside a transaction and update stock_levels atomically
export function createStockMovementDocument(doc) {
  const db = getDatabase()
  // doc: { reference, type, date, fromWarehouseId, toWarehouseId, notes, createdBy, items: [{ materialId, quantity, unit, cost, notes }] }
  const now = doc.date || new Date().toISOString()
  const status = doc.status ?? 'completed'

  try {
    db.run('BEGIN')

    const docId = `doc-${crypto.randomUUID()}`
    const reference = String(doc.reference || '').trim() || (() => {
      if (doc.type === 'transfer') {
        return generateSequentialReference(db, 'TRF')
      }
      throw new Error('A movement document reference is required.')
    })()

    validateMovementDocument(db, { ...doc, reference })

    const existing = db.exec(`SELECT 1 FROM stock_movement_documents WHERE reference = ?`, [reference])[0]?.values?.[0]?.[0]
    if (existing) {
      throw new Error(`A movement document with reference ${reference} already exists.`)
    }

    const fromWarehouse = doc.fromWarehouseId ?? null
    const toWarehouse = doc.toWarehouseId ?? null

    const sourceWarehouse = fromWarehouse ? ensureWarehouseExists(db, fromWarehouse) : null
    const targetWarehouse = toWarehouse ? ensureWarehouseExists(db, toWarehouse) : null
    if (fromWarehouse && (!sourceWarehouse || sourceWarehouse.status !== 'active')) {
      throw new Error('The source warehouse is invalid or inactive.')
    }
    if (toWarehouse && (!targetWarehouse || targetWarehouse.status !== 'active')) {
      throw new Error('The destination warehouse is invalid or inactive.')
    }

    db.run(
      `INSERT INTO stock_movement_documents (id, reference, type, date, from_warehouse_id, to_warehouse_id, notes, created_by, created_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [docId, reference, doc.type, now, fromWarehouse, toWarehouse, doc.notes ?? null, doc.createdBy ?? null, now, status]
    )

    for (let index = 0; index < doc.items.length; index++) {
      const item = doc.items[index]
      const movementId = `${reference}-${index}`
      let movementType = doc.type
      let quantityIn = 0
      let quantityOut = 0
      let warehouseId = toWarehouse || fromWarehouse

      if (doc.type === 'purchase') {
        movementType = 'purchase'
        quantityIn = Number(item.quantity)
        warehouseId = toWarehouse
      } else if (doc.type === 'sale') {
        movementType = 'sale'
        quantityOut = Number(item.quantity)
        warehouseId = fromWarehouse
      } else if (doc.type === 'transfer') {
        if (!fromWarehouse || !toWarehouse) {
          throw new Error('Transfer requires both source and destination warehouses.')
        }
      } else if (doc.type === 'production') {
        movementType = 'production_in'
        quantityIn = Number(item.quantity)
        warehouseId = toWarehouse || fromWarehouse
      } else if (doc.type === 'adjustment') {
        const adjusted = Number(item.quantity)
        if (adjusted >= 0) {
          movementType = 'adjustment_in'
          quantityIn = adjusted
        } else {
          movementType = 'adjustment_out'
          quantityOut = Math.abs(adjusted)
        }
      }

      if (movementType === 'transfer' && fromWarehouse && toWarehouse) {
        const available = computeAvailableQuantity(db, fromWarehouse, item.materialId)
        if (available < Number(item.quantity)) {
          throw new Error(`Insufficient stock for material ${item.materialId} in source warehouse.`)
        }

        const sourceAverageCost = getAverageCost(db, fromWarehouse, item.materialId)

        db.run(
          `INSERT INTO stock_movements (id, document_reference, type, reference, warehouse_id, material_id, quantity_in, quantity_out, unit, cost, notes, created_at, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [`${reference}-${index}-out`, reference, 'transfer_out', reference, fromWarehouse, item.materialId, 0, Number(item.quantity), item.unit ?? null, sourceAverageCost, item.notes ?? null, now, doc.createdBy ?? null]
        )
        recalculateStockLevel(db, fromWarehouse, item.materialId)

        db.run(
          `INSERT INTO stock_movements (id, document_reference, type, reference, warehouse_id, material_id, quantity_in, quantity_out, unit, cost, notes, created_at, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [`${reference}-${index}-in`, reference, 'transfer_in', reference, toWarehouse, item.materialId, Number(item.quantity), 0, item.unit ?? null, sourceAverageCost, item.notes ?? null, now, doc.createdBy ?? null]
        )
        recalculateStockLevel(db, toWarehouse, item.materialId)
        continue
      }

      if (movementType === 'sale') {
        const available = computeAvailableQuantity(db, warehouseId, item.materialId)
        if (available < Number(item.quantity)) {
          throw new Error(`Insufficient stock for material ${item.materialId} in source warehouse.`)
        }
      }

      if (movementType === 'sale') quantityOut = Number(item.quantity)
      if (movementType === 'purchase') quantityIn = Number(item.quantity)
      if (movementType === 'production_in') quantityIn = Number(item.quantity)
      if (movementType === 'production_out') quantityOut = Number(item.quantity)
      if (movementType === 'adjustment_in') quantityIn = Number(item.quantity)
      if (movementType === 'adjustment_out') quantityOut = Number(item.quantity)

      if (!warehouseId) {
        throw new Error('Warehouse cannot be determined for this movement line.')
      }

      db.run(
        `INSERT INTO stock_movements (id, document_reference, type, reference, warehouse_id, material_id, quantity_in, quantity_out, unit, cost, notes, created_at, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [movementId, reference, movementType, reference, warehouseId, item.materialId, quantityIn, quantityOut, item.unit ?? null, item.cost ?? null, item.notes ?? null, now, doc.createdBy ?? null]
      )

      if (status === 'completed') {
        recalculateStockLevel(db, warehouseId, item.materialId)
      }
    }
    db.run('COMMIT')
    persistDatabase(db)
    return { reference }
  } catch (err) {
    try { db.run('ROLLBACK') } catch (e) {}
    console.error('CREATE MOVEMENT ERROR', err)
    throw err
  }
}

export function getStockBalancesByWarehouse(warehouseId) {
  const db = getDatabase()

  let rows
  if (warehouseId) {
    rows = db.exec(
      `SELECT sl.material_id, m.material_number, m.name, COALESCE(sl.quantity, 0) as quantity, m.unit, w.id, w.name, COALESCE(sl.average_cost, 0) as average_cost
       FROM stock_levels sl
       LEFT JOIN materials m ON m.id = sl.material_id
       LEFT JOIN warehouses w ON w.id = sl.warehouse_id
       WHERE sl.warehouse_id = ? AND m.status <> 'deleted' AND COALESCE(m.is_non_stock, 0) = 0
       ORDER BY w.name, m.material_number`,
      [warehouseId]
    )[0]?.values ?? []
  } else {
    rows = db.exec(
      `SELECT sl.material_id, m.material_number, m.name, COALESCE(sl.quantity, 0) as quantity, m.unit, w.id, w.name, COALESCE(sl.average_cost, 0) as average_cost
       FROM stock_levels sl
       LEFT JOIN materials m ON m.id = sl.material_id
       LEFT JOIN warehouses w ON w.id = sl.warehouse_id
       WHERE m.status <> 'deleted' AND COALESCE(m.is_non_stock, 0) = 0
       ORDER BY w.name, m.material_number`
    )[0]?.values ?? []
  }

  return rows.map((r) => {
    const quantity = Number(r[3])
    const averageCost = Number(r[7] ?? 0)
    return {
      id: r[0],
      materialNumber: r[1],
      name: r[2],
      quantity,
      unit: r[4] ?? '',
      warehouseId: r[5],
      warehouseName: r[6] ?? '',
      averageCost,
      stockValue: quantity * averageCost,
    }
  })
}

export function getStockBalancesByMaterial(materialId) {
  const db = getDatabase()
  // Use stock_levels as the authoritative per-warehouse material quantities
  const rows = db.exec(
    `SELECT w.id, w.code, w.name, COALESCE(sl.quantity, 0) as quantity, COALESCE(sl.average_cost, 0) as average_cost
     FROM warehouses w
     LEFT JOIN stock_levels sl ON sl.warehouse_id = w.id AND sl.material_id = ?
     ORDER BY w.name
    `, [materialId]
  )[0]?.values ?? []

  return rows.map(r => ({
    warehouseId: r[0],
    code: r[1],
    name: r[2],
    quantity: Number(r[3]),
    averageCost: Number(r[4] ?? 0),
    stockValue: Number(r[3] ?? 0) * Number(r[4] ?? 0),
  }))
}

function persistDatabase(db) {
  try {
    const binary = Buffer.from(db.export())
    fs.writeFileSync(dbFile, binary)
  } catch (err) {
    console.error('DATABASE ERROR: failed to persist database', err)
    throw err
  }
}

function normalizeRow(row) {
  return {
    id: row.id,
    type: row.type,
    parentId: row.parent_id,
    returnability: row.returnability ?? '',
    materialNumber: row.material_number,
    name: row.name,
    unit: row.unit ?? '',
    openingBalance: row.opening_balance ?? null,
    openingWarehouseId: row.opening_warehouse_id ?? null,
    costPrice: row.cost_price ?? '',
    price1: row.price1 ?? '',
    price2: row.price2 ?? '',
    price3: row.price3 ?? '',
    notes: row.notes ?? '',
    isNonStock: Number(row.is_non_stock) === 1,
    status: row.status ?? 'active',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    children: [],
  }
}

export function getAllMaterials() {
  const db = getDatabase()

  const rows = db.exec(`
    SELECT id, material_number, name, type, parent_id, returnability, unit, cost_price, price1, price2, price3, notes, is_non_stock, opening_balance, opening_warehouse_id, status, created_at, updated_at
    FROM materials
    WHERE status <> 'deleted'
    ORDER BY created_at
  `)[0]?.values ?? []

  const entities = new Map()

  for (const row of rows) {
    const record = normalizeRow({
      id: row[0],
      material_number: row[1],
      name: row[2],
      type: row[3],
      parent_id: row[4],
      returnability: row[5],
      unit: row[6],
      cost_price: row[7],
      price1: row[8],
      price2: row[9],
      price3: row[10],
      notes: row[11],
      is_non_stock: row[12],
      opening_balance: row[13],
      opening_warehouse_id: row[14],
      status: row[15],
      created_at: row[16],
      updated_at: row[17],
    })

    entities.set(record.id, record)
  }

  const roots = []

  for (const node of entities.values()) {
    if (node.parentId) {
      const parent = entities.get(node.parentId)

      if (parent) {
        parent.children.push(node)
      } else {
        roots.push(node)
      }
    } else {
      roots.push(node)
    }
  }

  return roots
}

export function listMaterials() {
  return getAllMaterials()
}

function getRecipeMaterialRecord(db, materialId) {
  const row = db.exec(
    `SELECT id, type, is_non_stock, status, unit, name
     FROM materials
     WHERE id = ?`,
    [materialId]
  )[0]?.values?.[0]

  if (!row) return null

  // status <> 'deleted' in SQL excludes NULL rows too (three-valued logic), so filter in JS instead.
  if (row[3] === 'deleted') return null

  return {
    id: row[0],
    type: row[1],
    isNonStock: Number(row[2]) === 1,
    status: row[3] ?? 'active',
    unit: row[4] ?? '',
    name: row[5] ?? '',
  }
}

function getNextRecipeNumberInternal(db) {
  const rows = db.exec(
    `SELECT recipe_number FROM manufacturing_recipes WHERE recipe_number LIKE 'BOM-%' ORDER BY recipe_number ASC`
  )[0]?.values ?? []

  let maxNumber = 0

  for (const row of rows) {
    const value = String(row[0] ?? '')
    const match = value.match(/^BOM-(\d+)$/)
    if (match) {
      const current = Number(match[1])
      if (!Number.isNaN(current) && current > maxNumber) {
        maxNumber = current
      }
    }
  }

  return `BOM-${String(maxNumber + 1).padStart(6, '0')}`
}

function normalizeRecipeRow(row) {
  return {
    id: row[0],
    recipeNumber: row[1],
    name: row[2],
    productMaterialId: row[3],
    productName: row[4] ?? '',
    standardOutputQuantity: Number(row[5] ?? 0),
    unit: row[6] ?? '',
    componentCount: Number(row[7] ?? 0),
    notes: row[8] ?? '',
    status: row[9] ?? 'active',
    createdAt: row[10],
    updatedAt: row[11],
  }
}

function normalizeRecipeItemRow(row) {
  return {
    id: row[0],
    recipeId: row[1],
    materialId: row[2],
    materialName: row[3] ?? '',
    quantity: Number(row[4] ?? 0),
    unit: row[5] ?? '',
    notes: row[6] ?? '',
    sortOrder: Number(row[7] ?? 0),
  }
}

function validateRecipePayload(db, payload, existingRecipeId = null) {
  const name = String(payload.name ?? '').trim()
  if (!name) {
    throw new Error('اسم النموذج مطلوب.')
  }

  const productMaterialId = String(payload.productMaterialId ?? payload.product_material_id ?? '').trim()
  if (!productMaterialId) {
    throw new Error('يجب اختيار المنتج الناتج.')
  }

  const product = getRecipeMaterialRecord(db, productMaterialId)
  if (!product) {
    throw new Error('المنتج الناتج غير موجود أو غير صالح للتصنيع.')
  }

  if (product.type !== 'sub') {
    throw new Error('المنتج الناتج يجب أن يكون مادة فرعية (sub).')
  }

  if (product.isNonStock) {
    throw new Error('لا يمكن استخدام مادة غير مخزنية كمنتج نهائي.')
  }

  if (product.status === 'deleted' || product.status === 'inactive') {
    throw new Error('المنتج الناتج يجب أن يكون فعالاً.')
  }

  const standardOutputQuantity = Number(payload.standardOutputQuantity ?? 0)
  if (!Number.isFinite(standardOutputQuantity) || standardOutputQuantity <= 0) {
    throw new Error('يجب أن تكون الكمية القياسية أكبر من صفر.')
  }

  const items = Array.isArray(payload.items) ? payload.items : []
  if (items.length === 0) {
    throw new Error('يجب إضافة مكون واحد على الأقل.')
  }

  const seenMaterialIds = new Set()
  const normalizedItems = []

  for (const item of items) {
    const materialId = String(item.materialId ?? '').trim()
    if (!materialId) {
      throw new Error('يجب اختيار مادة أولية لكل سطر.')
    }

    if (materialId === productMaterialId) {
      throw new Error('لا يمكن استخدام المنتج الناتج نفسه كمادة أولية.')
    }

    if (seenMaterialIds.has(materialId)) {
      throw new Error('المادة مضافة مسبقاً إلى نموذج التصنيع.')
    }

    const material = getRecipeMaterialRecord(db, materialId)
    if (!material) {
      throw new Error('إحدى المواد الأولية غير موجودة أو غير صالحة.')
    }

    if (material.type !== 'sub') {
      throw new Error('المواد الأولية يجب أن تكون مواد فرعية (sub).')
    }

    if (material.isNonStock) {
      throw new Error('لا يمكن استخدام مادة غير مخزنية كمواد أولية.')
    }

    if (material.status === 'deleted' || material.status === 'inactive') {
      throw new Error('المادة الأولية يجب أن تكون فعالة.')
    }

    const quantity = Number(item.quantity ?? 0)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error('يجب أن تكون الكمية أكبر من صفر.')
    }

    seenMaterialIds.add(materialId)
    normalizedItems.push({
      materialId,
      quantity,
      unit: material.unit ?? '',
      notes: String(item.notes ?? '').trim(),
      sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : normalizedItems.length + 1,
    })
  }

  if (existingRecipeId) {
    const existingRow = db.exec(`SELECT id FROM manufacturing_recipes WHERE id = ?`, [existingRecipeId])[0]?.values?.[0]
    if (!existingRow) {
      throw new Error('نموذج التصنيع غير موجود.')
    }
  }

  return {
    name,
    productMaterialId,
    standardOutputQuantity,
    notes: String(payload.notes ?? '').trim(),
    status: payload.status === 'inactive' ? 'inactive' : 'active',
    items: normalizedItems,
  }
}

export function listRecipes() {
  const db = getDatabase()

  const rows = db.exec(`
    SELECT
      r.id,
      r.recipe_number,
      r.name,
      r.product_material_id,
      p.name,
      r.standard_output_quantity,
      p.unit,
      COUNT(ri.id),
      r.notes,
      r.status,
      r.created_at,
      r.updated_at
    FROM manufacturing_recipes r
    LEFT JOIN materials p ON p.id = r.product_material_id
    LEFT JOIN manufacturing_recipe_items ri ON ri.recipe_id = r.id
    WHERE r.status <> 'deleted'
    GROUP BY r.id, r.recipe_number, r.name, r.product_material_id, p.name, r.standard_output_quantity, p.unit, r.notes, r.status, r.created_at, r.updated_at
    ORDER BY r.created_at DESC, r.recipe_number DESC
  `)[0]?.values ?? []

  return rows.map(normalizeRecipeRow)
}

export function getRecipeById(id) {
  const db = getDatabase()

  const recipeRow = db.exec(`
    SELECT
      r.id,
      r.recipe_number,
      r.name,
      r.product_material_id,
      p.name,
      r.standard_output_quantity,
      p.unit,
      COUNT(ri.id),
      r.notes,
      r.status,
      r.created_at,
      r.updated_at
    FROM manufacturing_recipes r
    LEFT JOIN materials p ON p.id = r.product_material_id
    LEFT JOIN manufacturing_recipe_items ri ON ri.recipe_id = r.id
    WHERE r.id = ?
    GROUP BY r.id, r.recipe_number, r.name, r.product_material_id, p.name, r.standard_output_quantity, p.unit, r.notes, r.status, r.created_at, r.updated_at
  `, [id])[0]?.values?.[0]

  if (!recipeRow) return null

  const recipe = normalizeRecipeRow(recipeRow)
  const itemRows = db.exec(`
    SELECT
      ri.id,
      ri.recipe_id,
      ri.material_id,
      m.name,
      ri.quantity,
      ri.unit,
      ri.notes,
      ri.sort_order
    FROM manufacturing_recipe_items ri
    LEFT JOIN materials m ON m.id = ri.material_id
    WHERE ri.recipe_id = ?
    ORDER BY ri.sort_order ASC, ri.id ASC
  `, [id])[0]?.values ?? []

  return {
    ...recipe,
    items: itemRows.map(normalizeRecipeItemRow),
  }
}

export function getNextRecipeNumber() {
  const db = getDatabase()
  return getNextRecipeNumberInternal(db)
}

function getNextProductionOrderNumberInternal(db) {
  const rows = db.exec(
    `SELECT order_number FROM production_orders WHERE order_number LIKE 'PRD-%' ORDER BY order_number ASC`
  )[0]?.values ?? []

  let maxNumber = 0

  for (const row of rows) {
    const value = String(row[0] ?? '')
    const match = value.match(/^PRD-(\d+)$/)
    if (match) {
      const current = Number(match[1])
      if (!Number.isNaN(current) && current > maxNumber) {
        maxNumber = current
      }
    }
  }

  return `PRD-${String(maxNumber + 1).padStart(6, '0')}`
}

export function listProductionOrders() {
  const db = getDatabase()

  const rows = db.exec(`
    SELECT
      po.id,
      po.order_number,
      po.date,
      po.recipe_id,
      r.name,
      po.product_material_id,
      p.name,
      po.output_warehouse_id,
      w.name,
      po.planned_output_quantity,
      po.actual_output_quantity,
      po.labor_cost,
      po.material_cost_total,
      po.total_production_cost,
      po.unit_production_cost,
      po.notes,
      po.created_at,
      po.updated_at
    FROM production_orders po
    LEFT JOIN manufacturing_recipes r ON r.id = po.recipe_id
    LEFT JOIN materials p ON p.id = po.product_material_id
    LEFT JOIN warehouses w ON w.id = po.output_warehouse_id
    ORDER BY po.date DESC, po.order_number DESC
  `)[0]?.values ?? []

  return rows.map(row => ({
    id: row[0],
    orderNumber: row[1],
    date: row[2],
    recipeId: row[3],
    recipeName: row[4] ?? '',
    productMaterialId: row[5],
    productName: row[6] ?? '',
    outputWarehouseId: row[7],
    outputWarehouseName: row[8] ?? '',
    plannedOutputQuantity: Number(row[9] ?? 0),
    actualOutputQuantity: Number(row[10] ?? 0),
    laborCost: Number(row[11] ?? 0),
    materialCostTotal: Number(row[12] ?? 0),
    totalProductionCost: Number(row[13] ?? 0),
    unitProductionCost: Number(row[14] ?? 0),
    notes: row[15] ?? '',
    createdAt: row[16],
    updatedAt: row[17],
  }))
}

export function getProductionOrderById(id) {
  const db = getDatabase()

  const orderRow = db.exec(`
    SELECT
      po.id,
      po.order_number,
      po.date,
      po.recipe_id,
      r.name,
      po.product_material_id,
      p.name,
      po.output_warehouse_id,
      w.name,
      po.planned_output_quantity,
      po.actual_output_quantity,
      po.labor_cost,
      po.material_cost_total,
      po.total_production_cost,
      po.unit_production_cost,
      po.notes,
      po.created_at,
      po.updated_at
    FROM production_orders po
    LEFT JOIN manufacturing_recipes r ON r.id = po.recipe_id
    LEFT JOIN materials p ON p.id = po.product_material_id
    LEFT JOIN warehouses w ON w.id = po.output_warehouse_id
    WHERE po.id = ?
  `, [id])[0]?.values?.[0]

  if (!orderRow) {
    return null
  }

  const order = {
    id: orderRow[0],
    orderNumber: orderRow[1],
    date: orderRow[2],
    recipeId: orderRow[3],
    recipeName: orderRow[4] ?? '',
    productMaterialId: orderRow[5],
    productName: orderRow[6] ?? '',
    outputWarehouseId: orderRow[7],
    outputWarehouseName: orderRow[8] ?? '',
    plannedOutputQuantity: Number(orderRow[9] ?? 0),
    actualOutputQuantity: Number(orderRow[10] ?? 0),
    laborCost: Number(orderRow[11] ?? 0),
    materialCostTotal: Number(orderRow[12] ?? 0),
    totalProductionCost: Number(orderRow[13] ?? 0),
    unitProductionCost: Number(orderRow[14] ?? 0),
    notes: orderRow[15] ?? '',
    createdAt: orderRow[16],
    updatedAt: orderRow[17],
  }

  const inputRows = db.exec(`
    SELECT
      poi.id,
      poi.production_order_id,
      poi.recipe_item_id,
      poi.material_id,
      m.name,
      poi.warehouse_id,
      w.name,
      poi.unit,
      poi.planned_quantity,
      poi.actual_quantity,
      poi.unit_cost,
      poi.total_cost,
      poi.notes,
      poi.sort_order
    FROM production_order_inputs poi
    LEFT JOIN materials m ON m.id = poi.material_id
    LEFT JOIN warehouses w ON w.id = poi.warehouse_id
    WHERE poi.production_order_id = ?
    ORDER BY poi.sort_order ASC, poi.id ASC
  `, [id])[0]?.values ?? []

  const outputRows = db.exec(`
    SELECT
      poo.id,
      poo.production_order_id,
      poo.material_id,
      m.name,
      poo.warehouse_id,
      w.name,
      poo.unit,
      poo.quantity,
      poo.unit_cost,
      poo.total_cost
    FROM production_order_outputs poo
    LEFT JOIN materials m ON m.id = poo.material_id
    LEFT JOIN warehouses w ON w.id = poo.warehouse_id
    WHERE poo.production_order_id = ?
  `, [id])[0]?.values ?? []

  return {
    ...order,
    inputs: inputRows.map(row => ({
      id: row[0],
      productionOrderId: row[1],
      recipeItemId: row[2],
      materialId: row[3],
      materialName: row[4] ?? '',
      warehouseId: row[5],
      warehouseName: row[6] ?? '',
      unit: row[7] ?? '',
      plannedQuantity: Number(row[8] ?? 0),
      actualQuantity: Number(row[9] ?? 0),
      unitCost: Number(row[10] ?? 0),
      totalCost: Number(row[11] ?? 0),
      notes: row[12] ?? '',
      sortOrder: Number(row[13] ?? 0),
    })),
    outputs: outputRows.map(row => ({
      id: row[0],
      productionOrderId: row[1],
      materialId: row[2],
      materialName: row[3] ?? '',
      warehouseId: row[4],
      warehouseName: row[5] ?? '',
      unit: row[6] ?? '',
      quantity: Number(row[7] ?? 0),
      unitCost: Number(row[8] ?? 0),
      totalCost: Number(row[9] ?? 0),
    })),
  }
}

export function getNextProductionOrderNumber() {
  const db = getDatabase()
  return getNextProductionOrderNumberInternal(db)
}

export function createProductionOrder(payload) {
  const db = getDatabase()
  const now = new Date().toISOString()

  const recipeId = String(payload.recipeId ?? '').trim()
  const recipeRow = db.exec(`SELECT id, name, product_material_id, standard_output_quantity, status FROM manufacturing_recipes WHERE id = ?`, [recipeId])[0]?.values?.[0]
  if (!recipeRow) {
    throw new Error('نموذج التصنيع غير موجود أو غير فعال.')
  }

  if (String(recipeRow[4] ?? '') !== 'active') {
    throw new Error('نموذج التصنيع غير فعال.')
  }

  const productMaterialId = String(recipeRow[2] ?? '').trim()
  const productMaterial = getRecipeMaterialRecord(db, productMaterialId)
  if (!productMaterial || productMaterial.type !== 'sub' || productMaterial.isNonStock || productMaterial.status !== 'active') {
    throw new Error('المنتج الناتج غير صالح للتصنيع.')
  }

  const outputWarehouseId = String(payload.outputWarehouseId ?? '').trim()
  const outputWarehouse = ensureWarehouseExists(db, outputWarehouseId)
  if (!outputWarehouse || outputWarehouse.status !== 'active') {
    throw new Error('مخزن المنتج النهائي غير موجود أو غير فعال.')
  }

  const plannedOutputQuantity = Number(payload.plannedOutputQuantity)
  const actualOutputQuantity = Number(payload.actualOutputQuantity)
  const laborCost = Number(payload.laborCost ?? 0)
  if (!Number.isFinite(plannedOutputQuantity) || plannedOutputQuantity <= 0) {
    throw new Error('يجب أن تكون الكمية المخططة أكبر من صفر.')
  }
  if (!Number.isFinite(actualOutputQuantity) || actualOutputQuantity <= 0) {
    throw new Error('يجب أن تكون الكمية الناتجة فعلياً أكبر من صفر.')
  }
  if (!Number.isFinite(laborCost) || laborCost < 0) {
    throw new Error('تكلفة الأجور يجب أن تكون صفراً أو قيمة موجبة.')
  }

  const recipeItems = db.exec(`
    SELECT id, material_id, quantity, unit
    FROM manufacturing_recipe_items
    WHERE recipe_id = ?
    ORDER BY sort_order ASC, id ASC
  `, [recipeId])[0]?.values ?? []

  const rawItems = Array.isArray(payload.items) ? payload.items : []
  if (rawItems.length === 0) {
    throw new Error('يجب إضافة مادة أولية واحدة على الأقل.')
  }

  const aggregated = new Map()

  for (const item of rawItems) {
    const materialId = String(item.materialId ?? '').trim()
    const warehouseId = String(item.warehouseId ?? '').trim()
    const qty = Number(item.actualQuantity ?? 0)

    if (!materialId) {
      throw new Error('توجد مادة أولية غير محددة.')
    }

    if (!warehouseId) {
      throw new Error('كل مادة أولية تحتاج إلى مخزن صرف.')
    }

    if (!Number.isFinite(qty) || qty <= 0) {
      throw new Error('يجب أن تكون الكمية الفعلية أكبر من صفر.')
    }

    const material = getRecipeMaterialRecord(db, materialId)
    if (!material || material.type !== 'sub' || material.isNonStock || material.status !== 'active') {
      throw new Error('إحدى المواد الأولية غير موجودة أو غير صالحة.')
    }

    const warehouse = ensureWarehouseExists(db, warehouseId)
    if (!warehouse || warehouse.status !== 'active') {
      throw new Error('إحدى مخازن الصرف غير موجودة أو غير فعالة.')
    }

    const storageKey = `${materialId}|${warehouseId}`
    const existing = aggregated.get(storageKey) ?? 0
    aggregated.set(storageKey, existing + qty)

    const available = computeAvailableQuantity(db, warehouseId, materialId)
    if (available < existing + qty) {
      throw new Error(`الرصيد المتوفر من مادة ${material.name} في مخزن المواد الخام هو ${available} فقط.`)
    }
  }

  const orderId = crypto.randomUUID()
  const orderNumber = getNextProductionOrderNumberInternal(db)
  const outputUnit = productMaterial.unit ?? ''

  let materialCostTotal = 0
  const inputRecords = []

  try {
    db.run('BEGIN')

    db.run(`
      INSERT INTO production_orders (
        id,
        order_number,
        date,
        recipe_id,
        product_material_id,
        output_warehouse_id,
        planned_output_quantity,
        actual_output_quantity,
        labor_cost,
        material_cost_total,
        total_production_cost,
        unit_production_cost,
        notes,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      orderId,
      orderNumber,
      payload.date || now,
      recipeId,
      productMaterialId,
      outputWarehouseId,
      plannedOutputQuantity,
      actualOutputQuantity,
      laborCost,
      0,
      0,
      0,
      payload.notes ?? '',
      now,
      now,
    ])

    for (let index = 0; index < rawItems.length; index++) {
      const item = rawItems[index]
      const materialId = String(item.materialId ?? '').trim()
      const qty = Number(item.actualQuantity ?? 0)
      const warehouseId = String(item.warehouseId ?? '').trim()
      const unitCost = Number(getAverageCost(db, warehouseId, materialId) ?? 0)
      const totalCost = qty * unitCost
      materialCostTotal += totalCost

      const inputId = crypto.randomUUID()
      inputRecords.push({ id: inputId, materialId, warehouseId, unitCost, totalCost, qty, notes: item.notes ?? '', sortOrder: index })

      db.run(`
        INSERT INTO production_order_inputs (
          id,
          production_order_id,
          recipe_item_id,
          material_id,
          warehouse_id,
          unit,
          planned_quantity,
          actual_quantity,
          unit_cost,
          total_cost,
          notes,
          sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        inputId,
        orderId,
        item.recipeItemId ?? null,
        materialId,
        warehouseId,
        item.unit ?? getRecipeMaterialRecord(db, materialId)?.unit ?? '',
        Number(item.plannedQuantity ?? qty),
        qty,
        unitCost,
        totalCost,
        item.notes ?? '',
        index,
      ])
    }

    const totalProductionCost = materialCostTotal + laborCost
    const unitProductionCost = actualOutputQuantity > 0 ? totalProductionCost / actualOutputQuantity : 0

    db.run(`
      UPDATE production_orders
      SET
        labor_cost = ?,
        material_cost_total = ?,
        total_production_cost = ?,
        unit_production_cost = ?,
        updated_at = ?
      WHERE id = ?
    `, [laborCost, materialCostTotal, totalProductionCost, unitProductionCost, now, orderId])

    const outputId = crypto.randomUUID()
    db.run(`
      INSERT INTO production_order_outputs (
        id,
        production_order_id,
        material_id,
        warehouse_id,
        unit,
        quantity,
        unit_cost,
        total_cost
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      outputId,
      orderId,
      productMaterialId,
      outputWarehouseId,
      outputUnit,
      actualOutputQuantity,
      unitProductionCost,
      actualOutputQuantity * unitProductionCost,
    ])

    const docReference = orderNumber
    const docId = `doc-${crypto.randomUUID()}`
    db.run(`
      INSERT INTO stock_movement_documents (
        id,
        reference,
        type,
        date,
        from_warehouse_id,
        to_warehouse_id,
        notes,
        created_by,
        created_at,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      docId,
      docReference,
      'production',
      payload.date || now,
      null,
      outputWarehouseId,
      null,
      null,
      now,
      'completed',
    ])

    let movementIndex = 0

    for (const inputRecord of inputRecords) {
      const movementId = `${docReference}-out-${movementIndex}`
      db.run(`
        INSERT INTO stock_movements (
          id,
          document_reference,
          type,
          reference,
          warehouse_id,
          material_id,
          quantity_in,
          quantity_out,
          unit,
          cost,
          notes,
          created_at,
          created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        movementId,
        docReference,
        'production_out',
        docReference,
        inputRecord.warehouseId,
        inputRecord.materialId,
        0,
        inputRecord.qty,
        inputRecord.unitCost ? getRecipeMaterialRecord(db, inputRecord.materialId)?.unit ?? null : null,
        inputRecord.unitCost,
        inputRecord.notes?.trim() || null,
        now,
        null,
      ])
      recalculateStockLevel(db, inputRecord.warehouseId, inputRecord.materialId)
      movementIndex += 1
    }

    const outputMovementId = `${docReference}-in-${movementIndex}`
    db.run(`
      INSERT INTO stock_movements (
        id,
        document_reference,
        type,
        reference,
        warehouse_id,
        material_id,
        quantity_in,
        quantity_out,
        unit,
        cost,
        notes,
        created_at,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      outputMovementId,
      docReference,
      'production_in',
      docReference,
      outputWarehouseId,
      productMaterialId,
      actualOutputQuantity,
      0,
      outputUnit,
      unitProductionCost,
      null,
      now,
      null,
    ])
    recalculateStockLevel(db, outputWarehouseId, productMaterialId)

    db.run('COMMIT')
    persistDatabase(db)
    return getProductionOrderById(orderId)
  } catch (error) {
    try { db.run('ROLLBACK') } catch (_) {}
    console.error('CREATE PRODUCTION ORDER ERROR:', error)
    throw error
  }
}

export function updateProductionOrder(orderId, payload) {
  const db = getDatabase()
  const now = new Date().toISOString()

  try {
    db.run('BEGIN')

    const existingHeader = db.exec(`
      SELECT
        po.id,
        po.order_number,
        po.date,
        po.recipe_id,
        po.product_material_id,
        po.output_warehouse_id,
        po.planned_output_quantity,
        po.actual_output_quantity,
        po.labor_cost,
        po.notes
      FROM production_orders po
      WHERE po.id = ?
    `, [orderId])[0]?.values?.[0]

    if (!existingHeader) {
      throw new Error('أمر الإنتاج غير موجود.')
    }

    const previousOrderNumber = String(existingHeader[1] ?? '').trim()
    const previousRecipeId = String(existingHeader[3] ?? '').trim()
    const previousProductMaterialId = String(existingHeader[4] ?? '').trim()
    const previousOutputWarehouseId = String(existingHeader[5] ?? '').trim()
    const previousActualOutputQuantity = Number(existingHeader[7] ?? 0)

    if (previousProductMaterialId && previousOutputWarehouseId && previousActualOutputQuantity > 0) {
      const availableToReverse = computeAvailableQuantity(db, previousOutputWarehouseId, previousProductMaterialId)
      if (availableToReverse < previousActualOutputQuantity) {
        throw new Error('لا يمكن تعديل الأمر لأن رصيد المنتج النهائي لا يسمح بعكس الكمية القديمة.')
      }
    }

    const recipeId = String(payload.recipeId ?? previousRecipeId ?? '').trim()
    if (!recipeId) {
      throw new Error('يجب اختيار نموذج التصنيع.')
    }

    const recipeRow = db.exec(`
      SELECT id, name, product_material_id, standard_output_quantity, status
      FROM manufacturing_recipes
      WHERE id = ?
    `, [recipeId])[0]?.values?.[0]

    if (!recipeRow) {
      throw new Error('نموذج التصنيع غير موجود أو غير فعال.')
    }

    if (String(recipeRow[4] ?? '') !== 'active') {
      throw new Error('نموذج التصنيع غير فعال.')
    }

    const productMaterialId = String(recipeRow[2] ?? '').trim()
    const productMaterial = getRecipeMaterialRecord(db, productMaterialId)
    if (!productMaterial || productMaterial.type !== 'sub' || productMaterial.isNonStock || productMaterial.status !== 'active') {
      throw new Error('المنتج الناتج غير صالح للتصنيع.')
    }

    const outputWarehouseId = String(payload.outputWarehouseId ?? previousOutputWarehouseId ?? '').trim()
    const outputWarehouse = ensureWarehouseExists(db, outputWarehouseId)
    if (!outputWarehouse || outputWarehouse.status !== 'active') {
      throw new Error('مخزن المنتج النهائي غير موجود أو غير فعال.')
    }

    const plannedOutputQuantity = Number(payload.plannedOutputQuantity)
    const actualOutputQuantity = Number(payload.actualOutputQuantity)
    const previousLaborCost = Number(existingHeader[8] ?? 0)
    const nextLaborCost = Number(payload.laborCost ?? previousLaborCost ?? 0)
    if (!Number.isFinite(plannedOutputQuantity) || plannedOutputQuantity <= 0) {
      throw new Error('يجب أن تكون الكمية المخططة أكبر من صفر.')
    }
    if (!Number.isFinite(actualOutputQuantity) || actualOutputQuantity <= 0) {
      throw new Error('يجب أن تكون الكمية الناتجة فعلياً أكبر من صفر.')
    }
    if (!Number.isFinite(nextLaborCost) || nextLaborCost < 0) {
      throw new Error('تكلفة الأجور يجب أن تكون صفراً أو قيمة موجبة.')
    }

    const previousInputs = db.exec(`
      SELECT material_id, warehouse_id, actual_quantity
      FROM production_order_inputs
      WHERE production_order_id = ?
      ORDER BY sort_order ASC, id ASC
    `, [orderId])[0]?.values ?? []

    const previousOutputs = db.exec(`
      SELECT material_id, warehouse_id, quantity
      FROM production_order_outputs
      WHERE production_order_id = ?
      ORDER BY id ASC
    `, [orderId])[0]?.values ?? []

    const reverseTargets = new Set()
    for (const row of previousInputs) {
      const materialId = String(row[0] ?? '').trim()
      const warehouseId = String(row[1] ?? '').trim()
      if (materialId && warehouseId) {
        reverseTargets.add(`${warehouseId}|${materialId}`)
      }
    }
    for (const row of previousOutputs) {
      const materialId = String(row[0] ?? '').trim()
      const warehouseId = String(row[1] ?? '').trim()
      if (materialId && warehouseId) {
        reverseTargets.add(`${warehouseId}|${materialId}`)
      }
    }

    db.run(`DELETE FROM stock_movements WHERE document_reference = ?`, [previousOrderNumber])
    db.run(`DELETE FROM stock_movement_documents WHERE reference = ?`, [previousOrderNumber])

    for (const key of reverseTargets) {
      const [warehouseId, materialId] = key.split('|')
      if (warehouseId && materialId) {
        recalculateStockLevel(db, warehouseId, materialId)
      }
    }

    const rawItems = Array.isArray(payload.items) ? payload.items : []
    if (rawItems.length === 0) {
      throw new Error('يجب إضافة مادة أولية واحدة على الأقل.')
    }

    const aggregated = new Map()
    for (const item of rawItems) {
      const materialId = String(item.materialId ?? '').trim()
      const warehouseId = String(item.warehouseId ?? '').trim()
      const qty = Number(item.actualQuantity ?? 0)

      if (!materialId) {
        throw new Error('توجد مادة أولية غير محددة.')
      }
      if (!warehouseId) {
        throw new Error('كل مادة أولية تحتاج إلى مخزن صرف.')
      }
      if (!Number.isFinite(qty) || qty <= 0) {
        throw new Error('يجب أن تكون الكمية الفعلية أكبر من صفر.')
      }

      const material = getRecipeMaterialRecord(db, materialId)
      if (!material || material.type !== 'sub' || material.isNonStock || material.status !== 'active') {
        throw new Error('إحدى المواد الأولية غير موجودة أو غير صالحة.')
      }

      const warehouse = ensureWarehouseExists(db, warehouseId)
      if (!warehouse || warehouse.status !== 'active') {
        throw new Error('إحدى مخازن الصرف غير موجودة أو غير فعالة.')
      }

      const storageKey = `${materialId}|${warehouseId}`
      const existing = aggregated.get(storageKey) ?? 0
      const nextTotal = existing + qty
      aggregated.set(storageKey, nextTotal)

      const available = computeAvailableQuantity(db, warehouseId, materialId)
      if (available < nextTotal) {
        throw new Error(`الرصيد المتوفر من مادة ${material.name} في مخزن المواد الخام هو ${available} فقط.`)
      }
    }

    let materialCostTotal = 0
    const inputRecords = []

    db.run(`DELETE FROM production_order_inputs WHERE production_order_id = ?`, [orderId])
    db.run(`DELETE FROM production_order_outputs WHERE production_order_id = ?`, [orderId])

    for (let index = 0; index < rawItems.length; index++) {
      const item = rawItems[index]
      const materialId = String(item.materialId ?? '').trim()
      const warehouseId = String(item.warehouseId ?? '').trim()
      const qty = Number(item.actualQuantity ?? 0)
      const unitCost = Number(getAverageCost(db, warehouseId, materialId) ?? 0)
      const totalCost = qty * unitCost
      materialCostTotal += totalCost

      const inputId = crypto.randomUUID()
      inputRecords.push({
        id: inputId,
        materialId,
        warehouseId,
        unitCost,
        totalCost,
        qty,
        notes: String(item.notes ?? '').trim(),
        sortOrder: index,
      })

      db.run(`
        INSERT INTO production_order_inputs (
          id,
          production_order_id,
          recipe_item_id,
          material_id,
          warehouse_id,
          unit,
          planned_quantity,
          actual_quantity,
          unit_cost,
          total_cost,
          notes,
          sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        inputId,
        orderId,
        item.recipeItemId ?? null,
        materialId,
        warehouseId,
        item.unit ?? getRecipeMaterialRecord(db, materialId)?.unit ?? '',
        Number(item.plannedQuantity ?? qty),
        qty,
        unitCost,
        totalCost,
        String(item.notes ?? '').trim(),
        index,
      ])
    }

    const totalProductionCost = materialCostTotal + nextLaborCost
    const unitProductionCost = actualOutputQuantity > 0 ? totalProductionCost / actualOutputQuantity : 0

    db.run(`
      UPDATE production_orders
      SET
        date = ?,
        recipe_id = ?,
        product_material_id = ?,
        output_warehouse_id = ?,
        planned_output_quantity = ?,
        actual_output_quantity = ?,
        labor_cost = ?,
        material_cost_total = ?,
        total_production_cost = ?,
        unit_production_cost = ?,
        notes = ?,
        updated_at = ?
      WHERE id = ?
    `, [
      payload.date || existingHeader[2],
      recipeId,
      productMaterialId,
      outputWarehouseId,
      plannedOutputQuantity,
      actualOutputQuantity,
      nextLaborCost,
      materialCostTotal,
      totalProductionCost,
      unitProductionCost,
      payload.notes ?? existingHeader[9] ?? '',
      now,
      orderId,
    ])

    const outputId = crypto.randomUUID()
    db.run(`
      INSERT INTO production_order_outputs (
        id,
        production_order_id,
        material_id,
        warehouse_id,
        unit,
        quantity,
        unit_cost,
        total_cost
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      outputId,
      orderId,
      productMaterialId,
      outputWarehouseId,
      productMaterial.unit ?? '',
      actualOutputQuantity,
      unitProductionCost,
      actualOutputQuantity * unitProductionCost,
    ])

    const docId = `doc-${crypto.randomUUID()}`
    db.run(`
      INSERT INTO stock_movement_documents (
        id,
        reference,
        type,
        date,
        from_warehouse_id,
        to_warehouse_id,
        notes,
        created_by,
        created_at,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      docId,
      previousOrderNumber,
      'production',
      payload.date || existingHeader[2],
      null,
      outputWarehouseId,
      payload.notes ?? null,
      null,
      now,
      'completed',
    ])

    let movementIndex = 0
    for (const inputRecord of inputRecords) {
      const movementId = `${previousOrderNumber}-out-${movementIndex}`
      db.run(`
        INSERT INTO stock_movements (
          id,
          document_reference,
          type,
          reference,
          warehouse_id,
          material_id,
          quantity_in,
          quantity_out,
          unit,
          cost,
          notes,
          created_at,
          created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        movementId,
        previousOrderNumber,
        'production_out',
        previousOrderNumber,
        inputRecord.warehouseId,
        inputRecord.materialId,
        0,
        inputRecord.qty,
        getRecipeMaterialRecord(db, inputRecord.materialId)?.unit ?? null,
        inputRecord.unitCost,
        inputRecord.notes?.trim() || null,
        now,
        null,
      ])
      recalculateStockLevel(db, inputRecord.warehouseId, inputRecord.materialId)
      movementIndex += 1
    }

    const outputMovementId = `${previousOrderNumber}-in-${movementIndex}`
    db.run(`
      INSERT INTO stock_movements (
        id,
        document_reference,
        type,
        reference,
        warehouse_id,
        material_id,
        quantity_in,
        quantity_out,
        unit,
        cost,
        notes,
        created_at,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      outputMovementId,
      previousOrderNumber,
      'production_in',
      previousOrderNumber,
      outputWarehouseId,
      productMaterialId,
      actualOutputQuantity,
      0,
      productMaterial.unit ?? '',
      unitProductionCost,
      null,
      now,
      null,
    ])
    recalculateStockLevel(db, outputWarehouseId, productMaterialId)

    db.run('COMMIT')
    persistDatabase(db)
    return getProductionOrderById(orderId)
  } catch (error) {
    try { db.run('ROLLBACK') } catch (_) {}
    console.error('UPDATE PRODUCTION ORDER ERROR:', error)
    throw error
  }
}

export function deleteProductionOrder(orderId) {
  const db = getDatabase()

  try {
    db.run('BEGIN')

    const header = db.exec(`
      SELECT
        po.id,
        po.order_number,
        po.product_material_id,
        po.output_warehouse_id,
        po.actual_output_quantity
      FROM production_orders po
      WHERE po.id = ?
    `, [orderId])[0]?.values?.[0]

    if (!header) {
      throw new Error('أمر الإنتاج غير موجود.')
    }

    const orderNumber = String(header[1] ?? '').trim()
    const productMaterialId = String(header[2] ?? '').trim()
    const outputWarehouseId = String(header[3] ?? '').trim()
    const actualOutputQuantity = Number(header[4] ?? 0)

    const inputRows = db.exec(`
      SELECT material_id, warehouse_id, actual_quantity
      FROM production_order_inputs
      WHERE production_order_id = ?
      ORDER BY sort_order ASC, id ASC
    `, [orderId])[0]?.values ?? []

    const outputRows = db.exec(`
      SELECT material_id, warehouse_id, quantity
      FROM production_order_outputs
      WHERE production_order_id = ?
      ORDER BY id ASC
    `, [orderId])[0]?.values ?? []

    const affectedMaterialKeys = new Set()
    for (const row of inputRows) {
      const materialId = String(row[0] ?? '').trim()
      const warehouseId = String(row[1] ?? '').trim()
      if (materialId && warehouseId) {
        affectedMaterialKeys.add(`${warehouseId}|${materialId}`)
      }
    }

    for (const row of outputRows) {
      const materialId = String(row[0] ?? '').trim()
      const warehouseId = String(row[1] ?? '').trim()
      if (materialId && warehouseId) {
        affectedMaterialKeys.add(`${warehouseId}|${materialId}`)
      }
    }

    if (productMaterialId && outputWarehouseId && actualOutputQuantity > 0) {
      affectedMaterialKeys.add(`${outputWarehouseId}|${productMaterialId}`)
    }

    db.run(`DELETE FROM stock_movements WHERE document_reference = ?`, [orderNumber])
    db.run(`DELETE FROM stock_movement_documents WHERE reference = ?`, [orderNumber])

    for (const key of affectedMaterialKeys) {
      const [warehouseId, materialId] = key.split('|')
      if (warehouseId && materialId) {
        recalculateStockLevel(db, warehouseId, materialId)
      }
    }

    db.run(`DELETE FROM production_order_inputs WHERE production_order_id = ?`, [orderId])
    db.run(`DELETE FROM production_order_outputs WHERE production_order_id = ?`, [orderId])
    db.run(`DELETE FROM production_orders WHERE id = ?`, [orderId])

    db.run('COMMIT')
    persistDatabase(db)
    return listProductionOrders()
  } catch (error) {
    try { db.run('ROLLBACK') } catch (_) {}
    console.error('DELETE PRODUCTION ORDER ERROR:', error)
    throw error
  }
}

export function deleteRecipe(id) {
  const db = getDatabase()

  try {
    db.run('BEGIN')

    const recipeRow = db.exec(`
      SELECT id
      FROM manufacturing_recipes
      WHERE id = ?
    `, [id])[0]?.values?.[0]

    if (!recipeRow) {
      throw new Error('نموذج التصنيع غير موجود.')
    }

    const recipeInUse = db.exec(`
      SELECT id
      FROM production_orders
      WHERE recipe_id = ?
      LIMIT 1
    `, [id])[0]?.values?.[0]

    if (recipeInUse) {
      throw new Error('لا يمكن حذف نموذج التصنيع لأنه مستخدم في أمر إنتاج.')
    }

    db.run(`DELETE FROM manufacturing_recipe_items WHERE recipe_id = ?`, [id])
    db.run(`DELETE FROM manufacturing_recipes WHERE id = ?`, [id])
    db.run('COMMIT')
    persistDatabase(db)
    return true
  } catch (error) {
    try { db.run('ROLLBACK') } catch (_) {}
    console.error('DELETE RECIPE ERROR:', error)
    throw error
  }
}

export function createMaterial(input) {
  const db = getDatabase()
  const now = new Date().toISOString()
  const id = input.id || `${input.type}-${crypto.randomUUID()}`

  try {
    db.run('BEGIN')

    db.run(
      `INSERT INTO materials (
        id,
        material_number,
        name,
        opening_balance,
        opening_warehouse_id,
        type,
        parent_id,
        returnability,
        unit,
        cost_price,
        price1,
        price2,
        price3,
        notes,
        is_non_stock,
        status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        id,
        input.materialNumber,
        input.name,
        (typeof input.openingBalance !== 'undefined' && input.openingBalance !== null) ? Number(input.openingBalance) : null,
        input.openingWarehouseId ?? null,
        input.type,
        input.parentId ?? null,
        input.returnability ?? '',
        input.unit ?? '',
        input.costPrice ?? '',
        input.price1 ?? '',
        input.price2 ?? '',
        input.price3 ?? '',
        input.notes ?? '',
        input.isNonStock ? 1 : 0,
        'active',
        now,
        now,
      ]
    )

    // If sub and stockable and openingBalance > 0, create opening adjustment document atomically
    if (input.type === 'sub' && !input.isNonStock && input.openingBalance && Number(input.openingBalance) > 0) {
      const whId = input.openingWarehouseId
      const openingQty = Number(input.openingBalance)
      const ensureWh = ensureWarehouseExists(db, whId)
      if (!ensureWh || ensureWh.status !== 'active') {
        db.run('ROLLBACK')
        throw new Error('المخزن المختار غير موجود أو غير مفعل.')
      }

      // Legacy schema accepts adjustment document types for opening balance records.
      // UI may label this as "رصيد افتتاحي", but the internal DB type must remain compatible.
      const reference = generateSequentialReference(db, 'OPENING')
      const openingCost = parseOpeningCost(input.costPrice)
      const existing = db.exec(`SELECT 1 FROM stock_movement_documents WHERE reference = ?`, [reference])[0]?.values?.[0]?.[0]
      if (existing) {
        const current = db.exec(`SELECT SUM(quantity_in - quantity_out) FROM stock_movements WHERE document_reference = ? AND material_id = ?`, [reference, id])[0]?.values?.[0]?.[0] ?? 0
        const diff = openingQty - Number(current)
        if (diff !== 0) {
          const now2 = new Date().toISOString()
          const movId = `${reference}-adj-${crypto.randomUUID()}`
          if (diff > 0) {
            db.run(`INSERT INTO stock_movements (id, document_reference, type, reference, warehouse_id, material_id, quantity_in, quantity_out, unit, cost, notes, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [movId, reference, 'adjustment_in', reference, whId, id, diff, 0, input.unit ?? null, openingCost, 'synchronized opening increase', now2, null])
            recalculateStockLevel(db, whId, id)
          } else {
            const out = Math.abs(diff)
            const avail = computeAvailableQuantity(db, whId, id)
            if (avail < out) {
              db.run('ROLLBACK')
              throw new Error('تعديل الرصيد الافتتاحي يؤدي إلى رصيد سلبي. استخدم تسوية الجرد بدلاً من ذلك.')
            }
            db.run(`INSERT INTO stock_movements (id, document_reference, type, reference, warehouse_id, material_id, quantity_in, quantity_out, unit, cost, notes, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [movId, reference, 'adjustment_out', reference, whId, id, 0, out, input.unit ?? null, null, 'synchronized opening decrease', now2, null])
            recalculateStockLevel(db, whId, id)
          }
        }
      } else {
        const docId = `doc-${crypto.randomUUID()}`
        const now2 = new Date().toISOString()
        db.run(`INSERT INTO stock_movement_documents (id, reference, type, date, from_warehouse_id, to_warehouse_id, notes, created_by, created_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [docId, reference, 'adjustment', now2, null, whId, null, null, now2, 'completed'])
        const movementId = `${reference}-0`
        db.run(`INSERT INTO stock_movements (id, document_reference, type, reference, warehouse_id, material_id, quantity_in, quantity_out, unit, cost, notes, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [movementId, reference, 'adjustment_in', reference, whId, id, openingQty, 0, input.unit ?? null, openingCost, 'opening balance', now2, null])
        recalculateStockLevel(db, whId, id)
      }
    }

    db.run('COMMIT')
    persistDatabase(db)
    return getAllMaterials()
  } catch (err) {
    try { db.run('ROLLBACK') } catch(e){}
    console.error('INSERT MATERIAL ERROR:', err)
    throw err
  }
}

export function createRecipe(payload) {
  const db = getDatabase()
  const now = new Date().toISOString()
  const validated = validateRecipePayload(db, payload)
  const recipeId = crypto.randomUUID()
  const recipeNumber = getNextRecipeNumberInternal(db)

  try {
    db.run('BEGIN')

    db.run(
      `INSERT INTO manufacturing_recipes (
        id,
        recipe_number,
        name,
        product_material_id,
        standard_output_quantity,
        notes,
        status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        recipeId,
        recipeNumber,
        validated.name,
        validated.productMaterialId,
        validated.standardOutputQuantity,
        validated.notes,
        validated.status,
        now,
        now,
      ]
    )

    for (const item of validated.items) {
      const itemId = crypto.randomUUID()
      db.run(
        `INSERT INTO manufacturing_recipe_items (
          id,
          recipe_id,
          material_id,
          quantity,
          unit,
          notes,
          sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?)` ,
        [
          itemId,
          recipeId,
          item.materialId,
          item.quantity,
          item.unit,
          item.notes,
          item.sortOrder,
        ]
      )
    }

    db.run('COMMIT')
    persistDatabase(db)
    return getRecipeById(recipeId)
  } catch (error) {
    try { db.run('ROLLBACK') } catch (_) {}
    console.error('CREATE RECIPE ERROR:', error)
    throw error
  }
}

export function updateRecipe(id, payload) {
  const db = getDatabase()
  const now = new Date().toISOString()
  const validated = validateRecipePayload(db, payload, id)

  try {
    db.run('BEGIN')

    db.run(
      `UPDATE manufacturing_recipes
       SET
         name = ?,
         product_material_id = ?,
         standard_output_quantity = ?,
         notes = ?,
         status = ?,
         updated_at = ?
       WHERE id = ?`,
      [
        validated.name,
        validated.productMaterialId,
        validated.standardOutputQuantity,
        validated.notes,
        validated.status,
        now,
        id,
      ]
    )

    db.run(`DELETE FROM manufacturing_recipe_items WHERE recipe_id = ?`, [id])

    for (const item of validated.items) {
      const itemId = crypto.randomUUID()
      db.run(
        `INSERT INTO manufacturing_recipe_items (
          id,
          recipe_id,
          material_id,
          quantity,
          unit,
          notes,
          sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?)` ,
        [
          itemId,
          id,
          item.materialId,
          item.quantity,
          item.unit,
          item.notes,
          item.sortOrder,
        ]
      )
    }

    db.run('COMMIT')
    persistDatabase(db)
    return getRecipeById(id)
  } catch (error) {
    try { db.run('ROLLBACK') } catch (_) {}
    console.error('UPDATE RECIPE ERROR:', error)
    throw error
  }
}

export function updateMaterial(id, input) {
  const db = getDatabase()
  const now = new Date().toISOString()

  try {
    db.run('BEGIN')

    // fetch existing opening for sync logic
    const existingRow = db.exec(`SELECT opening_balance, opening_warehouse_id FROM materials WHERE id = ?`, [id])[0]?.values?.[0]
    const existingOpeningBalance = existingRow ? (existingRow[0] === null ? null : Number(existingRow[0])) : null
    const existingOpeningWarehouse = existingRow ? existingRow[1] : null

    db.run(
      `UPDATE materials
       SET
         material_number = ?,
         name = ?,
         type = ?,
         parent_id = ?,
         returnability = ?,
         unit = ?,
         cost_price = ?,
         price1 = ?,
         price2 = ?,
         price3 = ?,
         notes = ?,
         is_non_stock = ?,
         opening_balance = ?,
         opening_warehouse_id = ?,
         updated_at = ?
       WHERE id = ?`,
      [
        input.materialNumber,
        input.name,
        input.type,
        input.parentId ?? null,
        input.returnability ?? '',
        input.unit ?? '',
        input.costPrice ?? '',
        input.price1 ?? '',
        input.price2 ?? '',
        input.price3 ?? '',
        input.notes ?? '',
        input.isNonStock ? 1 : 0,
        (typeof input.openingBalance !== 'undefined' && input.openingBalance !== null) ? Number(input.openingBalance) : null,
        input.openingWarehouseId ?? null,
        now,
        id,
      ]
    )

    // synchronize opening movements if necessary
    const newOpeningBalance = (typeof input.openingBalance !== 'undefined' && input.openingBalance !== null) ? Number(input.openingBalance) : null
    const newOpeningWarehouse = input.openingWarehouseId ?? null

    // only consider if material is sub and stockable
    if (input.type === 'sub' && !input.isNonStock) {
      const ref = generateSequentialReference(db, 'OPENING')
      const existingDoc = db.exec(`SELECT reference FROM stock_movement_documents WHERE reference = ?`, [ref])[0]?.values?.[0]?.[0]
      const openingCost = parseOpeningCost(input.costPrice)

      // helper: apply diff to stock_levels via adjustment movements
      const applyDiff = (warehouseId, diff) => {
        const now2 = new Date().toISOString()
        if (diff === 0) return
        if (diff > 0) {
          const movId = `${ref}-adj-${crypto.randomUUID()}`
          db.run(`INSERT INTO stock_movements (id, document_reference, type, reference, warehouse_id, material_id, quantity_in, quantity_out, unit, cost, notes, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [movId, ref, 'adjustment_in', ref, warehouseId, id, diff, 0, input.unit ?? null, openingCost, 'opening sync increase', now2, null])
          recalculateStockLevel(db, warehouseId, id)
        } else {
          const out = Math.abs(diff)
          const avail = computeAvailableQuantity(db, warehouseId, id)
          if (avail < out) {
            throw new Error('تعديل الرصيد الافتتاحي يؤدي إلى رصيد سلبي. استخدم تسوية الجرد بدلاً من ذلك.')
          }
          const movId = `${ref}-adj-${crypto.randomUUID()}`
          db.run(`INSERT INTO stock_movements (id, document_reference, type, reference, warehouse_id, material_id, quantity_in, quantity_out, unit, cost, notes, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [movId, ref, 'adjustment_out', ref, warehouseId, id, 0, out, input.unit ?? null, null, 'opening sync decrease', now2, null])
          recalculateStockLevel(db, warehouseId, id)
        }
      }

      if ((existingOpeningBalance === null || existingOpeningBalance === 0) && (newOpeningBalance && newOpeningBalance > 0)) {
        // create new opening doc if not exists
        const wh = newOpeningWarehouse
        const ensureWh = ensureWarehouseExists(db, wh)
        if (!ensureWh || ensureWh.status !== 'active') {
          throw new Error('المخزن المختار غير موجود أو غير مفعل.')
        }
        if (!existingDoc) {
          const docId = `doc-${crypto.randomUUID()}`
          const now2 = new Date().toISOString()
          db.run(`INSERT INTO stock_movement_documents (id, reference, type, date, from_warehouse_id, to_warehouse_id, notes, created_by, created_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [docId, ref, 'adjustment', now2, null, wh, null, null, now2, 'completed'])
          const movementId = `${ref}-0`
          db.run(`INSERT INTO stock_movements (id, document_reference, type, reference, warehouse_id, material_id, quantity_in, quantity_out, unit, cost, notes, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [movementId, ref, 'adjustment_in', ref, wh, id, newOpeningBalance, 0, input.unit ?? null, openingCost, 'opening balance', now2, null])
          recalculateStockLevel(db, wh, id)
        }
      } else if (existingDoc) {
        // synchronize differences between existing opening and new values
        const current = db.exec(`SELECT SUM(quantity_in - quantity_out) FROM stock_movements WHERE document_reference = ? AND material_id = ?`, [ref, id])[0]?.values?.[0]?.[0] ?? 0
        const currNum = Number(current)
        const newNum = newOpeningBalance ? Number(newOpeningBalance) : 0
        if (existingOpeningWarehouse === newOpeningWarehouse) {
          const diff = newNum - currNum
          if (diff !== 0) applyDiff(newOpeningWarehouse, diff)
        } else {
          // move between warehouses: remove from old, add to new
          if (existingOpeningWarehouse && currNum > 0) {
            applyDiff(existingOpeningWarehouse, -currNum)
          }
          if (newOpeningWarehouse && newNum > 0) {
            applyDiff(newOpeningWarehouse, newNum)
          }
        }
      }
    }

    db.run('COMMIT')
    persistDatabase(db)
    return getAllMaterials()
  } catch (err) {
    try { db.run('ROLLBACK') } catch(e){}
    console.error('UPDATE MATERIAL ERROR:', err)
    throw err
  }
}

export function deleteMaterial(id) {
  const db = getDatabase()
  const now = new Date().toISOString()

  // Collect all descendant IDs (including the root id) using iterative traversal
  const collectDescendants = (rootId) => {
    const stack = [rootId]
    const collected = new Set()

    while (stack.length) {
      const current = stack.pop()
      if (collected.has(current)) continue
      collected.add(current)
      const rows = db.exec(`SELECT id FROM materials WHERE parent_id = ?`, [current])[0]?.values ?? []
      for (const r of rows) {
        const childId = r[0]
        if (!collected.has(childId)) stack.push(childId)
      }
    }

    return Array.from(collected)
  }

  try {
    db.run('BEGIN')

    const allIds = collectDescendants(id)

    // 1) Check for operational stock movements for any material in the set.
    // Opening movements have document_reference = `OPENING-{materialId}` and are allowed to be removed.
    for (const mid of allIds) {
      const openingRef = `OPENING-${mid}`
      const operationalCount = db.exec(
        `SELECT COUNT(1) FROM stock_movements WHERE material_id = ? AND COALESCE(document_reference, '') <> ?`,
        [mid, openingRef]
      )[0]?.values?.[0]?.[0] ?? 0

      if (Number(operationalCount) > 0) {
        db.run('ROLLBACK')
        throw new Error('لا يمكن حذف هذه المادة نهائياً لأنها مرتبطة بحركات مخزنية. يجب معالجة الحركات المرتبطة أولاً.')
      }
    }

    // 2) Remove opening movement lines and their documents if they become empty.
    for (const mid of allIds) {
      const openingRef = `OPENING-${mid}`
      // delete movement lines for opening reference
      db.run(`DELETE FROM stock_movements WHERE document_reference = ?`, [openingRef])
      // if no movement lines reference the document, delete the document
      const remaining = db.exec(`SELECT COUNT(1) FROM stock_movements WHERE document_reference = ?`, [openingRef])[0]?.values?.[0]?.[0] ?? 0
      if (Number(remaining) === 0) {
        db.run(`DELETE FROM stock_movement_documents WHERE reference = ?`, [openingRef])
      }
    }

    // 3) Remove stock_levels for materials in the set
    if (allIds.length > 0) {
      const placeholders = allIds.map(() => '?').join(',')
      db.run(`DELETE FROM stock_levels WHERE material_id IN (${placeholders})`, allIds)
    }

    // 4) Delete materials bottom-up (children first) to respect FK constraints
    const remaining = new Set(allIds)
    while (remaining.size > 0) {
      const idsArray = Array.from(remaining)
      const placeholders = idsArray.map(() => '?').join(',')

      // find which of the remaining ids are parents of others in the remaining set
      const childParentsRows = db.exec(
        `SELECT parent_id FROM materials WHERE parent_id IN (${placeholders})`,
        idsArray
      )[0]?.values ?? []

      const parentsWithChildren = new Set(childParentsRows.map(r => r[0]))

      // leaves are those remaining ids that are not parents of any remaining id
      const leaves = idsArray.filter(i => !parentsWithChildren.has(i))

      if (leaves.length === 0) {
        // defensive fallback: if cycle or unexpected state, break to avoid infinite loop
        db.run('ROLLBACK')
        throw new Error('فشل في حذف المواد: بنية الشجرة غير متوقعة.')
      }

      for (const leaf of leaves) {
        db.run(`DELETE FROM materials WHERE id = ?`, [leaf])
        remaining.delete(leaf)
      }
    }

    db.run('COMMIT')
    persistDatabase(db)
    return getAllMaterials()
  } catch (err) {
    try { db.run('ROLLBACK') } catch (e) {}
    console.error('DELETE MATERIAL ERROR:', err)
    throw err
  }
}

export function searchMaterials(term) {
  const db = getDatabase()
  const query = `%${String(term ?? '')}%`

  const rows = db.exec(`
    SELECT id, material_number, name, type, parent_id, returnability, unit, cost_price, price1, price2, price3, notes, is_non_stock, opening_balance, opening_warehouse_id, status, created_at, updated_at
    FROM materials
    WHERE status <> 'deleted'
      AND (
        name LIKE ? OR
        material_number LIKE ? OR
        notes LIKE ? OR
        returnability LIKE ?
      )
    ORDER BY created_at
  `, [query, query, query, query])[0]?.values

  const result = []

  for (const row of rows ?? []) {
    result.push(normalizeRow({
      id: row[0],
      material_number: row[1],
      name: row[2],
      type: row[3],
      parent_id: row[4],
      returnability: row[5],
      unit: row[6],
      cost_price: row[7],
      price1: row[8],
      price2: row[9],
      price3: row[10],
      notes: row[11],
      is_non_stock: row[12],
      opening_balance: row[13],
      opening_warehouse_id: row[14],
      status: row[15],
      created_at: row[16],
      updated_at: row[17],
    }))
  }

  return result
}

// The following stock movement functions are implemented above and should remain the single source of truth.
// Duplicate legacy definitions have been removed to keep the repository clean.


function normalizeNumber(value) {
  const num = Number(value ?? 0)
  return Number.isFinite(num) ? num : 0
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
