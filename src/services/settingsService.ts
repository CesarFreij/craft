export type ThemeMode = 'light' | 'dark' | 'system'
export type PrimaryColorOption = 'blue' | 'cyan'
export type BorderRadiusOption = 'small' | 'medium' | 'large'
export type SidebarStyleOption = 'glass' | 'solid'
export type FontSizeOption = 'small' | 'default' | 'medium' | 'large' | 'extraLarge'
export type AutoBackupMode = 'new' | 'replace'

export type DefaultSalesPriceType =
  | 'average'
  | 'price1'
  | 'price2'
  | 'price3'

export interface AppSettings {
  mode: ThemeMode
  primaryColor: PrimaryColorOption
  sidebarStyle: SidebarStyleOption
  borderRadius: BorderRadiusOption
  fontSize: FontSizeOption
  quantityDecimals: number
  priceDecimals: number
  averageDecimals: number
  currencyName: string
  currencySymbol: string
  paymentMethods: string[]
  defaultSalesPriceType: DefaultSalesPriceType
  salesPrice1Name: string
  salesPrice2Name: string
  salesPrice3Name: string
  allowNegativeStock: boolean
  backupDirectory: string
  lastBackupAt: string
  autoBackupOnExit: boolean
  autoBackupMode: AutoBackupMode
}

const STORAGE_KEY = 'craft-app-settings-v1'
const DEFAULTS_MIGRATION_KEY = 'craft-app-settings-defaults-v3'

export const defaultSettings: AppSettings = {
  mode: 'system',
  primaryColor: 'blue',
  sidebarStyle: 'glass',
  borderRadius: 'medium',
  fontSize: 'default',
  quantityDecimals: 2,
  priceDecimals: 2,
  averageDecimals: 4,
  currencyName: 'ليرة سورية جديدة',
  currencySymbol: 'ل.س',
  paymentMethods: ['دفعة نقدية'],
  defaultSalesPriceType: 'price1',
  salesPrice1Name: 'سعر البيع الأول',
  salesPrice2Name: 'سعر البيع الثاني',
  salesPrice3Name: 'سعر البيع الثالث',
  allowNegativeStock: false,
  backupDirectory: '',
  lastBackupAt: '',
  autoBackupOnExit: false,
  autoBackupMode: 'new',
}

const legacyKeys = ['craft-theme-settings-v1', 'craft-theme-settings']

declare global {
  interface Window {
    craftSettingsAPI?: {
      setNumberFormat: (settings: Pick<AppSettings, 'quantityDecimals' | 'priceDecimals' | 'averageDecimals'>) => Promise<unknown>
    }
  }
}

function syncNumberFormatSettings(settings: AppSettings): void {
  if (typeof window === 'undefined' || !window.craftSettingsAPI?.setNumberFormat) {
    return
  }

  void window.craftSettingsAPI.setNumberFormat({
    quantityDecimals: settings.quantityDecimals,
    priceDecimals: settings.priceDecimals,
    averageDecimals: settings.averageDecimals,
  }).catch(() => undefined)
}

function normalizePaymentMethodName(value: string): string {
  const normalized = value.trim()

  if (
    normalized === 'نقدا' ||
    normalized === 'نقداً' ||
    normalized === 'نقدًا'
  ) {
    return 'دفعة نقدية'
  }

  return normalized
}

function isLegacyInstaPayMethod(value: string): boolean {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '')

  return (
    normalized === 'instapay' ||
    normalized === 'انستباي' ||
    normalized === 'إنستاباي' ||
    normalized === 'انستاpay'
  )
}

function normalizeArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [...defaultSettings.paymentMethods]
  }

  const normalized = value
    .filter((item): item is string => typeof item === 'string')
    .map(normalizePaymentMethodName)
    .filter((item) => item.length > 0)
    .filter((item, index, values) => values.indexOf(item) === index)

  return normalized.length > 0 ? normalized : [...defaultSettings.paymentMethods]
}

function normalizeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback
}

export function normalizeSettings(partial: Partial<AppSettings> | null | undefined): AppSettings {
  const source = partial ?? {}

  const mode: ThemeMode = source.mode === 'light' || source.mode === 'dark' || source.mode === 'system'
    ? source.mode
    : defaultSettings.mode

  const primaryColor: PrimaryColorOption = source.primaryColor === 'blue' || source.primaryColor === 'cyan'
    ? source.primaryColor
    : defaultSettings.primaryColor

  const sidebarStyle: SidebarStyleOption = source.sidebarStyle === 'glass' || source.sidebarStyle === 'solid'
    ? source.sidebarStyle
    : defaultSettings.sidebarStyle

  const borderRadius: BorderRadiusOption = source.borderRadius === 'small' || source.borderRadius === 'medium' || source.borderRadius === 'large'
    ? source.borderRadius
    : defaultSettings.borderRadius

  const fontSize: FontSizeOption = source.fontSize === 'small' || source.fontSize === 'default' || source.fontSize === 'medium' || source.fontSize === 'large' || source.fontSize === 'extraLarge'
    ? source.fontSize
    : defaultSettings.fontSize

  const quantityDecimals = Number.isFinite(source.quantityDecimals) ? Number(source.quantityDecimals) : defaultSettings.quantityDecimals
  const priceDecimals = Number.isFinite(source.priceDecimals) ? Number(source.priceDecimals) : defaultSettings.priceDecimals
  const averageDecimals = Number.isFinite(source.averageDecimals) ? Number(source.averageDecimals) : defaultSettings.averageDecimals

  const normalizedDefaultSalesPriceType =
    source.defaultSalesPriceType === 'price1' ||
    source.defaultSalesPriceType === 'price2' ||
    source.defaultSalesPriceType === 'price3'
      ? source.defaultSalesPriceType
      : defaultSettings.defaultSalesPriceType

  const defaultSalesPriceType: DefaultSalesPriceType = normalizedDefaultSalesPriceType

  const autoBackupMode: AutoBackupMode =
    source.autoBackupMode === 'replace' || source.autoBackupMode === 'new'
      ? source.autoBackupMode
      : defaultSettings.autoBackupMode

  return {
    mode,
    primaryColor,
    sidebarStyle,
    borderRadius,
    fontSize,
    quantityDecimals: Math.max(0, Math.min(6, Math.round(quantityDecimals))),
    priceDecimals: Math.max(0, Math.min(6, Math.round(priceDecimals))),
    averageDecimals: Math.max(0, Math.min(6, Math.round(averageDecimals))),
    currencyName: normalizeString(source.currencyName) || defaultSettings.currencyName,
    currencySymbol: normalizeString(source.currencySymbol) || defaultSettings.currencySymbol,
    paymentMethods: normalizeArray(source.paymentMethods),
    defaultSalesPriceType,
    salesPrice1Name: normalizeString(source.salesPrice1Name) || defaultSettings.salesPrice1Name,
    salesPrice2Name: normalizeString(source.salesPrice2Name) || defaultSettings.salesPrice2Name,
    salesPrice3Name: normalizeString(source.salesPrice3Name) || defaultSettings.salesPrice3Name,
    allowNegativeStock: false,
    backupDirectory: normalizeString(source.backupDirectory),
    lastBackupAt: normalizeString(source.lastBackupAt),
    autoBackupOnExit: source.autoBackupOnExit === true,
    autoBackupMode,
  }
}


function applyRequestedDefaultsMigration(settings: AppSettings): AppSettings {
  if (typeof window === 'undefined') {
    return settings
  }

  if (window.localStorage.getItem(DEFAULTS_MIGRATION_KEY) === 'done') {
    return settings
  }

  const migrated = normalizeSettings({
    ...settings,
    currencyName: 'ليرة سورية جديدة',
    currencySymbol: 'ل.س',
    averageDecimals: 4,
    defaultSalesPriceType: 'price1',
    paymentMethods: [
      'دفعة نقدية',
      ...settings.paymentMethods
        .map((method) => normalizePaymentMethodName(method))
        .filter(
          (method) =>
            method !== 'دفعة نقدية' &&
            !isLegacyInstaPayMethod(method),
        ),
    ],
  })

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated))
  window.localStorage.setItem(DEFAULTS_MIGRATION_KEY, 'done')

  return migrated
}

export function loadSettings(): AppSettings {
  try {
    if (typeof window === 'undefined') {
      return { ...defaultSettings, paymentMethods: [...defaultSettings.paymentMethods] }
    }

    const savedFromPrimary = window.localStorage.getItem(STORAGE_KEY)
    const legacyValue = legacyKeys
      .map((key) => window.localStorage.getItem(key))
      .find((value) => Boolean(value))
    const rawValue = savedFromPrimary ?? legacyValue ?? null

    const loadedSettings = rawValue
      ? normalizeSettings(JSON.parse(rawValue) as Partial<AppSettings>)
      : { ...defaultSettings, paymentMethods: [...defaultSettings.paymentMethods] }

    const normalizedSettings = applyRequestedDefaultsMigration(loadedSettings)
    syncNumberFormatSettings(normalizedSettings)
    return normalizedSettings
  } catch {
    const fallbackSettings = { ...defaultSettings, paymentMethods: [...defaultSettings.paymentMethods] }
    syncNumberFormatSettings(fallbackSettings)
    return fallbackSettings
  }
}

export function saveSettings(settings: Partial<AppSettings> | AppSettings): AppSettings {
  const normalized = normalizeSettings(settings)
  syncNumberFormatSettings(normalized)

  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
      window.dispatchEvent(new CustomEvent('craft-settings-changed', { detail: normalized }))
    }
  } catch {
    // Preserve the normalized in-memory values if localStorage is unavailable.
  }

  return normalized
}

export function updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): AppSettings {
  const current = loadSettings()
  return saveSettings({ ...current, [key]: value })
}
