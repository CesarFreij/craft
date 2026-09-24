import { AccountStatementPrintTemplate } from './AccountStatementPrintTemplate'
import type { AccountStatementPrintData } from '../../types/accountStatement'
import type { CompanyPrintSettings } from '../../types/invoicePrint'

export function CustomerStatementPrintTemplate({ data, settings }: { data: AccountStatementPrintData; settings: CompanyPrintSettings }) {
  return <AccountStatementPrintTemplate data={{ ...data, statementKind: 'customer-statement', printKind: 'customer-statement' }} settings={settings} />
}
