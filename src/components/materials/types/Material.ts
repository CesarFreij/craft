export type MaterialType = 'main' | 'sub'

export interface MaterialNode {
  id: string
  type: MaterialType
  isNonStock?: boolean
  returnability?: string
  materialNumber: string
  name: string
  notes?: string
  unit?: string
  costPrice?: string
  price1?: string
  price2?: string
  price3?: string
  children: MaterialNode[]
}

export type FormValues = {
  returnability: string
  materialNumber: string
  name: string
  notes: string
  unit: string
  costPrice: string
  price1: string
  price2: string
  price3: string
  isNonStock: boolean
}

export interface DialogState {
  open: boolean
  mode: 'add' | 'edit' | 'message'
  title: string
  subtitle?: string
  parentId?: string
  nodeType?: MaterialType
  node?: MaterialNode
  message?: string
}
