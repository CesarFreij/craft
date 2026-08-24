import { app, BrowserWindow, ipcMain, Menu } from 'electron'
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
  deleteSalesReturn
} from './materialsRepository.js'
import { fileURLToPath } from 'node:url'
import { getReportData, getReportExportRows } from './reports.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
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

  win.loadURL('http://localhost:5173')
  win.webContents.openDevTools()
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

app.whenReady().then(async () => {
  try {
    const { dbFile } = await initDatabase()
    console.log('DATABASE PATH:', dbFile)
    console.log('DATABASE CREATED/OPENED SUCCESSFULLY')
  } catch (err) {
    console.error('DATABASE INITIALIZATION FAILED', err)
    console.error('Quitting application because database initialization failed.')
    app.quit()
    return
  }

  createWindow()

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