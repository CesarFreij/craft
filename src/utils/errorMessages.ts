type ErrorLike = {
  message?: unknown
  cause?: unknown
}

function isErrorLike(value: unknown): value is ErrorLike {
  return typeof value === 'object' && value !== null
}

function readRawMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error
  }

  if (error instanceof Error) {
    return error.message
  }

  if (isErrorLike(error) && typeof error.message === 'string') {
    return error.message
  }

  return ''
}

function normalizeMessage(message: string): string {
  return message
    .replace(/^Error invoking remote method '?.+?'?:\s*/i, '')
    .replace(/^Error:\s*/i, '')
    .replace(/^SQLITE_[A-Z_]+:\s*/i, '')
    .replace(/^Promise rejected with value:\s*/i, '')
    .split(/\r?\n/)[0]
    .trim()
}

function mapKnownTechnicalMessage(message: string): string | null {
  const rules: Array<{ test: RegExp; message: string }> = [
    { test: /UNIQUE constraint failed:\s*warehouses\.code/i, message: 'كود المخزن مستخدم مسبقاً.' },
    { test: /UNIQUE constraint failed:\s*materials\.material_number/i, message: 'رقم المادة مستخدم مسبقاً.' },
    { test: /UNIQUE constraint failed:\s*stock_movement_documents\.reference/i, message: 'رقم المستند مستخدم مسبقاً.' },
    { test: /UNIQUE constraint failed:\s*suppliers\.code/i, message: 'رقم المورد مستخدم مسبقاً.' },
    { test: /UNIQUE constraint failed:\s*purchase_invoices\.invoice_number/i, message: 'رقم الفاتورة مستخدم مسبقاً.' },
    { test: /UNIQUE constraint failed:\s*purchase_invoice_items\.id/i, message: 'تعذر حفظ أحد بنود الفاتورة. يرجى المحاولة مرة أخرى.' },
    { test: /FOREIGN KEY constraint failed/i, message: 'لا يمكن إتمام العملية لأن السجل مرتبط ببيانات أخرى.' },
    { test: /Material not found:/i, message: 'المادة المطلوبة غير موجودة.' },
    { test: /Insufficient stock for material/i, message: 'الرصيد المتوفر في المخزن غير كافٍ لإتمام العملية.' },
    { test: /A movement document with reference .* already exists\./i, message: 'رقم المستند مستخدم مسبقاً.' },
    { test: /The source warehouse is invalid or inactive\./i, message: 'المخزن المصدر غير صالح أو غير مفعل.' },
    { test: /The destination warehouse is invalid or inactive\./i, message: 'المخزن الهدف غير صالح أو غير مفعل.' },
    { test: /A warehouse is required for adjustments\./i, message: 'اختر مخزناً للتسوية.' },
    { test: /Both source and destination warehouses are required for transfers\./i, message: 'اختر المخزن المصدر والمخزن الهدف.' },
    { test: /The source warehouse is required for sales\./i, message: 'اختر المخزن المصدر.' },
    { test: /The destination warehouse is required for purchases\./i, message: 'اختر المخزن الهدف.' },
    { test: /A document reference is required\./i, message: 'رقم المستند مطلوب.' },
    { test: /A valid movement type is required\./i, message: 'نوع الحركة غير صالح.' },
    { test: /The movement document must contain at least one material line\./i, message: 'أضف مادة واحدة على الأقل.' },
    { test: /Invalid quantity for material/i, message: 'تأكد من صحة الكمية.' },
    { test: /Quantity must be positive for movement type/i, message: 'يجب أن تكون الكمية موجبة لهذا النوع من الحركة.' },
    { test: /Warehouse cannot be determined for this movement line\./i, message: 'تعذر تحديد المخزن لهذا السطر.' },
    { test: /Material .* is configured as non-stock and cannot be used in inventory movements\./i, message: 'لا يمكن استخدام هذه المادة في الحركات المخزنية.' },
    { test: /reference .* already exists/i, message: 'رقم المستند مستخدم مسبقاً.' },
  ]

  for (const rule of rules) {
    if (rule.test.test(message)) {
      return rule.message
    }
  }

  return null
}

function looksLikeArabicMessage(message: string): boolean {
  return /[\u0600-\u06FF]/.test(message)
}

export function getUserFriendlyErrorMessage(error: unknown, fallback: string): string {
  const messages = [readRawMessage(error)]

  if (isErrorLike(error) && error.cause !== error) {
    messages.push(readRawMessage(error.cause))
  }

  for (const rawMessage of messages) {
    const normalized = normalizeMessage(rawMessage)
    if (!normalized) {
      continue
    }

    const mapped = mapKnownTechnicalMessage(normalized)
    if (mapped) {
      return mapped
    }

    if (looksLikeArabicMessage(normalized)) {
      return normalized
    }
  }

  return fallback
}