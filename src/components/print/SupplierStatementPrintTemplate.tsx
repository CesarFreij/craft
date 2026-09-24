import { AccountStatementPrintTemplate } from './AccountStatementPrintTemplate'
import type { AccountStatementPrintData } from '../../types/accountStatement'
import type { CompanyPrintSettings } from '../../types/invoicePrint'

export function SupplierStatementPrintTemplate({ data, settings }: { data: AccountStatementPrintData; settings: CompanyPrintSettings }) {
  return <AccountStatementPrintTemplate data={{ ...data, statementKind: 'supplier-statement', printKind: 'supplier-statement' }} settings={settings} />
}
