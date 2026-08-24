export type SupplierStatus = 'active' | 'inactive'
export type CustomerStatus = 'active' | 'inactive'
export type SalesInvoiceStatus = 'draft' | 'completed'

export interface SupplierRecord {
  id: string
  code: string
  name: string
  phone?: string
  address?: string
  notes?: string
  status: SupplierStatus
  createdAt?: string
  updatedAt?: string
}

export type PurchaseInvoiceStatus = 'draft' | 'completed'
export type PaymentStatus = 'unpaid' | 'partial' | 'paid'
export type DiscountType = 'none' | 'percentage' | 'fixed'

export interface PurchaseInvoiceItemInput {
  id?: string
  materialId: string
  quantity: number
  unitPrice: number
  unit?: string
  notes?: string
}

export interface PurchaseInvoiceDraftInput {
  id?: string
  invoiceNumber?: string
  supplierInvoiceNumber?: string
  date: string
  supplierId: string
  warehouseId: string
  discountType: DiscountType
  discountValue: number
  notes?: string
  items: PurchaseInvoiceItemInput[]
}

export interface PurchaseInvoicePayment {
  id: string
  invoiceId: string
  date: string
  amount: number
  notes?: string
  createdAt?: string
}

export interface PurchaseInvoiceListItem {
  id: string
  invoiceNumber: string
  supplierInvoiceNumber?: string
  date: string
  supplierId: string
  supplierName: string
  warehouseId: string
  warehouseName: string
  subtotal: number
  discountAmount: number
  netTotal: number
  paidAmount: number
  remainingAmount: number
  paymentStatus: PaymentStatus
  status: PurchaseInvoiceStatus
  createdAt?: string
  updatedAt?: string
}

export interface PurchaseInvoiceDetails {
  id: string
  invoiceNumber: string
  supplierInvoiceNumber?: string
  date: string
  supplierId: string
  supplierCode: string
  supplierName: string
  warehouseId: string
  warehouseCode: string
  warehouseName: string
  status: PurchaseInvoiceStatus
  subtotal: number
  discountType: DiscountType
  discountValue: number
  discountAmount: number
  netTotal: number
  paidAmount: number
  remainingAmount: number
  paymentStatus: PaymentStatus
  notes?: string
  createdAt?: string
  updatedAt?: string
  items: Array<{
    id: string
    materialId: string
    materialNumber: string
    materialName: string
    quantity: number
    unit: string
    unitPrice: number
    lineTotal: number
    notes?: string
  }>
  payments: PurchaseInvoicePayment[]
}

export interface PurchaseInvoiceFilter {
  reference?: string
  fromDate?: string
  toDate?: string
  supplierId?: string
  warehouseId?: string
  status?: PurchaseInvoiceStatus | ''
}

export interface PurchaseReturnItemInput {
  materialId: string
  quantity: number
  unit?: string
  unitPrice?: number
  notes?: string
}

export interface PurchaseReturnRecord {
  id: string
  returnNumber: string
  date: string
  supplierId: string
  supplierName: string
  warehouseId: string
  warehouseName: string
  purchaseInvoiceId: string
  purchaseInvoiceNumber: string
  subtotal: number
  discountAmount: number
  netTotal: number
  status: 'completed'
  notes?: string
  createdAt?: string
  updatedAt?: string
  items: Array<{
    id: string
    materialId: string
    materialNumber: string
    materialName: string
    quantity: number
    unit: string
    unitPrice: number
    lineTotal: number
    notes?: string
  }>
}

export interface SalesReturnItemInput {
  materialId: string
  quantity: number
  unit?: string
  unitPrice?: number
  notes?: string
}

export interface SalesReturnRecord {
  id: string
  returnNumber: string
  date: string
  customerId: string
  customerName: string
  warehouseId: string
  warehouseName: string
  salesInvoiceId: string
  salesInvoiceNumber: string
  subtotal: number
  discountAmount: number
  netTotal: number
  status: 'completed'
  notes?: string
  createdAt?: string
  updatedAt?: string
  items: Array<{
    id: string
    materialId: string
    materialNumber: string
    materialName: string
    quantity: number
    unit: string
    unitPrice: number
    lineTotal: number
    notes?: string
  }>
}

export interface CustomerRecord {
  id: string
  code: string
  name: string
  phone?: string
  address?: string
  notes?: string
  status?: CustomerStatus
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface SalesInvoiceItemInput {
  id?: string
  materialId: string
  quantity: number
  unitPrice: number
  unit?: string
  notes?: string
}

export interface SalesInvoiceDraftInput {
  id?: string
  invoiceNumber?: string
  date: string
  customerId: string
  warehouseId: string
  discountType: DiscountType
  discountValue: number
  notes?: string
  items: SalesInvoiceItemInput[]
}

export interface SalesInvoicePayment {
  id: string
  invoiceId: string
  date: string
  amount: number
  notes?: string
  createdAt?: string
}

export interface SalesInvoiceListItem {
  id: string
  invoiceNumber: string
  date: string
  customerId: string
  customerName: string
  warehouseId: string
  warehouseName: string
  subtotal: number
  discountAmount: number
  netTotal: number
  salesReturnTotal: number
  netAfterReturns: number
  paidAmount: number
  remainingAmount: number
  customerCredit: number
  paymentStatus: PaymentStatus
  status: SalesInvoiceStatus
  createdAt?: string
  updatedAt?: string
}

export interface SalesInvoiceReturnSummary {
  id: string
  returnNumber: string
  date: string
  netTotal: number
}

export interface SalesInvoiceDetails {
  id: string
  invoiceNumber: string
  date: string
  customerId: string
  customerCode: string
  customerName: string
  warehouseId: string
  warehouseCode: string
  warehouseName: string
  status: SalesInvoiceStatus
  subtotal: number
  discountType: DiscountType
  discountValue: number
  discountAmount: number
  netTotal: number
  salesReturnTotal: number
  netAfterReturns: number
  paidAmount: number
  remainingAmount: number
  customerCredit: number
  paymentStatus: PaymentStatus
  notes?: string
  createdAt?: string
  updatedAt?: string
  returns: SalesInvoiceReturnSummary[]
  items: Array<{
    id: string
    materialId: string
    materialNumber: string
    materialName: string
    quantity: number
    unit: string
    unitPrice: number
    lineTotal: number
    notes?: string
  }>
  payments: SalesInvoicePayment[]
}

export interface SalesInvoiceFilter {
  reference?: string
  fromDate?: string
  toDate?: string
  customerId?: string
  warehouseId?: string
  status?: SalesInvoiceStatus | ''
}

declare global {
  interface Window {
    craftSuppliersAPI?: {
      list: () => Promise<SupplierRecord[]>
      listActive: () => Promise<SupplierRecord[]>
      create: (payload: Partial<SupplierRecord>) => Promise<SupplierRecord[]>
      update: (id: string, payload: Partial<SupplierRecord>) => Promise<SupplierRecord[]>
      delete: (id: string) => Promise<SupplierRecord[]>
    }
    craftPurchasesAPI?: {
      getNextDraftData: () => Promise<{ invoiceNumber: string; date: string }>
      listInvoices: (filter?: PurchaseInvoiceFilter) => Promise<PurchaseInvoiceListItem[]>
      getInvoiceById: (invoiceId: string) => Promise<PurchaseInvoiceDetails>
      createDraft: (payload: PurchaseInvoiceDraftInput) => Promise<PurchaseInvoiceDetails>
      updateDraft: (invoiceId: string, payload: PurchaseInvoiceDraftInput) => Promise<PurchaseInvoiceDetails>
      updateApproved: (invoiceId: string, payload: PurchaseInvoiceDraftInput) => Promise<PurchaseInvoiceDetails>
      deleteDraft: (invoiceId: string) => Promise<PurchaseInvoiceListItem[]>
      complete: (invoiceId: string) => Promise<PurchaseInvoiceDetails>
      deleteApproved: (invoiceId: string) => Promise<PurchaseInvoiceListItem[]>
      addPayment: (invoiceId: string, payload: { date: string; amount: number; notes?: string }) => Promise<PurchaseInvoicePayment>
      deletePayment: (paymentId: string) => Promise<PurchaseInvoicePayment>
      listReturns: (filter?: Record<string, string>) => Promise<Array<{ id: string; returnNumber: string; date: string; supplierId: string; supplierName: string; warehouseId: string; warehouseName: string; purchaseInvoiceId: string; purchaseInvoiceNumber: string; netTotal: number; status: string }>>
      getReturnById: (returnId: string) => Promise<PurchaseReturnRecord>
      createReturn: (payload: { date: string; supplierId: string; warehouseId: string; purchaseInvoiceId: string; notes?: string; items: PurchaseReturnItemInput[] }) => Promise<PurchaseReturnRecord>
      updateReturn: (returnId: string, payload: { date: string; supplierId: string; warehouseId: string; purchaseInvoiceId: string; notes?: string; items: PurchaseReturnItemInput[] }) => Promise<PurchaseReturnRecord>
      deleteReturn: (returnId: string) => Promise<Array<{ id: string; returnNumber: string; date: string; supplierId: string; supplierName: string; warehouseId: string; warehouseName: string; purchaseInvoiceId: string; purchaseInvoiceNumber: string; netTotal: number; status: string }>>
    }
    craftCustomersAPI?: {
      list: () => Promise<CustomerRecord[]>
      listActive: () => Promise<CustomerRecord[]>
      create: (payload: Partial<CustomerRecord>) => Promise<CustomerRecord[]>
      update: (id: string, payload: Partial<CustomerRecord>) => Promise<CustomerRecord[]>
      delete: (id: string) => Promise<CustomerRecord[]>
    }
    craftSalesAPI?: {
      getNextDraftData: () => Promise<{ invoiceNumber: string; date: string }>
      listInvoices: (filter?: SalesInvoiceFilter) => Promise<SalesInvoiceListItem[]>
      getInvoiceById: (invoiceId: string) => Promise<SalesInvoiceDetails>
      createDraft: (payload: SalesInvoiceDraftInput) => Promise<SalesInvoiceDetails>
      updateDraft: (invoiceId: string, payload: SalesInvoiceDraftInput) => Promise<SalesInvoiceDetails>
      updateApproved: (invoiceId: string, payload: SalesInvoiceDraftInput) => Promise<SalesInvoiceDetails>
      deleteDraft: (invoiceId: string) => Promise<SalesInvoiceListItem[]>
      complete: (invoiceId: string) => Promise<SalesInvoiceDetails>
      deleteApproved: (invoiceId: string) => Promise<SalesInvoiceListItem[]>
      addPayment: (invoiceId: string, payload: { date: string; amount: number; notes?: string }) => Promise<SalesInvoicePayment>
      deletePayment: (paymentId: string) => Promise<SalesInvoicePayment>
      listReturns: (filter?: Record<string, string>) => Promise<Array<{ id: string; returnNumber: string; date: string; customerId: string; customerName: string; warehouseId: string; warehouseName: string; salesInvoiceId: string; salesInvoiceNumber: string; netTotal: number; status: string }>>
      getReturnById: (returnId: string) => Promise<SalesReturnRecord>
      createReturn: (payload: { date: string; customerId: string; warehouseId: string; salesInvoiceId: string; notes?: string; items: SalesReturnItemInput[] }) => Promise<SalesReturnRecord>
      updateReturn: (returnId: string, payload: { date: string; customerId: string; warehouseId: string; salesInvoiceId: string; notes?: string; items: SalesReturnItemInput[] }) => Promise<SalesReturnRecord>
      deleteReturn: (returnId: string) => Promise<Array<{ id: string; returnNumber: string; date: string; customerId: string; customerName: string; warehouseId: string; warehouseName: string; salesInvoiceId: string; salesInvoiceNumber: string; netTotal: number; status: string }>>
    }
  }
}

function getSuppliersApi() {
  if (!window.craftSuppliersAPI) {
    throw new Error('Suppliers API not available')
  }
  return window.craftSuppliersAPI
}

function getPurchasesApi() {
  if (!window.craftPurchasesAPI) {
    throw new Error('Purchases API not available')
  }
  return window.craftPurchasesAPI
}

export const suppliersService = {
  async list(): Promise<SupplierRecord[]> {
    return getSuppliersApi().list()
  },
  async listActive(): Promise<SupplierRecord[]> {
    return getSuppliersApi().listActive()
  },
  async create(payload: Partial<SupplierRecord>): Promise<SupplierRecord[]> {
    return getSuppliersApi().create(payload)
  },
  async update(id: string, payload: Partial<SupplierRecord>): Promise<SupplierRecord[]> {
    return getSuppliersApi().update(id, payload)
  },
  async delete(id: string): Promise<SupplierRecord[]> {
    return getSuppliersApi().delete(id)
  },
}

export const purchasesService = {
  async getNextDraftData(): Promise<{ invoiceNumber: string; date: string }> {
    return getPurchasesApi().getNextDraftData()
  },
  async listInvoices(filter?: PurchaseInvoiceFilter): Promise<PurchaseInvoiceListItem[]> {
    return getPurchasesApi().listInvoices(filter)
  },
  async getInvoiceById(invoiceId: string): Promise<PurchaseInvoiceDetails> {
    return getPurchasesApi().getInvoiceById(invoiceId)
  },
  async createDraft(payload: PurchaseInvoiceDraftInput): Promise<PurchaseInvoiceDetails> {
    return getPurchasesApi().createDraft(payload)
  },
  async updateDraft(invoiceId: string, payload: PurchaseInvoiceDraftInput): Promise<PurchaseInvoiceDetails> {
    return getPurchasesApi().updateDraft(invoiceId, payload)
  },
  async updateApproved(invoiceId: string, payload: PurchaseInvoiceDraftInput): Promise<PurchaseInvoiceDetails> {
    return getPurchasesApi().updateApproved(invoiceId, payload)
  },
  async deleteDraft(invoiceId: string): Promise<PurchaseInvoiceListItem[]> {
    return getPurchasesApi().deleteDraft(invoiceId)
  },
  async complete(invoiceId: string): Promise<PurchaseInvoiceDetails> {
    return getPurchasesApi().complete(invoiceId)
  },
  async deleteApproved(invoiceId: string): Promise<PurchaseInvoiceListItem[]> {
    return getPurchasesApi().deleteApproved(invoiceId)
  },
  async addPayment(invoiceId: string, payload: { date: string; amount: number; notes?: string }): Promise<PurchaseInvoicePayment> {
    return getPurchasesApi().addPayment(invoiceId, payload)
  },
  async deletePayment(paymentId: string): Promise<PurchaseInvoicePayment> {
    return getPurchasesApi().deletePayment(paymentId)
  },
  async listReturns(filter?: Record<string, string>): Promise<Array<{ id: string; returnNumber: string; date: string; supplierId: string; supplierName: string; warehouseId: string; warehouseName: string; purchaseInvoiceId: string; purchaseInvoiceNumber: string; netTotal: number; status: string }>> {
    return getPurchasesApi().listReturns(filter)
  },
  async getReturnById(returnId: string): Promise<PurchaseReturnRecord> {
    return getPurchasesApi().getReturnById(returnId)
  },
  async createReturn(payload: { date: string; supplierId: string; warehouseId: string; purchaseInvoiceId: string; notes?: string; items: PurchaseReturnItemInput[] }): Promise<PurchaseReturnRecord> {
    return getPurchasesApi().createReturn(payload)
  },
  async updateReturn(returnId: string, payload: { date: string; supplierId: string; warehouseId: string; purchaseInvoiceId: string; notes?: string; items: PurchaseReturnItemInput[] }): Promise<PurchaseReturnRecord> {
    return getPurchasesApi().updateReturn(returnId, payload)
  },
  async deleteReturn(returnId: string): Promise<Array<{ id: string; returnNumber: string; date: string; supplierId: string; supplierName: string; warehouseId: string; warehouseName: string; purchaseInvoiceId: string; purchaseInvoiceNumber: string; netTotal: number; status: string }>> {
    return getPurchasesApi().deleteReturn(returnId)
  },
}

function getCustomersApi() {
  if (!window.craftCustomersAPI) {
    throw new Error('Customers API not available')
  }
  return window.craftCustomersAPI
}

function getSalesApi() {
  if (!window.craftSalesAPI) {
    throw new Error('Sales API not available')
  }
  return window.craftSalesAPI
}

export const customersService = {
  async list(): Promise<CustomerRecord[]> {
    return getCustomersApi().list()
  },
  async listActive(): Promise<CustomerRecord[]> {
    return getCustomersApi().listActive()
  },
  async create(payload: Partial<CustomerRecord>): Promise<CustomerRecord[]> {
    return getCustomersApi().create(payload)
  },
  async update(id: string, payload: Partial<CustomerRecord>): Promise<CustomerRecord[]> {
    return getCustomersApi().update(id, payload)
  },
  async delete(id: string): Promise<CustomerRecord[]> {
    return getCustomersApi().delete(id)
  },
}

export const salesService = {
  async getNextDraftData(): Promise<{ invoiceNumber: string; date: string }> {
    return getSalesApi().getNextDraftData()
  },
  async listInvoices(filter?: SalesInvoiceFilter): Promise<SalesInvoiceListItem[]> {
    return getSalesApi().listInvoices(filter)
  },
  async getInvoiceById(invoiceId: string): Promise<SalesInvoiceDetails> {
    return getSalesApi().getInvoiceById(invoiceId)
  },
  async createDraft(payload: SalesInvoiceDraftInput): Promise<SalesInvoiceDetails> {
    return getSalesApi().createDraft(payload)
  },
  async updateDraft(invoiceId: string, payload: SalesInvoiceDraftInput): Promise<SalesInvoiceDetails> {
    return getSalesApi().updateDraft(invoiceId, payload)
  },
  async updateApproved(invoiceId: string, payload: SalesInvoiceDraftInput): Promise<SalesInvoiceDetails> {
    return getSalesApi().updateApproved(invoiceId, payload)
  },
  async deleteDraft(invoiceId: string): Promise<SalesInvoiceListItem[]> {
    return getSalesApi().deleteDraft(invoiceId)
  },
  async complete(invoiceId: string): Promise<SalesInvoiceDetails> {
    return getSalesApi().complete(invoiceId)
  },
  async deleteApproved(invoiceId: string): Promise<SalesInvoiceListItem[]> {
    return getSalesApi().deleteApproved(invoiceId)
  },
  async addPayment(invoiceId: string, payload: { date: string; amount: number; notes?: string }): Promise<SalesInvoicePayment> {
    return getSalesApi().addPayment(invoiceId, payload)
  },
  async deletePayment(paymentId: string): Promise<SalesInvoicePayment> {
    return getSalesApi().deletePayment(paymentId)
  },
  async listReturns(filter?: Record<string, string>): Promise<Array<{ id: string; returnNumber: string; date: string; customerId: string; customerName: string; warehouseId: string; warehouseName: string; salesInvoiceId: string; salesInvoiceNumber: string; netTotal: number; status: string }>> {
    return getSalesApi().listReturns(filter)
  },
  async getReturnById(returnId: string): Promise<SalesReturnRecord> {
    return getSalesApi().getReturnById(returnId)
  },
  async createReturn(payload: { date: string; customerId: string; warehouseId: string; salesInvoiceId: string; notes?: string; items: SalesReturnItemInput[] }): Promise<SalesReturnRecord> {
    return getSalesApi().createReturn(payload)
  },
  async updateReturn(returnId: string, payload: { date: string; customerId: string; warehouseId: string; salesInvoiceId: string; notes?: string; items: SalesReturnItemInput[] }): Promise<SalesReturnRecord> {
    return getSalesApi().updateReturn(returnId, payload)
  },
  async deleteReturn(returnId: string): Promise<Array<{ id: string; returnNumber: string; date: string; customerId: string; customerName: string; warehouseId: string; warehouseName: string; salesInvoiceId: string; salesInvoiceNumber: string; netTotal: number; status: string }>> {
    return getSalesApi().deleteReturn(returnId)
  },
}