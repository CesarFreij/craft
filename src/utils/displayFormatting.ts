const ARABIC_DIGITS: Record<string, string> = {
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
  '۰': '0',
  '۱': '1',
  '۲': '2',
  '۳': '3',
  '۴': '4',
  '۵': '5',
  '۶': '6',
  '۷': '7',
  '۸': '8',
  '۹': '9',
}

export function toEnglishDigits(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return ''
  }

  return String(value).replace(/[٠-٩۰-۹]/g, (digit) => ARABIC_DIGITS[digit] ?? digit)
}

export function formatDisplayNumber(value: number | string | null | undefined, digits = 2): string {
  const raw = typeof value === 'number' ? value : Number(value ?? 0)
  if (Number.isNaN(raw)) {
    return ''
  }

  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(raw)

  return toEnglishDigits(formatted)
}

export function formatDateYMD(value: string | Date | null | undefined): string {
  if (!value) {
    return ''
  }

  const asString = String(value).trim()
  const isoMatch = asString.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (isoMatch) {
    const [, year, month, day] = isoMatch
    return `${toEnglishDigits(year)}-${toEnglishDigits(String(month).padStart(2, '0'))}-${toEnglishDigits(String(day).padStart(2, '0'))}`
  }

  const dmyMatch = asString.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch
    return `${toEnglishDigits(year)}-${toEnglishDigits(String(month).padStart(2, '0'))}-${toEnglishDigits(String(day).padStart(2, '0'))}`
  }

  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${toEnglishDigits(year)}-${toEnglishDigits(month)}-${toEnglishDigits(day)}`
}

export function toInternalDate(value: string | Date | null | undefined): string {
  if (!value) {
    return ''
  }

  const asString = String(value).trim()
  const isoMatch = asString.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (isoMatch) {
    const [, year, month, day] = isoMatch
    return `${toEnglishDigits(year)}-${toEnglishDigits(String(month).padStart(2, '0'))}-${toEnglishDigits(String(day).padStart(2, '0'))}`
  }

  const dmyMatch = asString.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch
    return `${toEnglishDigits(year)}-${toEnglishDigits(String(month).padStart(2, '0'))}-${toEnglishDigits(String(day).padStart(2, '0'))}`
  }

  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${toEnglishDigits(year)}-${toEnglishDigits(month)}-${toEnglishDigits(day)}`
}

export function formatDateDMY(value: string | Date | null | undefined): string {
  if (!value) {
    return ''
  }

  const asString = String(value).trim()
  const isoMatch = asString.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (isoMatch) {
    const [, year, month, day] = isoMatch
    return `${toEnglishDigits(String(day).padStart(2, '0'))}/${toEnglishDigits(String(month).padStart(2, '0'))}/${toEnglishDigits(year)}`
  }

  const dmyMatch = asString.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch
    return `${toEnglishDigits(String(day).padStart(2, '0'))}/${toEnglishDigits(String(month).padStart(2, '0'))}/${toEnglishDigits(year)}`
  }

  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${toEnglishDigits(day)}/${toEnglishDigits(month)}/${toEnglishDigits(year)}`
}
