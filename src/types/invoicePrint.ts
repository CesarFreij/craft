export type InvoiceDocumentType =
  | 'sales'
  | 'purchase'
  | 'sales-return'
  | 'purchase-return'
  | 'production'

export interface CompanyPrintSettings {
  companyName: string
  address: string
  phone: string
  email: string
  taxNumber?: string
  logoDataUrl?: string
}

export interface InvoicePrintItem {
  id?: string
  code?: string
  name: string
  unit: string
  quantity: number
  price?: number
  total?: number
  cost?: number
  plannedQuantity?: number
  actualQuantity?: number
  notes?: string
}

export interface InvoicePrintData {
  printKind?: 'invoice' | 'delegate-statement' | 'supplier-statement' | 'customer-statement'
  documentType: InvoiceDocumentType
  title: string
  documentNumber: string
  date: string
  dueDate?: string
  partyLabel: string
  partyName: string
  partyNumber?: string
  partyPhone?: string
  delegateNames?: string[]
  referenceLabel?: string
  referenceValue?: string
  warehouseName?: string
  productName?: string
  productQuantity?: number
  notes?: string
  items: InvoicePrintItem[]
  subtotal: number
  discount: number
  additionalFees?: number
  total: number
  paymentMethod?: string
  paymentStatus?: string
  paidAmount?: number
  remainingAmount?: number
  productionMode?: boolean
}
