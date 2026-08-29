import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import {
  listMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  searchMaterials,
  listRecipes,
  getRecipeById,
  getNextRecipeNumber,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  listProductionOrders,
  getProductionOrderById,
  getNextProductionOrderNumber,
  createProductionOrder,
  updateProductionOrder,
  deleteProductionOrder,
  initDatabase,
  listWarehouses,
  createWarehouse,
  updateWarehouse,
  toggleWarehouseStatus,
  deleteWarehouse,
  hasWarehouseActivity,
  listStockMovements,
  getStockMovementByReference,
  createStockMovementDocument,
  createAdjustmentDocument,
  updateAdjustmentDocument,
  deleteAdjustmentDocument,
  getStockBalancesByWarehouse,
  getStockBalancesByMaterial,
  getDatabase,
  listSuppliers,
  listActiveSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getNextPurchaseInvoiceDraftData,
  listPurchaseInvoices,
  getPurchaseInvoiceById,
  createPurchaseInvoiceDraft,
  updatePurchaseInvoiceDraft,
  updateApprovedPurchaseInvoice,
  deletePurchaseInvoiceDraft,
  completePurchaseInvoice,
  deletePurchaseInvoice,
  addPurchasePayment,
  deletePurchasePayment,
  listPurchaseReturns,
  getPurchaseReturnById,
  createPurchaseReturn,
  updatePurchaseReturn,
  deletePurchaseReturn,
  listCustomers,
  listActiveCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getNextSalesInvoiceDraftData,
  listSalesInvoices,
  getSalesInvoiceById,
  createSalesInvoiceDraft,
  updateSalesInvoiceDraft,
  updateApprovedSalesInvoice,
  deleteSalesInvoiceDraft,
  completeSalesInvoice,
  deleteSalesInvoice,
  addSalesPayment,
  deleteSalesPayment,
  listSalesReturns,
  getSalesReturnById,
  createSalesReturn,
  updateSalesReturn,
  deleteSalesReturn,
  createDatabaseBackup,
  restoreDatabaseFromBackup,
  resetDatabase,
  getDatabaseFilePath,
} from './materialsRepository.js'
import { fileURLToPath } from 'node:url'
import { getReportData, getReportExportRows } from './reports.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Keep Chromium cache/session files separate between development and the installed app.
// This prevents npm run dev from fighting with a packaged Craft process over the same cache.
app.setPath(
  'sessionData',
  path.join(
    app.getPath('userData'),
    app.isPackaged ? 'session-data' : 'session-data-dev',
  ),
)

const defaultAutoBackupSettings = {
  enabled: false,
  mode: 'new',
  backupDirectory: '',
  lastBackupAt: '',
}

let databaseInitialized = false
let allowQuitAfterBackup = false
let quitBackupPromise = null

function normalizeAutoBackupSettings(value = {}) {
  return {
    enabled: value.enabled === true,
    mode: value.mode === 'replace' ? 'replace' : 'new',
    backupDirectory:
      typeof value.backupDirectory === 'string'
        ? value.backupDirectory.trim()
        : '',
    lastBackupAt:
      typeof value.lastBackupAt === 'string'
        ? value.lastBackupAt.trim()
        : '',
  }
}

function getAutoBackupSettingsFilePath() {
  return path.join(app.getPath('userData'), 'auto-backup-settings.json')
}

async function readAutoBackupSettings() {
  try {
    const raw = await fs.readFile(getAutoBackupSettingsFilePath(), 'utf8')
    return normalizeAutoBackupSettings(JSON.parse(raw))
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      console.error('READ AUTO BACKUP SETTINGS FAILED', error)
    }
    return { ...defaultAutoBackupSettings }
  }
}

async function writeAutoBackupSettings(settings) {
  const normalized = normalizeAutoBackupSettings(settings)
  const settingsPath = getAutoBackupSettingsFilePath()

  await fs.mkdir(path.dirname(settingsPath), { recursive: true })
  await fs.writeFile(
    settingsPath,
    JSON.stringify(normalized, null, 2),
    'utf8',
  )

  return normalized
}

async function createAutomaticBackupOnExit() {
  const settings = await readAutoBackupSettings()

  if (!settings.enabled) {
    return null
  }

  if (!settings.backupDirectory) {
    console.warn('AUTO BACKUP SKIPPED: backup directory is not configured.')
    return null
  }

  if (!databaseInitialized) {
    console.warn('AUTO BACKUP SKIPPED: database is not initialized.')
    return null
  }

  const databaseFile = getDatabaseFilePath()
  if (!databaseFile) {
    console.warn('AUTO BACKUP SKIPPED: database file path is unavailable.')
    return null
  }

  await fs.mkdir(settings.backupDirectory, { recursive: true })

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const fileName =
    settings.mode === 'replace'
      ? 'craft-auto-backup.sqlite'
      : `craft-auto-backup-${timestamp}.sqlite`
  const backupPath = path.join(settings.backupDirectory, fileName)

  await fs.copyFile(databaseFile, backupPath)

  const lastBackupAt = new Date().toISOString()
  await writeAutoBackupSettings({
    ...settings,
    lastBackupAt,
  })

  console.log('AUTO BACKUP CREATED:', backupPath)
  return {
    filePath: backupPath,
    fileName,
    lastBackupAt,
  }
}

async function exportInvoicePdfFromHtml({ invoiceData, settings, fileName }) {
  const defaultFileName = String(fileName || 'invoice.pdf').replace(/\.[^/.]+$/, '') + '.pdf'
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'حفظ ملف PDF',
    defaultPath: path.join(app.getPath('downloads'), defaultFileName),
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
  })

  if (canceled || !filePath) {
    return ''
  }

  // IMPORTANT: PDF export uses the dedicated PDF-only renderer mode.
  // This route renders only the white A4 invoice and excludes the CRAFT preview background/toolbar.
  const renderUrl = app.isPackaged
    ? `file://${path.join(__dirname, '../dist/index.html')}#/invoice-preview?mode=pdf`
    : 'http://localhost:5173/#/invoice-preview?mode=pdf'

  const exportWindow = new BrowserWindow({
    show: false,
    width: 900,
    height: 1200,
    icon: path.join(__dirname, 'icon.ico'),
    backgroundColor: '#FFFFFF',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  let readyHandler = null

  try {
    console.log('Loading PDF-only invoice route:', renderUrl)
    await exportWindow.loadURL(renderUrl)

    const ready = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (readyHandler) {
          ipcMain.removeListener('invoice-preview:ready', readyHandler)
        }
        reject(new Error('Invoice PDF renderer did not become ready.'))
      }, 20000)

      readyHandler = (event) => {
        // Ignore ready notifications coming from the visible preview or any other window.
        if (event.sender.id !== exportWindow.webContents.id) {
          return
        }

        clearTimeout(timeout)
        ipcMain.removeListener('invoice-preview:ready', readyHandler)
        readyHandler = null
        console.log('Invoice PDF renderer ready')
        resolve()
      }

      ipcMain.on('invoice-preview:ready', readyHandler)

      exportWindow.webContents.once('did-fail-load', (_event, code, description) => {
        clearTimeout(timeout)
        if (readyHandler) {
          ipcMain.removeListener('invoice-preview:ready', readyHandler)
          readyHandler = null
        }
        reject(new Error(`Failed to load invoice PDF page: ${code} ${description}`))
      })
    })

    // Send data only after the PDF-only route has fully loaded and the ready listener is installed.
    exportWindow.webContents.send('invoice-preview:data', { invoiceData, settings })
    await ready

    // Make sure logo/images are decoded before Chromium captures the page into PDF.
    await exportWindow.webContents.executeJavaScript(`
      Promise.all(
        Array.from(document.images).map((img) => {
          if (img.complete) {
            return typeof img.decode === 'function' ? img.decode().catch(() => undefined) : Promise.resolve()
          }

          return new Promise((resolve) => {
            img.addEventListener('load', resolve, { once: true })
            img.addEventListener('error', resolve, { once: true })
          })
        })
      ).then(() => document.fonts.ready)
    `)

    console.log('PDF-only page loaded')

    const pdfBuffer = await exportWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      landscape: false,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="width:100%; text-align:center; font-size:9px; color:#64748b; font-family:Arial,sans-serif;">
          صفحة <span class="pageNumber"></span> من <span class="totalPages"></span>
        </div>
      `,
      margins: {
        top: 0,
        right: 0,
        bottom: 0.28,
        left: 0,
      },
    })

    console.log('PDF bytes:', pdfBuffer.length)
    console.log('PDF header:', pdfBuffer.subarray(0, 5).toString())

    if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length < 1000) {
      throw new Error('PDF generation returned invalid data.')
    }

    const header = pdfBuffer.subarray(0, 5).toString()
    if (header !== '%PDF-') {
      throw new Error('Generated file is not a valid PDF.')
    }

    await fs.writeFile(filePath, pdfBuffer)
    console.log('Saved PDF:', filePath)

    await shell.openPath(filePath)
    return filePath
  } finally {
    if (readyHandler) {
      ipcMain.removeListener('invoice-preview:ready', readyHandler)
    }

    if (!exportWindow.isDestroyed()) {
      exportWindow.destroy()
    }
  }
}

async function waitUntilMaximized(win) {
  if (win.isDestroyed() || win.isMaximized()) {
    return
  }

  await new Promise((resolve) => {
    let done = false

    const finish = () => {
      if (done) {
        return
      }

      done = true
      clearTimeout(timeoutId)

      if (!win.isDestroyed()) {
        win.removeListener('maximize', finish)
      }

      resolve()
    }

    const timeoutId = setTimeout(finish, 600)

    win.once('maximize', finish)
    win.maximize()

    if (win.isMaximized()) {
      finish()
    }
  })
}

function createSplashWindow() {
  const splash = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    frame: true,
    resizable: true,
    movable: true,
    minimizable: true,
    maximizable: true,
    fullscreenable: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    backgroundColor: '#06142F',
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  splash.center()

  splash.once('ready-to-show', async () => {
    if (splash.isDestroyed()) {
      return
    }

    // Maximize while still hidden so the user never sees 1200x800 first.
    await waitUntilMaximized(splash)

    if (!splash.isDestroyed()) {
      splash.show()
      splash.focus()
    }
  })

  void splash.loadFile(path.join(__dirname, 'splash.html'))

  splash.webContents.on('did-fail-load', (_event, code, description) => {
    console.error('SPLASH LOAD FAILED:', code, description)
  })

  return splash
}

async function waitForRendererReady(win) {
  const timeoutMs = 30000
  const pollIntervalMs = 80
  const startedAt = Date.now()

  while (!win.isDestroyed() && Date.now() - startedAt < timeoutMs) {
    try {
      const ready = await win.webContents.executeJavaScript(`
        (() => {
          const root = document.getElementById('root')
          if (!root) return false

          const hasRenderedContent =
            root.childElementCount > 0 ||
            root.textContent.trim().length > 0

          if (!hasRenderedContent) return false

          const firstElement = root.firstElementChild
          if (!firstElement) return false

          const rect = firstElement.getBoundingClientRect()
          return rect.width > 0 && rect.height > 0
        })()
      `)

      if (ready) {
        return true
      }
    } catch {
      // Renderer may still be navigating/loading. Keep waiting.
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
  }

  return false
}

async function revealMainWindow(win, splash) {
  if (win.isDestroyed()) {
    return
  }

  // IMPORTANT:
  // Do not use setBounds(workArea) here.
  // The BrowserWindow was created at 1200x800, so Windows keeps that as
  // the restore-down size. We only maximize it while hidden.
  await waitUntilMaximized(win)

  if (win.isDestroyed()) {
    return
  }

  // Paint the already-maximized main window under the splash.
  win.showInactive()

  await new Promise((resolve) => setTimeout(resolve, 140))

  if (win.isDestroyed()) {
    return
  }

  if (!splash || splash.isDestroyed()) {
    win.show()
    win.focus()
    win.webContents.send('app:splashFinished')
    return
  }

  void splash.webContents
    .executeJavaScript(`
      document.documentElement.classList.add('is-leaving')
    `)
    .catch(() => undefined)

  setTimeout(() => {
    if (!splash.isDestroyed()) {
      splash.destroy()
    }

    if (!win.isDestroyed()) {
      win.show()
      win.focus()
      win.webContents.send('app:splashFinished')
    }
  }, 430)
}

function createWindow(splash = null) {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    fullscreenable: true,
    maximizable: true,
    minimizable: true,
    resizable: true,
    icon: path.join(__dirname, 'icon.ico'),
    backgroundColor: '#07142F',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  win.center()

  let wasMaximizedBeforeFullscreen = false

  win.webContents.on('before-input-event', (event, input) => {
    const key = String(input.key ?? '').toUpperCase()
    const isKeyDown = input.type === 'keyDown' || input.type === 'rawKeyDown'

    if (key === 'F11' && isKeyDown && !input.isAutoRepeat) {
      event.preventDefault()

      if (win.isFullScreen()) {
        win.setFullScreen(false)

        if (wasMaximizedBeforeFullscreen) {
          setTimeout(() => {
            if (!win.isDestroyed()) {
              win.maximize()
            }
          }, 100)
        }
      } else {
        wasMaximizedBeforeFullscreen = win.isMaximized()
        win.setFullScreen(true)
      }

      return
    }

    if (key === 'ESCAPE' && isKeyDown && win.isFullScreen()) {
      event.preventDefault()
      win.setFullScreen(false)

      if (wasMaximizedBeforeFullscreen) {
        setTimeout(() => {
          if (!win.isDestroyed()) {
            win.maximize()
          }
        }, 100)
      }
    }
  })

  win.webContents.on('context-menu', (_event, params) => {
    try {
      const template = []
      const editFlags = params.editFlags ?? {}

      if (params.isEditable) {
        template.push(
          {
            label: 'قص',
            role: 'cut',
            enabled: Boolean(editFlags.canCut),
          },
          {
            label: 'نسخ',
            role: 'copy',
            enabled: Boolean(editFlags.canCopy),
          },
          {
            label: 'لصق',
            role: 'paste',
            enabled: Boolean(editFlags.canPaste),
          },
          {
            type: 'separator',
          },
          {
            label: 'تحديد الكل',
            role: 'selectAll',
            enabled: Boolean(editFlags.canSelectAll),
          },
        )
      } else if (String(params.selectionText ?? '').trim().length > 0) {
        template.push({
          label: 'نسخ',
          role: 'copy',
        })
      }

      if (template.length > 0) {
        const menu = Menu.buildFromTemplate(template)
        menu.popup({ window: win })
      }
    } catch (error) {
      console.error('Context menu error', error)
    }
  })

  const loadMainWindow = async () => {
    try {
      if (app.isPackaged) {
        await win.loadFile(path.join(__dirname, '../dist/index.html'))
      } else {
        await win.loadURL('http://localhost:5173')
      }

      const rendererReady = await waitForRendererReady(win)

      if (!rendererReady) {
        console.warn('RENDERER READY TIMEOUT: showing main window after timeout.')
      }

      await new Promise((resolve) => setTimeout(resolve, 120))
      await revealMainWindow(win, splash)
    } catch (error) {
      console.error('MAIN WINDOW LOAD FAILED:', error)

      if (!win.isDestroyed()) {
        win.destroy()
      }
    }
  }

  void loadMainWindow()

  return win
}

  ipcMain.handle('materials:list', async () => {
    return listMaterials()
})

ipcMain.handle('materials:create', async (_, payload) => {
  try {
    return await createMaterial(payload)
  } catch (err) {
    console.error('IPC materials:create error', err)
    throw err
  }
})

ipcMain.handle('materials:update', async (_, payload) => {
  try {
    return await updateMaterial(payload.id, payload.payload)
  } catch (err) {
    console.error('IPC materials:update error', err)
    throw err
  }
})

ipcMain.handle('materials:delete', async (_, id) => {
  return deleteMaterial(id)
})

ipcMain.handle('materials:search', async (_, searchTerm) => {
  return searchMaterials(searchTerm)
})

ipcMain.handle('recipes:list', async () => {
  return listRecipes()
})

ipcMain.handle('recipes:getById', async (_, id) => {
  return getRecipeById(id)
})

ipcMain.handle('recipes:getNextNumber', async () => {
  return getNextRecipeNumber()
})

ipcMain.handle('recipes:create', async (_, payload) => {
  return createRecipe(payload)
})

ipcMain.handle('recipes:update', async (_, { id, payload }) => {
  return updateRecipe(id, payload)
})

ipcMain.handle('recipes:delete', async (_, id) => {
  return deleteRecipe(id)
})

ipcMain.handle('productionOrders:list', async () => {
  return listProductionOrders()
})

ipcMain.handle('productionOrders:getById', async (_, id) => {
  return getProductionOrderById(id)
})

ipcMain.handle('productionOrders:getNextNumber', async () => {
  return getNextProductionOrderNumber()
})

ipcMain.handle('productionOrders:create', async (_, payload) => {
  return createProductionOrder(payload)
})

ipcMain.handle('productionOrders:update', async (_, { orderId, payload }) => {
  return updateProductionOrder(orderId, payload)
})

ipcMain.handle('productionOrders:delete', async (_, id) => {
  return deleteProductionOrder(id)
})

// Warehouses IPC
ipcMain.handle('warehouses:list', async () => {
  return listWarehouses()
})

ipcMain.handle('warehouses:create', async (_, payload) => {
  return createWarehouse(payload)
})

ipcMain.handle('warehouses:update', async (_, { id, payload }) => {
  return updateWarehouse(id, payload)
})

ipcMain.handle('warehouses:toggleStatus', async (_, { id, status }) => {
  return toggleWarehouseStatus(id, status)
})

ipcMain.handle('warehouses:delete', async (_, warehouseId) => {
  return deleteWarehouse(warehouseId)
})

ipcMain.handle('warehouses:hasActivity', async (_, warehouseId) => {
  return hasWarehouseActivity(warehouseId)
})

ipcMain.handle('stock:balancesByWarehouse', async (_, warehouseId) => {
  return getStockBalancesByWarehouse(warehouseId)
})

ipcMain.handle('stock:balancesByMaterial', async (_, materialId) => {
  return getStockBalancesByMaterial(materialId)
})

ipcMain.handle('reports:getReport', async (_, { reportType, filters }) => {
  await initDatabase()
  const db = getDatabase()
  return getReportData(db, reportType, filters || {})
})

ipcMain.handle('reports:getReportExportRows', async (_, { reportType, filters }) => {
  await initDatabase()
  const db = getDatabase()
  return getReportExportRows(db, reportType, filters || {})
})

ipcMain.handle('invoice:exportPdf', async (_, { invoiceData, settings, fileName }) => {
  return exportInvoicePdfFromHtml({ invoiceData, settings, fileName })
})

// Stock movements IPC
ipcMain.handle('movements:list', async (_, filter) => {
  return listStockMovements(filter || {})
})

ipcMain.handle('movements:getByReference', async (_, reference) => {
  return getStockMovementByReference(reference)
})

ipcMain.handle('movements:create', async (_, doc) => {
  return createStockMovementDocument(doc)
})

ipcMain.handle('adjustments:list', async (_, filter) => {
  return listStockMovements({ ...filter, type: 'adjustment' })
})

ipcMain.handle('adjustments:getByReference', async (_, reference) => {
  return getStockMovementByReference(reference)
})

ipcMain.handle('adjustments:create', async (_, payload) => {
  return createAdjustmentDocument(payload)
})

ipcMain.handle('adjustments:update', async (_, { reference, payload }) => {
  return updateAdjustmentDocument(reference, payload)
})

ipcMain.handle('adjustments:delete', async (_, reference) => {
  return deleteAdjustmentDocument(reference)
})

// Suppliers IPC
ipcMain.handle('suppliers:list', async () => {
  return listSuppliers()
})

ipcMain.handle('suppliers:listActive', async () => {
  return listActiveSuppliers()
})

ipcMain.handle('suppliers:create', async (_, payload) => {
  return createSupplier(payload)
})

ipcMain.handle('suppliers:update', async (_, { id, payload }) => {
  return updateSupplier(id, payload)
})

ipcMain.handle('suppliers:delete', async (_, id) => {
  return deleteSupplier(id)
})

// Purchase invoices IPC
ipcMain.handle('purchases:nextDraftData', async () => {
  return getNextPurchaseInvoiceDraftData()
})

ipcMain.handle('purchases:listInvoices', async (_, filter) => {
  return listPurchaseInvoices(filter || {})
})

ipcMain.handle('purchases:getInvoiceById', async (_, invoiceId) => {
  return getPurchaseInvoiceById(invoiceId)
})

ipcMain.handle('purchases:createDraft', async (_, payload) => {
  return createPurchaseInvoiceDraft(payload)
})

ipcMain.handle('purchases:updateDraft', async (_, { invoiceId, payload }) => {
  return updatePurchaseInvoiceDraft(invoiceId, payload)
})

ipcMain.handle('purchases:updateApproved', async (_, { invoiceId, payload }) => {
  return updateApprovedPurchaseInvoice(invoiceId, payload)
})

ipcMain.handle('purchases:deleteDraft', async (_, invoiceId) => {
  return deletePurchaseInvoiceDraft(invoiceId)
})

ipcMain.handle('purchases:complete', async (_, invoiceId) => {
  return completePurchaseInvoice(invoiceId)
})

ipcMain.handle('purchases:deleteApproved', async (_, invoiceId) => {
  return deletePurchaseInvoice(invoiceId)
})

ipcMain.handle('purchases:addPayment', async (_, { invoiceId, payload }) => {
  return addPurchasePayment(invoiceId, payload)
})

ipcMain.handle('purchases:deletePayment', async (_, paymentId) => {
  return deletePurchasePayment(paymentId)
})

ipcMain.handle('purchases:listReturns', async (_, filter) => {
  return listPurchaseReturns(filter || {})
})

ipcMain.handle('purchases:getReturnById', async (_, returnId) => {
  return getPurchaseReturnById(returnId)
})

ipcMain.handle('purchases:createReturn', async (_, payload) => {
  return createPurchaseReturn(payload)
})

ipcMain.handle('purchases:updateReturn', async (_, { returnId, payload }) => {
  return updatePurchaseReturn(returnId, payload)
})

ipcMain.handle('purchases:deleteReturn', async (_, returnId) => {
  return deletePurchaseReturn(returnId)
})

// Customers IPC
ipcMain.handle('customers:list', async () => {
  return listCustomers()
})

ipcMain.handle('customers:listActive', async () => {
  return listActiveCustomers()
})

ipcMain.handle('customers:create', async (_, payload) => {
  return createCustomer(payload)
})

ipcMain.handle('customers:update', async (_, { id, payload }) => {
  return updateCustomer(id, payload)
})

ipcMain.handle('customers:delete', async (_, id) => {
  return deleteCustomer(id)
})

// Sales invoices IPC
ipcMain.handle('sales:nextDraftData', async () => {
  return getNextSalesInvoiceDraftData()
})

ipcMain.handle('sales:listInvoices', async (_, filter) => {
  return listSalesInvoices(filter || {})
})

ipcMain.handle('sales:getInvoiceById', async (_, invoiceId) => {
  return getSalesInvoiceById(invoiceId)
})

ipcMain.handle('sales:createDraft', async (_, payload) => {
  return createSalesInvoiceDraft(payload)
})

ipcMain.handle('sales:updateDraft', async (_, { invoiceId, payload }) => {
  return updateSalesInvoiceDraft(invoiceId, payload)
})

ipcMain.handle('sales:updateApproved', async (_, { invoiceId, payload }) => {
  return updateApprovedSalesInvoice(invoiceId, payload)
})

ipcMain.handle('sales:deleteDraft', async (_, invoiceId) => {
  return deleteSalesInvoiceDraft(invoiceId)
})

ipcMain.handle('sales:complete', async (_, invoiceId) => {
  return completeSalesInvoice(invoiceId)
})

ipcMain.handle('sales:deleteApproved', async (_, invoiceId) => {
  return deleteSalesInvoice(invoiceId)
})

ipcMain.handle('sales:addPayment', async (_, { invoiceId, payload }) => {
  return addSalesPayment(invoiceId, payload)
})

ipcMain.handle('sales:deletePayment', async (_, paymentId) => {
  return deleteSalesPayment(paymentId)
})

ipcMain.handle('sales:listReturns', async (_, filter) => {
  return listSalesReturns(filter || {})
})

ipcMain.handle('sales:getReturnById', async (_, returnId) => {
  return getSalesReturnById(returnId)
})

ipcMain.handle('sales:createReturn', async (_, payload) => {
  return createSalesReturn(payload)
})

ipcMain.handle('sales:updateReturn', async (_, { returnId, payload }) => {
  return updateSalesReturn(returnId, payload)
})

ipcMain.handle('sales:deleteReturn', async (_, returnId) => {
  return deleteSalesReturn(returnId)
})

ipcMain.handle('data:getAutoBackupSettings', async () => {
  return readAutoBackupSettings()
})

ipcMain.handle('data:setAutoBackupSettings', async (_, settings) => {
  const current = await readAutoBackupSettings()
  return writeAutoBackupSettings({
    ...current,
    ...(settings && typeof settings === 'object' ? settings : {}),
  })
})

ipcMain.handle('data:chooseBackupFolder', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'اختر مجلد النسخ الاحتياطي',
    properties: ['openDirectory', 'createDirectory', 'promptToCreate'],
  })

  if (canceled || filePaths.length === 0) {
    return ''
  }

  const folder = filePaths[0]
  const current = await readAutoBackupSettings()
  await writeAutoBackupSettings({
    ...current,
    backupDirectory: folder,
  })

  return folder
})

ipcMain.handle('data:chooseBackupFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'اختر ملف النسخة الاحتياطية',
    properties: ['openFile'],
    filters: [{ name: 'SQLite Database', extensions: ['sqlite', 'db', 'db3'] }],
  })

  if (canceled || filePaths.length === 0) {
    return ''
  }

  return filePaths[0]
})

ipcMain.handle('data:createBackup', async (_, targetDirectory) => {
  const current = await readAutoBackupSettings()
  const backupDirectory =
    typeof targetDirectory === 'string' && targetDirectory.trim()
      ? targetDirectory.trim()
      : current.backupDirectory ||
        path.dirname(getDatabaseFilePath() || app.getPath('userData'))

  const result = await createDatabaseBackup(backupDirectory)
  const lastBackupAt = new Date().toISOString()

  await writeAutoBackupSettings({
    ...current,
    backupDirectory,
    lastBackupAt,
  })

  return {
    ...result,
    lastBackupAt,
  }
})

ipcMain.handle('data:restoreBackup', async (_, backupFilePath) => {
  return restoreDatabaseFromBackup(backupFilePath)
})

ipcMain.handle('data:resetDatabase', async (_, confirmationText) => {
  return resetDatabase({ confirmationText })
})

app.on('before-quit', (event) => {
  if (allowQuitAfterBackup) {
    return
  }

  event.preventDefault()

  if (quitBackupPromise) {
    return
  }

  quitBackupPromise = (async () => {
    try {
      await createAutomaticBackupOnExit()
    } catch (error) {
      console.error('AUTO BACKUP ON EXIT FAILED', error)
    } finally {
      allowQuitAfterBackup = true
      app.quit()
    }
  })()
})

app.whenReady().then(async () => {
  const splash = createSplashWindow()

  try {
    const { dbFile } = await initDatabase()
    databaseInitialized = true
    console.log('DATABASE PATH:', dbFile)
    console.log('DATABASE CREATED/OPENED SUCCESSFULLY')
  } catch (err) {
    console.error('DATABASE INITIALIZATION FAILED', err)
    console.error('Quitting application because database initialization failed.')

    if (!splash.isDestroyed()) {
      splash.destroy()
    }

    app.quit()
    return
  }

  Menu.setApplicationMenu(null)

  createWindow(splash)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})