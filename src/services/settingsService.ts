export type ThemeMode = 'light' | 'dark' | 'system'
export type PrimaryColorOption = 'blue' | 'cyan'
export type BorderRadiusOption = 'small' | 'medium' | 'large'
export type SidebarStyleOption = 'glass' | 'solid'
export type FontSizeOption = 'small' | 'medium' | 'large'
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

export const defaultSettings: AppSettings = {
  mode: 'system',
  primaryColor: 'blue',
  sidebarStyle: 'glass',
  borderRadius: 'medium',
  fontSize: 'medium',
  quantityDecimals: 2,
  priceDecimals: 2,
  averageDecimals: 2,
  currencyName: 'ريال',
  currencySymbol: 'ر.س',
  paymentMethods: ['نقدا', 'انستباي'],
  defaultSalesPriceType: 'average',
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

function normalizeArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [...defaultSettings.paymentMethods]
  }

  const normalized = value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim())
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

  const fontSize: FontSizeOption = source.fontSize === 'small' || source.fontSize === 'medium' || source.fontSize === 'large'
    ? source.fontSize
    : defaultSettings.fontSize

  const quantityDecimals = Number.isFinite(source.quantityDecimals) ? Number(source.quantityDecimals) : defaultSettings.quantityDecimals
  const priceDecimals = Number.isFinite(source.priceDecimals) ? Number(source.priceDecimals) : defaultSettings.priceDecimals
  const averageDecimals = Number.isFinite(source.averageDecimals) ? Number(source.averageDecimals) : defaultSettings.averageDecimals

  const normalizedDefaultSalesPriceType =
    source.defaultSalesPriceType === 'average' ||
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

    if (!rawValue) {
      return { ...defaultSettings, paymentMethods: [...defaultSettings.paymentMethods] }
    }

    return normalizeSettings(JSON.parse(rawValue) as Partial<AppSettings>)
  } catch {
    return { ...defaultSettings, paymentMethods: [...defaultSettings.paymentMethods] }
  }
}

export function saveSettings(settings: Partial<AppSettings> | AppSettings): AppSettings {
  const normalized = normalizeSettings(settings)

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
