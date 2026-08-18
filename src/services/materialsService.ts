export type MaterialType = 'main' | 'sub'

export interface MaterialPayload {
  id?: string
  type: MaterialType
  parentId: string | null
  returnability: string
  materialNumber: string
  name: string
  openingBalance?: number | null
  openingWarehouseId?: string | null
  unit?: string
  costPrice?: string
  price1?: string
  price2?: string
  price3?: string
  notes?: string
  isNonStock?: boolean
}

export interface MaterialRecord {
  id: string
  type: MaterialType
  parentId: string | null
  returnability: string
  materialNumber: string
  name: string
  openingBalance?: number | null
  openingWarehouseId?: string | null
  unit?: string
  costPrice?: string
  price1?: string
  price2?: string
  price3?: string
  notes?: string
  isNonStock?: boolean
  status?: 'active' | 'deleted'
  createdAt?: string
  updatedAt?: string
  children?: MaterialRecord[]
}

declare global {
  interface Window {
    craftMaterialsAPI?: {
      listMaterials: () => Promise<MaterialRecord[]>
      createMaterial: (payload: MaterialPayload) => Promise<MaterialRecord[]>
      updateMaterial: (id: string, payload: MaterialPayload) => Promise<MaterialRecord[]>
      deleteMaterial: (id: string) => Promise<MaterialRecord[]>
      searchMaterials: (term: string) => Promise<MaterialRecord[]>
    }
  }
}

function getMaterialsAPI() {
  if (!window.craftMaterialsAPI) {
    const error = new Error('craftMaterialsAPI is not available. Check preload or IPC setup.')
    console.error(error)
    throw error
  }
  return window.craftMaterialsAPI
}

export const materialsService = {
  async listMaterials(): Promise<MaterialRecord[]> {
    return getMaterialsAPI().listMaterials()
  },

  async createMaterial(payload: MaterialPayload): Promise<MaterialRecord[]> {
    return getMaterialsAPI().createMaterial(payload)
  },

  async updateMaterial(id: string, payload: MaterialPayload): Promise<MaterialRecord[]> {
    return getMaterialsAPI().updateMaterial(id, payload)
  },

  async deleteMaterial(id: string): Promise<MaterialRecord[]> {
    return getMaterialsAPI().deleteMaterial(id)
  },

  async searchMaterials(term: string): Promise<MaterialRecord[]> {
    return getMaterialsAPI().searchMaterials(term)
  },
}
