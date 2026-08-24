export interface WarehouseRecord {
  id: string
  code: string
  name: string
  location?: string
  notes?: string
  status?: string
  createdAt?: string
  updatedAt?: string
}

export interface StockBalanceRecord {
  id: string
  materialNumber: string
  name: string
  quantity: number
  unit?: string
  warehouseId?: string
  warehouseName?: string
  averageCost: number
  stockValue: number
}

export interface StockMovementFilter {
  type?: string
  warehouseId?: string
  materialId?: string
  fromDate?: string
  toDate?: string
  reference?: string
  status?: string
}

export interface StockMovementItem {
  materialId: string
  quantity: number
  unit?: string
  cost?: number
  notes?: string
}

export interface StockMovementDocument {
  reference?: string
  type: 'purchase' | 'sale' | 'purchase_return' | 'sale_return' | 'production' | 'transfer' | 'adjustment'
  date?: string
  fromWarehouseId?: string | null
  toWarehouseId?: string | null
  notes?: string
  createdBy?: string
  status?: 'pending' | 'completed' | 'cancelled'
  items: StockMovementItem[]
}

export interface StockMovementListRow {
  reference: string
  type: string
  date: string
  status: string
  fromWarehouseId?: string | null
  toWarehouseId?: string | null
  warehouseId?: string
  warehouseName?: string
  documentNotes?: string
  createdBy?: string
  itemCount?: number
  warehouseSummary?: string
  materialId?: string
  materialNumber?: string
  materialName?: string
  quantityIn: number
  quantityOut: number
  unit?: string
  cost?: number | null
  lineNotes?: string
  partyName?: string
}

export interface StockMovementDetails {
  reference?: string
  type: 'purchase' | 'sale' | 'purchase_return' | 'sale_return' | 'production' | 'transfer' | 'adjustment'
  date?: string
  status?: string
  fromWarehouseId?: string | null
  toWarehouseId?: string | null
  notes?: string
  createdBy?: string
  createdAt?: string
  partyName?: string
  items: Array<{
    materialId?: string
    materialNumber?: string
    materialName?: string
    quantityIn?: number
    quantityOut?: number
    warehouseId?: string
    warehouseName?: string
    quantity: number
    unit?: string
    cost?: number | null
    notes?: string
  }>
}

declare global {
  interface Window {
    craftInventoryAPI?: {
      listWarehouses: () => Promise<WarehouseRecord[]>
      createWarehouse: (payload: Partial<WarehouseRecord>) => Promise<WarehouseRecord[]>
      updateWarehouse: (id: string, payload: Partial<WarehouseRecord>) => Promise<WarehouseRecord[]>
      toggleWarehouseStatus: (id: string, status: string) => Promise<WarehouseRecord[]>
      deleteWarehouse: (id: string) => Promise<WarehouseRecord[]>
      hasWarehouseActivity: (warehouseId: string) => Promise<boolean>
      getBalancesByWarehouse: (warehouseId: string | null) => Promise<StockBalanceRecord[]>
      getBalancesByMaterial: (materialId: string) => Promise<StockBalanceRecord[]>
    }
    craftMovementsAPI?: {
      list: (filter?: StockMovementFilter) => Promise<StockMovementListRow[]>
      getByReference: (reference: string) => Promise<StockMovementDetails | null>
      create: (doc: StockMovementDocument) => Promise<{ reference: string }>
    }
    craftAdjustmentsAPI?: {
      list: (filter?: StockMovementFilter) => Promise<StockMovementListRow[]>
      getByReference: (reference: string) => Promise<StockMovementDetails | null>
      create: (payload: StockAdjustmentPayload) => Promise<{ reference: string }>
      update: (reference: string, payload: StockAdjustmentPayload) => Promise<{ reference: string }>
      delete: (reference: string) => Promise<StockMovementListRow[]>
    }
  }
}

export interface StockAdjustmentItemPayload {
  materialId: string
  countedQuantity: number
  unit?: string
  unitCost?: number
  notes?: string
}

export interface StockAdjustmentPayload {
  reference?: string
  date?: string
  warehouseId: string
  notes?: string
  items: StockAdjustmentItemPayload[]
}

function getInventoryAPI() {
  if (!window.craftInventoryAPI) {
    const error = new Error('craftInventoryAPI is not available. Check preload or IPC setup.')
    console.error(error)
    throw error
  }
  return window.craftInventoryAPI
}

export const inventoryService = {
  async listWarehouses(): Promise<WarehouseRecord[]> {
    return getInventoryAPI().listWarehouses()
  },
  async createWarehouse(payload: Partial<WarehouseRecord>): Promise<WarehouseRecord[]> {
    return getInventoryAPI().createWarehouse(payload)
  },
  async updateWarehouse(id: string, payload: Partial<WarehouseRecord>): Promise<WarehouseRecord[]> {
    return getInventoryAPI().updateWarehouse(id, payload)
  },
  async toggleWarehouseStatus(id: string, status: string): Promise<WarehouseRecord[]> {
    return getInventoryAPI().toggleWarehouseStatus(id, status)
  },
  async deleteWarehouse(id: string): Promise<WarehouseRecord[]> {
    return getInventoryAPI().deleteWarehouse(id)
  },
  async getBalancesByWarehouse(warehouseId: string | null): Promise<StockBalanceRecord[]> {
    return getInventoryAPI().getBalancesByWarehouse(warehouseId)
  },
  async getBalancesByMaterial(materialId: string): Promise<StockBalanceRecord[]> {
    return getInventoryAPI().getBalancesByMaterial(materialId)
  },
  async hasWarehouseActivity(warehouseId: string): Promise<boolean> {
    return getInventoryAPI().hasWarehouseActivity(warehouseId)
  },
}

export const movementsService = {
  async list(filter?: StockMovementFilter): Promise<StockMovementListRow[]> {
    if (!window.craftMovementsAPI) return []
    return window.craftMovementsAPI.list(filter)
  },
  async getByReference(reference: string): Promise<StockMovementDetails | null> {
    if (!window.craftMovementsAPI) return null
    return window.craftMovementsAPI.getByReference(reference)
  },
  async create(doc: StockMovementDocument): Promise<{ reference: string }> {
    if (!window.craftMovementsAPI) throw new Error('Movements API not available')
    return window.craftMovementsAPI.create(doc)
  },
}

export const adjustmentService = {
  async list(filter?: StockMovementFilter): Promise<StockMovementListRow[]> {
    if (!window.craftAdjustmentsAPI) return movementsService.list({ ...filter, type: 'adjustment' })
    return window.craftAdjustmentsAPI.list(filter)
  },
  async getByReference(reference: string): Promise<StockMovementDetails | null> {
    if (!window.craftAdjustmentsAPI) return movementsService.getByReference(reference)
    return window.craftAdjustmentsAPI.getByReference(reference)
  },
  async create(payload: StockAdjustmentPayload): Promise<{ reference: string }> {
    if (!window.craftAdjustmentsAPI) throw new Error('Adjustments API not available')
    return window.craftAdjustmentsAPI.create(payload)
  },
  async update(reference: string, payload: StockAdjustmentPayload): Promise<{ reference: string }> {
    if (!window.craftAdjustmentsAPI) throw new Error('Adjustments API not available')
    return window.craftAdjustmentsAPI.update(reference, payload)
  },
  async delete(reference: string): Promise<StockMovementListRow[]> {
    if (!window.craftAdjustmentsAPI) return []
    return window.craftAdjustmentsAPI.delete(reference)
  },
}
