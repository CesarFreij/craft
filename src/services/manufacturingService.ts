export interface ManufacturingRecipeItemInput {
  materialId: string
  quantity: number
  notes?: string
  sortOrder?: number
}

export interface ManufacturingRecipePayload {
  name: string
  productMaterialId: string
  standardOutputQuantity: number
  notes?: string
  status?: 'active' | 'inactive'
  items: ManufacturingRecipeItemInput[]
}

export interface ManufacturingRecipeItemRecord {
  id: string
  recipeId: string
  materialId: string
  materialName: string
  quantity: number
  unit: string
  notes: string
  sortOrder: number
}

export interface ManufacturingRecipeRecord {
  id: string
  recipeNumber: string
  name: string
  productMaterialId: string
  productName: string
  standardOutputQuantity: number
  unit: string
  componentCount: number
  notes: string
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
  items?: ManufacturingRecipeItemRecord[]
}

export interface ProductionOrderInputPayload {
  materialId: string
  warehouseId: string
  plannedQuantity?: number
  actualQuantity: number
  unit?: string
  notes?: string
  recipeItemId?: string | null
}

export interface ProductionOrderPayload {
  recipeId: string
  outputWarehouseId: string
  plannedOutputQuantity: number
  actualOutputQuantity: number
  laborCost: number
  date?: string
  notes?: string
  items: ProductionOrderInputPayload[]
}

export interface ProductionOrderInputRecord {
  id: string
  productionOrderId: string
  recipeItemId?: string | null
  materialId: string
  materialName: string
  warehouseId: string
  warehouseName: string
  unit: string
  plannedQuantity: number
  actualQuantity: number
  unitCost: number
  totalCost: number
  notes: string
  sortOrder: number
}

export interface ProductionOrderOutputRecord {
  id: string
  productionOrderId: string
  materialId: string
  materialName: string
  warehouseId: string
  warehouseName: string
  unit: string
  quantity: number
  unitCost: number
  totalCost: number
}

export interface ProductionOrderRecord {
  id: string
  orderNumber: string
  date: string
  recipeId: string
  recipeName: string
  productMaterialId: string
  productName: string
  outputWarehouseId: string
  outputWarehouseName: string
  plannedOutputQuantity: number
  actualOutputQuantity: number
  laborCost: number
  materialCostTotal: number
  totalProductionCost: number
  unitProductionCost: number
  notes: string
  createdAt: string
  updatedAt: string
  inputs?: ProductionOrderInputRecord[]
  outputs?: ProductionOrderOutputRecord[]
}

declare global {
  interface Window {
    craftManufacturingAPI?: {
      listRecipes: () => Promise<ManufacturingRecipeRecord[]>
      getRecipeById: (id: string) => Promise<ManufacturingRecipeRecord | null>
      getNextRecipeNumber: () => Promise<string>
      createRecipe: (payload: ManufacturingRecipePayload) => Promise<ManufacturingRecipeRecord>
      updateRecipe: (id: string, payload: ManufacturingRecipePayload) => Promise<ManufacturingRecipeRecord>
      deleteRecipe: (id: string) => Promise<boolean>
      listProductionOrders: () => Promise<ProductionOrderRecord[]>
      getProductionOrderById: (id: string) => Promise<ProductionOrderRecord | null>
      getNextProductionOrderNumber: () => Promise<string>
      createProductionOrder: (payload: ProductionOrderPayload) => Promise<ProductionOrderRecord | null>
      updateProductionOrder: (orderId: string, payload: ProductionOrderPayload) => Promise<ProductionOrderRecord | null>
      deleteProductionOrder: (id: string) => Promise<ProductionOrderRecord[]>
    }
  }
}

function getManufacturingAPI() {
  if (!window.craftManufacturingAPI) {
    const error = new Error('craftManufacturingAPI is not available. Check preload or IPC setup.')
    console.error(error)
    throw error
  }

  return window.craftManufacturingAPI
}

export const manufacturingService = {
  async listRecipes(): Promise<ManufacturingRecipeRecord[]> {
    return getManufacturingAPI().listRecipes()
  },

  async getRecipeById(id: string): Promise<ManufacturingRecipeRecord | null> {
    return getManufacturingAPI().getRecipeById(id)
  },

  async getNextRecipeNumber(): Promise<string> {
    return getManufacturingAPI().getNextRecipeNumber()
  },

  async createRecipe(payload: ManufacturingRecipePayload): Promise<ManufacturingRecipeRecord> {
    return getManufacturingAPI().createRecipe(payload)
  },

  async updateRecipe(id: string, payload: ManufacturingRecipePayload): Promise<ManufacturingRecipeRecord> {
    return getManufacturingAPI().updateRecipe(id, payload)
  },

  async deleteRecipe(id: string): Promise<boolean> {
    return getManufacturingAPI().deleteRecipe(id)
  },

  async listProductionOrders(): Promise<ProductionOrderRecord[]> {
    return getManufacturingAPI().listProductionOrders()
  },

  async getProductionOrderById(id: string): Promise<ProductionOrderRecord | null> {
    return getManufacturingAPI().getProductionOrderById(id)
  },

  async getNextProductionOrderNumber(): Promise<string> {
    return getManufacturingAPI().getNextProductionOrderNumber()
  },

  async createProductionOrder(payload: ProductionOrderPayload): Promise<ProductionOrderRecord | null> {
    return getManufacturingAPI().createProductionOrder(payload)
  },

  async updateProductionOrder(orderId: string, payload: ProductionOrderPayload): Promise<ProductionOrderRecord | null> {
    return getManufacturingAPI().updateProductionOrder(orderId, payload)
  },

  async deleteProductionOrder(id: string): Promise<ProductionOrderRecord[]> {
    return getManufacturingAPI().deleteProductionOrder(id)
  },
}
