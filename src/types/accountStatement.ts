import type { InvoicePrintData } from './invoicePrint'

export type AccountStatementKind = 'supplier-statement' | 'customer-statement'

export interface AccountStatementTransactionPayment {
  id: string
  date: string
  amount: number
  notes?: string
  paymentMethod?: string
}

export interface AccountStatementInvoice {
  id: string
  invoiceNumber: string
  date: string
  amount: number
  notes?: string
  payments: AccountStatementTransactionPayment[]
}

export interface AccountStatementEntity {
  code: string
  name: string
  phone?: string
  address?: string
}

export interface AccountStatementPrintData extends InvoicePrintData {
  printKind: AccountStatementKind
  statementKind: AccountStatementKind
  entityCode: string
  entityName: string
  entityPhone: string
  entityAddress: string
  relatedInvoices?: AccountStatementInvoice[]
  ledgerEntries?: Array<{
    id: string
    type?: 'invoice' | 'payment' | 'return'
    debit: number
    credit: number
    paymentMethod: string
    invoiceNumber?: string
    documentNumber?: string
    notes: string
    date: string
  }>
  totalDebit: number
  totalCredit: number
  remainingBalance: number
  startDate?: string
  endDate?: string
}
