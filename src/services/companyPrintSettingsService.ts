import type { CompanyPrintSettings } from '../types/invoicePrint'

const STORAGE_KEY = 'craft-company-print-settings-v1'

export const defaultCompanyPrintSettings: CompanyPrintSettings = {
  companyName: '',
  address: '',
  phone: '',
  email: '',
  taxNumber: '',
  logoDataUrl: '',
}

export function loadCompanyPrintSettings(): CompanyPrintSettings {
  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY)
    if (!rawValue) {
      return { ...defaultCompanyPrintSettings }
    }

    const parsed = JSON.parse(rawValue) as Partial<CompanyPrintSettings>
    return {
      companyName: parsed.companyName ?? '',
      address: parsed.address ?? '',
      phone: parsed.phone ?? '',
      email: parsed.email ?? '',
      taxNumber: parsed.taxNumber ?? '',
      logoDataUrl: parsed.logoDataUrl ?? '',
    }
  } catch {
    return { ...defaultCompanyPrintSettings }
  }
}

export function saveCompanyPrintSettings(settings: CompanyPrintSettings): CompanyPrintSettings {
  const normalized = {
    companyName: settings.companyName ?? '',
    address: settings.address ?? '',
    phone: settings.phone ?? '',
    email: settings.email ?? '',
    taxNumber: settings.taxNumber ?? '',
    logoDataUrl: settings.logoDataUrl ?? '',
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  } catch {
    // Ignore storage failures and keep in-memory state.
  }

  return normalized
}
