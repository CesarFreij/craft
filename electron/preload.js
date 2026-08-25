import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('craftMaterialsAPI', {
  listMaterials: () => ipcRenderer.invoke('materials:list'),
  createMaterial: (payload) => ipcRenderer.invoke('materials:create', payload),
  updateMaterial: (id, payload) => ipcRenderer.invoke('materials:update', { id, payload }),
  deleteMaterial: (id) => ipcRenderer.invoke('materials:delete', id),
  searchMaterials: (term) => ipcRenderer.invoke('materials:search', term),
})

contextBridge.exposeInMainWorld('craftManufacturingAPI', {
  listRecipes: () => ipcRenderer.invoke('recipes:list'),
  getRecipeById: (id) => ipcRenderer.invoke('recipes:getById', id),
  getNextRecipeNumber: () => ipcRenderer.invoke('recipes:getNextNumber'),
  createRecipe: (payload) => ipcRenderer.invoke('recipes:create', payload),
  updateRecipe: (id, payload) => ipcRenderer.invoke('recipes:update', { id, payload }),
  deleteRecipe: (id) => ipcRenderer.invoke('recipes:delete', id),
  listProductionOrders: () => ipcRenderer.invoke('productionOrders:list'),
  getProductionOrderById: (id) => ipcRenderer.invoke('productionOrders:getById', id),
  getNextProductionOrderNumber: () => ipcRenderer.invoke('productionOrders:getNextNumber'),
  createProductionOrder: (payload) => ipcRenderer.invoke('productionOrders:create', payload),
  updateProductionOrder: (orderId, payload) => ipcRenderer.invoke('productionOrders:update', { orderId, payload }),
  deleteProductionOrder: (id) => ipcRenderer.invoke('productionOrders:delete', id),
})

contextBridge.exposeInMainWorld('craftInventoryAPI', {
  listWarehouses: () => ipcRenderer.invoke('warehouses:list'),
  createWarehouse: (payload) => ipcRenderer.invoke('warehouses:create', payload),
  updateWarehouse: (id, payload) => ipcRenderer.invoke('warehouses:update', { id, payload }),
  toggleWarehouseStatus: (id, status) => ipcRenderer.invoke('warehouses:toggleStatus', { id, status }),
  deleteWarehouse: (warehouseId) => ipcRenderer.invoke('warehouses:delete', warehouseId),
  getBalancesByWarehouse: (warehouseId) => ipcRenderer.invoke('stock:balancesByWarehouse', warehouseId),
  getBalancesByMaterial: (materialId) => ipcRenderer.invoke('stock:balancesByMaterial', materialId),
  hasWarehouseActivity: (warehouseId) => ipcRenderer.invoke('warehouses:hasActivity', warehouseId),
})

contextBridge.exposeInMainWorld('craftMovementsAPI', {
  list: (filter) => ipcRenderer.invoke('movements:list', filter),
  getByReference: (reference) => ipcRenderer.invoke('movements:getByReference', reference),
  create: (doc) => ipcRenderer.invoke('movements:create', doc),
})

contextBridge.exposeInMainWorld('craftAdjustmentsAPI', {
  list: (filter) => ipcRenderer.invoke('adjustments:list', filter),
  getByReference: (reference) => ipcRenderer.invoke('adjustments:getByReference', reference),
  create: (payload) => ipcRenderer.invoke('adjustments:create', payload),
  update: (reference, payload) => ipcRenderer.invoke('adjustments:update', { reference, payload }),
  delete: (reference) => ipcRenderer.invoke('adjustments:delete', reference),
})

contextBridge.exposeInMainWorld('craftSuppliersAPI', {
  list: () => ipcRenderer.invoke('suppliers:list'),
  listActive: () => ipcRenderer.invoke('suppliers:listActive'),
  create: (payload) => ipcRenderer.invoke('suppliers:create', payload),
  update: (id, payload) => ipcRenderer.invoke('suppliers:update', { id, payload }),
  delete: (id) => ipcRenderer.invoke('suppliers:delete', id),
})

contextBridge.exposeInMainWorld('craftPurchasesAPI', {
  getNextDraftData: () => ipcRenderer.invoke('purchases:nextDraftData'),
  listInvoices: (filter) => ipcRenderer.invoke('purchases:listInvoices', filter),
  getInvoiceById: (invoiceId) => ipcRenderer.invoke('purchases:getInvoiceById', invoiceId),
  createDraft: (payload) => ipcRenderer.invoke('purchases:createDraft', payload),
  updateDraft: (invoiceId, payload) => ipcRenderer.invoke('purchases:updateDraft', { invoiceId, payload }),
  updateApproved: (invoiceId, payload) => ipcRenderer.invoke('purchases:updateApproved', { invoiceId, payload }),
  deleteDraft: (invoiceId) => ipcRenderer.invoke('purchases:deleteDraft', invoiceId),
  complete: (invoiceId) => ipcRenderer.invoke('purchases:complete', invoiceId),
  deleteApproved: (invoiceId) => ipcRenderer.invoke('purchases:deleteApproved', invoiceId),
  addPayment: (invoiceId, payload) => ipcRenderer.invoke('purchases:addPayment', { invoiceId, payload }),
  deletePayment: (paymentId) => ipcRenderer.invoke('purchases:deletePayment', paymentId),
  listReturns: (filter) => ipcRenderer.invoke('purchases:listReturns', filter),
  getReturnById: (returnId) => ipcRenderer.invoke('purchases:getReturnById', returnId),
  createReturn: (payload) => ipcRenderer.invoke('purchases:createReturn', payload),
  updateReturn: (returnId, payload) => ipcRenderer.invoke('purchases:updateReturn', { returnId, payload }),
  deleteReturn: (returnId) => ipcRenderer.invoke('purchases:deleteReturn', returnId),
})

contextBridge.exposeInMainWorld('craftCustomersAPI', {
  list: () => ipcRenderer.invoke('customers:list'),
  listActive: () => ipcRenderer.invoke('customers:listActive'),
  create: (payload) => ipcRenderer.invoke('customers:create', payload),
  update: (id, payload) => ipcRenderer.invoke('customers:update', { id, payload }),
  delete: (id) => ipcRenderer.invoke('customers:delete', id),
})

contextBridge.exposeInMainWorld('craftSalesAPI', {
  getNextDraftData: () => ipcRenderer.invoke('sales:nextDraftData'),
  listInvoices: (filter) => ipcRenderer.invoke('sales:listInvoices', filter),
  getInvoiceById: (invoiceId) => ipcRenderer.invoke('sales:getInvoiceById', invoiceId),
  createDraft: (payload) => ipcRenderer.invoke('sales:createDraft', payload),
  updateDraft: (invoiceId, payload) => ipcRenderer.invoke('sales:updateDraft', { invoiceId, payload }),
  updateApproved: (invoiceId, payload) => ipcRenderer.invoke('sales:updateApproved', { invoiceId, payload }),
  deleteDraft: (invoiceId) => ipcRenderer.invoke('sales:deleteDraft', invoiceId),
  complete: (invoiceId) => ipcRenderer.invoke('sales:complete', invoiceId),
  deleteApproved: (invoiceId) => ipcRenderer.invoke('sales:deleteApproved', invoiceId),
  addPayment: (invoiceId, payload) => ipcRenderer.invoke('sales:addPayment', { invoiceId, payload }),
  deletePayment: (paymentId) => ipcRenderer.invoke('sales:deletePayment', paymentId),
  listReturns: (filter) => ipcRenderer.invoke('sales:listReturns', filter),
  getReturnById: (returnId) => ipcRenderer.invoke('sales:getReturnById', returnId),
  createReturn: (payload) => ipcRenderer.invoke('sales:createReturn', payload),
  updateReturn: (returnId, payload) => ipcRenderer.invoke('sales:updateReturn', { returnId, payload }),
  deleteReturn: (returnId) => ipcRenderer.invoke('sales:deleteReturn', returnId),
})

contextBridge.exposeInMainWorld('craftReportsAPI', {
  getReport: (reportType, filters) => ipcRenderer.invoke('reports:getReport', { reportType, filters }),
  getReportExportRows: (reportType, filters) => ipcRenderer.invoke('reports:getReportExportRows', { reportType, filters }),
})

contextBridge.exposeInMainWorld('craftExportAPI', {
  exportInvoicePdf: ({ invoiceData, settings, fileName }) => ipcRenderer.invoke('invoice:exportPdf', { invoiceData, settings, fileName }),
})

contextBridge.exposeInMainWorld('invoicePrintAPI', {
  onInvoiceData: (callback) => {
    ipcRenderer.on('invoice-preview:data', (_event, payload) => callback(payload))
  },
  offInvoiceData: () => {
    ipcRenderer.removeAllListeners('invoice-preview:data')
  },
  notifyReady: () => {
    ipcRenderer.send('invoice-preview:ready')
  },
})
