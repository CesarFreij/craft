import type { CompanyPrintSettings } from '../types/invoicePrint'

export const defaultCompanyPrintSettings: CompanyPrintSettings = {
  companyName: '',
  address: '',
  phone: '',
  email: '',
  taxNumber: '',
  logoDataUrl: '',
}

declare global {
  interface Window {
    craftCompanyPrintSettingsAPI?: {
      get: () => Promise<Partial<CompanyPrintSettings>>
      save: (settings: CompanyPrintSettings) => Promise<Partial<CompanyPrintSettings>>
    }
  }
}

function normalizeCompanyPrintSettings(settings: Partial<CompanyPrintSettings> | null | undefined): CompanyPrintSettings {
  return {
    companyName: settings?.companyName ?? '',
    address: settings?.address ?? '',
    phone: settings?.phone ?? '',
    email: settings?.email ?? '',
    taxNumber: settings?.taxNumber ?? '',
    logoDataUrl: settings?.logoDataUrl ?? '',
  }
}

export async function loadCompanyPrintSettings(): Promise<CompanyPrintSettings> {
  try {
    if (!window.craftCompanyPrintSettingsAPI) return { ...defaultCompanyPrintSettings }
    return normalizeCompanyPrintSettings(await window.craftCompanyPrintSettingsAPI.get())
  } catch {
    return { ...defaultCompanyPrintSettings }
  }
}

export async function saveCompanyPrintSettings(settings: CompanyPrintSettings): Promise<CompanyPrintSettings> {
  const normalized = normalizeCompanyPrintSettings(settings)
  try {
    if (!window.craftCompanyPrintSettingsAPI) return normalized
    return normalizeCompanyPrintSettings(await window.craftCompanyPrintSettingsAPI.save(normalized))
  } catch {
    return normalized
  }
}
